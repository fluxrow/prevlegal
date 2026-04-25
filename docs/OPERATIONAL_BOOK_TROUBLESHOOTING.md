# PrevLegal — OPERATIONAL_BOOK_TROUBLESHOOTING.md

Contexto: [[OPERATIONAL_BOOK]]
Mestra: [[MASTER_PREV_LEGAL]]

## Objetivo

Dar respostas curtas para os problemas operacionais mais recorrentes.

## Campanha disparou com `0 enviados`

Verificar:

1. canal ativo do tenant
2. `instance_id` e `instance_token`
3. `apenas_verificados`
4. telefone alvo resolvido

## `Instance not found`

Quase sempre é credencial errada da instância:

- `instance_token` incorreto

## Lista mostra `sem WhatsApp` para todo mundo

Verificar:

1. provider ativo do tenant
2. rota de verificação correta
3. se o tenant está em `Z-API`, não depender só do lookup legado da Twilio

## Lead respondeu e o painel duplicou

Verificar:

1. se o provider entregou o mesmo inbound duas vezes
2. se a deduplicação do webhook está ativa

## Agente respondeu como se o lead já tivesse interesse

Verificar:

1. se é o primeiro retorno após campanha
2. se o playbook está usando framing de continuidade errado

## Respondeu fora do horário e caiu para humano

Estado correto atual:

- isso não deve acontecer para planejamento

Esperado:

- aviso de fora do horário
- conversa continua em `agente`
- retomada automática na próxima janela útil

## Próximo smoke ficou contaminado pelo anterior

Usar:

1. `Resetar lead de teste`
2. limpar o chat no WhatsApp do aparelho de teste

## Quando parar de depurar e abrir nova rodada

Se a conversa atual já foi poluída por:

- duplicidade
- mensagens antigas inconsistentes
- status errado acumulado

o melhor é:

- resetar lead de teste
- abrir nova campanha/rodada

## Referências

- [[OPERATIONAL_BOOK_GO_LIVE]]
- [[OPERATIONAL_BOOK_CHANNELS]]
- [[LEARNINGS]]
