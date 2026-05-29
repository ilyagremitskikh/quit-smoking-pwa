import type { CourseRow, SmokeLogRow } from "../types/domain.js";
import { postQuitStartedAt, quitStartIso } from "./benefits.js";

export interface StreakResult {
  currentStartedAt: string | null;
  currentDays: number;
  currentHours: number;
  recordDays: number;
  recordHours: number;
}

export function calculateStreak(course: CourseRow | undefined, smokes: SmokeLogRow[], now = new Date()): StreakResult {
  const start = course ? quitStartIso(course) : now.toISOString();
  const sorted = [...smokes]
    .filter((smoke) => smoke.kind === "relapse" && smoke.logged_at >= start)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const currentStartedAt = course ? postQuitStartedAt(course, sorted) : start;
  const currentMs = Math.max(0, now.getTime() - new Date(currentStartedAt).getTime());

  const anchors = [start, ...sorted.map((smoke) => smoke.logged_at), now.toISOString()];
  let recordMs = 0;
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const from = new Date(anchors[index]!).getTime();
    const to = new Date(anchors[index + 1]!).getTime();
    recordMs = Math.max(recordMs, to - from);
  }

  return {
    currentStartedAt,
    currentDays: Math.floor(currentMs / 86_400_000),
    currentHours: Math.floor(currentMs / 3_600_000),
    recordDays: Math.floor(recordMs / 86_400_000),
    recordHours: Math.floor(recordMs / 3_600_000)
  };
}
