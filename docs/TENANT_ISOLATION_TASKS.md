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
  - `fbcfarias@icloud.com`
  - `fbcfarias@gmail.com`
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
- [ ] Backfill dos dados existentes
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
