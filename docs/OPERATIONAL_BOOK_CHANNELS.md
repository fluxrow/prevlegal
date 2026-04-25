# PrevLegal — OPERATIONAL_BOOK_CHANNELS.md

Contexto: [[OPERATIONAL_BOOK]]
Mestra: [[MASTER_PREV_LEGAL]]

## Objetivo

Padronizar a operação de canais WhatsApp, especialmente `Z-API`.

## Regra principal

Para operação atual, o lugar certo da configuração real é o canal do tenant em `whatsapp_numbers`.

Campos legados de Twilio em telas antigas não são a fonte principal quando o tenant opera por `Z-API`.

## Configuração correta de Z-API

No canal do tenant:

- `provider = zapi`
- `uso = ambos`
- `ativo = sim`
- `padrão = sim`
- `instance_id` correto
- `instance_token` correto
- `client_token` quando existir
- `base_url = https://api.z-api.io`
- telefone principal e conectado consistentes

## Webhook mínimo obrigatório

O essencial para começar o smoke é o webhook de recebimento.

Sem inbound chegando:

- não nasce conversa
- não sobe alerta certo
- o agente não continua

## Regras de campanha

- `apenas_verificados = true` só deve ser usado quando o lead realmente passou pela verificação
- se o canal está ativo e o tenant é `planejamento_previdenciario`, o disparo pode operar com telefone válido mesmo antes do lookup legado
- campanhas são trilha comercial
- `mensagens_inbound` é a trilha operacional da thread

## Fora do horário

- fora do horário não deve derrubar conversa de planejamento para `humano`
- o comportamento correto é:
  - enviar aviso de fora do horário
  - manter a conversa em `agente`
  - retomar automaticamente na próxima janela útil

## Problemas mais comuns

### `Instance not found`

Causa mais provável:

- `instance_token` salvo errado

### campanha não envia com toggle ligado

Causa mais provável:

- lead ainda não está com `tem_whatsapp = true`

### inbound duplicado

Causa mais provável:

- provider entregando o mesmo evento mais de uma vez

Estado atual:

- existe deduplicação adicional no webhook

## Referências

- [[OPERATIONAL_BOOK_TROUBLESHOOTING]]
- [[PRODUCTION_ISOLATION_STRATEGY]]
