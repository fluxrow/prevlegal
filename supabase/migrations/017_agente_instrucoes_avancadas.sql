ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS agente_fluxo_qualificacao text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agente_exemplos_dialogo text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agente_gatilhos_escalada text DEFAULT '',
  ADD COLUMN IF NOT EXISTS agente_fallback text DEFAULT '';
