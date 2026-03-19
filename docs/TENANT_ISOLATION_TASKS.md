# PrevLegal — Fase 26: Tenant Isolation Tasks

Incidente P0 de isolamento de dados entre escritorios.

## Status atual

- [ ] Contencao temporaria aplicada
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

- [ ] Definir bloqueio temporario para impedir rollout multi-escritorio neste ambiente
- [ ] Avaliar se o bloqueio deve ocorrer no admin (`novo escritorio` / `enviar acesso`) ou no login do tenant nao-piloto
- [ ] Garantir que a contencao nao quebre o piloto atual
- [ ] Comunicar no handoff que novos escritorios nao devem ser onboardados sem isolamento real

## Fase 26B — Auditoria de schema

- [ ] Inventariar tabelas sem `tenant_id`
- [ ] Classificar tabelas:
  - operacionais
  - auth/usuarios
  - central/admin
  - auxiliares
- [ ] Confirmar estrategia para:
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

## Fase 26C — Auditoria de APIs/superficies

- [ ] `src/app/api/leads/route.ts`
- [ ] `src/app/api/listas/route.ts`
- [ ] `src/app/api/conversas/route.ts`
- [ ] `src/app/api/financeiro/*`
- [ ] `src/app/api/configuracoes/route.ts`
- [ ] `src/app/api/relatorios/route.ts`
- [ ] `src/app/api/google/status/route.ts`
- [ ] `src/app/api/google/callback/route.ts`
- [ ] `src/app/api/portal/*`
- [ ] `src/app/api/usuarios/*`
- [ ] componentes/paginas que assumem lista global ou config unica

## Fase 26D — Modelo de tenancy

- [ ] Definir origem canonica do tenant do usuario autenticado
- [ ] Definir relacao `usuarios -> tenant`
- [ ] Definir se `tenant_id` vai em todas as tabelas operacionais ou por heranca via joins controlados
- [ ] Definir estrategia de backfill para dados da Jessica e do novo escritorio
- [ ] Definir politica de exclusao e cascata por tenant

## Fase 26E — Implementacao

- [ ] Criar migration(s) de `tenant_id`
- [ ] Backfill dos dados existentes
- [ ] Atualizar inserts para gravarem `tenant_id`
- [ ] Atualizar selects para filtrarem `tenant_id`
- [ ] Revisar trechos com `service_role`
- [ ] Ajustar RLS
- [ ] Validar onboarding de escritorio novo sem vazamento

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
