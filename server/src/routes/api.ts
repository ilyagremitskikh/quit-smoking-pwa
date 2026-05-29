import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Repository } from "../db/repository.js";
import type { DemoScenarioId } from "../db/repository.js";
import { sendTestPush, WebPushSender } from "../services/push-service.js";

const courseSchema = z.object({
  startDate: z.string().datetime(),
  firstDoseTime: z.string().regex(/^\d{2}:\d{2}$/)
});

const settingsSchema = z.object({
  packPrice: z.number().nonnegative().nullable().optional(),
  remindersEnabled: z.boolean().optional(),
  cigarettesPerDay: z.number().int().min(1).max(200).optional()
});

const demoScenarioSchema = z.object({
  scenario: z.enum(["day1", "day5", "day13", "day21", "day25", "after"])
});

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

export async function registerApiRoutes(app: FastifyInstance, repo: Repository) {
  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/state", async (request) => repo.getState(readDemoNow(request.headers)));

  app.post("/api/course", async (request, reply) => {
    const body = courseSchema.parse(request.body);
    const course = repo.createCourse(body.startDate, body.firstDoseTime);
    return reply.code(201).send(course);
  });

  app.post("/api/course/abort", async () => {
    repo.abortActiveCourse();
    return { ok: true };
  });

  app.get("/api/schedule", async (request) => {
    const query = z.object({ day: z.coerce.number().int().min(1).max(25) }).parse(request.query);
    return repo.getSchedule(query.day, readDemoNow(request.headers));
  });

  app.post("/api/doses/:scheduleId/take", async (request) => {
    const params = z.object({ scheduleId: z.coerce.number().int().positive() }).parse(request.params);
    return repo.takeDose(params.scheduleId, readDemoNow(request.headers));
  });

  app.delete("/api/doses/:scheduleId/take", async (request) => {
    const params = z.object({ scheduleId: z.coerce.number().int().positive() }).parse(request.params);
    repo.deleteDose(params.scheduleId);
    return { ok: true };
  });

  app.post("/api/smoke", async (request, reply) => {
    const body = z.object({ note: z.string().optional() }).optional().parse(request.body);
    return reply.code(201).send(repo.logSmoke(body?.note, readDemoNow(request.headers)));
  });

  app.get("/api/smoke", async () => repo.getSmokeLogs());

  app.get("/api/progress", async (request) => repo.getProgress(readDemoNow(request.headers)));

  app.put("/api/settings", async (request) => {
    const body = settingsSchema.parse(request.body);
    return repo.updateSettings(body);
  });

  app.get("/api/push/config", async () => repo.getPushConfig());

  app.post("/api/push/subscribe", async (request, reply) => {
    const body = pushSubscriptionSchema.parse(request.body);
    const subscription = repo.upsertPushSubscription({
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth
    });
    return reply.code(201).send({ subscription, config: repo.getPushConfig() });
  });

  app.delete("/api/push/subscribe", async (request) => {
    const body = z.object({ endpoint: z.string().url() }).parse(request.body);
    repo.disablePushSubscription(body.endpoint);
    return { ok: true };
  });

  app.post("/api/push/test", async (request, reply) => {
    const body = z.object({ endpoint: z.string().url() }).parse(request.body);
    await sendTestPush(repo, new WebPushSender(), body.endpoint);
    return reply.code(201).send({ ok: true });
  });

  app.post("/api/demo/scenario", async (request, reply) => {
    const body = demoScenarioSchema.parse(request.body);
    return reply.code(201).send(repo.createDemoScenario(body.scenario as DemoScenarioId));
  });
}

function readDemoNow(headers: Record<string, string | string[] | undefined>): Date {
  const value = headers["x-quitkit-demo-now"];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return new Date();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
