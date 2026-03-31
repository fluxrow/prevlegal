-- =============================================
-- PREVLEGAL - Migration 034
-- Funda coluna email em leads para alinhar schema com a UI operacional
-- =============================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_leads_email_trgm
  ON leads
  USING gin (email gin_trgm_ops);
