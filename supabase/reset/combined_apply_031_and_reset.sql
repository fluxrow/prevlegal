-- PrevLegal
-- Execucao combinada: foundation 031 + reset operacional limpo
-- Execute APENAS no banco operacional (lrqvvxmgimjlghpwavdb)
-- Nao execute no projeto central.

-- =============================================
-- PASSO 1 - Foundation 031
-- =============================================

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracoes_unique_tenant
  ON configuracoes(tenant_id)
  WHERE tenant_id IS NOT NULL;

-- =============================================
-- PASSO 2 - Reset operacional limpo
-- =============================================

begin;

delete from portal_mensagens;
delete from mensagens;
delete from conversas;
delete from mensagens_inbound;
delete from lead_anotacoes;
delete from lead_documentos;
delete from calculadora_prev;
delete from agendamentos;
delete from parcelas;
delete from contratos;
delete from notificacoes;
delete from disparos;
delete from campanha_usuarios;
delete from campanhas;
delete from leads;
delete from listas;
delete from templates;
delete from advogados;
delete from convites;
delete from audit_logs;
delete from agent_documents;
delete from agentes;
delete from configuracoes;
delete from usuarios;
delete from tenants;

commit;

-- =============================================
-- PASSO 3 - Validacao
-- =============================================

select 'tenants' as tabela, count(*) as total from tenants
union all
select 'usuarios', count(*) from usuarios
union all
select 'listas', count(*) from listas
union all
select 'leads', count(*) from leads
union all
select 'conversas', count(*) from conversas
union all
select 'mensagens_inbound', count(*) from mensagens_inbound
union all
select 'portal_mensagens', count(*) from portal_mensagens
union all
select 'configuracoes', count(*) from configuracoes
union all
select 'contratos', count(*) from contratos
union all
select 'parcelas', count(*) from parcelas;
