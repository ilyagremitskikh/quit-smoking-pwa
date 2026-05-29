export const APP_TIME_ZONE = process.env.TZ || "Asia/Yekaterinburg";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

export function nowIso(): string {
  return new Date().toISOString();
}

export function isoFromDate(date: Date): string {
  return date.toISOString();
}

export function localDateKey(date = new Date()): string {
  const parts = localParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function localDateTimeToUtcIso(dateKey: string, time: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || hour === undefined || minute === undefined) {
    throw new Error(`Invalid local date/time: ${dateKey} ${time}`);
  }
  return localDateTimeToUtc(year, month, day, hour, minute, 0).toISOString();
}

export function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function daysBetweenLocal(startIso: string, end = new Date()): number {
  const start = parseDateKey(localDateKey(new Date(startIso)));
  const finish = parseDateKey(localDateKey(end));
  return Math.floor((finish.getTime() - start.getTime()) / 86_400_000);
}

export function dayNumberForCourse(startIso: string, date = new Date()): number {
  return daysBetweenLocal(startIso, date) + 1;
}

export function secondsUntil(iso: string, from = new Date()): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - from.getTime()) / 1000));
}

export function sameLocalDay(aIso: string, b = new Date()): boolean {
  return localDateKey(new Date(aIso)) === localDateKey(b);
}

function localDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = timeZoneOffsetMinutes(guess);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offset * 60_000);
}

function timeZoneOffsetMinutes(date: Date): number {
  const parts = localParts(date);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return (asUtc - date.getTime()) / 60_000;
}

function localParts(date: Date) {
  const entries = formatter.formatToParts(date).map((part) => [part.type, part.value]);
  const values = Object.fromEntries(entries) as Record<string, string>;
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
