alter table conversas
  add column if not exists estado_operacional text,
  add column if not exists estado_operacional_prazo_at timestamptz,
  add column if not exists estado_operacional_atualizado_em timestamptz;
