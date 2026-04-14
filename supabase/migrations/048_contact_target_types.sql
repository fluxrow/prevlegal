alter table leads
  add column if not exists contato_abordagem_tipo text,
  add column if not exists contato_abordagem_origem text,
  add column if not exists contato_alternativo_tipo text,
  add column if not exists contato_alternativo_origem text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_contato_abordagem_tipo_check'
  ) then
    alter table leads
      add constraint leads_contato_abordagem_tipo_check
      check (contato_abordagem_tipo in ('titular', 'conjuge', 'filho', 'irmao', 'outro'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_contato_alternativo_tipo_check'
  ) then
    alter table leads
      add constraint leads_contato_alternativo_tipo_check
      check (contato_alternativo_tipo in ('titular', 'conjuge', 'filho', 'irmao', 'outro'));
  end if;
end $$;

create index if not exists idx_leads_contato_abordagem_tipo
  on leads(contato_abordagem_tipo);

alter table campanhas
  add column if not exists contato_alvo_tipo text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campanhas_contato_alvo_tipo_check'
  ) then
    alter table campanhas
      add constraint campanhas_contato_alvo_tipo_check
      check (contato_alvo_tipo in ('titular', 'conjuge', 'filho', 'irmao'));
  end if;
end $$;
