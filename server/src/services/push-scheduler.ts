import cron from "node-cron";
import type Database from "better-sqlite3";
import { Repository } from "../db/repository.js";
import { addMinutesIso } from "./time.js";
import { computeEffectiveTimes } from "./dose-status.js";
import { errorMessage, isGonePushError, PushSender } from "./push-service.js";
import { buildReminderPayload, REMINDER_MILESTONES, type ReminderKind } from "./push-messages.js";
import type { DoseLogRow, DoseScheduleRow, PushSubscriptionRow } from "../types/domain.js";

interface DueReminder {
  subscription: PushSubscriptionRow;
  dose: DoseScheduleRow;
  effectiveTime: string;
  kind: ReminderKind;
  pendingCount: number;
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
      await sender.send(
        reminder.subscription,
        buildReminderPayload(reminder.kind, {
          effectiveTime: reminder.effectiveTime,
          pendingCount: reminder.pendingCount
        })
      );
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

  const rows = db
    .prepare(
      `
      SELECT *
      FROM dose_schedule
      WHERE course_id = ?
        AND day_number BETWEEN 1 AND 25
      ORDER BY planned_time
    `
    )
    .all(course.id) as DoseScheduleRow[];

  if (rows.length === 0) {
    return [];
  }

  const logs = db
    .prepare(`
      SELECT dl.*
      FROM dose_log dl
      JOIN dose_schedule ds ON ds.id = dl.schedule_id
      WHERE ds.course_id = ?
    `)
    .all(course.id) as DoseLogRow[];
  const logBySchedule = new Map(logs.map((log) => [log.schedule_id, log]));
  const effectiveTimeBySchedule = computeEffectiveTimes(rows, logBySchedule);
  const doses = rows.filter((dose) => {
    const effectiveTime = effectiveTimeBySchedule.get(dose.id) ?? dose.planned_time;
    return dose.day_number === courseAgeDays && !logBySchedule.has(dose.id) && new Date(effectiveTime).getTime() <= now.getTime();
  });

  if (doses.length === 0) {
    return [];
  }

  // Untaken doses whose time has come — drives the app badge count.
  const pendingCount = doses.length;

  const subscriptions = db
    .prepare("SELECT * FROM push_subscription WHERE disabled_at IS NULL ORDER BY id")
    .all() as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return [];
  }

  const sentKindsStmt = db.prepare(`
    SELECT kind
    FROM push_delivery
    WHERE schedule_id = ?
      AND subscription_id = ?
      AND status = 'sent'
  `);

  const due: DueReminder[] = [];

  for (const dose of doses) {
    const effectiveTime = effectiveTimeBySchedule.get(dose.id) ?? dose.planned_time;
    for (const subscription of subscriptions) {
      const sentKinds = new Set(
        (sentKindsStmt.all(dose.id, subscription.id) as Array<{ kind: string }>).map((row) => row.kind)
      );
      // Only the next un-sent stage — guarantees one reminder per dose per tick.
      const nextStage = REMINDER_MILESTONES.find((milestone) => !sentKinds.has(milestone.kind));
      if (!nextStage) {
        continue;
      }
      const dueAt = new Date(addMinutesIso(effectiveTime, nextStage.offsetMinutes)).getTime();
      if (dueAt <= now.getTime()) {
        due.push({ dose, effectiveTime, subscription, kind: nextStage.kind, pendingCount });
      }
    }
  }

  return due;
}
