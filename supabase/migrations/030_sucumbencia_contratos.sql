-- =============================================
-- PREVLEGAL - Migration 030
-- Honorarios de sucumbencia em contratos
-- =============================================

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS percentual_sucumbencia numeric(5,2),
  ADD COLUMN IF NOT EXISTS honorario_sucumbencia numeric(12,2),
  ADD COLUMN IF NOT EXISTS sucumbencia_status text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS sucumbencia_data date,
  ADD COLUMN IF NOT EXISTS sucumbencia_observacoes text;

UPDATE contratos
SET sucumbencia_status = 'pendente'
WHERE sucumbencia_status IS NULL;

DO $$
BEGIN
  ALTER TABLE contratos
    ADD CONSTRAINT contratos_sucumbencia_status_check
    CHECK (sucumbencia_status IN ('pendente', 'recebido', 'renunciado'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
