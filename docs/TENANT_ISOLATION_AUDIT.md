# PrevLegal — Tenant Isolation Audit

Data: 2026-03-19

## Resumo executivo

O incidente de isolamento entre escritorios foi confirmado como sistemico.

O produto foi desenhado originalmente para operar com um banco por tenant, e por isso o schema operacional e varias APIs assumem que "todos os dados do banco pertencem ao mesmo escritorio". No ambiente atual, em que mais de um escritorio esta sendo atendido no mesmo projeto operacional, esse pressuposto quebra o isolamento.

Conclusao:
- o risco LGPD e real
- o vazamento nao esta em uma rota isolada
- o problema atinge schema, RLS, helpers de auth e varias APIs
- a contencao temporaria por allowlist foi correta e deve ser mantida ate a Fase 26 fechar
- uma camada adicional de endurecimento por ownership de usuario foi aplicada no app como medida temporaria, sem substituir a migracao estrutural

## Causa arquitetural

O schema inicial explicita o modelo antigo:

- `supabase/migrations/001_initial_schema.sql`
  - comentario de topo: `Multi-tenant: cada tenant tem seu proprio banco`

Ou seja, a base operacional foi montada como single-tenant por banco, nao como multi-tenant logico dentro do mesmo banco.

No estado atual:
- a camada central/admin ja tem tabela `tenants`
- o app operacional continua sem `tenant_id` funcional nas tabelas principais
- as policies de RLS e varias APIs seguem assumindo que qualquer usuario autenticado pode ver todos os dados do banco

## Evidence do schema

### Tabelas operacionais principais sem `tenant_id`

- `usuarios`
- `agentes`
- `configuracoes`
- `listas`
- `campanhas`
- `campanha_usuarios`
- `leads`
- `conversas`
- `mensagens`
- `agendamentos`
- `templates`
- `disparos`
- `audit_logs`
- `lead_anotacoes`
- `mensagens_inbound`
- `portal_mensagens`
- `notificacoes`
- `lead_documentos`
- `calculadora_prev`
- `advogados`
- `convites`
- `contratos`
- `parcelas`

### Singletons e modelos incompatíveis com multi-tenant

- `configuracoes`
  - API usa `limit(1)` e trata uma unica linha como "config do escritorio"
- `google_calendar_token`
  - hoje vive dentro de `configuracoes`, entao fica global por banco
- `notificacoes`
  - nao tem `tenant_id`, nem `usuario_id`, nem ownership
- `convites`
  - nao tem `tenant_id`

### Drift entre tipos TypeScript e banco real

`src/lib/types.ts` ja declara `tenant_id` em varios tipos:
- `Usuario`
- `Lista`
- `Campanha`
- `Lead`
- `Interaction`
- `Agendamento`
- `Agente`

Mas esse `tenant_id` nao existe nas tabelas equivalentes do schema operacional. Isso indica que a tipagem avancou antes da persistencia real.

## Evidence de RLS

### Policies herdadas do modelo "um banco por escritorio"

`supabase/migrations/001_initial_schema.sql`
- `leads`, `conversas`, `mensagens`, `agendamentos`, `campanhas`, `listas`
  - leitura: `auth.role() = 'authenticated'`
  - escrita: `auth.role() = 'authenticated'`

Isso e aceitavel apenas quando o banco inteiro pertence a um unico escritorio. Em banco compartilhado, abre leitura/escrita entre tenants.

### Policies explicitamente abertas em tabelas recentes

- `supabase/migrations/011_mensagens_inbound.sql`
  - `SELECT` com `USING (true)` para autenticados
- `supabase/migrations/029_financeiro.sql`
  - `contratos` e `parcelas` liberados para qualquer autenticado

### Policy incorreta ou inconsistente

- `supabase/migrations/006_lead_fields.sql`
  - policy de `lead_anotacoes` usa `usuarios u ON u.id = auth.uid()`
  - `auth.uid()` referencia `auth.users.id`, nao `usuarios.id`
  - isso precisa ser redesenhado quando a modelagem de tenancy for corrigida

## Findings por superficie

### Camada temporaria aplicada no app

Enquanto a migration `031` nao entra no banco remoto, foi aplicada uma defesa adicional no codigo:

- helper `src/lib/tenant-context.ts`
  - resolve o usuario autenticado por `usuarios.auth_id`
  - expoe `usuarioId`, `email`, `role` e `isAdmin`
- regra temporaria de escopo:
  - nao-admin so acessa entidades vinculadas aos seus proprios leads (`responsavel_id = usuario.id`)
  - admins do tenant piloto continuam com visao total da base legado atual

