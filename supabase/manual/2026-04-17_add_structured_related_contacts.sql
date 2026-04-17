-- PrevLegal
-- Patch manual para salvar contatos relacionados em campos estruturados do lead
-- Data: 2026-04-17

begin;

alter table leads
  add column if not exists conjuge_nome text,
  add column if not exists conjuge_celular text,
  add column if not exists conjuge_telefone text,
  add column if not exists filho_nome text,
  add column if not exists filho_celular text,
  add column if not exists filho_telefone text,
  add column if not exists irmao_nome text,
  add column if not exists irmao_celular text,
  add column if not exists irmao_telefone text;

create index if not exists idx_leads_conjuge_celular
  on leads(conjuge_celular);

create index if not exists idx_leads_filho_celular
  on leads(filho_celular);

create index if not exists idx_leads_irmao_celular
  on leads(irmao_celular);

commit;
