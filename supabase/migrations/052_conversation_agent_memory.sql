alter table conversas
  add column if not exists resumo_operacional text,
  add column if not exists resumo_operacional_at timestamptz,
  add column if not exists resumo_operacional_mensagens integer not null default 0;
