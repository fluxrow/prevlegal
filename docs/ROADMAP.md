# PrevLegal — ROADMAP.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Última atualização: 01/04/2026

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[PRODUCT_PORTFOLIO_STRATEGY]]

## Sessões Relacionadas

- [[Sessoes/2026-03-18-prevlegal-admin-roi-obsidian]]
- [[Sessoes/2026-03-18-fase-24-inbox-operacional-unificada-roadmap-final]]

## Atualização Crítica — 19/03/2026

- O pacote `supabase/reset/combined_apply_031_and_reset.sql` foi executado diretamente no banco operacional `lrqvvxmgimjlghpwavdb`
- O projeto central `zjelgobexwhhfoisuilm` foi preservado sem execucao destrutiva
- A etapa aplicou a foundation `031` e o reset operacional limpo no mesmo alvo
- Validacao final confirmada com `0` registros em:
  - `tenants`
  - `usuarios`
  - `listas`
  - `leads`
  - `conversas`
  - `mensagens_inbound`
  - `portal_mensagens`
  - `configuracoes`
  - `contratos`
  - `parcelas`
- Proximo passo de produto/operacao:
  - cadastrar o primeiro escritorio real do zero
  - provisionar o responsavel real
  - continuar o tenant isolation definitivo com `tenant_id`, filtros canonicos e RLS

## Atualizacao Rapida — 27/03/2026

- o fluxo de conexao do Google Calendar foi corrigido para o contexto pos-reset multi-tenant
- `configuracoes` deixou de ser tratada como singleton global nos pontos criticos do app
- a persistencia do `google_calendar_token` agora:
  - garante uma linha valida de `configuracoes` antes do update
  - respeita o `tenant_id` do usuario atual
  - falha de forma explicita se a gravacao nao acontecer
- proximos testes operacionais:
  - reconectar o Google em `/agendamentos`
  - confirmar que o status conectado persiste apos recarregar a pagina
  - criar um agendamento real e validar `google_event_id` + `meet_link`
  - validar os novos atalhos operacionais de contato em leads, agendamentos e inbox
  - endurecer o runtime WhatsApp/campanhas no schema tenant-aware atual

## Atualizacao WhatsApp — 27/03/2026

- o bloco operacional de WhatsApp avancou de “atalhos na UI” para “runtime tenant-aware”
- campanhas:
  - `POST /api/campanhas` agora valida `lista_id` dentro do tenant atual antes de criar a campanha
  - contagem e disparo deixam de depender de `lista_leads` e passam a usar `leads.lista_id`
  - o disparo deixa de depender de `numeros_whatsapp`
  - status final alinhado ao enum atual: `encerrada`
- credenciais Twilio:
  - `src/lib/twilio.ts` agora resolve credenciais por `tenant_id`
  - webhook/status tambem conseguem rotear pelo numero WhatsApp do tenant
- inbound e automacao:
  - webhook Twilio agora grava `tenant_id` em `mensagens_inbound` e `notificacoes`
  - upsert de `conversas` passa a respeitar `tenant_id`
  - resposta manual e agente automatico usam credenciais/configuracoes do tenant correto
- validacao:
  - `npm run build` passou apos esse endurecimento
- proximos testes operacionais:
  - responder uma conversa manualmente pela `Caixa de Entrada`
  - validar resposta automatica do agente em uma inbound real
  - criar/disparar campanha de teste e observar `campanha_mensagens` + webhook de status
  - validar o fluxo de `Iniciar conversa` no detalhe do lead e no drawer

## Atualizacao WhatsApp Providers — 27/03/2026

- foi criada a fundacao da camada de providers em `src/lib/whatsapp-provider.ts`
- a resolucao de canal agora aceita dois caminhos:
  - legado atual por credenciais Twilio do tenant/global
  - novo registro em `whatsapp_numbers` por tenant
- o envio operacional dos fluxos abaixo passou a usar essa camada:
  - resposta manual em conversa
  - `Iniciar conversa` a partir do lead
  - resposta automatica do agente
  - disparo de campanhas
- a migration `032_whatsapp_provider_foundation.sql` prepara:
  - tabela `whatsapp_numbers`
  - provider `twilio | zapi`
  - multiplos numeros por tenant
  - referencia opcional de `whatsapp_number_id` em conversas, mensagens inbound, notificacoes e campanhas
- o app continua com fallback para o modelo Twilio atual caso a tabela nova ainda nao exista ou nao esteja preenchida
- a migration `032_whatsapp_provider_foundation.sql` ja foi aplicada no banco operacional `lrqvvxmgimjlghpwavdb`
- o primeiro canal padrao do tenant `Fluxrow` ja foi provisionado em `whatsapp_numbers`:
  - `provider = twilio`
  - `label = Twilio Sandbox`
  - `phone = whatsapp:+14155238886`
- o admin do tenant agora ja permite operar `whatsapp_numbers` direto pela UI:
  - listar canais do escritorio
  - cadastrar `Twilio` e `Z-API`
  - editar credenciais
  - definir canal padrao
  - ativar/pausar
  - excluir
- quando um canal `Twilio` ativo/padrao e salvo no admin, os campos legado do `tenant` sao sincronizados para manter compatibilidade com o restante do runtime
- proximo passo recomendado:
  - cadastrar o primeiro canal `Z-API` pelo admin do tenant
  - conectar Z-API como primeiro provider alternativo para campanha e operacao humana
  - depois permitir escolha explicita do numero de origem por campanha e por conversa humana

## Atualizacao Admin / Saude do Tenant — 30/03/2026

