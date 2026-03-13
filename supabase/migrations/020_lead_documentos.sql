-- Tabela de documentos por lead
CREATE TABLE IF NOT EXISTS lead_documentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL, -- 'cnis' | 'procuracao' | 'identidade' | 'laudo' | 'peticao' | 'outro'
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_tamanho bigint,
  arquivo_tipo text, -- MIME type
  descricao text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_lead_documentos_lead ON lead_documentos(lead_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-documentos', 'lead-documentos', false)
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload lead docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-documentos');

CREATE POLICY "Authenticated users can read lead docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-documentos');

CREATE POLICY "Authenticated users can delete lead docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-documentos');
