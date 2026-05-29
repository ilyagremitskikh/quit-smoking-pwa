ALTER TABLE smoke_log
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'relapse'
  CHECK (kind IN ('transition', 'relapse'));

ALTER TABLE settings
  ADD COLUMN cigarettes_per_day INTEGER NOT NULL DEFAULT 20;
