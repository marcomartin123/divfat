-- Migration number: 0003 	 2026-06-23T22:00:00.000Z
ALTER TABLE processes ADD COLUMN closing_settled_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE processes ADD COLUMN closing_settled_at TEXT;
