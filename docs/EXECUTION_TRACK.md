# PrevLegal — EXECUTION_TRACK.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Trilho canônico de execução do produto.
> Última atualização: 10/04/2026

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
- seed de agentes com dois modelos operacionais explícitos (`Jessica` e `Ana`)
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
- vídeo de demonstração para o Google

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
4. Fechar lacunas operacionais de campanhas e inbox multiusuário:
- permitir usar leads cadastrados manualmente em campanhas de teste/execução
- permitir escolher qualquer agente do escritório na campanha e sugerir mensagem inicial por template
- expor canais Z-API/Twilio na configuração de disparo da campanha
- corrigir transferência de atendimento para que a conversa saia do antigo responsável e apareça no novo
- corrigir deep link de `abrir conversa` / `iniciar conversa` para abrir a thread correta na inbox

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

Status em 09/04/2026:
- app já foi endurecido para a submissão:
  - escopos mínimos de Google Calendar
  - política de privacidade explícita para agenda Google
  - termos explícitos para agenda Google
  - texto-base de submissão pronto
- o restante desta etapa é manual no Google Auth Platform

Status em 10/04/2026:
- branding: `ok`
- público-alvo: `ok`
- domínios autorizados: `ok`
- redirect URIs: `ok`
- escopos: `ok`
- central de verificação: bloqueio residual concentrado apenas no vídeo de demonstração

1. ajustar OAuth consent screen
2. revisar escopos
3. garantir links públicos
4. preparar verificação do app no Google

Checklist canônico:
- `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
- `docs/GOOGLE_OAUTH_SUBMISSION_COPY.md`

### Etapa 4 — smoke test final

1. login
2. convite
3. permissões
4. inbox
5. follow-up
6. portal
7. agenda

Status em 10/04/2026:
- login e acesso: `ok`
- agenda Google: `ok`
- follow-up e automações: `ok`
- documentos IA básicos: `ok`
- Z-API outbound: `ok`
- Z-API inbound: `ok`
- busca normalizada: `ok`
- inbox pessoal por ownership/assignee: `ok`
- cadastro manual sem CPF: `ok`
- seleção de canal WhatsApp por agente: `ok`
- campanhas com agente real, canal real e template inicial contextualizado: `ok`
- pendências residuais do smoke test:
  - passe final de convite/aceite com email inédito e permissões customizadas ponta a ponta
  - passe final de portal com tenant real
  - passe final de usuário não-admin com carteira isolada e permissão customizada
  - passe final de transferência de conversa entre usuários
  - passe final de abertura da thread via lead detail / notificações
  - passe final de campanhas com lead manual, escolha de agente e canal Z-API

Observação operacional do go-live:
- o convite interno ainda é `link manual`; o sistema gera a URL, mas não envia email automático
- no modelo atual do go-live, cada email fica vinculado a um único escritório
- a inbox humana é pessoal por padrão, inclusive para admin do escritório:
  - vê a conversa quem é dono do lead
  - ou quem assumiu o atendimento humano
- visão ampla de equipe fica para uma camada posterior de supervisão
- na configuração de agentes, o comportamento recomendado passa a ser:
  - usar o mesmo canal WhatsApp do escritório para a maioria dos agentes
  - só separar por agente quando houver uma operação claramente distinta

Checklist canônico:
- `docs/TENANT_SMOKE_TEST_CHECKLIST.md`

## O que não deve roubar foco agora

- redesign grande de telas já utilizáveis
- novas features antes de estabilizar agenda/Google
- expansão para novas frentes antes do go-live básico ficar verde

## Próximo passo oficial

Gravar e subir o vídeo do Google OAuth e, em paralelo, fechar as três pendências residuais do smoke test final do tenant real.
