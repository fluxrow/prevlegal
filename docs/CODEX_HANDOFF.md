# PrevLegal - Handoff de Trabalho

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

Este documento registra o que foi analisado, alterado, validado e combinado durante a continuidade do desenvolvimento no Codex.

## Navegação

- [[INDEX]]
- [[SESSION_BRIEF]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_PROTOCOL]]
- [[PRODUCT_PORTFOLIO_STRATEGY]]

Objetivo:
- servir como memoria de trabalho local
- facilitar o repasse posterior para o Claude
- registrar decisoes, arquivos afetados, validacoes e proximos passos

## Atualizacao 2026-04-15 - Copy e continuidade dos agentes ficaram mais fiéis à operação real de benefícios

- contexto:
  - a fundação de `perfil_operacao + tipo + contato_alvo_tipo` já estava funcionando
  - mas a copy de benefícios ainda parecia triagem genérica demais para a lista da Jessica, onde o escritório já entra em contato com pessoas mapeadas para possível revisão/readequação
  - além disso, o runtime do agente ainda não deixava claro como continuar a conversa sem reiniciar contexto quando vários agentes estivessem ativos
- arquivos alterados:
  - `src/lib/campaign-message-templates.ts`
  - `src/lib/agent-seed-profiles.ts`
  - `src/app/api/agente/responder/route.ts`
  - `docs/MASTER.md`
  - `docs/ROADMAP.md`
  - `docs/LEARNINGS.md`
  - `docs/SESSION_BRIEF.md`
- mudanças principais:
  - templates de benefícios ficaram mais aderentes ao fluxo real:
    - informação previdenciária importante
    - nada de valores/retroativos na abertura
    - abordagem específica para titular e familiar
  - agentes seedados de benefícios passaram a refletir melhor o papel da triagem:
    - aquecer o lead
    - explicar em linguagem simples
    - preparar o handoff para a advogada responsável
  - `POST /api/agente/responder` agora injeta uma seção de `CONTINUIDADE OPERACIONAL` no prompt:
    - sempre usar o histórico da conversa como fonte de verdade
    - sempre chamar o lead pelo nome quando possível
    - saber se está em triagem ou em etapa posterior
    - saber se existem agentes seguintes ativos ou se a triagem precisa deixar tudo pronto para o handoff humano
  - planejamento previdenciário também foi alinhado para permitir que os agentes avancem até o ponto em que o especialista/advogado assume para validar a estrutura final e colher assinatura
- validação:
  - `npm run build` passou
- próximo passo operacional:
  - retestar campanha com `benefícios previdenciários` em `Somente titular` e `Somente cônjuge`
  - validar que a copy inicial ficou mais curta e crível
  - depois disparar teste pequeno e confirmar continuidade na inbox com agente/humano

## Atualizacao 2026-04-14 - Campanha passou a ler o perfil operacional real do agente

- contexto:
  - o filtro por `titular`, `conjuge`, `filho` e `irmao` ja estava correto
  - mas o template padrao da campanha ainda nao diferenciava operacao de `beneficios previdenciarios` e `planejamento previdenciario`
  - isso fazia o contato com `titular` soar generico demais quando o escritorio usava o modelo padrao de beneficios
- arquivos alterados:
  - `src/lib/operation-profile.ts`
  - `src/lib/agent-seed-profiles.ts`
  - `src/lib/campaign-message-templates.ts`
  - `src/app/api/agentes/route.ts`
  - `src/app/api/agentes/[id]/route.ts`
  - `src/app/api/agentes/seed/route.ts`
  - `src/components/agentes-config.tsx`
  - `src/app/(dashboard)/campanhas/page.tsx`
  - `src/lib/types.ts`
  - `supabase/migrations/049_agent_operation_profile.sql`
  - `supabase/manual/2026-04-14_add_agent_operation_profile.sql`
- mudancas principais:
  - `agentes` passam a suportar `perfil_operacao`
  - seed agora grava:
    - `beneficios_previdenciarios`
    - `planejamento_previdenciario`
  - o seed deixa de bloquear automaticamente agentes de mesmo `tipo` quando eles pertencem a perfis operacionais diferentes
  - a sugestao de template da campanha agora combina:
    - `perfil_operacao`
    - `tipo` do agente
    - `contato_alvo_tipo`
  - quando nenhum agente especifico e escolhido, a campanha usa o agente padrao real do escritorio como referencia de copy
- validacao:
  - `npm run build` passou
- proximo passo operacional:
  - aplicar o patch `supabase/manual/2026-04-14_add_agent_operation_profile.sql`
  - retestar campanha com:
    - `Somente titular` em beneficios
    - `Somente conjuge` em beneficios
    - um agente/pl playbook de planejamento previdenciario para comparar a copy sugerida

## Atualizacao 2026-04-14 - Tipo do contato de abordagem virou estrutura de campanha

- contexto:
  - depois da importação enriquecida, o produto já conseguia escolher melhor o número de abordagem
  - mas campanha ainda não distinguia se o disparo iria para `titular`, `cônjuge`, `filho` ou `irmão`
- arquivos alterados:
  - `src/lib/contact-target.ts`
  - `src/app/api/import/route.ts`
  - `src/app/api/campanhas/route.ts`
  - `src/app/api/campanhas/[id]/disparar/route.ts`
  - `src/lib/campaign-message-templates.ts`
  - `src/app/(dashboard)/campanhas/page.tsx`
  - `src/app/(dashboard)/leads/[id]/page.tsx`
  - `src/components/lead-drawer.tsx`
  - `src/components/editar-lead-modal.tsx`
  - `src/app/api/leads/[id]/route.ts`
  - `src/lib/types.ts`
  - `supabase/migrations/048_contact_target_types.sql`
  - `supabase/manual/2026-04-14_add_contact_target_types.sql`
- mudancas principais:
  - o importador agora persiste tipo e origem do contato principal e alternativo
  - o cadastro e a edição do lead passaram a mostrar esses campos explicitamente
  - campanha agora aceita filtro por `contato_alvo_tipo`
  - o template sugerido da campanha muda quando o público é familiar em vez de titular
- decisao de arquitetura:
  - esta mudança justificou schema porque altera a segmentação real da operação
  - `email` detectado na planilha continua fora do schema de `leads` por enquanto para não misturar go-live WhatsApp com a futura frente de mail marketing via `Resend`
- validacao:
  - `npm run build` passou
- proximo passo operacional:
  - aplicar no banco operacional o patch `supabase/manual/2026-04-14_add_contact_target_types.sql`
  - retestar criação de campanha filtrando por `titular`, `conjuge`, `filho` e `irmao`

## Atualizacao 2026-04-14 - Contador de listas em campanhas passou a refletir elegibilidade real

- contexto:
  - no smoke test da tela `Nova Campanha`, a lista `Cadastro manual` aparecia como `0 com WhatsApp` mesmo ja existindo leads manuais com WhatsApp aptos para disparo
  - isso dava a sensacao de que a campanha nao enxergava os contatos certos
- arquivo alterado:
  - `src/app/api/listas/route.ts`
- mudanca principal:
  - `/api/listas` deixou de confiar apenas em colunas-resumo da tabela `listas`
  - agora a rota recalcula por lista:
    - `total_leads`
    - `com_whatsapp`
    - `sem_whatsapp`
    - `nao_verificado`
    diretamente a partir da tabela `leads`
- validacao:
  - `npm run build` passou
- decisao de produto registrada:
  - alem de disparo por lista completa, campanhas devem evoluir para selecao personalizada de contatos
- proximo passo operacional:
  - retestar a contagem de `Cadastro manual` na criacao de campanha
  - depois abrir a evolucao de campanha personalizada por contatos selecionados

## Atualizacao 2026-04-14 - Inbox passou a tratar deep links como hidratação pontual

- contexto:
  - no reteste multiusuário da inbox, duas queixas apareceram juntas:
    - após um handoff, a aba da inbox parecia “parar de clicar”
    - notificações e atalhos de abrir/iniciar conversa levavam para a tela, mas o foco operacional não ficava estável
- arquivo alterado:
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
- mudancas principais:
  - a tela agora usa refs para marcar quando um deep link humano ou do portal já foi processado
  - hidratação por `conversaId` / `telefone` e por `leadId` deixou de rodar em loop a cada refresh
  - alternar entre inbox humana e portal limpa os parâmetros concorrentes da URL
  - `selecionarConversa` e `selecionarThreadPortal` ganharam opção para não ressincronizar a URL quando o foco veio de um deep link já conhecido
- validacao:
  - `npm run build` passou
- proximo passo operacional:
  - retestar no tenant real:
    - transferência de `Fabio` para `Dr. Fabio`
    - permanência da thread `Cauã` com o usuário original
    - clique das abas da inbox
    - abertura correta via notificação, `Abrir conversa` e `Iniciar conversa`

## Atualizacao 2026-04-13 - Campanhas e inbox ganharam alinhamento de runtime para o go-live

- contexto:
  - o smoke test apontou um bloco misto de problemas:
    - campanha ainda não refletia bem agentes/canais/listas reais do tenant
    - notificações e links da inbox levavam o usuário para a tela, mas nem sempre para a thread certa
    - handoff e abertura de conversa ainda podiam deixar a carteira/thread desalinhadas
- arquivos alterados:
  - `src/app/(dashboard)/campanhas/page.tsx`
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
  - `src/app/api/campanhas/route.ts`
  - `src/app/api/conversas/route.ts`
  - `src/app/api/conversas/[id]/route.ts`
  - `src/app/api/conversas/[id]/responder/route.ts`
  - `src/app/api/leads/[id]/iniciar-conversa/route.ts`
  - `src/app/api/leads/[id]/interno/handoff/route.ts`
  - `src/app/api/notificacoes/route.ts`
  - `src/app/api/pendencias/route.ts`
  - `src/app/api/portal/[token]/route.ts`
  - `src/app/api/webhooks/twilio/route.ts`
  - `src/app/api/webhooks/zapi/route.ts`
  - `src/components/iniciar-conversa-modal.tsx`
  - `src/components/modal-msg-lead.tsx`
  - `src/lib/contact-shortcuts.ts`
  - `src/lib/inbox-visibility.ts`
  - `src/lib/campaign-message-templates.ts`
- mudancas principais:
  - campanhas:
    - agentes reais do tenant entram no seletor
    - listas são carregadas com `include_system=1`
    - canais reais do escritório entram no seletor da campanha
    - a mensagem inicial é sugerida pelo tipo do agente, mas continua editável
    - `POST /api/campanhas` valida `whatsapp_number_id` do tenant
  - inbox:
    - notificações e webhooks agora apontam para a thread específica com `conversaId`/`telefone`
    - lead detail passou a abrir inbox com deep link mais consistente
    - iniciar conversa assume a thread e já redireciona com foco correto
    - handoff atualiza também `leads.responsavel_id`
    - `/api/notificacoes` passou a filtrar por visibilidade real de conversa/lead
    - `/api/pendencias` passou a usar IDs visíveis de conversa na contagem humana
    - portal ganhou deep link por `tab=portal&leadId=...` e a inbox seleciona a thread pela URL
- validacao:
  - `npm run build` passou
- pendencias de reteste:
  - campanha com lead manual + agente + canal Z-API ponta a ponta
  - transferencia completa de conversa entre dois usuários
  - abertura da thread correta via notificação, `abrir conversa` e `iniciar conversa`

## Atualizacao 2026-04-13 - UX operacional de agentes e inbox endurecida para go-live

- contexto:
  - o smoke test mostrou tres ruídos de produto importantes:
    - templates de agentes ainda carregavam nomes de clientes (`Jessica`, `Ana`) na UX
    - portal ainda precisava seguir o mesmo principio de carteira pessoal da inbox
    - o badge lateral da inbox permanecia ativo mesmo apos resposta no portal
- arquivos alterados:
  - `src/lib/agent-seed-profiles.ts`
  - `src/components/agentes-config.tsx`
  - `src/app/api/agente/responder/route.ts`
  - `src/app/api/portal/responder/route.ts`
  - `src/app/api/pendencias/route.ts`
  - `src/app/api/portal/threads/route.ts`
  - `src/app/api/portal/nao-lidas/route.ts`
  - `src/app/api/portal/mensagens/[leadId]/route.ts`
  - `src/components/sidebar.tsx`
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
- mudancas principais:
  - templates passaram a ser exibidos por tipo de operacao:
    - `Captação de Benefícios Previdenciários`
    - `Captação de Planejamento Previdenciário`
  - o treino especifico por abordagem foi mantido no seed de agentes
  - o fallback antigo do responder deixou de citar `Ana`
  - portal passou a obedecer a mesma logica de carteira pessoal da inbox
  - responder no portal agora marca como lidas as mensagens pendentes do cliente daquela thread
  - o badge lateral da inbox passou a consumir `inboxTotal`, sem inflar com agendamentos
- validacao:
  - `npm run build` passou
- proximo passo operacional:
  - retestar:
    - templates na tela `/agente`
    - portal em dois perfis do mesmo escritorio
    - badge da `Caixa de Entrada` apos resposta no portal

## Atualizacao 2026-04-09 - Z-API inbound endurecido para formatos de body nao-JSON

- contexto:
  - a rota `/api/webhooks/zapi` ja existia, o webhook estava salvo e o outbound via Z-API ja funcionava
  - mesmo assim o inbound ainda nao aparecia na caixa em alguns testes reais
- leitura tecnica:
  - o payload da Z-API na variante `web / multi-device` pode nao chegar como `application/json`
  - assumir `await request.json()` fazia o body virar vazio e o parser seguinte nao tinha material suficiente para extrair telefone e mensagem
- arquivo alterado:
  - `src/app/api/webhooks/zapi/route.ts`
- mudancas principais:
  - foi criada uma camada `parseWebhookPayload(request)` com:
    - leitura via `request.text()`
    - suporte a `application/x-www-form-urlencoded`
    - parse de JSON puro quando existir
    - parse recursivo de strings JSON serializadas
    - fallback para query params
    - fallback final para `raw body`
  - tanto `handleReceiveEvent` quanto o `POST` generico da rota passaram a usar essa camada comum
- validacao:
  - `npm run build` passou
- proximo passo operacional:
  - retestar inbound real com o webhook ja salvo
  - se ainda falhar, a trilha restante fica bem menor:
    - ou o provider nao esta entregando o webhook
    - ou a entrega esta chegando com shape ainda nao coberto e agora isso fica mais facil de inspecionar

## Atualizacao 2026-04-10 - Comparacao com Orbit apontou necessidade de Edge Function publica para Z-API

- contexto:
  - o repo correto comparado foi `fluxrow/orbiitcrm`
  - la a Z-API inbound nao batia em app route do frontend
  - ela batia em `supabase/functions/v1/orbit-webhook`
- leitura tecnica:
  - o PrevLegal ja tinha parser endurecido, mas ainda faltava espelhar a topologia que ja funcionava no Orbit
- acao aplicada:
  - criada a funcao `supabase/functions/zapi-webhook/index.ts`
  - funcao atua como relay publico para `https://app.prevlegal.com.br/api/webhooks/zapi`
  - deploy realizado com:
    - `supabase functions deploy zapi-webhook --project-ref lrqvvxmgimjlghpwavdb --no-verify-jwt`
- validacao:
  - endpoint de health respondeu:
    - `https://lrqvvxmgimjlghpwavdb.supabase.co/functions/v1/zapi-webhook?event=health`
  - `npm run build` passou
- proximo passo operacional:
  - trocar o webhook `Ao receber` da Z-API para a Edge Function nova
  - retestar inbound

## Atualizacao 2026-04-09 - Z-API inbound web agora aceita GET para `on-receive`

- contexto:
  - mesmo depois do parser de body mais tolerante, o inbound ainda podia continuar invisivel na variante `web`
- leitura tecnica:
  - em alguns cenarios de painel/proxy, o provider pode chamar o webhook de recebimento por `GET`
  - o PrevLegal tratava `GET` apenas como healthcheck
- arquivo alterado:
  - `src/app/api/webhooks/zapi/route.ts`
- mudanca principal:
  - `GET` com `event=on-receive` passou a encaminhar para `handleReceiveEvent`
- validacao:
  - `npm run build` passou
- proximo passo operacional:
  - retestar inbound apos o deploy

## Atualizacao 2026-04-09 - Google OAuth preparado para go-live comercial

- contexto:
  - a agenda Google ja estava funcionando em runtime apos `043`, `044` e `045`
  - o gargalo restante saiu do codigo core e ficou concentrado na confianca comercial do consentimento do Google
- arquivos alterados:
  - `src/app/api/google/auth/route.ts`
  - `public/privacidade/index.html`
  - `public/termos/index.html`
  - `site/privacidade/index.html`
  - `site/termos/index.html`
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/GOOGLE_OAUTH_SUBMISSION_COPY.md`
- mudancas principais:
  - escopos do OAuth reduzidos para o minimo operacional:
    - `https://www.googleapis.com/auth/calendar.events`
    - `https://www.googleapis.com/auth/userinfo.email`
  - remocao de `calendar.readonly`, que nao era necessario para o fluxo atual
  - paginas publicas de privacidade e termos passaram a descrever explicitamente:
    - uso do Google Calendar
    - criacao / remarcacao / cancelamento de compromissos
    - uso do e-mail Google apenas para identificar a conta conectada
  - foi criado um documento de submissao pronto para o Google Auth Platform com:
    - descricao curta
    - justificativa dos escopos
    - checklist de submissao
    - roteiro de video, se o Google pedir
- validacao:
  - `npm run build` passou
- o que ainda depende de execucao manual fora do repo:
  - configurar consent screen no Google
  - confirmar dominios autorizados
  - revisar redirect URIs
  - adicionar test users, se necessario
  - enviar a verificacao do app
- leitura pratica:
  - a frente de Google OAuth nao esta mais bloqueada por codigo
  - o proximo passo correto e usar `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md` + `docs/GOOGLE_OAUTH_SUBMISSION_COPY.md` para fechar o console do Google

## Atualizacao 2026-04-08 - Loop de login corrigido com separacao entre auth e acesso operacional

- problema reportado:
  - ao autenticar, o usuário parecia entrar e em seguida voltava para `/login`
- leitura técnica:
  - o produto estava tratando ausência de `TenantContext` como falha de login
  - isso mascara dois estados diferentes:
    - usuário sem sessão
    - usuário com sessão, mas sem `usuarios` ativo / sem `tenant_id` / sem liberação operacional
- arquivos alterados:
  - `src/app/(dashboard)/layout.tsx`
  - `src/app/(auth)/login/page.tsx`
  - `src/lib/supabase/middleware.ts`
  - `src/app/acesso-pendente/page.tsx`
- mudanças principais:
  - o layout do dashboard agora:
    - manda para `/login` quando não há sessão
    - manda para `/acesso-pendente` quando há sessão, mas não há contexto operacional válido
  - o login passou a usar `POST /api/session/login`
  - a autenticação do app agora nasce no servidor antes da navegação para `/dashboard`
  - isso reduz a corrida entre `signInWithPassword` no browser e o primeiro render SSR protegido
  - o `proxy` passou a liberar `/acesso-pendente`
- efeito prático:
  - reduz diagnóstico falso de “login quebrado”
  - acelera troubleshooting porque o estado visível já indica “falta provisionamento / acesso do escritório”
- próximo passo operacional:
  - testar com o usuário afetado
  - se ele cair em `/acesso-pendente`, auditar:
    - `usuarios.auth_id`
    - `usuarios.ativo`
    - `usuarios.tenant_id`
    - bloqueio por contenção de e-mail

## Atualizacao 2026-04-08 - Templates de automação agora podem ser editados

- a interface de `Automações` foi endurecida para uso real do escritório, não só para seed inicial
- arquivos alterados:
  - `src/components/automacoes/trigger-config.tsx`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
- mudanças principais:
  - cada gatilho passou a mostrar:
    - status em linguagem mais amigável
    - ação resumida de forma operacional
    - um texto curto explicando por que aquele estágio é útil
  - foi adicionado botão `Editar` também nos templates padrão do PrevLegal
  - o modal de gatilho passou a ser híbrido:
    - cria
    - edita
  - o `PATCH /api/automacoes/triggers/[id]` agora aceita ajustar:
    - `trigger_evento`
    - `trigger_condicao`
    - `acao_tipo`
    - `acao_ref_id`
    - além das flags já existentes
- efeito prático:
  - templates deixam de ser configuração opaca
  - a operação consegue adaptar os playbooks sem apagar o gatilho pronto e recriar do zero

## Atualizacao 2026-04-08 - Beta de documentos IA corrigido no backend

- foi corrigido o erro reportado ao gerar `Petição Inicial`, `Procuração` e `Requerimento INSS`
- arquivo alterado:
  - `src/app/api/leads/[id]/gerar-documento/route.ts`
- causa identificada:
  - a geração IA tentava inserir em `lead_documentos` sem `arquivo_url`, mas a tabela exige arquivo persistido
- correção aplicada:
  - o backend agora:
    - gera o texto com Claude
    - sobe um `.txt` no bucket `lead-documentos`
    - gera `signedUrl`
    - salva o documento com metadados completos
    - remove o arquivo do bucket se o insert falhar
- campos agora persistidos:
  - `tenant_id`
  - `arquivo_url`
  - `arquivo_nome`
  - `arquivo_tamanho`
  - `arquivo_tipo`
  - `created_by`
- efeito prático:
  - o beta passa a obedecer o mesmo contrato dos documentos normais do lead
  - o front continua podendo baixar/copiar o conteúdo, mas o lead também fica com registro salvo de verdade
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - testar em runtime a criação dos 3 documentos beta
  - validar um gatilho real por mudança de status do lead para confirmar a Fase E ponta a ponta

## Atualizacao 2026-04-08 - Validação real dos gatilhos mostrou sucesso no banco e lacuna na UX

- o usuário testou a Fase E com o lead `VALTERLINO AQUINO S RIBEIRO`
- resultado validado por consulta direta ao banco operacional:
  - lead terminou com `status = lost`
  - existiam duas runs para esse lead:
    - uma `cancelado` com motivo `Cancelado por novo gatilho (lost)`
    - uma nova `ativo`
- conclusao:
  - os gatilhos por status estavam criando/cancelando runs corretamente
  - o problema percebido pelo usuário era principalmente de visibilidade na tela do lead
- arquivos alterados:
  - `src/components/followup-lead.tsx`
  - `src/app/api/followup/worker/route.ts`
- correções:
  - `FollowupLead` agora:
    - atualiza sozinho a cada 10 segundos
    - refaz fetch ao voltar foco para a aba
    - ganhou botão manual `Atualizar`
  - o worker deixou de aplicar `stop_automatico` em leads com `status = lost`
  - isso era incompatível com o template novo de reativação por `lost`
