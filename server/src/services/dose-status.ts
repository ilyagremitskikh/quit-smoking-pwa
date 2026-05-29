import type { DoseLogRow, DoseScheduleRow, DoseView } from "../types/domain.js";

export function computeDoseViews(
  rows: DoseScheduleRow[],
  logs: DoseLogRow[],
  now = new Date()
): DoseView[] {
  const logBySchedule = new Map(logs.map((log) => [log.schedule_id, log]));

  return rows.map((row, index) => {
    const log = logBySchedule.get(row.id);
    if (log) {
      return toView(row, log.status, log.taken_at);
    }

    const planned = new Date(row.planned_time);
    if (planned.getTime() > now.getTime()) {
      return toView(row, "pending", null);
    }

    const nextSameDay = rows.slice(index + 1).find((next) => next.day_number === row.day_number);
    const isPastNextSlot = nextSameDay
      ? new Date(nextSameDay.planned_time).getTime() <= now.getTime()
      : isPastLocalEndOfDay(row.planned_time, now);

    return toView(row, isPastNextSlot ? "skipped" : "late", null);
  });
}

export function statusForTaking(plannedTime: string, now = new Date()): "taken" | "late" {
  return now.getTime() > new Date(plannedTime).getTime() ? "late" : "taken";
}

function toView(
  row: DoseScheduleRow,
  status: DoseView["status"],
  takenAt: string | null
): DoseView {
  return {
    id: row.id,
    dayNumber: row.day_number,
    phase: row.phase,
    plannedTime: row.planned_time,
    intervalMinutes: row.interval_minutes,
    flexible: row.flexible === 1,
    status,
    takenAt
  };
}

function isPastLocalEndOfDay(plannedTime: string, now: Date): boolean {
  const planned = new Date(plannedTime);
  const localEnd = new Date(planned.getTime());
  localEnd.setHours(23, 59, 59, 999);
  return now.getTime() > localEnd.getTime();
}
