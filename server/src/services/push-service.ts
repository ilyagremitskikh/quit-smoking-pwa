import webPush, { PushSubscription } from "web-push";
import type { PushSubscriptionRow } from "../types/domain.js";
import { Repository } from "../db/repository.js";
import { buildTestPayload } from "./push-messages.js";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  badgeCount?: number;
}

export interface PushSender {
  send(subscription: PushSubscriptionRow, payload: PushPayload): Promise<void>;
}

export class WebPushSender implements PushSender {
  private configured = false;

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (publicKey && privateKey && subject) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    }
  }

  async send(subscription: PushSubscriptionRow, payload: PushPayload): Promise<void> {
    if (!this.configured) {
      throw new Error("VAPID keys are not configured");
    }

    await webPush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload));
  }
}

export async function sendTestPush(repo: Repository, sender: PushSender, endpoint: string): Promise<void> {
  const subscription = repo.getPushSubscriptionByEndpoint(endpoint);
  if (!subscription || subscription.disabled_at) {
    throw new Error("Push subscription not found");
  }

  try {
    await sender.send(subscription, buildTestPayload());
    repo.recordPushDelivery({
      scheduleId: null,
      subscriptionId: subscription.id,
      kind: "test",
      status: "sent"
    });
  } catch (error) {
    const message = errorMessage(error);
    repo.recordPushDelivery({
      scheduleId: null,
      subscriptionId: subscription.id,
      kind: "test",
      status: "failed",
      error: message
    });
    if (isGonePushError(error)) {
      repo.disablePushSubscription(subscription.endpoint, message);
    }
    throw error;
  }
}

export function isGonePushError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const statusCode = "statusCode" in error ? Number(error.statusCode) : NaN;
  return statusCode === 404 || statusCode === 410;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown push error";
}

function toWebPushSubscription(subscription: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };
}