- observacao importante:
  - o follow-up ainda nao registrou `followup_events` para esse teste porque o step 1 da régua está com `delay_horas = 72`
  - ou seja: o run nasceu agora, mas o primeiro disparo do worker só fica vencido cerca de 3 dias depois

## Atualizacao 2026-04-08 - Execução manual segura para validar e destravar runs

- foi adicionada uma execução manual da run ativa direto no detalhe do lead
- arquivos alterados:
  - `src/app/api/leads/[id]/followup/[runId]/route.ts`
  - `src/components/followup-lead.tsx`
- mudancas principais:
  - `PATCH /api/leads/[id]/followup/[runId]` agora aceita `action = executar_agora`
  - a ação:
    - carrega lead, tenant, rule e step atual
    - monta a mensagem com as variáveis
    - envia pelo canal configurado
    - cria `followup_events`
    - avança ou conclui a run
  - o detalhe do lead ganhou botão `Executar agora` nas runs ativas
- efeito pratico:
  - nao precisamos esperar o cron nem um delay grande para validar se a régua dispara
  - a operação ganha uma alavanca de teste/controlada para suporte
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - usar `Executar agora` no lead de teste
  - verificar o evento da run e, se houver canal WhatsApp conectado, observar o disparo real

## Atualizacao 2026-04-08 - Motivo da falha passou a aparecer no histórico do lead

- após a validação com `Executar agora`, o motivo exato da falha foi confirmado no banco:
  - `Lead sem telefone para disparo via WhatsApp`
- refinamento aplicado:
  - `GET /api/leads/[id]/followup` agora retorna `metadata` dos eventos
  - `src/components/followup-lead.tsx` passou a renderizar esse detalhe abaixo de `Envio falhou`
- efeito prático:
  - a operação vê na própria tela se faltou telefone, canal, conexão ou outro requisito
  - reduz necessidade de olhar banco/log para falhas comuns

## Atualizacao 2026-04-08 - Foundation do importador inteligente iniciada

- a próxima frente foi aberta sem quebrar o import legado já existente
- arquivos alterados:
  - `src/lib/import-schema.ts`
  - `src/app/api/import/route.ts`
  - `src/app/(dashboard)/leads/import/page.tsx`
- mudanças principais:
  - foi criada uma camada de detecção de cabeçalhos com aliases para campos canônicos
  - o import agora suporta:
    - ordem variável das colunas
    - planilhas com cabeçalhos reconhecíveis
    - fallback para o layout legado fixo
  - o import também passou a aproveitar, quando presentes:
    - `telefone`
    - `email`
    - `categoria_profissional`
  - a UI passou a mostrar ao operador:
    - se a leitura foi por `header_mapping` ou `legacy_fixed`
    - quais campos foram reconhecidos
- documento novo:
  - `docs/IMPORTADOR_INTELIGENTE_PLAN.md`
- decisao importante:
  - esta fase resolve variedade de layout dentro do modelo previdenciário atual
  - fontes sem `NB` nao foram “forçadas” no import existente
  - Google Maps / Places e listas comerciais externas entram na próxima fase, com staging, templates e confirmação de mapeamento

## Atualizacao 2026-04-08 - Google Calendar saiu do singleton do escritório

- a necessidade veio do uso real: escritório com mais de uma pessoa agendando, inclusive secretária marcando consulta para advogado/sócio
- problema confirmado:
  - a integração Google estava inteira no nível do tenant (`configuracoes.google_calendar_token`)
  - o agendamento já tinha `usuario_id` como responsável, mas o evento ainda nascia sempre a partir da conexão padrão do escritório
- correção estrutural aplicada:
  - migration nova: `supabase/migrations/043_user_calendar_ownership.sql`
  - `usuarios` agora pode armazenar:
    - `google_calendar_token`
    - `google_calendar_email`
    - `google_calendar_connected_at`
  - `configuracoes` agora também guarda:
    - `google_calendar_email`
    - `google_calendar_connected_at`
  - `agendamentos` passa a registrar:
    - `calendar_owner_scope`
    - `calendar_owner_usuario_id`
    - `calendar_owner_email`
- runtime novo em `src/lib/google-calendar.ts`:
  - criação do evento tenta:
    1. Google do responsável
    2. fallback do escritório
  - remarcação/cancelamento usam o `calendar_owner_scope` salvo no agendamento, para voltar na mesma origem do evento
- OAuth atualizado:
  - `src/app/api/google/auth/route.ts`
  - `src/app/api/google/callback/route.ts`
  - agora aceitam dois targets:
    - `user`
    - `tenant`
  - o callback redireciona de volta para `/agendamentos` ou `/perfil` com feedback contextual
- status/UX:
  - `src/app/api/google/status/route.ts` agora devolve:
    - `currentUser`
    - `tenantDefault`
    - `effective`
  - `/agendamentos` passou a explicar quando usa o calendário do responsável e quando cai no do escritório
  - `/perfil` virou a área natural para o usuário conectar o próprio Google
  - `GestaoUsuarios` agora mostra quem já tem agenda própria conectada
  - `NovoAgendamentoModal` deixa claro se o responsável selecionado tem agenda própria ou vai depender do fallback
- decisao importante:
  - isso resolve a fundação correta de agenda por usuário sem remover o fallback do escritório
  - reatribuir um agendamento já criado continua sendo principalmente uma troca operacional de responsável; o `calendar_owner` do evento já existente permanece o da origem original, o que evita mexer no Meet/evento silenciosamente
- validacao:
  - `npm run build` passou
- próximo passo sugerido:
  - aplicar `043_user_calendar_ownership.sql`
  - testar:
    - usuário conectando o próprio Google em `/perfil`
    - admin conectando o calendário padrão do escritório
    - agendamento criado para responsável com agenda própria
    - agendamento criado para responsável sem agenda própria, usando fallback

## Atualizacao 2026-04-08 - Inbox estabilizada e permissões granulares ganharam foundation

- dor reportada:
  - na `Caixa de Entrada`, o usuário percebia que só `Todas` e `Portal` respondiam de forma confiável
  - em `Usuários`, a gestão de acesso ainda estava presa demais a `admin`, `operador` e `visualizador`
- correção da inbox:
  - `src/app/api/conversas/route.ts`
    - normaliza qualquer conversa com status inválido/nulo para `agente`
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
    - a troca de aba agora passa pela URL
    - a aba ativa é restaurada corretamente por querystring
    - a conversa selecionada é limpa se deixar de pertencer ao filtro atual
- leitura importante:
  - o bug não era só “visual”; conversas legadas sem status válido faziam as abas parecerem vazias ou incoerentes

- foundation de permissões:
  - migration nova:
    - `supabase/migrations/044_user_permissions_foundation.sql`
  - arquivo central novo:
    - `src/lib/permissions.ts`
  - `usuarios.permissions` passa a aceitar mapa granular
  - a role continua existindo como preset base
  - o sistema resolve permissão final por:
    1. preset da role
    2. overrides do usuário

- permissões modeladas nesta fase:
  - `usuarios_manage`
  - `agentes_manage`
  - `automacoes_manage`
  - `financeiro_manage`
  - `listas_manage`
  - `agendamentos_assign`
  - `inbox_humana_manage`
  - `configuracoes_manage`

- UI:
  - `src/components/gestao-usuarios.tsx`
    - agora mostra contagem de permissões por usuário
    - ganhou modal para editar permissões ponto a ponto
    - permite restaurar o preset original da role

- enforcement já aplicado:
  - `src/app/api/usuarios/route.ts`
  - `src/app/api/usuarios/[id]/route.ts`
  - `src/app/api/usuarios/convidar/route.ts`
  - `src/app/api/agentes/route.ts`
  - `src/app/api/agentes/[id]/route.ts`
  - `src/app/api/agentes/seed/route.ts`
  - `src/app/api/automacoes/triggers/*`
  - `src/app/api/followup/rules/*`
  - `src/app/api/agendamentos/[id]/route.ts`
  - `src/app/api/listas/[id]/route.ts`
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/resumo/route.ts`
  - `src/app/api/conversas/[id]/route.ts`
  - `src/app/api/conversas/[id]/responder/route.ts`

- decisão importante:
  - isso nao é “ACL total” do produto ainda
  - é a primeira camada séria de permissões customizadas nos módulos críticos
  - vários pontos antigos ainda usam `isAdmin`; esses ficam como passivo mapeado para rodadas futuras

- validacao:
  - `npm run build` passou

- próximo passo sugerido:
  - aplicar `044_user_permissions_foundation.sql`
  - validar a inbox com conversas reais
  - criar um usuário não-admin com permissões específicas para testar:
    - automações
    - agentes
    - agenda
    - financeiro

## Atualizacao 2026-04-06 - Fase E (Gatilhos e Orquestracao Avançada) - Foundation Entregue

- Construida a fundação completa do motor de gatilhos automáticos do PrevLegal
- Arquivos adicionados/modificados:
  - `supabase/migrations/042_event_triggers.sql`
  - `src/app/api/automacoes/triggers/route.ts` (GET / POST)
  - `src/app/api/automacoes/triggers/[id]/route.ts` (PATCH / DELETE)
  - `src/lib/events/orchestrator.ts`
  - `src/app/api/leads/[id]/route.ts`
  - `src/components/automacoes/trigger-config.tsx`
  - `src/app/(dashboard)/automacoes/page.tsx`
- Mudanças principais no backend:
  - O PATCH de status do Lead agora intercepta se `velho_status !== novo_status`
  - Gatilhos escutam essa alteracao. Se houver mapeamento (`trigger_condicao === novo_status`), o orquestrador assincrono (`lib/events/orchestrator.ts`) aciona as réguas.
  - O Orquestrador tem poderes para cancelar automaticamente followups concorrentes pre-existentes do usuário se a configuração pedir (autonomia no nível da rule).
- Efeito prático: 
  - A interface "Automações" nao esta mais apenas com recado de "em breve".
  - Já consome do banco a visualizacao ON/OFF.
- Ponto exato de retomada (para o AI sucessor):
  - Iniciar focando puramente no Frontend
  - Criar o *Modal de Formulário* dentro de `trigger-config.tsx` contendo o mapeamento de: Evento de disparo -> Status -> Acao -> Checkboxes de cancelamento e mensagem de transição.
  - Implementar o disparo dummy de "Template Seed PrevLegal" nesse mesmo componente (injecao automatica do padrao de mercado).

## Atualizacao 2026-04-01 - Regra de portfólio do PrevLegal formalizada

- o crescimento do produto ganhou uma regra canonica para evitar que novas oportunidades descaracterizem o core
- documento criado:
  - `docs/PRODUCT_PORTFOLIO_STRATEGY.md`
- decisao registrada:
  - `PrevLegal Core` continua sendo o centro da plataforma:
    - captacao
    - qualificacao
    - inbox humana
    - agenda
    - portal/mobile do cliente
    - financeiro
  - `PrevGlobal` e outras frentes tecnicas/previdenciarias avancadas entram como modulos premium
  - novas iniciativas nao devem reescrever a identidade principal; devem se conectar a ela
- efeito pratico:
  - o roadmap de execucao continua focado no mobile/core
  - a expansao previdenciaria segue em trilha propria de arquitetura e discovery
- proximo passo direto recomendado:
  - continuar a execucao do mobile sem desvio
  - amadurecer `PrevGlobal` em spec separado, sem competir com o core

## Atualizacao 2026-04-01 - Portal mobile ganhou upload de documento pelo cliente

- a frente mobile/core evoluiu sem interferir no backoffice principal
- arquivos alterados:
  - `src/app/api/portal/[token]/documentos/upload/route.ts`
  - `src/app/portal/[token]/page.tsx`
- mudancas principais:
  - o portal agora permite envio de documento pelo proprio cliente/familiar
  - o envio pode ser associado a uma pendencia existente
  - o backend:
    - valida o lead pelo `portal_token`
    - envia o arquivo para `lead-documentos`
    - grava em `lead_documentos` com `tenant_id`
    - marca `portal_document_requests.status = enviado` quando aplicavel
    - cria evento em `portal_timeline_events`
    - gera notificacao interna para a equipe
  - a aba `Documentos` do portal agora junta:
    - upload
    - pendencias abertas
    - documentos ja disponiveis
- efeito de produto:
  - o cliente deixa de apenas acompanhar o caso
  - ele passa a agir por dentro do proprio “app”
- proximo passo recomendado:
  - validar o upload real no celular
  - depois desenhar pedido de remarcacao pelo portal

## Atualizacao 2026-04-02 - Pedido de remarcacao no portal

- a frente mobile/core ganhou mais uma acao real do cliente/familiar
- arquivos adicionados:
  - `src/app/api/portal/[token]/remarcacao/route.ts`
- arquivo alterado:
  - `src/app/portal/[token]/page.tsx`
- mudancas principais:
  - o card da proxima consulta agora expõe CTA `Pedir remarcação`
  - o cliente pode informar:
    - motivo
    - sugestao opcional de nova janela
  - o backend:
    - valida a existencia de agendamento futuro
    - cria evento `pedido_remarcacao_cliente` em `portal_timeline_events`
    - gera notificacao interna para a equipe
    - nao altera automaticamente o agendamento
- efeito de produto:
  - o portal continua aumentando autonomia do cliente
  - a equipe continua no controle da agenda operacional
- proximo passo recomendado:
  - validar esse fluxo no celular
  - depois avaliar push/notificacoes do portal

## Atualizacao 2026-04-01 - Backlog tecnico do app mobile do cliente

- a frente mobile deixou de ser apenas direcao conceitual e ganhou backlog tecnico canonico em `docs/MOBILE_CLIENT_APP_BACKLOG.md`
- a definicao foi baseada no estado real do portal ja existente:
  - `src/app/portal/[token]/page.tsx`
  - `src/app/api/portal/[token]/route.ts`
  - `src/app/api/portal/link/[leadId]/route.ts`
  - `src/app/api/portal/threads/route.ts`
  - `src/app/api/portal/mensagens/[leadId]/route.ts`
- constatacoes reais que orientaram o backlog:
  - o portal atual ainda depende so de `portal_token`
  - o portal atual ainda tem branding hardcoded de `Alexandrini Advogados`
  - o payload do portal ainda e estreito para sustentar uma home mobile-first
- direcao oficial reforcada:
  - portal mobile-first
  - PWA
  - identidade persistente do cliente/familiar
  - nativo so se justificar
- backlog tecnico definido:
  - entidades sugeridas:
    - `portal_users`
    - `portal_access_links`
    - `portal_timeline_events`
    - `portal_document_requests`
  - telas do MVP:
    - `Home`
    - `Mensagens`
    - `Agenda`
    - `Documentos`
    - `Perfil`
    - `Acesso`
  - ordem de implementacao:
    - fase 1: endurecer o portal atual
    - fase 2: PWA instalavel
    - fase 3: identidade persistente
    - fase 4: canal mobile operacional
    - fase 5: nativo se justificar
- proximo passo direto recomendado:
  - iniciar a fase 1 removendo o branding hardcoded do portal e ampliando `GET /api/portal/[token]`

## Atualizacao 2026-04-01 - Fase 1 do portal mobile-first iniciada

- o portal atual deixou de ficar preso ao branding fixo do piloto
- arquivos alterados:
  - `src/app/portal/[token]/page.tsx`
  - `src/app/api/portal/[token]/route.ts`
- mudancas principais no backend:
  - `GET /api/portal/[token]` agora retorna:
    - `branding`
    - `proximo_agendamento`
    - `resumo.documentos_compartilhados`
    - `resumo.mensagens_nao_lidas`
  - o branding e resolvido a partir de:
    - `configuracoes.nome_escritorio`
    - `configuracoes.logo_url`
    - `configuracoes.cor_primaria`
    - `tenants.responsavel_email`
    - `tenants.responsavel_telefone`
  - `POST /api/portal/[token]` passou a gravar `tenant_id` em `portal_mensagens` e `notificacoes`
- mudancas principais no frontend:
  - header, mensagens e footer do portal agora usam o branding dinamico do tenant
  - a primeira aba virou uma home mais util para mobile:
    - status
    - cards-resumo
    - proxima consulta
    - linha do tempo
  - o link do Meet agora aparece na home quando houver agendamento futuro com `meet_link`
- efeito de produto:
  - o portal passa a parecer superficie do escritorio certo
  - a base do futuro PWA ja fica mais proxima de um app de acompanhamento do cliente
- proximo passo recomendado:
  - incluir pendencias de documento e timeline operacional mais rica no payload do portal

## Atualizacao 2026-04-01 - Fase 1 do portal mobile-first enriquecida

- a frente mobile continuou em cima do portal atual, sem abrir uma segunda superficie
- arquivos alterados:
  - `src/app/api/portal/[token]/route.ts`
  - `src/app/portal/[token]/page.tsx`
  - `supabase/migrations/035_portal_mobile_foundation.sql`
- mudancas principais no backend:
  - `GET /api/portal/[token]` agora tambem retorna:
    - `pendencias_documento`
    - `timeline`
    - `resumo.documentos_pendentes`
  - o portal passou a tentar ler:
    - `portal_document_requests`
    - `portal_timeline_events`
  - se essas tabelas ainda nao existirem no operacional, a API nao quebra:
    - pendencias ficam vazias
    - timeline cai para fallback derivado de caso + mensagens + documentos + agendamentos
- mudancas principais no frontend:
  - resumo da home do portal agora usa quatro cards
  - a home ganhou:
    - `Documentos pendentes`
    - `Linha do tempo do caso`
  - as `Etapas do atendimento` continuam existindo como camada macro
- efeito de produto:
  - o portal fica mais vivo e menos “vazio”
  - o cliente/familiar passa a enxergar:
    - o que falta
    - o que ja aconteceu
    - o que vem a seguir
- proximo passo recomendado:
  - criar a superficie interna minima para o escritorio abastecer:
    - `portal_document_requests`
    - `portal_timeline_events`
  - depois seguir para PWA (`manifest` / installability)

## Atualizacao 2026-04-01 - Superficie interna do portal mobile pronta

- a fase 1 do mobile ganhou a primeira superficie interna real para o escritorio abastecer o portal do cliente
- arquivos adicionados:
  - `src/app/api/leads/[id]/portal-document-requests/route.ts`
  - `src/app/api/leads/[id]/portal-document-requests/[requestId]/route.ts`
  - `src/app/api/leads/[id]/portal-timeline-events/route.ts`
  - `src/app/api/leads/[id]/portal-timeline-events/[eventId]/route.ts`
- arquivo principal alterado:
  - `src/components/portal-lead.tsx`
- mudancas principais no backend:
  - novas rotas tenant-aware para listar, criar, editar e excluir:
    - pendencias de documento do cliente
    - eventos de timeline visiveis para o cliente
  - todas validam:
    - auth
    - acesso ao lead
    - `tenant_id` do contexto atual
  - quando as tabelas `portal_document_requests` ou `portal_timeline_events` ainda nao existirem no banco, as rotas:
    - nao quebram a leitura
    - retornam `foundationPending: true`
    - devolvem erro `409` claro nas operacoes de escrita
- mudancas principais no frontend:
  - a secao `Portal do Cliente` no detalhe do lead agora permite:
    - criar pendencia de documento
    - mudar status da pendencia
    - excluir pendencia
    - criar evento manual na timeline
    - definir se o evento fica visivel para o cliente
    - excluir evento
  - o painel mostra aviso funcional quando a foundation `035_portal_mobile_foundation.sql` ainda nao foi aplicada
- efeito de produto:
  - o portal deixa de depender so de fallback derivado
  - o escritorio passa a conseguir alimentar manualmente o que o cliente vera no “app”
  - isso aproxima o portal do papel de PWA operacional real
- proximo passo recomendado:
  - aplicar `supabase/migrations/035_portal_mobile_foundation.sql` no operacional
  - depois seguir para `manifest`, installability e experiencia PWA

## Atualizacao 2026-04-01 - PWA do portal habilitada

- a migration `035_portal_mobile_foundation.sql` foi aplicada diretamente no operacional `lrqvvxmgimjlghpwavdb`
- confirmacao pos-aplicacao:
  - `portal_document_requests` existe no banco
  - `portal_timeline_events` existe no banco
- a frente mobile ganhou installability real no proprio portal
- arquivos adicionados:
  - `src/app/api/portal/manifest/[token]/route.ts`
  - `src/app/portal/[token]/layout.tsx`
  - `src/components/portal-install-prompt.tsx`
  - `public/sw.js`
- arquivo alterado:
  - `src/app/portal/[token]/page.tsx`
- mudancas principais:
  - cada portal agora tem manifesto proprio com:
    - nome derivado do escritorio
    - `start_url` apontando para `/portal/[token]`
    - `scope` do proprio portal
  - o portal registra `service worker` leve para habilitar installability
  - a UI exibe:
    - CTA `Instalar app` quando houver `beforeinstallprompt`
    - fallback de instrucao para iPhone / iOS
- efeito de produto:
  - o cliente consegue instalar a experiencia do proprio caso como app
  - a instalacao nao joga o usuario no dashboard interno
  - o portal passa a se comportar mais claramente como o embrião do app mobile
- proximo passo recomendado:
  - validar a instalacao real no celular
  - depois desenhar a primeira camada de identidade persistente do cliente/familiar

## Atualizacao 2026-04-01 - Foundation de identidade do portal aplicada

- a frente mobile continuou sem abrir um auth pesado cedo demais
- arquivos adicionados:
  - `supabase/migrations/036_portal_identity_foundation.sql`
  - `src/app/api/leads/[id]/portal-users/route.ts`
  - `src/app/api/leads/[id]/portal-users/[userId]/route.ts`
  - `src/app/api/leads/[id]/portal-access-links/route.ts`
  - `src/app/portal/acesso/[token]/page.tsx`
- arquivo principal alterado:
  - `src/components/portal-lead.tsx`
- mudancas principais:
  - novas tabelas:
    - `portal_users`
    - `portal_access_links`
  - o detalhe do lead agora permite:
    - cadastrar cliente / familiar / cuidador para o portal
    - pausar acesso
    - excluir acesso
    - gerar link persistente individual
  - a rota publica `/portal/acesso/[token]`:
    - valida o token hash
    - registra uso em `portal_access_links`
    - atualiza `ultimo_acesso_em` do `portal_user`
    - redireciona para o portal atual baseado em `portal_token`
- aplicacao operacional:
  - a migration `036_portal_identity_foundation.sql` ja foi aplicada diretamente no banco `lrqvvxmgimjlghpwavdb`
  - confirmacao:
    - `portal_users` existe
    - `portal_access_links` existe
- efeito de produto:
  - o portal deixa de depender apenas de um link unico e indistinto
  - o escritorio ja consegue modelar cliente, familiar e cuidador sem abrir um sistema paralelo
- proximo passo recomendado:
  - evoluir o link persistente para sessao/autenticacao real do portal
  - depois abrir a primeira camada de perfil do cliente/familiar

## Atualizacao 2026-04-01 - Sessao real do portal habilitada

- a base mobile continuou sem interferir no backoffice
- arquivos adicionados:
  - `supabase/migrations/037_portal_session_foundation.sql`
  - `src/lib/portal-auth.ts`
  - `src/app/api/portal/session/route.ts`
  - `src/app/portal/acesso/[token]/route.ts`
- arquivo removido:
  - `src/app/portal/acesso/[token]/page.tsx`
- arquivos principais alterados:
  - `src/app/api/portal/[token]/route.ts`
  - `src/app/portal/[token]/page.tsx`
- mudancas principais:
  - o link persistente agora cria sessao real de portal via cookie httpOnly
  - `GET /api/portal/[token]` passou a resolver o `viewer` da sessao
  - `PATCH /api/portal/[token]` permite editar nome, e-mail e telefone do acesso persistente atual
  - o portal ganhou aba `Perfil`
  - existe logout proprio do portal em `DELETE /api/portal/session`
- aplicacao operacional:
  - a migration `037_portal_session_foundation.sql` ja foi aplicada diretamente no banco `lrqvvxmgimjlghpwavdb`
  - confirmacao:
    - `portal_sessions` existe
- efeito de produto:
  - o app do cliente deixa de ser apenas PWA por token
  - passa a reconhecer quem esta usando o acesso persistente
  - isso prepara o terreno para recursos personalizados por cliente/familiar sem misturar auth com o app interno
- proximo passo recomendado:
  - validar o ciclo completo:
    - gerar link persistente
    - entrar no portal
    - editar perfil
    - sair
  - depois decidir a primeira personalizacao por `viewer`

## Atualizacao 2026-04-01 - Frente estrategica previdenciaria registrada

- foi criada a nota canonica:
  - `docs/PREVIDENCIARIO_EXPANSION_STRATEGY.md`
- objetivo da nota:
  - registrar a analise de concorrencia entre `Prévius` e `Tramitação Inteligente`
  - documentar a tese de expansao previdenciaria do PrevLegal
  - preservar a ideia de modulo premium de totalizacao internacional
- conclusao central:
  - o PrevLegal nao deve competir como “mais um software de calculo”
  - o caminho mais forte e unir:
    - CRM
    - IA
    - operacao comercial
    - atendimento
    - agenda
    - contrato
    - calculo integrado ao lead
- recomendacao de produto:
  - manter no core:
    - analise de CNIS com IA
    - score de viabilidade
    - calculo preliminar integrado ao lead
  - tratar como premium:
    - pecas com IA
    - acompanhamento processual inteligente
    - totalizacao internacional (`PrevGlobal`)
- observacao importante de continuidade:
  - a execucao do mobile foi pausada por combinacao do fundador
  - gatilho de retomada:
    - `vamos continuar o mobile`
  - ponto exato de retomada:
    - seguir na fase 1 do portal mobile-first
    - incluir pendencias de documento no payload do portal
    - enriquecer a timeline operacional do portal
    - depois seguir para manifest/installability de PWA

## Estado Atual Confirmado

Data da ultima revisao: 2026-03-27

- Repositorio local em `main`
- Banco operacional alvo confirmado: `lrqvvxmgimjlghpwavdb`
- Projeto central preservado: `zjelgobexwhhfoisuilm`
- Existe um conjunto local de fechamento da migracao de dominio e alinhamento de URLs ainda a ser commitado nesta sessao
- O projeto esta vinculado a Vercel pelo arquivo `.vercel/project.json`
- `npm run build` executado com sucesso apos o fechamento da Fase 5 da migracao de dominio
- `README.md` e docs de sessao continuam sendo a base de memoria do projeto

Estado de producao hoje:
- `https://www.prevlegal.com.br` -> LP/site
- `https://prevlegal.com.br` -> redirect para `www`
- `https://app.prevlegal.com.br` -> plataforma
- `https://admin.prevlegal.com.br` -> admin
- `https://prevlegal.vercel.app` -> fallback tecnico

