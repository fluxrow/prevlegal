ALTER TABLE lead_documentos
  ADD COLUMN IF NOT EXISTS gerado_por_ia boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_documento text,
  ADD COLUMN IF NOT EXISTS conteudo_texto text,
  ADD COLUMN IF NOT EXISTS prompt_usado text,
  ADD COLUMN IF NOT EXISTS modelo_ia text;
