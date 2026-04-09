# PrevLegal — EXECUTION_TRACK.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Trilho canônico de execução do produto.
> Última atualização: 08/04/2026

## Objetivo

Este documento existe para evitar dispersão.

Quando houver dúvida sobre “o que fazemos agora”, a ordem oficial vem daqui.

Protocolo complementar entre IAs:
- `docs/CROSS_AI_ALIGNMENT_PROTOCOL.md`

## O que já está pronto

- login e acesso operacional estabilizados
- inbox humana utilizável
- colaboração interna por lead
- follow-up engine com worker e execução manual
- gatilhos automáticos por status
- multiagentes por tenant com seed operacional
- templates de automação editáveis
- portal mobile em estado maduro
- agenda operacional validada em runtime após `043`, `044` e `045`
- geração beta de documentos IA salva corretamente
- foundation Docling iniciada
- importador inteligente fase 1

## Bloqueios de go-live

### P0 — antes de rodar com escritório pagante

1. Fechar a frente comercial do OAuth do Google
- consent screen
- domínio verificado
- política de privacidade
- termos
- submissão de verificação do app

2. Rodar smoke test do tenant real
- login do responsável
- convite de usuário
- permissões customizadas
- inbox
- follow-up
- portal
- agenda

### P1 — logo depois do go-live mínimo

1. Subir serviço Docling e ligar `DOCLING_SERVICE_URL`
2. Refinar calendário/agendamentos
3. Abrir importador inteligente fase 2

## Ordem correta de execução agora

### Etapa 1 — estabilização de produção

1. aplicar `043`
2. aplicar `044`
3. aplicar `045`
4. validar runtime sem fallback estrutural

Status em 08/04/2026:
- `043`, `044` e `045` já foram aplicadas no operacional via patch manual
- o próximo risco residual imediato está na agenda Google pós-migration

Runbook canônico:
- `docs/PRODUCTION_DB_ROLLOUT_043_044_045.md`

### Etapa 2 — Google Calendar real

Status em 09/04/2026:
- conexão Google e agenda foram validadas em runtime
- criar, listar, remarcar e cancelar estão `ok`
- o risco residual saiu da feature e ficou concentrado na confiança comercial do consent screen

1. testar meu Google
2. testar calendário do escritório
3. testar responsável com agenda própria
4. testar responsável sem agenda própria
5. testar remarcar
6. testar cancelar

### Etapa 3 — confiança comercial

1. ajustar OAuth consent screen
2. revisar escopos
3. garantir links públicos
4. preparar verificação do app no Google

Checklist canônico:
- `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`

### Etapa 4 — smoke test final

1. login
2. convite
3. permissões
4. inbox
5. follow-up
6. portal
7. agenda

Checklist canônico:
- `docs/TENANT_SMOKE_TEST_CHECKLIST.md`

## O que não deve roubar foco agora

- redesign grande de telas já utilizáveis
- novas features antes de estabilizar agenda/Google
- expansão para novas frentes antes do go-live básico ficar verde

## Próximo passo oficial

Fechar a trilha comercial do Google OAuth e depois rodar o smoke test final do tenant real.
