-- Migration 041: Roteamento de agente por campanha e por estágio do lead (Fase D)
-- Aplica: enum tipo, coluna tipo em agentes, FK agente_id em campanhas,
--         rastreamento agente_respondente_id em mensagens_inbound

-- 1. Tipo enum para categorização e roteamento por estágio
do $$ begin
  create type agente_tipo as enum (
    'triagem',
    'reativacao',
    'documental',
    'confirmacao_agenda',
    'followup_comercial',
    'geral'
  );
exception when duplicate_object then null;
end $$;

-- 2. Adicionar tipo ao agente (default 'geral' para retrocompatibilidade)
alter table agentes
  add column if not exists tipo agente_tipo not null default 'geral';

comment on column agentes.tipo is 'Categoria do agente — usada para roteamento automático por estágio do lead';

-- 3. FK agente_id em campanhas (nullable — usa padrão do tenant se null)
alter table campanhas
  add column if not exists agente_id uuid references agentes(id) on delete set null;

comment on column campanhas.agente_id is 'Agente específico para leads desta campanha; sobrescreve agente padrão do tenant';

-- 4. Rastrear qual agente respondeu cada mensagem (para métricas)
alter table mensagens_inbound
  add column if not exists agente_respondente_id uuid references agentes(id) on delete set null;

comment on column mensagens_inbound.agente_respondente_id is 'Agente que gerou a resposta automática desta mensagem';

-- Índice para queries de métricas por agente
create index if not exists idx_mensagens_inbound_agente_respondente
  on mensagens_inbound(agente_respondente_id)
  where agente_respondente_id is not null;
