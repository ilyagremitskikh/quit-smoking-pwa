import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { createDatabase } from "./db/connection.js";
import { Repository } from "./db/repository.js";
import { startPushScheduler } from "./services/push-scheduler.js";
import { WebPushSender } from "./services/push-service.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const clientDist = process.env.CLIENT_DIST ?? path.resolve(dirname, "../../client/dist");
const mediaDir = process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "media");

const db = createDatabase();
const repo = new Repository(db);
const app = await buildApp(repo, { clientDist, mediaDir });

if (process.env.NODE_ENV !== "test") {
  startPushScheduler(repo, new WebPushSender());
}

await app.listen({ port, host });
