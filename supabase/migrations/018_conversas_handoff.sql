-- Adicionar colunas à mensagens_inbound
ALTER TABLE mensagens_inbound
  ADD COLUMN IF NOT EXISTS conversa_id uuid,
  ADD COLUMN IF NOT EXISTS assumido_por_humano boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assumido_at timestamptz,
  ADD COLUMN IF NOT EXISTS respondido_manualmente boolean DEFAULT false;

-- Adicionar colunas à tabela conversas existente
ALTER TABLE conversas
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'agente',
  ADD COLUMN IF NOT EXISTS ultima_mensagem text,
  ADD COLUMN IF NOT EXISTS ultima_mensagem_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS nao_lidas integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens_inbound(conversa_id);
