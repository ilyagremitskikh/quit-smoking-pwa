import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { initializeDatabase } from "../db/connection.js";
import { Repository } from "../db/repository.js";

describe("api routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    const db = new Database(":memory:");
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
});
