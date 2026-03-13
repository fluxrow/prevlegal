CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  lida boolean DEFAULT false,
  link text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_nao_lidas ON notificacoes(lida) WHERE lida = false;
CREATE INDEX IF NOT EXISTS idx_notificacoes_created ON notificacoes(created_at DESC);
