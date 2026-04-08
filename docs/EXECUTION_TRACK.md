# PrevLegal — EXECUTION_TRACK.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Trilho canônico de execução do produto.
> Última atualização: 08/04/2026

## Objetivo

Este documento existe para evitar dispersão.

Quando houver dúvida sobre “o que fazemos agora”, a ordem oficial vem daqui.

## O que já está pronto

- login e acesso operacional estabilizados
- inbox humana utilizável
- colaboração interna por lead
- follow-up engine com worker e execução manual
- gatilhos automáticos por status
- multiagentes por tenant com seed operacional
- templates de automação editáveis
- portal mobile em estado maduro
- agenda operacional com fallback técnico e UI já utilizável
- geração beta de documentos IA salva corretamente
- foundation Docling iniciada
- importador inteligente fase 1

## Bloqueios de go-live

### P0 — antes de rodar com escritório pagante

1. Aplicar migrations pendentes em produção
- `043_user_calendar_ownership.sql`
- `044_user_permissions_foundation.sql`
- `045_document_processing_foundation.sql`

2. Validar agenda Google sem fallback
- conectar Google do usuário
- conectar calendário do escritório
- criar agendamento
- remarcar
- cancelar

3. Fechar a frente comercial do OAuth do Google
- consent screen
- domínio verificado
- política de privacidade
- termos
- submissão de verificação do app

4. Rodar smoke test do tenant real
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

### Etapa 2 — Google Calendar real

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

### Etapa 4 — smoke test final

1. login
2. convite
3. permissões
4. inbox
5. follow-up
6. portal
7. agenda

## O que não deve roubar foco agora

- redesign grande de telas já utilizáveis
- novas features antes de estabilizar agenda/Google
- expansão para novas frentes antes do go-live básico ficar verde

## Próximo passo oficial

Aplicar `043`, `044` e `045` em produção e validar agenda Google sem fallback de schema.
