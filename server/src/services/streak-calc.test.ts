import { describe, expect, it } from "vitest";
import { calculateStreak } from "./streak-calc.js";
import type { CourseRow, SmokeLogRow } from "../types/domain.js";

const course: CourseRow = {
  id: 1,
  start_date: "2026-05-01T00:00:00.000Z",
  first_dose_time: "08:00",
  status: "active",
  created_at: "2026-05-01T00:00:00.000Z"
};

describe("calculateStreak", () => {
  it("counts from course start when there are no smokes", () => {
    const result = calculateStreak(course, [], new Date("2026-05-05T19:00:00.000Z"));

    expect(result.currentDays).toBe(1);
    expect(result.recordDays).toBe(1);
  });

  it("counts current streak from the last relapse and ignores transition smoke", () => {
    const smokes: SmokeLogRow[] = [
      { id: 1, logged_at: "2026-05-02T00:00:00.000Z", kind: "transition", note: null },
      { id: 2, logged_at: "2026-05-05T00:00:00.000Z", kind: "relapse", note: null }
    ];
    const result = calculateStreak(course, smokes, new Date("2026-05-06T12:00:00.000Z"));

    expect(result.currentHours).toBe(36);
    expect(result.recordDays).toBe(1);
  });
});
