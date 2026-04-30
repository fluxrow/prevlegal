alter table configuracoes
  add column if not exists auto_recontact_mode text not null default 'off',
  add column if not exists auto_recontact_campaign_no_reply_enabled boolean not null default false,
  add column if not exists auto_recontact_open_conversation_enabled boolean not null default false,
  add column if not exists auto_recontact_campaign_delay_hours integer not null default 24,
  add column if not exists auto_recontact_open_conversation_delay_hours integer not null default 24,
  add column if not exists auto_recontact_max_attempts integer not null default 1,
  add column if not exists auto_recontact_daily_limit integer not null default 20;

alter table configuracoes
  drop constraint if exists configuracoes_auto_recontact_mode_check;

alter table configuracoes
  add constraint configuracoes_auto_recontact_mode_check
  check (auto_recontact_mode in ('off', 'shadow', 'manual_review', 'live'));

create table if not exists automation_recontact_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  conversa_id uuid references conversas(id) on delete set null,
  campanha_id uuid references campanhas(id) on delete set null,
  whatsapp_number_id uuid references whatsapp_numbers(id) on delete set null,
  automation_type text not null,
  status text not null default 'detected',
  mode_snapshot text not null default 'off',
  reason text,
  message_preview text,
  attempt_number integer not null default 1,
  eligible_at timestamptz not null default now(),
  sent_at timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table automation_recontact_candidates
  drop constraint if exists automation_recontact_candidates_type_check;

alter table automation_recontact_candidates
  add constraint automation_recontact_candidates_type_check
  check (automation_type in ('campanha_sem_resposta', 'conversa_em_aberto'));

alter table automation_recontact_candidates
  drop constraint if exists automation_recontact_candidates_status_check;

alter table automation_recontact_candidates
  add constraint automation_recontact_candidates_status_check
  check (status in ('detected', 'approved', 'sent', 'skipped', 'canceled'));

alter table automation_recontact_candidates
  drop constraint if exists automation_recontact_candidates_mode_snapshot_check;

alter table automation_recontact_candidates
  add constraint automation_recontact_candidates_mode_snapshot_check
  check (mode_snapshot in ('off', 'shadow', 'manual_review', 'live'));

alter table automation_recontact_candidates
  drop constraint if exists automation_recontact_candidates_attempt_positive_check;

alter table automation_recontact_candidates
  add constraint automation_recontact_candidates_attempt_positive_check
  check (attempt_number > 0);

create unique index if not exists idx_recontact_candidate_unique_attempt
  on automation_recontact_candidates(tenant_id, lead_id, automation_type, attempt_number);

create index if not exists idx_recontact_candidate_tenant_status
  on automation_recontact_candidates(tenant_id, status, eligible_at desc);

create index if not exists idx_recontact_candidate_tenant_type
  on automation_recontact_candidates(tenant_id, automation_type, created_at desc);

create or replace function set_updated_at_automation_recontact_candidates()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_automation_recontact_candidates_updated_at on automation_recontact_candidates;
create trigger trg_automation_recontact_candidates_updated_at
before update on automation_recontact_candidates
for each row execute function set_updated_at_automation_recontact_candidates();

alter table automation_recontact_candidates enable row level security;

drop policy if exists "tenant read recontact candidates" on automation_recontact_candidates;
create policy "tenant read recontact candidates"
  on automation_recontact_candidates for select
  using (tenant_id in (
    select tenant_id from usuarios where id = auth.uid()
  ));

drop policy if exists "tenant write recontact candidates" on automation_recontact_candidates;
create policy "tenant write recontact candidates"
  on automation_recontact_candidates for all
  using (tenant_id in (
    select tenant_id from usuarios where id = auth.uid()
  ))
  with check (tenant_id in (
    select tenant_id from usuarios where id = auth.uid()
  ));
