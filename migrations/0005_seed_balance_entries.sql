-- Migração 0005: Inserir balance_entries a partir do histórico de carry-over
-- Execute com: wrangler d1 execute divfat-db --file=./migrations/0005_seed_balance_entries.sql --remote
-- Idempotente: usa INSERT OR IGNORE para não duplicar se já existir

-- 02/12/2025: Marco devia 5.226,45 (quitado via rolamento)
INSERT OR IGNORE INTO balance_entries (id, person, process_id, type, amount, description, entry_date, created_at)
VALUES ('mig-001', 'PERSON_A', 'miq12r3wb3j0t', 'DEBIT', 5226.45, 'Fechamento 02/12/2025', '2025-12-02T00:00:00.000Z', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO balance_entries (id, person, process_id, type, amount, description, entry_date, created_at)
VALUES ('mig-002', 'PERSON_A', 'miq12r3wb3j0t', 'CREDIT', 5226.45, 'Pagamento (rolado p/ Gastos Dez 25)', '2025-12-02T00:00:01.000Z', CURRENT_TIMESTAMP);

-- Gastos de Dezembro 25: Marco devia 7.105,95 (quitado via rolamento)
INSERT OR IGNORE INTO balance_entries (id, person, process_id, type, amount, description, entry_date, created_at)
VALUES ('mig-003', 'PERSON_A', 'mjod8b5d84b9p', 'DEBIT', 7105.95, 'Fechamento Gastos de Dezembro 25', '2025-12-25T00:00:00.000Z', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO balance_entries (id, person, process_id, type, amount, description, entry_date, created_at)
VALUES ('mig-004', 'PERSON_A', 'mjod8b5d84b9p', 'CREDIT', 7105.95, 'Pagamento (rolado p/ Fevereiro 2026)', '2025-12-25T00:00:01.000Z', CURRENT_TIMESTAMP);

-- Fevereiro de 2026: Marco devia 5.210,93 (PENDENTE)
INSERT OR IGNORE INTO balance_entries (id, person, process_id, type, amount, description, entry_date, created_at)
VALUES ('mig-005', 'PERSON_A', 'mltcugnpljdlk', 'DEBIT', 5210.93, 'Fechamento Fevereiro de 2026', '2026-02-01T00:00:00.000Z', CURRENT_TIMESTAMP);
