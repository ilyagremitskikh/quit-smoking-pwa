import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { initializeDatabase } from "../db/connection.js";
import { Repository } from "../db/repository.js";

describe("api routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let db: Database.Database;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    delete process.env.ENABLE_DEMO;
    db = new Database(":memory:");
    initializeDatabase(db);
    app = await buildApp(new Repository(db));
  });

  afterEach(async () => {
    await app.close();
  });

  it("starts a course and returns state", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-29T05:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });

    expect(create.statusCode).toBe(201);

    const state = await app.inject({ method: "GET", url: "/api/state" });
    const body = state.json();

    expect(state.statusCode).toBe(200);
    expect(body.setupNeeded).toBe(false);
    expect(body.course.first_dose_time).toBe("08:00");
  });

  it("marks a dose and logs a smoke", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: new Date().toISOString(),
        firstDoseTime: "08:00"
      }
    });

    const state = await app.inject({ method: "GET", url: "/api/state" });
    const doseId = state.json().todaySchedule[0].id;

    const dose = await app.inject({ method: "POST", url: `/api/doses/${doseId}/take` });
    const smoke = await app.inject({ method: "POST", url: "/api/smoke", payload: {} });

    expect(dose.statusCode).toBe(200);
    expect(["taken", "late"]).toContain(dose.json().status);
    expect(smoke.statusCode).toBe(201);
    expect(smoke.json().smoke.kind).toBe("transition");
    expect(smoke.json().shouldOfferVideo).toBe(false);
  });

  it("hides demo scenarios unless explicitly enabled", async () => {
    const demo = await app.inject({
      method: "POST",
      url: "/api/demo/scenario",
      payload: { scenario: "day1" }
    });

    expect(demo.statusCode).toBe(404);
  });

  it("allows demo scenarios when enabled", async () => {
    await app.close();
    process.env.ENABLE_DEMO = "1";
    const db = new Database(":memory:");
    initializeDatabase(db);
    app = await buildApp(new Repository(db));

    const demo = await app.inject({
      method: "POST",
      url: "/api/demo/scenario",
      payload: { scenario: "day1" }
    });

    expect(demo.statusCode).toBe(201);
    expect(demo.json().state.setupNeeded).toBe(false);
  });

  it("marks day five smoke as relapse and offers video", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-01T05:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });

    const smoke = await app.inject({
      method: "POST",
      url: "/api/smoke",
      headers: {
        "X-QuitKit-Demo-Now": "2026-05-05T08:00:00.000Z"
      },
      payload: {}
    });

    expect(smoke.statusCode).toBe(201);
    expect(smoke.json().smoke.kind).toBe("relapse");
    expect(smoke.json().shouldOfferVideo).toBe(true);
  });

  it("stores push subscription and exposes config", async () => {
    process.env.VAPID_PUBLIC_KEY = "public";
    process.env.VAPID_PRIVATE_KEY = "private";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";

    const subscribe = await app.inject({
      method: "POST",
      url: "/api/push/subscribe",
      payload: {
        endpoint: "https://push.example.test/sub",
        keys: {
          p256dh: "key",
          auth: "auth"
        }
      }
    });
    const config = await app.inject({ method: "GET", url: "/api/push/config" });

    expect(subscribe.statusCode).toBe(201);
    expect(subscribe.json().subscription.endpoint).toBe("https://push.example.test/sub");
    expect(config.json().available).toBe(true);
    expect(config.json().remindersEnabled).toBe(true);
  });

  it("returns shifted effective time after a late dose", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-29T03:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });
    const state = await app.inject({
      method: "GET",
      url: "/api/state",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:05:00.000Z" }
    });
    const firstDoseId = state.json().todaySchedule[0].id;

    await app.inject({
      method: "POST",
      url: `/api/doses/${firstDoseId}/take`,
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:20:00.000Z" }
    });
    const shifted = await app.inject({
      method: "GET",
      url: "/api/state",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:21:00.000Z" }
    });

    expect(shifted.json().nextDose.effectiveTime).toBe("2026-05-29T05:20:00.000Z");
    expect(shifted.json().nextDose.shifted).toBe(true);
  });

  it("accepts a corrected takenAt and marks late from that time", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-29T03:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });
    const state = await app.inject({
      method: "GET",
      url: "/api/state",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:05:00.000Z" }
    });
    const firstDoseId = state.json().todaySchedule[0].id;

    const dose = await app.inject({
      method: "POST",
      url: `/api/doses/${firstDoseId}/take`,
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T04:00:00.000Z" },
      payload: { takenAt: "2026-05-29T03:30:00.000Z" }
    });

    expect(dose.statusCode).toBe(200);
    expect(dose.json().takenAt).toBe("2026-05-29T03:30:00.000Z");
    expect(dose.json().status).toBe("late");
  });

  it("keeps dose API status taken inside the ten minute grace window", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-29T03:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });
    const state = await app.inject({
      method: "GET",
      url: "/api/state",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:05:00.000Z" }
    });
    const firstDoseId = state.json().todaySchedule[0].id;

    const plusOne = await app.inject({
      method: "POST",
      url: `/api/doses/${firstDoseId}/take`,
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T04:00:00.000Z" },
      payload: { takenAt: "2026-05-29T03:01:00.000Z" }
    });
    const plusTen = await app.inject({
      method: "POST",
      url: `/api/doses/${firstDoseId}/take`,
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T04:00:00.000Z" },
      payload: { takenAt: "2026-05-29T03:10:00.000Z" }
    });
    const plusTenAndOneSecond = await app.inject({
      method: "POST",
      url: `/api/doses/${firstDoseId}/take`,
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T04:00:00.000Z" },
      payload: { takenAt: "2026-05-29T03:10:01.000Z" }
    });

    expect(plusOne.statusCode).toBe(200);
    expect(plusOne.json().status).toBe("taken");
    expect(plusTen.statusCode).toBe(200);
    expect(plusTen.json().status).toBe("taken");
    expect(plusTenAndOneSecond.statusCode).toBe(200);
    expect(plusTenAndOneSecond.json().status).toBe("late");
  });

  it("recomputes stale late logs inside grace for state and progress", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-29T03:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });
    const state = await app.inject({
      method: "GET",
      url: "/api/state",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:05:00.000Z" }
    });
    const firstDoseId = state.json().todaySchedule[0].id;
    await app.inject({
      method: "POST",
      url: `/api/doses/${firstDoseId}/take`,
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T04:00:00.000Z" },
      payload: { takenAt: "2026-05-29T03:01:00.000Z" }
    });
    db.prepare("UPDATE dose_log SET status = 'late' WHERE schedule_id = ?").run(firstDoseId);

    const recomputedState = await app.inject({
      method: "GET",
      url: "/api/state",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T04:00:00.000Z" }
    });
    const progress = await app.inject({
      method: "GET",
      url: "/api/progress",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T04:00:00.000Z" }
    });

    expect(recomputedState.json().todaySchedule[0]).toMatchObject({
      id: firstDoseId,
      status: "taken",
      takenAt: "2026-05-29T03:01:00.000Z"
    });
    expect(progress.json().adherence).toMatchObject({ taken: 1, late: 0 });
    expect(progress.json().days[0]).toMatchObject({ taken: 1, late: 0 });
  });

  it("deletes a smoke log and recalculates benefits", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-01T05:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });
    const smoke = await app.inject({
      method: "POST",
      url: "/api/smoke",
      headers: { "X-QuitKit-Demo-Now": "2026-05-05T19:00:00.000Z" },
      payload: {}
    });

    await app.inject({ method: "DELETE", url: `/api/smoke/${smoke.json().smoke.id}` });
    const progress = await app.inject({
      method: "GET",
      url: "/api/progress",
      headers: { "X-QuitKit-Demo-Now": "2026-05-06T19:00:00.000Z" }
    });

    expect(progress.json().smokeEvents).toHaveLength(0);
    expect(progress.json().benefits.smokeFreeHours).toBe(48);
  });

  it("calculates adherence only from elapsed slots", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-29T03:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });
    const state = await app.inject({
      method: "GET",
      url: "/api/state",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:05:00.000Z" }
    });
    const firstDoseId = state.json().todaySchedule[0].id;
    await app.inject({
      method: "POST",
      url: `/api/doses/${firstDoseId}/take`,
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:05:00.000Z" }
    });

    const progress = await app.inject({
      method: "GET",
      url: "/api/progress",
      headers: { "X-QuitKit-Demo-Now": "2026-05-29T03:05:00.000Z" }
    });

    expect(progress.json().adherence).toMatchObject({ percent: 100, elapsedPlanned: 1, taken: 1 });
  });

  it("bulk closes missed elapsed slots as skipped", async () => {
    await app.inject({
      method: "POST",
      url: "/api/course",
      payload: {
        startDate: "2026-05-29T03:00:00.000Z",
        firstDoseTime: "08:00"
      }
    });

    const progressBefore = await app.inject({
      method: "GET",
      url: "/api/progress",
      headers: { "X-QuitKit-Demo-Now": "2026-05-30T03:00:00.000Z" }
    });
    expect(progressBefore.json().missedDays[0]).toMatchObject({ dayNumber: 1, openSlots: 6 });

    const close = await app.inject({
      method: "POST",
      url: "/api/days/1/close",
      headers: { "X-QuitKit-Demo-Now": "2026-05-30T03:00:00.000Z" },
      payload: { mode: "skipped" }
    });
    const progressAfter = await app.inject({
      method: "GET",
      url: "/api/progress",
      headers: { "X-QuitKit-Demo-Now": "2026-05-30T03:00:00.000Z" }
    });

    expect(close.json().closed).toBe(6);
    expect(progressAfter.json().days[0].skipped).toBe(6);
  });
});
