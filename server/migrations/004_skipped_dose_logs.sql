PRAGMA foreign_keys = OFF;

CREATE TABLE dose_log_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES dose_schedule(id) ON DELETE CASCADE,
  taken_at TEXT,
  status TEXT NOT NULL DEFAULT 'taken'
    CHECK (status IN ('taken', 'late', 'skipped'))
);

INSERT INTO dose_log_next (id, schedule_id, taken_at, status)
SELECT id, schedule_id, taken_at, status
FROM dose_log;

DROP TABLE dose_log;
ALTER TABLE dose_log_next RENAME TO dose_log;

CREATE UNIQUE INDEX idx_doselog_schedule
  ON dose_log(schedule_id);

PRAGMA foreign_keys = ON;
