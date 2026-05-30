import { api } from "./api.js";

export type PushSupportStatus = "supported" | "unsupported" | "not-standalone";

export interface PushUiState {
  support: PushSupportStatus;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  endpoint: string | null;
  serverAvailable: boolean;
  remindersEnabled: boolean;
}

export async function getPushUiState(): Promise<PushUiState> {
  const config = await api.pushConfig();
  const support = detectSupport();

  const state: PushUiState = {
    support,
    permission: support === "unsupported" ? "unsupported" : Notification.permission,
    subscribed: false,
    endpoint: null,
    serverAvailable: config.available,
    remindersEnabled: config.remindersEnabled
  };

  if (support === "supported") {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    state.subscribed = Boolean(subscription);
    state.endpoint = subscription?.endpoint ?? null;
  }

  return state;
}

export async function enablePushReminders(): Promise<PushUiState> {
  const config = await api.pushConfig();
  if (!config.publicKey || !config.available) {
    throw new Error("Push is not configured on the server");
  }
  const support = detectSupport();
  if (support === "unsupported") {
    throw new Error("Push is not supported on this device");
  }
  if (support === "not-standalone") {
    throw new Error("Добавьте приложение на экран «Домой» и откройте его оттуда");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications permission was not granted");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(config.publicKey)
    }));

  await api.subscribePush(subscription.toJSON());
  return getPushUiState();
}

export async function disablePushReminders(): Promise<PushUiState> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await api.unsubscribePush(subscription.endpoint);
    await subscription.unsubscribe();
  }
  return getPushUiState();
}

export async function sendTestPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    throw new Error("Push subscription does not exist");
  }
  await api.testPush(subscription.endpoint);
}

function detectSupport(): PushSupportStatus {
  if (!isPushSupported()) {
    return "unsupported";
  }
  // Only iOS/iPadOS require the PWA to run from the Home Screen; desktop and
  // Android browsers support web push directly.
  if (isIos() && !isStandalonePwa()) {
    return "not-standalone";
  }
  return "supported";
}

function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isStandalonePwa(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIosDevice || isIpadOs;
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray.buffer;
}
