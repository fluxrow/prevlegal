CREATE TABLE IF NOT EXISTS agent_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'instrucao',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS agente_tom text DEFAULT 'profissional',
  ADD COLUMN IF NOT EXISTS agente_foco text DEFAULT 'agendamento',
  ADD COLUMN IF NOT EXISTS agente_frases_proibidas text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agente_objeccoes text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_agent_documents_usuario ON agent_documents(usuario_id);
