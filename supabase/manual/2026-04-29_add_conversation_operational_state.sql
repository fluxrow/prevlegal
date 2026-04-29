-- Patch manual para estado operacional da conversa na inbox
-- Aplicar no banco operacional e nos tenants ativos antes de usar a UI da V1

alter table conversas
  add column if not exists estado_operacional text,
  add column if not exists estado_operacional_prazo_at timestamptz,
  add column if not exists estado_operacional_atualizado_em timestamptz;
