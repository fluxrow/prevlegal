-- PrevLegal
-- Reset operacional limpo para bootstrap multi-tenant
-- Execute APENAS no banco operacional, depois da migration 031.
-- Nao execute no projeto central.

begin;

-- Filhos / tabelas derivadas
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

-- Configuracao / usuarios / tenant
delete from agentes;
delete from configuracoes;
delete from usuarios;
delete from tenants;

commit;

-- Validacao manual sugerida apos o commit:
-- select count(*) from tenants;
-- select count(*) from usuarios;
-- select count(*) from listas;
-- select count(*) from leads;
-- select count(*) from conversas;
-- select count(*) from mensagens_inbound;
-- select count(*) from portal_mensagens;
-- select count(*) from configuracoes;
-- select count(*) from contratos;
-- select count(*) from parcelas;
