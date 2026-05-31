import type { DoseLogRow, DoseScheduleRow, DoseView } from "../types/domain.js";

export const DOSE_GRACE_MINUTES = 10;

export function computeDoseViews(
  rows: DoseScheduleRow[],
  logs: DoseLogRow[],
  now = new Date()
): DoseView[] {
  const logBySchedule = new Map(logs.map((log) => [log.schedule_id, log]));
  const effectiveTimeBySchedule = computeEffectiveTimes(rows, logBySchedule);

  return rows.map((row, index) => {
    const log = logBySchedule.get(row.id);
    const effectiveTime = effectiveTimeBySchedule.get(row.id) ?? row.planned_time;
    if (log) {
      const status = log.taken_at ? statusForTaking(effectiveTime, new Date(log.taken_at)) : log.status;
      return toView(row, status, log.taken_at, effectiveTime);
    }

    const effective = new Date(effectiveTime);
    const graceEndsAt = addMinutes(effective, DOSE_GRACE_MINUTES);
    if (effective.getTime() > now.getTime()) {
      return toView(row, "pending", null, effectiveTime);
    }
    if (graceEndsAt.getTime() >= now.getTime()) {
      return toView(row, "pending", null, effectiveTime);
    }

    const nextSameDay = rows.slice(index + 1).find((next) => next.day_number === row.day_number);
    const nextEffectiveTime = nextSameDay ? effectiveTimeBySchedule.get(nextSameDay.id) ?? nextSameDay.planned_time : null;
    const isPastNextSlot = nextSameDay
      ? new Date(nextEffectiveTime!).getTime() <= now.getTime()
      : isPastLocalEndOfDay(effectiveTime, now);

    return toView(row, isPastNextSlot ? "skipped" : "late", null, effectiveTime);
  });
}

export function statusForTaking(effectiveTime: string, now = new Date()): "taken" | "late" {
  const graceEndsAt = addMinutes(new Date(effectiveTime), DOSE_GRACE_MINUTES);
  return now.getTime() > graceEndsAt.getTime() ? "late" : "taken";
}

function toView(
  row: DoseScheduleRow,
  status: DoseView["status"],
  takenAt: string | null,
  effectiveTime: string
): DoseView {
  return {
    id: row.id,
    dayNumber: row.day_number,
    phase: row.phase,
    plannedTime: row.planned_time,
    effectiveTime,
    intervalMinutes: row.interval_minutes,
    flexible: row.flexible === 1,
    status,
    takenAt,
    shifted: effectiveTime !== row.planned_time
  };
}

export function computeEffectiveTimes(
  rows: DoseScheduleRow[],
  logBySchedule: Map<number, DoseLogRow>
): Map<number, string> {
  const effective = new Map<number, string>();
  let previousDay: number | null = null;
  let previousAnchorIso: string | null = null;

  for (const row of rows) {
    if (previousDay !== row.day_number) {
      previousDay = row.day_number;
      previousAnchorIso = null;
    }

    const shiftedByPrevious = previousAnchorIso
      ? addMinutesIso(previousAnchorIso, row.interval_minutes)
      : row.planned_time;
    const effectiveTime = maxIso(row.planned_time, shiftedByPrevious);
    effective.set(row.id, effectiveTime);

    const log = logBySchedule.get(row.id);
    previousAnchorIso = log?.taken_at ?? effectiveTime;
  }

  return effective;
}

function addMinutesIso(iso: string, minutes: number): string {
  return addMinutes(new Date(iso), minutes).toISOString();
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function maxIso(a: string, b: string): string {
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function isPastLocalEndOfDay(plannedTime: string, now: Date): boolean {
  const planned = new Date(plannedTime);
  const localEnd = new Date(planned.getTime());
  localEnd.setHours(23, 59, 59, 999);
  return now.getTime() > localEnd.getTime();
}
