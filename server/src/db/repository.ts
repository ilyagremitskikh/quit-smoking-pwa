import Database from "better-sqlite3";
import type {
  CourseRow,
  DoseLogRow,
  DoseScheduleRow,
  DoseView,
  PushDeliveryKind,
  PushDeliveryStatus,
  PushSubscriptionRow,
  SmokeKind,
  QuoteRow,
  SettingsRow,
  SmokeLogRow
} from "../types/domain.js";
import { BenefitsResult, calculateBenefits, quitStartIso } from "../services/benefits.js";
import { computeDoseViews, statusForTaking } from "../services/dose-status.js";
import { generateSchedule, insertSchedule } from "../services/schedule-generator.js";
import { addDaysToDateKey, addMinutesIso, dayNumberForCourse, isoFromDate, localDateKey, localDateTimeToUtcIso } from "../services/time.js";
import { quoteIndexForDate } from "../services/quotes.js";
import { calculateStreak } from "../services/streak-calc.js";

export interface AppState {
  setupNeeded: boolean;
  course: CourseRow | null;
  mode: "setup" | "course" | "afterCourse";
  currentDay: number | null;
  currentPhase: number | null;
  todaySchedule: DoseView[];
  nextDose: DoseView | null;
  streak: ReturnType<typeof calculateStreak>;
  benefits: BenefitsResult;
  quote: QuoteRow | null;
  settings: SettingsRow;
}

export interface ProgressDay {
  dayNumber: number;
  phase: number;
  planned: number;
  taken: number;
  late: number;
  skipped: number;
  complete: boolean;
  partial: boolean;
}

export interface SmokeEventView extends SmokeLogRow {
  dayNumber: number | null;
}

export class Repository {
  constructor(private readonly db: Database.Database) {}

  get database(): Database.Database {
    return this.db;
  }

  getState(now = new Date()): AppState {
    const course = this.getCurrentCourse();
    const settings = this.getSettings();
    const quote = this.getQuoteToday(now);
    const smokes = this.getSmokeLogs();
    const streak = calculateStreak(course ?? undefined, smokes, now);
    const benefits = calculateBenefits(course ?? undefined, smokes, settings, now);

    if (!course) {
      return {
        setupNeeded: true,
        course: null,
        mode: "setup",
        currentDay: null,
        currentPhase: null,
        todaySchedule: [],
        nextDose: null,
        streak,
        benefits,
        quote,
        settings
      };
    }

    const dayNumber = dayNumberForCourse(course.start_date, now);
    if (course.status === "active" && dayNumber > 25) {
      this.db.prepare("UPDATE course SET status = 'done' WHERE id = ?").run(course.id);
      course.status = "done";
    }

    const scheduleDay = Math.min(Math.max(dayNumber, 1), 25);
    const todayRows = course.status === "active" && dayNumber <= 25
      ? this.getScheduleRows(course.id, scheduleDay)
      : [];
    const todaySchedule = this.getDoseViews(todayRows, now);
    const nextDose = todaySchedule.find((dose) => !dose.takenAt) ?? null;

    return {
      setupNeeded: false,
      course,
      mode: course.status === "done" || dayNumber > 25 ? "afterCourse" : "course",
      currentDay: scheduleDay,
      currentPhase: todaySchedule[0]?.phase ?? null,
      todaySchedule,
      nextDose,
      streak,
      benefits,
      quote,
      settings
    };
  }

  createCourse(startDate: string, firstDoseTime: string): CourseRow {
    const create = this.db.transaction(() => {
      this.db.prepare("UPDATE course SET status = 'aborted' WHERE status = 'active'").run();
      const result = this.db
        .prepare("INSERT INTO course (start_date, first_dose_time, status) VALUES (?, ?, 'active')")
        .run(startDate, firstDoseTime);
      const courseId = Number(result.lastInsertRowid);
      insertSchedule(this.db, generateSchedule(courseId, startDate, firstDoseTime));
      return this.getCourseById(courseId);
    });

    return create();
  }

  abortActiveCourse(): void {
    this.db.prepare("UPDATE course SET status = 'aborted' WHERE status = 'active'").run();
  }

  getSchedule(dayNumber: number, now = new Date()): DoseView[] {
    const course = this.getCurrentCourse();
    if (!course) {
      return [];
    }
    return this.getDoseViews(this.getScheduleRows(course.id, dayNumber), now);
  }

