import type { CourseRow, SettingsRow, SmokeLogRow } from "../types/domain.js";
import { addDaysToDateKey, localDateKey, localDateTimeToUtcIso } from "./time.js";

export interface HealthMilestone {
  hours: number;
  title: string;
  text: string;
}

export interface BenefitsResult {
  quitStartedAt: string | null;
  smokeFreeHours: number;
  smokeFreeDays: number;
  cigarettesAvoided: number;
  moneySaved: number | null;
  currentMilestone: HealthMilestone | null;
  nextMilestone: HealthMilestone | null;
}

export const HEALTH_MILESTONES: HealthMilestone[] = [
  { hours: 2, title: "Первые часы", text: "Тяга идёт волнами, и каждую волну можно переждать." },
  { hours: 24, title: "1 день", text: "Первый чистый день уже даёт телу передышку от дыма." },
  { hours: 48, title: "2 дня", text: "Организм продолжает перестраиваться на жизнь без сигарет." },
  { hours: 72, title: "3 дня", text: "Три дня — заметная психологическая победа." },
  { hours: 168, title: "1 неделя", text: "Неделя без сигарет закрепляет новую норму." },
  { hours: 336, title: "2 недели", text: "Две недели — уже не случайность, а система." },
  { hours: 720, title: "1 месяц", text: "Месяц без сигарет — сильная база для долгой свободы." }
];

export function quitStartIso(course: CourseRow): string {
  const dayOne = localDateKey(new Date(course.start_date));
  const dayFive = addDaysToDateKey(dayOne, 4);
  return localDateTimeToUtcIso(dayFive, "00:00");
}

export function lastRelapseAfterQuit(course: CourseRow, smokes: SmokeLogRow[]): SmokeLogRow | undefined {
  const quitStart = quitStartIso(course);
  return [...smokes]
    .filter((smoke) => smoke.kind === "relapse" && smoke.logged_at >= quitStart)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];
}

export function postQuitStartedAt(course: CourseRow, smokes: SmokeLogRow[]): string {
  return lastRelapseAfterQuit(course, smokes)?.logged_at ?? quitStartIso(course);
}

export function calculateBenefits(
  course: CourseRow | undefined,
  smokes: SmokeLogRow[],
  settings: SettingsRow,
  now = new Date()
): BenefitsResult {
  if (!course) {
    return emptyBenefits();
  }

  const startedAt = postQuitStartedAt(course, smokes);
  const elapsedMs = Math.max(0, now.getTime() - new Date(startedAt).getTime());
  const smokeFreeHours = Math.floor(elapsedMs / 3_600_000);
  const smokeFreeDays = Math.floor(elapsedMs / 86_400_000);
  const cigarettesPerHour = settings.cigarettes_per_day / 24;
  const cigarettesAvoided = Math.floor(smokeFreeHours * cigarettesPerHour);
  const moneySaved = settings.pack_price
    ? Math.round((cigarettesAvoided / 20) * settings.pack_price)
    : null;

  return {
    quitStartedAt: startedAt,
    smokeFreeHours,
    smokeFreeDays,
    cigarettesAvoided,
    moneySaved,
    currentMilestone: [...HEALTH_MILESTONES].reverse().find((item) => item.hours <= smokeFreeHours) ?? null,
    nextMilestone: HEALTH_MILESTONES.find((item) => item.hours > smokeFreeHours) ?? null
  };
}

function emptyBenefits(): BenefitsResult {
  return {
    quitStartedAt: null,
    smokeFreeHours: 0,
    smokeFreeDays: 0,
    cigarettesAvoided: 0,
    moneySaved: null,
    currentMilestone: null,
    nextMilestone: HEALTH_MILESTONES[0] ?? null
  };
}
