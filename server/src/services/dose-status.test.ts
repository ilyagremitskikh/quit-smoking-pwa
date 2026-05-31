import { describe, expect, it } from "vitest";
import { computeDoseViews, statusForTaking } from "./dose-status.js";
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
  it("keeps an elapsed dose pending during the grace window", () => {
    const views = computeDoseViews(rows, [], new Date("2026-05-29T03:09:59.000Z"));

    expect(views[0]?.status).toBe("pending");
  });

  it("marks an untouched dose late after the grace window", () => {
    const views = computeDoseViews(rows, [], new Date("2026-05-29T03:10:01.000Z"));

    expect(views[0]?.status).toBe("late");
  });

  it("recomputes a stored late log inside the grace window as taken", () => {
    const logs: DoseLogRow[] = [
      {
        id: 1,
        schedule_id: 1,
        taken_at: "2026-05-29T03:01:00.000Z",
        status: "late"
      }
    ];

    const views = computeDoseViews(rows, logs, new Date("2026-05-29T04:00:00.000Z"));

    expect(views[0]?.status).toBe("taken");
  });

  it("keeps a stored late log after the grace window as late", () => {
    const logs: DoseLogRow[] = [
      {
        id: 1,
        schedule_id: 1,
        taken_at: "2026-05-29T03:10:01.000Z",
        status: "taken"
      }
    ];

    const views = computeDoseViews(rows, logs, new Date("2026-05-29T04:00:00.000Z"));

    expect(views[0]?.status).toBe("late");
  });

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

describe("statusForTaking", () => {
  const effectiveTime = "2026-05-29T03:00:00.000Z";

  it("accepts an exact-time dose as taken", () => {
    expect(statusForTaking(effectiveTime, new Date("2026-05-29T03:00:00.000Z"))).toBe("taken");
  });

  it("accepts a dose inside the grace window as taken", () => {
    expect(statusForTaking(effectiveTime, new Date("2026-05-29T03:09:59.000Z"))).toBe("taken");
  });

  it("accepts a dose at the grace boundary as taken", () => {
    expect(statusForTaking(effectiveTime, new Date("2026-05-29T03:10:00.000Z"))).toBe("taken");
  });

  it("marks a dose after the grace window as late", () => {
    expect(statusForTaking(effectiveTime, new Date("2026-05-29T03:10:01.000Z"))).toBe("late");
  });
});