  takeDose(scheduleId: number, now = new Date()): DoseView {
    const row = this.db
      .prepare("SELECT * FROM dose_schedule WHERE id = ?")
      .get(scheduleId) as DoseScheduleRow | undefined;
    if (!row) {
      throw new Error("Dose schedule item not found");
    }

    const dayRows = this.getScheduleRows(row.course_id, row.day_number);
    const currentView = this.getDoseViews(dayRows, now).find((dose) => dose.id === scheduleId);
    const status = statusForTaking(currentView?.effectiveTime ?? row.planned_time, now);
    const takenAt = isoFromDate(now);
    this.db
      .prepare(`
        INSERT INTO dose_log (schedule_id, taken_at, status)
        VALUES (?, ?, ?)
        ON CONFLICT(schedule_id) DO UPDATE SET
          taken_at = excluded.taken_at,
          status = excluded.status
      `)
      .run(scheduleId, takenAt, status);

    return this.getDoseViews(dayRows, now).find((dose) => dose.id === scheduleId)!;
  }

  deleteDose(scheduleId: number): void {
    this.db.prepare("DELETE FROM dose_log WHERE schedule_id = ?").run(scheduleId);
  }

  logSmoke(note?: string, now = new Date()): { smoke: SmokeLogRow; shouldOfferVideo: boolean } {
    const kind = this.smokeKindForNow(now);
    const result = this.db
      .prepare("INSERT INTO smoke_log (logged_at, note, kind) VALUES (?, ?, ?)")
      .run(isoFromDate(now), note?.trim() || null, kind);
    const smoke = this.db
      .prepare("SELECT * FROM smoke_log WHERE id = ?")
      .get(result.lastInsertRowid) as SmokeLogRow;
    return { smoke, shouldOfferVideo: kind === "relapse" };
  }

  getSmokeLogs(): SmokeLogRow[] {
    return this.db.prepare("SELECT * FROM smoke_log ORDER BY logged_at DESC").all() as SmokeLogRow[];
  }

  getProgress(now = new Date()): {
    days: ProgressDay[];
    smokes: SmokeLogRow[];
    smokeEvents: SmokeEventView[];
    benefits: BenefitsResult;
    milestones: Array<{ day: number; label: string }>;
  } {
    const course = this.getCurrentCourse();
    const smokes = this.getSmokeLogs();
    const settings = this.getSettings();
    if (!course) {
      return {
        days: [],
        smokes,
        smokeEvents: smokes.map((smoke) => ({ ...smoke, dayNumber: null })),
        benefits: calculateBenefits(undefined, smokes, settings, now),
        milestones: []
      };
    }

    const rows = this.getScheduleRows(course.id);
    const views = this.getDoseViews(rows, now);
    const days: ProgressDay[] = [];

    for (let dayNumber = 1; dayNumber <= 25; dayNumber += 1) {
      const dayDoses = views.filter((dose) => dose.dayNumber === dayNumber);
      const taken = dayDoses.filter((dose) => dose.status === "taken" || (dose.status === "late" && dose.takenAt)).length;
      const late = dayDoses.filter((dose) => dose.status === "late" && dose.takenAt).length;
      const skipped = dayDoses.filter((dose) => dose.status === "skipped").length;
      const planned = dayDoses.length;
      const phase = dayDoses[0]?.phase ?? 0;
      const phaseFivePartial = phase === 5 && taken >= 1;

      days.push({
        dayNumber,
        phase,
        planned,
        taken,
        late,
        skipped,
        complete: phase === 5 ? taken >= 2 : planned > 0 && taken === planned,
        partial: phaseFivePartial || (taken > 0 && taken < planned)
      });
    }

    return {
      days,
      smokes,
      smokeEvents: smokes.map((smoke) => ({
        ...smoke,
        dayNumber: this.courseDayForIso(course, smoke.logged_at)
      })),
      benefits: calculateBenefits(course, smokes, settings, now),
      milestones: [
        { day: 5, label: "Полный отказ" },
        { day: 25, label: "Финиш курса" }
      ]
    };
  }

  updateSettings(input: { packPrice?: number | null; remindersEnabled?: boolean; cigarettesPerDay?: number }): SettingsRow {
    const current = this.getSettings();
    this.db
      .prepare("UPDATE settings SET pack_price = ?, reminders_enabled = ?, cigarettes_per_day = ? WHERE id = 1")
      .run(
        input.packPrice === undefined ? current.pack_price : input.packPrice,
        input.remindersEnabled === undefined ? current.reminders_enabled : input.remindersEnabled ? 1 : 0,
        input.cigarettesPerDay === undefined ? current.cigarettes_per_day : input.cigarettesPerDay
      );
    return this.getSettings();
  }

