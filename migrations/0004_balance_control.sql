-- Migration number: 0004 	 2026-06-23T22:15:00.000Z
-- Create balance_entries table for independent balance control (extrato bancário)
CREATE TABLE IF NOT EXISTS balance_entries (
  id TEXT PRIMARY KEY,
  person TEXT NOT NULL CHECK (person IN ('PERSON_A', 'PERSON_B')),
  process_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_balance_entries_person ON balance_entries(person, entry_date);
