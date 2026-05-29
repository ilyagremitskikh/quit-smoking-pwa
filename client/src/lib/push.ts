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
  if (!isPushSupported()) {
    return {
      support: "unsupported",
      permission: "unsupported",
      subscribed: false,
      endpoint: null,
      serverAvailable: config.available,
      remindersEnabled: config.remindersEnabled
    };
  }
  if (!isStandalonePwa()) {
    return {
      support: "not-standalone",
      permission: Notification.permission,
      subscribed: false,
      endpoint: null,
      serverAvailable: config.available,
      remindersEnabled: config.remindersEnabled
    };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    support: isStandalonePwa() ? "supported" : "not-standalone",
    permission: Notification.permission,
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint ?? null,
    serverAvailable: config.available,
    remindersEnabled: config.remindersEnabled
  };
}

export async function enablePushReminders(): Promise<PushUiState> {
  const config = await api.pushConfig();
  if (!config.publicKey || !config.available) {
    throw new Error("Push is not configured on the server");
  }
  if (!isPushSupported()) {
    throw new Error("Push is not supported on this device");
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

function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function isStandalonePwa(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
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