## Incidente Atual Prioritario

2026-03-19 - Fase 26 / isolamento entre escritorios

- Incidente P0 confirmado: usuarios de escritorios diferentes conseguiram ver dados uns dos outros
- Superficies reportadas com vazamento:
  - leads
  - listas
  - conversas / inbox / portal
  - financeiro
  - configuracoes
- Contencao temporaria publicada em producao:
- Contencao temporaria publicada em producao:
  - allowlist por email
  - usuarios fora da allowlist sao redirecionados para `/isolamento-em-andamento`
  - APIs autenticadas do app retornam `423`
- Contencao reforcada no admin:
  - rotas de onboarding do responsavel agora bloqueiam emails fora da allowlist com `423`
  - isso impede expandir o rollout multi-escritorio enquanto a Fase 26 nao fecha
- Contencao reforcada no app:
  - allowlist final reduzida ao tenant piloto da Jessica
  - `fbcfarias@icloud.com` e `fbcfarias@gmail.com` saem da allowlist do app
  - operacao do sistema admin continua no subdominio `admin`
- Arquivos da contencao:
  - `src/lib/tenant-containment.ts`
  - `src/lib/supabase/middleware.ts`
  - `src/app/isolamento-em-andamento/page.tsx`
  - `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts`
  - `src/app/api/admin/tenants/[id]/link-acesso/route.ts`
  - `src/app/api/admin/tenants/[id]/reset-senha/route.ts`
- Auditoria formal criada em:
  - `docs/TENANT_ISOLATION_AUDIT.md`
  - `docs/TENANT_ISOLATION_TASKS.md`
- Foundation migration criada:
  - `supabase/migrations/031_tenant_isolation_foundation.sql`
- Conclusao da auditoria ate aqui:
  - o schema operacional nasceu para `um banco por tenant`
  - o ambiente atual compartilha o banco entre escritorios
  - tabelas operacionais principais ainda nao tem `tenant_id`
  - varias APIs e policies continuam globais
  - a leitura real do banco mostrou que os dados operacionais existentes ainda pertencem ao legado Alexandrini
  - o tenant `Fluxrow` existe cadastrado, mas ainda nao tem isolamento operacional real
- Endurecimento temporario adicional aplicado no app:
  - helper `src/lib/tenant-context.ts`
  - rotas e paginas principais agora exigem auth e usam ownership por usuario como ancora temporaria
  - nao-admin fica limitado aos proprios leads e derivados em varias superficies do app
  - admins do tenant piloto continuam vendo a base legado atual
  - build validado com sucesso apos essa onda
  - isso reduz superficie de vazamento, mas nao substitui `tenant_id` + backfill + RLS

Proximo passo recomendado:
- decisao de execucao atual mais coerente:
  - descartar o legado piloto
  - aplicar a migration 031
  - executar reset operacional limpo
  - recadastrar o primeiro escritorio real do zero
- referencias criadas:
  - `docs/TENANT_RESET_PLAN.md`
  - `supabase/reset/operational_reset_after_031.sql`
  - `supabase/reset/combined_apply_031_and_reset.sql`
- execucao confirmada no banco operacional:
  - `031` aplicada
  - reset operacional concluido
  - tabelas centrais de operacao zeradas
- contagens confirmadas:
  - `tenants = 0`
  - `usuarios = 0`
  - `listas = 0`
  - `leads = 0`
  - `conversas = 0`
  - `mensagens_inbound = 0`
  - `portal_mensagens = 0`
  - `configuracoes = 0`
  - `contratos = 0`
  - `parcelas = 0`
- bootstrap tenant-aware iniciado no codigo:
  - `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` grava `usuarios.tenant_id`
  - `src/app/api/usuarios/convidar/route.ts` grava `convites.tenant_id`
  - `src/app/api/usuarios/aceitar-convite/route.ts` grava `usuarios.tenant_id`
  - `src/app/api/import/route.ts` grava `listas.tenant_id` e `leads.tenant_id`
  - `src/app/api/leads/route.ts` grava `tenant_id` e cria lista manual por tenant
  - contencao agora permite bootstrap do primeiro tenant fora da allowlist apenas enquanto `usuarios = 0`
- correcao aplicada no admin para cadastro do primeiro escritorio:
  - `src/app/api/admin/tenants/route.ts` agora normaliza payload e gera `slug` automaticamente quando vazio
  - `src/app/api/admin/tenants/[id]/route.ts` agora normaliza update e evita colisao silenciosa de `slug`
  - `src/app/admin/page.tsx` agora mostra erro real de salvamento no modal
  - `src/lib/supabase/middleware.ts` agora trata `/api/admin/*` como superficie admin autenticada por `admin_token`, sem desviar essas rotas para `/login` do app
  - `src/lib/supabase/middleware.ts` agora tambem deixa `/api/admin/reauth` publico, evitando que a reautenticacao do admin seja desviada para o `/login` do app
  - `src/lib/tenant-containment.ts` agora permite onboarding/controlos do unico tenant operacional existente, mesmo apos o primeiro usuario ter sido criado
  - `src/app/auth/redefinir-senha/page.tsx` agora aceita links de redefinicao com `token_hash` e `code`, alem de sessao ja estabelecida
  - `src/app/admin/page.tsx` agora gera/copía automaticamente o link manual de contingencia logo apos `Enviar acesso do responsavel` responder sucesso
  - `src/app/admin/page.tsx` agora tambem gera/copía automaticamente o link manual de contingencia logo apos `Enviar reset de senha`
  - `src/app/api/usuarios/reset-manual/route.ts` cria um caminho de reset manual via token proprio + `service_role`, sem depender da sessao recovery do Supabase
  - `src/app/auth/redefinir-senha/page.tsx` agora suporta esse token manual de reset, alem dos formatos nativos do Supabase
- validacao operacional concluida:
  - primeiro escritorio de teste foi criado com sucesso no admin apos o reset limpo
  - escritorio usado no teste: `Fluxrow`
  - email do responsavel usado no teste: `fbcfarias@icloud.com`
  - observacao de modelagem: para operacao real, e melhor manter conta `master admin` separada da conta de usuario do escritorio
- depois substituir o escopo temporario por usuario por `tenant_id` canonico
- revisar RLS com tenant isolation real

2026-03-19 - Reset limpo executado no banco operacional
- O caminho correto foi confirmado como SQL direto no operacional `lrqvvxmgimjlghpwavdb`
- O projeto central `zjelgobexwhhfoisuilm` nao foi tocado
- Motivo para NAO usar `supabase db push` nesta etapa:
  - o CLI estava linkado ao projeto central por engano
  - o banco remoto nao tem historico local de migrations confiavel para esse fluxo
- Arquivo executado:
  - `supabase/reset/combined_apply_031_and_reset.sql`
- O pacote aplicou:
  - foundation `031_tenant_isolation_foundation`
  - reset operacional limpo
- Validacao final confirmada no operacional:
  - `tenants = 0`
  - `usuarios = 0`
  - `listas = 0`
  - `leads = 0`
  - `conversas = 0`
  - `mensagens_inbound = 0`
  - `portal_mensagens = 0`
  - `configuracoes = 0`
  - `contratos = 0`
  - `parcelas = 0`
- Observacoes importantes:
  - legado piloto `Alexandrini/Jessica` foi tratado como descartavel, sem backfill
  - `auth.users` nao foi limpo nesta etapa
  - nao houve mudanca de dominio, Vercel ou Google nesta execucao
  - nenhuma alteracao de codigo de app foi feita nesta etapa; foco total em operacao + documentacao

## Mapa Atual do Sistema

Modulos ja identificados no app:
- dashboard geral
- leads e pagina de detalhe do lead
- calculadora previdenciaria
- geracao de documentos juridicos por IA
- portal do cliente por link unico
- caixa de entrada e mensagens
- busca global
- campanhas
- relatorios
- configuracoes e gestao de usuarios
- perfil multi-advogado
- financeiro basico

## Documentos Juridicos Ja Implementados

- Peticao Inicial
- Procuracao
- Requerimento INSS

Base atual identificada:
- prompts em `src/lib/doc-templates.ts`
- geracao via API em `src/app/api/leads/[id]/gerar-documento/route.ts`

## Fase Atual em Trabalho

Fase 25 - Session Security Hardening

Escopo em implementacao local:
- timeout por inatividade na plataforma (`45 min`)
- timeout por inatividade no admin (`15 min`)
- reautenticacao para financeiro e admin
- paginas dedicadas de reautenticacao
- refresh de atividade por cookie httpOnly
- logout automatico no cliente por inatividade

## Cuidados de Compatibilidade

Pontos que precisam ser preservados durante a implementacao:
- nao quebrar o fluxo atual do lead detail
- nao interferir na geracao de documentos IA
- nao quebrar a navegacao da sidebar
- manter compatibilidade com autenticacao atual via Supabase
- respeitar o isolamento de dados ja existente no app
- validar build ao final de cada fase importante

## Registro de Validacoes

## Atualizacao de 2026-04-01 — Leads agora respeitam filtro por URL

- a tela `/leads` passou a aceitar `?status=` diretamente no servidor
- recortes suportados:
  - `new`
  - `contacted`
  - `awaiting`
  - `scheduled`
  - `converted`
  - `lost`
- a UI do kanban ganhou:
  - faixa de filtro ativo com `Limpar filtro`
  - chips de status no topo
- o `Dashboard` agora usa esses recortes no bloco de pipeline:
  - `Novos` -> `/leads?status=new`
  - `Contatados` -> `/leads?status=contacted`
  - `Agendados` -> `/leads?status=scheduled`
  - `Convertidos` -> `/leads?status=converted`
  - `Perdidos` -> `/leads?status=lost`
- arquivos principais:
  - `src/app/(dashboard)/leads/page.tsx`
  - `src/app/(dashboard)/dashboard/page.tsx`
- validacao:
  - `npm run build` passou
- proximo passo sugerido:
  - decidir se o funil executivo em `/relatorios` tambem deve ganhar atalhos especificos para `Novos`, `Contatados` e `Perdidos`

## Atualizacao de 2026-04-01 — Sidebar retraida e funil executivo clicavel

- o bloco `Funil de Conversao` em `/relatorios` agora tambem redireciona para filas reais nas etapas acionaveis
- mapeamento atual:
  - `Total Leads` -> `/leads`
  - `Contatados` -> `/leads?status=contacted`
  - `Responderam` -> `/caixa-de-entrada?tab=todas`
  - `Agendados` -> `/leads?status=scheduled`
  - `Convertidos` -> `/leads?status=converted`
- a sidebar foi refinada para ganhar mais area util no app:
  - auto-retraida por padrao em dispositivos com hover
  - expande ao passar o mouse
  - continua expandida em touch
- arquivos principais:
  - `src/app/(dashboard)/relatorios/page.tsx`
  - `src/components/sidebar.tsx`
- proximo passo sugerido:
  - validar no browser a ergonomia da sidebar no kanban e na agenda

## Atualizacao de 2026-04-01 — Plano do app mobile do cliente

- foi consolidada a direcao de produto para a frente mobile do cliente/familiar
- decisao atual:
  - usar o portal atual como base
  - priorizar experiencia mobile-first
  - lancar primeiro como `PWA`
  - adiar app nativo ate haver prova real de necessidade
- MVP recomendado:
  - home com status e proximos passos
  - mensagens
  - agenda / Google Meet
  - documentos
  - perfil do cliente/familiar
- direcao de modelagem:
  - criar identidade separada para cliente/familiar
  - nao misturar com `usuarios` internos
- documento canonico:
  - `docs/MOBILE_CLIENT_APP_PLAN.md`
- proximo passo sugerido:
  - transformar esse plano em backlog tecnico de banco, rotas e telas

2026-03-30 - Saude do tenant no admin com metricas tenant-aware

- Objetivo:
  - transformar o detalhe do tenant em leitura executiva real, sem misturar contagens globais do piloto
- Arquivos principais:
  - `src/app/api/admin/tenants/[id]/metricas/route.ts`
  - `src/app/admin/[id]/page.tsx`
- Correcoes aplicadas no backend:
  - contagens e consultas passaram a filtrar por `tenant_id`
  - foram adicionados sinais operacionais novos:
    - `ultimoAcessoEquipe`
    - `usuariosAtivos7d`
    - `conversas7d`
    - `agendamentosPendentes`
    - `riscoOperacional`
    - `resumoSaude`
- Correcoes aplicadas no frontend:
  - nova secao `Saúde do tenant`
  - badge de risco operacional
  - cards executivos com atividade recente, equipe ativa e carga pendente
  - `Resumo operacional` e `Saúde da conta` passaram a refletir os novos sinais
- Validacao:
  - `npm run build` passou
- Proximo passo recomendado:
  - levar essa mesma leitura tenant-aware para previsibilidade financeira e churn

2026-03-30 - Financeiro preditivo tenant-aware

- Objetivo:
  - transformar o financeiro de leitura historica para leitura operacional de curto prazo
  - endurecer as rotas sensiveis de contratos e parcelas com recorte tenant-aware
- Arquivos principais:
  - `src/app/api/financeiro/resumo/route.ts`
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/contratos/[id]/route.ts`
  - `src/app/api/financeiro/parcelas/[id]/route.ts`
  - `src/app/(dashboard)/financeiro/page.tsx`
- Correcoes de backend:
  - escopo de leitura financeira passou a nascer dos leads visiveis do tenant atual
  - resumo financeiro agora calcula:
    - `previsto7d`
    - `previsto30d`
    - `recebivelAberto`
    - `ticketMedioContrato`
    - `proximasParcelas`
    - `riscoFinanceiro`
    - `resumoCarteira`
  - update/delete de contrato e update de parcela agora validam se o recurso pertence a um lead do tenant atual
- Correcoes de frontend:
  - nova secao `Previsão de caixa`
  - cards de recebimento curto prazo e carteira
  - badge de risco financeiro
  - lista de proximos recebimentos no proprio dashboard
- Validacao:
  - `npm run build` passou
- Proximo passo recomendado:
  - ligar previsao financeira com origem comercial (campanha, inbox, agendamento) para leitura de pipeline ponta a ponta

2026-03-30 - Origem comercial da carteira no financeiro

- Objetivo:
  - mostrar de onde os contratos estao vindo e quanto da carteira ja passou por agendamento
- Arquivos principais:
  - `src/app/api/financeiro/resumo/route.ts`
  - `src/app/(dashboard)/financeiro/page.tsx`
- Correcoes aplicadas:
  - o resumo financeiro agora agrega a carteira por origem comercial do lead:
    - `campanha`
    - `lista`
    - `manual`
  - tambem calcula sinais de pipeline dentro da carteira:
    - contratos via campanha
    - contratos sem campanha
    - contratos com agendamento
    - contratos com agendamento realizado
    - valor contratado vindo de campanha
    - valor contratado via operacao direta
  - o frontend ganhou a secao `Origem comercial da carteira`
- Validacao:
  - `npm run build` passou
- Proximo passo recomendado:
  - consolidar uma leitura unica de pipeline entre origem comercial, conversa humana, agendamento e contrato

2026-03-27 - Foundation de providers para WhatsApp

- Objetivo:
  - preparar o produto para `Twilio + Z-API + multiplos numeros por tenant`
  - sem quebrar o runtime atual que ainda depende do modelo Twilio unico por tenant/env
- Arquivos principais:
  - `src/lib/whatsapp-provider.ts`
  - `src/app/api/conversas/[id]/responder/route.ts`
  - `src/app/api/leads/[id]/iniciar-conversa/route.ts`
  - `src/app/api/agente/responder/route.ts`
  - `src/app/api/campanhas/[id]/disparar/route.ts`
  - `supabase/migrations/032_whatsapp_provider_foundation.sql`
- Decisao de arquitetura:
  - o envio outbound deixa de depender conceitualmente de um helper Twilio unico
  - `whatsapp-provider.ts` tenta resolver um numero ativo em `whatsapp_numbers`
  - se a tabela nao existir ou nao houver configuracao, o app faz fallback para `getTwilioCredentialsByTenantId`
- Cobertura ja conectada na camada nova:
  - resposta manual em conversa
  - `Iniciar conversa` no lead
  - resposta automatica do agente
  - disparo de campanhas
- Migration 032 preparada para:
  - criar `whatsapp_numbers`
  - registrar `provider = twilio | zapi`
  - suportar multiplos numeros por tenant
  - introduzir `whatsapp_number_id` opcional em conversas, mensagens inbound, notificacoes e campanhas
- Validacao:
  - `npm run build` passou apos a integracao
- Observacao operacional:
  - o erro atual visto no Twilio sandbox (`could not find a Channel with the specified From address`) e de configuracao do sender/canal, nao de fluxo da aplicacao
- Proximo passo recomendado:
  - migration `032` aplicada com sucesso no operacional `lrqvvxmgimjlghpwavdb`
  - tabela `whatsapp_numbers` criada no banco operacional
  - tenant `Fluxrow` sincronizado com credenciais Twilio atuais e canal default:
    - `provider = twilio`
    - `label = Twilio Sandbox`
    - `phone/twilio_whatsapp_number = whatsapp:+14155238886`
  - contagem atual no operacional:
    - `whatsapp_numbers = 1`
    - `twilio_channels = 1`
    - `zapi_channels = 0`
  - proximo passo recomendado:
    - retestar envio manual e `Iniciar conversa` no app publicado
    - validar inbound/status com o tenant `Fluxrow`
    - criar UI/admin para cadastro de numeros por tenant
    - conectar Z-API como primeiro provider alternativo para campanha e operacao humana

2026-03-27 - Admin de canais WhatsApp por tenant

- Superficie nova:
  - `src/app/admin/[id]/page.tsx` agora inclui a secao `Canais WhatsApp`
- Rotas novas:
  - `src/app/api/admin/tenants/[id]/whatsapp-numbers/route.ts`
  - `src/app/api/admin/tenants/[id]/whatsapp-numbers/[numberId]/route.ts`
- Capacidades entregues:
  - listar canais por tenant
  - cadastrar canal `Twilio`
  - cadastrar canal `Z-API`
  - editar credenciais
  - marcar canal padrao
  - ativar/pausar
  - excluir
- Decisao importante:
  - a UI administra `whatsapp_numbers`, mas o runtime legado ainda consulta `tenants.twilio_*` em alguns pontos
  - por isso, o backend do admin sincroniza automaticamente o canal `Twilio` padrao com os campos legado do tenant
- Validacao:
  - `npm run build` passou apos adicionar a UI e as rotas
- Proximo passo recomendado:
  - usar essa nova UI para cadastrar o primeiro canal `Z-API`
  - depois ligar a escolha de origem por campanha e por conversa humana

2026-03-16
- Confirmado que o projeto local esta alinhado ao commit `2f79771`
- Confirmado que o build atual passa
- Confirmado que existe ligacao local com a Vercel via `.vercel/project.json`
- Confirmado que o README atual nao documenta o sistema

2026-03-16 - Fase 21 implementada no codigo local
- Criada a migration `supabase/migrations/029_financeiro.sql`
- Criado o helper `src/lib/financeiro.ts`
- Criadas as APIs:
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/contratos/[id]/route.ts`
  - `src/app/api/financeiro/parcelas/[id]/route.ts`
  - `src/app/api/financeiro/resumo/route.ts`
