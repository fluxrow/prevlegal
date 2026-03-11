-- Adicionar campos que a planilha tem mas não estamos salvando
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS sexo TEXT,
  ADD COLUMN IF NOT EXISTS categoria_profissional TEXT,
  ADD COLUMN IF NOT EXISTS isencao_ir TEXT,
  ADD COLUMN IF NOT EXISTS pensionista TEXT,
  ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS der DATE,
  ADD COLUMN IF NOT EXISTS aps TEXT,
  ADD COLUMN IF NOT EXISTS nit TEXT;

-- Tabela de anotações do lead (histórico de atividades)
CREATE TABLE IF NOT EXISTS lead_anotacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anotacoes_lead ON lead_anotacoes(lead_id);

ALTER TABLE lead_anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios podem ver anotacoes do proprio escritorio"
  ON lead_anotacoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN public.usuarios u ON u.id = auth.uid()
      WHERE l.id = lead_id
    )
  );
