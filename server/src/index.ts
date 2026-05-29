import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { createDatabase } from "./db/connection.js";
import { Repository } from "./db/repository.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const clientDist = process.env.CLIENT_DIST ?? path.resolve(dirname, "../../client/dist");
const mediaDir = process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "media");

const db = createDatabase();
const repo = new Repository(db);
const app = await buildApp(repo, { clientDist, mediaDir });

await app.listen({ port, host });
