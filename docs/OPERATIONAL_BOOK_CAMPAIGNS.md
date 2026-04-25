# PrevLegal — OPERATIONAL_BOOK_CAMPAIGNS.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Camada canônica de campanhas, follow-up e retomada operacional.

## Objetivo

Este guia existe para responder:

- como o disparo deve acontecer
- quando uma campanha pode ou não pode mandar mensagem
- como a thread deve aparecer na operação
- como o agente continua após o disparo

## Regra operacional

- campanha é trilha comercial
- thread de conversa é trilha operacional
- outbound da campanha deve aparecer no histórico da conversa
- resposta do lead deve poder acionar o agente automaticamente

## Fluxo certo de campanha

1. campanha sai de `rascunho` ou `pausada`
2. seleciona leads da lista ou seleção personalizada
3. resolve o contato operacional correto
4. resolve o canal WhatsApp do tenant
5. envia a mensagem
6. cria ou reaproveita `conversa`
7. espelha outbound na trilha da thread
8. se o lead responder e a conversa estiver em `agente`, o runtime continua o atendimento

## Regras de contato

### Campanha com verificação desligada

- pode enviar para contato com telefone operacional válido
- não depende de `tem_whatsapp = true`
- isso é importante para smoke e para listas recém-importadas

### Campanha com verificação ligada

- só envia para contatos previamente marcados como aptos
- se a lista ainda não passou por verificação, o resultado natural é `0 enviados`

### Tipo de alvo

O alvo pode ser:

- `titular`
- `conjuge`
- `filho`
- `irmao`

O sistema deve preferir os campos estruturados do lead quando o alvo não for `titular`.

## Verificação de WhatsApp

A verificação precisa respeitar o provider real do tenant.

- `twilio`: pode depender de lookup legado
- `zapi`: número operacional válido já precisa ser tratado como contato acionável

Não é aceitável marcar toda a lista como `sem WhatsApp` só porque a lógica continua presa ao fluxo legado de Twilio.

## Regras de framing da primeira mensagem

### Benefícios previdenciários

- abordagem orientada a benefício / revisão / oportunidade
- pode usar o playbook histórico do escritório de benefícios

### Planejamento previdenciário

- abordagem fria e consultiva
- não assumir que o lead “já demonstrou interesse”
- não agir como se já tivesse havido conversa prévia
- primeiro toque deve abrir o assunto e despertar curiosidade, não pular para fechamento

## Regras de retomada pelo agente

- campanha dispara
- lead responde
- resposta entra na thread
- o agente continua usando o contexto do outbound inicial

Fora do horário:

- não deve escalar automaticamente para humano só por causa do relógio
- a thread continua em `agente`
- o sistema pode avisar fora do horário
- a retomada deve acontecer na próxima janela útil

## Follow-up

Follow-up é trilha programada de cadência.

O worker deve:

- buscar runs ativas com envio vencido
- disparar step por canal
- registrar evento
- parar automaticamente se o lead já converteu
- concluir quando não houver próximo step

## Quando considerar a camada saudável

- disparo cria rastro comercial e rastro operacional
- inbound não duplica thread nem resposta do agente
- primeira resposta do agente pós-campanha respeita o playbook do tenant
- fora do horário não sequestra a conversa para humano
- reset de lead de teste permite repetir o smoke no mesmo número

## Problemas clássicos

- `0 enviados` com toggle ligado porque a lista ainda não foi verificada
- `Instance not found` por credencial incorreta da Z-API
- resposta duplicada por webhook inbound duplicado
- framing errado por prompt tratar abordagem fria como interesse prévio
