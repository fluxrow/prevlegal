create table if not exists contract_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nome text not null,
  tipo text not null,
  corpo_html text not null,
  placeholders_definidos jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contract_templates_tenant
  on contract_templates(tenant_id, created_at desc);

create index if not exists idx_contract_templates_tenant_tipo
  on contract_templates(tenant_id, tipo);

alter table contract_templates enable row level security;

create policy "tenant members can view their contract templates"
  on contract_templates for select
  using (
    tenant_id in (
      select tenant_id from usuarios where auth_id = auth.uid()
    )
  );

create policy "tenant admins can manage their contract templates"
  on contract_templates for all
  using (
    tenant_id in (
      select tenant_id from usuarios where auth_id = auth.uid() and role = 'admin'
    )
  );

insert into storage.buckets (id, name, public)
values ('contratos-leads', 'contratos-leads', false)
on conflict do nothing;

create policy "Authenticated users can upload contract docs"
on storage.objects for insert to authenticated
with check (bucket_id = 'contratos-leads');

create policy "Authenticated users can read contract docs"
on storage.objects for select to authenticated
using (bucket_id = 'contratos-leads');

create policy "Authenticated users can delete contract docs"
on storage.objects for delete to authenticated
using (bucket_id = 'contratos-leads');

insert into contract_templates (
  tenant_id,
  nome,
  tipo,
  corpo_html,
  placeholders_definidos,
  ativo
)
select
  t.id,
  'Contrato de Honorários — Planejamento Previdenciário',
  'honorarios_planejamento',
  '<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.65; padding: 32px;"><h1 style="font-size: 22px; margin-bottom: 8px;">Contrato de Honorários — Planejamento Previdenciário</h1><p style="margin: 0 0 18px;">Minuta inicial para revisão jurídica antes do go-live.</p><p><strong>Cliente:</strong> {{cliente_nome}}</p><p><strong>CPF:</strong> {{cliente_cpf}}</p><p><strong>Telefone:</strong> {{cliente_telefone}}</p><p><strong>E-mail:</strong> {{cliente_email}}</p><hr style="margin: 24px 0; border: none; border-top: 1px solid #d1d5db;" /><p><strong>Escritório:</strong> {{escritorio_nome}}</p><p><strong>Responsável:</strong> {{responsavel_nome}}</p><p><strong>OAB:</strong> {{responsavel_oab}}</p><p><strong>Data:</strong> {{data_hoje_extenso}}</p><hr style="margin: 24px 0; border: none; border-top: 1px solid #d1d5db;" /><p><strong>TODO:</strong> inserir aqui a redação jurídica definitiva do contrato de honorários de planejamento previdenciário.</p><p>Esta minuta serve como base inicial para o tenant Pagliuca, Espínola e Lessnau no piloto comercial.</p></div>',
  '[
    {"key":"cliente_nome","label":"Nome do cliente","description":"Nome completo do lead."},
    {"key":"cliente_cpf","label":"CPF do cliente","description":"CPF do lead, quando disponível."},
    {"key":"cliente_telefone","label":"Telefone do cliente","description":"Telefone principal do lead."},
    {"key":"cliente_email","label":"E-mail do cliente","description":"E-mail do lead, quando disponível."},
    {"key":"escritorio_nome","label":"Nome do escritório","description":"Nome do tenant/escritório."},
    {"key":"responsavel_nome","label":"Nome do responsável","description":"Nome do responsável do escritório."},
    {"key":"responsavel_oab","label":"OAB do responsável","description":"OAB formatada com estado e número."},
    {"key":"data_hoje_extenso","label":"Data de hoje por extenso","description":"Data atual por extenso em português."}
  ]'::jsonb,
  true
from tenants t
where (
  lower(coalesce(t.slug, '')) = 'pagliuca-espinola-e-lessnau'
  or lower(coalesce(t.responsavel_email, '')) = 'anaterra@advocaciacomproposito.com.br'
)
and not exists (
  select 1
  from contract_templates ct
  where ct.tenant_id = t.id
    and ct.tipo = 'honorarios_planejamento'
    and ct.nome = 'Contrato de Honorários — Planejamento Previdenciário'
);
