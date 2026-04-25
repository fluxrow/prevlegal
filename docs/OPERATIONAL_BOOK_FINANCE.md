# PrevLegal — OPERATIONAL_BOOK_FINANCE.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Camada canônica de contratos, parcelas e leitura financeira do escritório.

## Objetivo

Este guia existe para responder:

- como contrato nasce no produto
- como parcelas são geradas
- como o resumo financeiro deve ser lido
- quais proteções operacionais são obrigatórias

## Regra operacional

Financeiro no PrevLegal não é só cobrança.
É a camada que transforma lead em contrato e dá visibilidade sobre:

- carteira ativa
- parcelas
- atrasos
- origem comercial dos contratos
- sucumbência

## Criação de contrato

Fluxo certo:

1. operador autorizado cria contrato para um lead acessível
2. contrato recebe dados financeiros principais
3. parcelas são geradas automaticamente
4. status do lead muda para `converted`

Campos centrais do contrato:

- `valor_total`
- `valor_entrada`
- `num_parcelas`
- `tipo_cobranca`
- percentuais de êxito e sucumbência quando aplicáveis

## Parcelas

As parcelas são derivadas do contrato.

Elas sustentam:

- recebido no mês
- vencimentos do dia
- previsto 7d / 30d
- aberto
- atraso

Quando a parcela atrasa:

- a parcela pode ser marcada como `atrasado`
- o contrato pode ter status recalculado com base no conjunto das parcelas

## Resumo financeiro

O resumo deve responder rapidamente:

- quantos contratos existem
- quanto há em contratos
- quanto entrou no mês
- quanto está atrasado
- qual risco da carteira
- qual a origem comercial dos contratos

## Regras de acesso

Financeiro exige:

- `financeiro_manage`
- reauth recente quando aplicável
- escopo do tenant
- escopo do responsável quando o usuário não é admin

## Relação com campanhas e operação

O financeiro não vive isolado.
Ele deve ajudar a responder:

- quanto dos contratos veio de campanha
- quanto veio de operação direta
- quantos contratos passaram por agendamento
- quanto da carteira depende de follow-up humano

## Relação com documentos e contrato PDF

Há duas camadas diferentes:

- `contratos` e `parcelas` = camada financeira
- `contract_templates` e PDFs gerados = camada documental/jurídica

As duas se conversam, mas não devem ser confundidas.

## Estado correto hoje

- criação e listagem de contratos existem
- parcelas são geradas automaticamente
- resumo financeiro já cruza contrato, parcela, campanha e agendamento
- o produto já suporta leitura de carteira por tenant

## Próximo nível de maturidade

- fechamento mais integrado entre minuta e contrato financeiro
- visão mais clara de recebimento real
- dashboard de custo por tenant
- budget e rate limiting por tenant
- previsibilidade financeira mais forte

## Quando considerar a camada saudável

- contrato cria parcelas corretamente
- lead convertido aparece coerente no pipeline
- resumo financeiro bate com a carteira real
- atraso atualiza status sem intervenção manual excessiva
- origem comercial ajuda decisão de operação, não só relatório
