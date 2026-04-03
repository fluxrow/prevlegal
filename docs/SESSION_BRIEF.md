# PrevLegal — SESSION_BRIEF.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

Resumo curto para retomada rapida de contexto no inicio de qualquer sessao.

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[CODEX_HANDOFF]]
- [[SESSION_PROTOCOL]]
- [[PRODUCT_PORTFOLIO_STRATEGY]]

## Fonte de Verdade

Ordem de leitura:
1. `docs/SESSION_BRIEF.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/ROADMAP.md`
4. `docs/LEARNINGS.md`
5. Vault Obsidian em `~/Documents/Fluxrow/PrevLegal/`

## Estado Atual

Ultima atualizacao: 2026-04-01

- Branch principal: `main`
- Linha atual do produto no Obsidian: Fases 21, 22, 23, 24 e 25 concluidas
- Fase atual: bootstrap multi-tenant no operacional limpo + Google Calendar validado + endurecimento do runtime WhatsApp
- Producao atual: `https://app.prevlegal.com.br`
- LP canônica: `https://www.prevlegal.com.br`
- Dominio comprado: `prevlegal.com.br`
- Estado operacional confirmado:
  - banco operacional alvo: `lrqvvxmgimjlghpwavdb`
  - projeto central preservado: `zjelgobexwhhfoisuilm`
  - `supabase/reset/combined_apply_031_and_reset.sql` executado com sucesso direto no operacional
  - contagens finais zeradas em `tenants`, `usuarios`, `listas`, `leads`, `conversas`, `mensagens_inbound`, `portal_mensagens`, `configuracoes`, `contratos` e `parcelas`
- bootstrap tenant-aware iniciado no codigo para responsavel, convites, importacao e lead manual
- cadastro do primeiro escritorio no admin endurecido com geracao automatica de slug e feedback de erro no modal
- middleware agora respeita `/api/admin/*` com `admin_token`, evitando redirecionamento indevido para `/login` do app durante o bootstrap
- middleware agora tambem respeita `/api/admin/reauth` como rota publica do admin
- primeiro escritorio de teste ja foi criado com sucesso no operacional limpo (`Fluxrow`)
- onboarding do primeiro tenant agora pode seguir mesmo apos a criacao do primeiro usuario, e a tela de redefinicao aceita `token_hash`/`code`
- `Enviar acesso do responsavel` agora ja devolve o link manual de contingencia no mesmo passo
- `Enviar reset de senha` agora tambem devolve o link manual de contingencia no mesmo passo
- reset manual agora usa token proprio no backend e nao depende mais da sessao recovery do Supabase
- importacao de listas foi endurecida:
  - bloqueio de duplicidade por nome/arquivo no mesmo tenant
  - erro real de insert nao e mais engolido
  - `/api/listas` agora mapeia os totais corretamente para a UI
  - `/api/listas` deixa de exibir a lista tecnica `Cadastro manual` na visao padrao
  - `/api/listas/[id]` agora permite excluir uma lista importada pela plataforma
  - `/api/whatsapp/verificar` agora usa `leads.lista_id` e nao mais a tabela legado `lista_leads`
  - listas orfas de teste com `0` leads no tenant `Fluxrow` foram removidas em `2026-03-20` para liberar o reteste
  - o reteste mostrou `78` ativos vs `55` leads inseridos; a UI de importacao agora exibe `falhas_insercao` e os warnings das linhas rejeitadas
- dashboard agora suporta modo claro/escuro global com persistencia local
- Google Calendar pos-reset operacional:
  - a conexao podia voltar como “sucesso” sem gravar o token em `configuracoes`
  - o fluxo foi endurecido com helper tenant-aware de `configuracoes`
  - callback, status e leitura do calendar agora usam a configuracao do `tenant_id` atual
  - a validacao em runtime ja passou: a conexao foi concluida com sucesso em `https://app.prevlegal.com.br/agendamentos`
- atalhos operacionais de contato:
  - `Caixa de Entrada` agora aceita deep-link por `conversaId`/`telefone`
  - detalhe do lead, drawer, modal de mensagens e agendamentos agora expõem CTA para `Abrir conversa`
  - detalhe do lead, drawer, modal e agendamentos agora também expõem CTA para `Abrir no WhatsApp`
