import Database from "better-sqlite3";
import { addDaysToDateKey, addMinutesIso, localDateKey, localDateTimeToUtcIso } from "./time.js";

export const PHASES = [
  { phase: 1, fromDay: 1, toDay: 3, intervalMin: 120, dosesPerDay: 6, flexible: false },
  { phase: 2, fromDay: 4, toDay: 12, intervalMin: 150, dosesPerDay: 5, flexible: false },
  { phase: 3, fromDay: 13, toDay: 16, intervalMin: 180, dosesPerDay: 4, flexible: false },
  { phase: 4, fromDay: 17, toDay: 20, intervalMin: 300, dosesPerDay: 3, flexible: false },
  { phase: 5, fromDay: 21, toDay: 25, intervalMin: 480, dosesPerDay: 2, flexible: true }
] as const;

export interface GeneratedDose {
  courseId: number;
  dayNumber: number;
  phase: number;
  plannedTime: string;
  intervalMinutes: number;
  flexible: boolean;
}

export function generateSchedule(courseId: number, startDateIso: string, firstDoseTime: string): GeneratedDose[] {
  const startDay = localDateKey(new Date(startDateIso));
  const doses: GeneratedDose[] = [];

  for (let dayNumber = 1; dayNumber <= 25; dayNumber += 1) {
    const phase = phaseForDay(dayNumber);
    const dateKey = addDaysToDateKey(startDay, dayNumber - 1);
    const firstDoseIso = localDateTimeToUtcIso(dateKey, firstDoseTime);

    for (let slot = 0; slot < phase.dosesPerDay; slot += 1) {
      doses.push({
        courseId,
        dayNumber,
        phase: phase.phase,
        plannedTime: addMinutesIso(firstDoseIso, phase.intervalMin * slot),
        intervalMinutes: phase.intervalMin,
        flexible: phase.flexible
      });
    }
  }

  return doses;
}

export function insertSchedule(db: Database.Database, doses: GeneratedDose[]): void {
  const insert = db.prepare(`
    INSERT INTO dose_schedule
      (course_id, day_number, phase, planned_time, interval_minutes, flexible)
    VALUES
      (@courseId, @dayNumber, @phase, @plannedTime, @intervalMinutes, @flexible)
  `);

  const transaction = db.transaction((items: GeneratedDose[]) => {
    for (const dose of items) {
      insert.run({ ...dose, flexible: dose.flexible ? 1 : 0 });
    }
  });

  transaction(doses);
}

export function phaseForDay(dayNumber: number) {
  const phase = PHASES.find((item) => dayNumber >= item.fromDay && dayNumber <= item.toDay);
  if (!phase) {
    throw new Error(`No phase for day ${dayNumber}`);
  }
  return phase;
}
