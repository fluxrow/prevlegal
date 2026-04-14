-- PrevLegal
-- Patch manual para estruturar perfil operacional dos agentes
-- Data: 2026-04-14

begin;

alter table agentes
  add column if not exists perfil_operacao text;

update agentes
set perfil_operacao = case
  when coalesce(nome_interno, '') ilike '%planejamento%'
    or coalesce(nome_publico, '') ilike '%planejamento%'
    or coalesce(descricao, '') ilike '%planejamento%'
    or coalesce(objetivo, '') ilike '%planejamento%'
    or coalesce(prompt_base, '') ilike '%planejamento%'
  then 'planejamento_previdenciario'
  else 'beneficios_previdenciarios'
end
where perfil_operacao is null;

alter table agentes
  alter column perfil_operacao set default 'beneficios_previdenciarios',
  alter column perfil_operacao set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agentes_perfil_operacao_check'
  ) then
    alter table agentes
      add constraint agentes_perfil_operacao_check
      check (perfil_operacao in ('beneficios_previdenciarios', 'planejamento_previdenciario'));
  end if;
end $$;

create index if not exists idx_agentes_tenant_perfil_operacao
  on agentes(tenant_id, perfil_operacao);

commit;