- WhatsApp/campanhas pos-reset operacional:
  - `src/app/api/campanhas` e `src/app/api/campanhas/[id]/disparar` agora usam o schema operacional atual (`leads.lista_id`) em vez das tabelas legado `lista_leads` e `numeros_whatsapp`
  - campanhas agora validam a `lista_id` dentro do tenant atual e fecham com status `encerrada`
  - `src/lib/twilio.ts` passou a resolver Twilio por `tenant_id` e tambem por numero WhatsApp do tenant
  - webhook inbound e webhook de status agora conseguem validar/rotear pelo tenant correto
  - `mensagens_inbound`, `conversas` e `notificacoes` do webhook agora carregam `tenant_id` coerente com o numero do escritorio
  - resposta manual na inbox e resposta automatica do agente agora usam credenciais/configuracoes do tenant certo
  - o detalhe do lead e o drawer agora oferecem `Iniciar conversa`, criando a thread humana mesmo sem conversa previa e levando o operador direto para a inbox
  - a fundacao `src/lib/whatsapp-provider.ts` foi aberta para suportar `Twilio + Z-API + multiplos numeros por tenant`
  - resposta manual, `Iniciar conversa`, agente automatico e disparo de campanha ja passam por essa camada nova com fallback para o Twilio legado
  - a migration `032_whatsapp_provider_foundation.sql` prepara a tabela `whatsapp_numbers` e referencias opcionais de `whatsapp_number_id`
  - a migration `032` ja foi aplicada no banco operacional `lrqvvxmgimjlghpwavdb`
  - o tenant `Fluxrow` foi sincronizado com o primeiro canal WhatsApp padrao:
    - provider: `twilio`
    - label: `Twilio Sandbox`
    - origem default no tenant: `whatsapp:+14155238886`
  - `whatsapp_numbers_count = 1` no operacional neste momento
  - diagnostico do reteste em 27/03:
    - a inbox estava ecoando outbound manual como se houvesse mensagem inbound + resposta
    - isso foi corrigido na UI da `Caixa de Entrada`
    - o ultimo envio real consultado na API da Twilio ficou com `status = failed`
    - `sid`: `SM45b2678c110c8d4e870d618e68322290`
    - `errorCode = 63015`
    - conclusao: havia bug visual na thread, mas tambem houve falha real de entrega no provider
  - admin WhatsApp por tenant:
    - o detalhe do tenant em `/admin/[id]` agora expõe a secao `Canais WhatsApp`
    - rotas novas:
      - `GET/POST /api/admin/tenants/[id]/whatsapp-numbers`
      - `PATCH/DELETE /api/admin/tenants/[id]/whatsapp-numbers/[numberId]`
    - a UI ja permite cadastrar e editar canais `Twilio` e `Z-API`
    - o canal `Twilio` padrao sincroniza os campos legado do tenant para manter compatibilidade
  - warm-up Z-API em 29/03:
    - `src/lib/whatsapp-warmup.ts` centraliza uma politica conservadora para numero novo
    - campanhas agora salvam `whatsapp_number_id` do canal resolvido na criacao
    - o disparo volta a ler o canal da campanha e reaplica caps de warm-up no backend
    - caps conservadores atuais para canal em warm-up:
      - `limite_diario = 15`
      - `tamanho_lote = 5`
      - `pausa_entre_lotes_s = 600`
      - `delay_min_ms = 60000`
      - `delay_max_ms = 180000`
    - `src/app/admin/[id]/page.tsx` agora destaca badge `Warm-up` no canal quando `metadata.warmup_enabled = true`
    - a migration `033_whatsapp_warmup_and_drafts.sql` relaxa as constraints para permitir canal rascunho inativo sem credenciais completas
    - o tenant `Fluxrow` ganhou um canal `Z-API` ja reservado no operacional:
      - label: `Z-API Warm-up 41984233554`
      - phone: `+5541984233554`
      - provider: `zapi`
      - ativo: `false`
      - is_default: `false`
      - metadata de warm-up ja aplicada
- edicao de lead em 30/03:
  - o detalhe do lead agora tem CTA `Editar dados`
 - busca de lead no agendamento manual em 31/03:
   - o problema nao era ausencia de email no cadastro do lead
   - `src/app/api/leads/route.ts` agora aceita `scope=scheduling` e usa service role com filtro explicito por `tenant_id`
   - a busca operacional do modal deixa de depender do recorte por `responsavel_id` para usuario nao-admin
   - `src/app/api/busca/route.ts` ficou explicitamente tenant-aware para leads, documentos e conversas
   - o modal `src/components/novo-agendamento-modal.tsx` agora combina `/api/leads` + `/api/busca` e exibe lista clicavel de resultados em vez de depender de select nativo
    - o `lead drawer` tambem ganhou o mesmo CTA
    - a rota `PATCH /api/leads/[id]` foi criada para atualizar diretamente os campos operacionais do lead
    - o objetivo e dar autonomia ao operador para complementar o cadastro conforme novas informacoes chegam pela conversa
