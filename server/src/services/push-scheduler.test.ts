import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { initializeDatabase } from "../db/connection.js";
import { Repository } from "../db/repository.js";
import { findDueReminders, runPushReminderTick } from "./push-scheduler.js";
import type { PushPayload, PushSender } from "./push-service.js";
import type { PushSubscriptionRow } from "../types/domain.js";

class FakeSender implements PushSender {
  sent: Array<{ subscription: PushSubscriptionRow; payload: PushPayload }> = [];

  async send(subscription: PushSubscriptionRow, payload: PushPayload): Promise<void> {
    this.sent.push({ subscription, payload });
  }
}

describe("push scheduler", () => {
  let db: Database.Database;
  let repo: Repository;

  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = "public";
    process.env.VAPID_PRIVATE_KEY = "private";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
    db = new Database(":memory:");
    initializeDatabase(db);
    repo = new Repository(db);
    repo.createCourse("2026-05-29T03:00:00.000Z", "08:00");
    repo.upsertPushSubscription({
      endpoint: "https://push.example.test/one",
      p256dh: "key",
      auth: "auth"
    });
  });

  it("selects due initial reminders", () => {
    const due = findDueReminders(db, new Date("2026-05-29T03:01:00.000Z"));

    expect(due).toHaveLength(1);
    expect(due[0]?.kind).toBe("initial");
  });

  it("selects retry after fifteen minutes", () => {
    const due = findDueReminders(db, new Date("2026-05-29T03:16:00.000Z"));

    expect(due.map((item) => item.kind).sort()).toEqual(["initial", "retry"]);
  });

  it("does not send for taken doses", () => {
    repo.takeDose(1, new Date("2026-05-29T03:05:00.000Z"));

    expect(findDueReminders(db, new Date("2026-05-29T03:16:00.000Z"))).toHaveLength(0);
  });

  it("does not duplicate sent reminders", async () => {
    const sender = new FakeSender();

    await runPushReminderTick(repo, sender, new Date("2026-05-29T03:16:00.000Z"));
    await runPushReminderTick(repo, sender, new Date("2026-05-29T03:17:00.000Z"));

    expect(sender.sent).toHaveLength(2);
  });

  it("does not send after day 25", () => {
    expect(findDueReminders(db, new Date("2026-06-30T03:16:00.000Z"))).toHaveLength(0);
  });
});
