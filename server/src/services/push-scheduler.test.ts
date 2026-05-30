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

  it("offers only the initial stage before it has been sent", () => {
    const due = findDueReminders(db, new Date("2026-05-29T03:16:00.000Z"));

    expect(due).toHaveLength(1);
    expect(due[0]?.kind).toBe("initial");
  });

  it("never sends two reminders for one dose in a single tick", async () => {
    const sender = new FakeSender();

    const sent = await runPushReminderTick(repo, sender, new Date("2026-05-29T04:00:00.000Z"));

    expect(sent).toBe(1);
    expect(sender.sent).toHaveLength(1);
  });

  it("escalates one stage per tick and caps at three", async () => {
    const sender = new FakeSender();

    await runPushReminderTick(repo, sender, new Date("2026-05-29T03:01:00.000Z"));
    await runPushReminderTick(repo, sender, new Date("2026-05-29T03:16:00.000Z"));
    await runPushReminderTick(repo, sender, new Date("2026-05-29T03:31:00.000Z"));
    await runPushReminderTick(repo, sender, new Date("2026-05-29T03:46:00.000Z"));

    expect(sender.sent).toHaveLength(3);
  });

  it("builds reminder payload with copy and a badge count", async () => {
    const sender = new FakeSender();

    await runPushReminderTick(repo, sender, new Date("2026-05-29T03:01:00.000Z"));

    expect(sender.sent[0]?.payload.title).toContain("Время дозы");
    expect(sender.sent[0]?.payload.badgeCount).toBe(1);
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

  it("uses effective time shifted from late taken dose", () => {
    repo.takeDose(1, new Date("2026-05-29T03:20:00.000Z"));

    expect(findDueReminders(db, new Date("2026-05-29T05:10:00.000Z"))).toHaveLength(0);

    const due = findDueReminders(db, new Date("2026-05-29T05:21:00.000Z"));
    expect(due).toHaveLength(1);
    expect(due[0]?.dose.id).toBe(2);
  });

  it("does not send after day 25", () => {
    expect(findDueReminders(db, new Date("2026-06-30T03:16:00.000Z"))).toHaveLength(0);
  });
});
