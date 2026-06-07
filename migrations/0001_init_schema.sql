-- Migration number: 0001 	 2026-06-07T19:56:08.843Z
CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED')),
  created_at TEXT NOT NULL,
  closed_at TEXT,
  closing_debtor TEXT CHECK (closing_debtor IN ('PERSON_A', 'PERSON_B')),
  closing_amount REAL,
  carried_over_to_process_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (carried_over_to_process_id) REFERENCES processes(id)
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  payer TEXT NOT NULL CHECK (payer IN ('PERSON_A', 'PERSON_B')),
  upload_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  assignment TEXT NOT NULL CHECK (assignment IN ('PERSON_A', 'PERSON_B', 'SPLIT')),
  payer TEXT NOT NULL CHECK (payer IN ('PERSON_A', 'PERSON_B')),
  source TEXT NOT NULL CHECK (source IN ('PDF', 'MANUAL', 'CARRYOVER')),
  source_invoice_id TEXT,
  category TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE,
  FOREIGN KEY (source_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

CREATE TABLE proofs (
  process_id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  date TEXT NOT NULL,
  r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (process_id) REFERENCES processes(id) ON DELETE CASCADE
);

CREATE INDEX idx_processes_status_created_at ON processes(status, created_at);
CREATE INDEX idx_invoices_process_id ON invoices(process_id);
CREATE INDEX idx_transactions_process_id_date ON transactions(process_id, date);
CREATE INDEX idx_transactions_source_invoice_id ON transactions(source_invoice_id);