- Criada a tela `src/app/(dashboard)/financeiro/page.tsx`
- Criado o componente `src/components/contrato-lead.tsx`
- Integrado o financeiro na pagina do lead
- Adicionado o item Financeiro na sidebar
- `npm run build` executado novamente com sucesso apos a implementacao

2026-03-16 - Publicacao e ambiente
- Preview deploy publicado na Vercel com status Ready
- URL de preview: `https://prevlegal-1vaer5xfa-fluxrow.vercel.app`
- Alias adicional da Vercel: `https://prevlegal-fbcfarias-8916-fluxrow.vercel.app`
- `npx vercel inspect` confirmou deploy pronto
- Supabase CLI encontrado localmente (`2.78.1`), mas sem autenticacao ativa
- A migration `029_financeiro.sql` ainda nao foi aplicada no projeto remoto por falta de `SUPABASE_ACCESS_TOKEN` ou login local do CLI

2026-03-17 - Fase 22 onboarding expandido em andamento
- Objetivo: completar os tours guiados nas paginas Dashboard, Agendamentos, Listas, Campanhas, Relatorios e detalhe do lead
- Padrao seguido a partir de:
  - `src/hooks/useOnboarding.ts`
  - `src/components/onboarding-tooltip.tsx`
  - `src/components/leads-onboarding-tour.tsx`
- Novos componentes criados:
  - `src/components/dashboard-onboarding-tour.tsx`
  - `src/components/agendamentos-onboarding-tour.tsx`
  - `src/components/listas-onboarding-tour.tsx`
  - `src/components/campanhas-onboarding-tour.tsx`
  - `src/components/relatorios-onboarding-tour.tsx`
  - `src/components/lead-detalhe-onboarding-tour.tsx`
- Integracoes aplicadas:
  - Dashboard: anchors em KPIs, pipeline e leads recentes
  - Agendamentos: anchors em lista, bloco Google Calendar e legenda de status
  - Listas: anchors em lista, botao importar e bloco explicativo de status
  - Campanhas: anchors em lista principal, botao nova campanha e dois cards explicativos para metricas e fluxo com agente IA
  - Relatorios: anchors em abas, grid de KPIs e botao/aba de funil
  - Detalhe do lead: anchors em dados do perfil, calculadora, geracao de documentos IA e portal do cliente
- Reset de onboarding ampliado em `src/components/onboarding-reset-section.tsx` para listar as 9 paginas com tour
- Motivo de alguns blocos explicativos extras:
  - garantir alvos estaveis para o tour mesmo quando a pagina ainda nao tiver dados carregados
  - evitar steps quebrando por falta de elemento alvo no primeiro acesso
- Validacao concluida:
- `npm run build` executado com sucesso apos integrar os novos tours

2026-03-18 - Dominio proprio / DNS / SSL
- Foi identificado conflito entre o apex `prevlegal.com.br` e o WebsiteBuilder da GoDaddy
- Sintoma observado: apex respondendo headers da GoDaddy enquanto subdominios da Vercel ficavam pendentes
- Regra registrada:
  - apex nao pode misturar GoDaddy com Vercel
  - `www/app/admin` podem demorar alguns minutos apos o apex entrar em `Generating SSL Certificate`
  - so considerar a migracao saudavel quando o apex parar de responder GoDaddy e o SSL propagar para os hosts restantes
- Esse incidente foi registrado em `docs/LEARNINGS.md` e reforcado em `docs/DOMAIN_MIGRATION.md`

2026-03-18 - Fase 25 implementada localmente
- Criado o helper `src/lib/session-security.ts`
- Criado o componente `src/components/session-activity-tracker.tsx`
- Criadas as rotas:
  - `src/app/api/session/touch/route.ts`
  - `src/app/api/session/logout/route.ts`
  - `src/app/api/session/reauth/route.ts`
  - `src/app/api/admin/session/touch/route.ts`
  - `src/app/api/admin/reauth/route.ts`
- Criadas as paginas:
  - `src/app/reauth/page.tsx`
  - `src/app/admin/reauth/page.tsx`
- App protegido por timeout e refresh de atividade em:
  - `src/lib/supabase/middleware.ts`
  - `src/app/page.tsx`
  - `src/app/(dashboard)/layout.tsx`
- Financeiro passou a exigir reautenticacao recente em:
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/contratos/[id]/route.ts`
  - `src/app/api/financeiro/parcelas/[id]/route.ts`
  - `src/app/api/financeiro/resumo/route.ts`
  - `src/app/(dashboard)/financeiro/page.tsx`
  - `src/components/contrato-lead.tsx`
- Admin passou a exigir reautenticacao recente em:
  - `src/lib/admin-auth.ts`
  - `src/app/api/admin/auth/route.ts`
  - `src/app/api/admin/tenants/route.ts`
  - `src/app/api/admin/tenants/[id]/route.ts`
  - `src/app/api/admin/tenants/[id]/metricas/route.ts`
  - `src/app/admin/page.tsx`
  - `src/app/admin/[id]/page.tsx`
- `npm run build` executado com sucesso apos as alteracoes

2026-03-18 - Fix de reautenticacao da Fase 25
- Validacao manual no deploy revelou que a API admin aceitava acesso sem cookie recente de reauth quando o cookie estava ausente
- Causa: helper tratava timestamp ausente como "nao expirado"
- Correcao aplicada em:
  - `src/lib/session-security.ts`
  - `src/lib/admin-auth.ts`
- Regra final: cookie ausente de reauth agora invalida o acesso sensivel, como esperado
- `npm run build` executado novamente com sucesso apos o fix

2026-03-18 - Alinhamento Twilio Sandbox
- O codigo ja possui fluxo completo para receber mensagens inbound do WhatsApp e exibi-las no app
- Rotas principais confirmadas:
  - `src/app/api/webhooks/twilio/route.ts`
  - `src/app/api/webhooks/twilio/status/route.ts`
  - `src/app/api/conversas/route.ts`
  - `src/app/api/conversas/[id]/route.ts`
  - `src/components/modal-msg-lead.tsx`
- Foi identificado desalinhamento entre o sender do sandbox no painel Twilio e o `.env.local`
- Ajuste aplicado:
  - `.env.local` agora usa `TWILIO_WHATSAPP_NUMBER=\"whatsapp:+14155238886\"`
- Proximo checklist operacional:
  - confirmar no Twilio Sandbox o webhook `When a message comes in`
  - confirmar o `Status callback`
  - garantir que o numero de teste enviou o `join <codigo>` para o sandbox

2026-03-18 - Fix no cadastro manual de lead
- Erro reproduzido novamente no modal `Novo lead`
- Causa confirmada: a tabela `leads` ainda exige `nb` obrigatorio e unico
- Correcao aplicada em `src/app/api/leads/route.ts`
- Novo comportamento:
  - se `nb` vier preenchido, usa o valor informado
  - se `nb` vier vazio, gera `MANUAL-<telefone|cpf|timestamp>`
- Objetivo: permitir lead de teste/manual sem quebrar o modelo legado

2026-03-18 - Estabilizacao do build/deploy Next na Vercel
- Problema observado apos deploy em producao:
  - hosts publicos com alias correto, mas rotas do app retornando `404`
  - `lp.html` respondendo `200`, sugerindo artefato parcial/errado
- Causas encontradas e corrigidas:
  - existia uma arvore `app/` vazia na raiz competindo com `src/app`
  - existia um `next.config.js` residual competindo com `next.config.ts`
  - modulos com client Supabase admin criados no escopo de arquivo quebravam o build em `Collecting page data`
  - `/reauth` e `/admin/reauth` usavam `useSearchParams` sem `Suspense`
  - `/login` e `Sidebar` criavam `createBrowserClient` no corpo do componente
- Correcoes aplicadas:
  - remocao da arvore `app/` vazia na raiz
  - remocao de `next.config.js`
  - criacao de `src/lib/session-config.ts` para separar constantes compartilhadas da parte server-only
  - lazy init dos clients Supabase em handlers/requests
  - wrappers `Suspense` nas paginas de reauth
  - `next.config.ts` agora fixa `turbopack.root` com `process.cwd()`
- Validacao final:
  - `npm run build` voltou a passar com manifesto completo de rotas do app

2026-03-19 - Reset de senha do tenant direto no admin
- Criada a rota `src/app/api/admin/tenants/[id]/reset-senha/route.ts`
- Fluxo protegido por `verificarAdminAuth()` e `verificarAdminReauthRecente()`
- A rota busca o email do responsavel no tenant e chama `auth.admin.generateLink({ type: 'recovery' })`
- O modal de edicao em `src/app/admin/page.tsx` agora exibe uma secao dedicada para enviar o reset quando `editId` estiver presente
- Feedback visual de sucesso/erro incluido no proprio modal

2026-03-19 - Fluxo de recriacao de acesso do responsavel
- Criada a rota `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts`
- O fluxo remove usuarios auth antigos associados ao email do responsavel, limpa convites pendentes e gera um novo link de aceite

2026-03-19 - Fechamento da Fase 5 da migracao de dominio
- O projeto `prevlegal-site` passou a servir a LP publica em `https://www.prevlegal.com.br`
- O apex `https://prevlegal.com.br` passou a redirecionar para `https://www.prevlegal.com.br/`
- O projeto `prevlegal` ficou responsavel apenas por:
  - `https://app.prevlegal.com.br`
  - `https://admin.prevlegal.com.br`
  - `https://prevlegal.vercel.app`
- Ajustes de codigo aplicados para refletir os domínios canônicos:
  - `site/robots.txt`
  - `site/sitemap.xml`
  - `src/app/layout.tsx`
  - `src/app/robots.ts`
  - `src/app/sitemap.ts`
  - `src/app/admin/[id]/page.tsx`
  - `src/app/api/admin/tenants/[id]/reset-senha/route.ts`
  - `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts`
  - `src/app/api/portal/link/[leadId]/route.ts`
  - `src/app/api/usuarios/convidar/route.ts`
  - `src/app/api/google/callback/route.ts`
  - `public/demo.html`
  - `.env.example`
- Env alinhadas na Vercel:
  - `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br` (`Production` e `Development`)
  - `NEXT_PUBLIC_SITE_URL=https://www.prevlegal.com.br` (`Production` e `Development`)
  - `GOOGLE_REDIRECT_URI=https://app.prevlegal.com.br/api/google/callback` (`Production`)
- Observacao importante:
  - a CLI da Vercel exigiu branch especifica para `Preview`, entao o corte final de env foi fechado em `Production` e `Development`
- Validacoes HTTP confirmadas:
  - `https://www.prevlegal.com.br` -> `200`
  - `https://prevlegal.com.br` -> `307`
  - `https://app.prevlegal.com.br/login` -> `200`
  - `https://admin.prevlegal.com.br/admin/login` -> `200`

2026-03-19 - Contingencia para primeiro acesso do responsavel
- Incidente reproduzido: email de acesso chegou, mas o clique abriu `http://localhost:3000/#error=access_denied...`
- Causa comprovada via `auth.admin.generateLink({ type: 'recovery' })`:
  - `redirect_to` observado no Supabase = `http://localhost:3000`
  - ou seja, o problema esta na configuracao do Supabase Auth, nao na rota do app
- Contingencia segura implementada sem mexer no fluxo principal:
  - nova rota `src/app/api/admin/tenants/[id]/link-acesso/route.ts`
  - nova pagina `src/app/auth/confirm/page.tsx`
  - modal admin ganhou botao `Copiar link manual`
- Objetivo do fallback:
  - gerar um link direto em `https://app.prevlegal.com.br/auth/confirm?...`
  - permitir onboarding do responsavel mesmo se o email do Supabase continuar vindo com host errado
- Correcao externa ainda pendente:
  - alinhar `Site URL` / `Redirect URLs` do Supabase Auth para `app.prevlegal.com.br`

2026-03-19 - Incidente critico de isolamento de dados entre escritorios
- Depois de criar um novo escritorio e concluir o onboarding do responsavel, o usuario do novo escritorio conseguiu ver dados da Jessica
- Superficies reportadas como vazando dados:
  - leads
  - caixa de entrada / conversas do portal
  - listas
  - financeiro
  - configuracoes
- Superficie reportada como aparentemente correta:
  - perfil mostrou apenas os dados do proprio usuario
- Diagnostico tecnico atual:
  - o modelo de negocio do banco operacional ainda se comporta como single-tenant
  - tabelas principais nao tem `tenant_id` funcional nem filtros por escritorio
  - varias APIs usam `service_role` ou consultas sem escopo de tenant
- Severidade:
  - P0 / LGPD / sigilo entre escritorios
- Regra operacional imediata:
  - nao onboardar novos escritorios reais no mesmo ambiente operacional ate existir isolamento de dados
- Proximo trabalho necessario:
  - auditoria completa das superficies vazando dados
  - estrategia de tenant isolation
  - contencao imediata antes de qualquer rollout multi-escritorio

2026-03-19 - Google OAuth ainda pendente apos mudanca de dominio
- Ao conectar Google Calendar, a tela exibiu erro `400 invalid_request`
- Isso precisa ser corrigido no Google Cloud Console com navegador autenticado
- Alinhamento esperado:
  - origem e redirect URI do OAuth Client apontando para `app.prevlegal.com.br`
  - callback do app permanece em `src/app/api/google/callback/route.ts`

2026-03-26 - Ajuste de fluxo para validacao do Google Calendar em agendamentos
- O callback de `src/app/api/google/callback/route.ts` passou a redirecionar para `/agendamentos?google=conectado|erro`
- `src/lib/google-calendar.ts` passou a sanitizar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` com `trim()`
- `npm run build` validado com sucesso apos o ajuste
- O principal bloqueio restante para `redirect_uri_mismatch` continua sendo o Google Cloud Console:
  - `Authorized redirect URI` deve conter exatamente `https://app.prevlegal.com.br/api/google/callback`
  - `Authorized JavaScript origin` deve conter `https://app.prevlegal.com.br`

2026-03-26 - Paginas publicas de privacidade e termos criadas para o site
- Criadas as paginas estaticas do projeto `site/`:
  - `site/privacidade/index.html`
  - `site/termos/index.html`
- Criados espelhos tecnicos no projeto principal:
  - `public/privacidade/index.html`
  - `public/termos/index.html`
- O footer da LP foi atualizado para apontar para:
  - `/privacidade`
  - `/termos`
- O sitemap estatico do site agora inclui:
  - `https://www.prevlegal.com.br/privacidade`
  - `https://www.prevlegal.com.br/termos`
- Objetivo operacional:
  - destravar homepage/privacy/terms no Google Auth Platform para publicar o consent screen em producao

2026-03-19 - Estruturacao inicial da Fase 26
- Criado o quadro de tasks em `docs/TENANT_ISOLATION_TASKS.md`
- A fase foi dividida em:
  - contencao
  - auditoria de schema
  - auditoria de APIs/superficies
  - modelo de tenancy
  - implementacao
- A frente de Google OAuth foi explicitamente separada da correcao de isolamento LGPD

2026-03-19 - Contencao temporaria da Fase 26
- Contencao aplicada no middleware para impedir uso do app por escritorios fora da allowlist temporaria
- Arquivos principais:
  - `src/lib/tenant-containment.ts`
  - `src/lib/supabase/middleware.ts`
  - `src/app/isolamento-em-andamento/page.tsx`
- Env adicionada:
  - `TENANT_CONTAINMENT_ALLOWED_EMAILS`
- Valores alinhados em `Production` e `Development`:
  - `jessica@alexandrini.adv.br`
  - `fbcfarias@icloud.com`
  - `fbcfarias@gmail.com`
- Comportamento:
  - usuarios autenticados fora da allowlist sao redirecionados para `/isolamento-em-andamento`
  - APIs autenticadas do app retornam `423`
  - excecoes publicas preservadas para nao quebrar admin auth, convites, webhooks e portal publico
- `src/app/api/usuarios/aceitar-convite/route.ts` agora reaproveita o registro existente em `usuarios` quando o email ja existir, atualizando `auth_id` em vez de falhar por conflito
- O modal de edicao do tenant ganhou a acao `Gerar acesso do responsavel` com link copiavel
- Objetivo: permitir recriar o acesso sem perder o historico do usuario na tabela `usuarios`

2026-03-19 - Operacao aplicada em producao para Alexandrini
- Tenant `Alexandrini Advogados` (`ad01e4ec-509b-4bf0-976e-c17bc2e53373`) estava com `responsavel_email = fbcfarias@icloud.com`
- Com base no `MASTER.md` e nos scripts legados, o email da Jessica foi inicialmente ajustado para `jessica@alexandrini.com.br`
- Depois do deploy do commit `9630154f`, a rota de `recriar-acesso` foi executada em producao para esse tenant
- Resultado:
  - `responsavel_email` atualizado para `jessica@alexandrini.com.br`
  - novo convite gerado para a Jessica
  - URL emitida: `https://prevlegal.vercel.app/auth/aceitar-convite?token=d87e828911ca82a53551aedfdb173bd82b3bbcb8395d2f02cbcecec5cc7539a5`
  - expiracao do convite: `2026-03-26T11:43:12.919293+00:00`

2026-03-19 - Fluxo final de senha do responsavel
- `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` agora provisiona a conta do responsavel em `auth.users`, sincroniza `public.usuarios` e dispara email real de definicao de senha
- `src/app/api/admin/tenants/[id]/reset-senha/route.ts` passou a usar `resetPasswordForEmail` em vez de `generateLink`
- Criada a tela `src/app/auth/redefinir-senha/page.tsx` para concluir a troca de senha dentro do produto
- Objetivo: permitir primeiro acesso e redefinicao sem depender do convite customizado para o responsavel principal

2026-03-19 - Correcao do bloqueio Jessica / `tenant_id`
- O fluxo de reprovisionamento da Jessica falhou em producao porque `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` ainda selecionava `usuarios.tenant_id`
- `src/app/api/usuarios/aceitar-convite/route.ts` tambem ainda carregava e persistia `tenant_id`, embora a tabela `usuarios` atual nao tenha essa coluna
- Correcao aplicada: ambos os fluxos agora sincronizam apenas por `email`, `auth_id`, `role`, `ativo` e metadados de convite
- Objetivo imediato desta sessao: publicar essa correcao, reprovisionar o responsavel e validar o envio real do email de definicao de senha

2026-03-19 - Trigger do Supabase no reprovisionamento
- O erro `Database error creating new user` veio do trigger `public.handle_new_user()`, que insere automaticamente em `public.usuarios` quando nasce um registro em `auth.users`
- Se o usuario logico ja existe em `public.usuarios`, criar direto com o email final colide no `UNIQUE(email)` antes da sincronizacao customizada
- Correcao aplicada em `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` e `src/app/api/usuarios/aceitar-convite/route.ts`:
  - cria com email tecnico temporario
  - remove a linha automatica criada pelo trigger
  - atualiza o usuario Auth para o email real
  - reaproveita a linha existente de `public.usuarios`

2026-03-19 - Operacao real Jessica concluida
- Commit publicado: `7e741e46` (`fix: reuse existing usuarios rows during reprovisioning`)
- Deploy de producao publicado em `https://prevlegal-cxf4a3kyt-fluxrow.vercel.app` e alias em `https://app.prevlegal.com.br`
- Fluxo administrativo executado com sucesso em producao:
  - tenant `Alexandrini Advogados`
  - `responsavel_email`: `jessica@alexandrini.com.br`
  - resposta do endpoint `POST /api/admin/tenants/ad01e4ec-509b-4bf0-976e-c17bc2e53373/recriar-acesso`:
    - `{"ok":true,"email":"jessica@alexandrini.com.br","mensagem":"Conta provisionada e email de definicao de senha enviado para jessica@alexandrini.com.br"}`
- Leitura operacional confirmada: para primeiro acesso do responsavel, usar `Gerar acesso do responsavel`; o botao `Resetar senha` fica como etapa posterior, apos a conta ja existir/estar ativada no fluxo do produto

2026-03-19 - Blindagem contra convite antigo do responsavel
- `src/app/api/usuarios/convite/route.ts` agora invalida token de convite quando o email ja possui `auth_id` ativo em `usuarios`
- `src/app/auth/aceitar-convite/page.tsx` passou a exibir estado `obsoleto`, orientando o uso do email mais recente de definicao de senha
- `src/app/admin/page.tsx` removeu a exibicao/copia de URL para o fluxo do responsavel e reforcou a instrucao para ignorar convites antigos

2026-03-19 - Correcao do dominio de email da Jessica
- O email `jessica@alexandrini.com.br` estava errado para recebimento real de mensagens
- Verificacao de DNS mostrou `MX 0 .` em `alexandrini.com.br`, ou seja, esse dominio nao recebe email
- O dominio funcional de email do escritorio e `alexandrini.adv.br`
- O tenant `Alexandrini Advogados` foi atualizado em producao para `jessica@alexandrini.adv.br`
- O endpoint `POST /api/admin/tenants/ad01e4ec-509b-4bf0-976e-c17bc2e53373/recriar-acesso` foi executado novamente com sucesso:
  - `{"ok":true,"email":"jessica@alexandrini.adv.br","mensagem":"Conta provisionada e email de definicao de senha enviado para jessica@alexandrini.adv.br"}`

2026-03-19 - LP alinhada com dominio canonico
- `public/lp.html` passou a apontar todos os CTAs de acesso para `https://app.prevlegal.com.br/login`
- Nao havia links relativos para `/login` nem outras ocorrencias restantes de `https://prevlegal.vercel.app` nesse arquivo

2026-03-19 - Estrutura `site/` preparada para projeto separado da LP
- Criada a pasta `site/` para servir a LP publica em um projeto Vercel proprio
- `site/index.html` replica a LP atual
- `site/demo.html` replica o demo e ja exibe `app.prevlegal.com.br`
- `site/vercel.json` prepara deploy estatico limpo com raiz `/`
- `site/README.md` documenta o deploy recomendado do projeto `prevlegal-site`
- `docs/DOMAIN_MIGRATION.md` foi atualizado com a nova trilha de separacao em dois projetos Vercel

