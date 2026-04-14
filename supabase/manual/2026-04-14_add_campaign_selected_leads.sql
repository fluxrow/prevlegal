-- PrevLegal
-- Patch manual para campanhas com contatos selecionados
-- Data: 2026-04-14

begin;

create table if not exists campanha_leads (
  campanha_id uuid not null references campanhas(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campanha_id, lead_id)
);

create index if not exists idx_campanha_leads_tenant_id
  on campanha_leads(tenant_id, created_at desc);

create index if not exists idx_campanha_leads_lead_id
  on campanha_leads(lead_id);

commit;
