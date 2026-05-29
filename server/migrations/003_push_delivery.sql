ALTER TABLE push_subscription
  ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));

ALTER TABLE push_subscription
  ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

ALTER TABLE push_subscription
  ADD COLUMN disabled_at TEXT;

ALTER TABLE push_subscription
  ADD COLUMN last_success_at TEXT;

ALTER TABLE push_subscription
  ADD COLUMN last_error TEXT;

CREATE TABLE push_delivery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER REFERENCES dose_schedule(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES push_subscription(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('initial', 'retry', 'test')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT
);

CREATE UNIQUE INDEX idx_push_delivery_dedupe
  ON push_delivery(subscription_id, schedule_id, kind)
  WHERE schedule_id IS NOT NULL;