- o endpoint `GET /api/admin/tenants/[id]/metricas` deixou de misturar dados globais do piloto e passou a calcular sinais operacionais filtrando por `tenant_id`
- o detalhe do tenant em `/admin/[id]` agora expõe uma leitura mais executiva e acionável de saúde:
  - risco operacional (`baixo`, `medio`, `alto`)
  - resumo textual do momento do tenant
  - ultimo acesso identificado da equipe
  - usuarios ativos nos ultimos 7 dias
  - conversas dos ultimos 7 dias
  - agendamentos pendentes
- isso endurece a tela do admin em duas frentes:
  - melhora tomada de decisao comercial/operacional
  - reduz leituras erradas causadas por métricas ainda “aware”, mas nao realmente recortadas por tenant
- proximo passo recomendado fora do WhatsApp:
  - levar a mesma logica de leitura executiva para o financeiro
  - aproximar contratos, parcelas e previsibilidade de receita do mesmo recorte tenant-aware

## Atualizacao Financeiro Preditivo — 30/03/2026

- o modulo financeiro ganhou a primeira camada de previsibilidade operacional no proprio dashboard:
  - previsto em `7 dias`
  - previsto em `30 dias`
  - recebivel em aberto
  - ticket medio por contrato
  - proximos recebimentos
  - risco financeiro resumido da carteira
- o backend de resumo financeiro agora calcula esses sinais em cima da carteira visivel do tenant atual
- o endurecimento nao foi so visual:
  - `PATCH/DELETE /api/financeiro/contratos/[id]` agora validam acesso tenant-aware ao contrato
  - `PATCH /api/financeiro/parcelas/[id]` agora valida se a parcela pertence a um contrato do tenant atual
  - `GET/POST /api/financeiro/contratos` passou a respeitar o tenant do lead mesmo para admin
- isso reduz risco de leitura cruzada e deixa o financeiro mais util para operacao diaria
- o mesmo dashboard agora tambem cruza a carteira contratada com a origem comercial do lead:
  - contratos via campanha
  - operacao direta / cadastro manual
  - contratos que ja passaram por agendamento
  - contratos com agendamento realizado
  - maiores origens da carteira por valor contratado
- proximo passo recomendado:
  - cruzar previsao financeira com campanhas e agendamentos para aproximar a leitura de pipeline real

## Atualizacao Pipeline Unificado — 31/03/2026

- os relatórios agora ganharam uma camada unica de pipeline entre:
  - lead
  - conversa
  - fila humana
  - agendamento
  - contrato
- a aba `Funil` em `/relatorios` passou a mostrar:
  - leads com conversa
  - leads em fila humana
  - leads aguardando cliente
  - leads resolvidos
  - leads com agendamento
  - leads confirmados
  - leads realizados
  - leads com contrato
  - valor em contratos e ticket medio por lead contratado
- o `Dashboard` tambem foi alinhado para consultar leads com filtro explicito por `tenant_id`, evitando leitura cruzada com outras bases do piloto
- impacto operacional:
  - a equipe passa a ler no mesmo lugar o quanto o comercial ja virou operacao humana e quanto a operacao ja virou agenda/contrato
  - a leitura deixa de depender so do `status` do lead, que sozinho nao conta toda a historia
- proximo passo recomendado:
  - transformar essa leitura em filas acionaveis por etapa
  - depois ligar esse pipeline ao canal WhatsApp de origem quando a Z-API estiver operacional

## Atualizacao Filas Clicaveis — 01/04/2026

- a leitura do pipeline operacional em `/relatorios` deixou de ser apenas diagnostica
- as etapas principais agora viram atalhos de navegacao para filas reais:
  - `Com conversa` -> `/caixa-de-entrada?tab=todas`
  - `Fila humana` -> `/caixa-de-entrada?tab=humano`
  - `Aguardando cliente` -> `/caixa-de-entrada?tab=aguardando_cliente`
  - `Resolvidos` -> `/caixa-de-entrada?tab=resolvido`
  - `Agendados` -> `/agendamentos?status=pendentes`
  - `Confirmados` -> `/agendamentos?status=confirmados`
  - `Realizados` -> `/agendamentos?status=finalizados`
  - `Com contrato` -> `/financeiro?filtro=ativo`
- para isso, as telas operacionais passaram a aceitar filtros por URL:
  - `Caixa de Entrada` agora respeita `tab`
  - `Agendamentos` agora respeita `status`
  - `Financeiro` agora respeita `filtro`
- impacto operacional:
  - o funil deixa de ser so leitura executiva
  - o operador consegue sair do insight e cair direto na fila correspondente
- proximo passo recomendado:
  - avaliar se a tela de leads tambem deve aceitar filtros por URL para completar a navegacao ponta a ponta

## Atualizacao Leads por URL — 01/04/2026

- a tela `/leads` agora aceita `?status=` e aplica o recorte diretamente no servidor antes de renderizar o kanban
- os status suportados nesse filtro sao:
  - `new`
  - `contacted`
  - `awaiting`
  - `scheduled`
  - `converted`
  - `lost`

## Diretriz de Portfólio — 01/04/2026

- o crescimento do PrevLegal passa a seguir uma regra formal de portfólio
- `PrevLegal Core` continua sendo a trilha principal de execução:
  - captacao
  - qualificacao
  - inbox
  - agendamento
  - portal/mobile
  - financeiro
- novas frentes previdenciarias especializadas nao entram mais como “expansao difusa” dentro do core
- elas passam a ser tratadas como modulos premium separados, com trilha propria de discovery e arquitetura
- isso preserva:
  - a identidade principal do produto
  - o roadmap atual do mobile/core
  - a clareza comercial da oferta
- referencia canonica:
  - `docs/PRODUCT_PORTFOLIO_STRATEGY.md`

