# PrevLegal — OPERATIONAL_BOOK_SCHEDULING.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Camada canônica dos agendamentos, dono do calendário e leitura operacional da agenda.

## Objetivo

Este guia existe para responder:

- como um agendamento deve ser criado
- quem é o dono do evento
- como o status do lead evolui
- o que é agenda do escritório e o que é agenda do usuário

## Regra principal

Agendamento não é só uma data.
É uma transição operacional do lead.

Quando o agendamento é criado corretamente:

- o lead entra em nova etapa
- a agenda do responsável vira fonte de verdade
- o portal pode mostrar o próximo compromisso

## Fluxo certo

1. validar lead dentro do escopo do tenant e do usuário
2. validar responsável do agendamento
3. tentar criar evento no Google Calendar
4. salvar o agendamento no produto
5. atualizar o status do lead para `scheduled`

## Dono do calendário

O produto já está orientado a ownership por usuário.

Na prática:

- o evento pode nascer no calendário do usuário responsável
- quando o schema ainda não estiver completo, existe fallback compatível

Ou seja:

- o comportamento certo é agenda por usuário
- o sistema ainda tolera ambiente com schema parcial

## Regra de acesso

- admin vê a agenda do tenant
- não-admin vê sua própria agenda operacional

Isso precisa bater com:

- carteira
- inbox
- responsabilidade do caso

## Status importantes

Status de agendamento esperados no runtime:

- `agendado`
- `confirmado`
- `remarcado`
- `realizado`
- `cancelado`

Leitura prática:

- o agendamento precisa sustentar tanto operação interna quanto experiência do portal

## Relação com portal

O portal deve conseguir mostrar:

- próximo agendamento relevante
- confirmações
- remarcações quando a foundation permitir

Agendamento não deve viver isolado da experiência do cliente.

## Quando considerar a agenda saudável

- o responsável certo recebe o compromisso
- o lead muda de status corretamente
- o portal consegue refletir o próximo compromisso
- a leitura da agenda no dashboard faz sentido por usuário e por tenant
