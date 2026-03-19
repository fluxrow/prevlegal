# PrevLegal — Fase 26: Tenant Isolation Tasks

Incidente P0 de isolamento de dados entre escritorios.

## Status atual

- [x] Contencao temporaria aplicada
- [ ] Auditoria completa das superficies vazando dados
- [ ] Modelo de tenancy aprovado
- [ ] Migration/backfill de `tenant_id`
- [ ] APIs filtrando por tenant
- [ ] RLS revisada para tenant isolation
- [ ] Validacao ponta a ponta entre dois escritorios

## Findings confirmados

- [x] O produto ainda opera como single-tenant em varias areas
- [x] Um novo escritorio conseguiu ver dados da Jessica
- [x] Vazamento reportado em:
  - leads
  - listas
  - conversas / caixa de entrada / portal
  - financeiro
  - configuracoes
- [x] Perfil pareceu respeitar apenas o usuario autenticado
- [x] Existem consultas com `service_role` e sem escopo de tenant
- [x] Tabelas principais de negocio nao tem `tenant_id` funcional

## Fase 26A — Contencao

- [x] Definir bloqueio temporario para impedir rollout multi-escritorio neste ambiente
- [x] Avaliar se o bloqueio deve ocorrer no admin (`novo escritorio` / `enviar acesso`) ou no login do tenant nao-piloto
- [x] Garantir que a contencao nao quebre o piloto atual
- [x] Comunicar no handoff que novos escritorios nao devem ser onboardados sem isolamento real
- [x] Implementar allowlist temporaria por email no middleware
- [x] Criar pagina explicita de acesso restrito
- [x] Configurar `TENANT_CONTAINMENT_ALLOWED_EMAILS` em `Production` e `Development`

### Contencao aplicada

- allowlist temporaria:
  - `jessica@alexandrini.adv.br`
- usuarios autenticados fora da allowlist:
  - sao redirecionados para `/isolamento-em-andamento`
  - recebem `423` em APIs autenticadas do app
- excecoes publicas preservadas:
  - admin auth
  - convites
  - webhooks
  - portal publico
- reforco adicional:
  - rotas de onboarding do responsavel agora retornam `423` para emails fora da allowlist
  - isso bloqueia `recriar-acesso`, `link-acesso` e `reset-senha` para escritorios fora do piloto
- decisao operacional atual:
  - apenas o tenant piloto da Jessica permanece liberado no app
  - novos escritorios ficam restritos ao admin ate o tenant isolation real fechar

## Fase 26A+ — Endurecimento temporario no app

- [x] Criar helper temporario de contexto por usuario autenticado
- [x] Exigir autenticacao nas rotas que ainda estavam publicas ou globais
- [x] Limitar leituras por ownership de usuario nas superficies mais sensiveis
- [x] Preservar admins do tenant piloto com visao total do legado atual
- [ ] Aplicar a migration `031` no banco remoto
- [x] Aplicar a migration `031` no banco remoto
- [x] Executar reset operacional limpo no banco remoto
- [ ] Fazer backfill de `tenant_id`
- [ ] Trocar o escopo temporario por tenant isolation real

### Endurecimento temporario aplicado

- helper criado:
  - `src/lib/tenant-context.ts`
- regra temporaria:
  - usuario autenticado vira ancora de escopo via `usuarios.auth_id`
  - nao-admin so acessa leads onde `responsavel_id = usuario.id`
  - admin do tenant piloto continua vendo a base legado enquanto a migracao nao entra
- superficies endurecidas nesta onda:
  - `dashboard`
  - `leads`
  - `conversas`
  - `portal`
  - `agendamentos`
  - `relatorios`
  - `financeiro`
  - `configuracoes`
  - `listas`
- observacao critica:
  - esta camada reduz superficie de vazamento dentro do app, mas ainda nao e isolamento real por tenant
  - o fechamento definitivo continua dependendo de `tenant_id` + backfill + filtros canonicos + RLS

### Estado remoto confirmado apos reset

- banco operacional `lrqvvxmgimjlghpwavdb`:
  - `031` aplicada
  - reset operacional concluido
- contagens confirmadas em `2026-03-19`:
  - `tenants = 0`
  - `usuarios = 0`
  - `listas = 0`
  - `leads = 0`
  - `conversas = 0`
  - `mensagens_inbound = 0`
  - `portal_mensagens = 0`
  - `configuracoes = 0`
  - `contratos = 0`
  - `parcelas = 0`
- bootstrap inicial confirmado apos o reset:
  - primeiro escritorio de teste criado com sucesso no admin
  - nome usado no teste: `Fluxrow`
  - proximo passo operacional: provisionar acesso do responsavel e validar o primeiro login do tenant novo

## Fase 26B — Auditoria de schema

- [x] Inventariar tabelas sem `tenant_id`
- [ ] Classificar tabelas:
  - operacionais
  - auth/usuarios
  - central/admin
  - auxiliares
- [x] Confirmar estrategia para:
  - `usuarios`
  - `listas`
  - `leads`
  - `conversas`
  - `mensagens`
  - `mensagens_inbound`
  - `campanhas`
  - `agendamentos`
  - `contratos`
  - `parcelas`
  - `configuracoes`
  - `templates`
  - `disparos`
  - `notificacoes`
  - `advogados`

### Findings de schema confirmados

