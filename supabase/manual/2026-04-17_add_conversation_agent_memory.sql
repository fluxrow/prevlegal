-- PrevLegal
-- Patch manual para memória operacional curta do agente por conversa
-- Data: 2026-04-17

begin;

alter table conversas
  add column if not exists resumo_operacional text,
  add column if not exists resumo_operacional_at timestamptz,
  add column if not exists resumo_operacional_mensagens integer not null default 0;

commit;
