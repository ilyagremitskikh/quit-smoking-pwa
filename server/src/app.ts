import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import fs from "node:fs";
import { Repository } from "./db/repository.js";
import { registerApiRoutes } from "./routes/api.js";

interface BuildAppOptions {
  clientDist?: string;
  mediaDir?: string;
}

export async function buildApp(repo: Repository, options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV === "test" ? false : true
  });

  await app.register(cors, { origin: true });
  await registerApiRoutes(app, repo);

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (isZodError(error)) {
      return reply.code(400).send({ error: "Bad request", issues: error.issues });
    }
    if (isHttpError(error)) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });

  if (options.mediaDir) {
    fs.mkdirSync(options.mediaDir, { recursive: true });
    await app.register(fastifyStatic, {
      root: options.mediaDir,
      prefix: "/media/",
      decorateReply: false
    });
  }

  if (options.clientDist && fs.existsSync(options.clientDist)) {
    await app.register(fastifyStatic, {
      root: options.clientDist,
      prefix: "/",
      decorateReply: true,
      wildcard: false
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/") || request.url.startsWith("/media/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  }

  return app;
}

function isZodError(error: unknown): error is { issues: unknown[] } {
  return typeof error === "object" && error !== null && "issues" in error;
}

function isHttpError(error: unknown): error is { statusCode: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "message" in error &&
    typeof error.statusCode === "number" &&
    typeof error.message === "string"
  );
}