- Contencao atual:
  - allowlist do app continua ativa
  - onboarding fora do piloto continua bloqueado
  - endurecimento temporario por ownership de usuario continua no codigo ate o tenant isolation definitivo
- saude do tenant no admin em 30/03:
  - `GET /api/admin/tenants/[id]/metricas` agora filtra leituras operacionais por `tenant_id`
  - o detalhe do tenant passou a mostrar:
    - risco operacional
    - resumo de saude
    - ultimo acesso da equipe
    - usuarios ativos em 7 dias
    - conversas em 7 dias
    - agendamentos pendentes
  - isso tira a tela de detalhe do admin da zona “piloto confuso” e a aproxima de um painel executivo acionavel
- financeiro preditivo em 30/03:
  - o dashboard financeiro agora mostra previsao de caixa em `7 dias` e `30 dias`
  - a tela tambem ganhou:
    - recebivel em aberto
    - ticket medio por contrato
    - proximos recebimentos
    - risco financeiro resumido da carteira
  - `GET /api/financeiro/resumo` passou a calcular tudo isso com base no tenant atual
  - `PATCH/DELETE /api/financeiro/contratos/[id]` e `PATCH /api/financeiro/parcelas/[id]` agora validam acesso tenant-aware antes de alterar dados
  - a carteira financeira agora tambem mostra origem comercial:
    - via campanha
    - via operacao direta
    - com agendamento
    - com agendamento realizado
    - maiores origens por valor contratado
- agendamento manual em 30/03:
  - o produto agora expõe criacao humana de consulta em tres pontos:
    - botao `Novo agendamento` em `/agendamentos`
    - CTA `Agendar consulta` no detalhe do lead
    - CTA `Agendar` no `lead drawer`
  - o fluxo usa um modal unico reutilizavel e reaproveita `POST /api/agendamentos`
  - a rota de agendamentos foi endurecida para:
    - filtrar listagem por `tenant_id`
    - validar lead e responsavel dentro do tenant atual
    - inserir `tenant_id` na criacao
  - `GET /api/leads` agora tambem suporta busca curta tenant-aware para alimentar esse modal
  - refinamento operacional:
    - a busca do modal agora reage melhor ao texto digitado e ganhou CTA explicito `Buscar lead`
    - o endpoint de busca passou a aceitar leads com `lgpd_optout` nulo, sem esconder a base valida por acidente
    - o modal agora aceita `E-mail da reunião`, permitindo sobrescrever o e-mail atual do lead so para esse agendamento/Meet
    - a busca curta de leads deixou de depender de filtros `or` frágeis do PostgREST e agora filtra no servidor com normalizacao de texto/telefone
- calendario de agendamentos em 30/03:
  - a tela `/agendamentos` agora ganhou uma visao mensal de calendario
  - cada compromisso aparece com cor por status
  - o clique em um evento abre um painel/modal de operacao com:
    - confirmar
    - remarcar
    - realizado
    - cancelar
    - reatribuir responsavel
    - abrir conversa / WhatsApp / Meet
  - a fila operacional continua existindo abaixo, entao a tela passou a juntar leitura visual + execucao
- leads por URL em 01/04:
  - `/leads` agora aceita `?status=` e aplica o recorte no servidor
  - o kanban ganhou faixa de filtro ativo + chips de status
  - o pipeline do `Dashboard` agora cai direto nesses recortes:
    - `new`
    - `contacted`
    - `scheduled`
    - `converted`
    - `lost`
- refinamentos de UX em 01/04:
  - o `Funil de Conversao` em `/relatorios` agora tambem aponta para filas reais nas etapas operacionais
  - a sidebar passou a ficar auto-retraida em dispositivos com hover e expandir ao passar o mouse
  - em dispositivos sem hover a sidebar continua expandida