  getPushConfig(): { publicKey: string | null; available: boolean; remindersEnabled: boolean } {
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? null;
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? null;
    const subject = process.env.VAPID_SUBJECT ?? null;
    return {
      publicKey,
      available: Boolean(publicKey && privateKey && subject),
      remindersEnabled: this.getSettings().reminders_enabled === 1
    };
  }

  upsertPushSubscription(input: { endpoint: string; p256dh: string; auth: string }): PushSubscriptionRow {
    const existing = this.db
      .prepare("SELECT * FROM push_subscription WHERE endpoint = ?")
      .get(input.endpoint) as PushSubscriptionRow | undefined;

    if (existing) {
      this.db
        .prepare(`
          UPDATE push_subscription
          SET p256dh = ?, auth = ?, updated_at = ?, disabled_at = NULL, last_error = NULL
          WHERE endpoint = ?
        `)
        .run(input.p256dh, input.auth, isoFromDate(new Date()), input.endpoint);
    } else {
      this.db
        .prepare(`
          INSERT INTO push_subscription (endpoint, p256dh, auth, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(input.endpoint, input.p256dh, input.auth, isoFromDate(new Date()), isoFromDate(new Date()));
    }

    this.db.prepare("UPDATE settings SET reminders_enabled = 1 WHERE id = 1").run();
    return this.getPushSubscriptionByEndpoint(input.endpoint)!;
  }

  disablePushSubscription(endpoint: string, error?: string): void {
    this.db
      .prepare(`
        UPDATE push_subscription
        SET disabled_at = ?, updated_at = ?, last_error = COALESCE(?, last_error)
        WHERE endpoint = ?
      `)
      .run(isoFromDate(new Date()), isoFromDate(new Date()), error ?? null, endpoint);
  }

  getActivePushSubscriptions(): PushSubscriptionRow[] {
    return this.db
      .prepare("SELECT * FROM push_subscription WHERE disabled_at IS NULL ORDER BY id")
      .all() as PushSubscriptionRow[];
  }

  getPushSubscriptionByEndpoint(endpoint: string): PushSubscriptionRow | undefined {
    return this.db
      .prepare("SELECT * FROM push_subscription WHERE endpoint = ?")
      .get(endpoint) as PushSubscriptionRow | undefined;
  }

  recordPushDelivery(input: {
    scheduleId: number | null;
    subscriptionId: number;
    kind: PushDeliveryKind;
    status: PushDeliveryStatus;
    error?: string | null;
    sentAt?: Date;
  }): void {
    this.db
      .prepare(`
        INSERT OR IGNORE INTO push_delivery
          (schedule_id, subscription_id, kind, sent_at, status, error)
        VALUES
          (?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.scheduleId,
        input.subscriptionId,
        input.kind,
        isoFromDate(input.sentAt ?? new Date()),
        input.status,
        input.error ?? null
      );

    if (input.status === "sent") {
      this.db
        .prepare("UPDATE push_subscription SET last_success_at = ?, last_error = NULL, updated_at = ? WHERE id = ?")
        .run(isoFromDate(input.sentAt ?? new Date()), isoFromDate(new Date()), input.subscriptionId);
    } else {
      this.db
        .prepare("UPDATE push_subscription SET last_error = ?, updated_at = ? WHERE id = ?")
        .run(input.error ?? "Push delivery failed", isoFromDate(new Date()), input.subscriptionId);
    }
  }

  createDemoScenario(scenario: DemoScenarioId): { demoNow: string; state: AppState } {
    const config = DEMO_SCENARIOS[scenario] ?? DEMO_SCENARIOS.day5;
    const firstDoseTime = "08:00";
    const demoDateKey = localDateKey(new Date());
    const startDateKey = addDaysToDateKey(demoDateKey, -(config.dayNumber - 1));
    const startDate = localDateTimeToUtcIso(startDateKey, firstDoseTime);
    const demoNow = new Date(localDateTimeToUtcIso(demoDateKey, config.localTime));

    const create = this.db.transaction(() => {
      this.db.prepare("DELETE FROM smoke_log").run();
      this.db.prepare("DELETE FROM course").run();
      const result = this.db
        .prepare("INSERT INTO course (start_date, first_dose_time, status) VALUES (?, ?, 'active')")
        .run(startDate, firstDoseTime);
      const courseId = Number(result.lastInsertRowid);
      insertSchedule(this.db, generateSchedule(courseId, startDate, firstDoseTime));
      this.seedDemoLogs(courseId, config.dayNumber, demoNow);
    });

    create();
    return { demoNow: demoNow.toISOString(), state: this.getState(demoNow) };
  }

  private getCurrentCourse(): CourseRow | undefined {
    return this.db
      .prepare("SELECT * FROM course WHERE status IN ('active', 'done') ORDER BY id DESC LIMIT 1")
      .get() as CourseRow | undefined;
  }

  private getCourseById(id: number): CourseRow {
    const course = this.db.prepare("SELECT * FROM course WHERE id = ?").get(id) as CourseRow | undefined;
    if (!course) {
      throw new Error(`Course ${id} not found`);
    }
    return course;
  }

  private getScheduleRows(courseId: number, dayNumber?: number): DoseScheduleRow[] {
    if (dayNumber !== undefined) {
      return this.db
        .prepare("SELECT * FROM dose_schedule WHERE course_id = ? AND day_number = ? ORDER BY planned_time")
        .all(courseId, dayNumber) as DoseScheduleRow[];
    }

    return this.db
      .prepare("SELECT * FROM dose_schedule WHERE course_id = ? ORDER BY planned_time")
      .all(courseId) as DoseScheduleRow[];
  }

  private getDoseViews(rows: DoseScheduleRow[], now = new Date()): DoseView[] {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(",");
    const logs = this.db
      .prepare(`SELECT * FROM dose_log WHERE schedule_id IN (${placeholders})`)
      .all(...ids) as DoseLogRow[];
    return computeDoseViews(rows, logs, now);
  }

  private getSettings(): SettingsRow {
    return this.db.prepare("SELECT * FROM settings WHERE id = 1").get() as SettingsRow;
  }

  private getQuoteToday(now = new Date()): QuoteRow | null {
    const quotes = this.db.prepare("SELECT * FROM quote ORDER BY id").all() as QuoteRow[];
    if (quotes.length === 0) {
      return null;
    }
    return quotes[quoteIndexForDate(now, quotes.length)] ?? quotes[0]!;
  }

  private seedDemoLogs(courseId: number, scenarioDay: number, demoNow: Date): void {
    const rows = this.getScheduleRows(courseId).filter((row) => new Date(row.planned_time) < demoNow);
    const insertDose = this.db.prepare(`
      INSERT INTO dose_log (schedule_id, taken_at, status)
      VALUES (?, ?, ?)
    `);

    for (const row of rows) {
      if (row.day_number === scenarioDay && shouldLeaveTodayUnlogged(row)) {
        continue;
      }
      if (row.day_number < scenarioDay && row.id % 17 === 0) {
        continue;
      }

      const isLate = row.id % 11 === 0;
      insertDose.run(row.id, addMinutesIso(row.planned_time, isLate ? 38 : 5), isLate ? "late" : "taken");
    }

    const smokeInsert = this.db.prepare("INSERT INTO smoke_log (logged_at, note, kind) VALUES (?, ?, ?)");
    if (scenarioDay >= 5) {
      smokeInsert.run(
        localDateTimeToUtcIso(addDaysToDateKey(localDateKey(new Date(this.getCurrentCourse()!.start_date)), 2), "21:10"),
        "Демо: курение в переходный период",
        "transition"
      );
    }
    if (scenarioDay >= 18) {
      smokeInsert.run(
        localDateTimeToUtcIso(addDaysToDateKey(localDateKey(new Date(this.getCurrentCourse()!.start_date)), 11), "18:40"),
        "Демо: срыв после целевого отказа",
        "relapse"
      );
    }
  }

  private smokeKindForNow(now: Date): SmokeKind {
    const course = this.getCurrentCourse();
    if (!course) {
      return "relapse";
    }
    return now.getTime() < new Date(quitStartIso(course)).getTime() ? "transition" : "relapse";
  }

  private courseDayForIso(course: CourseRow, iso: string): number | null {
    const dayNumber = dayNumberForCourse(course.start_date, new Date(iso));
    return dayNumber >= 1 ? dayNumber : null;
  }
}

export type DemoScenarioId = "day1" | "day5" | "day13" | "day21" | "day25" | "after";

const DEMO_SCENARIOS: Record<DemoScenarioId, { dayNumber: number; localTime: string }> = {
  day1: { dayNumber: 1, localTime: "09:20" },
  day5: { dayNumber: 5, localTime: "12:45" },
  day13: { dayNumber: 13, localTime: "14:10" },
  day21: { dayNumber: 21, localTime: "17:30" },
  day25: { dayNumber: 25, localTime: "21:00" },
  after: { dayNumber: 28, localTime: "10:00" }
};

function shouldLeaveTodayUnlogged(row: DoseScheduleRow): boolean {
  return row.day_number > 1 && row.id % 2 === 0;
}