2026-03-19 - Estado atual dos dominios publicos
- `https://app.prevlegal.com.br/login` responde `200`
- `https://admin.prevlegal.com.br/admin/login` responde `200`
- `https://prevlegal.com.br` responde `404 DEPLOYMENT_NOT_FOUND`
- `https://www.prevlegal.com.br` responde `404 DEPLOYMENT_NOT_FOUND`
- Foi criada a checklist `docs/AUTH_BRANDING_TASKS.md` para executar o branding de emails auth depois que o site publico estiver estabilizado

## Arquivos Alterados Nesta Sessao

- `docs/MASTER.md`
- `docs/ROADMAP.md`
- `docs/SESSION_BRIEF.md`
- `docs/CODEX_HANDOFF.md`
- `docs/LEARNINGS.md`
- `supabase/migrations/029_financeiro.sql`
- `src/lib/financeiro.ts`
- `src/app/api/financeiro/contratos/route.ts`
- `src/app/api/financeiro/contratos/[id]/route.ts`
- `src/app/api/financeiro/parcelas/[id]/route.ts`
- `src/app/api/financeiro/resumo/route.ts`
- `src/app/(dashboard)/financeiro/page.tsx`
- `src/components/contrato-lead.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`
- `src/components/sidebar.tsx`
- `README.md`
- `docs/CODEX_HANDOFF.md`
- `src/lib/session-security.ts`
- `src/components/session-activity-tracker.tsx`
- `src/app/api/session/touch/route.ts`
- `src/app/api/session/logout/route.ts`
- `src/app/api/session/reauth/route.ts`
- `src/app/api/admin/session/touch/route.ts`
- `src/app/api/admin/reauth/route.ts`
- `src/app/reauth/page.tsx`
- `src/app/admin/reauth/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/page.tsx`
- `src/lib/supabase/middleware.ts`
- `src/lib/admin-auth.ts`
- `src/app/api/admin/auth/route.ts`
- `src/app/api/admin/tenants/route.ts`
- `src/app/api/admin/tenants/[id]/route.ts`
- `src/app/api/admin/tenants/[id]/metricas/route.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/[id]/page.tsx`
- `src/components/dashboard-onboarding-tour.tsx`
- `src/components/agendamentos-onboarding-tour.tsx`
- `src/components/listas-onboarding-tour.tsx`
- `src/components/campanhas-onboarding-tour.tsx`
- `src/components/relatorios-onboarding-tour.tsx`
- `src/components/lead-detalhe-onboarding-tour.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/agendamentos/page.tsx`
- `src/app/(dashboard)/listas/page.tsx`
- `src/app/(dashboard)/campanhas/page.tsx`
- `src/app/(dashboard)/relatorios/page.tsx`
- `src/components/onboarding-reset-section.tsx`

## Proximos Passos

- validar novamente a importacao de listas no tenant `Fluxrow` apos os fixes desta sessao
- confirmar que uma lista nao pode mais ser importada duas vezes no mesmo escritorio
- confirmar que os leads passam a ser criados e que a pagina `/listas` mostra os totais reais
- manter a contencao ativa ate o tenant isolation definitivo fechar
- seguir com filtros por `tenant_id`, revisao de `service_role` e RLS por tenant
- continuar atualizando este arquivo a cada bloco de trabalho concluido

## Atualizacao de 2026-03-19 — Importacao de listas

- investigacao confirmou que a lista estava sendo criada, mas os leads nao entravam
- o fluxo antigo aceitava a mesma lista duas vezes no mesmo tenant
- a API `/api/import` engolia erro de batch de insert e terminava “com sucesso” mesmo com `leads = 0`
- a API `/api/listas` retornava os campos crus do banco (`total_com_whatsapp`, `total_sem_whatsapp`, `total_nao_verificado`), enquanto a UI esperava `com_whatsapp`, `sem_whatsapp`, `nao_verificado`
- a rota `/api/whatsapp/verificar` ainda usava a tabela legado `lista_leads` e nomes de coluna antigos em `listas`

### Correcao aplicada

- `src/app/api/import/route.ts`
  - previne duplicidade por `nome` ou `arquivo_original` dentro do mesmo tenant
  - passa a usar `service_role` apenas para persistencia, mantendo auth do usuario para autorizar o fluxo
  - grava `responsavel_id` no lead importado
  - normaliza/trunca campos textuais antes do insert
  - faz fallback row-by-row quando um batch falha
  - expõe erro real quando nenhum lead e inserido e remove a lista vazia criada na tentativa
  - atualiza `total_leads` e `total_nao_verificado` ao final
- `src/app/api/listas/route.ts`
  - filtra por `tenant_id`
  - mapeia os campos reais do banco para os nomes esperados pela UI
- `src/app/api/whatsapp/verificar/route.ts`
  - deixa de depender de `lista_leads`
  - busca leads por `lista_id`
  - atualiza `total_com_whatsapp`, `total_sem_whatsapp` e `total_nao_verificado`
- `src/app/api/google/auth/route.ts`
  - sanitiza envs do OAuth com `trim()`
- `src/app/api/google/callback/route.ts`
  - sanitiza envs do OAuth com `trim()`
- `src/app/api/listas/route.ts`
  - deixa de expor a lista tecnica `Cadastro manual` na listagem padrao
- `src/app/api/listas/[id]/route.ts`
  - novo endpoint para excluir lista importada e seus leads vinculados
- `src/app/(dashboard)/listas/page.tsx`
  - adiciona acao de excluir lista
  - mostra aviso explicando que cadastros manuais ficam agrupados no Kanban de Leads
- `src/app/globals.css`
  - adiciona paletas `dark` e `light`
- `src/app/layout.tsx`
  - inicializa `data-theme` antes da hidratacao
- `src/components/theme-toggle.tsx`
  - novo toggle global de tema com persistencia em `localStorage`
- `src/app/(dashboard)/layout.tsx`
  - exibe o toggle no header do dashboard

### Validacao

- `npm run build` passou apos as correcoes
- em `2026-03-20`, as duas listas orfas de teste do tenant `Fluxrow` (`NOMES RJ BNG.xlsx`, `total_leads = 0`) foram removidas manualmente para liberar a reimportacao limpa
- apos o reteste, a lista `NOMES RJ BNG.xlsx` entrou no tenant `Fluxrow`, mas com diferenca entre `total_ativos = 78` e `total_leads = 55`
- a rota agora devolve `falhas_insercao` e a tela de importacao mostra os warnings/linhas rejeitadas para o proximo reteste, permitindo identificar a causa exata dessas 23 linhas perdidas
- o fluxo do Google Calendar foi endurecido para nao carregar `redirect_uri` com whitespace invisivel
- a tela `/listas` agora funciona como lista de importacoes operacionais, sem misturar o agrupador tecnico `Cadastro manual`
- o dashboard agora suporta modo claro e modo escuro de forma global

## Atualizacao de 2026-03-27 — Google Calendar pos-reset multi-tenant

- o sintoma em runtime era: usuario concluia o OAuth, via toast de sucesso em `/agendamentos` e segundos depois a UI voltava a exibir Google desconectado
- a causa confirmada estava na persistencia de `configuracoes`
  - `src/app/api/google/callback/route.ts` podia tentar criar a primeira linha de `configuracoes` sem `nome_escritorio`
  - o erro de insert nao era tratado antes do redirect de sucesso
  - leitura e escrita de `configuracoes` ainda estavam sem filtro por `tenant_id`
- correcao aplicada:
  - novo helper `src/lib/configuracoes.ts` para buscar/garantir a configuracao atual do tenant
  - `src/app/api/google/callback/route.ts` agora garante a linha de configuracao do tenant e so retorna sucesso se o update do token realmente passar
  - `src/app/api/google/status/route.ts` agora le a configuracao do tenant atual
  - `src/lib/google-calendar.ts` agora usa `tenant_id` para ler e atualizar o token
  - `src/app/api/configuracoes/route.ts` e `src/app/api/agente/config/route.ts` tambem deixaram de tratar `configuracoes` como singleton global
- validacao:
  - `npm run build` passou apos as correcoes
- proximo passo:
  - reconectar o Google em producao
  - confirmar persistencia do estado conectado apos refresh
  - criar um agendamento real e validar `google_event_id`/`meet_link`

## Atualizacao de 2026-03-27 — Atalhos operacionais de contato

- o usuario reportou falta de botoes/atalhos para acelerar contato com o lead em superficies operacionais
- leitura do codigo confirmou que:
  - existia historico/consulta de conversa
  - mas a maioria das telas ainda obrigava navegacao manual ate a `Caixa de Entrada`
  - a busca global de conversa caia apenas em `/caixa-de-entrada`, sem abrir a thread certa
- correcao aplicada:
  - novo helper `src/lib/contact-shortcuts.ts`
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
    - aceita deep-link por `conversaId` e `telefone`
  - `src/app/api/busca/route.ts`
    - conversas agora apontam para a thread correta da inbox
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - adiciona `Abrir conversa` e `Abrir no WhatsApp`
  - `src/components/lead-drawer.tsx`
    - adiciona os mesmos atalhos no drawer
  - `src/components/modal-msg-lead.tsx`
    - footer do WhatsApp vira CTA operacional real, nao apenas instrução
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - adiciona atalhos de contato por lead agendado
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no browser os novos atalhos
  - revisar se vale adicionar CTA semelhante em campanhas e relatorios de lead qualificado

## Atualizacao de 2026-03-27 — Runtime WhatsApp tenant-aware

- depois dos atalhos, a auditoria do bloco WhatsApp mostrou que o runtime de envio/recebimento ainda misturava schema legado e contexto global
- problemas confirmados:
  - `src/app/api/campanhas/route.ts` e `src/app/api/campanhas/[id]/disparar/route.ts` ainda dependiam de `lista_leads`, `numeros_whatsapp` e de status antigos (`concluida`/`cancelada`)
  - resposta manual e agente automatico ainda podiam resolver Twilio por contexto global ou incompleto
  - webhook inbound/status validava assinatura com token global e ainda gravava/lia entidades sem amarrar o `tenant_id` correto
- correcao aplicada:
  - `src/lib/twilio.ts`
    - novo helper de credenciais por `tenant_id`
    - novo routing por numero WhatsApp do tenant para webhook/status
  - `src/app/api/conversas/[id]/responder/route.ts`
    - resposta manual passa a filtrar conversa por `tenant_id` e grava `mensagens_inbound.tenant_id`
  - `src/app/api/agente/responder/route.ts`
    - configuracao do agente passa a ser lida via helper tenant-aware de `configuracoes`
    - resposta automatica usa credenciais Twilio do tenant do lead
  - `src/app/api/webhooks/twilio/route.ts`
    - resolve tenant a partir do numero `To`
    - grava `tenant_id` em `mensagens_inbound`
    - upsert de `conversas` respeita `tenant_id`
    - notificacoes/gatilhos de escalada passam a nascer no tenant correto
  - `src/app/api/webhooks/twilio/status/route.ts`
    - validacao da assinatura passa a usar o auth token do tenant do numero `From`
  - `src/app/api/campanhas/route.ts`
    - valida `lista_id` dentro do tenant
    - conta leads em `leads.lista_id`
    - grava campanha com `tenant_id`
  - `src/app/api/campanhas/[id]/disparar/route.ts`
    - disparo usa `leads.lista_id`
    - nao depende mais de `numeros_whatsapp`
    - resolve Twilio por `tenant_id`
    - finaliza com `encerrada`
  - `src/app/admin/[id]/page.tsx`
    - status visual do admin passa a tratar `encerrada` como campanha finalizada
- validacao:
  - `npm run build` passou apos o endurecimento
- proximo passo:
  - testar resposta manual em inbox
  - testar automacao do agente em inbound real
  - criar/disparar campanha e observar ciclo completo ate status webhook

## Atualizacao de 2026-03-27 — Iniciar conversa a partir do lead

- o usuario pediu um fluxo ativo no detalhe do lead: nao apenas abrir thread existente, mas permitir que o advogado inicie o contato dali mesmo
- correcao aplicada:
  - novo endpoint `src/app/api/leads/[id]/iniciar-conversa/route.ts`
    - valida acesso ao lead
    - garante/recupera uma `conversa`
    - assume a thread como `humano`
    - envia a primeira mensagem via WhatsApp
    - registra o envio e devolve `conversaId`
  - `src/app/api/leads/[id]/route.ts`
    - passa a devolver a conversa atual do lead quando existir
  - novo componente `src/components/iniciar-conversa-modal.tsx`
    - modal de primeira mensagem
    - apos envio, redireciona para a `Caixa de Entrada` na thread correta
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - adiciona CTA `Iniciar conversa`
    - mostra `Abrir conversa` apenas quando ja existe thread
  - `src/components/lead-drawer.tsx`
    - ganha o mesmo fluxo de `Iniciar conversa`
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar lead sem conversa previa
  - testar lead com conversa previa em modo `agente` para confirmar que o fluxo assume como `humano`

## Atualizacao de 2026-03-27 — Normalizacao de numero no envio WhatsApp

- durante o teste real do fluxo `Iniciar conversa`, o provider devolveu erro de numero invalido porque o lead estava salvo como `(41) 99236-1868`
- correcao aplicada:
  - `src/lib/twilio.ts`
    - `sendWhatsApp` agora normaliza o destinatario para formato E.164 brasileiro antes de chamar o provider
    - isso cobre resposta manual, campanhas e o fluxo novo de iniciar conversa
- validacao:
  - `npm run build` passou
- proximo passo:
  - retestar o envio para numero proprio no sandbox atual

## Atualizacao de 2026-03-29 — Warm-up automatico para numero novo e rascunho Z-API

- o usuario comprou um chip novo para testar `Z-API` e antes de plugar pediu endurecimento anti-block no produto
- leitura do codigo confirmou que o motor de campanhas ja possuia freios reais:
  - `lgpd_optout = false`
  - `apenas_verificados`
  - `limite_diario`
  - `tamanho_lote`
  - `pausa_entre_lotes_s`
  - delay randômico entre mensagens
- problema confirmado:
  - os defaults atuais (`500/dia`, lote `50`, pausa `30s`, delay `1.5s-3.5s`) sao agressivos demais para numero novo em `Z-API`
- correcao aplicada:
  - novo helper `src/lib/whatsapp-warmup.ts`
    - interpreta `metadata.warmup_*` do canal
    - reaplica caps conservadores em criacao e disparo de campanhas
  - `src/lib/whatsapp-provider.ts`
    - `resolveWhatsAppChannel` agora expõe `metadata`
  - `src/app/api/campanhas/route.ts`
    - salva `whatsapp_number_id` na campanha na hora da criacao
    - ja clampa os parametros usando a politica de warm-up do canal default
  - `src/app/api/campanhas/[id]/disparar/route.ts`
    - relê o canal da campanha
    - reaplica caps de warm-up no backend
    - grava `whatsapp_number_id` em `campanha_mensagens`
  - `src/app/(dashboard)/campanhas/page.tsx`
    - ganhou aviso explicando que o backend pode impor caps de warm-up automaticamente
  - `supabase/migrations/033_whatsapp_warmup_and_drafts.sql`
    - relaxa constraints de `whatsapp_numbers` para permitir canal `Twilio`/`Z-API` inativo sem credenciais completas
  - `src/app/api/admin/tenants/[id]/whatsapp-numbers*.ts`
    - passaram a aceitar canal rascunho quando `ativo = false`
  - `src/app/admin/[id]/page.tsx`
    - mostra badge `Warm-up`
    - documenta que canal pausado pode ficar em rascunho enquanto as credenciais nao foram plugadas
- politica conservadora embutida no metadata de warm-up:
  - `limite_diario = 15`
  - `tamanho_lote = 5`
  - `pausa_entre_lotes_s = 600`
  - `delay_min_ms = 60000`
  - `delay_max_ms = 180000`
- operacional:
  - migration `033` aplicada diretamente no operacional `lrqvvxmgimjlghpwavdb`
  - canal rascunho criado para o tenant `Fluxrow`:
    - `id = 95e644e6-5b1b-4add-982a-2e9172ee3798`
    - `label = Z-API Warm-up 41984233554`
    - `phone = +5541984233554`
    - `provider = zapi`
    - `ativo = false`
    - `is_default = false`
    - metadata de warm-up preenchida
- proximo passo:
  - amanha, preencher `instance_id` e `instance_token` no canal rascunho do admin
  - ativar o canal `Z-API`
  - testar envio humano primeiro
  - so depois disparar campanha curta com o warm-up ativo

## Atualizacao de 2026-03-30 — Edicao operacional do lead no detalhe e no drawer

- o usuario reportou uma lacuna operacional: era possivel ver o lead em detalhe e no drawer, mas nao editar os dados diretamente quando novas informacoes chegavam pela conversa
- leitura do codigo confirmou que:
  - `src/app/api/leads/[id]/route.ts` expunha apenas `GET`
  - o detalhe do lead e o drawer nao tinham qualquer CTA de edicao
- correcao aplicada:
  - `src/app/api/leads/[id]/route.ts`
    - ganhou `PATCH`
    - whitelist de campos editaveis
    - validacao basica de `nome` e `status`
    - persistencia direta no lead com `updated_at`
  - novo componente `src/components/editar-lead-modal.tsx`
    - modal compartilhado para editar:
      - contato/CRM
      - beneficio
      - perfil
      - pagamento
      - potencial
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - novo CTA `Editar dados`
    - atualiza a UI local com merge do retorno salvo
  - `src/components/lead-drawer.tsx`
    - novo CTA `Editar dados`
    - reutiliza o mesmo modal compartilhado
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar no browser a edicao pelo detalhe do lead
  - testar no browser a mesma edicao pelo drawer
  - confirmar se vale adicionar historico/audit trail campo-a-campo depois

## Atualizacao de 2026-03-30 — Prioridade de produto fora do bloco WhatsApp

- o usuario pediu uma leitura objetiva do que ainda falta fora do WhatsApp
- consolidacao de prioridade:
  - critico:
    - multi-tenant residual / definitivo
    - provider WhatsApp oficial/real bem governado
  - maior ganho de UX:
    - inbox humana avancada
    - agendamentos operacionais
  - maior ganho executivo:
    - saúde do tenant no admin
    - financeiro preditivo
- plano de 2 semanas registrado no `ROADMAP.md`:
  - semana 1:
    - multi-tenant residual
    - inbox humana avancada
    - fluxo lead <-> inbox
  - semana 2:
    - agendamentos operacionais
    - saúde do tenant
    - preparação de campanhas inteligentes
- leitura pratica:
  - se o WhatsApp estiver operacional, o bloco mais bonito de produto a seguir e a `Inbox Humana Avançada`

## Atualizacao de 2026-03-30 — Inbox humana com estados operacionais

- enquanto o chip da `Z-API` nao chegava, o usuario pediu para seguir com o restante do produto
- foi atacado o primeiro ganho grande fora do WhatsApp: transformar a `Caixa de Entrada` em fila humana mais real
- mudancas aplicadas:
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
    - filtros novos:
      - `Todas`
      - `Agente`
      - `Atendimento`
      - `Aguardando`
      - `Resolvidas`
      - `Portal`
    - badge/status agora reconhece:
      - `agente`
      - `humano`
      - `aguardando_cliente`
      - `resolvido`
      - `encerrado`
    - card da conversa mostra quando a thread esta em fila humana e desde quando
    - painel ganhou acoes:
      - `Assumir conversa`
      - `Aguardar cliente`
      - `Resolver`
      - `Retomar atendimento`
      - `Reabrir conversa`
      - `Devolver ao agente`
    - mensagem manual fica disponivel apenas em `humano`; `aguardando_cliente` e `resolvido` passam a ser estados operacionais de fila, nao apenas variacoes cosmeticas
    - ao abrir uma conversa com nao lidas, a inbox zera `nao_lidas` via `mark_read`
  - `src/app/api/conversas/[id]/route.ts`
    - `PATCH` deixou de aceitar `body` cru
    - agora sanitiza acoes explicitas e controla `assumido_por`, `assumido_em` e `nao_lidas`
  - `src/app/api/webhooks/twilio/route.ts`
    - se o cliente responder a uma thread em `aguardando_cliente` ou `resolvido`, a conversa volta automaticamente para `humano`
  - `src/app/api/admin/tenants/[id]/metricas/route.ts`
    - contagem de conversas humanas agora inclui `aguardando_cliente`
  - `src/app/admin/[id]/page.tsx`
    - resumo de ultimas conversas ganhou label correta para `aguardando_cliente` e `resolvido`
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar no browser o ciclo completo:
    - assumir
    - responder
    - marcar aguardando cliente
    - responder pelo WhatsApp
    - confirmar reabertura automatica para `humano`
  - depois retomar a ativacao real do canal `Z-API`

## Atualizacao de 2026-03-30 — Agendamentos operacionais como fila de trabalho

- enquanto o usuario validava a inbox humana, foi atacado o proximo bloco fora do WhatsApp: `Agendamentos`
- mudancas aplicadas:
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - status reconhecidos:
      - `agendado`
      - `confirmado`
      - `remarcado`
      - `realizado`
      - `cancelado`
    - a tela deixou de ser uma lista unica e passou a separar:
      - `Fila que precisa confirmacao`
      - `Confirmados`
      - `Histórico recente`
    - quick actions novas:
      - confirmar
      - remarcar com `datetime-local` inline
      - marcar como realizado
      - cancelar
    - para admin:
      - reatribuicao inline do responsável do agendamento via `/api/usuarios`
    - a card tambem destaca `Precisa atenção` para reunioes de hoje ou atrasadas que ainda nao foram concluidas/canceladas
  - `src/app/api/agendamentos/[id]/route.ts`
    - agora usa `getTenantContext`
    - aplica filtro por `tenant_id`
    - valida acesso ao lead para nao-admin
    - aceita `usuario_id` para reatribuicao por admin
    - se `data_hora` mudar sem status explicito, marca como `remarcado`
    - sincroniza status do lead:
      - `realizado` -> `converted`
      - `agendado` / `confirmado` / `remarcado` -> `scheduled`
      - `cancelado` -> `awaiting` quando o lead ainda estava `scheduled`
    - `DELETE` tambem ficou tenant-aware e reverte o lead para `awaiting`
- validacao:
  - `npm run build` passou
- proximo passo:
  - testar no browser:
    - confirmar um agendamento
    - remarcar com data nova
    - reatribuir responsável (como admin)
    - cancelar e observar o reflexo no lead
  - depois seguir para ativacao real do canal `Z-API`

## Atualizacao de 2026-03-30 — Saúde do tenant no admin com recorte tenant-aware

- com a `Z-API` ainda sem conectar, o proximo bloco puxado foi a leitura executiva do tenant no admin
- correcao importante feita junto:
  - `src/app/api/admin/tenants/[id]/metricas/route.ts` agora ancora as metricas em `tenant_id`
  - antes disso, varias contagens estavam vulneraveis a ruído global por nao filtrar corretamente
