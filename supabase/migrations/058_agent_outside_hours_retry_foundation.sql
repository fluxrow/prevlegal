alter table mensagens_inbound
  add column if not exists agente_reprocessar_apos timestamptz;

create index if not exists idx_mensagens_inbound_agente_reprocessar_apos
  on mensagens_inbound(agente_reprocessar_apos desc);
