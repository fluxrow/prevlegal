-- migration: 010_campanhas_mensagem_template
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS mensagem_template text;
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS agendado_para timestamptz;
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS iniciado_em timestamptz;
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS concluido_em timestamptz;
ALTER TABLE campanha_mensagens ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE campanha_mensagens ADD COLUMN IF NOT EXISTS mensagem text;
ALTER TABLE campanha_mensagens ADD COLUMN IF NOT EXISTS agendado_para timestamptz;
