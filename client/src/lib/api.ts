import type {
  AppState,
  DemoScenarioId,
  DemoScenarioResponse,
  DoseView,
  ProgressResponse,
  PushConfig,
  Settings,
  SmokeResponse
} from "./types.js";

const DEMO_NOW_KEY = "quitkit.demoNow";
export const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === "1" || import.meta.env.VITE_ENABLE_DEMO === "true";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-QuitKit-Time-Zone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  const demoNow = getDemoNow();
  if (demoEnabled && demoNow) {
    headers.set("X-QuitKit-Demo-Now", demoNow);
  }

  const response = await fetch(path, {
    headers,
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  state: () => request<AppState>("/api/state"),
  startCourse: (input: { startDate: string; firstDoseTime: string }) =>
    request("/api/course", { method: "POST", body: JSON.stringify(input) }),
  abortCourse: () => request("/api/course/abort", { method: "POST" }),
  takeDose: (scheduleId: number, input?: { takenAt?: string }) =>
    request<DoseView>(`/api/doses/${scheduleId}/take`, {
      method: "POST",
      body: JSON.stringify(input ?? {})
    }),
  undoDose: (scheduleId: number) => request(`/api/doses/${scheduleId}/take`, { method: "DELETE" }),
  smoke: () => request<SmokeResponse>("/api/smoke", { method: "POST", body: JSON.stringify({}) }),
  undoSmoke: (smokeId: number) => request(`/api/smoke/${smokeId}`, { method: "DELETE" }),
  closeDay: (dayNumber: number) =>
    request<{ closed: number }>(`/api/days/${dayNumber}/close`, {
      method: "POST",
      body: JSON.stringify({ mode: "skipped" })
    }),
  progress: () => request<ProgressResponse>("/api/progress"),
  updateSettings: (input: { packPrice?: number | null; remindersEnabled?: boolean; cigarettesPerDay?: number }) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(input) }),
  pushConfig: () => request<PushConfig>("/api/push/config"),
  subscribePush: (subscription: PushSubscriptionJSON) =>
    request<{ config: PushConfig }>("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription)
    }),
  unsubscribePush: (endpoint: string) =>
    request("/api/push/subscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint })
    }),
  testPush: (endpoint: string) =>
    request("/api/push/test", {
      method: "POST",
      body: JSON.stringify({ endpoint })
    }),
  demoScenario: (scenario: DemoScenarioId) =>
    request<DemoScenarioResponse>("/api/demo/scenario", {
      method: "POST",
      body: JSON.stringify({ scenario })
    })
};

export function getDemoNow(): string | null {
  if (!demoEnabled) {
    return null;
  }
  return window.localStorage.getItem(DEMO_NOW_KEY);
}

export function setDemoNow(value: string): void {
  if (!demoEnabled) {
    return;
  }
  window.localStorage.setItem(DEMO_NOW_KEY, value);
  window.dispatchEvent(new CustomEvent("quitkit-demo-now-change"));
}

export function clearDemoNow(): void {
  window.localStorage.removeItem(DEMO_NOW_KEY);
  window.dispatchEvent(new CustomEvent("quitkit-demo-now-change"));
}
