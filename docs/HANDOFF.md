# PrevLegal — HANDOFF

> Memória curta da última janela operacional.

## O que foi feito

- corrigido o filtro de campanha para aceitar lead manual/legado sem tipo explícito como `titular`
- lead manual e lead automático criado por inbound agora nascem com `contato_abordagem_tipo = titular`
- auto-responder interno passou a usar `ADMIN_FLUXROW_TOKEN`
- middleware passou a permitir apenas a chamada interna autenticada para `/api/agente/responder`
- webhook Z-API passou a espelhar mensagens `fromMe` como outbound manual na thread
- criada a memória curta nativa do projeto com `STATE.md` e `HANDOFF.md`
- corrigida a leitura de janela horária do agente para usar o fuso operacional (`America/Sao_Paulo`) em vez da hora crua do servidor
- campanha agora persiste o agente padrão resolvido quando nenhum agente explícito é escolhido
- `/api/agente/responder` agora tenta recuperar a última `campanha_mensagens` do lead quando `lead.campanha_id` vier vazio
- quando a API Anthropic estiver sem crédito, a rota do agente agora rebaixa a conversa para humano e gera notificação explícita para a equipe

## Arquivos ou áreas afetadas

- `src/app/api/campanhas/[id]/disparar/route.ts`
- `src/app/api/leads/route.ts`
- `src/app/api/webhooks/zapi/route.ts`
- `src/lib/agent-autoresponder.ts`
- `src/lib/supabase/middleware.ts`
- `docs/ROADMAP.md`
- `docs/LEARNINGS.md`

## O que foi validado

- `npm run build` passou
- campanhas problemáticas antigas tinham `0 enviados` porque o lead manual estava com `contato_abordagem_tipo = null`
- a chamada interna para `/api/agente/responder` estava sendo redirecionada para `/login`
- mensagens diretas do celular do escritório não apareciam porque o webhook Z-API ignorava `fromMe`
- a rota `/api/agente/responder` estava retornando `403 Fora do horário de atendimento` durante horário comercial por usar a hora do servidor em vez do fuso operacional
- a rota `/api/agente/responder` em produção passou a retornar `500` com erro explícito de saldo insuficiente na Anthropic API; isso explica por que a conversa não continuava mesmo com o gatilho correto

## Estado após a última entrega

- funcionando:
  - correção estrutural aplicada no código para campanha, auto-responder e espelhamento `fromMe`
  - memória curta nativa do projeto criada
- pendente:
  - reteste funcional em produção do fluxo completo após deploy do fallback de saldo insuficiente
  - recompor crédito Anthropic ou trocar temporariamente o provedor/modelo do auto-responder
- risco residual:
  - confirmar o payload `fromMe` real da Z-API no uso diário para garantir que a heurística de `counterpartyPhone` cobre todos os casos

## Próximo passo certo

- disparar uma campanha pequena de novo, responder pelo WhatsApp e validar:
  - mensagem inicial da campanha na thread
  - resposta do lead na thread
  - continuação automática do agente, ou fallback claro para humano quando a Anthropic estiver indisponível
  - mensagem enviada direto do celular da Jessica refletida no sistema

## Referência rápida

- commit: pendente após sync/commit desta janela
- deploy: pendente push
- nota de sessão: `2026-04-16-campaign-autoresponder-fromme-fix`
