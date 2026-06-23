-- Migração 0006: Adicionar coluna due_date na tabela invoices
-- Execute com: wrangler d1 execute divfat-db --file=./migrations/0006_add_invoice_due_date.sql

ALTER TABLE invoices ADD COLUMN due_date TEXT;
