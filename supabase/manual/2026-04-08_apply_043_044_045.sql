-- PrevLegal
-- Patch manual de go-live para produção
-- Data: 2026-04-08
-- Objetivo: aplicar com segurança as foundations 043, 044 e 045
-- Observação: este patch é idempotente e foi preparado para bancos
-- que ainda não receberam as migrations locais mais recentes.

begin;

-- 043_user_calendar_ownership.sql
alter table usuarios
  add column if not exists google_calendar_token jsonb,
  add column if not exists google_calendar_email text,
  add column if not exists google_calendar_connected_at timestamptz;

alter table configuracoes
  add column if not exists google_calendar_email text,
  add column if not exists google_calendar_connected_at timestamptz;

alter table agendamentos
  add column if not exists calendar_owner_scope text,
  add column if not exists calendar_owner_usuario_id uuid references usuarios(id) on delete set null,
  add column if not exists calendar_owner_email text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agendamentos_calendar_owner_scope_check'
  ) then
    alter table agendamentos
      add constraint agendamentos_calendar_owner_scope_check
      check (calendar_owner_scope in ('tenant', 'user'));
  end if;
end $$;

create index if not exists idx_usuarios_google_calendar_connected_at
  on usuarios(google_calendar_connected_at);

create index if not exists idx_agendamentos_calendar_owner_usuario_id
  on agendamentos(calendar_owner_usuario_id);

update agendamentos
set calendar_owner_scope = 'tenant'
where google_event_id is not null
  and calendar_owner_scope is null;

-- 044_user_permissions_foundation.sql
alter table usuarios
  add column if not exists permissions jsonb;

comment on column usuarios.permissions is
  'Permissões granulares por usuário. Quando null, o sistema usa o preset padrão da role.';

-- 045_document_processing_foundation.sql
create table if not exists document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  storage_bucket text not null,
  storage_path text not null,
  arquivo_nome text,
  mime_type text,
  parser text not null default 'docling',
  parser_version text,
  status text not null default 'pending',
  attempts integer not null default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_processing_jobs_source_type_check
    check (source_type in ('lead_documento', 'agent_document')),
  constraint document_processing_jobs_status_check
    check (status in ('pending', 'processing', 'done', 'failed'))
);

create unique index if not exists idx_document_processing_jobs_source_unique
  on document_processing_jobs(source_type, source_id);

create index if not exists idx_document_processing_jobs_status
  on document_processing_jobs(status, created_at asc);

create index if not exists idx_document_processing_jobs_tenant
  on document_processing_jobs(tenant_id, created_at desc);

create table if not exists document_parsed_contents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  parser text not null default 'docling',
  parser_version text,
  plain_text text,
  markdown text,
  raw_json jsonb,
  doc_type_guess text,
  language text,
  page_count integer,
  has_ocr boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_parsed_contents_source_type_check
    check (source_type in ('lead_documento', 'agent_document'))
);

create unique index if not exists idx_document_parsed_contents_source_unique
  on document_parsed_contents(source_type, source_id);

create index if not exists idx_document_parsed_contents_tenant
  on document_parsed_contents(tenant_id, created_at desc);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  parsed_content_id uuid references document_parsed_contents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page_from integer,
  page_to integer,
  section_title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint document_chunks_source_type_check
    check (source_type in ('lead_documento', 'agent_document'))
);

create unique index if not exists idx_document_chunks_unique
  on document_chunks(parsed_content_id, chunk_index);

create index if not exists idx_document_chunks_source
  on document_chunks(source_type, source_id, chunk_index);

commit;