## Atualizacao Mobile / Portal — 01/04/2026

- o portal do cliente deixou de ser apenas superficie de leitura
- o cliente/familiar agora pode enviar documento direto pelo proprio portal mobile/PWA
- a nova rota `POST /api/portal/[token]/documentos/upload`:
  - valida o portal pelo `token`
  - envia o arquivo para o bucket `lead-documentos`
  - registra em `lead_documentos` com `tenant_id`
  - pode marcar uma `portal_document_request` como `enviado`
  - cria evento em `portal_timeline_events`
  - gera notificacao interna para a equipe
- a aba `Documentos` do portal agora combina:
  - upload do arquivo
  - pendencias abertas
  - documentos ja compartilhados/disponiveis
- efeito de produto:
  - o portal se aproxima de um app operacional real
  - o cliente passa a agir no fluxo, e nao apenas acompanhar
- proximo passo recomendado:
  - validar o upload real no celular
  - depois evoluir para pedido de remarcacao pelo proprio portal

## Atualizacao Mobile / Remarcacao no Portal — 02/04/2026

- o portal do cliente agora permite `pedido de remarcacao` sem alterar a agenda automaticamente
- nova rota:
  - `POST /api/portal/[token]/remarcacao`
- comportamento:
  - valida que existe um agendamento futuro do lead
  - recebe motivo e sugestao opcional de nova janela
  - cria evento `pedido_remarcacao_cliente` em `portal_timeline_events`
  - gera notificacao interna para a equipe
  - nao muda o agendamento por conta propria
- a home do portal agora expõe CTA `Pedir remarcação` dentro do card da próxima consulta
- efeito de produto:
  - o cliente/familiar ganha mais autonomia
  - a equipe continua no controle operacional do calendário
- proximo passo recomendado:
  - validar esse fluxo no celular
  - depois avaliar upload/captura de mais tipos de documento e notificacao push do portal
- a UX do kanban ganhou:
  - faixa de filtro ativo com CTA `Limpar filtro`
  - chips de status no topo para alternar rapidamente entre colunas
- o `Dashboard` tambem passou a tratar o pipeline como navegacao:
  - `Novos` -> `/leads?status=new`
  - `Contatados` -> `/leads?status=contacted`
  - `Agendados` -> `/leads?status=scheduled`
  - `Convertidos` -> `/leads?status=converted`
  - `Perdidos` -> `/leads?status=lost`
- impacto operacional:
  - o operador agora consegue sair dos cards-resumo e cair direto no recorte certo do kanban
  - o ciclo `insight -> fila -> acao` ficou fechado tambem para a superficie de leads
- proximo passo recomendado:
  - decidir se o funil executivo tambem deve ganhar atalhos para `Novos`, `Contatados` e `Perdidos`

## Atualizacao Navegacao Executiva e Sidebar — 01/04/2026

- o bloco `Funil de Conversao` em `/relatorios` agora tambem ganhou pontos clicaveis nas etapas que viram fila real:
  - `Total Leads` -> `/leads`
  - `Contatados` -> `/leads?status=contacted`
  - `Responderam` -> `/caixa-de-entrada?tab=todas`
  - `Agendados` -> `/leads?status=scheduled`
  - `Convertidos` -> `/leads?status=converted`
- a sidebar do app passou a operar em modo auto-retraido em dispositivos com hover real:
  - recolhida por padrao
  - expande ao passar o mouse
  - mantem badges e titulos por `title` no estado retraido
  - em dispositivos sem hover ela continua expandida, evitando quebrar navegacao touch
- impacto operacional:
  - mais area horizontal para kanban, calendario e tabelas densas
  - menos necessidade de scroll lateral para leitura visual do produto
- proximo passo recomendado:
  - validar no browser se a largura recolhida da sidebar ficou equilibrada no kanban e na agenda

## Atualizacao Mobile Cliente — 01/04/2026

- foi formalizada a direcao de produto para a frente mobile do cliente
- decisao atual:
  - evoluir o portal como experiencia mobile-first
  - lancar primeiro como `PWA`
  - adiar app nativo ate existir prova de uso e necessidade tecnica real
- MVP recomendado:
  - acompanhamento do caso
  - mensagens
  - agenda / Meet
  - documentos
  - perfil do cliente/familiar
- risco evitado com essa decisao:
  - nao abrir cedo demais uma segunda frente tecnica nativa
  - nao duplicar regras de negocio antes da hora

## Atualizacao Estrategica — 01/04/2026

- foi registrada uma frente estrategica separada da execucao atual do mobile:
  - comparativo de mercado entre `Prévius` e `Tramitação Inteligente`
  - tese de expansao previdenciaria do PrevLegal
  - avaliacao de modulos premium
  - oportunidade de totalizacao internacional
- leitura consolidada:
  - `Prévius` = profundidade tecnica de calculo
  - `Tramitação Inteligente` = conveniencia operacional de escritorio
  - espaco do PrevLegal = fluxo unico entre CRM, IA, atendimento, agenda e calculo integrado ao lead
- direcionamento recomendado:
  - manter no core:
    - analise de CNIS com IA
    - score de viabilidade
    - calculo preliminar integrado ao lead
  - tratar como premium:
    - geracao de pecas com IA
    - acompanhamento processual inteligente
    - totalizacao internacional
- tese de nicho premium:
  - `PrevGlobal` como modulo de totalizacao internacional com comparacao:
    - sem totalizacao
    - com totalizacao
- a execucao do mobile fica apenas pausada, nao abandonada
- gatilho de retomada combinado:
  - quando o fundador disser `vamos continuar o mobile`
