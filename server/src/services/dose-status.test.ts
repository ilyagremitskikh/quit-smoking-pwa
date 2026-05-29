import { describe, expect, it } from "vitest";
import { computeDoseViews } from "./dose-status.js";
import type { DoseLogRow, DoseScheduleRow } from "../types/domain.js";

const rows: DoseScheduleRow[] = [
  {
    id: 1,
    course_id: 1,
    day_number: 1,
    phase: 1,
    planned_time: "2026-05-29T03:00:00.000Z",
    interval_minutes: 120,
    flexible: 0
  },
  {
    id: 2,
    course_id: 1,
    day_number: 1,
    phase: 1,
    planned_time: "2026-05-29T05:00:00.000Z",
    interval_minutes: 120,
    flexible: 0
  },
  {
    id: 3,
    course_id: 1,
    day_number: 2,
    phase: 1,
    planned_time: "2026-05-30T03:00:00.000Z",
    interval_minutes: 120,
    flexible: 0
  }
];

describe("computeDoseViews", () => {
  it("shifts the next same-day dose from a late taken_at", () => {
    const logs: DoseLogRow[] = [
      {
        id: 1,
        schedule_id: 1,
        taken_at: "2026-05-29T03:20:00.000Z",
        status: "late"
      }
    ];

    const views = computeDoseViews(rows, logs, new Date("2026-05-29T04:00:00.000Z"));

    expect(views[1]?.effectiveTime).toBe("2026-05-29T05:20:00.000Z");
    expect(views[1]?.shifted).toBe(true);
  });

  it("does not shift the next course day", () => {
    const logs: DoseLogRow[] = [
      {
        id: 1,
        schedule_id: 2,
        taken_at: "2026-05-29T05:40:00.000Z",
        status: "late"
      }
    ];

    const views = computeDoseViews(rows, logs, new Date("2026-05-29T06:00:00.000Z"));

    expect(views[2]?.effectiveTime).toBe("2026-05-30T03:00:00.000Z");
    expect(views[2]?.shifted).toBe(false);
  });
});
