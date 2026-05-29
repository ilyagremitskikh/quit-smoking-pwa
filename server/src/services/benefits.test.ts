import { describe, expect, it } from "vitest";
import { calculateBenefits, quitStartIso } from "./benefits.js";
import type { CourseRow, SettingsRow, SmokeLogRow } from "../types/domain.js";

const course: CourseRow = {
  id: 1,
  start_date: "2026-05-01T00:00:00.000Z",
  first_dose_time: "08:00",
  status: "active",
  created_at: "2026-05-01T00:00:00.000Z"
};

const settings: SettingsRow = {
  id: 1,
  pack_price: 300,
  reminders_enabled: 0,
  cigarettes_per_day: 20
};

describe("benefits", () => {
  it("starts the post-quit clock on day five", () => {
    expect(quitStartIso(course)).toBe("2026-05-04T19:00:00.000Z");
  });

  it("calculates avoided cigarettes and money from current post-quit streak", () => {
    const result = calculateBenefits(course, [], settings, new Date("2026-05-06T19:00:00.000Z"));

    expect(result.smokeFreeHours).toBe(48);
    expect(result.cigarettesAvoided).toBe(40);
    expect(result.moneySaved).toBe(600);
    expect(result.currentMilestone?.hours).toBe(48);
  });

  it("resets benefits after relapse but ignores transition smoke", () => {
    const smokes: SmokeLogRow[] = [
      { id: 1, logged_at: "2026-05-03T12:00:00.000Z", kind: "transition", note: null },
      { id: 2, logged_at: "2026-05-05T19:00:00.000Z", kind: "relapse", note: null }
    ];
    const result = calculateBenefits(course, smokes, settings, new Date("2026-05-06T19:00:00.000Z"));

    expect(result.smokeFreeHours).toBe(24);
    expect(result.cigarettesAvoided).toBe(20);
  });
});