- ponto exato de retomada:
  - seguir na fase 1 do portal mobile-first
  - incluir pendencias de documento no payload do portal
  - enriquecer a timeline operacional do portal
  - depois seguir para manifest/installability de PWA

## Atualizacao Mobile Cliente — 01/04/2026 (Fase 1, passo 2)

- o portal mobile-first avancou mais uma camada sem abrir uma nova superficie paralela
- `GET /api/portal/[token]` agora tambem entrega:
  - `pendencias_documento`
  - `timeline`
  - `resumo.documentos_pendentes`
- a timeline do portal agora ja consegue operar em dois modos:
  - usar eventos explicitos de `portal_timeline_events` quando a tabela existir
  - fazer fallback seguro para uma timeline derivada de:
    - abertura do caso
    - mensagens do portal
    - documentos compartilhados
    - agendamentos
- as pendencias de documento tambem ficaram preparadas com fallback seguro:
  - se `portal_document_requests` existir, o portal passa a ler pendencias reais do caso
  - se a tabela ainda nao existir no operacional, o portal nao quebra
- a home do portal ganhou:
  - resumo com 4 cards
  - bloco de `Documentos pendentes`
  - `Linha do tempo do caso`
- migration preparada:
  - `supabase/migrations/035_portal_mobile_foundation.sql`
  - tabelas:
    - `portal_timeline_events`
    - `portal_document_requests`
- proximo passo recomendado:
  - criar a superficie interna minima para o escritorio registrar pendencias de documento e eventos explicitos para o cliente
  - depois seguir para manifest/installability de PWA

## Atualizacao Mobile Cliente — 01/04/2026 (Fase 1, passo 3)

- o contexto interno do lead agora ja ganhou a superficie minima para abastecer o portal mobile-first
- novas rotas internas:
  - `GET/POST /api/leads/[id]/portal-document-requests`
  - `PATCH/DELETE /api/leads/[id]/portal-document-requests/[requestId]`
  - `GET/POST /api/leads/[id]/portal-timeline-events`
  - `PATCH/DELETE /api/leads/[id]/portal-timeline-events/[eventId]`
- a secao `Portal do Cliente` no detalhe do lead agora permite:
  - criar pendencias de documento do portal
  - atualizar status da pendencia
  - excluir pendencia
  - criar evento manual de timeline
  - alternar se o evento fica visivel para o cliente
  - excluir evento
- comportamento de seguranca:
  - tudo continua tenant-aware por `lead_id` + `tenant_id`
  - se a foundation ainda nao estiver aplicada no banco, a UI mostra aviso claro em vez de quebrar
- proximo passo recomendado:
  - aplicar a migration `035_portal_mobile_foundation.sql` no operacional
  - depois seguir para `manifest`, `icons` e installability de PWA
  - abrir um app nativo cedo demais e duplicar regras do portal
- documento canonico:
  - `docs/MOBILE_CLIENT_APP_PLAN.md`
- proximo passo recomendado:
  - transformar essa direcao em backlog tecnico com entidades, rotas, telas e ordem de implementacao

## Atualizacao Mobile Cliente — 01/04/2026 (Fase 1, passo 4)

- a migration `035_portal_mobile_foundation.sql` foi aplicada diretamente no operacional `lrqvvxmgimjlghpwavdb`
- confirmacao pos-aplicacao:
  - `portal_document_requests` existe no banco
  - `portal_timeline_events` existe no banco
- a installability da PWA entrou no proprio portal:
  - rota nova `GET /api/portal/manifest/[token]`
  - `/portal/[token]` agora usa manifesto dinamico por token
  - `public/sw.js` registra um `service worker` leve para habilitar installability
  - o portal ganhou CTA `Instalar app` quando o navegador suportar `beforeinstallprompt`
  - em iPhone / iOS, o portal mostra instrucao de `Adicionar à Tela de Início`
- impacto de produto:
  - o “app do cliente” passa a nascer do portal real, nao de uma segunda superficie
  - a instalacao abre o proprio caso do cliente em vez de redirecionar para o dashboard interno
- proximo passo recomendado:
  - validar a instalacao real no celular
  - depois desenhar a primeira camada de identidade persistente do cliente/familiar

## Atualizacao Mobile Cliente — 01/04/2026 (Fase 1, passo 5)

- a primeira camada de identidade persistente do cliente/familiar foi implementada e aplicada no operacional
- a migration `036_portal_identity_foundation.sql` ja foi executada diretamente no banco `lrqvvxmgimjlghpwavdb`
- confirmacao pos-aplicacao:
  - `portal_users` existe no banco
  - `portal_access_links` existe no banco
- novas superficies internas:
  - `GET/POST /api/leads/[id]/portal-users`
  - `PATCH/DELETE /api/leads/[id]/portal-users/[userId]`
  - `POST /api/leads/[id]/portal-access-links`
- nova superficie publica:
  - `/portal/acesso/[token]`
- o detalhe do lead agora permite:
  - cadastrar acessos persistentes para `cliente`, `familiar` e `cuidador`
  - ativar / pausar acesso
  - excluir acesso
  - gerar link persistente individual e copiar para envio
- comportamento atual do link persistente:
  - registra uso em `portal_access_links`
  - atualiza `ultimo_acesso_em` em `portal_users`
  - redireciona para o portal atual baseado em `portal_token`
- impacto de produto:
  - o escritorio sai do modelo de link unico e indistinto
  - o portal passa a reconhecer quem acessa o caso, mesmo antes de existir sessao completa do cliente
- proximo passo recomendado:
  - evoluir o link persistente para sessao/autenticacao real do portal
  - depois abrir a primeira camada de perfil do cliente/familiar dentro do proprio app

## Atualizacao Mobile Cliente — 01/04/2026 (Fase 1, passo 6)

