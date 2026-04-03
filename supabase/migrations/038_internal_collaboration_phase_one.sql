create table if not exists lead_threads_internas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  created_by uuid references usuarios(id) on delete set null,
  current_owner_usuario_id uuid references usuarios(id) on delete set null,
  status text not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_threads_internas_status_check check (status in ('ativa', 'arquivada'))
);

create unique index if not exists idx_lead_threads_internas_lead_unique
  on lead_threads_internas(lead_id);

create index if not exists idx_lead_threads_internas_tenant
  on lead_threads_internas(tenant_id, updated_at desc);

create table if not exists lead_mensagens_internas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  thread_id uuid not null references lead_threads_internas(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  autor_usuario_id uuid references usuarios(id) on delete set null,
  tipo text not null default 'comentario',
  mensagem text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lead_mensagens_internas_tipo_check check (tipo in ('comentario', 'handoff', 'sistema'))
);

create index if not exists idx_lead_mensagens_internas_thread
  on lead_mensagens_internas(thread_id, created_at desc);

create index if not exists idx_lead_mensagens_internas_lead
  on lead_mensagens_internas(lead_id, created_at desc);

create table if not exists lead_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  thread_id uuid references lead_threads_internas(id) on delete cascade,
  titulo text not null,
  descricao text,
  status text not null default 'aberta',
  prioridade text not null default 'media',
  assigned_to uuid references usuarios(id) on delete set null,
  created_by uuid references usuarios(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint lead_tasks_status_check check (status in ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  constraint lead_tasks_prioridade_check check (prioridade in ('baixa', 'media', 'alta'))
);

create index if not exists idx_lead_tasks_lead
  on lead_tasks(lead_id, created_at desc);

create index if not exists idx_lead_tasks_assigned
  on lead_tasks(assigned_to, status, due_at);

create table if not exists lead_handoffs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  conversa_id uuid references conversas(id) on delete set null,
  thread_id uuid references lead_threads_internas(id) on delete set null,
  from_usuario_id uuid references usuarios(id) on delete set null,
  to_usuario_id uuid references usuarios(id) on delete set null,
  motivo text,
  status_destino text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_handoffs_lead
  on lead_handoffs(lead_id, created_at desc);

create or replace function set_updated_at_lead_threads_internas()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lead_threads_internas_updated_at on lead_threads_internas;

create trigger trg_lead_threads_internas_updated_at
before update on lead_threads_internas
for each row
execute function set_updated_at_lead_threads_internas();
