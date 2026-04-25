# PrevLegal — OPERATIONAL_BOOK_ADMIN.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Camada canônica do admin, saúde de tenants e leitura de risco operacional.

## Objetivo

Este guia existe para responder:

- o que o admin do PrevLegal precisa enxergar
- como ler saúde de um tenant
- como separar onboarding incompleto de operação saudável

## Regra principal

Admin não é só cadastro de escritório.
Admin precisa responder:

- este tenant está configurado?
- este tenant está operando?
- este tenant está parado?
- existe risco operacional agora?

## Superfícies mínimas do admin

O admin precisa enxergar:

- tenant
- métricas de adoção
- canais WhatsApp
- campanhas recentes
- conversas recentes
- receita/contratos
- atividade recente da equipe

## Leitura de saúde operacional

A leitura de risco já parte destas variáveis:

- total de leads
- total de usuários
- usuários ativos em 7 dias
- conversas recentes
- campanhas criadas
- agendamentos pendentes

Leitura prática:

- tenant sem leads ou sem usuários ativos tende a risco alto
- tenant com base pronta, mas pouca operação recente, tende a risco médio
- tenant com sinais de uso recente tende a risco baixo

## O que o admin deve distinguir

### 1. Tenant criado

Não significa tenant operando.

### 2. Tenant configurado

Tem usuário, canal, agente, base mínima e acesso funcional.

### 3. Tenant operando

Tem leads, campanhas ou conversas reais, atividade da equipe e sinais de continuidade.

## Regras de provisioning

O admin é responsável por ações como:

- criar tenant
- editar tenant
- recriar acesso
- resetar senha
- gerar link de acesso
- configurar canais WhatsApp

Essas ações precisam respeitar:

- containment ativo
- regra de tenant permitido
- estado real do onboarding

## Canais no admin

O admin deve refletir o modelo novo de `whatsapp_numbers`.

Campos legados de Twilio existem por compatibilidade, mas não podem confundir a operação atual de Z-API.

## Quando considerar o admin saudável

- os KPIs ajudam decisão operacional real
- o risco do tenant aponta onboarding parado vs. operação ativa
- o admin consegue agir sem entrar no banco
- a visão de tenant não mistura dado bonito com leitura enganosa
