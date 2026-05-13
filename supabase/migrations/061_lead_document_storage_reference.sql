ALTER TABLE public.lead_documentos
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text;

UPDATE public.lead_documentos
SET
  storage_bucket = COALESCE(
    storage_bucket,
    CASE
      WHEN arquivo_url LIKE '%/lead-documentos/%' THEN 'lead-documentos'
      WHEN arquivo_url LIKE '%/contratos-leads/%' THEN 'contratos-leads'
      ELSE NULL
    END
  ),
  storage_path = COALESCE(
    storage_path,
    CASE
      WHEN arquivo_url LIKE '%/lead-documentos/%' THEN split_part(split_part(arquivo_url, '/lead-documentos/', 2), '?', 1)
      WHEN arquivo_url LIKE '%/contratos-leads/%' THEN split_part(split_part(arquivo_url, '/contratos-leads/', 2), '?', 1)
      ELSE NULL
    END
  )
WHERE storage_bucket IS NULL OR storage_path IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_documentos_storage_ref
  ON public.lead_documentos(storage_bucket, storage_path)
  WHERE storage_bucket IS NOT NULL AND storage_path IS NOT NULL;
