-- Migration number: 0002 	 2026-06-07T20:05:34.326Z
ALTER TABLE invoices ADD COLUMN file_data TEXT;
ALTER TABLE proofs ADD COLUMN file_data TEXT;