- novas metricas expostas:
  - `ultimoAcessoEquipe`
  - `usuariosAtivos7d`
  - `conversas7d`
  - `agendamentosPendentes`
  - `riscoOperacional`
  - `resumoSaude`
- `src/app/admin/[id]/page.tsx` ganhou:
  - bloco `Saúde do tenant`
  - badge de risco operacional
  - cards de acesso/atividade recente
  - resumo operacional com pendencias e adocao da equipe
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no browser se o tenant `Fluxrow` aparece com leitura coerente de ultimo acesso, usuarios ativos e conversas recentes
  - depois retomar o trilho `Z-API`

## Regra Permanente de Continuidade

- toda sessao deve atualizar `docs/CODEX_HANDOFF.md`
- toda sessao deve atualizar `docs/ROADMAP.md` se mudar fase, prioridade ou status
- toda sessao deve atualizar `docs/LEARNINGS.md` se surgir regra tecnica, de produto ou compatibilidade
- toda sessao deve revisar `docs/SESSION_BRIEF.md` para manter o proximo passo claro
- toda sessao deve preservar links cruzados entre `INDEX`, `MASTER`, `ROADMAP`, `LEARNINGS`, `SESSION_BRIEF` e `CODEX_HANDOFF`
- ao final, deve rodar `scripts/sync-obsidian.sh "<tema>" "<proximo passo>"`
- no inicio da proxima sessao, deve rodar `scripts/resume-context.sh`

## Atualizacao de 2026-03-30 — Agendamento manual com entrada humana

- foi corrigida uma lacuna de produto importante: a API ja permitia criar agendamento manual, mas a interface ainda nao dava esse caminho para o operador
- mudancas aplicadas:
  - `src/components/novo-agendamento-modal.tsx`
    - modal unico de criacao manual com:
      - selecao de lead
      - data/hora
      - duracao
      - observacoes
      - honorario
      - responsavel
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - novo CTA `Novo agendamento`
  - `src/app/(dashboard)/leads/[id]/page.tsx`
    - novo CTA `Agendar consulta`
  - `src/components/lead-drawer.tsx`
    - novo CTA `Agendar`
  - `src/app/api/agendamentos/route.ts`
    - `GET` agora filtra explicitamente por `tenant_id`
    - `POST` agora valida lead e responsavel dentro do tenant atual
    - novos agendamentos passam a gravar `tenant_id`
  - `src/app/api/leads/route.ts`
    - `GET` novo tenant-aware para busca curta de leads no modal global
- impacto operacional:
  - o humano consegue marcar consulta assim que a conversa avancar, sem depender do agente
  - o fluxo lead -> agenda ficou direto dentro do sistema
- refinamento aplicado em seguida:
  - `src/components/novo-agendamento-modal.tsx`
    - busca de lead passou a reagir ao texto digitado e ganhou CTA explicito de busca
    - o select agora mostra tambem email quando disponivel
    - novo campo `E-mail da reunião` permite sobrescrever o email do lead so para o convite/Meet
  - `src/app/api/leads/route.ts`
    - a busca curta passou a aceitar tambem leads com `lgpd_optout` nulo (`neq true`)
    - payload leve agora retorna `email`
  - `src/app/api/agendamentos/route.ts`
    - `POST` passou a aceitar `email_reuniao` como override do `emailLead` enviado ao Google Calendar
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar se o produto deve apenas sinalizar ou bloquear mais de um agendamento futuro ativo por lead
  - validar no browser a busca por nome/telefone e o override de email do convite

## Atualizacao de 2026-03-30 — Calendario mensal na agenda operacional

- a tela `src/app/(dashboard)/agendamentos/page.tsx` ganhou uma segunda camada de leitura:
  - visao mensal de calendario
  - navegacao de mes
  - eventos com cor por status
  - clique no evento para abrir um painel/modal
- o modal do calendario reaproveita a operacao existente:
  - confirmar
  - remarcar
  - marcar como realizado
  - cancelar
  - reatribuir responsável
  - abrir conversa
  - abrir WhatsApp
  - abrir Meet
- a fila operacional abaixo foi preservada, entao a pagina agora junta:
  - leitura visual de agenda
  - fila acionavel por status
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no browser a experiencia do calendario em desktop e mobile
  - decidir depois se vale abrir tambem visoes de semana/dia

## Atualizacao de 2026-03-30 — Busca do lead no agendamento manual

- o modal de `Novo agendamento` ainda podia aparentar falha de busca mesmo com nome/telefone corretos
- a rota `src/app/api/leads/route.ts` foi simplificada para a busca operacional:
  - busca um conjunto curto tenant-aware no banco
  - filtra no servidor com:
    - normalizacao de acentos
    - texto em lowercase
    - telefone em digitos
  - deixa de depender do `or(...ilike...)` mais fragil para esse caso
- o filtro de opt-out tambem foi mantido seguro sem esconder leads com valor nulo por acidente
- validacao:
  - `npm run build` passou
- proximo passo:
  - retestar no browser a busca por nome e telefone no modal de agendamento

## Atualizacao de 2026-03-31 — Picker de lead no agendamento manual

- a busca do modal ainda podia falhar no produto mesmo com lead existente e nome correto
- a ausencia de email no lead nao era a causa raiz
- ajustes aplicados:
  - `src/app/api/leads/route.ts`
    - `GET` agora aceita `scope=scheduling`
    - usa service role com filtro explicito por `tenant_id`
    - em `scope=scheduling`, deixa de restringir a busca por `responsavel_id` para usuarios nao-admin
  - `src/app/api/busca/route.ts`
    - passou a usar `tenant_id` explicito para leads, documentos e conversas
  - `src/components/novo-agendamento-modal.tsx`
    - a busca agora consulta tanto `/api/leads` quanto `/api/busca`
    - os resultados sao mesclados e exibidos em lista clicavel com nome, telefone, email e status
    - o fluxo deixa de depender do `select` nativo
- impacto operacional:
  - o agendamento manual fica livre da suposicao de que o lead precisa ter email para aparecer
  - o picker de lead fica mais previsivel para nome com acento, telefone e leads importados/manuals dentro do mesmo tenant
- validacao:
  - `npm run build` passou
- proximo passo:
  - retestar no browser o picker de lead no modal de agendamento manual
  - se ainda falhar para leads muito antigos/importados, inspecionar payload real do endpoint em runtime

- refinamento aplicado na mesma trilha:
  - `src/app/api/leads/route.ts`
    - quando existe `q`, a rota agora faz busca real no banco com `ilike` antes do filtro final no servidor
    - isso evita depender apenas da amostra recente por `updated_at`, que podia esconder leads antigos/importados no modal global de agendamento
  - `src/components/novo-agendamento-modal.tsx`
    - a busca agora ignora respostas antigas de requests anteriores
    - isso evita que a resposta do carregamento inicial ou de um termo parcial sobrescreva o resultado correto digitado pelo operador na aba de agendamentos

## Atualizacao de 2026-03-31 — Criacao manual de agendamento com erro real

- o modal de agendamento pelo contexto do lead ainda podia falhar com erro generico sem explicar a causa
- ajustes aplicados:
  - `src/app/api/agendamentos/route.ts`
    - `POST` agora usa service role para validar lead/responsavel, inserir o agendamento e atualizar o status do lead com escopo explicito por `tenant_id`
    - a rota ganhou `try/catch` externo e passa a devolver erro legivel em JSON quando algo quebrar
  - `src/components/novo-agendamento-modal.tsx`
    - o submit agora tenta ler o corpo bruto da resposta antes do fallback generico
    - se o backend devolver mensagem real, ela passa a aparecer no modal
- validacao:
  - `npm run build` passou
- proximo passo:
  - retestar a criacao do agendamento pelo detalhe do lead
  - confirmar qual mensagem especifica aparece caso ainda haja falha

## Atualizacao de 2026-03-31 — Drift de schema em `leads.email`

- a mensagem real do modal revelou a causa raiz: `column leads.email does not exist`
- conclusao:
  - o codigo ja passou a assumir `email` em `leads`
  - o schema operacional atual ainda nao tem essa coluna
  - isso explicava ao mesmo tempo:
    - falha ao criar agendamento pelo detalhe do lead
    - busca vazia na aba de agendamentos, porque `GET /api/leads` tambem selecionava `email`
- correcao imediata aplicada:
  - `src/app/api/agendamentos/route.ts`
    - remove dependencia de `lead.email`
    - usa apenas `email_reuniao` como attendee do lead nesse fluxo
  - `src/app/api/leads/route.ts`
    - deixa de selecionar/filtrar por `email`
  - `src/app/api/leads/[id]/route.ts`
    - deixa de tentar atualizar `payload.email` enquanto o schema operacional nao for alinhado
- correcao canonica preparada:
  - nova migration `supabase/migrations/034_leads_email_foundation.sql`
    - adiciona `email` em `leads`
    - cria indice trigram para busca
- observacao operacional:
  - a migration `034` foi criada no repo, mas ainda nao foi aplicada no operacional nesta sessao

## Atualizacao de 2026-03-31 — Busca digitada no modal global de agendamento

- validacao do usuario em runtime:
  - o agendamento criado a partir do detalhe do lead funcionou
  - o convite por e-mail chegou corretamente no e-mail sobrescrito da reuniao
  - o problema residual ficou restrito ao modal de `Novo agendamento` aberto pela aba `/agendamentos`
- causa raiz encontrada no codigo:
  - a rota `GET /api/leads` ainda aplicava `email.ilike` quando havia texto digitado
  - como `leads.email` nao existe no schema operacional atual, a busca digitada quebrava silenciosamente
  - sem texto digitado, a lista inicial aparecia porque esse filtro nao era executado
- correcao aplicada:
  - `src/app/api/leads/route.ts`
    - remover `email.ilike` da busca curta tenant-aware
  - alinhamentos complementares que ficaram no mesmo pacote:
    - `src/lib/tenant-context.ts`
      - `getAccessibleLeadIds` e `canAccessLeadId` agora sempre respeitam `tenant_id`
    - `src/app/(dashboard)/leads/page.tsx`
      - a tela de leads passou a filtrar explicitamente por `tenant_id`
    - `src/app/api/relatorios/route.ts`
    - `src/app/api/portal/threads/route.ts`
      - ajustados para trabalhar com `accessibleLeadIds` sempre como array tenant-aware
- impacto operacional:
  - a busca digitada do modal global de agendamento deixa de depender de uma coluna inexistente
  - as superfícies de leads e os fluxos dependentes passam a usar o mesmo recorte tenant-aware de forma mais consistente
- validacao:
  - `npm run build` passou
- proximo passo:
  - retestar no browser a busca digitada no modal de `Novo agendamento` dentro da aba `/agendamentos`

## Atualizacao de 2026-03-31 — Pipeline operacional unificado

- enquanto o chip da Z-API ainda nao estava ativo, o bloco seguinte puxado foi a consolidacao do pipeline entre comercial e operacao
- ajustes aplicados:
  - `src/app/api/relatorios/route.ts`
    - novo bloco `pipelineOperacional`
    - cruza por `lead_id`:
      - conversas
      - fila humana
      - agendamentos
      - contratos
    - retorna:
      - leads com conversa
      - leads em fila humana
      - aguardando cliente
      - resolvidos
      - com agendamento
      - confirmados
      - realizados
      - com contrato
      - valor em contratos
      - ticket medio por lead contratado
      - resumo textual
  - `src/app/(dashboard)/relatorios/page.tsx`
    - a aba `Funil` agora tem uma secao de `Pipeline operacional unificado`
  - `src/app/(dashboard)/dashboard/page.tsx`
    - queries de leads e stats alinhadas com filtro explicito por `tenant_id`
- impacto operacional:
  - o time passa a enxergar no mesmo lugar quanto do lead ja virou conversa, fila humana, agenda e contrato
  - o dashboard deixa de depender de leitura implicita do piloto para resumir o tenant atual
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no browser a aba `Funil` de `/relatorios`
  - decidir depois se o pipeline vira tambem uma fila clicavel por etapa

## Atualizacao de 2026-04-01 — Pipeline virou fila clicavel

- o bloco de pipeline em `/relatorios` foi elevado de insight para navegacao operacional
- ajustes aplicados:
  - `src/app/(dashboard)/relatorios/page.tsx`
    - cards do pipeline agora sao clicaveis
    - cada etapa aponta para uma fila real
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
    - passou a ler `tab` via `useSearchParams`
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - passou a ler `status` via `useSearchParams`
    - exibe faixa de filtro ativo e permite limpar o recorte
  - `src/app/(dashboard)/financeiro/page.tsx`
    - passou a ler `filtro` via `useSearchParams`
    - exibe faixa de filtro ativo e permite limpar o recorte
- mapeamento atual:
  - `Com conversa` -> inbox todas
  - `Fila humana` -> inbox humano
  - `Aguardando cliente` -> inbox aguardando_cliente
  - `Resolvidos` -> inbox resolvido
  - `Agendados` -> agendamentos pendentes
  - `Confirmados` -> agendamentos confirmados
  - `Realizados` -> agendamentos finalizados
  - `Com contrato` -> financeiro ativo
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar os cliques no browser
  - decidir depois se `Leads` tambem deve aceitar filtros por URL

## Atualizacao 2026-04-02 - Confirmacao de presenca no portal

- a frente mobile/core ganhou uma acao concreta e segura para a agenda do cliente
- arquivos principais:
  - `src/app/api/portal/[token]/confirmacao/route.ts`
  - `src/app/portal/[token]/page.tsx`
- comportamento:
  - o card da proxima consulta agora permite `Confirmar presença`
  - a acao atualiza o agendamento para `confirmado`
  - cria evento `confirmacao_presenca_cliente` em `portal_timeline_events`
  - gera notificacao interna para a equipe
- racional:
  - remarcacao continua como pedido
  - confirmacao e automacao leve de baixo risco, boa candidata para acontecer direto no app do cliente
- proximo passo:
  - validar confirmacao no celular
  - depois evoluir uma camada de novidades/notificacoes do portal

## Atualizacao 2026-04-03 - Camada leve de novidades no portal

- o portal do cliente agora ajuda a retomar contexto quando a pessoa volta ao app
- arquivo principal:
  - `src/app/portal/[token]/page.tsx`
- ajustes aplicados:
  - bloco `Novidades desde seu ultimo acesso` na home do portal
  - resumo rapido de:
    - eventos recentes da timeline
    - mensagens nao lidas da equipe
    - pendencias de documento
  - CTAs diretos para abrir `Mensagens` e `Documentos`
  - o baseline de comparacao foi fixado no `ultimo_acesso_em` inicial da sessao
- racional:
  - sem esse baseline fixo, qualquer refetch interno podia atualizar o corte e esconder novidades ainda durante a mesma sessao
  - a camada continua leve e sem push, mas ja entrega memoria operacional para o cliente
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no browser/celular um retorno real ao portal depois de nova mensagem, nova pendencia e novo evento
  - depois decidir se vale evoluir para push/notificacao nativa

## Atualizacao 2026-04-03 - Home do portal virou fila acionavel

- a camada de novidades evoluiu de resumo para orientacao pratica
- arquivo principal:
  - `src/app/portal/[token]/page.tsx`
- ajustes aplicados:
  - novo bloco `O que precisa da sua atencao agora`
  - fila priorizada para:
    - confirmar consulta
    - abrir mensagens da equipe
    - enviar documentos pendentes
  - CTA `Enviar agora` em cada pendencia da home
  - CTA `Abrir mensagens` no card de contato com a equipe
- racional:
  - badge e resumo so valem quando apontam para uma fila/acao real
  - isso reduz friccao principalmente para cliente/familiar que volta ao portal pelo celular sem querer “explorar” a interface
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar no celular a ordem percebida das acoes
  - decidir depois se o item mais urgente precisa de destaque visual adicional

## Atualizacao 2026-04-03 - Fila do portal ganhou hierarquia visual final

- o portal mobile fechou mais uma rodada de UX antes de abrir a proxima frente
- arquivo principal:
  - `src/app/portal/[token]/page.tsx`
- ajustes aplicados:
  - o primeiro item da fila acionavel agora recebe destaque visual maior
  - cada acao ganhou selo curto de prioridade
  - abas de `Mensagens` e `Documentos` agora mostram badge visual de pendencia
  - quando nao existe nenhuma acao aberta, a home mostra estado positivo `Tudo em dia por aqui`
- racional:
  - no mobile, a home precisa deixar obvio o que fazer agora e tambem sinalizar quando nao ha nada urgente
  - isso reduz ansiedade do cliente e melhora leitura rapida de retorno
- validacao:
  - `npm run build` passou
- conclusao pratica:
  - a home do portal esta suficientemente madura para a equipe parar o polish e avancar para outras evolucoes do roadmap

## Atualizacao 2026-04-03 - Sidebar e pendencias operacionais ficaram tenant-aware de verdade

- antes de abrir a proxima fase grande, foi corrigido um ponto silencioso de confiabilidade operacional
- arquivo principal:
  - `src/app/api/pendencias/route.ts`
- problema atacado:
  - o sidebar dependia de `/api/pendencias`, mas a rota antiga:
    - nao usava o contexto tenant-aware canonico
    - tentava contar agendamentos por campos (`visualizado`, `criado_por = agente`) que nao estavam fechados no codigo/schema local
- correcao aplicada:
  - usar `getTenantContext`
  - usar `getAccessibleLeadIds`
  - contar apenas filas reais e existentes:
    - `portal_mensagens` nao lidas do cliente
    - `conversas` em `humano` / `aguardando_cliente` com `nao_lidas > 0`
    - `agendamentos` em `agendado` / `remarcado`
- impacto:
  - o badge da sidebar passa a refletir operacao real do usuario/tenant atual
  - reduz risco de leitura cruzada e de badge quebrado por campos residuais
- validacao:
  - `npm run build` passou
- proximo passo:
  - a proxima frente grande pode seguir para multi-tenant residual ou outra fase operacional sem esse passivo escondido

## Atualizacao 2026-04-03 - Notificacoes sairam do modo global

- outro residual sensivel de multi-tenant foi fechado logo em seguida
- arquivo principal:
  - `src/app/api/notificacoes/route.ts`
- problema atacado:
  - a rota antiga lia e atualizava `notificacoes` via service role sem autenticar o usuario do produto e sem recorte por tenant
- correcao aplicada:
  - autenticar via `createClient()` + `getTenantContext`
  - usar service role apenas depois de resolver o tenant do usuario
  - `GET` agora lista apenas `notificacoes` do `tenant_id` atual
  - `PATCH` agora marca lidas apenas dentro do tenant atual
- impacto:
  - o sino de notificacoes deixa de ser uma superficie de vazamento global
  - a leitura transversal de operacao fica mais alinhada ao escritorio certo
- validacao:
  - `npm run build` passou
- leitura de continuidade:
  - multi-tenant residual continua sendo a frente certa, mas ja perdemos mais uma fonte real de leitura cruzada

## Atualizacao 2026-04-03 - Relatorios de campanhas voltaram a obedecer o tenant

- a trilha de multi-tenant residual seguiu para uma superficie analitica que ainda podia misturar contexto
- arquivos principais:
  - `src/app/api/relatorios/route.ts`
  - `src/app/api/relatorios/roi/route.ts`
- problema atacado:
  - `/api/relatorios` somava KPIs de campanhas sem `tenant_id`
  - `/api/relatorios/roi` validava so o usuario autenticado e listava campanhas sem ancora canonica de tenant
- correcao aplicada:
  - aplicar filtro por `tenant_id` nas campanhas do resumo executivo
  - reancorar a rota de ROI em `getTenantContext`
  - manter o recorte por `responsavel_id` para usuario nao-admin
  - devolver estado vazio seguro no ROI quando o usuario nao tiver `tenantId` configurado
- impacto:
  - o resumo de campanhas em `/relatorios` e a aba dedicada de ROI passam a ler o mesmo universo de dados do escritorio atual
  - reduz risco de insight falso ou comparativo contaminado por campanha de outro tenant
- validacao:
  - `npm run build` passou
- leitura de continuidade:
  - multi-tenant residual continua sendo a frente certa, agora com mais uma superficie transversal de campanha fechada

## Atualizacao 2026-04-03 - Portal links e documentos deixaram de confiar em auth sem guarda por lead

- a auditoria multi-tenant residual avancou para rotas sensiveis de acesso a lead
- arquivos principais:
  - `src/app/api/portal/link/[leadId]/route.ts`
  - `src/app/api/portal/compartilhar/route.ts`
  - `src/app/api/portal/nao-lidas/route.ts`
  - `src/app/api/leads/[id]/documentos/route.ts`
  - `src/app/api/leads/[id]/documentos/upload/route.ts`
  - `src/app/api/leads/[id]/gerar-documento/route.ts`
- problema atacado:
  - varias dessas rotas aceitavam apenas usuario autenticado e operavam por `leadId` ou `documento_id` sem validar acesso canonico ao lead
- correcao aplicada:
  - usar `getTenantContext`
  - aplicar `canAccessLeadId` onde a rota trabalha com um lead especifico
  - recontar `/api/portal/nao-lidas` apenas sobre `accessibleLeadIds`
  - validar o `lead_id` do documento antes de compartilhar com o cliente
  - gerar documentos usando o `usuarioId` canonico do contexto atual
- impacto:
  - links do portal, compartilhamento de documentos e operacoes de documentos do lead deixam de depender apenas da autenticacao do app
  - reduz risco de acao cruzada por id conhecido ou badge do portal contaminado por leads fora do escopo do usuario
- validacao:
  - `npm run build` passou
- leitura de continuidade:
  - a auditoria residual continua valendo para outras rotas antigas de lead que ainda usam `auth.getUser()` sem guarda canonica

## Atualizacao 2026-04-03 - Anotacoes e calculadora do lead alinharam auth ao contexto canonico

- a passada residual fechou mais duas rotas antigas do detalhe do lead
- arquivos principais:
  - `src/app/api/leads/[id]/anotacoes/route.ts`
  - `src/app/api/leads/[id]/calculadora/route.ts`
- problema atacado:
  - ambas aceitavam apenas usuario autenticado e operavam diretamente por `leadId`
  - `anotacoes` ainda buscava `usuarios` por `auth_user_id`, diferente do contrato atual usado em `tenant-context`
- correcao aplicada:
  - exigir `getTenantContext`
  - validar `canAccessLeadId`
  - gravar anotacao com `context.usuarioId`
- impacto:
  - o detalhe do lead fica menos dependente de convencoes antigas de auth
  - reduz risco de acesso cruzado e de gravacao com identificador de usuario inconsistente
- validacao:
  - `npm run build` passou
