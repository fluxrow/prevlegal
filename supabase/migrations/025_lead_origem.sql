ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'lista';

-- Atualiza leads existentes sem origem
UPDATE leads SET origem = 'lista' WHERE origem IS NULL;
