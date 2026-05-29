import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_QUOTES } from "../services/quotes.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function createDatabase(): Database.Database {
  const dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new Database(path.join(dataDir, "quitkit.db"));
  initializeDatabase(db);
  return db;
}

export function initializeDatabase(db: Database.Database): void {
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedQuotes(db);
}

function migrate(db: Database.Database): void {
  const migrationsDir = path.resolve(dirname, "../../migrations");
  const initSql = fs.readFileSync(path.join(migrationsDir, "001_init.sql"), "utf8");
  db.exec(initSql);

  const version = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as { version: number };
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    const migrationVersion = Number(file.slice(0, 3));
    if (!Number.isFinite(migrationVersion) || migrationVersion <= version.version || migrationVersion === 1) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.prepare("UPDATE schema_version SET version = ?").run(migrationVersion);
    })();
  }
}

function seedQuotes(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) as count FROM quote").get() as { count: number };
  if (count.count > 0) {
    return;
  }

  const insert = db.prepare("INSERT INTO quote (text, author) VALUES (@text, @author)");
  const transaction = db.transaction(() => {
    for (const quote of DEFAULT_QUOTES) {
      insert.run(quote);
    }
  });
  transaction();
}