- leitura de continuidade:
  - a frente multi-tenant residual pode seguir depois para outras excecoes mais pontuais, mas o bloco legado mais obvio de `leadId` ja foi bastante enxugado

## Atualizacao 2026-04-03 - Documentos do agente ficaram tenant-aware por usuario

- a auditoria residual saiu do detalhe do lead e pegou uma superficie que ainda era global por acidente
- arquivo principal:
  - `src/app/api/agente/documentos/route.ts`
- problema atacado:
  - `GET` listava toda a tabela `agent_documents` com service role, sem autenticar o usuario do produto
  - `DELETE` removia por `id` sem validar se o documento pertencia ao escritorio atual
- correcao aplicada:
  - autenticar via `getTenantContext`
  - resolver os `usuarios.id` do tenant atual
  - listar e deletar apenas documentos vinculados a esses usuarios
  - gravar novos documentos com `context.usuarioId`
- impacto:
  - a base de conhecimento do agente deixa de ser uma superficie global entre escritorios
  - o risco cai bastante, mesmo sem a tabela ter `tenant_id` proprio ainda
- validacao:
  - `npm run build` passou
- leitura de continuidade:
  - esta rota agora esta `tenant-aware`, mas ainda nao `tenant-isolated`; uma futura migration com `tenant_id` em `agent_documents` seria o fechamento ideal

## Atualizacao 2026-04-03 - Entrada de leads e importacao alinharam auth ao tenant-context

- a passada residual fechou um bloco mais de consistencia do que de vazamento direto
- arquivos principais:
  - `src/app/api/leads/route.ts`
  - `src/app/api/import/route.ts`
- problema atacado:
  - as duas rotas ainda resolviam `usuarios` manualmente via `auth.getUser()` + query extra, em vez de usar o contexto canonico do produto
- correcao aplicada:
  - trocar a resolucao manual por `getTenantContext`
  - usar `context.usuarioId`, `context.tenantId` e `context.isAdmin` como fonte da verdade
  - manter o comportamento de negocio de cadastro manual e importacao de listas
- impacto:
  - menos divergencia entre fluxos antigos e a fundacao tenant-aware atual
  - reduz risco de futuras rotas irmas seguirem copiando o padrao manual de auth/tenant
- validacao:
  - `npm run build` passou
- leitura de continuidade:
  - o que sobra com `auth.getUser()` em `api` agora esta basicamente concentrado em `perfil` e `session`, que sao superfícies de outra natureza

## Atualizacao 2026-04-03 - Nova frente do core formalizada para proxima execucao

- foi criada a referencia canônica da próxima fase em:
  - `docs/AGENTES_CADENCIAS_COLABORACAO_PLAN.md`
- tese central:
  - o PrevLegal deve evoluir para um sistema operacional conversacional do escritorio
- pilares oficiais da proxima fase:
  - agentes por tenant
  - cadencias/follow-ups
  - colaboracao interna contextual
- leitura estratégica importante:
  - isso fortalece o core atual do produto
  - nao entra como modulo premium
  - a arquitetura deve nascer de forma que o motor possa ser reaproveitado no futuro para outras verticais juridicas, sem descaracterizar o foco previdenciario agora
- ordem recomendada:
  - Fase A: colaboracao interna minima
  - Fase B: follow-up engine v1
  - Fase C: multiagente por tenant
  - Fase D: orquestracao avancada
- proximo passo sugerido:
  - transformar a Fase A em backlog tecnico e modelo de dados executavel

## Atualizacao 2026-04-03 - Fase A da colaboracao interna foi especificada

- a proxima execucao do core ja tem um recorte tecnico bem definido em:
  - `docs/COLABORACAO_INTERNA_FASE_A_SPEC.md`
- escopo aprovado para a primeira entrega:
  - thread interna por lead
  - mensagens/notas internas
  - handoff simples
  - task interna
  - resumo interno no detalhe da conversa
- leitura importante de implementacao:
  - aproveitar a base existente de `conversas.status`, `assumido_por` e `assumido_em`
  - evitar chat interno generico
  - fazer o centro da colaboracao nascer no lead e nao num feed solto
- proximo passo sugerido:
  - abrir a implementação com migration SQL + rotas API do lead interno

## Atualizacao 2026-04-03 - Fase A ganhou migration, APIs e card no detalhe do lead

- a execucao da colaboracao interna minima foi iniciada de verdade
- arquivos principais:
  - `supabase/migrations/038_internal_collaboration_phase_one.sql`
  - `src/lib/internal-collaboration.ts`
  - `src/app/api/leads/[id]/interno/route.ts`
  - `src/app/api/leads/[id]/interno/mensagens/route.ts`
  - `src/app/api/leads/[id]/interno/tasks/route.ts`
  - `src/app/api/leads/[id]/interno/tasks/[taskId]/route.ts`
  - `src/app/api/leads/[id]/interno/handoff/route.ts`
  - `src/app/(dashboard)/leads/[id]/page.tsx`
- foundation criada:
  - `lead_threads_internas`
  - `lead_mensagens_internas`
  - `lead_tasks`
  - `lead_handoffs`
- comportamento novo:
  - `GET /api/leads/[id]/interno` devolve thread, historico, tasks, handoffs e usuarios do tenant
  - `POST /api/leads/[id]/interno/mensagens` cria nota interna
  - `POST /api/leads/[id]/interno/tasks` cria task interna
  - `PATCH /api/leads/[id]/interno/tasks/[taskId]` atualiza status e campos basicos da task
  - `POST /api/leads/[id]/interno/handoff` transfere responsabilidade, grava historico interno e atualiza `conversas.status` quando o destino for compativel
  - task e handoff agora validam o usuario de destino dentro do tenant atual
- UI nova:
  - o detalhe do lead ganhou o card `Coordenacao interna` com dono atual, nota interna, criacao de task, handoff e historico
- validacao:
  - `npm run build` passou
- dependencia conhecida:
  - a feature ainda depende da aplicacao da migration `038_internal_collaboration_phase_one.sql` no banco operacional
- proximo passo sugerido:
  - aplicar a `038`
  - refletir um resumo interno minimo na `Caixa de Entrada`

## Atualizacao 2026-04-03 - Migration 038 aplicada e resumo interno na Caixa de Entrada

- migration `038_internal_collaboration_phase_one.sql` aplicada com sucesso no banco operacional `lrqvvxmgimjlghpwavdb`
- tabelas criadas:
  - `lead_threads_internas`
  - `lead_mensagens_internas`
  - `lead_tasks`
  - `lead_handoffs`
- a `Caixa de Entrada` agora exibe uma strip de coordenação interna ao selecionar uma conversa
- arquivo alterado:
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
- comportamento:
  - quando a conversa tem um lead associado, busca `GET /api/leads/[id]/interno`
  - exibe strip compacta abaixo do header com:
    - dono atual da thread interna
    - contagem de tasks abertas/em andamento
    - última nota interna (truncada)
    - link direto para `Ver coordenação →` apontando para `/leads/[id]#interno`
  - strip só aparece se houver ao menos um dado (dono, task ou nota)
- validacao:
  - `npm run build` passou
- proximo passo sugerido:
  - validar em produção se a strip aparece corretamente ao selecionar uma conversa com lead associado
  - depois decidir se vale evoluir para um painel lateral recolhível com mais detalhes da coordenação interna

## Atualizacao 2026-04-03 - Painel lateral de coordenacao interna na inbox

- a Caixa de Entrada ganhou um painel lateral recolhivel de coordenacao interna
- arquivo alterado:
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
- comportamento:
  - ao selecionar uma conversa com lead associado, aparece uma strip-toggle abaixo do header
  - clicar na strip abre/fecha um painel lateral direito (272px)
  - o painel exibe:
    - responsavel atual da thread interna (dono)
    - tasks abertas/em andamento com check-off direto (PATCH /api/leads/[id]/interno/tasks/[taskId])
    - notas recentes (ultimas 4, tipo comentario) com autor e tempo
    - quick note: textarea + botao "Adicionar nota" (POST /api/leads/[id]/interno/mensagens)
    - link "Ver lead →" apontando para /leads/[id]#interno
  - strip permanece visivel sempre que houver dados (dono, tasks ou nota)
  - strip exibe resumo (dono, contagem de tasks, preview da ultima nota) quando painel fechado
  - strip fica com fundo azul suave quando painel aberto
- interfaces novas: InternoTask, InternoMensagem, InternoData
- funcoes novas: fetchInternoData, adicionarNota, concluirTask
- validacao:
  - `npm run build` passou
- proximo passo sugerido:
  - validar em producao: selecionar conversa com lead, abrir painel, adicionar nota, concluir task
  - decidir proxima frente: follow-up engine (Fase B) ou outra frente do core

## Atualizacao 2026-04-05 - Fase B — Follow-up engine v1

- migration `039_followup_engine_phase_one.sql` aplicada no banco operacional `lrqvvxmgimjlghpwavdb`
- tabelas criadas:
  - `followup_rules` — regras configuráveis por tenant (nome, descricao, ativo, is_default)
  - `followup_rule_steps` — passos de cada regra (ordem, delay_horas, canal, mensagem)
  - `followup_runs` — instâncias ativas por lead (1 run ativa por lead via unique index)
  - `followup_events` — histórico de eventos por run (iniciado, step_disparado, pausado, cancelado, stops)
- rotas de API:
  - `GET/POST /api/followup/rules` — listar e criar regras com steps
  - `PATCH/DELETE /api/followup/rules/[id]` — editar/remover (bloqueio se houver runs ativas)
  - `PUT /api/followup/rules/[id]/steps` — substituir steps de uma regra
  - `GET/POST /api/leads/[id]/followup` — listar runs e ativar follow-up no lead
  - `PATCH /api/leads/[id]/followup/[runId]` — pausar/retomar/cancelar run
- componente: `src/components/followup-lead.tsx`
  - card no detalhe do lead com runs ativas
  - seletor de regra para ativar
  - resumo de steps da regra selecionada antes de confirmar
  - controles pausar/retomar/cancelar por run
  - histórico de eventos expansível por run
- encaixado em `src/app/(dashboard)/leads/[id]/page.tsx` antes da calculadora
- dependencia para disparos reais: worker/cron ainda nao implementado — runs ficam agendadas mas nao disparam mensagens automaticamente ainda
- proximo passo sugerido:
  - criar tela de configuracao de regras em `/configuracoes?tab=followup`
  - depois implementar o worker de disparo (cron ou edge function)

## Atualizacao 2026-04-05 - Tela de configuracao de regras e worker de disparo

### Tela de configuracao (/configuracoes?tab=followup)
- `src/app/(dashboard)/configuracoes/page.tsx` convertido para usar `ConfiguracoesTabs`
- componentes novos:
  - `src/components/configuracoes-tabs.tsx` — abas: Usuários / Follow-up / Geral
  - `src/components/followup-config.tsx` — CRUD completo de regras com editor de steps
- funcionalidades:
  - criar regra com N passos (delay, canal, mensagem com variáveis {nome}/{nb}/{escritorio})
  - editar regra e steps inline
  - ativar/desativar sem excluir
  - excluir (bloqueado se houver runs ativas)
  - preview da sequência de steps antes de ativar no lead

### Worker de disparo automatico
- `src/app/api/followup/worker/route.ts` — rota GET/POST protegida por `CRON_SECRET`
- `vercel.json` — cron a cada 5 minutos: `*/5 * * * *`
- comportamento:
  - busca runs com `status = ativo` e `proximo_envio_at <= now()` (até 50 por ciclo)
  - stop conditions automáticas: `lead.status = converted` → `stop_convertido`; `lead.status = lost` → `stop_perdido`
  - dispara step pelo canal (`whatsapp` via `sendWhatsAppMessage`, `portal` apenas registra evento)
  - substitui variáveis {nome}, {nb}, {escritorio} na mensagem
  - avança `proximo_step_ordem` e calcula `proximo_envio_at` do próximo step
  - conclui a run quando não há mais steps
  - registra evento em `followup_events` em todos os casos (step_disparado, step_falhou, concluido, stop_*)
- dependencia: `CRON_SECRET` precisa ser configurado no Vercel como env var
- proximo passo sugerido:
  - adicionar `CRON_SECRET` nas env vars do Vercel
  - testar: criar regra, ativar no lead, aguardar o cron disparar o step
  - depois implementar stop condition `stop_humano_assumiu` no webhook de conversas

## Atualizacao 2026-04-05 - Stop conditions automaticas do follow-up engine

### O que foi feito
- `src/app/api/webhooks/twilio/route.ts` — bloco `stop_lead_respondeu` adicionado após processar mensagem inbound
  - quando lead tem `id` e há uma `followup_run` ativa, a run é marcada como `stop_automatico` com `motivo_parada = 'Lead respondeu via WhatsApp'`
  - evento `stop_lead_respondeu` inserido em `followup_events` com canal `whatsapp` e preview da mensagem
- `src/app/api/conversas/[id]/route.ts` — bloco `stop_humano_assumiu` adicionado após update bem-sucedido da conversa
  - ativado quando `body.action === 'assume'` ou `body.status === 'humano'` com `assumido_por`
  - usa `createAdminSupabase()` (importado de `@/lib/internal-collaboration`) por segurança (service role)
  - evento `stop_humano_assumiu` inserido com `assumido_por` e `conversa_id` no metadata

### Estado atual
- Fase B 100% fechada com todos os stop conditions implementados:
  - `stop_convertido` — lead marcado como convertido (worker)
  - `stop_perdido` — lead marcado como perdido (worker)
  - `stop_lead_respondeu` — lead responde via WhatsApp (webhook)
  - `stop_automatico (stop_humano_assumiu)` — humano assume a conversa (conversas PATCH)
- Pendência operacional: `CRON_SECRET` env var no Vercel dashboard (ação manual do usuário)
- Próximo passo: Fase C — multi-agente por tenant

### Fase C — multi-agente por tenant (estrutura planejada)
- nova tabela `agentes` com campos: `id, tenant_id, nome_interno, nome_publico, descricao, objetivo, persona, prompt_base, ativo, is_default, whatsapp_number_id_default, janela_inicio, janela_fim, dias_uteis_only`
- tipos sugeridos: `triagem`, `reativacao`, `documental`, `confirmacao_agenda`, `followup_comercial`
- `GET/POST /api/agentes` — listar e criar agentes do tenant
- `PATCH/DELETE /api/agentes/[id]` — atualizar/remover
- UI em `/configuracoes?tab=agentes`
- rota responder modificada para usar agente por lead/campanha ao invés de config global

## Atualizacao 2026-04-05 - Fase C — Multi-agente por tenant

### O que foi feito
- **Migration 040** (`supabase/migrations/040_agentes_phase_c.sql`): altera tabela `agentes` (já existia com schema simples) adicionando colunas da Fase C — `nome_interno`, `nome_publico`, `persona`, `prompt_base`, `modelo`, `max_tokens`, `resposta_automatica`, `janela_inicio/fim`, `dias_uteis_only`, `is_default` + campos avançados herdados do agente global
- **Unique index** `idx_agentes_tenant_default on agentes(tenant_id) where is_default = true` — garante no máximo um agente padrão por tenant
- **APIs**:
  - `GET /api/agentes` — lista agentes do tenant
  - `POST /api/agentes` — cria agente (apenas admin)
  - `PATCH /api/agentes/[id]` — atualiza (apenas admin, verifica pertença ao tenant)
  - `DELETE /api/agentes/[id]` — exclui (apenas admin)
- **UI**: `src/components/agentes-config.tsx` — CRUD completo com lista de cards, form de criação e edição inline, seção "Configurações avançadas" recolhível; tab "Agentes" em `/configuracoes?tab=agentes`
- **Wire responder**: `src/app/api/agente/responder/route.ts` busca `agentes` com `is_default=true, ativo=true` para o tenant; se encontrar, usa as configs do agente (prompt_base, modelo, max_tokens etc.); fallback transparente para `configuracoes` global se não houver agente configurado

### Comportamento do responder após Fase C
1. Busca agente padrão do tenant na tabela `agentes`
2. Se encontrado e ativo: usa prompt_base, modelo, max_tokens, janela, dias_uteis_only, campos avançados do agente
3. Se não encontrado: usa config global da tabela `configuracoes` (comportamento anterior preservado)
4. Lógica de horário e resposta automática funciona em ambos os casos

### Próximo passo — Fase D (quando couber)
- Roteamento por campanha: coluna `agente_id` em `campanhas` para escolher agente específico
- Roteamento por estágio do lead: lógica no responder para selecionar agente por `lead.status`
- Performance: card de métricas por agente (respostas enviadas, escaladas, taxas)

## Atualizacao 2026-04-08 - Templates Seed das automacoes implementado

- a pendência direta da Fase E foi fechada na UI de automações
- arquivos alterados:
  - `src/app/api/automacoes/triggers/route.ts`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
  - `src/app/api/automacoes/triggers/seed/route.ts`
  - `src/components/automacoes/trigger-config.tsx`
- correção estrutural feita junto:
  - `GET/POST/PATCH/DELETE` de `event_triggers` deixaram de resolver tenant pelo caminho frágil `auth.getUser() -> usuarios.id`
  - agora usam `getTenantContext`, alinhando a Fase E ao contrato canônico atual do produto
- seed novo:
  - endpoint `POST /api/automacoes/triggers/seed`
  - comportamento idempotente por tenant
  - tenta popular apenas slots padrão ainda vazios:
    - `new` -> agente de triagem
    - `contacted` -> régua comercial/default
    - `scheduled` -> agente de confirmação
    - `lost` -> régua ou agente de reativação
  - só insere template quando o recurso de apoio existe e está ativo
  - se o slot já estiver ocupado, marca como `skip`
  - se faltar régua/agente compatível, devolve `indisponível` com motivo legível
- UI:
  - botão `Templates PrevLegal` deixou de ser `alert('Em breve')`
  - agora executa o seed real
  - mostra feedback visual de sucesso/erro
  - exibe resumo com contagem de inseridos, já existentes e indisponíveis
  - lista de gatilhos agora marca templates com badge `Template`
  - a ação exibida ficou mais legível usando nome real da régua/agente quando disponível
- validação:
  - `npm run build` passou
- próximo passo sugerido:
  - validar em runtime o clique do seed na tela `/automacoes`
  - depois voltar ao refinamento do modal avançado de criação/edição de gatilhos

## Atualizacao 2026-04-08 - Runtime do seed validado e modal ficou honesto com o tenant

- a validacao em runtime mostrou que o seed estava coerente com o banco operacional atual
- estado real do tenant durante o teste:
  - `followup_rules`: existe 1 regra, mas `ativo = false`
  - `agentes`: nenhum registro ativo
  - `event_triggers`: vazio
- por isso a UI mostrava `Nenhum template novo foi inserido. 4 indisponível(is)`; isso nao era erro do seed, e sim falta de prerequisitos reais
- ajustes finais feitos em `src/components/automacoes/trigger-config.tsx`:
  - `Novo Gatilho` e `Salvar Gatilho` reforcados com gradiente/contraste explicito e `appearance` travado para evitar regressao visual no browser
  - feedback do seed ganhou estado `warning` quando nada entra por indisponibilidade
  - modal de criacao desabilita radio/select sem recurso real disponivel
  - links de ajuda apontam para:
    - `/automacoes` para ativar/criar regua
    - `/configuracoes?tab=agentes` para cadastrar agentes
  - quando houver apenas 1 agente ativo, a UI deixa isso claro
- validacao:
  - `npm run build` passou
- proximo passo sugerido:
  - provisionar a base minima do tenant:
    - 1 agente de triagem
    - 1 agente de confirmacao
    - 1 agente de reativacao
    - 1 regua ativa
  - depois reexecutar o seed dos templates

## Atualizacao 2026-04-08 - `/agente` virou a superficie canônica de multiagentes

- havia um descompasso de produto importante:
  - a Fase C/D ja tinha CRUD multiagente em `/configuracoes?tab=agentes`
  - mas a sidebar ainda levava para `/agente`, que permanecia como editor singleton legado de `configuracoes`
- correcao aplicada:
  - `src/app/(dashboard)/agente/page.tsx` foi refeito como hub canônico de multiagentes, usando `AgentesConfig`
  - a pagina antiga de agente unico saiu de cena
- endurecimento tecnico junto:
  - `src/app/api/agentes/route.ts`
    - `GET` agora ordena default primeiro
    - `POST` passou a persistir `tipo`
  - `src/app/api/agentes/[id]/route.ts`
    - `PATCH` passou a aceitar `tipo`
- seed novo:
  - `src/app/api/agentes/seed/route.ts`
  - `src/components/agentes-config.tsx`
  - `Templates PrevLegal` agora consegue subir uma base inicial idempotente de agentes por tenant
  - agentes criados:
    - triagem
    - confirmacao_agenda
    - reativacao
    - documental
    - fechamento via `followup_comercial`
- decisao importante:
  - o papel de fechamento nao abriu um novo `tipo` no banco nesta rodada
  - para evitar drift de schema/enum, ele foi modelado temporariamente como `followup_comercial`
  - isso e suficiente para campanha, operacao manual e evolucao futura de proposta/fechamento
- validacao:
  - `npm run build` passou
- proximo passo sugerido:
  - validar em runtime o seed de agentes no tenant atual
  - depois clicar novamente no seed dos gatilhos

## Atualizacao 2026-04-08 - Rota rapida de status foi alinhada ao orquestrador

- a verificacao do codigo mostrou uma lacuna real:
  - `PATCH /api/leads/[id]` ja disparava `processEventTriggers`
  - `PATCH /api/leads/[id]/status` ainda nao disparava
- correcao aplicada:
  - `src/app/api/leads/[id]/status/route.ts`
  - agora a rota le o status anterior e chama `processEventTriggers` quando houver mudanca real
- impacto:
  - a Fase E passa a ser consistente entre os dois caminhos de mudanca de status na UI
  - isso reduz falso negativo de QA, onde a automacao parecia “funcionar em um lugar e em outro nao”
- validacao:
  - `npm run build` passou

## Atualizacao 2026-04-08 - Agenda desktop agora trabalha com trilho lateral

- motivacao:
  - depois do polish visual por tema, a tela ainda pedia scroll demais para enxergar a fila operacional
  - o calendario mensal seguia dominante demais para um fluxo que exige ver pendencias e confirmacoes ao mesmo tempo
- correcao aplicada:
  - `src/app/(dashboard)/agendamentos/page.tsx`
  - introduzido `railSections` no desktop para:
    - `Precisa confirmação`
    - `Confirmados`
    - `Histórico recente`
  - cada seção lateral ganhou card resumido com:
    - dia
    - hora
    - status
    - dono do calendario
    - observacao curta
  - o calendario mensal ficou mais compacto:
    - largura total do shell ampliada
    - grade desktop em `minmax(0,1.55fr) + 380px`
    - menos eventos por célula (`2` em vez de `3`)
    - altura mínima das células reduzida
  - em telas menores, a lista completa continua abaixo do calendario via `xl:hidden`
