-- Regras de follow-up configuráveis por tenant
create table if not exists followup_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  is_default boolean not null default false,
  created_by uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_followup_rules_tenant
  on followup_rules(tenant_id, ativo);

-- Passos de cada regra (sequência de mensagens)
create table if not exists followup_rule_steps (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references followup_rules(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  ordem int not null default 1,
  delay_horas int not null default 24,
  canal text not null default 'whatsapp',
  mensagem text not null,
  created_at timestamptz not null default now(),
  constraint followup_rule_steps_canal_check check (canal in ('whatsapp', 'portal'))
);

create index if not exists idx_followup_rule_steps_rule
  on followup_rule_steps(rule_id, ordem);

-- Instâncias ativas de follow-up por lead
create table if not exists followup_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  rule_id uuid not null references followup_rules(id) on delete cascade,
  status text not null default 'ativo',
  proximo_step_ordem int not null default 1,
  proximo_envio_at timestamptz,
  iniciado_por uuid references usuarios(id) on delete set null,
  pausado_por uuid references usuarios(id) on delete set null,
  cancelado_por uuid references usuarios(id) on delete set null,
  motivo_parada text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint followup_runs_status_check check (status in ('ativo', 'pausado', 'concluido', 'cancelado', 'stop_automatico'))
);

create unique index if not exists idx_followup_runs_lead_ativo
  on followup_runs(lead_id)
  where status = 'ativo';

create index if not exists idx_followup_runs_tenant
  on followup_runs(tenant_id, status, proximo_envio_at);

create index if not exists idx_followup_runs_lead
  on followup_runs(lead_id, created_at desc);

-- Histórico de eventos por run
create table if not exists followup_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  run_id uuid not null references followup_runs(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  step_ordem int,
  tipo text not null,
  mensagem_enviada text,
  canal text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint followup_events_tipo_check check (
    tipo in ('iniciado', 'step_disparado', 'step_falhou', 'pausado', 'retomado', 'cancelado', 'stop_lead_respondeu', 'stop_humano_assumiu', 'stop_agendamento', 'stop_convertido', 'stop_perdido', 'concluido')
  )
);

create index if not exists idx_followup_events_run
  on followup_events(run_id, created_at desc);

create index if not exists idx_followup_events_lead
  on followup_events(lead_id, created_at desc);

-- Trigger updated_at em followup_rules
create or replace function set_updated_at_followup_rules()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_followup_rules_updated_at on followup_rules;
create trigger trg_followup_rules_updated_at
before update on followup_rules
for each row execute function set_updated_at_followup_rules();

-- Trigger updated_at em followup_runs
create or replace function set_updated_at_followup_runs()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_followup_runs_updated_at on followup_runs;
create trigger trg_followup_runs_updated_at
before update on followup_runs
for each row execute function set_updated_at_followup_runs();
