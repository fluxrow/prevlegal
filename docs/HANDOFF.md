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
- o runtime do agente agora remove emojis da resposta final antes do envio, mesmo que o modelo tente usar esse tipo de caractere
- a continuidade do agente em benefícios passou a tratar a conversa como sequência de uma revisão/readequação já identificada, sem voltar para triagem genérica
- o playbook de planejamento foi reforçado para permitir que a esteira avance até proposta, contrato e preparação de assinatura antes do handoff do advogado
- o playbook de planejamento foi refinado para ficar mais consultivo e tecnicamente responsável: mais conhecimento geral de planejamento previdenciário brasileiro, menos copy genérica e limite explícito para não inventar análise individual
- foi formalizada a necessidade de isolar evolução por tenant/perfil e parar de tratar mudanças de playbook como comportamento global quando já existem escritórios pagantes
- o timeout do acionamento interno do auto-responder foi ampliado para 120s por padrão
- quando o auto-responder falhar por horário, timeout ou erro interno, os webhooks agora devolvem a conversa para humano e geram notificação explícita
- o auto-responder agora devolve payload estruturado quando falha por fora do horário, permitindo mensagem automática ao lead com a janela configurada
- o espelhamento `fromMe` da Z-API agora deduplica mensagens já registradas pela campanha para evitar outbound duplicado na thread
- admin agora separa pacote operacional (`plano`) de cobrança negociada do tenant (`cobranca_tipo` + `valor_mensal_contratado`)
- a continuidade do agente em benefícios foi endurecida para não reabrir apresentação, não repetir a abertura da campanha e não pedir interesse novamente depois de um "sim" curto do lead
- a resposta automática do agente agora grava `twilio_sid` no próprio registro da thread para o webhook `fromMe` da Z-API não espelhar o mesmo texto como mensagem humana
- a montagem do histórico do agente foi corrigida para usar as mensagens mais recentes da conversa, e não as mais antigas; além disso, o runtime agora injeta a última fala do lead e a intenção imediata como diretiva obrigatória da resposta
- o runtime de `beneficios_previdenciarios` passou a carregar conhecimento operacional explícito sobre readequação do teto, evitando que o agente fale como se fosse analisar o caso do zero
- a resposta automática do agente agora pode esperar alguns segundos antes de enviar (`AGENT_RESPONSE_DELAY_MS`, default 4500ms), para não parecer instantânea demais no WhatsApp

## Arquivos ou áreas afetadas

- `src/app/admin/page.tsx`
- `src/app/admin/[id]/page.tsx`
- `src/app/api/admin/tenants/route.ts`
- `src/app/api/admin/tenants/[id]/route.ts`
- `supabase/migrations/050_tenant_custom_billing.sql`
- `supabase/manual/2026-04-17_add_tenant_custom_billing.sql`
- `src/app/api/campanhas/[id]/disparar/route.ts`
- `src/app/api/leads/route.ts`
- `src/app/api/webhooks/zapi/route.ts`
- `src/lib/agent-autoresponder.ts`
- `src/lib/supabase/middleware.ts`
- `src/app/api/webhooks/twilio/route.ts`
- `src/app/api/webhooks/zapi/route.ts`
- `src/app/api/agente/responder/route.ts`
- `docs/STATE.md`
- `docs/HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/LEARNINGS.md`

## O que foi validado

- `npm run build` passou
- campanhas problemáticas antigas tinham `0 enviados` porque o lead manual estava com `contato_abordagem_tipo = null`
- a chamada interna para `/api/agente/responder` estava sendo redirecionada para `/login`
- mensagens diretas do celular do escritório não apareciam porque o webhook Z-API ignorava `fromMe`
- a rota `/api/agente/responder` estava retornando `403 Fora do horário de atendimento` durante horário comercial por usar a hora do servidor em vez do fuso operacional
- a rota `/api/agente/responder` em produção passou a retornar `500` com erro explícito de saldo insuficiente na Anthropic API; isso explica por que a conversa não continuava mesmo com o gatilho correto
- o comportamento recente de "lead responde e nada acontece" ainda precisa de reteste com a nova instrumentação, porque o sistema antes só registrava em log e podia parecer silencioso
- o comportamento recente de "fora do horário cai para humano sem mensagem visível" foi coberto com resposta automática ao lead + gravação na thread
- a continuidade do agente ainda estava "andando em círculo" em benefícios depois de respostas curtas como "Tenho sim", e a resposta automática do agente ainda podia ser espelhada pela Z-API como mensagem humana porque faltava reconciliar `twilio_sid`
- a continuidade estranha do agente tinha uma causa-raiz adicional: o histórico consultava as 10 mensagens mais antigas do lead, então a IA podia responder para uma saudação velha em vez da última fala atual
- o fluxo de benefícios ainda precisava parar de usar linguagem de "análise" ou "descoberta" quando a lista já veio previamente mapeada para readequação do teto
- a próxima validação relevante saiu de benefícios e passou para planejamento: precisamos confirmar em runtime se o agente conduz com consistência até proposta/contrato sem soar telemarketing nem responder com certezas indevidas
- a próxima camada estrutural deixou de ser só copy/runtime: agora precisamos criar estratégia canônica de isolamento, versionamento e rollout para não quebrar tenants ativos
- `npm run build` passou após a introdução da cobrança negociada por tenant no admin
- `npm run build` passou após a correção do histórico recente + diretiva de resposta à última fala do lead

## Estado após a última entrega

- funcionando:
  - correção estrutural aplicada no código para campanha, auto-responder e espelhamento `fromMe`
  - memória curta nativa do projeto criada
  - fallback fora do horário validado em produção com mensagem visível ao lead e thread coerente
  - admin pronto para registrar tenant com valor mensal contratado diferente da LP, sem sobrecarregar `plano`
  - runtime do agente endurecido para continuidade mais natural em benefícios e reconciliação do `fromMe` automático
- pendente:
  - validar o fluxo completo de `planejamento_previdenciario` até proposta, contrato e assinatura
  - desenhar fallback multi-provider do auto-responder para não depender de um único saldo/provedor
  - transformar isolamento por tenant/perfil/flag em fundação real de produto
  - liberar a Ana hoje via allowlist controlada de containment para onboarding do novo tenant de planejamento
- risco residual:
  - confirmar o payload `fromMe` real da Z-API no uso diário para garantir que a heurística de `counterpartyPhone` cobre todos os casos

## Próximo passo certo

- iniciar a bateria de testes do playbook de `planejamento_previdenciario`, validando:
- cadastrar o escritório da Ana já com cobrança negociada manual no admin
  - copy inicial mais consultiva
  - resposta do agente sem inventar análise individual
  - condução natural para diagnóstico
  - continuação para proposta, contrato e preparação de assinatura antes do handoff humano
  - e manter esse rollout isolado em tenant próprio, sem misturar com o tenant ativo de benefícios

## Referência rápida

- commit: pendente após sync/commit desta janela
- deploy: pendente push
- nota de sessão: `2026-04-17-agent-last-turn-prioritization-and-ana-containment-release`
