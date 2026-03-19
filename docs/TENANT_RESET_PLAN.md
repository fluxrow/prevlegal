# PrevLegal — Plano de Reset Limpo e Bootstrap Multi-Tenant

Data: 2026-03-19

## Objetivo

Descartar o legado piloto (Alexandrini/Jessica e demais dados de contexto) e reiniciar a operacao do banco operacional em um modelo limpo, pronto para multi-tenant real.

Esse plano substitui o backfill do legado **se** a decisao de negocio for:

- nao reaproveitar os dados piloto existentes
- recadastrar o primeiro escritorio real do zero
- importar listas novamente
- recriar usuarios reais dentro do modelo novo

## Premissas

- o admin master do sistema continua preservado no subdominio `admin`
- o admin master nao depende dos registros operacionais em `public.usuarios`
- o legado atual pode ser descartado sem necessidade de preservar historico operacional
- a migration `031_tenant_isolation_foundation.sql` deve ser aplicada antes do bootstrap real

## O que preservar

- credenciais/envs do admin master
- configuracoes de dominio, Vercel, Google Console e integrações externas
- codigo e migrations do repositorio
- projeto Supabase operacional
- projeto Supabase central

## O que zerar no banco operacional

- `tenants`
- `usuarios`
- `agentes`
- `configuracoes`
- `listas`
- `campanhas`
- `campanha_usuarios`
- `leads`
- `conversas`
- `mensagens`
- `mensagens_inbound`
- `portal_mensagens`
- `agendamentos`
- `templates`
- `disparos`
- `audit_logs`
- `lead_anotacoes`
- `lead_documentos`
- `calculadora_prev`
- `advogados`
- `convites`
- `notificacoes`
- `contratos`
- `parcelas`
- `agent_documents`

## O que tratar separadamente

- `auth.users`
  - pode permanecer temporariamente, porque sem linha correspondente em `public.usuarios` o app nao libera acesso operacional
  - idealmente deve ser limpo depois no painel Auth ou via Admin API para remover contas piloto antigas

## Ordem segura

1. Manter a contencao atual ativa
2. Aplicar a migration `031`
3. Rodar o reset operacional
4. Validar que as tabelas operacionais ficaram vazias
5. Cadastrar o primeiro escritorio real no admin
6. Provisionar o responsavel real do escritorio
7. Convidar os demais usuarios reais
8. Importar listas reais novamente
9. Prosseguir com o tenant isolation definitivo no codigo/RLS

## Por que esse caminho e melhor aqui

- evita backfill de dados sujos/de contexto
- reduz ambiguidade sobre quem pertence a qual tenant
- permite que `tenant_id` comece certo desde o primeiro escritorio real
- simplifica a validacao LGPD
- evita “carregar piloto legado” para dentro do modelo final

## Validacoes pos-reset

Depois do reset:

- `tenants` deve estar vazio
- `usuarios` deve estar vazio
- `listas`, `leads`, `conversas`, `mensagens_inbound`, `portal_mensagens`, `configuracoes`, `contratos` e `parcelas` devem estar vazios
- login do app operacional nao deve liberar acesso sem novo cadastro/provisionamento
- o admin master deve continuar entrando normalmente em `admin.prevlegal.com.br`

## Bootstrap recomendado apos reset

1. Criar o primeiro escritorio real no admin
2. Definir o responsavel real do escritorio
3. Enviar acesso do responsavel
4. Responsavel definir senha
5. Criar os demais usuarios do escritorio via convite
6. Importar listas e operar ja no modelo novo

## Observacao importante

Esse reset melhora muito a qualidade do bootstrap, mas **nao encerra sozinho a Fase 26**.

O fechamento real ainda exige:

- gravacao consistente de `tenant_id`
- filtros por `tenant_id`
- revisao de `service_role`
- RLS por tenant
- validacao entre pelo menos dois escritorios reais distintos
