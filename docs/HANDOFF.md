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
- o modelo do lead passou a ter campos estruturados para `conjuge`, `filho` e `irmao` (nome/celular/telefone)
- o importador enriquecido agora preenche esses campos explicitamente
- o disparo de campanha por `conjuge`, `filho` e `irmao` agora usa esses campos estruturados em vez de depender só de `telefone_enriquecido`
- os webhooks `Z-API` e `Twilio` passaram a reconhecer respostas vindas desses números estruturados
- quando o lead confirma que a Dra. Jessica pode assumir o atendimento, o runtime do agente agora move a conversa de `agente` para `aguardando_cliente`
- a exclusão de lista agora apaga também campanhas `rascunho` / `encerrada` vinculadas e seus `disparos`, bloqueando apenas quando ainda existir campanha `ativa` ou `pausada`
- o disparo de campanha agora foi endurecido para usar apenas contatos com cara de `CELULAR/WHATSAPP`; telefones fixos permanecem como dado de cadastro, não como fallback automático de envio
- a aba de listas agora passou a expor contagem operacional de contatos familiares com celular (`cônjuge`, `filho`, `irmão`) para dar visão real do que a planilha trouxe, sem confundir isso com verificação formal de WhatsApp
- a rota `Verificar WhatsApp` foi corrigida para checar o `telefone` operacional do lead em vez de usar `cpf` como se fosse número
- o ícone de conversa do card do Kanban agora tenta abrir a thread pelo `lead_id` antes de cair em heurística por telefone, evitando o falso "Nenhuma conversa encontrada" em leads que já têm histórico
- o modal do card do Kanban foi endurecido para consultar primeiro `/api/leads/[id]` e usar a `conversa` já vinculada ao lead; a lista geral de conversas agora fica apenas como fallback
- o payload de `/api/leads/[id]` agora também devolve o histórico de WhatsApp resolvido pelo próprio lead (`lead_id` + telefone), para o modal do Kanban não depender da visibilidade da inbox humana

## Arquivos ou áreas afetadas

- `src/app/admin/page.tsx`
- `src/app/admin/[id]/page.tsx`
- `src/app/api/admin/tenants/route.ts`
- `src/app/api/admin/tenants/[id]/route.ts`
- `supabase/migrations/050_tenant_custom_billing.sql`
- `supabase/manual/2026-04-17_add_tenant_custom_billing.sql`
- `src/app/api/campanhas/[id]/disparar/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/app/api/leads/route.ts`
- `src/app/api/listas/[id]/route.ts`
- `src/app/api/listas/route.ts`
- `src/app/api/campanhas/[id]/disparar/route.ts`
- `src/app/api/whatsapp/verificar/route.ts`
- `src/app/api/webhooks/zapi/route.ts`
- `src/components/lead-drawer.tsx`
- `src/components/editar-lead-modal.tsx`
- `src/components/modal-msg-lead.tsx`
- `src/app/(dashboard)/listas/page.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`
- `src/lib/types.ts`
- `supabase/migrations/051_lead_structured_related_contacts.sql`
- `supabase/manual/2026-04-17_add_structured_related_contacts.sql`
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
- `npm run build` passou após a migração de contatos familiares para campos estruturados do lead
- `npm run build` passou após a automação que joga a conversa para `aguardando_cliente` quando o lead confirma a passagem para a Dra. Jessica
- `npm run build` passou após a correção da exclusão de lista presa por campanhas antigas
- `npm run build` passou após endurecer a regra de dispatch para usar somente contatos móveis/WhatsApp
- `npm run build` passou após adicionar selo visual do tipo de contato no card do Kanban e promover outbound de `new` para `contacted`
- `npm run build` passou após corrigir a verificação de WhatsApp para usar `telefone` do lead, expor contagem de contatos familiares com celular na aba de listas e resolver o modal de conversa pelo `lead_id`

## Estado após a última entrega

- funcionando:
  - correção estrutural aplicada no código para campanha, auto-responder e espelhamento `fromMe`
  - memória curta nativa do projeto criada
  - fallback fora do horário validado em produção com mensagem visível ao lead e thread coerente
  - admin pronto para registrar tenant com valor mensal contratado diferente da LP, sem sobrecarregar `plano`
  - runtime do agente endurecido para continuidade mais natural em benefícios e reconciliação do `fromMe` automático
  - disparo de campanha por tipo de contato familiar agora pode usar campos estruturados do lead (`conjuge`, `filho`, `irmao`) em vez de depender de anotação ou alternativo genérico
  - cards do Kanban agora mostram explicitamente o tipo de contato de abordagem (`Titular`, `Cônjuge`, `Filho`, `Irmão`)
  - quando campanha ou envio individual sai para um lead ainda `Novo`, o lead é promovido automaticamente para `Contatados`
  - handoff confirmado para a Dra. Jessica agora troca a conversa para `aguardando_cliente`, alinhando o fluxo com o box correto da inbox
  - listas vazias ou de teste não ficam mais bloqueadas por campanhas não ativas; a exclusão limpa a campanha associada antes de remover a lista
  - a aba de listas agora mostra também quantos `cônjuges`, `filhos` e `irmãos` vieram com celular preenchido na importação
  - o botão `Verificar WhatsApp` voltou a avaliar o número operacional do lead, e não mais um campo incorreto
  - o ícone de conversa do card do Kanban agora abre a thread existente com base no `lead_id` quando houver vínculo direto
  - o modal do card do Kanban agora também consegue recuperar histórico antigo do lead por telefone quando a conversa não estava perfeitamente ligada ao `lead_id`
- pendente:
  - validar o fluxo completo de `planejamento_previdenciario` até proposta, contrato e assinatura
  - desenhar fallback multi-provider do auto-responder para não depender de um único saldo/provedor
  - transformar isolamento por tenant/perfil/flag em fundação real de produto
  - liberar a Ana hoje via allowlist controlada de containment para onboarding do novo tenant de planejamento
- risco residual:
  - confirmar o payload `fromMe` real da Z-API no uso diário para garantir que a heurística de `counterpartyPhone` cobre todos os casos
  - aplicar o patch manual de contatos estruturados no banco operacional antes do reteste da campanha `filhos`
  - retestar no runtime a exclusão da lista `Seleção personalizada` e, em seguida, reimportar a base enriquecida para validar `filho/irmão`
  - confirmar que o selo visual do Kanban segue coerente quando o lead muda manualmente de tipo de contato em edição
- validar em produção se a nova contagem da aba de listas (`cônjuge/filho/irmão com celular`) bate com a planilha importada
  - confirmar no runtime se o modal de conversa do card resolve corretamente um lead já conversado via `lead_id`
  - confirmar no runtime se as mensagens do próprio lead voltam a aparecer no modal rápido do Kanban

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
- nota de sessão: `2026-04-17-kanban-modal-lead-history-fallback`
