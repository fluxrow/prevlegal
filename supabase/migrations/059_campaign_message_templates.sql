create table if not exists campaign_message_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  mensagem text not null,
  perfil_operacao text,
  agente_tipo text,
  contato_alvo_tipo text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaign_message_templates_tenant
  on campaign_message_templates(tenant_id, updated_at desc);

create index if not exists idx_campaign_message_templates_tenant_profile
  on campaign_message_templates(tenant_id, perfil_operacao, agente_tipo);

alter table campaign_message_templates enable row level security;

create policy "tenant members can view their campaign message templates"
  on campaign_message_templates for select
  using (
    tenant_id in (
      select tenant_id from usuarios where auth_id = auth.uid()
    )
  );

create policy "tenant admins can manage their campaign message templates"
  on campaign_message_templates for all
  using (
    tenant_id in (
      select tenant_id from usuarios where auth_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    tenant_id in (
      select tenant_id from usuarios where auth_id = auth.uid() and role = 'admin'
    )
  );