- schema operacional nasceu com a premissa `cada tenant tem seu proprio banco`
- `src/lib/types.ts` ja assume `tenant_id`, mas o banco operacional ainda nao
- tabelas operacionais sem `tenant_id` funcional:
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
  - `notificacoes`
  - `lead_documentos`
  - `calculadora_prev`
  - `advogados`
  - `convites`
  - `contratos`
  - `parcelas`
- `configuracoes` hoje e singleton global por banco
- `notificacoes` nao tem ownership por tenant nem por usuario
- `google_calendar_token` hoje fica preso em `configuracoes`, entao e global por banco
- a leitura real do banco mostrou:
  - 2 tenants na base operacional
  - dados operacionais atuais ainda pertencem ao legado da Jessica
  - tenant novo ainda nao possui base isolada propria

Referencia detalhada:
- `docs/TENANT_ISOLATION_AUDIT.md`

## Fase 26C — Auditoria de APIs/superficies

- [x] `src/app/api/leads/route.ts`
- [x] `src/app/api/listas/route.ts`
- [x] `src/app/api/conversas/route.ts`
- [x] `src/app/api/financeiro/*`
- [x] `src/app/api/configuracoes/route.ts`
- [x] `src/app/api/relatorios/route.ts`
- [x] `src/app/api/google/status/route.ts`
- [ ] `src/app/api/google/callback/route.ts`
- [x] `src/app/api/portal/*`
- [x] `src/app/api/usuarios/*`
- [ ] componentes/paginas que assumem lista global ou config unica

### Findings de APIs confirmados

- `src/app/api/listas/route.ts`
  - usa `service_role`
  - retorna todas as listas
- `src/app/api/conversas/route.ts`
  - usa `service_role`
  - retorna todas as conversas
- `src/app/api/configuracoes/route.ts`
  - usa `service_role`
  - trabalha com `limit(1)` e singleton global
- `src/app/api/financeiro/contratos/route.ts`
  - autenticacao + reauth, mas sem tenant scope
- `src/app/api/financeiro/resumo/route.ts`
  - agrega todos os contratos/parcelas do banco
- `src/app/api/agendamentos/route.ts`
  - lista todos os agendamentos do banco
- `src/app/api/google/status/route.ts`
  - usa config singleton, logo o Google fica global por banco
- `src/lib/auth-role.ts` e `src/lib/auth/get-user-role.ts`
  - resolvem usuario sem `tenant_id`

Referencia detalhada:
- `docs/TENANT_ISOLATION_AUDIT.md`

## Fase 26D — Modelo de tenancy

- [ ] Definir origem canonica do tenant do usuario autenticado
- [ ] Definir relacao `usuarios -> tenant`
- [ ] Definir se `tenant_id` vai em todas as tabelas operacionais ou por heranca via joins controlados
- [ ] Definir estrategia de backfill para dados da Jessica e do novo escritorio
- [ ] Definir politica de exclusao e cascata por tenant

## Fase 26E — Implementacao

- [x] Criar migration base de `tenant_id`
- [ ] Escolher entre:
  - backfill do legado
  - reset limpo + bootstrap
- [ ] Backfill dos dados existentes, se o legado for preservado
- [x] Reset operacional limpo, se o legado piloto for descartado
- [ ] Atualizar inserts para gravarem `tenant_id`
- [ ] Atualizar selects para filtrarem `tenant_id`
- [ ] Revisar trechos com `service_role`
- [ ] Ajustar RLS
- [ ] Validar onboarding de escritorio novo sem vazamento

### Foundation pronta no repo

- migration criada:
  - `supabase/migrations/031_tenant_isolation_foundation.sql`
- objetivo:
  - adicionar `tenant_id` nas tabelas operacionais
  - preparar indexes
  - transformar `configuracoes` em singleton por tenant
- observacao:
  - a migration ainda nao deve ser considerada suficiente sem backfill + APIs + RLS

### Caminho preferido no contexto atual

Se os dados `Alexandrini/Jessica` forem apenas piloto/contexto e puderem ser descartados:

- preferir reset limpo ao inves de backfill
- aplicar `031`
- zerar o legado operacional
- recriar o primeiro escritorio real do zero
- recriar usuarios reais no modelo novo

Referencias:
- `docs/TENANT_RESET_PLAN.md`
- `supabase/reset/operational_reset_after_031.sql`

### Bootstrap tenant-aware iniciado

- `recriar-acesso` agora grava `usuarios.tenant_id`
- `convites` internos agora gravam `tenant_id`
- aceite de convite agora exige `convites.tenant_id` e grava `usuarios.tenant_id`
- importacao de listas agora grava `listas.tenant_id` e `leads.tenant_id`
- criacao manual de lead agora grava `tenant_id` e cria lista tecnica por tenant
- bootstrap do primeiro tenant agora pode furar a allowlist de contencao apenas enquanto `usuarios = 0`

## Frente separada — Google OAuth

Essa frente nao resolve o incidente LGPD, mas precisa ser corrigida em paralelo.

- [ ] Revisar OAuth Client no Google Cloud Console
- [ ] Confirmar redirect URI:
  - `https://app.prevlegal.com.br/api/google/callback`
- [ ] Confirmar origins/autorizacao da app
- [ ] Validar fluxo real no navegador

## Observacao operacional

Enquanto esta fase nao estiver concluida:

- nao cadastrar novos escritorios reais para operacao
- nao tratar o app como multi-tenant seguro
- manter registro de cada ajuste no handoff, learnings e Obsidian
