# PrevLegal — HANDOFF

> Memória curta da última janela operacional.

## O que foi feito

- corrigido o filtro de campanha para aceitar lead manual/legado sem tipo explícito como `titular`
- lead manual e lead automático criado por inbound agora nascem com `contato_abordagem_tipo = titular`
- auto-responder interno passou a usar `ADMIN_FLUXROW_TOKEN`
- middleware passou a permitir apenas a chamada interna autenticada para `/api/agente/responder`
- webhook Z-API passou a espelhar mensagens `fromMe` como outbound manual na thread
- criada a memória curta nativa do projeto com `STATE.md` e `HANDOFF.md`

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

## Estado após a última entrega

- funcionando:
  - correção estrutural aplicada no código para campanha, auto-responder e espelhamento `fromMe`
  - memória curta nativa do projeto criada
- pendente:
  - reteste funcional em produção do fluxo completo
- risco residual:
  - confirmar o payload `fromMe` real da Z-API no uso diário para garantir que a heurística de `counterpartyPhone` cobre todos os casos

## Próximo passo certo

- disparar uma campanha pequena de novo, responder pelo WhatsApp e validar:
  - mensagem inicial da campanha na thread
  - resposta do lead na thread
  - continuação automática do agente
  - mensagem enviada direto do celular da Jessica refletida no sistema

## Referência rápida

- commit: pendente após sync/commit desta janela
- deploy: pendente push
- nota de sessão: `2026-04-16-campaign-autoresponder-fromme-fix`