Superficies endurecidas nessa camada:
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/leads/page.tsx`
- `src/app/api/agendamentos/route.ts`
- `src/app/api/configuracoes/route.ts`
- `src/app/api/conversas/route.ts`
- `src/app/api/conversas/[id]/route.ts`
- `src/app/api/conversas/[id]/responder/route.ts`
- `src/app/api/financeiro/contratos/route.ts`
- `src/app/api/financeiro/resumo/route.ts`
- `src/app/api/google/status/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/app/api/leads/[id]/status/route.ts`
- `src/app/api/listas/route.ts`
- `src/app/api/portal/threads/route.ts`
- `src/app/api/portal/mensagens/[leadId]/route.ts`
- `src/app/api/portal/responder/route.ts`
- `src/app/api/relatorios/route.ts`

Limite conhecido:
- essa camada ainda se apoia em ownership de usuario e base piloto legado
- nao substitui `tenant_id` canonico nas tabelas
- nao elimina a necessidade de backfill e RLS por tenant

### P0 — vazamento confirmado em producao

#### Leads

- `src/app/api/leads/route.ts`
  - cria lead manual em lista tecnica global
  - usa `service_role`
- `src/app/api/leads/[id]/route.ts`
  - acessa lead por id sem tenant scope
- `src/app/api/leads/[id]/status/route.ts`
  - atualiza lead por id sem tenant scope

Risco:
- visualizacao cruzada
- alteracao de status entre escritorios
- criacao de dados em contexto global

#### Listas

- `src/app/api/listas/route.ts`
  - usa `service_role`
  - retorna todas as listas
  - calcula totais globais

Risco:
- novo escritorio ve listas importadas de outro

#### Conversas / Inbox / Portal

- `src/app/api/conversas/route.ts`
  - usa `service_role`
  - retorna todas as conversas
- `src/app/api/conversas/[id]/route.ts`
  - usa `service_role`
  - busca mensagens da conversa por id sem tenant scope
- `src/app/api/portal/threads/route.ts`
  - leitura agregada sem tenant funcional
- `src/app/api/portal/mensagens/[leadId]/route.ts`
  - depende de `lead_id` sem tenant scope
- `portal_mensagens`
  - existe na base operacional e tambem precisa receber `tenant_id`

Risco:
- leitura de mensagens de outro escritorio
- mistura de canal interno com portal do cliente

#### Financeiro

- `src/app/api/financeiro/contratos/route.ts`
  - autenticacao + reauth, mas sem tenant scope
- `src/app/api/financeiro/contratos/[id]/route.ts`
  - update/delete por id
- `src/app/api/financeiro/resumo/route.ts`
  - agrega todos os contratos e parcelas do banco
- `src/app/api/financeiro/parcelas/[id]/route.ts`
  - altera parcela por id

Risco:
- vazamento direto de dados financeiros entre escritorios

#### Configuracoes

- `src/app/api/configuracoes/route.ts`
  - usa `service_role`
  - `limit(1)` singleton
  - PATCH sobrescreve a unica configuracao encontrada

Risco:
- um escritorio edita dados de branding, Twilio e Google do outro

### P1 — forte probabilidade de impacto cruzado

#### Agendamentos

- `src/app/api/agendamentos/route.ts`
  - lista todos os agendamentos
  - cria evento Google com base em config global
- `src/app/api/agendamentos/[id]/route.ts`
  - precisa de tenant scope por id

#### Relatorios

- `src/app/api/relatorios/route.ts`
- `src/app/api/relatorios/roi/route.ts`

Risco:
- KPI agregado misturando operacao de escritorios diferentes

#### Google Calendar

- `src/app/api/google/status/route.ts`
  - usa `configuracoes.google_calendar_token` singleton
- `src/app/api/google/auth/route.ts`
- `src/app/api/google/callback/route.ts`

Risco:
- uma conexao Google ficar global para o banco todo

#### Usuarios e convites

- `src/lib/auth-role.ts`
  - resolve usuario por `auth_id`, sem tenant
- `src/lib/auth/get-user-role.ts`
  - usa `service_role` e resolve perfil sem tenant
- `src/app/api/usuarios/route.ts`
- `src/app/api/usuarios/[id]/route.ts`
- `src/app/api/usuarios/convidar/route.ts`
- `src/app/api/usuarios/convite/route.ts`
- `src/app/api/usuarios/aceitar-convite/route.ts`

Risco:
- gestao de usuarios continuar global por banco

## Modelo canônico recomendado

### Principio

Assumir tenant logico no banco operacional compartilhado.

### Regras

1. Toda tabela operacional deve ter `tenant_id`
2. `tenant_id` deve ser `NOT NULL` apos backfill
3. `usuarios` precisa de `tenant_id` canônico
4. O tenant do request deve ser derivado do usuario autenticado
5. Inserts sempre gravam `tenant_id` explicitamente
6. Selects e updates sempre filtram por `tenant_id`
7. `service_role` nao pode ignorar tenancy; ele so pode executar com filtro explícito

### Tabelas que devem receber `tenant_id` explicito

- `usuarios`
- `agentes`
- `configuracoes`
- `listas`
- `campanhas`
- `campanha_usuarios`
- `leads`
- `conversas`
- `mensagens`
- `agendamentos`
- `templates`
- `disparos`
- `audit_logs`
- `lead_anotacoes`
- `mensagens_inbound`
- `portal_mensagens`
- `notificacoes`
- `lead_documentos`
- `calculadora_prev`
- `advogados`
- `convites`
- `contratos`
- `parcelas`

### Relacoes que devem continuar, mas com tenancy consistente

- `lead` pertence a `tenant`
- `lista` pertence a `tenant`
- `campanha` pertence a `tenant`
- `conversa` pertence a `tenant`
- `contrato` pertence a `tenant`, alem do `lead_id`
- `parcela` herda do contrato, mas ainda deve guardar `tenant_id` por simplicidade operacional e RLS

### Singletons que precisam virar "uma linha por tenant"

- `configuracoes`

## Sequencia segura de implementacao

### Onda 1 — modelagem e migration

- adicionar `tenant_id` nullable nas tabelas operacionais
- backfill inicial para dados do tenant piloto
- backfill separado para novos escritorios que ja entraram
- criar indexes por `tenant_id`

### Onda 2 — auth context

- `usuarios` passa a carregar `tenant_id`
- helpers de auth retornam `tenant_id` obrigatoriamente
- criar helper canonico do tipo `getAuthContext()`

### Onda 3 — APIs P0

- `leads`
- `listas`
- `conversas`
- `portal`
- `financeiro`
- `configuracoes`

### Onda 4 — APIs P1

- `agendamentos`
- `relatorios`
- `google`
- `usuarios`
- `campanhas`
- `notificacoes`

### Onda 5 — RLS

- trocar policies abertas por `tenant_id = current_user_tenant`
- revisar cuidadosamente tabelas acessadas por `service_role`

### Onda 6 — validacao

- tenant A nao ve nada do tenant B
- tenant B nao ve nada do tenant A
- financeiro e inbox isolados
- configuracao Google/Twilio isolada
- onboarding de novo escritorio sem vazamento

## Contingencia atual

Mantida:
- allowlist temporaria por email no middleware
- usuarios fora da allowlist:
  - redirect para `/isolamento-em-andamento`
  - `423` nas APIs autenticadas do app

Essa contingencia nao substitui a correcao estrutural. Ela apenas reduz a exposicao enquanto a Fase 26 e executada.

## Estado real do banco em 2026-03-19

Leitura confirmada com `service_role` no projeto operacional:

### Tenants presentes na base operacional

- `Alexandrini Advogados`
  - `id`: `ad01e4ec-509b-4bf0-976e-c17bc2e53373`
  - `responsavel_email`: `jessica@alexandrini.adv.br`
- `Fluxrow`
  - `id`: `d6d398af-f27e-4d5f-bba0-378ae79caba7`
  - `responsavel_email`: `fbcfarias@icloud.com`

### Estado dos usuarios

Foram encontrados 4 usuarios operacionais:
- 3 registros historicos da Jessica
- 1 registro do Caua/Fluxrow

### Ownership real dos dados operacionais atuais

Dados existentes hoje:
- `listas`: 6
- `leads`: 78
- `configuracoes`: 1
- `portal_mensagens`: 11
- `mensagens_inbound`: 3

Todos os registros operacionais principais encontrados ate aqui apontam para o legado da Jessica:
- todas as `listas` foram importadas por `0123b8f0-dfa0-481c-a264-ba6700a863e6`
- os `leads` atuais pertencem a essas listas
- `configuracoes` ainda contem prompt e contexto do escritorio Alexandrini
- `advogados` tambem aponta para a Jessica

Conclusao pratica:
- a base atual ainda e, de fato, a base legado da Alexandrini
- o tenant `Fluxrow` existe no cadastro, mas nao tem isolamento operacional real
- por seguranca, o tenant novo nao deve acessar a plataforma ate a Fase 26 fechar
