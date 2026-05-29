import type {
  AppState,
  DemoScenarioId,
  DemoScenarioResponse,
  DoseView,
  ProgressResponse,
  Settings,
  SmokeResponse
} from "./types.js";

const DEMO_NOW_KEY = "quitkit.demoNow";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const demoNow = getDemoNow();
  if (demoNow) {
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
  takeDose: (scheduleId: number) => request<DoseView>(`/api/doses/${scheduleId}/take`, { method: "POST" }),
  undoDose: (scheduleId: number) => request(`/api/doses/${scheduleId}/take`, { method: "DELETE" }),
  smoke: () => request<SmokeResponse>("/api/smoke", { method: "POST", body: JSON.stringify({}) }),
  progress: () => request<ProgressResponse>("/api/progress"),
  updateSettings: (input: { packPrice?: number | null; remindersEnabled?: boolean; cigarettesPerDay?: number }) =>
    request<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(input) }),
  demoScenario: (scenario: DemoScenarioId) =>
    request<DemoScenarioResponse>("/api/demo/scenario", {
      method: "POST",
      body: JSON.stringify({ scenario })
    })
};

export function getDemoNow(): string | null {
  return window.localStorage.getItem(DEMO_NOW_KEY);
}

export function setDemoNow(value: string): void {
  window.localStorage.setItem(DEMO_NOW_KEY, value);
  window.dispatchEvent(new CustomEvent("quitkit-demo-now-change"));
}

export function clearDemoNow(): void {
  window.localStorage.removeItem(DEMO_NOW_KEY);
  window.dispatchEvent(new CustomEvent("quitkit-demo-now-change"));
}
