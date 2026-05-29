PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS course (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,
  first_dose_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'done', 'aborted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dose_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  phase INTEGER NOT NULL,
  planned_time TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL,
  flexible INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_schedule_course
  ON dose_schedule(course_id, planned_time);

CREATE TABLE IF NOT EXISTS dose_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES dose_schedule(id) ON DELETE CASCADE,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'taken'
    CHECK (status IN ('taken', 'late'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_doselog_schedule
  ON dose_log(schedule_id);

CREATE TABLE IF NOT EXISTS smoke_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  logged_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pack_price REAL,
  reminders_enabled INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO settings (id, reminders_enabled) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS quote (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  author TEXT
);

CREATE TABLE IF NOT EXISTS push_subscription (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL
);

INSERT INTO schema_version (version)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM schema_version);
