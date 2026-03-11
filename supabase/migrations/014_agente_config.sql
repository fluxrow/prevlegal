-- Adicionar campos de configuração do Agente IA na tabela configuracoes
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS agente_ativo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS agente_nome text DEFAULT 'Ana',
  ADD COLUMN IF NOT EXISTS agente_prompt_sistema text,
  ADD COLUMN IF NOT EXISTS agente_modelo text DEFAULT 'claude-sonnet-4-20250514',
  ADD COLUMN IF NOT EXISTS agente_max_tokens integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS agente_resposta_automatica boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS agente_horario_inicio time DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS agente_horario_fim time DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS agente_apenas_dias_uteis boolean DEFAULT true;

-- Adicionar coluna de histórico de conversa nas mensagens inbound
ALTER TABLE mensagens_inbound
  ADD COLUMN IF NOT EXISTS respondido_por_agente boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resposta_agente text;