- a ponte de identidade persistente evoluiu para sessao real do portal
- a migration `037_portal_session_foundation.sql` ja foi aplicada diretamente no operacional `lrqvvxmgimjlghpwavdb`
- confirmacao pos-aplicacao:
  - `portal_sessions` existe no banco
- novas superficies:
  - `GET /portal/acesso/[token]` agora funciona como entrada de sessao
  - `DELETE /api/portal/session` encerra o acesso persistente do cliente/familiar
- o fluxo de entrada mudou:
  - o link persistente continua registrando uso em `portal_access_links`
  - agora tambem cria uma sessao real de portal com cookie httpOnly
  - o portal passa a reconhecer o `viewer` ligado ao caso
- o app do cliente tambem ganhou a primeira aba de `Perfil`
  - mostra o acesso persistente atual
  - permite editar `nome`, `email` e `telefone`
  - permite sair do acesso
- impacto de produto:
  - o portal deixa de ser apenas um PWA por token e passa a se comportar como app com identidade real do cliente/familiar
  - isso ainda nao interfere no backoffice nem cria uma auth separada pesada demais cedo
- proximo passo recomendado:
  - validar no browser o ciclo completo:
    - gerar link persistente
    - abrir o portal
    - editar perfil
    - sair do acesso
  - depois decidir a primeira camada de timeline/documentos realmente personalizada por `viewer`

## Atualizacao Backlog Mobile Cliente — 01/04/2026

- a frente mobile agora deixou de ser so tese de produto e ganhou backlog tecnico canonico em `docs/MOBILE_CLIENT_APP_BACKLOG.md`
- o backlog foi ancorado no estado real do portal ja existente:
  - `src/app/portal/[token]/page.tsx`
  - `src/app/api/portal/[token]/route.ts`
  - `src/app/api/portal/link/[leadId]/route.ts`
  - `src/app/api/portal/threads/route.ts`
  - `src/app/api/portal/mensagens/[leadId]/route.ts`
- debitos reais registrados para a fase 1:
  - branding hardcoded de `Alexandrini Advogados` no portal
  - modelo de acesso ainda `token-only`
  - payload do portal estreito demais para uma home mobile-first
- ordem oficial de implementacao:
  - fase 1: endurecer o portal atual
  - fase 2: publicar como PWA
  - fase 3: identidade persistente de cliente/familiar
  - fase 4: canal mobile operacional completo
  - fase 5: app nativo apenas se justificar
- backlog tecnico inicial definido:
  - entidades sugeridas: `portal_users`, `portal_access_links`, `portal_timeline_events`, `portal_document_requests`
  - novas rotas planejadas para auth persistente, timeline, agenda e documentos
  - telas-alvo do MVP: `Home`, `Mensagens`, `Agenda`, `Documentos`, `Perfil` e `Acesso`
- proximo passo recomendado:
  - iniciar a Fase 1 removendo o branding hardcoded do portal e ampliando `GET /api/portal/[token]`

## Atualizacao Portal Mobile-First — 01/04/2026

- a fase 1 do app do cliente foi iniciada no portal atual
- `src/app/portal/[token]/page.tsx` deixou de depender de branding fixo de `Alexandrini Advogados`
- o portal agora consome branding dinâmico a partir de:
  - `configuracoes.nome_escritorio`
  - `configuracoes.logo_url`
  - `configuracoes.cor_primaria`
  - `tenants.responsavel_email`
  - `tenants.responsavel_telefone`
- `GET /api/portal/[token]` foi ampliado para devolver:
  - `branding`
  - `proximo_agendamento`
  - `resumo.documentos_compartilhados`
  - `resumo.mensagens_nao_lidas`
- impacto de produto:
  - o portal deixa de parecer uma tela fixa de piloto
  - a home do cliente passa a mostrar consulta futura e contato do escritorio certo
  - a base para o PWA fica mais realista sem abrir outra superficie paralela
- proximo passo recomendado:
  - incluir pendencias de documento e timeline operacional mais clara no payload do portal

## Atualizacao Agendamento Manual — 30/03/2026

- o backend ja aceitava `POST /api/agendamentos`, mas o produto ainda nao oferecia uma entrada humana obvia para criar consulta manualmente
- a criacao manual agora ficou disponivel em tres pontos:
  - botao `Novo agendamento` em `/agendamentos`
  - CTA `Agendar consulta` no detalhe do lead
  - CTA `Agendar` no `lead drawer`
- o fluxo novo usa um modal unico de criacao e reaproveita a rota ja existente, sem duplicar regra de negocio
- o endurecimento foi tambem de isolamento:
  - `GET /api/agendamentos` agora filtra explicitamente por `tenant_id`
  - `POST /api/agendamentos` valida o lead e o responsavel dentro do tenant atual antes de inserir
  - novos agendamentos passam a nascer com `tenant_id` preenchido
- para alimentar o modal global de busca, `GET /api/leads` agora suporta busca curta tenant-aware com payload leve
- impacto operacional:
  - o humano consegue marcar consulta quando a conversa avanca, mesmo sem depender do agente
  - o fluxo lead -> agenda fica direto dentro do sistema
- proximo passo recomendado:
  - validar a criacao manual na tela de agendamentos, no detalhe do lead e no drawer
  - decidir se o produto deve apenas sinalizar ou bloquear mais de um agendamento futuro ativo por lead

## Atualizacao Calendario de Agendamentos — 30/03/2026

- a tela `/agendamentos` agora nao depende so da fila/lista cronologica
- entrou uma visao mensal de calendario operacional com:
  - navegacao de mes
  - eventos categorizados por cor conforme status
  - leitura diaria dentro de cada celula
  - clique no agendamento para abrir um painel/modal de operacao
