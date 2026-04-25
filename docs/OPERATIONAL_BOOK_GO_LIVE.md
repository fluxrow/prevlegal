# PrevLegal — OPERATIONAL_BOOK_GO_LIVE.md

Contexto: [[OPERATIONAL_BOOK]]
Mestra: [[MASTER_PREV_LEGAL]]

## Objetivo

Executar go-live e smoke real sem depender de memória oral ou releitura de sessões antigas.

## Ordem padrão de go-live

1. Confirmar tenant, usuários e permissões.
2. Confirmar agente default e `perfil_operacao`.
3. Confirmar template contratual ativo do tenant.
4. Confirmar canal WhatsApp ativo.
5. Confirmar webhook inbound.
6. Confirmar lista/import válido.
7. Rodar smoke real.
8. Registrar resultado e próximos ajustes.

## Pré-requisitos mínimos

- tenant criado e acessível
- pelo menos um admin real ativo
- agente default ativo
- canal WhatsApp configurado
- lista teste carregada
- template jurídico aplicável, se o smoke inclui documento

## Smoke real do WhatsApp

1. Disparar para um lead de teste controlado.
2. Responder como lead.
3. Validar criação ou reaproveitamento da conversa.
4. Validar resposta automática do agente.
5. Validar continuidade correta do playbook.
6. Validar inbox e notificações.
7. Se o caso evoluir, validar extração estruturada.
8. Se o caso evoluir até documento, validar preparação de minuta.

## Critérios de sucesso

- uma mensagem enviada
- um inbound recebido
- sem duplicidade operacional
- conversa no status esperado
- agente com framing correto
- sem escalar para humano por motivo errado
- documentos e extração funcionando quando o fluxo exigir

## Regra para número de teste

Não criar número novo a cada smoke.

Antes de um novo ciclo:

1. usar `Resetar lead de teste`
2. limpar o chat no WhatsApp do aparelho de teste
3. disparar novamente

## O que não fazer

- não mudar janela operacional só para “forçar” um teste se isso distorcer o comportamento real
- não usar o mesmo lead poluído sem reset
- não interpretar sucesso parcial como go-live encerrado

## Referências

- [[TENANT_SMOKE_TEST_CHECKLIST]]
- [[GOOGLE_OAUTH_GO_LIVE_CHECKLIST]]
- [[SESSION_BRIEF]]
