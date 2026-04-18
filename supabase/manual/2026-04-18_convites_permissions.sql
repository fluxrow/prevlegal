ALTER TABLE convites
  ADD COLUMN IF NOT EXISTS permissions jsonb;
