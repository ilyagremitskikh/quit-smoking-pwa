import type { PushPayload } from "./push-service.js";
import type { PushDeliveryKind } from "../types/domain.js";
import { APP_TIME_ZONE } from "./time.js";

export type ReminderKind = Exclude<PushDeliveryKind, "test">;

export interface ReminderMilestone {
  kind: ReminderKind;
  offsetMinutes: number;
}

/**
 * Single source of truth for the reminder cadence: one notification per stage,
 * escalating gently, capped at three. The scheduler sends at most one stage per
 * tick, so two reminders never arrive together.
 */
export const REMINDER_MILESTONES: ReminderMilestone[] = [
  { kind: "initial", offsetMinutes: 0 },
  { kind: "retry", offsetMinutes: 15 },
  { kind: "final", offsetMinutes: 30 }
];

const APP_URL = "/";

export function buildReminderPayload(
  kind: ReminderKind,
  options: { effectiveTime: string; pendingCount: number }
): PushPayload {
  const time = formatTime(options.effectiveTime);
  const badgeCount = Math.max(options.pendingCount, 1);

  switch (kind) {
    case "initial":
      return {
        title: "Время дозы 💊",
        body: `Слот на ${time}. Отметьте приём в приложении.`,
        url: APP_URL,
        badgeCount
      };
    case "retry":
      return {
        title: "Доза ещё не отмечена ⏰",
        body: `Слот на ${time} ждёт уже 15 минут.`,
        url: APP_URL,
        badgeCount
      };
    case "final":
      return {
        title: "Последнее напоминание на сегодня 🔔",
        body: `Отметьте дозу на ${time}, чтобы не потерять серию.`,
        url: APP_URL,
        badgeCount
      };
  }
}

export function buildTestPayload(): PushPayload {
  return {
    title: "QuitKit на связи 🔔",
    body: "Уведомления работают — так будут приходить напоминания о приёме.",
    url: APP_URL,
    badgeCount: 1
  };
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIME_ZONE
  }).format(new Date(iso));
}
