-- =============================================
-- PREVLEGAL - Migration 031
-- Tenant isolation foundation (schema only)
-- =============================================

-- Esta migration prepara o schema operacional para multi-tenant lógico
-- no mesmo banco. Ela nao faz backfill completo nem muda policies finais.
-- O codigo nao deve depender desses campos em producao antes da etapa
-- de backfill e da revisao das APIs/RLS.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE agentes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE listas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE campanha_usuarios ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE disparos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE lead_anotacoes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE mensagens_inbound ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE portal_mensagens ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE notificacoes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE lead_documentos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE calculadora_prev ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE advogados ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE convites ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);
ALTER TABLE parcelas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_id ON usuarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agentes_tenant_id ON agentes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_tenant_id ON configuracoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_listas_tenant_id ON listas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_tenant_id ON campanhas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanha_usuarios_tenant_id ON campanha_usuarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversas_tenant_id ON conversas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_tenant_id ON mensagens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant_id ON agendamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_tenant_id ON templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_disparos_tenant_id ON disparos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_anotacoes_tenant_id ON lead_anotacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_inbound_tenant_id ON mensagens_inbound(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_mensagens_tenant_id ON portal_mensagens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tenant_id ON notificacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_documentos_tenant_id ON lead_documentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calculadora_prev_tenant_id ON calculadora_prev(tenant_id);
CREATE INDEX IF NOT EXISTS idx_advogados_tenant_id ON advogados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_convites_tenant_id ON convites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contratos_tenant_id ON contratos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_tenant_id ON parcelas(tenant_id);

-- Configuracoes deixa de ser singleton global e passa a ser singleton por tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_unique_tenant
  ON configuracoes(tenant_id)
  WHERE tenant_id IS NOT NULL;
