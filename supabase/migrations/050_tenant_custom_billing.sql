alter table tenants
  add column if not exists cobranca_tipo text not null default 'lp_publica',
  add column if not exists valor_mensal_contratado numeric(10,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenants_cobranca_tipo_check'
  ) then
    alter table tenants
      add constraint tenants_cobranca_tipo_check
      check (cobranca_tipo in ('lp_publica', 'negociado_manual'));
  end if;
end $$;

create index if not exists idx_tenants_cobranca_tipo
  on tenants(cobranca_tipo);
