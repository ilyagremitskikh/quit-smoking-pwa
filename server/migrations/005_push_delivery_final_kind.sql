PRAGMA foreign_keys = OFF;

-- Widen push_delivery.kind to include the "final" escalation stage.
-- SQLite can't alter a CHECK constraint in place, so rebuild the table.
CREATE TABLE push_delivery_next (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER REFERENCES dose_schedule(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES push_subscription(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('initial', 'retry', 'final', 'test')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error TEXT
);

INSERT INTO push_delivery_next (id, schedule_id, subscription_id, kind, sent_at, status, error)
SELECT id, schedule_id, subscription_id, kind, sent_at, status, error
FROM push_delivery;

DROP TABLE push_delivery;
ALTER TABLE push_delivery_next RENAME TO push_delivery;

CREATE UNIQUE INDEX idx_push_delivery_dedupe
  ON push_delivery(subscription_id, schedule_id, kind)
  WHERE schedule_id IS NOT NULL;

PRAGMA foreign_keys = ON;
