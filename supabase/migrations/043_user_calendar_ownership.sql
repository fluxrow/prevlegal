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
