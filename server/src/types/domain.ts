export type CourseStatus = "active" | "done" | "aborted";
export type DoseComputedStatus = "pending" | "taken" | "late" | "skipped";
export type SmokeKind = "transition" | "relapse";

export interface CourseRow {
  id: number;
  start_date: string;
  first_dose_time: string;
  status: CourseStatus;
  created_at: string;
}

export interface DoseScheduleRow {
  id: number;
  course_id: number;
  day_number: number;
  phase: number;
  planned_time: string;
  interval_minutes: number;
  flexible: 0 | 1;
}

export interface DoseLogRow {
  id: number;
  schedule_id: number;
  taken_at: string;
  status: "taken" | "late";
}

export interface SmokeLogRow {
  id: number;
  logged_at: string;
  note: string | null;
  kind: SmokeKind;
}

export interface QuoteRow {
  id: number;
  text: string;
  author: string | null;
}

export interface SettingsRow {
  id: 1;
  pack_price: number | null;
  reminders_enabled: 0 | 1;
  cigarettes_per_day: number;
}

export interface DoseView {
  id: number;
  dayNumber: number;
  phase: number;
  plannedTime: string;
  intervalMinutes: number;
  flexible: boolean;
  status: DoseComputedStatus;
  takenAt: string | null;
}