- mobile do cliente em 01/04:
  - direcao oficial definida como extensao do portal atual
  - ordem recomendada:
    - portal mobile-first
    - PWA
    - identidade persistente do cliente/familiar
    - nativo so se justificar
  - documento canonico criado:
    - `docs/MOBILE_CLIENT_APP_PLAN.md`
  - backlog tecnico inicial formalizado:
    - `docs/MOBILE_CLIENT_APP_BACKLOG.md`
  - estado real que guiou o backlog:
    - o portal atual ainda e `token-only`
    - `src/app/portal/[token]/page.tsx` ainda tem branding hardcoded de `Alexandrini Advogados`
    - `GET /api/portal/[token]` ainda retorna payload estreito para uma home mobile-first
  - ordem oficial de construcao confirmada:
    - endurecer o portal atual
    - publicar como PWA
    - criar identidade persistente
    - avaliar app nativo depois
  - fase 1 iniciada:
    - `src/app/portal/[token]/page.tsx` agora usa branding dinâmico do tenant
  - o portal ja avancou para:
    - PWA instalavel
    - identidade persistente
    - sessao propria do portal
    - aba `Perfil`
    - upload de documento direto pelo cliente/familiar
  - a nova rota `POST /api/portal/[token]/documentos/upload`:
    - salva arquivo no bucket `lead-documentos`
    - registra em `lead_documentos`
    - pode atualizar `portal_document_requests` para `enviado`
    - cria evento em `portal_timeline_events`
    - notifica a equipe no backoffice
  - proximo passo recomendado no mobile/core:
    - validar upload real no celular
    - depois validar pedido de remarcacao no proprio portal
  - remarcacao no portal em 02/04:
    - `POST /api/portal/[token]/remarcacao` foi criada
    - o cliente/familiar agora pode explicar o motivo e sugerir outra janela
    - o sistema:
      - gera notificacao interna
      - registra evento `pedido_remarcacao_cliente` na timeline
      - nao altera o agendamento automaticamente
- diretriz de portfólio em 01/04:
  - o crescimento do sistema nao deve reescrever a identidade principal do PrevLegal
  - o core continua sendo:
    - captacao
    - qualificacao
    - inbox
    - agendamento
    - portal/mobile
    - financeiro
  - frentes como `PrevGlobal` entram como modulo premium separado
  - regra canonica registrada em `docs/PRODUCT_PORTFOLIO_STRATEGY.md`
    - `GET /api/portal/[token]` agora retorna `branding`, `proximo_agendamento` e `resumo`
    - o portal passou a exibir o próximo compromisso e o contato do escritório certo
  - fase 1 continuada:
    - `GET /api/portal/[token]` agora tambem retorna:
      - `pendencias_documento`
      - `timeline`
      - `resumo.documentos_pendentes`
    - a home do portal agora exibe:
      - bloco de documentos pendentes
      - linha do tempo do caso
    - o backend usa fallback seguro:
      - se `portal_document_requests` nao existir ainda, o portal nao quebra
      - se `portal_timeline_events` nao existir ainda, a timeline e derivada de mensagens, documentos, agendamentos e abertura do caso
    - migration preparada:
      - `supabase/migrations/035_portal_mobile_foundation.sql`
  - fase 1 continuada, passo 3:
    - a secao `Portal do Cliente` dentro do detalhe do lead agora permite abastecer:
      - `portal_document_requests`
      - `portal_timeline_events`
    - rotas internas novas:
      - `GET/POST /api/leads/[id]/portal-document-requests`
      - `PATCH/DELETE /api/leads/[id]/portal-document-requests/[requestId]`
      - `GET/POST /api/leads/[id]/portal-timeline-events`
      - `PATCH/DELETE /api/leads/[id]/portal-timeline-events/[eventId]`
    - se a migration `035` ainda nao estiver aplicada no banco:
      - a UI nao quebra
      - mostra aviso de foundation pendente
  - fase 1 continuada, passo 4:
    - a migration `035_portal_mobile_foundation.sql` ja foi aplicada no operacional `lrqvvxmgimjlghpwavdb`
    - `/portal/[token]` agora tem manifesto dinamico por token e `service worker` leve
    - o portal passou a mostrar CTA `Instalar app`
    - em iPhone / iOS existe fallback instrucional para `Adicionar à Tela de Início`
    - o “app do cliente” agora pode ser visto e instalado a partir do proprio link do portal no lead
  - fase 1 continuada, passo 5:
    - a migration `036_portal_identity_foundation.sql` ja foi aplicada no operacional `lrqvvxmgimjlghpwavdb`
    - novas tabelas:
      - `portal_users`
      - `portal_access_links`
    - o detalhe do lead agora permite:
      - cadastrar cliente / familiar / cuidador para o portal
      - pausar acesso
      - excluir acesso
      - gerar link persistente individual
    - o novo link persistente:
      - registra uso em `portal_access_links`
      - atualiza `ultimo_acesso_em` em `portal_users`
      - redireciona para o portal atual baseado em `portal_token`
  - fase 1 continuada, passo 6:
    - a migration `037_portal_session_foundation.sql` ja foi aplicada no operacional `lrqvvxmgimjlghpwavdb`
    - nova tabela:
      - `portal_sessions`
    - `/portal/acesso/[token]` agora cria sessao real do portal via cookie httpOnly
    - `GET /api/portal/[token]` agora reconhece o `viewer` quando existir sessao
    - `PATCH /api/portal/[token]` agora permite editar o perfil do acesso persistente atual
    - `DELETE /api/portal/session` encerra a sessao do portal
    - o portal ganhou aba `Perfil` com:
      - nome
      - e-mail
      - telefone
      - sair do acesso
