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

## Fonte de Verdade

Ordem de leitura:
1. `docs/SESSION_BRIEF.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/ROADMAP.md`
4. `docs/LEARNINGS.md`
5. Vault Obsidian em `~/Documents/Fluxrow/PrevLegal/`

## Estado Atual

Ultima atualizacao: 2026-03-30

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

## Proximo Passo Recomendado

Validar o runtime WhatsApp no tenant limpo:
- responder uma conversa manualmente pela `Caixa de Entrada`
- validar se a mensagem sai com o numero/origem do tenant correto
- provocar uma inbound real e confirmar resposta automatica do agente
- validar `Iniciar conversa` em um lead sem thread previa
- criar e disparar uma campanha de teste
- observar `campanha_mensagens`, webhook de status e atualizacao de contadores
- retestar agora o envio manual e o `Iniciar conversa` com o canal default do tenant
- identificar a causa operacional do `errorCode 63015` no sandbox Twilio e confirmar a adesao correta do numero de destino
- provocar uma inbound de resposta no mesmo numero para validar roteamento pelo tenant
- cadastrar o primeiro canal `Z-API` na nova UI do admin e validar um disparo de campanha ponta a ponta
- amanha:
  - plugar o chip `41984233554` na instancia Z-API
  - preencher `instance_id` / `instance_token` no canal rascunho ja criado
  - ativar o canal e manter warm-up ligado
  - testar envio humano primeiro e so depois campanha curta
- testar o fluxo de `Editar dados` no detalhe do lead e no drawer, validando persistencia imediata dos campos
- testar a nova inbox humana:
  - assumir uma conversa
  - marcar `aguardando cliente`
  - marcar `resolvido`
  - reabrir manualmente
  - confirmar se uma inbound real reabre automaticamente de `aguardando_cliente` / `resolvido` para `humano`
- testar os agendamentos operacionais:
  - confirmar um agendamento
  - remarcar com nova data/hora
  - reatribuir responsável (admin)
  - cancelar e validar reflexo no status do lead
- depois retomar os testes operacionais do tenant isolation canonico por `tenant_id`
- plano fora do WhatsApp para as proximas 2 semanas:
  - semana 1:
    - multi-tenant residual
    - inbox humana avancada
    - fluxo lead <-> inbox
  - semana 2:
    - agendamentos operacionais
    - saúde do tenant no admin
    - preparação para campanhas inteligentes
  - proximo bloco sugerido:
    - financeiro preditivo tenant-aware

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
