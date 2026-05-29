import cron from "node-cron";
import type Database from "better-sqlite3";
import { Repository } from "../db/repository.js";
import { addMinutesIso, isoFromDate } from "./time.js";
import { errorMessage, isGonePushError, PushSender } from "./push-service.js";
import type { DoseScheduleRow, PushDeliveryKind, PushSubscriptionRow } from "../types/domain.js";

interface DueReminder {
  subscription: PushSubscriptionRow;
  dose: DoseScheduleRow;
  kind: Exclude<PushDeliveryKind, "test">;
}

export function startPushScheduler(repo: Repository, sender: PushSender): { stop: () => void } {
  const task = cron.schedule("* * * * *", () => {
    void runPushReminderTick(repo, sender).catch((error: unknown) => {
      console.error("Push scheduler failed", error);
    });
  });

  return {
    stop: () => task.stop()
  };
}

export async function runPushReminderTick(repo: Repository, sender: PushSender, now = new Date()): Promise<number> {
  const config = repo.getPushConfig();
  if (!config.available || !config.remindersEnabled) {
    return 0;
  }

  const due = findDueReminders(repo.database, now);
  let sent = 0;

  for (const reminder of due) {
    try {
      await sender.send(reminder.subscription, {
        title: reminder.kind === "initial" ? "Пора принять таблетку" : "Напоминание",
        body: reminder.kind === "initial" ? `Слот на ${formatTime(reminder.dose.planned_time)}` : "Таблетка ещё не отмечена",
        url: "/",
        badgeCount: 1
      });
      repo.recordPushDelivery({
        scheduleId: reminder.dose.id,
        subscriptionId: reminder.subscription.id,
        kind: reminder.kind,
        status: "sent",
        sentAt: now
      });
      sent += 1;
    } catch (error) {
      const message = errorMessage(error);
      repo.recordPushDelivery({
        scheduleId: reminder.dose.id,
        subscriptionId: reminder.subscription.id,
        kind: reminder.kind,
        status: "failed",
        error: message,
        sentAt: now
      });
      if (isGonePushError(error)) {
        repo.disablePushSubscription(reminder.subscription.endpoint, message);
      }
    }
  }

  return sent;
}

export function findDueReminders(db: Database.Database, now = new Date()): DueReminder[] {
  const settings = db.prepare("SELECT reminders_enabled FROM settings WHERE id = 1").get() as
    | { reminders_enabled: 0 | 1 }
    | undefined;
  if (!settings || settings.reminders_enabled !== 1) {
    return [];
  }

  const course = db
    .prepare("SELECT * FROM course WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    .get() as { id: number; start_date: string } | undefined;
  if (!course) {
    return [];
  }
  const courseAgeDays = Math.floor((now.getTime() - new Date(course.start_date).getTime()) / 86_400_000) + 1;
  if (courseAgeDays < 1 || courseAgeDays > 25) {
    return [];
  }

  const doses = db
    .prepare(
      `
      SELECT ds.*
      FROM dose_schedule ds
      LEFT JOIN dose_log dl ON dl.schedule_id = ds.id
      WHERE ds.course_id = ?
        AND ds.day_number BETWEEN 1 AND 25
        AND ds.planned_time <= ?
        AND dl.id IS NULL
      ORDER BY ds.planned_time
    `
    )
    .all(course.id, isoFromDate(now)) as DoseScheduleRow[];

  if (doses.length === 0) {
    return [];
  }

  const subscriptions = db
    .prepare("SELECT * FROM push_subscription WHERE disabled_at IS NULL ORDER BY id")
    .all() as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return [];
  }

  const due: DueReminder[] = [];
  const hasDelivery = db.prepare(`
    SELECT 1
    FROM push_delivery
    WHERE schedule_id = ?
      AND subscription_id = ?
      AND kind = ?
      AND status = 'sent'
    LIMIT 1
  `);

  for (const dose of doses) {
    const kinds = dueKindsForDose(dose, now);
    for (const subscription of subscriptions) {
      for (const kind of kinds) {
        const existing = hasDelivery.get(dose.id, subscription.id, kind);
        if (!existing) {
          due.push({ dose, subscription, kind });
        }
      }
    }
  }

  return due;
}

function dueKindsForDose(dose: DoseScheduleRow, now: Date): Array<Exclude<PushDeliveryKind, "test">> {
  const planned = new Date(dose.planned_time);
  const retryAt = new Date(addMinutesIso(dose.planned_time, 15));
  const kinds: Array<Exclude<PushDeliveryKind, "test">> = [];
  if (planned.getTime() <= now.getTime()) {
    kinds.push("initial");
  }
  if (retryAt.getTime() <= now.getTime()) {
    kinds.push("retry");
  }
  return kinds;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: process.env.TZ || "Asia/Yekaterinburg"
  }).format(new Date(iso));
}
