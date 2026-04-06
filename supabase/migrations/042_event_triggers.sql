-- Migration 042: Gatilhos e Orquestração (Fase E)
-- Cria a tabela `event_triggers` para permitir que eventos mudem agentes ou adicionem followups

create table if not exists event_triggers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  
  -- Evento 
  trigger_evento text not null,     -- ex: 'lead_status_mudou'
  trigger_condicao text not null,   -- ex: 'qualificado'
  
  -- Ação
  acao_tipo text not null,          -- 'iniciar_followup', 'trocar_agente'
  acao_ref_id uuid not null,        -- id da rule ou do agente
  
  -- Autonomia do Escritório
  cancelar_followups_rodando boolean not null default true,
  enviar_mensagem_transicao boolean not null default false,
  mensagem_transicao_texto text,
  
  -- Template PrevLegal Base
  is_template_default boolean not null default false,
  
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_triggers_tenant
  on event_triggers(tenant_id, ativo);

create index if not exists idx_event_triggers_condicao
  on event_triggers(trigger_evento, trigger_condicao);

-- RLS
alter table event_triggers enable row level security;

create policy "tenant members can view their triggers"
  on event_triggers for select
  using (
    tenant_id in (
      select tenant_id from usuarios where id = auth.uid()
    )
  );

create policy "admins can manage triggers"
  on event_triggers for all
  using (
    tenant_id in (
      select tenant_id from usuarios where id = auth.uid() and role = 'admin'
    )
  );

-- Trigger updated_at
create or replace function set_updated_at_event_triggers()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_event_triggers_updated_at on event_triggers;
create trigger trg_event_triggers_updated_at
before update on event_triggers
for each row execute function set_updated_at_event_triggers();
