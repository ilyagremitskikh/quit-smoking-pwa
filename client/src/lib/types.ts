export type DoseStatus = "pending" | "taken" | "late" | "skipped";

export interface Course {
  id: number;
  start_date: string;
  first_dose_time: string;
  status: "active" | "done" | "aborted";
  created_at: string;
}

export interface DoseView {
  id: number;
  dayNumber: number;
  phase: number;
  plannedTime: string;
  effectiveTime: string;
  intervalMinutes: number;
  flexible: boolean;
  status: DoseStatus;
  takenAt: string | null;
  shifted: boolean;
}

export interface Quote {
  id: number;
  text: string;
  author: string | null;
}

export interface Settings {
  id: 1;
  pack_price: number | null;
  reminders_enabled: 0 | 1;
  cigarettes_per_day: number;
}

export interface HealthMilestone {
  hours: number;
  title: string;
  text: string;
}

export interface Benefits {
  quitStartedAt: string | null;
  smokeFreeHours: number;
  smokeFreeDays: number;
  cigarettesAvoided: number;
  moneySaved: number | null;
  currentMilestone: HealthMilestone | null;
  nextMilestone: HealthMilestone | null;
}

export interface AppState {
  setupNeeded: boolean;
  course: Course | null;
  mode: "setup" | "course" | "afterCourse";
  currentDay: number | null;
  currentPhase: number | null;
  todaySchedule: DoseView[];
  nextDose: DoseView | null;
  streak: {
    currentStartedAt: string | null;
    currentDays: number;
    currentHours: number;
    recordDays: number;
    recordHours: number;
  };
  benefits: Benefits;
  quote: Quote | null;
  settings: Settings;
}

export interface ProgressDay {
  dayNumber: number;
  phase: number;
  planned: number;
  taken: number;
  late: number;
  skipped: number;
  complete: boolean;
  partial: boolean;
}

export interface SmokeLog {
  id: number;
  logged_at: string;
  note: string | null;
  kind: "transition" | "relapse";
}

export interface ProgressResponse {
  days: ProgressDay[];
  smokes: SmokeLog[];
  smokeEvents: Array<SmokeLog & { dayNumber: number | null }>;
  benefits: Benefits;
  milestones: Array<{ day: number; label: string }>;
}

export interface SmokeResponse {
  smoke: SmokeLog;
  shouldOfferVideo: boolean;
}

export interface PushConfig {
  publicKey: string | null;
  available: boolean;
  remindersEnabled: boolean;
}

export type DemoScenarioId = "day1" | "day5" | "day13" | "day21" | "day25" | "after";

export interface DemoScenarioResponse {
  demoNow: string;
  state: AppState;
}