- o painel do evento reaproveita as mesmas acoes da fila:
  - confirmar
  - remarcar
  - marcar como realizado
  - cancelar
  - reatribuir responsavel
  - abrir conversa / abrir WhatsApp / abrir Meet
- impacto de produto:
  - o usuario ganha uma leitura mais natural da agenda
  - a tela fica mais proxima de um Google Calendar operacional, sem perder a fila acionavel abaixo
- proximo passo recomendado:
  - validar no browser a leitura mensal em desktop e mobile
  - decidir se vale adicionar futuramente vistas `semana` e `dia`

## Fases Concluídas

| Fase | Feature | Commit |
|------|---------|--------|
| 1-8 | Core: Kanban, Listas, WhatsApp, Agente IA, Relatórios, Google Calendar | — |
| 9 | Relatórios com Recharts | — |
| 10 | Google Calendar OAuth | b5cca53 |
| 11 | Notificações em tempo real | — |
| 12 | Fix 404 leads/[id], tooltips parciais | — |
| 13 | Calculadora previdenciária | 0e6307e |
| 14 | Geração de documentos IA | 8329b6b |
| 15 | Agente IA compliance OAB | banco |
| 16 | Criação manual de lead | 973e210 |
| 17 | Busca global ⌘K | e69ef26 |
| 18 | Multi-usuário com roles (admin/operador/visualizador) | d9c22b1 |
| 19 | Perfil multi-advogado + avatar topbar | aecc4e1 |
| 20 | Portal do cliente (token, timeline, docs, chat) | a44ff96 |
| 21 | Gestão financeira (contratos, parcelas, dashboard) | cf99ff5 |
| 22 | Onboarding tooltips — 6 páginas | 18a859b |
| 23 | ROI por campanha (contratual + sucumbência separados) | b60be88 |
| 24 | Inbox Operacional Unificada (Portal na Caixa de Entrada + badges de pendências) | e923833 |

## Commits das sessões 17-18/03/2026

| Commit | Descrição |
|--------|-----------|
| e18cee6 | fix: disparo de campanhas, middleware de auth e LP inicial |
| e26cc42 | fix(ui): UX de campanhas, sidebar e agente IA |
| cf99ff5 | feat: gestão financeira + fix adminSupabase |
| 61ac925 | fix: auth-role remove tenant_id inexistente |
| aac9c07 | fix: busca global usa ultima_mensagem_em + proxy Next.js 16 |
| 9983704 | fix: LP corrige CTA, email e remove NB do agente |
| a930735 | feat: LP nova — posicionamento operações captação |
| a52c4f2 | feat: honorários de sucumbência no contrato e financeiro |
| 6ee6da4 | feat: LP — Cabinet Grotesk |
| 3c305bd | fix: LP — remove vínculo escritório no agente |
| e0b6ec5 | fix: agente como consultora previdenciária |
| b60be88 | feat: ROI por campanha |
| 9d38513 | feat: admin — MRR, filtros, toggle, alertas trial |
| de80551 | docs: MASTER, LEARNINGS, ROADMAP criados |
| 89c302b | fix: email git para fbcfarias@icloud.com |
| 1d6a4fe | fix: LP CTA para /login + link admin no footer |
| 5d78202 | chore: script sync-obsidian.sh criado |
| affb16c | chore: redeploy env vars admin Vercel |

## Migrations Aplicadas (lrqvvxmgimjlghpwavdb)

| # | Migration | Descrição |
|---|-----------|-----------|
| 029 | financeiro | Tabelas contratos e parcelas |
| 030 | honorarios_sucumbencia | Campos sucumbência em contratos |
| 031 | honorarios_separados_campanhas | View campanhas_resumo_financeiro |

## Env Vars Adicionadas no Vercel (18/03/2026)

| Var | Descrição |
|-----|-----------|
| ADMIN_FLUXROW_EMAIL | Email de acesso ao painel admin |
| ADMIN_FLUXROW_SENHA | Senha de acesso ao painel admin |
| ADMIN_FLUXROW_TOKEN | Token de sessão httpOnly — gerado com openssl |

## Obsidian — Setup Concluído

- Vault criado em `~/Documents/Fluxrow`
- Plugin Local REST API instalado (porta 27124 HTTPS)
- Claude Desktop configurado com `obsidian-filesystem` + `obsidian-rest` MCPs
- `uvx` instalado via Homebrew
- Script `sync-obsidian.sh` em `scripts/sync-obsidian.sh`

## Conhecimento Consolidado das Sessões 17-18/03/2026

### Arquitetura e compatibilidade
- Next.js 16 exige `proxy.ts` com export `proxy`, não apenas rename do arquivo
- Handlers admin com Supabase service role precisam instanciar `createClient` dentro de cada função
- A tabela `usuarios` é single-tenant e não possui `tenant_id`
- A tabela `conversas` usa `ultima_mensagem_em`, não `updated_at`

### Produto e posicionamento
- PrevLegal não é SaaS para advogado autônomo: o posicionamento correto é operação de captação previdenciária com escritório parceiro
- O agente comercial nunca deve se apresentar como representante do escritório parceiro
- O CTA principal da LP deve apontar para `/login`, não para a raiz do domínio

### Financeiro e ROI
- O sistema agora separa honorários contratuais de honorários de sucumbência
- A sucumbência tem campos próprios em contratos, KPI específico no financeiro e totais separados no resumo
- ROI por campanha agora tem aba dedicada com ranking, gráfico e tabela detalhada