- impacto:
  - reduz scroll no desktop
  - melhora leitura simultanea entre tempo e fila de acao
  - preserva a semantica da tela como agenda operacional, nao apenas agenda visual
- validacao:
  - `npm run build` passou

## Atualizacao 2026-04-08 - Integracao com Docling foi formalizada como trilha oficial

- motivacao:
  - o PrevLegal ja possui upload de documentos, portal documental, base documental do agente e geracao beta por IA
  - faltava uma camada canonica para transformar arquivo em conteudo estruturado utilizavel
- documento novo:
  - `docs/DOCLING_INTEGRATION_PLAN.md`
- decisoes principais:
  - `Docling` entra como motor de parsing estrutural, nao como substituto da camada generativa
  - o primeiro corte de maior ROI sera em `lead_documentos`
  - `agent_documents` entra na fase seguinte
  - a arquitetura recomendada inclui:
    - `document_processing_jobs`
    - `document_parsed_contents`
    - `document_chunks`
    - worker Python separado para processamento assíncrono
- racional de produto:
  - o ganho prioritario nao e “gerar mais documento”
  - e transformar o acervo ja enviado em:
    - texto utilizavel
    - markdown estruturado
    - json rico
    - contexto pesquisavel para agentes e operacao
- proximo passo sugerido:
  - abrir a implementacao da `Fase A` com schema + worker + status visual de processamento

## Atualizacao 2026-04-08 - Fase A da foundation documental foi implementada

- entregas principais:
  - `supabase/migrations/045_document_processing_foundation.sql`
  - `src/lib/document-processing.ts`
  - `src/app/api/document-processing/worker/route.ts`
  - `workers/docling/app.py`
  - `workers/docling/requirements.txt`
  - `workers/docling/README.md`
- pontos do produto ligados:
  - `src/app/api/leads/[id]/documentos/route.ts`
  - `src/app/api/leads/[id]/gerar-documento/route.ts`
  - `src/app/api/portal/[token]/documentos/upload/route.ts`
  - `src/app/(dashboard)/leads/[id]/page.tsx`
- o que passou a existir:
  - fila canônica `document_processing_jobs`
  - persistência de conteúdo estruturado em `document_parsed_contents`
  - foundation de `document_chunks`
  - worker protegido por `CRON_SECRET`
  - status visual por documento no detalhe do lead
- comportamento novo:
  - ao criar um `lead_documento`, o sistema tenta enfileirar parsing automático
  - a listagem do lead mescla documento + status do processamento
  - exclusão do documento também limpa artefatos de parsing
  - documentos `text/plain` podem ser processados inline
  - documentos binários dependem do serviço Docling externo
- decisão de arquitetura:
  - nesta fase, o worker externo fica explícito e desacoplado
  - não foi adicionado cron no `vercel.json` ainda para evitar rodar foundation incompleta sem `DOCLING_SERVICE_URL`
- hardening de rollout:
  - se a migration `045` ainda não existir, o enqueue vira no-op e a UI não quebra
  - isso evita repetir o tipo de regressão que já tivemos com schema pendente em produção
- pendências reais para virar operação completa:
  - aplicar a migration `045` no banco
  - subir o serviço Docling e apontar `DOCLING_SERVICE_URL`
  - decidir a agenda de execução automática do worker
- validação:
  - `npm run build` passou

## Atualizacao 2026-04-08 - Agendamentos ganharam fallback de schema tambem na tabela `agendamentos`

- problema observado em runtime:
  - ao abrir `Novo agendamento` e preencher lead/responsavel/email, a API podia responder:
    - `Could not find the 'calendar_owner_email' column of 'agendamentos' in the schema cache`
- causa real:
  - a producao ainda nao tem a migration `043_user_calendar_ownership.sql`
  - o endurecimento anterior cobria colunas novas em `usuarios`, mas o `POST /api/agendamentos` ainda tentava gravar:
    - `calendar_owner_scope`
    - `calendar_owner_usuario_id`
    - `calendar_owner_email`
  - `PATCH` e `DELETE` tambem liam essas colunas sem fallback
- correcao aplicada:
  - `src/lib/permissions.ts`
    - novo helper `isMissingAgendamentoOwnerColumnError`
  - `src/app/api/agendamentos/route.ts`
    - helper `insertAgendamentoWithSchemaFallback`
    - primeira tentativa persiste owner columns
    - se a schema nao tiver essas colunas, a API remove `calendar_owner_*` e reinsere no formato legado
  - `src/app/api/agendamentos/[id]/route.ts`
    - helper `getAgendamentoAtualWithSchemaFallback`
    - select completo com `calendar_owner_*` primeiro
    - fallback para select minimo se a `043` ainda nao existir
    - update/cancel do Google passam a enviar `ownerScope` e `ownerUsuarioId` so quando presentes
- efeito de produto:
  - o modal deixa de quebrar em producao enquanto a `043` nao for aplicada
  - a agenda continua funcional no modo legado
  - assim que a migration entrar, a ownership explicita volta a ser persistida automaticamente
- validacao:
  - `npm run build` passou
- pendencia real que continua:
  - aplicar a migration `043` no banco para persistir ownership do calendario e completar a fase de agenda por usuario

## Atualizacao 2026-04-08 - Agenda desktop passou a mostrar rail operacional ja em `lg`

- contexto:
  - depois do hardening tecnico, a proxima queixa de UX era clara:
    - o calendario ainda ocupava area demais
    - a fila operacional ficava escondida abaixo em muitas larguras reais de trabalho
- correcao aplicada:
  - `src/app/(dashboard)/agendamentos/page.tsx`
    - grid principal mudou para `lg:grid`
    - rail lateral ficou disponivel a partir de `lg`
    - novo card `Em foco` mostra o compromisso selecionado ou o mais prioritario
    - a altura minima das celulas do calendario foi reduzida
    - a lista empilhada passou a existir apenas abaixo de `lg`
- efeito de produto:
  - notebooks ja mostram calendario + fila no mesmo viewport
  - a agenda fica mais proxima de painel operacional e menos de calendario isolado
- validacao:
  - `npm run build` passou

## Atualizacao 2026-04-08 - Pos-migration `043`, a agenda precisou explicitar o FK correto do responsavel

- problema observado em runtime depois de aplicar `043`, `044` e `045` no operacional:
  - ao criar um novo agendamento, o evento podia ser criado no Google e o e-mail podia chegar normalmente
  - ainda assim, o modal respondia com erro:
    - `Could not embed because more than one relationship was found for 'agendamentos' and 'usuarios'`
  - em paralelo, os agendamentos listados podiam sumir da UI
- causa real:
  - a `043` adicionou `calendar_owner_usuario_id` em `agendamentos`
  - a tabela passou a ter duas FKs para `usuarios`:
    - `agendamentos_usuario_id_fkey`
    - `agendamentos_calendar_owner_usuario_id_fkey`
  - os selects da API ainda usavam embed genérico `usuarios(...)`
  - o PostgREST ficou ambíguo para montar a resposta, mesmo quando a escrita já tinha funcionado
- correcao aplicada:
  - `src/app/api/agendamentos/route.ts`
    - `GET` agora usa:
      - `usuarios:usuarios!agendamentos_usuario_id_fkey(...)`
    - o retorno do `insert` também foi alinhado ao mesmo FK explícito
  - `src/app/api/agendamentos/[id]/route.ts`
    - o retorno do `PATCH` foi alinhado ao mesmo embed explícito
- efeito de produto:
  - o responsavel operacional do agendamento volta a ser resolvido sem colisao com o owner tecnico do calendario
  - criacao/listagem/edicao deixam de quebrar por ambiguidade de relacao
- validacao:
  - `npm run build` passou
- proximo passo real:
  - validar em runtime que:
    - os agendamentos antigos reapareceram
    - o novo agendamento aparece na UI
    - remarcar e cancelar continuam funcionando no banco ja migrado

## Atualizacao 2026-04-09 - Agenda validada em runtime e trilho de go-live reorganizado

- validacao executada pelo usuario no tenant real:
  - `listagem antiga: ok`
  - `novo agendamento: ok`
  - `remarcar: ok`
  - `cancelar: ok`
- conclusao:
  - a agenda Google nao e mais o principal risco tecnico do go-live
  - o proximo bloco certo agora e:
    - fechar a frente comercial do Google OAuth
    - rodar o smoke test final do tenant
- docs novos criados:
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/TENANT_SMOKE_TEST_CHECKLIST.md`
- leitura estrategica:
  - para segunda-feira, o risco maior deixa de ser funcional e passa a ser percepcao de confianca / onboarding controlado

## Atualizacao 2026-04-09 - UX do admin de canais ficou menos enganosa e a Z-API do teste mostrou webhook de outro produto

- problema observado:
  - no admin do tenant, os botoes `Editar` e `Novo Z-API/Twilio` podiam parecer mortos
  - o usuario tambem mostrou a tela da Z-API e os webhooks estavam configurados para:
    - `.../functions/v1/orbit-zapi-webhook?...`
- causa:
  - o formulario de canal abre inline abaixo da lista; sem scroll automatico, a acao acontece fora da viewport visivel
  - quando a reautenticacao admin expira, o redirecionamento tambem podia parecer “nada aconteceu”
  - os webhooks da Z-API pertencem a um fluxo antigo do Orbit, nao a uma integracao inbound atual do PrevLegal
- correcao aplicada:
  - `src/app/admin/[id]/page.tsx`
    - adiciona `scrollIntoView` ao abrir criacao/edicao de canal
    - exibe mensagem explicita antes de redirecionar por `428 Reauthentication required`
- leitura de produto:
  - outbound via Z-API continua compativel com o admin do PrevLegal
  - inbound nao pode ser considerado ativo enquanto os webhooks da instancia continuarem apontando para o Orbit
- validacao:
  - `npm run build` passou
- proximo passo real:
  - publicar a correcao do admin
  - usar o canal Z-API apenas para testes controlados de envio, ate que o webhook inbound do produto atual seja definido

## Atualizacao 2026-04-09 - Webhook inbound da Z-API entrou no produto atual

- problema observado:
  - o canal `Z-API` já podia ser salvo e usado para envio outbound no admin
  - mas o teste mostrava que os webhooks da instância ainda apontavam para `orbit-zapi-webhook`
  - o PrevLegal não tinha rota inbound própria para fechar a integração ponta a ponta
- correcao aplicada:
  - `src/lib/whatsapp-provider.ts`
    - adiciona `getZApiRoutingContextByInstanceId(instanceId)`
  - `src/app/api/webhooks/zapi/route.ts`
    - nova rota webhook do produto
    - `GET` para healthcheck
    - `POST` com `event=on-receive` para:
      - resolver o canal por `zapi_instance_id`
      - ignorar mensagens `fromMe`
      - deduplicar por `twilio_message_sid` reutilizado como external id
      - localizar lead por telefone
      - criar/reativar `conversas`
      - inserir em `mensagens_inbound`
      - criar `notificacoes`
      - parar `followup_runs` ativos quando o lead responder
    - demais eventos retornam `200`/ack seguro por enquanto
- leitura de produto:
  - `Z-API` deixa de ser “só outbound”
  - o fluxo inbound do canal agora passa a existir no PrevLegal atual
  - ainda vale testar com um numero diferente do proprio numero conectado da instancia para validar entrega/recebimento de forma realista
- validacao:
  - `npm run build` passou
- webhooks canônicos esperados na instância Z-API:
  - `Ao receber`: `https://app.prevlegal.com.br/api/webhooks/zapi?event=on-receive&instance_id=<INSTANCE_ID>`
  - `Ao enviar`: `https://app.prevlegal.com.br/api/webhooks/zapi?event=on-send&instance_id=<INSTANCE_ID>`
  - `Ao conectar`: `https://app.prevlegal.com.br/api/webhooks/zapi?event=on-connect&instance_id=<INSTANCE_ID>`
  - `Ao desconectar`: `https://app.prevlegal.com.br/api/webhooks/zapi?event=on-disconnect&instance_id=<INSTANCE_ID>`
  - `Receber status da mensagem`: `https://app.prevlegal.com.br/api/webhooks/zapi?event=message-status&instance_id=<INSTANCE_ID>`
  - `Presença do chat`: `https://app.prevlegal.com.br/api/webhooks/zapi?event=chat-presence&instance_id=<INSTANCE_ID>`

## Atualizacao 2026-04-09 - Webhook Z-API foi endurecido para payload de instância web / multi-device

- cenário:
  - o outbound da Z-API passou a funcionar após ajuste de credenciais
  - o inbound ainda não aparecia na caixa de entrada, mesmo com o canal conectado
- hipótese mais forte:
  - a variante `instância web / multi device` da Z-API envia payload em `messages[]` com campos como `chatId`, `author`, `body`, `id` e `fromMe`
  - a primeira versão do parser estava mais aderente a payload achatado (`phone`, `messageId`, `text.message`)
- correção aplicada:
  - `src/app/api/webhooks/zapi/route.ts`
    - adicionadas múltiplas fontes candidatas: `payload`, `data`, `message`, `messages[0]`, `data.messages[0]`
    - origem pode sair de `phone`, `from`, `author`, `chatId`, `sender.phone`
    - mensagem pode sair de `text.message`, `body`, `caption`, `content`
    - id externo pode sair de `messageId`, `id`, `key.id`
    - autoria pode sair de `fromMe` ou `key.fromMe`
    - entrou `console.warn` quando o webhook chega sem telefone ou texto suficiente, para facilitar depuração em produção
- resultado esperado:
  - instâncias `web / multi-device` deixam de cair em payload incompleto e passam a alimentar `mensagens_inbound`, `conversas`, notificações e stop automático de follow-up

## Atualizacao 2026-04-09 - Fallback do lead tecnico Z-API foi alinhado ao schema real da produção

- cenário:
  - após endurecer o parser e criar fallback para lead técnico, o webhook da Z-API continuou chegando em produção, mas a conversa ainda não aparecia
  - o log de produção mostrou:
    - `Could not find the 'observacoes' column of 'leads' in the schema cache`
    - seguido por `null value in column "lead_id" of relation "conversas" violates not-null constraint`
- causa:
  - o insert do lead automático tentava gravar `leads.observacoes`
  - essa coluna não existe no schema operacional atual, então o lead técnico falhava antes de abrir a conversa
- correção aplicada:
  - `src/app/api/webhooks/zapi/route.ts`
    - removido `observacoes` do insert do lead técnico
    - mantido o fallback apenas com colunas confirmadas na produção
- resultado esperado:
  - inbound de números ainda não reconhecidos deixa de quebrar por divergência de schema e passa a conseguir abrir conversa normalmente

## Atualizacao 2026-04-09 - Matcher do inbound Z-API passou a reconhecer telefone manual mascarado

- cenário:
  - no banco operacional, o lead manual do número de teste existia
  - mas o telefone estava salvo como `(41) 99236-1868`
  - o webhook chegava com variante normalizada (`+5541992361868`)
- causa:
  - a busca inicial do lead dependia de igualdade exata entre variantes normalizadas e valores crus do banco
  - isso podia falhar quando o telefone manual estivesse com máscara humana
- correção aplicada:
  - `src/app/api/webhooks/zapi/route.ts`
    - manter a busca exata como primeira etapa
    - adicionar fallback por candidatos via `like` usando sufixo do telefone
    - normalizar os candidatos em memória e aceitar o match quando houver uma correspondência única
- resultado esperado:
  - respostas vindas do WhatsApp passam a priorizar o lead manual existente antes de criar placeholder técnico

## Atualizacao 2026-04-09 - Busca global e busca de leads passaram a seguir a mesma normalização de UX

- cenário:
  - o produto já tolerava parte das variações humanas na busca de leads
  - mas a busca global (`Ctrl+K`) ainda dependia de `ilike` cru no banco
  - na prática:
    - `Caua` não encontrava `Cauã`
    - telefone digitado sem máscara podia falhar contra registros mascarados
- correção aplicada:
  - `src/lib/search-normalization.ts`
    - nova base compartilhada para:
      - normalizar texto
      - remover diacríticos
      - extrair dígitos
      - comparar campos com tolerância a acento e máscara
  - `src/app/api/busca/route.ts`
    - a busca global passou a combinar candidatos brutos + recentes
    - o filtro final agora roda em memória com a normalização compartilhada
  - `src/app/api/leads/route.ts`
    - a busca de leads passou a reaproveitar a mesma fundação, reduzindo divergência entre superfícies
  - `docs/MASTER.md`
    - o princípio foi formalizado como pilar de experiência da Fluxrow
- leitura de produto:
  - o sistema não deve exigir digitação “perfeita”
  - pequenas variações naturais de nome e telefone devem ser absorvidas pelo backend como comportamento esperado
- `2026-04-10` - convite de usuário endurecido para o go-live
  - `src/app/api/usuarios/convidar/route.ts` passou a validar também `auth.users` antes de gerar convite
  - regra operacional assumida para o go-live atual: `1 email = 1 escritório`
  - `src/app/api/usuarios/aceitar-convite/route.ts` agora devolve `409` amigável quando o email já existe no Auth, em vez do erro cru do Supabase
  - `src/app/auth/aceitar-convite/page.tsx` ganhou mensagem orientando uso de outro email/migração posterior
  - `src/components/gestao-usuarios.tsx` agora deixa explícito que o convite atual é `link manual`, sem envio automático por email
- `2026-04-13` - inbox passou a respeitar ownership/assignee para todos os perfis
  - gatilho: no smoke test, um segundo admin convidado viu conversas da operação principal do escritório
  - decisão de go-live: inbox humana é pessoal por padrão, inclusive para admin
  - implementação:
    - `src/lib/inbox-visibility.ts`
    - `src/app/api/conversas/route.ts`
    - `src/app/api/conversas/[id]/route.ts`
    - `src/app/api/conversas/[id]/responder/route.ts`
  - regra aplicada:
    - usuário vê a conversa se for `leads.responsavel_id`
    - ou `conversas.assumido_por`
  - implicação:
    - visão total da equipe deixa de ser bypass implícito de admin
    - futura supervisão deve entrar como modo explícito, não como padrão da inbox
- `2026-04-13` - cadastro manual passou a aceitar lead sem CPF no primeiro contato
  - gatilho: o modal `Novo lead` sugeria CPF opcional, mas o banco ainda falhava com `leads.cpf not null`
  - decisão de produto:
    - CPF não deve ser exigido no primeiro contato com lead avulso/campanha
    - o dado pode entrar depois, quando houver confiança e contexto
  - implementação:
    - `supabase/migrations/046_leads_cpf_optional.sql`
    - `supabase/manual/2026-04-13_make_leads_cpf_nullable.sql`
    - `src/components/novo-lead-modal.tsx`
    - `src/lib/types.ts`
    - `src/app/(dashboard)/leads/[id]/page.tsx`
    - `src/app/(dashboard)/financeiro/page.tsx`
  - pendência operacional:
    - aplicar o patch `2026-04-13_make_leads_cpf_nullable.sql` no banco antes de repetir o teste no runtime
- `2026-04-13` - templates de agentes passaram a oferecer dois modelos canônicos
  - gatilho: o seed de agentes estava enviesado para o fluxo da Ana, enquanto o primeiro uso real do cliente é o contexto previdenciário da Jessica
  - decisão de produto:
    - `Templates PrevLegal` não pode embutir um único caso-piloto como padrão implícito
    - o escritório precisa escolher explicitamente o modelo operacional inicial
  - implementação:
    - `src/lib/agent-seed-profiles.ts`
    - `src/app/api/agentes/seed/route.ts`
    - `src/components/agentes-config.tsx`
    - `src/app/(dashboard)/agente/page.tsx`
  - modelos novos:
    - `Modelo Jessica`
      - benefícios previdenciários
      - acolhimento jurídico inicial
      - conversão para consulta / análise
    - `Modelo Ana`
      - planejamento previdenciário consultivo
      - diagnóstico comercial
      - fechamento de planos
  - observação operacional:
    - o seed segue idempotente por `tipo`
    - a troca de modelo é pensada para onboarding inicial; depois disso, o caminho correto é editar os agentes já existentes
- `2026-04-14` - campanhas ganharam fundação para público por contatos específicos
  - implementação:
    - `supabase/migrations/047_campaign_selected_leads.sql`
    - `supabase/manual/2026-04-14_add_campaign_selected_leads.sql`
    - `src/app/(dashboard)/campanhas/page.tsx`
    - `src/app/api/campanhas/route.ts`
    - `src/app/api/campanhas/[id]/disparar/route.ts`
  - comportamento:
    - campanha pode nascer por `lista` ou `selecionados`
    - no modo `selecionados`, o sistema persiste os destinatários em `campanha_leads`
    - o disparo prioriza `campanha_leads` quando houver recorte explícito
  - pendência:
    - aplicar o patch manual `2026-04-14_add_campaign_selected_leads.sql` no banco de produção antes de validar no runtime
- `2026-04-14` - troca manual de aba da inbox passou a limpar deep link antigo
  - implementação:
    - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
  - motivo:
    - `conversaId` / `telefone` antigos podiam reabrir a thread anterior e fazer os boxes parecerem travados
  - comportamento novo:
    - ao trocar a aba manualmente, a tela limpa `conversaId`, `telefone` e `leadId` da URL e abandona o deep link anterior
## Atualização 2026-04-13 — Canal WhatsApp dos agentes passou a refletir o escritório real

- foi criada a rota `GET /api/whatsapp-numbers`
- `agentes-config.tsx` agora lista os canais ativos do tenant em vez de pedir `ID do número no Twilio/Meta`
- backend de `POST /api/agentes` e `PATCH /api/agentes/[id]` valida que o canal escolhido pertence ao tenant
- decisão de produto consolidada:
  - o padrão recomendado é compartilhar o mesmo canal WhatsApp do escritório entre agentes
  - não obrigar um número por agente

## Atualização 2026-04-13 — Tarefas novas registradas a partir do smoke test

- campanhas:
  - foundation de leads manuais/selecionados em campanha foi implementada; falta validar em produção após patch `2026-04-14_add_campaign_selected_leads.sql`
  - seleção de agente por campanha já lista os agentes reais do escritório
  - template da primeira mensagem já é sugerido a partir do agente escolhido
  - configuração de disparo ainda precisa perder o viés visual legado de Twilio
- inbox:
  - retestar transferência de conversa para confirmar visibilidade só no novo responsável
  - retestar badges/notificações versus thread visível após a última rodada
  - retestar boxes/filtros da inbox após a limpeza de deep link na troca manual de aba
