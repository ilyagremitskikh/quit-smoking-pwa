import { describe, expect, it } from "vitest";
import { generateSchedule } from "./schedule-generator.js";

describe("generateSchedule", () => {
  it("creates the full 25-day cytisine schedule", () => {
    const schedule = generateSchedule(1, "2026-05-29T05:00:00.000Z", "08:00");

    expect(schedule).toHaveLength(101);
    expect(schedule.filter((dose) => dose.dayNumber <= 3)).toHaveLength(18);
    expect(schedule.filter((dose) => dose.dayNumber >= 4 && dose.dayNumber <= 12)).toHaveLength(45);
    expect(schedule.filter((dose) => dose.dayNumber >= 21)).toHaveLength(10);
  });

  it("uses two flexible slots eight hours apart for phase five", () => {
    const schedule = generateSchedule(1, "2026-05-29T05:00:00.000Z", "08:00");
    const day21 = schedule.filter((dose) => dose.dayNumber === 21);

    expect(day21).toHaveLength(2);
    expect(day21.every((dose) => dose.flexible)).toBe(true);
    expect(new Date(day21[1]!.plannedTime).getTime() - new Date(day21[0]!.plannedTime).getTime()).toBe(
      8 * 60 * 60 * 1000
    );
  });
});