### Admin e segurança operacional
- O admin ganhou filtros por plano/status, MRR estimado, toggle ativar/suspender e alerta de trial expirando
- O admin agora tem página de detalhe do tenant com métricas de uso, saúde da conta, últimas conversas e últimas campanhas
- O acesso admin foi desenhado em 3 camadas:
  - rota discreta
  - cookie httpOnly
  - token secreto validado no servidor com expiração
- Após configurar env vars no Vercel, foi necessário forçar redeploy para garantir leitura no ambiente de produção
- O hardening do Supabase zerou todos os `ERRORs` do Security Advisor em `prevlegal-alexandrini` e `prevlegal-central`
- Os `WARNINGs` remanescentes foram classificados:
  - `rls_policy_always_true` aceito no modelo `single-tenant` atual
  - `pg_trgm` em `public` sem impacto prático relevante
  - `Leaked password protection disabled` pendente de ativação no painel do Supabase

### Operação e atendimento
- A `Caixa de Entrada` evoluiu de lista WhatsApp para inbox operacional multicanal, com aba dedicada para `Portal`
- O canal `Portal` agora tem fila própria por lead, painel de resposta e leitura baseada em mensagens reais do cliente
- A sidebar passou a exibir badges por pendência operacional:
  - `Caixa de Entrada` soma portal + conversas humanas pendentes + agendamentos novos do agente
  - `Agendamentos` destaca reuniões criadas pelo agente ainda não visualizadas
- o detalhe do lead e o drawer agora permitem editar os dados do cadastro sem sair do fluxo operacional

### Marketing site / LP
- A LP foi reescrita com foco em operações de captação previdenciária
- Tipografia de títulos migrada para Cabinet Grotesk
- Mockups e copy do agente foram limpos de NB e de qualquer vínculo explícito com escritório parceiro
- O demo animado foi embedado na LP e reforçado para funcionar sem dependências externas críticas
- A raiz `/` agora funciona como porta de entrada inteligente:
  - visitante sem sessão -> LP
  - usuário com sessão -> dashboard
- A Fase 0 e a Fase 2 do runbook de domínio foram executadas localmente:
  - arquitetura aprovada: `www` + apex redirect + `app` + `admin`
  - metadata SEO, sitemap, robots, manifest, headers e OG image já estão preparados para o cutover
  - commit principal: `cebda979`

### Integrações e mensageria
- O envio WhatsApp agora usa helper centralizado com fallback global e suporte a credenciais Twilio por tenant
- O portal do cliente passou a alimentar notificações globais e badges operacionais fora do detalhe do lead
- o produto ganhou atalhos operacionais para cair na thread certa da `Caixa de Entrada` ou abrir o numero no WhatsApp diretamente a partir de:
  - detalhe do lead
  - drawer do lead
  - modal de mensagens do lead
  - agendamentos
  - busca global de conversas
- o runtime de campanhas deixou de depender das tabelas legado `lista_leads` e `numeros_whatsapp`
- webhook inbound, webhook de status e resposta automatica do agente agora roteam Twilio/configuracoes pelo `tenant_id` ou pelo numero WhatsApp do tenant
- o detalhe do lead e o drawer agora permitem iniciar uma conversa manual mesmo sem thread previa, criando a thread humana e levando direto para a inbox
- `whatsapp_numbers` agora aceita canais rascunho inativos sem credenciais finais, o que permite preparar `Twilio` e `Z-API` antes da ativacao
- campanhas agora salvam `whatsapp_number_id` e respeitam warm-up automatico por canal quando `metadata.warmup_enabled = true`
- o tenant `Fluxrow` ja tem um canal reservado para o chip novo:
  - `Z-API Warm-up 41984233554`
  - phone `+5541984233554`
  - pausado, nao-padrao, aguardando `instance_id` e `instance_token`

### Documentação viva e rotina de sessão
- `MASTER.md`, `ROADMAP.md` e `LEARNINGS.md` passaram a funcionar como memória viva do projeto
- Ao final de cada sessão, a documentação deve ser sincronizada com o vault do Obsidian
- O script `scripts/sync-obsidian.sh` cria uma nota datada da sessão com commits recentes e próximo passo

## Backlog

## Próximas Fases Recomendadas

## Plano de Execução — Próximas 2 Semanas

### Semana 1 — Base operacional e atendimento humano

1. Multi-tenant residual
- revisar superficies ainda sensiveis que leem/gravam sem ancora canônica de `tenant_id`
- priorizar:
  - métricas do detalhe do tenant
  - campanhas e contadores auxiliares
  - notificações e consultas transversais
- resultado esperado:
  - reduzir o restante do comportamento “piloto unico” antes de escalar novos escritorios

2. Inbox humana avancada
- status atual:
  - primeira camada operacional ja entrou na `Caixa de Entrada` com estados `aguardando_cliente` e `resolvido`, ownership via `assumido_em` e reabertura automatica no inbound
- introduzir estados operacionais na conversa:
  - `novo`
  - `assumido`
  - `aguardando_cliente`
  - `resolvido`
- separar visualmente:
  - fila do agente
  - fila humana ativa
  - fila aguardando retorno
  - fila resolvida
- adicionar metadados operacionais:
  - `assumido_por`
  - `assumido_em`
  - `resolvido_em`
- resultado esperado:
  - a inbox deixa de ser so uma thread e passa a funcionar como mesa operacional real

3. Fluxo de lead <-> inbox
- reforcar o ciclo:
  - editar lead
  - iniciar conversa
  - assumir/devolver
  - atualizar status do lead sem sair do atendimento
- resultado esperado:
  - o operador navega menos e resolve mais dentro da mesma sessão

### Semana 2 — Agendamentos e gestão executiva