- frente estrategica previdenciaria em 01/04:
  - foi registrada uma nota separada para concorrencia e expansao do produto:
    - `docs/PREVIDENCIARIO_EXPANSION_STRATEGY.md`
  - comparativo consolidado:
    - `Prévius` = profundidade tecnica de calculo
    - `Tramitação Inteligente` = conveniencia operacional de escritorio
  - tese de diferenciacao do PrevLegal:
    - CRM + IA + operacao comercial + calculo integrado ao lead
  - modulos mais promissores:
    - analise de CNIS com IA
    - score de viabilidade
    - calculo preliminar integrado ao lead
    - pecas com IA como premium
    - acompanhamento processual como premium
    - totalizacao internacional (`PrevGlobal`) como premium
  - combinado operacional:
    - esta frente fica registrada e pausada para refinamento posterior
    - quando o fundador disser `vamos continuar o mobile`, retomar exatamente da fase 1 do portal mobile-first

## Proximo Passo Recomendado

Continuar o mobile do cliente:
- validar no browser a nova secao `Acessos do portal` no detalhe do lead
- testar a geracao e o uso de um link persistente individual
- validar o ciclo completo da nova sessao do portal:
  - gerar link persistente
  - entrar no portal
  - editar perfil
  - sair do acesso
- na sequencia:
  - decidir a primeira personalizacao por `viewer` dentro do app
  - manter a Z-API como trilha operacional separada assim que o chip estiver pronto

## Bloqueios e Cuidados

- Sempre rodar `npm run build` antes de concluir uma fase
- Sempre atualizar `docs/CODEX_HANDOFF.md`, `docs/ROADMAP.md` e `docs/LEARNINGS.md`
- Sempre sincronizar os docs com o Obsidian ao final da sessao
- Ao mexer em produto, considerar `SITE_URL` separado de `APP_URL`
- Na Vercel CLI atual, env de `Preview` pode exigir branch especifica; registrar isso antes de assumir que o projeto esta 100% alinhado
- O modelo atual tem comportamento single-tenant em varias tabelas e APIs; nao subir novos escritorios sem revisar isolamento de dados

## Caminhos Importantes

- Handoff local: `docs/CODEX_HANDOFF.md`
- Roadmap local: `docs/ROADMAP.md`
- Learnings locais: `docs/LEARNINGS.md`
- Master local: `docs/MASTER.md`
- Vault Obsidian:
  - `~/Documents/Fluxrow/PrevLegal/MASTER.md`
  - `~/Documents/Fluxrow/PrevLegal/ROADMAP.md`
  - `~/Documents/Fluxrow/PrevLegal/LEARNINGS.md`

## Regra de Sessao

No inicio:
- ler este arquivo
- rodar `scripts/resume-context.sh`

No final:
- atualizar docs locais
- rodar `scripts/sync-obsidian.sh "<tema>" "<proximo passo>"`

## Atualizacao 2026-04-02 - Confirmacao de presenca no portal

- o portal agora permite `confirmar presença` na proxima consulta
- nova rota: `POST /api/portal/[token]/confirmacao`
- comportamento:
  - quando a consulta estiver `agendado` ou `remarcado`, o cliente/familiar pode confirmar presenca
  - o agendamento passa para `confirmado`
  - um evento `confirmacao_presenca_cliente` entra na timeline
  - a equipe recebe notificacao interna
- proximo passo sugerido:
  - validar esse fluxo no celular
  - depois evoluir uma camada leve de novidades/notificacoes do portal

## Atualizacao 2026-04-03 - Novidades desde o ultimo acesso no portal

- a home do portal agora ganhou uma camada leve de novidades para orientar o cliente no retorno ao app
- arquivo principal:
  - `src/app/portal/[token]/page.tsx`
- comportamento:
  - o portal mostra um bloco `Novidades desde seu ultimo acesso`
  - o corte de comparacao fica ancorado no `ultimo_acesso_em` inicial da sessao, evitando sumir com novidades apos refetch interno
  - o card resume:
    - atualizacoes recentes da timeline
    - mensagens nao lidas da equipe
    - pendencias de documento
  - o cliente pode ir direto para `Mensagens` ou `Documentos` a partir desse bloco
- validacao:
  - `npm run build` passou
- proximo passo sugerido:
  - validar a experiencia no celular com fluxo real de retorno ao portal
  - depois decidir se essa camada evolui para push/notificacao nativa