1. Agendamentos operacionais
- status atual:
  - primeira camada operacional ja entrou na tela com fila por status, confirmacao, remarcacao inline e reatribuicao de responsável no contexto admin
- criar fila dedicada para reuniões geradas pelo agente
- permitir:
  - confirmar
  - remarcar
  - cancelar
  - marcar visualizado
  - atribuir responsável humano
- resultado esperado:
  - agendamento vira fila operacional, não apenas lista cronológica

2. Saúde do tenant no admin
- expandir o detalhe do tenant com sinais de uso:
  - ultimo acesso
  - volume recente de conversas
  - ritmo de operação
  - risco de churn / baixa adoção
- resultado esperado:
  - o admin passa a servir comercial, CS e operação da Fluxrow

3. Preparação para campanhas inteligentes
- começar a estruturar a camada analítica:
  - melhor lista
  - melhor copy
  - melhor horário
  - falhas por provider
  - resposta por campanha
- resultado esperado:
  - abrir o caminho para otimização sem misturar isso com o hardening atual

### Critério de prioridade

- critico:
  - multi-tenant residual
  - provider WhatsApp real / oficial
- maior ganho de UX:
  - inbox humana avancada
  - agendamentos operacionais
- maior ganho executivo:
  - saúde do tenant
  - financeiro preditivo

### Fase 25 — Session Security Hardening
- Expiração por inatividade na plataforma (`45 min`)
- Expiração por inatividade no admin (`15 min`)
- Reautenticação para áreas e ações sensíveis
- Revisão de UX para manter login fluido com timeout inteligente

Status atual em 18/03/2026:
- implementada localmente no código
- validada com `npm run build`
- pendente de validação manual em runtime e commit/push

### Fase 26 — Multi-tenant real
- Isolar métricas, campanhas, Twilio, contratos e notificações por tenant real
- Permitir que a página de detalhe do tenant leia da base/credencial correta

### Fase 27 — Inbox Humana Avançada
- Adicionar estados operacionais como `novo`, `assumido`, `aguardando cliente`, `resolvido`
- Separar fila de qualificação do agente da fila de atendimento humano

### Fase 28 — Agendamentos Operacionais
- Criar fila de reuniões geradas pelo agente com ação rápida de confirmar, remarcar e cancelar
- Adicionar status de visualização e responsável humano
- Estado atual em 31/03/2026:
  - fluxo manual pelo detalhe do lead validado com convite chegando por e-mail
  - calendario operacional mensal validado
  - ponto residual mais recente ficou na busca digitada do modal global de `/agendamentos`, atacado pela remocao da dependencia de `leads.email` na busca curta

### Fase 29 — Saúde e risco do tenant
- Expandir o admin com tendências de uso, último acesso, risco de churn e crescimento por período
- Exibir sinais executivos de adoção para o time comercial da Fluxrow

### Fase 30 — Financeiro preditivo
- Projeção de receita, aging de parcelas, previsão de sucumbência e carteira prevista por mês
- Conectar ROI de campanha com contratos e recebimento real

### Fase 31 — Campanhas inteligentes
- Comparar templates, horários e listas por performance
- Exibir falhas de envio, resposta e conversão em uma camada de otimização
- Incluir política de warm-up por canal como camada operacional nativa de campanha

### Fase 32 — Migração para domínio próprio
- Colocar `prevlegal.com.br` como domínio principal do site
- Separar `app.prevlegal.com.br` para a plataforma
- Revisar CTAs, login, portal, links absolutos e notificações

### Alta prioridade
- [x] Implementar política de sessão por inatividade no app e no admin sem degradar a experiência diária
- [ ] Isolar métricas do detalhe do tenant por base/credencial real quando o multi-tenant deixar de ser piloto único
- [ ] Definir estados explícitos da fila humana na Caixa de Entrada (`assumido`, `aguardando cliente`, `resolvido`)

### Média prioridade
- [ ] Marcação explícita de "assumido por humano" nas conversas para separar fila de atendimento de conversas apenas abertas
- [ ] Fila dedicada de agendamentos criados pelo agente com confirmação operacional
- [ ] Sinais de risco de churn e adoção no detalhe do tenant
- [ ] Migração segura para `prevlegal.com.br` + `app.prevlegal.com.br`

### Baixa prioridade
- [ ] Repo GitHub privado
- [ ] Domínio + email exclusivo PrevLegal (prevlegal.com.br)
- [ ] Stripe Billing

## Atualizacao Mobile / Confirmacao de Presenca no Portal — 02/04/2026

- o portal agora permite `confirmar presença` na próxima consulta quando ela estiver `agendado` ou `remarcado`
- nova rota:
  - `POST /api/portal/[token]/confirmacao`
- comportamento:
  - atualiza o agendamento para `confirmado`
  - registra `confirmacao_presenca_cliente` em `portal_timeline_events`
  - gera notificacao interna para a equipe
- racional:
  - diferente da remarcacao, essa e uma automacao leve e de baixo risco operacional
  - melhora previsibilidade de comparecimento sem baguncar a agenda

## Atualizacao Mobile / Novidades no Portal — 03/04/2026

- a home do portal passou a destacar `Novidades desde seu ultimo acesso`
- comportamento:
  - resume atualizacoes recentes da timeline visivel ao cliente
  - destaca mensagens nao lidas da equipe
  - destaca pendencias de documento
  - oferece atalhos para abrir `Mensagens` e `Documentos`
- detalhe importante de produto:
  - o corte de novidades fica preso ao `ultimo_acesso_em` inicial da sessao
  - isso evita apagar novidades cedo demais quando o portal faz refetch apos uma acao do proprio cliente
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar runtime no celular
  - decidir depois se a camada deve evoluir para push/notificacao nativa
