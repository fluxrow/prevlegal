# PrevLegal — ROADMAP.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Última atualização: 10/04/2026

## Atualizacao 2026-05-07 — Inbox passou a expor responsável e documentos do lead sem mexer no motor de conversa

- necessidade operacional:
  - o time precisava enxergar, dentro da própria caixa de entrada, com quem o lead está e quais documentos ele já enviou
  - isso precisava acontecer sem reescrever webhook, agente ou dispatch de WhatsApp
- desenho adotado:
  - manter `mensagens_inbound` como trilha textual principal
  - criar uma leitura lateral dos documentos do lead a partir da conversa
  - reaproveitar o `responsavel_id` do lead e a thread interna já existente para exibir o responsável operacional
- correção aplicada:
  - inbox ganhou badge `Com <responsável>` na lista e no cabeçalho da conversa
  - a conversa agora mostra uma faixa com os documentos vinculados ao lead, com link rápido para abrir arquivo e ir para o lead
  - foi criada uma rota segura `/api/conversas/[id]/documentos`, respeitando a visibilidade da inbox sem afrouxar o endpoint geral de documentos do lead
- leitura prática:
  - a operação ganha contexto documental e dono do caso sem sair da caixa de entrada
  - anexos outbound e áudio continuam fora da V1; isso segue como evolução posterior, não parte desta entrega

## Atualizacao 2026-05-07 — Inbox ganhou compartilhamento seguro de documento por WhatsApp sem reescrever o provider

- necessidade operacional:
  - o operador precisava enviar contrato, minuta ou documento já vinculado ao lead sem sair da caixa de entrada
  - ao mesmo tempo, a camada de WhatsApp do produto ainda está estruturada para envio textual, não mídia binária
- desenho adotado:
  - manter o provider como está
  - compartilhar o documento por mensagem manual com link assinado renovado no momento do envio
  - reaproveitar a própria biblioteca `lead_documentos` do lead, sem criar trilha paralela
- correção aplicada:
  - a área manual da inbox ganhou botão `Documentos`
  - o operador pode escolher um documento já existente e enviar com mensagem opcional
  - o backend cria uma signed URL nova e dispara um WhatsApp textual com o link
  - o envio fica espelhado no histórico da conversa como mensagem manual
- leitura prática:
  - o escritório ganha velocidade operacional já nesta V1
  - a entrega entra sem reescrever `whatsapp-provider`
  - “anexo real” continua sendo etapa futura; por enquanto o produto entrega compartilhamento seguro por link

## Atualizacao 2026-05-06 — Preparação de minuta passou a aproveitar também documentos já processados

- necessidade operacional:
  - a minuta/contrato não podia depender só do que apareceu na conversa
  - em muitos casos, os dados mais confiáveis do cliente ficam no documento enviado, não no chat
- desenho adotado:
  - manter o fluxo atual de upload, parsing e geração de minuta
  - melhorar apenas a camada de extração de dados do cliente
  - quando existirem `document_parsed_contents` do lead, eles entram como evidência adicional para a extração
- correção aplicada:
  - `extractClientDataFromConversation` agora lê conversa + até 4 documentos processados do lead
  - a degradação continua segura: sem foundation documental ou sem parsing pronto, a extração volta a operar só com a conversa
- leitura prática:
  - contratos e minutas ficam mais propensos a nascer com CPF/RG/endereço/profissão corretos quando o cliente já mandou documento
  - Docling passa a gerar valor real no fluxo contratual sem virar dependência rígida do core

## Atualizacao 2026-05-06 — Primeira resposta da Bianca após campanha ficou mais natural em saudações curtas

- achado operacional:
  - em respostas como `Bom dia`, a Bianca podia soar estranha ao devolver `Tudo bem por aqui, obrigada.` mesmo sem ter recebido uma pergunta social
  - em alguns casos ainda sobrava um bloco solto como `obrigada.`, deixando a resposta com cara de artefato
- correção aplicada:
  - a suavização de saudação curta agora só injeta `Tudo bem por aqui, obrigada.` quando o lead realmente perguntou algo como `tudo bem?`
  - blocos isolados de cortesia (`obrigada.`, `obrigado.`) passaram a ser limpos antes do envio
  - o prompt do primeiro retorno após campanha foi endurecido para não presumir profissão ou contexto societário antes de o lead informar o próprio perfil
- leitura prática:
  - a primeira resposta fica mais humana e menos “esquisita”
  - o escritório ganha uma abertura mais limpa para qualificar o perfil sem que a Bianca pareça adivinhar demais cedo demais

## Atualizacao 2026-05-06 — Campanhas ganharam agendamento seguro sem trocar o motor de disparo

- necessidade operacional:
  - permitir que o escritório prepare a campanha agora e deixe o primeiro envio começar sozinho em um horário futuro
  - manter o fluxo atual de lote, delay, worker, pause/resume e métricas sem reescrever o dispatch
- desenho adotado:
  - campanha criada sem horário continua em `rascunho`
  - campanha criada com horário futuro nasce em `agendada`
  - o worker promove `agendada -> ativa` quando `agendado_para` vence e só então processa o primeiro passo
- correção aplicada:
  - a UI de campanhas ganhou escolha entre `Salvar e disparar depois` e `Agendar disparo`
  - o card da campanha agora exibe o horário agendado
  - o endpoint `disparar` passou a aceitar campanha `agendada`, permitindo adiantar manualmente um disparo futuro
  - o enum `campanha_status` foi expandido com `agendada`
- leitura prática:
  - o escritório passa a programar disparos sem virar a campanha em `ativa` cedo demais
  - o núcleo do envio continua igual: a novidade entra só na semântica de início da campanha

## Atualizacao 2026-05-05 — Campanhas ganharam biblioteca segura de templates com `usar`, `criar`, `editar` e `excluir`

- necessidade operacional:
  - acelerar disparos recorrentes sem obrigar o operador a reescrever a copy toda vez
  - preservar a liberdade de ajustar a mensagem final da campanha antes do disparo
  - manter esse padrão reaproveitável tanto para `beneficios_previdenciarios` quanto para `planejamento_previdenciario`
- desenho adotado:
  - a campanha continua salvando uma `mensagem_template` final própria
  - a biblioteca de templates entra só como camada de produtividade na UI
  - o worker e o dispatch não consultam template “ao vivo” no momento do envio
- correção aplicada:
  - a tela de campanhas ganhou botão `Templates` junto ao campo de mensagem
  - o popup agora lista:
    - templates sugeridos do sistema, derivados do contexto atual
    - templates do escritório, com `usar`, `editar` e `excluir`
    - fluxo de `criar template` a partir da mensagem atual
  - a persistência foi isolada em `campaign_message_templates`, com CRUD próprio por tenant
- leitura prática:
  - o operador ganha velocidade sem perder controle fino da copy
  - editar ou excluir um template não altera campanhas já criadas
  - o padrão fica forte o bastante para reaproveitar em produtos futuros da Fluxrow
  - a migration `campaign_message_templates` já foi aplicada no banco operacional `lrqvvxmgimjlghpwavdb`, então os templates do escritório ficaram liberados em produção sem novo deploy

## Atualizacao 2026-05-04 — Campanha por contatos específicos deixou de aparentar “sumir com parte da base”

- achado operacional:
  - ao criar campanha em `Contatos específicos`, a tela mostrava só uma parte dos leads do escritório
  - na prática, parecia que vários contatos “não existiam” para seleção
- causa raiz:
  - o frontend pedia apenas `50` leads por vez
  - a API de `/api/leads` também impunha teto máximo de `50`
  - como a UI não tinha paginação nem `carregar mais`, o operador ficava preso ao primeiro recorte ordenado por `updated_at`
- correção aplicada:
  - `scope=operational` passou a aceitar páginas maiores para uso operacional
  - a tela de campanhas ganhou `offset` + botão `Carregar mais contatos`
  - a busca continua filtrando por tenant e respeitando `lgpd_optout`, mas deixa de esconder silenciosamente o restante da base
- leitura prática:
  - seleção personalizada volta a refletir muito melhor a base real do escritório
  - quando houver muitos leads, a operação pode continuar carregando mais contatos sem depender de uma busca exata por nome/telefone

## Atualizacao 2026-05-05 — Campanha por `status` passou a usar snapshot seguro, sem mexer no motor de disparo

- necessidade operacional:
  - permitir retomadas e abordagens dirigidas por `status` do lead, sem depender de montar lista manual ou clicar contato por contato
  - essa lógica vale para os dois perfis operacionais do produto (`beneficios_previdenciarios` e `planejamento_previdenciario`)
- desenho adotado:
  - o novo modo `Por status` não filtra audiência “ao vivo” no worker
  - na criação da campanha, o sistema resolve todos os leads elegíveis daquele status e grava um snapshot em `campanha_leads`
  - o dispatch continua reaproveitando exatamente a mesma trilha já estável de `contatos específicos`
- correção aplicada:
  - UI de campanhas ganhou o terceiro modo `Por status`
  - `/api/leads` agora aceita filtro opcional por `status` e pode devolver `count` para preview operacional
  - `/api/campanhas` passou a aceitar `target_mode = status` + `lead_status`
  - inserção em `campanha_leads` foi endurecida com chunking para evitar fragilidade em campanhas maiores
- leitura prática:
  - a campanha fica previsível: o público é congelado no momento da criação
  - isso evita drift de audiência se o lead mudar de status depois
  - o motor de envio, métricas, pausa/retomada e resposta por histórico real permanecem intactos

## Atualizacao 2026-04-30 — Campanhas ganharam `Pausar/Retomar` na UI e leitura de respostas ficou resiliente ao histórico real da inbox

- achado operacional:
  - a tela de campanhas podia mostrar `0 respondidos` mesmo com várias respostas visíveis na caixa de entrada
  - além disso, a operação ainda dependia de pausa manual no banco porque a UI não expunha `Pausar` / `Retomar`
- causa raiz:
  - a trilha `Twilio` já marcava `campanha_mensagens` como `respondido` e incrementava `total_respondidos`
  - a trilha `Z-API`, que é a base operacional atual, persistia o inbound mas não fazia esse fechamento de métrica
  - a tela de campanhas dependia demais do contador materializado em `campanhas.total_respondidos`
- correção aplicada:
  - `Twilio` e `Z-API` agora compartilham a mesma marcação por lead para resposta de campanha, contando uma vez só por mensagem aberta da campanha
  - `GET /api/campanhas` passou a hidratar `total_respondidos` com fallback pelo histórico real:
    - `campanha_mensagens.status = respondido`
    - leads com inbound real na campanha (`respondido_por_agente = false` e `respondido_manualmente = false`)
  - a UI de campanhas agora mostra:
    - `Pausar` para campanhas ativas
    - `Retomar` para campanhas pausadas
    - `Disparar agora` apenas para rascunho
- leitura prática:
  - a operação deixa de depender de SQL manual para pausar disparo
  - a card da campanha fica muito mais próxima do que o operador enxerga na inbox, inclusive em histórico criado antes da correção do webhook

## Atualizacao 2026-04-30 — Campanhas por seleção personalizada deixaram de perder vínculo de resposta por depender de `lead.campanha_id`

- achado operacional:
  - nas campanhas criadas com `campanha_leads`, os leads continuavam com `lead.campanha_id = null`
  - quando o lead respondia, o webhook localizava o lead mas não conseguia reatribuir o inbound à campanha correta
- causa raiz:
  - `Twilio` e `Z-API` usavam `lead.campanha_id` como fonte principal de rastreio da campanha
  - isso funciona para fluxos antigos baseados no campo do lead, mas não para seleção personalizada
- correção aplicada:
  - ao receber a resposta, o webhook agora tenta resolver a campanha pelo histórico real de disparo aberto em `campanha_mensagens`
  - o inbound passa a nascer com `campanha_id` resolvido mesmo quando o lead não carrega esse campo
  - a marcação de `respondido` e o incremento de `total_respondidos` usam essa campanha resolvida
- leitura prática:
  - campanhas pequenas e personalizadas da Pagliuca deixam de “conversar na inbox sem pontuar na card”
  - a rastreabilidade volta a seguir o disparo real, não uma coluna legada do lead

## Atualizacao 2026-04-29 — Inbox ganhou base de `estado_operacional` separada do funil do lead, sem ativar automações novas

- desenho aprovado para a V1:
  - o funil do lead continua existindo para relatório e pipeline
  - a inbox passa a ter um `estado_operacional` próprio da conversa, editável pelo usuário
  - esse estado não dispara automações sozinho nesta entrega
- estados expostos na V1:
  - `em_andamento`
  - `morno`
  - `frio`
  - `aguardando_cliente`
  - `aguardando_documentos`
  - `aguardando_contrato`
  - `agendado`
  - `em_atendimento_humano`
  - `convertido`
  - `encerrado`
- implementação aplicada:
  - `conversas` ganhou colunas de `estado_operacional`, `estado_operacional_prazo_at` e `estado_operacional_atualizado_em`
  - a lista da inbox agora mostra badge do estado operacional além do status atual da conversa
  - a conversa aberta ganhou seletor manual do estado e prazo opcional para estados que pedem acompanhamento
  - a API de `PATCH /api/conversas/[id]` agora persiste esse estado sem encostar nas réguas ou nos agentes
- leitura prática:
  - o usuário passa a organizar a operação pela realidade do caso, não por configuração de agente
  - follow-up, recuperação e cobrança por prazo continuam desligados até aprovação explícita

## Atualizacao 2026-04-29 — Falha de saldo na Anthropic agora degrada com aviso ao lead, sem silêncio no WhatsApp nem dupla notificação interna

- achado no smoke real:
  - após responder ao disparo de campanha, o lead podia cair direto para `Em atendimento` sem receber retorno da Bianca
  - a conversa ficava em `humano` mesmo com `agente_ativo = true`, dando a impressão de bug no reset ou no roteamento
- causa raiz:
  - a chamada ao modelo da Anthropic estava falhando por `credit balance is too low`
  - o runtime já devolvia a conversa para `humano`, mas sem mensagem de contingência no WhatsApp
  - além disso, a mesma ocorrência gerava uma notificação no `/api/agente/responder` e outra no webhook, duplicando o ruído operacional
- correção aplicada:
  - em caso de saldo insuficiente da Anthropic, o runtime agora envia uma mensagem curta de continuidade ao lead antes de devolver a conversa para o humano
  - o inbound original passa a ficar marcado com `resposta_agente`, evitando a sensação de “sumiu para atendimento humano sem responder”
  - o helper do autoresponder trata esse caso como já resolvido internamente, impedindo a segunda notificação genérica do webhook
- leitura prática:
  - o bloqueio real continua sendo operacional: sem saldo na Anthropic, a Bianca não consegue seguir o fluxo automático
  - mas, se isso voltar a acontecer, o lead não fica mais sem resposta e a equipe interna recebe um único sinal claro do problema

## Atualizacao 2026-04-29 — Pagliuca ganhou nomeação nominal de `Marcos ou Diogo` e aviso de fora do horário deixou de reabrir o mesmo inbound

- achado do smoke real:
  - algumas respostas de `planejamento` ainda conseguiam citar a Dra. Ana como se ela fizesse pessoalmente o diagnóstico técnico individual
  - quando o lead respondia fora da janela, recebia o aviso de horário e, em alguns casos, o mesmo inbound ainda acabava gerando resposta normal logo depois
- correção aplicada:
  - o runtime final de `planejamento` passou a normalizar respostas que tentem jogar análise, agendamento ou preparação técnica na conta da Dra. Ana
  - para o contexto da Pagliuca, o handoff humano agora nomeia `Marcos ou Diogo` no próprio runtime
  - o webhook de `outside_hours` agora marca aquele inbound como já respondido pelo aviso de horário, evitando que o mesmo texto seja reprocessado logo em seguida
- leitura prática:
  - a nomeação de `Marcos/Diogo` não depende mais só do prompt salvo no banco
  - o aviso de fora do horário deixa de competir com uma segunda resposta automática para a mesma mensagem do lead

## Atualizacao 2026-04-29 — Worker de campanhas voltou a atravessar o proxy autenticado por `CRON_SECRET`

- achado em produção:
  - campanhas novas saíam do `0` para `1 enviado` e depois ficavam paradas mesmo após vários minutos
  - o primeiro disparo acontecia no clique inicial, mas o restante nunca era retomado pelo cron
- causa raiz:
  - o `proxy` do app tratava `/api/campanhas/worker` como rota privada comum
  - com isso, a chamada interna do Vercel Cron era desviada para `/login` antes de chegar na handler
- correção aplicada:
  - o middleware agora deixa passar apenas workers internos autenticados por `Authorization: Bearer ${CRON_SECRET}`
  - a exceção cobre `campanhas`, `agente`, `followup` e `document-processing`, sem abrir a superfície para tráfego não autenticado
- leitura prática:
  - a campanha continua disparando o primeiro lead na hora
  - os próximos envios voltam a depender do worker minuto a minuto, mas agora o cron efetivamente alcança a rota

## Atualizacao 2026-04-29 — Webhook Twilio ganhou deduplicação real de inbound

- achado em produção:
  - uma mesma resposta do lead podia entrar duas vezes na inbox e gerar duas respostas automáticas diferentes
  - no caso inspecionado, o mesmo `Oi Bianca, Pode sim` foi persistido duas vezes com `9s` de diferença
- causa raiz:
  - a trilha `Twilio` ainda não tinha a mesma blindagem de deduplicação que já existia na `Z-API`
  - o webhook aceitava o mesmo inbound de novo e reacionava o agente como se fosse mensagem nova
- correção aplicada:
  - deduplicação por `MessageSid` no próprio webhook da Twilio
  - fallback adicional por corpo recente (`45s`) no mesmo tenant/remetente/destinatário
- leitura prática:
  - isso não corrige só a visualização da inbox
  - impede também a segunda resposta automática no WhatsApp real quando a Twilio reenviar ou duplicar o mesmo inbound

## Atualizacao 2026-04-29 — Inbox deixou de puxar scroll para baixo a cada polling e passou a esconder duplicatas espelhadas do mesmo inbound

- achado em uso real:
  - ao abrir conversas longas como a da `Roseni`, a caixa rolava sozinha para o fim sem parar
  - além disso, duplicatas do mesmo inbound reapareciam no histórico mesmo quando o agente já tinha reaproveitado a resposta anterior
- correção aplicada:
  - o painel da inbox agora só auto-scrolla quando entra mensagem nova e o operador já está perto do rodapé
  - ao trocar de conversa, ele ancora uma vez no fim; depois disso, não força a rolagem a cada polling
  - a leitura de `/api/conversas/[id]` passou a colapsar duplicatas com o mesmo `twilio_message_sid`, preferindo a versão mais completa da mensagem
- leitura prática:
  - o operador volta a conseguir subir o histórico e ler desde o começo
  - a thread deixa de mostrar “ecos” do mesmo inbound quando o reaproveitamento de resposta já resolveu o caso sem novo envio

## Atualizacao 2026-04-29 — Plataforma endurecida para operar só com Z-API e absorver duplicata tardia de `externalId`

- achado na varredura:
  - em produção, hoje só existem canais ativos `zapi`; não há tenant ativo com número Twilio configurado
  - mesmo assim, a base ainda carregava fallback legado da Twilio e a Z-API mostrava vários pares duplicados do mesmo `externalId`
- correção aplicada:
  - o webhook Twilio agora ignora payload que não resolva para um tenant Twilio explícito
  - o resolver de canal deixou de cair automaticamente no fallback legado da Twilio quando não houver configuração ativa e `ALLOW_LEGACY_TWILIO_FALLBACK` não estiver habilitado
  - a Z-API ganhou um colapso pós-insert de duplicata por `externalId`, limpando o segundo registro mesmo se ele conseguir furar a checagem inicial
- leitura prática:
  - para os próximos disparos, a plataforma fica operacionalmente ancorada na Z-API
  - reduzimos o risco de eco por webhook repetido e também o risco de um fallback silencioso mandar tráfego para Twilio sem intenção

## Atualizacao 2026-04-29 — Nomeação nominal de `Diogo/Marcos` ficou pronta só para teste local de planejamento

- necessidade operacional:
  - a Bianca não deve mais sugerir que a Dra. Ana faz pessoalmente o diagnóstico técnico individual
  - no caso da Pagliuca, o handoff humano correto do `planejamento` é para `Diogo` ou `Marcos`
- ajuste aplicado:
  - o runtime de `/api/agente/responder` ganhou uma camada local para nomear `Diogo ou Marcos` como responsáveis pela análise individual e validação final
  - o mesmo runtime mantém fallback neutro (`advogado responsável da equipe` / `especialista responsável`) quando essa nomeação nominal não estiver ativa
- trava de segurança:
  - por enquanto isso ficou intencionalmente restrito ao ambiente local de teste, sem push nem deploy
  - a produção continua no comportamento neutro até validação interna explícita
- impacto prático:
  - já dá para rodar smoke interno vendo se a Bianca usa `Diogo/Marcos` com naturalidade
  - sem risco de vazar essa convenção para outros tenants antes da hora

## Atualizacao 2026-04-29 — Aviso de fora do horário voltou a disparar no webhook

- achado do smoke real:
  - o agente de `planejamento` estava respeitando a janela e devolvendo `202 outside_hours`
  - mas o lead não recebia a mensagem de “fora do horário”
- causa:
  - o helper `triggerAgentAutoresponder(...)` tratava `202` como sucesso genérico
  - com isso, o webhook não entrava no ramo de `registerAgentAutoresponderFailure(...)`, que é justamente o que envia o aviso ao lead e registra a retomada
- correção:
  - `outside_hours` agora volta do helper como não-ok operacional, com payload preservado
  - isso reativa o fluxo já existente de aviso ao lead tanto em `Z-API` quanto em `Twilio`
- impacto prático:
  - antes das `08:00` ou fora da janela configurada, o lead deve receber a mensagem de espera
  - a conversa continua em `agente`
  - a retomada automática segue valendo na próxima janela útil

## Atualizacao 2026-04-29 — Planejamento ganhou folga controlada contra corte no meio da frase

- após o reteste real, o comportamento da Bianca melhorou bastante, mas apareceu um resíduo:
  - algumas respostas boas eram cortadas no final, com cara de mensagem truncada por limite
- ajuste fino aplicado:
  - cap de `planejamento` subiu levemente, sem voltar ao padrão prolixo
  - respostas com `stop_reason = max_tokens` ou final com cara de frase interrompida entram em reescrita curta
  - a reescrita foi instruída a completar a ideia com naturalidade, sem alongar
- impacto prático:
  - reduz chance de terminar em “meio pensamento”
  - preserva o estilo mais humano e enxuto alcançado no runtime

## Atualizacao 2026-04-29 — Handoff humano de planejamento não pode ser atribuído automaticamente à Dra. Ana

- achado do smoke real:
  - a Bianca chegou a responder como se a Dra. Ana fosse quem conduz pessoalmente o diagnóstico técnico individual
- problema:
  - no fluxo real da Pagliuca, essa etapa deve ficar com o advogado ou especialista responsável da equipe
  - atribuir automaticamente à sócia/fundadora cria expectativa errada e desalinha a operação
- correção:
  - seed de `planejamento` endurecido para proibir esse atalho
  - runtime também passou a instruir explicitamente que a etapa humana deve ser referida como `advogado responsável da equipe`, `especialista responsável` ou `equipe jurídica responsável`
- impacto prático:
  - a Bianca continua fazendo triagem e avanço comercial
  - a validação individual deixa de ser jogada automaticamente na conta da Dra. Ana

## Atualizacao 2026-04-28 — Cadastro manual de planejamento deixou de depender da semântica de benefício

- ajuste operacional aplicado para o caso real da Pagliuca:
  - a tela `Novo lead` agora abre com o perfil operacional padrão do tenant, mas o operador pode trocar manualmente no próprio modal
  - `planejamento_previdenciario` mostra:
    - e-mail
    - categoria profissional
    - data de nascimento
    - contexto inicial
  - `beneficios_previdenciarios` continua com:
    - `NB`
    - banco
    - `valor_rma`
    - `ganho_potencial`
- correção de backend associada:
  - cadastro manual de `planejamento` passa a reaproveitar o lead existente quando o telefone já está na base do tenant, evitando erro de `duplicate key ... leads_nb_key`
  - o identificador técnico legado continua sendo gerado quando necessário, mas deixa de ser o gargalo operacional
- ajuste lateral:
  - nomes com mojibake passaram a ser reparados em import e interpolação outbound crítica
- impacto prático:
  - operador pode complementar lead de planejamento sem precisar “inventar NB”
  - a mudança não mexe no fluxo de `benefícios`

## Atualizacao 2026-04-28 — Planejamento ganhou contenção extra de estilo no runtime real

- após smoke manual da campanha da Pagliuca, ficou claro que o gargalo não era só técnico:
  - o agente ainda escorregava para respostas longas
  - reapareciam `*`, listas e texto com cara de parecer
  - em cenário de inbound duplicado, podia nascer nova resposta para a mesma ideia
- reforços aplicados no runtime:
  - teto menor de tokens em `planejamento`
  - sanitização final de WhatsApp
  - reescrita curta quando o texto vier com cara de relatório
  - reaproveitamento da resposta anterior em caso de inbound duplicado recente
- leitura prática:
  - antes de escalar volume hoje, vale rerodar exatamente o cenário real que mostrou repetição, porque esse caso agora é o canário certo do runtime

## Atualizacao 2026-04-28 — Campanha de planejamento não exige verificação prévia por padrão

- ajuste operacional aplicado para o caso real da Pagliuca:
  - UI de campanhas agora desliga `apenas_verificados` por padrão quando o agente/perfil é `planejamento_previdenciario`
  - API de criação de campanha também usa esse fallback quando a campanha de planejamento é criada sem esse campo explícito
- comportamento preservado:
  - `beneficios_previdenciarios` continua com verificação ligada por padrão
- motivo:
  - listas de planejamento com `nome + telefone` não devem travar o primeiro disparo só porque ainda não passaram por verificação formal de WhatsApp
- regra prática:
  - para planejamento, contato operacional válido já basta para o primeiro disparo
  - para benefícios, manter o filtro conservador segue fazendo sentido

## Atualizacao 2026-04-27 — Knowledge de planejamento foi podada; próximo alvo específico é médico PJ / pró-labore

- `npm run build` passou inteiro
- o smoke técnico `scripts/smoke-test-agent-ana.ts` foi rodado novamente após poda da knowledge de:
  - `03_planejamento_por_perfil.md`
  - `04_previdencia_complementar.md`
  - `08_perguntas_tecnicas_frequentes.md`
- mudanças aplicadas:
  - troca de “regra prática” por “estrutura de análise”
  - redução de cifras, percentuais e patrimônios hipotéticos
  - redução de frases que empurravam “sempre”, “quase sempre”, “vale mais” ou “estratégia típica” cedo demais
  - prompt total caiu de ~`33.4k` para ~`33.0k` tokens estimados no smoke
- comportamento observado:
  - `T4` advogado fora do repertório ficou mais consultivo e menos prescritivo
  - `T5` dentista ficou menos assertiva e mais documental
  - `T1` e `T3` mantiveram melhora
  - `T2` médico PJ continua sendo o principal cenário residual de excesso numérico
- próximo ajuste recomendado antes de ampliar volume em `planejamento`:
  - [ ] isolar a trilha `médico PJ / pró-labore` com guardrails ainda mais fortes contra exemplos monetários e comparações de aposentadoria

## Atualizacao 2026-04-27 — Playbook de planejamento endurecido e validado; próximo refinamento é perfis fora do repertório profundo

- `npm run lint` passou inteiro
- `npm run build` passou inteiro
- o smoke técnico `scripts/smoke-test-agent-ana.ts` foi rodado novamente após ajuste de seed + runtime do `planejamento_previdenciario`
- melhorias aplicadas:
  - primeiro retorno pós-campanha mais curto
  - menos markdown de relatório no WhatsApp
  - menor teto de tokens para `planejamento`
  - knowledge técnica passou a ser enquadrada como apoio, e não como autorização para parecer precoce
- comportamento melhorou principalmente em:
  - `T1` magistrado/FUNPRESP
  - `T3` executivo/PGBL
  - `T6` pedido de valor específico
- risco residual:
  - `T2` médico PJ ainda puxa números ilustrativos demais
  - `T4` advogado fora do repertório ainda assume contexto demais em vez de descobrir
  - `T5` dentista ainda fica mais assertiva do que o ideal para pergunta inicial
- próximo ajuste recomendado antes de escalar volume em campanhas de `planejamento`:
  - [ ] separar guardrails mais duros para perfis fora do repertório profundo
  - [ ] revisar a knowledge de `planejamento` para podar exemplos numéricos que puxam resposta de “parecer”
  - [ ] rodar smoke real no WhatsApp com atenção especial ao primeiro retorno técnico do lead

## Atualizacao 2026-04-27 — build/lint verdes + smoke técnico do planejamento rodando, mas com novo ajuste recomendado antes da primeira campanha

- `npm run lint` passou inteiro
- `npm run build` passou inteiro
- o typecheck do app foi isolado do runtime Deno de `supabase/functions/*`, evitando falso negativo no build do Next
- o smoke técnico `scripts/smoke-test-agent-ana.ts` voltou a rodar ponta a ponta com o runtime real do playbook de `planejamento_previdenciario`
- achados do smoke técnico:
  - runtime ativo e base de conhecimento carregando
  - porém o prompt de planejamento ficou grande demais (`132299` chars, ~`33k` tokens estimados antes da pergunta do lead)
  - cada cenário ficou entrando na Anthropic com ~`42.8k` tokens de input, custo alto demais para operação recorrente
  - o agente ainda tende a:
    - responder com blocos longos demais
    - cravar inclinação estratégica cedo demais
    - inventar números ilustrativos demais para um momento que ainda deveria ser consultivo
- recomendação operacional imediata antes da primeira campanha de planejamento:
  - [x] endurecer guardrails específicos de `planejamento_previdenciario` para:
    - não sugerir que uma opção "frequentemente é vantajosa" sem análise individual
    - não estimar valores, diferenças patrimoniais, tempo exato de antecipação ou mix percentual de renda sem CNIS/documentação
    - priorizar `1-2` perguntas de descoberta antes de aula técnica longa
    - limitar o primeiro retorno técnico a blocos curtos
  - [ ] reduzir a carga do prompt de planejamento:
    - resumir a knowledge base injetada
    - ou quebrar a base por tema / roteamento contextual
    - ou gerar uma versão “pre-campanha” mais curta para o primeiro turno
- importante:
  - este ajuste é de `planejamento_previdenciario`
  - não deve contaminar o playbook curto e de credibilidade inicial de `beneficios_previdenciarios`

## Atualizacao 2026-04-27 — Campanhas ganharam worker próprio e diagnóstico de elegibilidade/disparo

- investigando o relato de que uma campanha de `benefícios` com expectativa de `~50` contatos só tinha conseguido disparar `3-4`, ficou claro que o problema não era apenas “lista ruim”
- causa estrutural identificada:
  - `POST /api/campanhas/[id]/disparar` fazia o loop inteiro do disparo dentro da própria requisição
  - a rota ainda aplicava:
    - delay aleatório entre mensagens
    - pausa entre lotes
    - cap de `warmup` do canal
  - em campanhas médias, especialmente com warm-up ativo, isso podia estourar a janela da função antes de concluir o lote
- correção aplicada:
  - criação de `src/lib/campaign-dispatch.ts`
  - criação de `POST/GET /api/campanhas/worker`
  - novo cron em `vercel.json` para `/api/campanhas/worker` a cada minuto
  - `POST /api/campanhas/[id]/disparar` agora:
    - ativa a campanha
    - processa só o primeiro passo
    - devolve diagnóstico com:
      - total bruto
      - sem contato resolvido
      - filtrados por `apenas_verificados`
      - elegíveis
      - tentados hoje
      - cap efetivo de warmup / lote / delay
  - o restante segue em worker, sem depender de uma única request longa
- impacto prático:
  - campanhas de `benefícios` deixam de ficar truncadas por timeout silencioso
  - o operador passa a ter pistas melhores quando o gargalo for:
    - `warmup`
    - `apenas_verificados`
    - falta de contato resolvido
- próximo ajuste recomendado nessa frente:
  - [ ] mostrar esse diagnóstico também na UI de campanhas, não só na resposta da API

## Atualizacao Observabilidade / logging bruto de tokens do agente entrou no pre-go-live — 18/04/2026

- [x] Logging bruto de tokens do agente (pré-go-live)
- [x] Reset operacional de lead de teste para smoke recorrente
  - Endpoint `POST /api/leads/[id]/reset-teste`
  - Botão `Resetar lead de teste` no detalhe do lead
  - Limpa conversa, mensagens, notificações, follow-up, rastro de campanha e colaboração interna sem apagar o cadastro base do lead
- [ ] Dashboard de custos por tenant (P1 pós-go-live)
- [ ] Rate limiting por tenant baseado em budget (P2)
- [ ] Auditoria e correção das policies RLS pós-migration 039 (`usuarios.id` vs `auth_id`) — P2 pós-piloto
- [ ] Piloto de memória semântica / grafo local para docs operacionais do PrevLegal e memória compartilhada da Fluxrow (P1 pós-smoke)
  - Escopo inicial: `docs/`, `LEARNINGS`, `SESSION_BRIEF`, handoffs e notas operacionais do vault
  - Objetivo: reduzir custo de retomada de contexto, melhorar handoff e preservar decisões importantes fora da busca linear
  - Regra: não indexar PII de lead, documentos reais, segredos ou dumps de produção
- [ ] Criar uma camada de documentação canônica / “livro operacional” acima do `LEARNINGS` cronológico (P1 pós-smoke)
- [x] Criar primeira camada de documentação canônica / “livro operacional” acima do `LEARNINGS`
  - `OPERATIONAL_BOOK.md`
  - guias de go-live, canais, agentes, multi-tenant e troubleshooting
  - `LEARNINGS` continua como memória bruta; o livro passa a ser a síntese executável
  - Objetivo: transformar o histórico acumulado em guias enxutos de “o que fazer / como fazer / por que fazer”
  - Regra: `LEARNINGS` continua como memória bruta; a nova camada vira síntese reutilizável e menos verborrágica
  - Escopos iniciais:
    - go-live operacional
    - arquitetura multi-tenant
    - playbooks dos agentes
    - integrações e webhooks
    - padrões de rollout e troubleshooting
- [x] Expandir a segunda camada do livro operacional
  - documentos e minuta
  - campanhas e follow-up
  - portal do cliente
  - financeiro e contratos
- [x] Expandir a terceira camada do livro operacional
  - inbox humana e colaboração interna
  - agendamentos
  - admin e saúde dos tenants

## Débito técnico consciente (documentado pré-go-live)

- [ ] Reforço de isolamento de carteira via RLS (P1 pós-piloto)
  - Contexto: isolamento de leads/conversas/mensagens por `responsavel_id` hoje funciona via filtro backend + service role. RLS das tabelas `leads`, `conversas`, `mensagens_inbound` e `mensagens_outbound` está ampla e não garante isolamento sozinha.
  - Risco atual: baixo durante o piloto (2 advogados, 1 tenant, todo acesso via rotas backend validadas).
  - Risco futuro: cresce se houver cliente autenticado direto no Supabase (ex: app mobile nativo) ou se alguma rota for exposta sem filtro adequado.
  - Solução: auditoria de policies RLS seguindo convenção `auth_id = auth.uid()` (mesma do bug latente já documentado).
  - Testes obrigatórios antes de aplicar: todas as rotas que leem essas tabelas via client autenticado precisam continuar funcionando.
  - Prioridade: P1 após estabilização do piloto (semana 3-4).

## Débito técnico pós-piloto (origem: ultrareview pré-go-live)

Bugs identificados no ultrareview de 18/04 que foram conscientemente adiados para pós-piloto, com justificativa:

- [ ] C2: Fire-and-forget do `logLlmUsage` pode perder dados em serverless
  - Solução: migrar para `waitUntil()` da Vercel ou queue dedicada
  - Prioridade: P1 se volume crescer; P2 no piloto
- [ ] H1: Race condition no cache de knowledge
  - Solução: pending-promise pattern no loader
  - Prioridade: P2
- [ ] M1: Novo Supabase client por chamada do logger
  - Solução: singleton do client em módulo
  - Prioridade: P2
- [ ] M2: Sem validação de tamanho do prompt pré-Anthropic
  - Solução: contador de tokens + guard com fallback para conversa resumida
  - Prioridade: P2
- [ ] M4: Smoke test divergente da montagem de produção
  - Solução: extrair `buildSystemPrompt` real e reutilizar no smoke test
  - Prioridade: P2
- [ ] M5: `error.message` da Anthropic exposto no HTTP response
  - Solução: normalizar mensagens de erro por categoria
  - Prioridade: P1 quando tiver ingress público
- [ ] M6: `Promise.all` no `readFile` dos `.md` de knowledge
  - Solução: `Promise.allSettled` + warning por arquivo
  - Prioridade: P2
- [ ] M7: PII do lead no prompt enviado à Anthropic
  - Solução: habilitar zero retention no contrato Anthropic + revisão de DPO do escritório
  - Prioridade: P1 (decisão de produto/LGPD)
- [ ] L1-L7: melhorias de tipagem, observabilidade e hygiene
  - Prioridade: P3

## Atualizacao Contratos / motor MVP de minuta por tenant entrou no produto — 17/04/2026

- para sustentar o go-live do escritório Pagliuca / Lessnau, o produto ganhou a primeira camada real de geração de minuta por tenant
- entregas desta frente:
  - nova tabela `contract_templates` com escopo por tenant, tipo de contrato, corpo HTML, placeholders definidos e ativação/desativação
  - bucket `contratos-leads` no storage para guardar PDFs gerados por lead
  - endpoint `POST /api/leads/[id]/preparar-minuta` para:
    - buscar lead + tenant
    - substituir placeholders
    - gerar PDF a partir de HTML
    - salvar o arquivo no storage
    - registrar documento e evento na timeline do lead
  - endpoint `/api/contract-templates` para listar, criar, editar e remover templates do tenant
  - tela `Configurações > Templates` para gestão operacional de minutas
  - botão `Preparar minuta` no detalhe do lead com:
    - seleção de template
    - preview dos dados preenchidos
    - geração de PDF
    - marcação de "pronto para envio"
  - seed inicial gracioso para o tenant Pagliuca / Lessnau, com template-base de honorários para planejamento previdenciário
- decisões de produto:
  - o envio automático da minuta pelo agente ainda não entra nesta fase; o operador humano continua decidindo o momento de envio
  - o motor de PDF foi implementado de forma compatível com Vercel (`puppeteer-core` + `@sparticuz/chromium`)
  - a estrutura de placeholders já nasce tenant-aware, para permitir expansão posterior sem reabrir o schema
- impacto operacional:
  - o agente Ana passa a ter um caminho concreto para handoff em pré-fechamento
  - o escritório consegue preparar minuta com dados do cliente sem depender de fluxo totalmente manual fora da plataforma
  - o produto avança de CRM + inbox para operação jurídica assistida por IA com fechamento mais próximo do contrato real
- próximo passo natural:
  - plugar o template jurídico final da Pagliuca / Lessnau
  - validar geração em produção com PDF real
  - depois decidir se o envio da minuta vira ação assistida do agente ou continua manual por mais um ciclo

## Atualizacao Agente Ana / planejamento previdenciário ganhou base técnica injetável, memória curta e proteção anti-flood — 17/04/2026

- com o contrato da Pagliuca / Lessnau fechado e go-live até quarta, o playbook de `planejamento_previdenciario` deixou de ser apenas experimental e passou a exigir endurecimento real de operação
- correções aplicadas nesta frente:
  - o profile `Captação de Planejamento Previdenciário` passou a ser explicitamente `titular-only`
  - o `fluxo_qualificacao` agora captura, de forma natural ao longo da conversa:
    - idade
    - regime principal (`RGPS`, `RPPS`, ambos ou exterior)
    - tempo aproximado de contribuição
    - horizonte de aposentadoria
    - previdência complementar
    - patrimônio previdenciário aproximado
    - sensibilidade técnica do lead
  - a escalada do agente Ana deixou de ser por “pergunta técnica difícil” e passou a ser por etapa do processo:
    - análise individual de `CNIS` / documentos
    - cálculo formal / projeção
    - aceite do diagnóstico técnico pago
    - pedido expresso para falar com humano
    - chegada em proposta / contrato / assinatura
  - o runtime agora injeta, quando `perfil_operacao = planejamento_previdenciario`, a base de conhecimento em `docs/agent-knowledge/planejamento-previdenciario/`
  - a leitura dessa base ganhou cache por assinatura de `mtime`, evitando leitura de disco a cada request
  - o runtime passou a aplicar coalescência de mensagens rápidas e proteção anti-flood por lead
  - `conversas` agora suporta `resumo_operacional`, permitindo memória curta persistida para conversas longas
- impacto operacional:
  - o agente Ana deixa de parecer frágil em lead premium
  - perguntas técnicas gerais passam a poder ser respondidas com documentação do escritório, sem depender só do prompt seedado
  - conversas longas ficam menos sujeitas a “reinício de contexto”
  - custo e ruído operacional caem quando o lead dispara múltiplas mensagens em sequência
- próximo passo natural:
  - ligar essa fundação ao motor de minuta / contrato
  - e depois alimentar o diretório de conhecimento técnico com os 8 arquivos planejados

## Atualizacao Arquitetura de Producao / isolamento por tenant, playbook e rollout controlado — 16/04/2026

- com o PrevLegal entrando em fase de pagantes, ficou inadequado continuar tratando mudanças de playbook como comportamento global da produção
- decisão de arquitetura:
  - manter `core único`
  - isolar playbooks operacionais por perfil:
    - `beneficios_previdenciarios`
    - `planejamento_previdenciario`
  - ativar mudanças novas por tenant/flag antes de rollout amplo
- implicações práticas:
  - `benefícios` e `planejamento` deixam de evoluir no mesmo tenant de teste
  - o escritório da Jessica permanece como base de `beneficios_previdenciarios`
  - o escritório de planejamento deve nascer em tenant próprio, já alinhado ao playbook `titular-only`
  - toda evolução relevante de agente, campanha ou esteira deve passar a considerar:
    - tenant piloto
    - versão do playbook
    - rollback simples
- direção aprovada:
  - criar camada formal de flags/versionamento por tenant
  - usar rollout controlado para features como:
    - `planning_flow_v1`
    - `planning_contract_handoff_v1`
    - `resend_mailmarketing_v1`
    - `agent_multistage_memory_v1`
- referência canônica:
  - `docs/PRODUCTION_ISOLATION_STRATEGY.md`

## Atualizacao Inbox + Campanhas / outbound passou a entrar na thread e inbound voltou a acionar o agente automaticamente — 16/04/2026

- durante o reteste da campanha com a lista enriquecida, o envio do WhatsApp estava funcionando, mas a experiência da inbox ainda estava quebrada em dois pontos importantes:
  - a resposta do lead aparecia na thread, mas a mensagem originalmente enviada pela campanha não aparecia
  - o lead respondia com interesse, mas o agente não continuava automaticamente a conversa
- causa identificada:
  - `POST /api/campanhas/[id]/disparar` registrava o envio apenas em `campanha_mensagens`
  - a inbox, por outro lado, lê o histórico apenas de `mensagens_inbound`
  - além disso, os webhooks de inbound (`Z-API` e `Twilio`) salvavam a nova mensagem e atualizavam a conversa, mas não acionavam a rota do agente para continuar o atendimento
- correção aplicada:
  - a campanha agora cria ou reaproveita a `conversa` do lead no momento do disparo
  - cada envio bem-sucedido da campanha passa a ser espelhado também em `mensagens_inbound`, com `conversa_id`, `lead_id` e `whatsapp_number_id`
  - o histórico do agente passou a diferenciar corretamente:
    - mensagem inbound do lead
    - mensagem outbound já enviada pelo sistema/agente
  - os webhooks `Z-API` e `Twilio` agora disparam o auto-responder em background quando a conversa continua no modo `agente`
- impacto operacional:
- a inbox passa a mostrar a thread completa, incluindo o primeiro toque da campanha
- quando o lead responde positivamente, o agente pode continuar a conversa usando o contexto real do que já foi enviado
- isso reduz o risco de o agente parecer “cego” ao disparo que iniciou o atendimento
- observação de arquitetura:
  - `campanha_mensagens` continua sendo a trilha analítica/comercial da campanha
  - `mensagens_inbound` passa a ser a trilha operacional unificada da thread humana/IA
  - essa separação é intencional, mas agora as duas trilhas ficam reconciliadas no runtime

## Atualizacao Leads + Campanhas / contatos familiares passaram a ser estruturados no lead e não só anotados em texto — 17/04/2026

- durante o ajuste final do disparo por `filho` / `irmao`, ficou claro que a solução anterior ainda estava "esperta demais" para o modelo de dados real do produto
- problema observado:
  - o importador já enxergava números de cônjuge, filho e irmão
  - mas o lead ainda guardava isso principalmente em `anotacao` e, no máximo, em um `telefone_enriquecido` genérico
  - o disparo por familiar acabava dependendo de inferência operacional em vez de campos explícitos visíveis para o operador
- correção aplicada:
  - `leads` passam a suportar campos estruturados para:
    - `conjuge_nome`, `conjuge_celular`, `conjuge_telefone`
    - `filho_nome`, `filho_celular`, `filho_telefone`
    - `irmao_nome`, `irmao_celular`, `irmao_telefone`
  - o importador enriquecido passa a preencher esses campos diretamente
  - o cadastro detalhado do lead e a edição manual passam a mostrar esses dados de forma explícita
  - o disparo de campanha por `conjuge`, `filho` ou `irmao` passa a usar esses campos estruturados, em vez de depender só de `telefone_enriquecido`
  - os webhooks `Z-API` e `Twilio` passam a reconhecer respostas vindas desses números estruturados, vinculando ao lead correto
- impacto operacional:
  - o operador passa a enxergar com clareza para quem o sistema vai disparar
  - a campanha familiar deixa de depender de um "alternativo genérico"
  - o produto ganha um caminho mais seguro para go-live em operações com contatos de familiares
- decisão de produto:
  - `telefone_enriquecido` continua existindo para compatibilidade e contexto
  - mas campanhas por familiar devem preferir sempre os campos estruturados do lead

## Atualizacao Kanban / modal de conversa passou a resolver histórico pelo lead em vez da fila da inbox — 17/04/2026

- durante o reteste da visão rápida do Kanban, apareceu uma diferença importante entre `lead com histórico` e `conversa visível na inbox`
- problema observado:
  - alguns cards mostravam o nome do contato certo, mas o modal ainda dizia que não existia conversa
  - em outros casos, o modal abria só parte da thread, escondendo mensagens do próprio lead
- causa identificada:
  - o modal ainda dependia demais das rotas da inbox (`/api/conversas` e `/api/conversas/[id]`), que seguem a lógica de visibilidade da fila humana
  - isso não é equivalente ao que o Kanban precisa mostrar, porque o Kanban é uma superfície ancorada no `lead`
- correção aplicada:
  - `/api/leads/[id]` agora resolve:
    - a conversa principal por `lead_id`
    - fallback por telefone do lead quando necessário
    - histórico de WhatsApp do lead por `lead_id` e telefone
  - o modal do card passou a usar esse payload como fonte primária
- impacto operacional:
  - o operador consegue abrir a visão rápida da conversa direto do Kanban sem depender da fila da inbox
  - threads antigas ou parcialmente desvinculadas do `lead_id` continuam acessíveis quando o telefone bate com o lead correto

## Atualizacao Inbox + Agente / confirmação de handoff para Dra. Jessica agora sai do modo agente e entra em aguardando — 17/04/2026

- durante o refino final do fluxo de benefícios, o agente já conseguia explicar o cenário e confirmar que a Dra. Jessica continuaria o atendimento
- problema observado:
  - mesmo depois de o lead confirmar que a Dra. Jessica podia assumir, a conversa continuava em `agente`
  - isso deixava a thread no box errado da inbox e escondia o momento operacional em que a equipe humana deveria agir
- correção aplicada:
  - o runtime de `/api/agente/responder` agora detecta a etapa de confirmação do handoff em `beneficios_previdenciarios`
  - quando a última mensagem do lead for uma confirmação curta e a mensagem anterior do agente já estiver na etapa “Dra. Jessica vai entrar em contato / pode ser neste número?”, a conversa passa automaticamente para `aguardando_cliente`
  - o status muda sem criar estado novo e aproveita a própria lógica de inbox já existente, inclusive a reabertura automática para `humano` se o lead voltar a responder depois
- impacto operacional:
  - o agente deixa de “segurar” uma conversa que já foi entregue ao humano
  - a fila `Aguardando` passa a representar de verdade os casos prontos para retorno da equipe
  - o fluxo da Jessica fica mais próximo do atendimento real esperado para go-live

## Atualizacao Listas / exclusão agora limpa campanhas não ativas vinculadas — 17/04/2026

- durante a preparação para reimportar a base enriquecida com contatos estruturados, a exclusão de uma lista de teste passou a falhar com:
  - `update or delete on table "listas" violates foreign key constraint "campanhas_lista_id_fkey" on table "campanhas"`
- causa identificada:
  - `campanhas.lista_id` é `NOT NULL` e usa `ON DELETE RESTRICT`
  - a rota de exclusão da lista removia `leads` e tentava apagar `listas`, mas ignorava campanhas antigas ainda apontando para aquela lista
- correção aplicada:
  - a exclusão de lista agora consulta campanhas vinculadas
  - se existir campanha `ativa` ou `pausada`, a exclusão é bloqueada com mensagem operacional clara
  - se as campanhas vinculadas estiverem em `rascunho` ou `encerrada`, o sistema apaga primeiro:
    - `disparos`
    - `campanhas`
  - e só depois remove `leads` e `listas`
- impacto operacional:
  - listas de teste ou órfãs deixam de travar a limpeza do tenant
  - o operador consegue reimportar a base corrigida sem precisar fazer SQL manual
  - campanhas ativas continuam protegidas contra exclusão acidental por efeito colateral da lista

## Atualizacao Agente / continuidade de benefícios endurecida e resposta automática reconciliada com webhook `fromMe` — 17/04/2026

- durante o uso real da operação da Jessica, ficou evidente que o agente ainda cometia dois erros de percepção:
  - depois de um `sim` curto do lead, ele podia se reapresentar ou reabrir a conversa como se estivesse começando de novo
  - a resposta automática enviada pelo agente podia reaparecer na thread como mensagem `humana` por causa do espelhamento `fromMe` da Z-API
- correção aplicada:
  - endurecer a camada de continuidade em `beneficios_previdenciarios` para:
    - não repetir a abertura da campanha
    - não pedir interesse de novo depois de retorno positivo curto
    - não começar com socialização desnecessária
    - explicar o cenário identificado e avançar em etapa
  - gravar o `twilio_sid` da resposta automática do agente no próprio registro de `mensagens_inbound`, permitindo que o webhook `fromMe` reconheça o envio e não o replique como mensagem manual
- impacto operacional:
  - a conversa tende a ficar mais natural e menos “em círculo”
  - o histórico da inbox deixa de misturar resposta do agente com resposta humana quando a origem foi a própria automação

## Atualizacao Agentes + Campanhas / playbook de benefícios ficou alinhado ao contexto real de readequação e continuidade — 15/04/2026

- durante o refinamento final para go-live, ficou claro que o template e o prompt padrão de `benefícios previdenciários` ainda estavam genéricos demais para o caso real da Jessica
- problema observado:
  - o primeiro contato podia soar como triagem ampla de previdenciário, quando na prática a lista já vem com pessoas mapeadas para uma possível revisão ou readequação
  - a copy inicial ainda corria risco de despejar informação demais cedo demais
  - o runtime do agente não deixava explícito como continuar a conversa sem reiniciar contexto quando mais de um agente estivesse ativo
- correção aplicada:
  - templates de campanha de `benefícios previdenciários` foram reescritos para:
    - primeiro contato mais curto
    - foco em informação previdenciária importante
    - nada de valores/retroativos na abertura
    - variação específica para titular e familiar
  - o seed dos agentes de `benefícios` foi ajustado para refletir a operação real:
    - triagem aquece e deixa o caso pronto para a advogada responsável
    - follow-up comercial avança para atendimento jurídico, não “vende promessa”
    - documental continua a conversa como parte da mesma esteira
  - o runtime do agente agora injeta uma camada de `continuidade operacional`, informando:
    - que o histórico da conversa é a fonte oficial do caso
    - qual etapa da esteira o agente atual ocupa
    - se existem ou não agentes seguintes ativos
    - que, sem agentes seguintes, a triagem deve deixar o caso pronto para handoff humano
- impacto operacional:
  - a copy padrão do escritório fica mais crível no primeiro contato
  - o aquecimento do lead passa a refletir melhor a operação manual atual da Jessica
  - os agentes seguintes deixam de parecer “cegos” ao que já foi falado

## Atualizacao Campanhas / template padrão passou a respeitar perfil operacional do agente — 14/04/2026

- durante o refinamento das campanhas enriquecidas, ficou claro que o template sugerido ainda estava errado para contato frio com titular
- problema observado:
  - mesmo quando o escritório operava no playbook de `benefícios previdenciários`, a campanha padrão podia sugerir texto com cara de `inbound`, como "recebi seu contato"
  - isso quebrava a coerência entre:
    - tipo de operação do escritório
    - agente escolhido
    - tipo de contato (`titular`, `conjuge`, `filho`, `irmao`)
- correção aplicada:
  - `agentes` agora passam a suportar `perfil_operacao`
  - perfis atualmente válidos:
    - `beneficios_previdenciarios`
    - `planejamento_previdenciario`
  - o seed de agentes passa a gravar esse perfil
  - o CRUD de agentes permite manter/editar esse campo
  - a sugestão de template da campanha agora considera:
    - `perfil_operacao`
    - `tipo` do agente
    - `contato_alvo_tipo`
  - quando nenhum agente específico é escolhido, a campanha passa a usar o agente padrão do escritório como referência real de copy
- impacto operacional:
  - o playbook padrão do escritório deixa de parecer genérico
  - contato com `titular` passa a soar como campanha outbound coerente com a frente ativa
  - contato com familiar continua usando abordagem cautelosa e contextual
  - cada etapa da operação agora pode nascer com copy própria:
    - `triagem`
    - `reativacao`
    - `followup_comercial`
    - `documental`
    - `confirmacao_agenda`
- decisão de arquitetura:
  - esta frente justifica schema em `agentes` porque o perfil operacional já afeta seed, campanha, copy e expansão futura para operação híbrida
  - o próximo passo natural é permitir que o escritório conviva com múltiplos agentes de mesmo `tipo`, desde que em perfis operacionais diferentes

## Atualizacao Leads + Campanhas / tipo do contato de abordagem como estrutura operacional — 14/04/2026

- a operação enriquecida deixou claro que o produto já não pode tratar todo número como “telefone do lead” sem contexto
- para campanhas previdenciárias reais, o escritório precisa distinguir pelo menos:
  - `titular`
  - `conjuge`
  - `filho`
  - `irmao`
- evolução aplicada:
  - `leads` passam a suportar:
    - `contato_abordagem_tipo`
    - `contato_abordagem_origem`
    - `contato_alternativo_tipo`
    - `contato_alternativo_origem`
  - `campanhas` passam a suportar:
    - `contato_alvo_tipo`
  - a UI do lead e da edição manual agora mostram explicitamente o tipo e a origem do contato escolhido para abordagem
  - a criação de campanha já consegue filtrar o público por `titular`, `conjuge`, `filho` ou `irmao`
  - o template inicial da campanha se ajusta quando o disparo vai para familiar em vez do titular
- impacto operacional:
  - reduz erro de abordagem com contato indireto
  - prepara o produto para campanhas por relação familiar
  - cria uma base limpa para futuros playbooks híbridos de benefícios e planejamento
- decisão de arquitetura:
  - esta frente justifica schema próprio porque muda a segmentação e o comportamento da campanha
  - `email` da planilha, por outro lado, continua fora do schema de `leads` por enquanto para não abrir uma mudança estrutural maior sem fechar antes a frente de mail marketing
- próxima evolução natural:
  - integrar `email` de lead e playbooks de newsletter/mail marketing via `Resend`, especialmente para operações de planejamento previdenciário

## Atualizacao Importador / detecção de cabeçalho enriquecido endurecida — 14/04/2026

- durante o teste de uma lista enriquecida da Assertivo, a importação concluiu com apenas `6` leads inseridos de `78`, apesar de a planilha conter muito mais registros válidos
- sintoma observado:
  - o resumo da importação mostrava dezenas de `duplicatas da planilha`
  - os campos detectados incluíam mapeamentos impossíveis para o cabeçalho real, como `tipo_beneficio` e `valor_rma`
- causa:
  - o detector automático de cabeçalho aceitava matches por substring curtos demais
  - uma linha de dado acabou sendo escolhida como linha de schema
  - isso embaralhou o `fieldMap`, gerou `nb` sintético errado e derrubou a maior parte das linhas como duplicatas falsas
- correção aplicada:
  - `src/lib/import-schema.ts` agora:
    - prioriza igualdade exata
    - só usa `includes` para aliases compostos
    - exige fronteira de palavra para aliases curtos
- impacto operacional:
  - planilhas enriquecidas com colunas familiares deixam de colidir com aliases curtos como `tipo`, `rma` e `mail`
  - reduz risco de importação “aparentemente concluída” mas semanticamente errada

## Atualizacao Campanhas / contador de listas e seleção por contatos específicos — 14/04/2026

- durante o smoke test da campanha, a lista `Cadastro manual` apareceu como `0 com WhatsApp` mesmo com leads manuais válidos no tenant
- causa:
  - a UI dependia de contadores legado da tabela `listas`, e não do estado vivo da tabela `leads`
- correção aplicada:
  - `/api/listas` passou a recalcular `total_leads`, `com_whatsapp`, `sem_whatsapp` e `nao_verificado` diretamente a partir de `leads`
- evolução implementada na mesma frente:
  - campanhas agora suportam dois modos de público:
    - `lista inteira`
    - `contatos específicos`
  - o fluxo de contatos específicos cria uma lista técnica do sistema para sustentar o disparo sem quebrar o schema legado de `campanhas.lista_id`
  - os leads selecionados ficam persistidos em `campanha_leads`
  - o disparo respeita `campanha_leads` quando existir seleção explícita
- impacto operacional:
  - a campanha fica coerente com a elegibilidade real dos contatos do escritório
  - o escritório deixa de ficar preso a disparos por lista completa
  - abre espaço para campanhas de recuperação, aquecimento e retomada de leads específicos
- pendência operacional:
  - aplicar o patch `supabase/manual/2026-04-14_add_campaign_selected_leads.sql` no banco de produção antes do reteste em runtime

## Atualizacao Cadastro manual / CPF deixou de ser obrigatório no primeiro contato — 13/04/2026

- durante o ajuste de go-live, o modal `Novo lead` mostrou um atrito importante:
  - o produto dizia implicitamente que CPF podia ser deixado em branco
  - mas o banco ainda exigia `leads.cpf not null`
- problema de produto:
  - no contato inicial com lead avulso ou lead de campanha, CPF nem sempre existe
  - em muitos casos esse dado só deve ser pedido depois que o escritório já criou contexto e confiança
- correção aplicada:
  - migration `046_leads_cpf_optional.sql`
  - patch manual `supabase/manual/2026-04-13_make_leads_cpf_nullable.sql`
  - tipagem e UI alinhadas para tratar CPF como opcional
- impacto operacional:
  - cadastro manual fica coerente com a operação real de captação
  - reduz atrito no uso de campanhas e testes internos
  - evita que o sistema force dado sensível cedo demais

## Atualizacao Inbox / visibilidade pessoal como padrão de go-live — 13/04/2026

- durante o smoke test multiusuário do tenant real, ficou evidente que o modelo atual da inbox era permissivo demais para perfis `admin`
- problema observado:
  - um novo admin convidado passava a enxergar conversas da operação principal do escritório logo no primeiro acesso
  - isso gerava ruído operacional e quebrava a noção de carteira / dono do atendimento
- correção aplicada:
  - criação de uma fundação compartilhada de visibilidade em `src/lib/inbox-visibility.ts`
  - `GET /api/conversas`
  - `GET|PATCH /api/conversas/[id]`
  - `POST /api/conversas/[id]/responder`
  - agora todas essas superfícies usam a mesma regra:
    - usuário vê a conversa se for dono do lead
    - ou se tiver assumido o atendimento humano da conversa
  - o bypass automático por `admin` deixou de existir na inbox operacional
- impacto operacional:
  - inbox do escritório fica pessoal por padrão, inclusive para admin master
  - reduz exposição desnecessária de carteira
  - prepara melhor o futuro fluxo de transferência de atendimento
- decisão de produto:
  - visão total da equipe continua desejável, mas entra depois como modo explícito de supervisão, não como padrão do operador

## Atualizacao Templates de agentes / rotulagem operacional e treino específico — 13/04/2026

- os templates padrão deixaram de usar nomes de clientes como fonte de identidade da operação
- problema observado:
  - `Modelo Jessica` e `Modelo Ana` eram bons atalhos internos, mas inadequados para produto multi-tenant
  - escondiam o que realmente muda entre os dois kits
- correção aplicada:
  - `Captação de Benefícios Previdenciários`
  - `Captação de Planejamento Previdenciário`
  - seed continua aplicando treinamento específico por abordagem em cada agente do kit
- impacto operacional:
  - o escritório entende o tipo de operação que está escolhendo
  - reduz confusão para quem não quer montar os agentes manualmente
  - evita expor nomes de clientes dentro da UX do produto

## Atualizacao Inbox / badge passou a refletir pendência real de inbox, não outros módulos — 13/04/2026

- o badge lateral da `Caixa de Entrada` ficava persistente e não batia com o estado percebido da operação
- causa:
  - cálculo misturava pendências de agenda e mensagens
  - no portal, responder não marcava automaticamente a thread como tratada no banco
- correção aplicada:
  - `/api/pendencias` passou a devolver `inboxTotal` separado
  - sidebar usa `inboxTotal` para a `Caixa de Entrada`
  - responder no portal marca as mensagens pendentes do cliente como lidas
- impacto operacional:
  - badge deixa de inflar ou persistir artificialmente
  - a leitura visual da inbox fica coerente com a situação real da carteira

## Atualizacao Campanhas / agente, canal e template passaram a refletir recursos reais do tenant — 13/04/2026

- durante o smoke test, a tela de campanhas ainda mostrava um desenho legado:
  - dificuldade para usar listas manuais/sistêmicas no teste
  - escolha de agente pouco operacional
  - configuração visual ainda muito centrada em Twilio
  - ausência de mensagem inicial contextualizada pelo agente escolhido
- correção aplicada:
  - `/campanhas` agora carrega listas com `include_system=1`
  - o seletor de `Agente IA para esta campanha` usa os agentes reais do tenant
  - o seletor de canal passou a usar `/api/whatsapp-numbers`
  - ao escolher o agente, o sistema sugere uma primeira mensagem coerente com o tipo de operação, ainda com edição livre
  - `POST /api/campanhas` passou a aceitar `whatsapp_number_id` explícito e validar pertencimento/atividade do canal
- impacto operacional:
  - campanha fica utilizável para teste com lead manual e para campanhas não só de prospecção
  - abre caminho para usar agentes de reativação, agenda, follow-up comercial e documental dentro da mesma superfície

## Atualizacao Inbox / foco de thread e handoff ficaram mais próximos do comportamento esperado — 13/04/2026

- o smoke test mostrou que:
  - notificações apareciam, mas a thread nem sempre abria
  - `Abrir conversa` e `Iniciar conversa` a partir do lead nem sempre focavam a thread certa
  - após transferência, a conversa podia desaparecer do antigo responsável sem surgir claramente para o novo
- correções aplicadas:
  - links operacionais foram padronizados com `conversaId`, `telefone`, `tab` e `leadId`
  - a inbox agora reconcilia melhor a seleção após refresh das conversas e threads do portal
  - iniciar conversa já cria/assume a thread humana e redireciona com deep link correto
  - handoff passou a atualizar também `leads.responsavel_id`
  - notificações passaram a respeitar visibilidade real antes de listar ou marcar como lidas
- impacto operacional:
  - reduz a sensação de “a notificação existe, mas a conversa não abre”
  - prepara a inbox para operação multiusuário real sem ruptura visível de contexto

## Atualizacao Z-API / inbound e outbound validados em runtime — 10/04/2026

- a integracao Z-API do tenant operacional foi validada ponta a ponta:
  - outbound do sistema para numero externo: `ok`
  - inbound de numero externo para a plataforma: `ok`
- a estabilizacao final exigiu:
  - relay publico por Supabase Edge Function no padrao do Orbit
  - parser tolerante a `GET`, `POST`, `json`, `form-urlencoded` e texto cru
  - match operacional por telefone mascarado
  - reaproveitamento de conversa existente com preenchimento de `lead_id` e `whatsapp_number_id`
- impacto operacional:
  - a frente de WhatsApp saiu da lista de bloqueios P0 do go-live
  - a migracao para `mobile` continua recomendada depois, mas o tenant ja pode operar testes reais com a instancia `web`

## Atualizacao Z-API / webhook inbound endurecido para body nao-JSON — 09/04/2026

- o inbound da Z-API continuou falhando mesmo depois dos ajustes de parser por payload e match de telefone
- a leitura final apontou que a variacao `web / multi-device` pode entregar webhook fora de `application/json`, inclusive como `form-urlencoded` ou texto cru
- arquivo principal:
  - `src/app/api/webhooks/zapi/route.ts`
- melhorias aplicadas:
  - leitura do body passou a usar `request.text()`
  - fallback para `application/x-www-form-urlencoded`
  - tentativa de parse de JSON serializado dentro de campos string
  - fallback final para query params e `raw body`
  - a mesma normalizacao agora vale tanto para `event=on-receive` quanto para os demais acks da rota
- impacto operacional:
  - reduz dependencia do formato exato enviado pela Z-API
  - evita que o inbound morra silenciosamente quando o provedor nao envia JSON puro
  - encurta bastante a superficie de erro da integracao web antes da migracao para `mobile`
- validacao:
  - `npm run build` passou

## Atualizacao Z-API / Edge Function publica no padrao do Orbit — 10/04/2026

- durante a depuracao do inbound, foi comparado o PrevLegal com `fluxrow/orbiitcrm`
- a integracao historicamente funcional do Orbit usava uma Supabase Edge Function publica (`orbit-webhook`) como alvo da Z-API
- o PrevLegal agora tambem possui essa camada:
  - `supabase/functions/zapi-webhook/index.ts`
- deploy realizado no projeto operacional:
  - `lrqvvxmgimjlghpwavdb`
- endpoint de health:
  - `https://lrqvvxmgimjlghpwavdb.supabase.co/functions/v1/zapi-webhook?event=health`
- impacto operacional:
  - cria um alvo de webhook no mesmo padrao arquitetural que ja funcionou no Orbit
  - reduz a incerteza sobre a compatibilidade da Z-API com app route hospedada no frontend
- proximo passo recomendado:
  - apontar `Ao receber` da Z-API para a Edge Function nova
  - validar inbound

## Atualizacao Google OAuth / endurecimento comercial — 09/04/2026

- a frente técnica da agenda Google saiu do modo “só funciona em ambiente interno” e foi preparada para submissão comercial do app no Google
- arquivos principais:
  - `src/app/api/google/auth/route.ts`
  - `public/privacidade/index.html`
  - `public/termos/index.html`
  - `site/privacidade/index.html`
  - `site/termos/index.html`
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/GOOGLE_OAUTH_SUBMISSION_COPY.md`
- melhorias aplicadas:
  - remoção do escopo desnecessário `calendar.readonly`
  - manutenção apenas dos escopos mínimos:
    - `calendar.events`
    - `userinfo.email`
  - páginas públicas de privacidade e termos passaram a explicar explicitamente:
    - por que o produto pede acesso ao Google Calendar
    - que o uso é apenas para criar, atualizar, remarcar e cancelar compromissos
    - que o e-mail Google conectado é usado somente para identificar qual calendário está ativo
  - foi criado um material pronto para preenchimento no Google Auth Platform:
    - descrição curta
    - justificativa dos escopos
    - checklist de submissão
    - roteiro de vídeo, se o Google pedir
- impacto operacional:
  - reduz atrito de verificação
  - melhora coerência entre produto, consent screen e páginas públicas
  - deixa o restante da frente concentrado em trabalho manual do Google Console, não mais em ajuste do app
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - executar o checklist manual no Google Auth Platform
  - depois rodar o smoke test final do tenant real

## Atualizacao Z-API / webhook inbound canônico — 09/04/2026

- a integracao `Z-API` deixou de ser apenas outbound e ganhou uma rota inbound nativa do produto atual
- arquivos principais:
  - `src/lib/whatsapp-provider.ts`
  - `src/app/api/webhooks/zapi/route.ts`
- melhorias aplicadas:
  - resolução do canal pelo `zapi_instance_id`
  - tratamento inicial de `event=on-receive`
  - criação/reativação de conversa por telefone
  - persistência de inbound em `mensagens_inbound`
  - criação de notificação operacional
  - stop automático de follow-up quando o lead responde via Z-API
  - ack seguro para os demais eventos da instância
- impacto operacional:
  - a instância do tenant deixa de depender do webhook antigo do Orbit
  - o produto passa a ter URL canônica própria para configuração dos webhooks da Z-API
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - configurar os webhooks da instância para o domínio `app.prevlegal.com.br`
  - testar inbound real com outro número, sem usar o próprio número conectado da instância

## Atualizacao UX / normalização de busca como pilar do produto — 09/04/2026

- foi formalizada uma regra de experiência da Fluxrow dentro do core do PrevLegal:
  - o sistema não deve exigir acento, máscara ou digitação “perfeita” para o usuário encontrar o que precisa
- arquivos principais:
  - `src/lib/search-normalization.ts`
  - `src/app/api/busca/route.ts`
  - `src/app/api/leads/route.ts`
  - `docs/MASTER.md`
- melhorias aplicadas:
  - criação de uma fundação compartilhada de normalização para texto e dígitos
  - a busca global (`Ctrl+K`) passou a combinar candidatos brutos + recentes e filtrar em memória com comparação sem acento
  - a busca de leads deixou de manter uma lógica própria separada e agora reaproveita a mesma base
- impacto operacional:
  - `Caua` encontra `Cauã`
  - telefone com ou sem máscara encontra o mesmo lead
  - reduz atrito invisível em onboarding, suporte e operação diária
- validacao:
  - `npm run build` passou

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

## Atualizacao Login / Acesso do Escritório — 08/04/2026

- foi corrigido o fluxo que dava sensação de “entra e volta para o login” logo após autenticar
- arquivos principais:
  - `src/app/(dashboard)/layout.tsx`
  - `src/app/(auth)/login/page.tsx`
  - `src/lib/supabase/middleware.ts`
  - `src/app/acesso-pendente/page.tsx`
- causa identificada:
  - o sistema tratava ausência de contexto do escritório como se fosse falha de login
  - na prática, o usuário podia autenticar no Supabase, mas não ter vínculo ativo em `usuarios` / `tenant_id`
  - isso gerava um loop ruim: aparentava entrar e era devolvido para `/login`
- correção aplicada:
  - o layout do dashboard agora separa:
    - `sem sessão` -> `/login`
    - `sessão válida sem contexto operacional` -> `/acesso-pendente`
  - o login final saiu do fluxo puramente client-side e passou a usar `POST /api/session/login`
  - a sessão agora nasce no servidor antes do redirect para `/dashboard`, reduzindo corrida entre cookie do Supabase e SSR inicial
  - a rota pública `/acesso-pendente` foi liberada no `proxy`
- impacto operacional:
  - elimina o falso diagnóstico de “senha/login quebrado”
  - deixa explícito quando o problema é provisionamento do usuário no escritório
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - validar com o usuário que estava entrando e sendo devolvido ao login
  - se cair em `/acesso-pendente`, revisar no banco:
    - `usuarios.auth_id`
    - `usuarios.ativo`
    - `usuarios.tenant_id`
    - contenção temporária por e-mail

## Atualizacao Tenant Health / Último Acesso da Equipe — 08/04/2026

- foi corrigida a origem do sinal `Último acesso da equipe` no admin
- arquivos principais:
  - `src/lib/current-usuario.ts`
  - `src/app/api/session/login/route.ts`
  - `src/app/api/session/touch/route.ts`
- causa identificada:
  - a plataforma autenticava e renovava a sessão corretamente
  - mas o runtime do app não persistia `usuarios.ultimo_acesso`
  - com isso, o admin podia mostrar `Sem acesso` e `0 usuários ativos 7D` mesmo quando a equipe realmente usava o app
- correção aplicada:
  - criar `touchUsuarioUltimoAcesso(authUser)` como caminho canônico para registrar o acesso operacional do usuário
  - o login server-side agora grava `usuarios.ultimo_acesso` logo após autenticar
  - o heartbeat de sessão (`POST /api/session/touch`) também atualiza esse campo sem depender de navegação específica
- impacto operacional:
  - a saúde do tenant passa a refletir uso real da equipe
  - reduz falso diagnóstico de onboarding incompleto quando o problema era apenas ausência de telemetria de acesso
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - validar em runtime se o tenant `Fluxrow` passa a refletir acesso real no painel admin após novo login/uso do app

## Atualizacao Login / Tenant Context resiliente a migrations pendentes — 08/04/2026

- foi identificada a causa exata do `acesso-pendente` persistente no tenant `Fluxrow`
- arquivos principais:
  - `src/lib/permissions.ts`
  - `src/lib/current-usuario.ts`
  - `src/app/api/usuarios/route.ts`
- causa identificada:
  - a produção ainda está sem as migrations:
    - `043_user_calendar_ownership`
    - `044_user_permissions_foundation`
  - com isso, o runtime não tinha só a coluna `usuarios.permissions` faltando
  - também faltavam:
    - `usuarios.google_calendar_email`
    - `usuarios.google_calendar_connected_at`
  - como o resolvedor do usuário atual tentava ler esse payload “completo”, o `getTenantContext()` continuava retornando `null` mesmo com `auth_id`, `tenant_id` e `ativo` corretos
- correção aplicada:
  - o lookup de `usuarios` agora faz fallback em camadas:
    - schema completo
    - schema sem agenda própria
    - schema mínimo sem permissões nem agenda própria
  - a listagem de usuários também foi endurecida para o mesmo cenário
- impacto operacional:
  - o app deixa de bloquear acesso por drift de schema entre código e banco
  - `043` e `044` continuam importantes, mas deixam de ser pré-requisito para o login básico do tenant
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - validar login real do `Fluxrow`
  - depois aplicar `043` e `044` em produção para liberar a experiência completa sem fallback

## Atualizacao Agenda / Google resiliente a schema pendente — 08/04/2026

- a camada de agendamento e status do Google foi endurecida para produção ainda sem `043`
- arquivos principais:
  - `src/lib/google-calendar.ts`
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/google/status/route.ts`
  - `src/app/api/google/callback/route.ts`
  - `src/app/(dashboard)/agendamentos/page.tsx`
- causa identificada:
  - o modal de novo agendamento ainda consultava `usuarios.google_calendar_email`
  - a verificação de status do Google também podia quebrar ao ler colunas da agenda por usuário ainda não migradas
  - isso gerava:
    - erro vermelho ao tentar agendar
    - estado de verificação que não concluía
- correção aplicada:
  - o responsável do agendamento agora usa fallback para schema mínimo de `usuarios`
  - a leitura de status do Google não quebra mais quando as colunas de agenda por usuário ainda não existem
  - o callback de OAuth por usuário deixa de estourar o runtime nesse cenário e devolve erro controlado
  - a tela de agendamentos passou a tratar resposta não-`ok` do status do Google como estado neutro, sem spinner preso
- impacto operacional:
  - o escritório pode continuar agendando com fallback do calendário padrão do tenant
  - a ausência da migration `043` deixa de travar a operação básica da agenda
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - validar no runtime se o modal cria agendamento sem erro
  - depois aplicar `043` para liberar conexão Google realmente individual por usuário

## Atualizacao UI / Agendamentos cross-theme — 08/04/2026

- a tela de `Agendamentos` recebeu uma rodada de polish visual focada em leitura real no claro e no escuro
- arquivo principal:
  - `src/app/(dashboard)/agendamentos/page.tsx`
- melhorias aplicadas:
  - o topo virou um hero operacional com hierarquia mais clara e indicadores rápidos
  - o banner de Google ganhou melhor encaixe visual e deixou de parecer remendo solto acima do calendário
  - o calendário passou a usar superfícies guiadas por tokens do tema em vez de blocos hardcoded escuros
  - a lista operacional abaixo também foi convertida para cards coerentes com os dois temas
  - o modal lateral de detalhe do agendamento foi alinhado à mesma linguagem visual
- impacto operacional:
  - melhora leitura em tema claro sem sacrificar densidade da agenda
  - reduz sensação de “layout quebrado” quando a tela alterna entre claro e escuro
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - validar visualmente a página em runtime nos dois temas
  - depois seguir no próximo refinamento funcional da agenda apenas se sobrar ruído real de uso

## Atualizacao Importação Inteligente — 08/04/2026

- o importador deixou de depender apenas do layout fixo da planilha clássica
- arquivos principais:
  - `src/lib/import-schema.ts`
  - `src/app/api/import/route.ts`
  - `src/app/(dashboard)/leads/import/page.tsx`
- melhorias entregues:
  - detecção automática de layout por cabeçalhos reconhecíveis
  - suporte a planilhas com colunas em ordem diferente
  - fallback preservado para o layout legado por posição fixa
  - enriquecimento do lead importado com campos quando disponíveis:
    - `telefone`
    - `email`
    - `categoria_profissional`
  - a UI agora mostra:
    - se a leitura foi por cabeçalho ou por layout legado
    - quais campos foram detectados
- documento canônico novo:
  - `docs/IMPORTADOR_INTELIGENTE_PLAN.md`
- limite estrutural explicitado:
  - o import atual continua orientado ao modelo previdenciário com `NB`
  - fontes sem `NB`, como Google Maps / Places e listas comerciais externas, entram na próxima fase do importador
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - abrir a Fase 2 do importador com preview, confirmação de mapeamento e templates por fonte

## Atualizacao Agendamentos / Google Calendar por Usuário — 08/04/2026

- a camada de agenda deixou de depender apenas da conexão Google global do tenant
- arquivos principais:
  - `supabase/migrations/043_user_calendar_ownership.sql`
  - `src/lib/google-calendar.ts`
  - `src/app/api/google/auth/route.ts`
  - `src/app/api/google/callback/route.ts`
  - `src/app/api/google/status/route.ts`
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
  - `src/app/(dashboard)/agendamentos/page.tsx`
  - `src/app/(dashboard)/perfil/page.tsx`
  - `src/components/novo-agendamento-modal.tsx`
  - `src/components/gestao-usuarios.tsx`
- melhorias entregues:
  - cada usuário agora pode conectar o próprio Google Calendar
  - admin continua podendo conectar um calendário padrão do escritório
  - criação de agendamento tenta usar primeiro o calendário do responsável
  - se o responsável não tiver conexão própria, o sistema usa o calendário padrão do escritório como fallback
  - o agendamento passa a registrar quem foi o dono do calendário do evento:
    - `tenant`
    - `user`
  - remarcação e cancelamento agora voltam para a mesma origem do evento
  - a UI de `Agendamentos` e `Perfil` passou a explicar claramente:
    - o status do meu Google
    - o fallback do escritório
    - quando o calendário do responsável será usado
  - a gestão de usuários agora sinaliza quem já tem agenda própria conectada
- impacto operacional:
  - permite cenário real de secretaria agendando para advogado/sócio sem obrigar tudo a cair no Google do admin
  - reduz confusão entre `quem criou`, `quem é o responsável` e `em qual calendário o evento nasce`
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - aplicar a migration `043`
  - validar em runtime:
  - usuário conectando o próprio Google em `/perfil`
  - admin conectando o calendário padrão do escritório
  - agendamento criado para responsável com agenda própria
  - agendamento criado para responsável sem agenda própria, usando fallback do escritório

## Atualizacao Go-live / Rollout de Banco — 08/04/2026

- a estabilização para go-live ganhou um caminho operacional canônico de banco
- documentos novos:
  - `docs/EXECUTION_TRACK.md`
  - `docs/PRODUCTION_DB_ROLLOUT_043_044_045.md`
  - `supabase/manual/2026-04-08_apply_043_044_045.sql`
- leitura confirmada:
  - o projeto operacional correto continua sendo `lrqvvxmgimjlghpwavdb`
  - o repo foi ligado com sucesso ao projeto no Supabase CLI
  - mas o `db push` não é o caminho seguro agora porque:
    - o histórico remoto usa versões em timestamp diferentes dos nomes locais
    - o CLI da sessão não tem senha válida do Postgres remoto para aplicar migrations diretamente
- decisão operacional:
  - a etapa oficial de produção passa a ser aplicar o patch SQL idempotente de `043`, `044` e `045`
  - depois rodar smoke test de agenda, permissões e parsing documental
- próximo passo oficial:
  - executar `supabase/manual/2026-04-08_apply_043_044_045.sql` no projeto operacional

## Atualizacao Inbox / Permissões Granulares — 08/04/2026

- a rodada seguinte atacou duas dores operacionais reais:
  - filtros da `Caixa de Entrada` inconsistentes com conversas legadas
  - gestão de acesso limitada demais a `admin`, `operador` e `visualizador`
- arquivos principais:
  - `supabase/migrations/044_user_permissions_foundation.sql`
  - `src/lib/permissions.ts`
  - `src/lib/auth-role.ts`
  - `src/lib/tenant-context.ts`
  - `src/app/(dashboard)/caixa-de-entrada/page.tsx`
  - `src/app/api/conversas/route.ts`
  - `src/components/gestao-usuarios.tsx`
  - `src/app/api/usuarios/route.ts`
  - `src/app/api/usuarios/[id]/route.ts`
  - `src/app/api/usuarios/convidar/route.ts`
  - `src/app/api/agentes/*`
  - `src/app/api/automacoes/triggers/*`
  - `src/app/api/followup/rules/*`
  - `src/app/api/agendamentos/[id]/route.ts`
  - `src/app/api/listas/[id]/route.ts`
  - `src/app/api/financeiro/contratos/route.ts`
  - `src/app/api/financeiro/resumo/route.ts`
- melhorias entregues:
  - a inbox agora normaliza conversa sem status válido como `agente`
  - a troca de aba em `/caixa-de-entrada` passou a ser explícita e previsível via querystring
  - a seleção atual é limpa quando deixa de pertencer ao filtro escolhido
  - usuários agora podem receber permissões customizadas além da role base
  - a gestão de usuários ganhou editor de permissões por pessoa
  - presets padrão continuam existindo por role, mas podem ser ajustados ponto a ponto
  - o backend já passou a respeitar permissões granulares em áreas críticas:
    - usuários
    - agentes
    - automações / gatilhos / follow-up rules
    - reatribuição de agendamentos
    - exclusão de listas
    - financeiro
    - operação humana da inbox
- impacto operacional:
  - reduz a sensação de “aba quebrada” na caixa de entrada
  - abre espaço para secretária, coordenador e operador sênior terem acesso sob medida sem virar admin total
- limite explicitado:
  - esta fase aplica permissão granular nos módulos críticos, mas ainda não substitui todo e qualquer `isAdmin` espalhado no produto
- compatibilidade runtime adicionada depois:
  - a produção ainda pode estar sem a migration `044`
  - por isso o app ganhou fallback para continuar operando só com `role` quando a coluna `usuarios.permissions` ainda não existe
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - aplicar a migration `044`
  - validar os filtros da inbox com conversas reais
  - testar um usuário não-admin com permissões customizadas em:
    - automações
    - agentes
    - agenda
    - financeiro

## Atualizacao Automações / Documentos IA — 08/04/2026

- a aba `Automações` saiu do modo “templates fechados” e passou a permitir leitura e ajuste real dos gatilhos sem apagar e recriar
- arquivos principais:
  - `src/components/automacoes/trigger-config.tsx`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
- melhorias aplicadas:
  - cada card de gatilho agora explica melhor:
    - em qual status dispara
    - qual ação executa
    - por que esse status é útil
  - os templates padrão do PrevLegal agora podem ser editados direto na UI
  - o modal de criação/edição passou a resumir em linguagem humana o que vai acontecer, reduzindo dependência do time técnico para configurar
- impacto operacional:
  - a camada de automações fica mais segura para uso assistido pelo próprio escritório
  - templates passam a funcionar como ponto de partida, não como configuração opaca
- na mesma rodada, o beta de documentos IA foi corrigido para obedecer o schema real:
  - `src/app/api/leads/[id]/gerar-documento/route.ts`
  - os documentos gerados por IA agora são enviados para o bucket `lead-documentos`
  - o backend grava `arquivo_url`, `arquivo_nome`, `arquivo_tamanho`, `arquivo_tipo`, `tenant_id` e `created_by`
  - isso elimina o erro:
    - `null value in column "arquivo_url" of relation "lead_documentos" violates not-null constraint`
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - validar ponta a ponta um gatilho real via mudança de status do lead
  - testar a geração dos três documentos beta no runtime e decidir a próxima camada:
    - revisão
    - versionamento
    - análise documental com IA

## Atualizacao Follow-up / Reativação — 08/04/2026

- a validação operacional com o lead `VALTERLINO AQUINO S RIBEIRO` confirmou que os gatilhos da Fase E estavam criando `followup_runs` corretamente no banco
- leitura confirmada:
  - o gatilho `contacted` iniciou uma run
  - a mudança seguinte para `lost` cancelou a run anterior e abriu uma nova run ativa
- dois ajustes foram feitos a partir desse teste:
  - `src/app/api/followup/worker/route.ts`
  - `src/components/followup-lead.tsx`
- correções:
  - o worker deixou de parar automaticamente runs só porque o lead está `lost`
  - agora ele para automaticamente apenas em `converted`
  - o card `Follow-up` no detalhe do lead passou a atualizar automaticamente e ganhou botão `Atualizar`
- impacto operacional:
  - a automação de reativação deixa de se sabotar
  - o escritório consegue enxergar com mais clareza quando um run nasceu após mudança de status
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - recarregar o lead e confirmar a visualização do run ativo
  - depois validar o worker manualmente ou pelo cron para observar o primeiro disparo real do follow-up

## Atualizacao Follow-up / Execução Manual — 08/04/2026

- para fechar a validação da Fase E sem depender do cron, o detalhe do lead agora ganhou ação manual de execução do passo atual
- arquivos principais:
  - `src/app/api/leads/[id]/followup/[runId]/route.ts`
  - `src/components/followup-lead.tsx`
- comportamento novo:
  - runs ativas agora podem usar `Executar agora`
  - a ação reaproveita a mesma lógica operacional do follow-up:
    - monta a mensagem do step atual
    - tenta enviar pelo canal configurado
    - avança ou conclui a run
    - registra `step_disparado` ou `step_falhou` em `followup_events`
- efeito de produto:
  - acelera QA
  - ajuda suporte/operação em casos onde o time precisa validar ou destravar a cadência sem aguardar o agendamento natural
- validacao:
  - `npm run build` passou
- proximo passo recomendado:
  - clicar em `Executar agora` no lead de teste
  - conferir se entra evento no histórico da run
  - depois encerrar esta frente e seguir para a próxima prioridade do roadmap

## Atualizacao Follow-up / Motivo da Falha na UI — 08/04/2026

- o histórico do follow-up passou a mostrar o motivo técnico da falha direto no detalhe do lead
- arquivos principais:
  - `src/app/api/leads/[id]/followup/route.ts`
  - `src/components/followup-lead.tsx`
- comportamento:
  - o endpoint agora devolve `metadata` dos `followup_events`
  - a UI mostra o motivo logo abaixo do evento `Envio falhou`
  - exemplo validado:
    - `Lead sem telefone para disparo via WhatsApp`
- efeito operacional:
  - reduz ambiguidade na validação e no suporte
  - evita a sensação de “falhou por algum motivo escondido”
- validacao:
  - `npm run build` passou

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
- Estado atual em 08/04/2026:
  - tela de `Agendamentos` já opera bem nos dois temas com tokens semânticos
  - desktop ganhou composição mais operacional, com calendário mensal reduzido e trilho lateral para filas de `Precisa confirmação`, `Confirmados` e `Histórico recente`
  - a leitura agora favorece ação sem depender de scroll longo

### Fase 29 — Saúde e risco do tenant
- Expandir o admin com tendências de uso, último acesso, risco de churn e crescimento por período
- Exibir sinais executivos de adoção para o time comercial da Fluxrow

### Fase 30 — Financeiro preditivo
- Projeção de receita, aging de parcelas, previsão de sucumbência e carteira prevista por mês
- Conectar ROI de campanha com contratos e recebimento real

### Fase 30A — Inteligência documental com Docling
- Transformar `lead_documentos` e depois `agent_documents` em conteúdo estruturado
- Criar fila de processamento documental assíncrona
- Persistir texto, markdown, JSON e chunks para uso em busca, agentes e análise futura
- Primeiro corte com maior ROI:
  - parsing de documentos do lead
  - status de processamento
  - preview/resumo estruturado
- Estado atual em 08/04/2026:
  - migration `045_document_processing_foundation.sql` criada
  - worker foundation exposto em `POST/GET /api/document-processing/worker`
  - uploads do lead, portal e documentos IA já entram na fila de processamento
  - detalhe do lead já exibe status de parsing por documento
  - dependências abertas:
    - aplicar a `045` no banco operacional
    - plugar `DOCLING_SERVICE_URL` para parsing binário real
    - decidir se a execução vai por cron do Vercel ou worker externo dedicado

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
- [ ] Aplicar a `045` e conectar o serviço Docling externo para ativar parsing binário dos documentos do lead

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

## Atualizacao Mobile / Fila Acionavel no Portal — 03/04/2026

- a home do portal passou a priorizar o que realmente exige acao do cliente
- comportamento:
  - novo bloco `O que precisa da sua atencao agora`
  - confirma consulta quando aplicavel
  - leva direto para `Mensagens`
  - leva direto para `Documentos` com pendencia preselecionada
  - as pendencias da home agora oferecem CTA `Enviar agora`
- racional:
  - uma camada de notificacao leve so fecha bem quando aponta para uma fila acionavel
  - isso melhora retorno mobile sem depender ainda de push nativo
- validacao:
  - `npm run build` passou
- proximo passo:
  - validar em runtime a ordem de prioridade dos cards
  - depois decidir se a home precisa de destaque mais forte para a acao principal

## Atualizacao Mobile / Polish Final da Home do Portal — 03/04/2026

- a fila acionavel recebeu a rodada final de hierarquia visual
- comportamento:
  - destaque principal para a acao mais urgente
  - selos simples de prioridade nas acoes
  - badges visuais nas abas com pendencias
  - estado positivo quando nao ha nenhuma acao aberta
- racional:
  - isso fecha a UX central da home mobile sem precisar ainda abrir uma frente de redesign maior
- validacao:
  - `npm run build` passou
- estado concluido:
  - a home do portal esta pronta para sair do ciclo de polish e abrir espaco para outras evolucoes agendadas

## Atualizacao Operacional / Hardening de Pendencias — 03/04/2026

- a camada de pendencias do sidebar foi corrigida para refletir filas reais do tenant atual
- comportamento:
  - `/api/pendencias` agora usa contexto tenant-aware canonico
  - a contagem abandona dependencias de campos residuais de agendamento nao fechados localmente
  - passa a somar:
    - portal nao lido
    - conversas humanas com retorno pendente
    - agendamentos em `agendado` ou `remarcado`
- racional:
  - antes de seguir para fases maiores, os badges operacionais precisavam voltar a representar filas reais e existentes
- validacao:
  - `npm run build` passou

## Atualizacao Operacional / Hardening de Notificacoes — 03/04/2026

- a rota de notificacoes do app deixou de operar em modo global
- comportamento:
  - exige contexto autenticado do produto
  - resolve `tenantId` canonicamente
  - lista e marca lidas apenas dentro do tenant atual
- racional:
  - notificacoes sao uma superficie transversal de alto risco para leitura cruzada quando ficam fora do recorte tenant-aware
- validacao:
  - `npm run build` passou

## Atualizacao Operacional / Hardening de Relatorios de Campanha — 03/04/2026

- as leituras de campanha em `/relatorios` e `/relatorios/roi` foram fechadas no tenant atual
- comportamento:
  - `/api/relatorios` agora filtra campanhas por `tenant_id` antes de consolidar KPIs
  - `/api/relatorios/roi` agora usa `getTenantContext`
  - a aba de ROI respeita `tenant_id` e, para nao-admin, tambem `responsavel_id`
  - quando nao existe `tenantId`, o ROI devolve estado vazio seguro
- racional:
  - resumo executivo e detalhe analitico nao podem divergir no recorte de tenant; isso criaria falsa leitura de performance mesmo sem erro visivel na UI
- validacao:
  - `npm run build` passou

## Atualizacao Operacional / Hardening de Acesso a Portal e Documentos — 03/04/2026

- um bloco antigo de rotas por lead foi reancorado na guarda canonica de acesso
- comportamento:
  - link do portal por lead agora exige `canAccessLeadId`
  - compartilhamento de documento com cliente agora valida o lead do documento antes de atualizar
  - `/api/portal/nao-lidas` agora soma apenas mensagens de leads acessiveis ao usuario
  - listar, subir, criar e gerar documentos do lead agora respeitam o contexto tenant-aware por lead
- racional:
  - em superfícies operacionais por ID, autenticacao simples nao basta; sem guarda por lead o risco deixa de ser insight incorreto e vira acesso indevido
- validacao:
  - `npm run build` passou

## Atualizacao Operacional / Hardening de Anotacoes e Calculadora — 03/04/2026

- mais duas rotas antigas do detalhe do lead foram alinhadas ao contexto tenant-aware atual
- comportamento:
  - `anotacoes` e `calculadora` agora exigem `canAccessLeadId`
  - `anotacoes` passa a gravar com `usuarioId` canonico do contexto atual
- racional:
  - o detalhe do lead nao pode ter bolsões legados onde `auth` simples ainda vale mais do que a guarda por lead
- validacao:
  - `npm run build` passou

## Atualizacao Operacional / Hardening da Base de Conhecimento do Agente — 03/04/2026

- `agent_documents` deixou de ser consumida como superficie global
- comportamento:
  - `/api/agente/documentos` agora autentica o usuario do produto
  - lista e apaga apenas documentos cujos autores pertencem ao tenant atual
  - novos documentos passam a nascer com `usuario_id` do contexto canonico
- racional:
  - mesmo sem `tenant_id` na tabela, a base de conhecimento do agente nao podia continuar global entre escritorios
- validacao:
  - `npm run build` passou

## Atualizacao Operacional / Cadastro e Importacao no Contexto Canonico — 03/04/2026

- `POST /api/leads` e `POST /api/import` foram alinhadas ao `tenant-context`
- comportamento:
  - as duas rotas agora resolvem tenant, usuario e permissao a partir do helper canonico
  - o fluxo de lista tecnica `Cadastro manual` continua igual, mas nasce com identificadores coerentes com o restante do produto
- racional:
  - rotas de entrada de dados nao precisam esperar vazar contexto para serem corrigidas; quando o helper canonico ja existe, vale cortar cedo a duplicacao de auth manual
- validacao:
  - `npm run build` passou

## Atualizacao Estrategica / Proxima Frente do Core — 03/04/2026

- o proximo salto do produto foi formalizado como uma camada operacional conversacional mais completa
- pilares oficiais:
  - agentes por tenant
  - cadencias / follow-ups
  - colaboracao interna contextual
- racional:
  - isso reforca o core do PrevLegal sem misturar a narrativa do produto com modulos premium
  - cria vantagem competitiva real ao juntar automacao, operacao humana e gestao dentro do mesmo fluxo
- ordem de execucao recomendada:
  - colaboracao interna minima
  - follow-up engine v1
  - multiagente por tenant
  - orquestracao avancada
- referencia canonica:
  - `docs/AGENTES_CADENCIAS_COLABORACAO_PLAN.md`

## Atualizacao Estrategica / Fase A ganhou backlog tecnico — 03/04/2026

- a primeira etapa da nova frente do core deixou de ser so visao e ganhou spec executavel
- referencia principal:
  - `docs/COLABORACAO_INTERNA_FASE_A_SPEC.md`
- escopo da Fase A:
  - thread interna por lead
  - notas internas
  - handoff simples
  - tasks internas
  - resumo interno na inbox
- leitura de implementacao:
  - aproveitar a foundation ja existente em `conversas`
  - nascer primeiro no detalhe do lead
  - integrar depois no painel da `Caixa de Entrada`

## Atualizacao Operacional / Foundation da Colaboracao Interna Fase A — 03/04/2026

- a Fase A deixou de ser apenas spec e ganhou a primeira fundacao real em codigo
- arquivos principais:
  - `supabase/migrations/038_internal_collaboration_phase_one.sql`
  - `src/lib/internal-collaboration.ts`
  - `src/app/api/leads/[id]/interno/route.ts`
  - `src/app/api/leads/[id]/interno/mensagens/route.ts`
  - `src/app/api/leads/[id]/interno/tasks/route.ts`
  - `src/app/api/leads/[id]/interno/tasks/[taskId]/route.ts`
  - `src/app/api/leads/[id]/interno/handoff/route.ts`
  - `src/app/(dashboard)/leads/[id]/page.tsx`
- comportamento:
  - cada lead passa a poder ter uma `thread interna` propria
  - o detalhe do lead agora comporta:
    - notas internas
    - tarefas internas
    - handoff simples entre usuarios do escritorio
    - dono atual visivel no card de coordenacao
  - o handoff interno ja conversa com `conversas.status` quando o destino for operacionalmente compativel
  - criacao e update de task, assim como handoff, validam se o usuario de destino pertence ao tenant atual
- validacao:
  - `npm run build` passou
- dependencia conhecida:
  - a feature depende da aplicacao da migration `038_internal_collaboration_phase_one.sql` no banco operacional
- proximo passo recomendado:
  - aplicar a migration `038`
  - refletir o resumo interno minimo na `Caixa de Entrada`
  - depois conectar isso ao future `follow-up engine`

## Atualizacao — Migration 038 aplicada + Coordenacao interna na Inbox — 03/04/2026

- migration `038_internal_collaboration_phase_one.sql` aplicada no banco operacional `lrqvvxmgimjlghpwavdb`
- tabelas ativas: `lead_threads_internas`, `lead_mensagens_internas`, `lead_tasks`, `lead_handoffs`
- a `Caixa de Entrada` ganhou painel lateral recolhivel de coordenacao interna:
  - strip-toggle abaixo do header mostra resumo (dono, tasks abertas, ultima nota)
  - clicar abre painel direito (272px) com:
    - responsavel atual da thread
    - tasks com check-off direto
    - notas recentes (ultimas 4)
    - quick note com POST imediato e refresh
  - link "Ver lead →" para o detalhe completo
- status: Fase A entregue e operacional no banco
- proximo passo recomendado:
  - validar em producao o painel lateral
  - decidir: follow-up engine (Fase B) ou outra frente do core

## Fase B — Follow-up engine v1 — 05/04/2026

- schema completo: `followup_rules`, `followup_rule_steps`, `followup_runs`, `followup_events`
- API completa: CRUD de regras, ativar/pausar/retomar/cancelar runs por lead
- card `Follow-up` no detalhe do lead operacional
- unique index garante no máximo 1 run ativa por lead
- status: fundação operacional entregue; disparos automáticos dependem de worker/cron (próxima sub-fase)
- próximos passos:
  - tela de configuração de regras em `/configuracoes`
  - worker de disparo automático dos steps

## Fase B completa — Follow-up engine v1 — 05/04/2026

- schema: `followup_rules`, `followup_rule_steps`, `followup_runs`, `followup_events` ✅
- API: CRUD regras, ativar/pausar/retomar/cancelar runs ✅
- card no detalhe do lead ✅
- tela de configuração em `/configuracoes?tab=followup` ✅
- worker de disparo automático via Vercel Cron (a cada 5min) ✅
- stop conditions: convertido, perdido ✅
- pendente: CRON_SECRET no Vercel + stop condition `stop_humano_assumiu` no webhook

## Stop conditions completas — Fase B encerrada — 05/04/2026

- stop conditions implementadas no webhook Twilio e na rota conversas PATCH
- stops cobertos: convertido, perdido, lead_respondeu, humano_assumiu
- Fase B 100% fechada
- próximo: Fase C — multi-agente por tenant (tabela `agentes`, CRUD, UI, wire no responder)

## Fase C — Multi-agente por tenant — 05/04/2026

- tabela `agentes` expandida com campos da Fase C ✅
- unique index: 1 agente padrão por tenant ✅
- API CRUD completa: GET/POST /api/agentes + PATCH/DELETE /api/agentes/[id] ✅
- UI: tab "Agentes" em /configuracoes com CRUD completo ✅
- wire responder: usa agente padrão do tenant com fallback para config global ✅
- próximo: Fase D — roteamento por campanha/estágio + métricas por agente

## Fase D — Roteamento por campanha/estágio + Métricas por agente — 05/04/2026

### O que foi entregue
- **Migration 041**: enum `agente_tipo` (triagem/reativacao/documental/confirmacao_agenda/followup_comercial/geral), coluna `tipo` em `agentes`, FK `agente_id` nullable em `campanhas`, coluna `agente_respondente_id` em `mensagens_inbound` + índice
- **Responder**: prioridade de roteamento campanha → tipo/estágio → padrão tenant → config global
  - `STATUS_TO_TIPO`: novo/em_contato→triagem, qualificado/agendado→confirmacao_agenda, perdido/sem_resposta→reativacao
  - persiste `agente_respondente_id` ao marcar mensagem respondida (base para métricas)
- **API campanhas**: `PATCH/DELETE /api/campanhas/[id]` (novo), `POST /api/campanhas` aceita `agente_id`, `GET` faz join com `agentes`
- **API métricas**: `GET /api/agentes/[id]/metricas` — total_respostas, leads_atendidos, taxa_escalonamento_pct, campanhas_vinculadas
- **UI campanhas**: seletor de agente opcional no form de criação
- **UI agentes**: seletor de tipo no form + botão "Métricas" lazy-loaded por card
- commit: 34e3f92

### Pendências operacionais
- ~~Aplicar migration 041 no banco operacional (SQL Editor do Supabase)~~ ✅ Concluído
- ~~Adicionar `CRON_SECRET` como env var no Vercel dashboard~~ ✅ Concluído

## Atualização Crítica — Fix Follow-up e Automações — 06/04/2026

### O que foi entregue
- **Fix Follow-up API**: Corrige falha silenciosa na configuração de follow-up onde erros 401/409 na API `/api/followup/rules` não eram exibidos na UI. Adicionado try/catch com exibição de erros e botão de refresh.
- **Nova página `/automacoes`**: Follow-up movido de uma tab obscura em Configurações para uma página própria de `/automacoes` no menu lateral principal.
- **Preparação para Gatilhos**: A nova página de Automações divide espaço entre Sequências de Follow-up (ativas) e Gatilhos por Evento (Fase E).

## Fase E — Gatilhos de Evento e Orquestração (Fundação Concluída) — 06/04/2026

### O que foi entregue
- **Migration 042**: Nova tabela `event_triggers` e políticas RLS para mapeamento de eventos e ações (com toggles de autonomia).
- **Backend API**: 4 novas rotas (`GET/POST/PATCH/DELETE /api/automacoes/triggers`) protegidas por tenant.
- **Orquestrador de Eventos (`orchestrator.ts`)**: Interceptador injetado no `PATCH /api/leads/[id]` que roda em background quando o status do lead é alterado.
- **UI Base (`TriggerConfig`)**: Novo componente de painel substituindo o aviso 'Em breve', puxando dados ativos do banco.

### Pendências Imediatas (Próxima Sessão / Chunk)
- **UI Formulário (Modal)**: Implementar complexidade visual de regras ("Quando X, mude para Y, Faça Z").
- **Templates Seed**: Criar botão rápido que popule os gatilhos padrão (ex: Status Em Contato -> Régua Comercial).
- Encadeamento visível no frontend.
- Dashboard executivo: painel centralizado de performance por agente/campanha.
- Warm-up automático de números WhatsApp novos.

## Atualização 2026-04-08 — Templates Seed da UI de Automações

- a pendência `Templates Seed` da Fase E foi fechada
- arquivos principais:
  - `src/app/api/automacoes/triggers/route.ts`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
  - `src/app/api/automacoes/triggers/seed/route.ts`
  - `src/components/automacoes/trigger-config.tsx`
- comportamento:
  - o botão `Templates PrevLegal` agora popula o banco com gatilhos padrão do tenant atual
  - o seed é idempotente e só insere slots ainda vazios
  - os templates dependem de recursos reais já configurados:
    - régua ativa de follow-up
    - agente ativo de triagem
    - agente ativo de confirmação
    - régua ou agente ativo de reativação
  - quando o tenant ainda não tiver a peça necessária, a UI informa como `indisponível` em vez de falhar silenciosamente
- endurecimento técnico no mesmo pacote:
  - rotas de `event_triggers` deixaram de resolver tenant por caminho legado e passaram a usar `getTenantContext`
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - validar o seed em runtime e depois voltar ao modal avançado de criação/edição de gatilhos

## Atualização 2026-04-08 — Refino visual e diagnóstico da aba de Gatilhos

- a tela de `Automações` recebeu um ajuste de UX na mesma trilha da Fase E
- arquivo principal:
  - `src/components/automacoes/trigger-config.tsx`
- comportamento:
  - `Novo Gatilho` agora usa contraste explícito e não depende de variável inválida de tema
  - a faixa de erro passa a mostrar a mensagem real do backend quando o carregamento dos gatilhos falhar
  - a UI passou a expor o que ainda falta no tenant para o seed funcionar por completo:
    - régua ativa
    - agente de triagem
    - agente de confirmação
    - agente de reativação
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 — Seed validado em runtime e pré-requisitos expostos na UI

- a validação do tenant real confirmou que o seed de `event_triggers` não estava falhando
- o comportamento observado foi coerente com a configuração atual do escritório:
  - `0` réguas ativas
  - `0` agentes ativos
  - `0` gatilhos existentes
- a UI de `Automações` foi endurecida para refletir esse cenário com honestidade operacional:
  - feedback do seed vira aviso quando nada é inserido por indisponibilidade de recursos
  - modal de gatilhos desabilita seleção sem recurso válido
  - mensagens orientam o operador para criar agentes em `/configuracoes?tab=agentes` e ativar réguas em `/automacoes`
  - os CTAs `Novo Gatilho` e `Salvar Gatilho` receberam contraste visual explícito para evitar regressão de legibilidade
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - criar a base mínima de agentes/régua no tenant atual e então reexecutar `Templates PrevLegal`

## Atualização 2026-04-08 — Agentes ganharam seed operacional e `/agente` deixou de ser singleton

- a superfície `/agente` passou a ser a página canônica de multiagentes do produto
- arquivos principais:
  - `src/app/(dashboard)/agente/page.tsx`
  - `src/components/agentes-config.tsx`
  - `src/app/api/agentes/route.ts`
  - `src/app/api/agentes/[id]/route.ts`
  - `src/app/api/agentes/seed/route.ts`
- comportamento novo:
  - criação e edição de agentes agora respeitam `tipo` de forma consistente
  - a UI ganhou `Templates PrevLegal` para semear agentes-base por tenant
  - o seed é idempotente e cria a base operacional inicial:
    - triagem
    - confirmação
    - reativação
    - documentos
    - fechamento no tipo `followup_comercial`
- decisão importante de produto:
  - o papel de fechamento entra agora sem migration extra de enum; por enquanto ele é modelado como `followup_comercial`
  - isso mantém compatibilidade com o roteamento atual e abre espaço para uma futura fase de proposta/fechamento mais explícita
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - usar o seed de agentes no tenant atual
  - depois reexecutar o `Templates PrevLegal` de gatilhos

## Atualização 2026-04-08 — Status rápido do lead foi alinhado ao orquestrador

- a rota `PATCH /api/leads/[id]/status` passou a acionar `processEventTriggers`
- isso fecha a lacuna onde a Fase E só rodava pelo update completo em `PATCH /api/leads/[id]`
- impacto prático:
  - o operador pode trocar status pelo caminho rápido sem perder automação
  - o QA de gatilhos deixa de depender de qual tela fez a mudança
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - com agentes já seeded, ativar uma régua e testar o seed dos gatilhos de novo

## Atualização 2026-04-08 — Criação e manutenção de agendamentos ficaram resilientes à ausência da `043`

- a agenda por usuário continuou no código, mas a API agora sobrevive quando a produção ainda não tem `calendar_owner_scope`, `calendar_owner_usuario_id` e `calendar_owner_email` em `agendamentos`
- arquivos principais:
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
  - `src/lib/permissions.ts`
- comportamento novo:
  - `POST /api/agendamentos` tenta persistir ownership do calendário e rebaixa para schema legado se a `043` ainda não estiver aplicada
  - `PATCH` e `DELETE` deixam de depender rigidamente das colunas novas para atualizar ou cancelar o evento Google
  - o modal `Novo agendamento` deixa de quebrar por erro de schema cache ao escolher lead, responsável e e-mail da reunião
- decisão importante de rollout:
  - enquanto a `043` não estiver aplicada em produção, a agenda continua funcionando no modo legado com fallback do escritório
  - o ownership explícito do calendário fica disponível automaticamente assim que a migration entrar
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - aplicar a migration `043` no banco e validar novamente a criação de agendamento com owner columns persistidas

## Atualização 2026-04-08 — Agenda desktop ganhou rail operacional antecipado

- a tela `/agendamentos` passou a expor o trilho lateral já em `lg`, sem esperar `xl`
- arquivos principais:
  - `src/app/(dashboard)/agendamentos/page.tsx`
- comportamento novo:
  - a fila de `Precisa confirmação`, `Confirmados` e `Histórico recente` aparece ao lado do calendário em notebooks e desktops comuns
  - um card `Em foco` resume o compromisso mais relevante ou o item selecionado
  - a grade mensal ficou mais compacta para abrir espaço ao contexto operacional
- decisão importante de UX:
  - o desktop do PrevLegal passa a privilegiar “o que fazer agora” antes de “ver todos os dias grandes”
  - a lista empilhada continua existindo apenas abaixo de `lg`
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - refinar os chips e eventos do calendário agora que a composição base ficou madura

## Atualização 2026-04-08 — Agenda pós-043 passou a explicitar o vínculo correto com `usuarios`

- depois da aplicação da `043`, a tabela `agendamentos` passou a ter duas relações para `usuarios`:
  - `usuario_id`
  - `calendar_owner_usuario_id`
- arquivos principais:
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
- comportamento novo:
  - os `selects` da API agora usam embed explícito pelo FK do responsável operacional:
    - `usuarios:usuarios!agendamentos_usuario_id_fkey(...)`
  - a resposta de criação/edição deixa de quebrar com erro de relacionamento ambíguo no PostgREST
  - a listagem de agendamentos volta a enxergar corretamente o responsável sem colidir com o owner técnico do calendário
- impacto prático:
  - o evento podia ser criado no Google e enviado por e-mail, mas a UI falhava ao montar a resposta/lista; isso deixa de acontecer
  - a agenda volta a operar normalmente no cenário já migrado, sem depender de fallback antigo
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - validar em runtime criação, listagem, remarcação e cancelamento de agendamentos após a `043`

## Atualização 2026-04-09 — Agenda Google fechou a validação runtime e o foco passou para go-live comercial

- a rodada de validação real da agenda ficou verde no tenant:
  - listagem antiga reapareceu
  - novo agendamento apareceu
  - remarcar funcionou
  - cancelar funcionou
- conclusão operacional:
  - a camada de agenda não é mais o principal bloqueio de go-live
  - o gargalo seguinte está em:
    - confiança comercial do Google OAuth
    - smoke test final do tenant
- documentos novos criados:
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/TENANT_SMOKE_TEST_CHECKLIST.md`
- próximo passo recomendado:
  - fechar consent screen / verificação do Google
- depois executar o smoke test final ponta a ponta
- no smoke test final, tratar convite com email já existente como limitação conhecida do go-live atual:
  - convite segue por link manual
  - cada email fica vinculado a um único escritório até a futura frente de multi-membership

## Atualização 2026-04-13 — Templates de agentes passaram a oferecer dois modelos canônicos

- o seed de agentes deixou de refletir implicitamente apenas a operação da Ana
- agora a UI de `/agente` permite escolher entre dois modelos prontos:
  - `Modelo Jessica`
    - benefícios previdenciários
    - acolhimento jurídico inicial
    - conversão para consulta / análise
  - `Modelo Ana`
    - planejamento previdenciário consultivo
    - diagnóstico comercial
    - fechamento de planos
- arquivos principais:
  - `src/lib/agent-seed-profiles.ts`
  - `src/app/api/agentes/seed/route.ts`
  - `src/components/agentes-config.tsx`
  - `src/app/(dashboard)/agente/page.tsx`
- comportamento novo:
  - a escolha do modelo operacional do escritório passa a ser explícita
  - os prompts-base, fluxos, objeções e gatilhos de escalada ficaram distintos para cada contexto
  - o seed continua idempotente por `tipo`, mas agora respeita o kit selecionado
- decisão de produto:
  - templates não podem carregar viés oculto de um único piloto
  - onboarding assistido precisa oferecer atalhos reais para tipos diferentes de escritório
## Atualização 2026-04-13 — Backlog operacional pós-smoke test

- campanhas:
  - suportar seleção de leads cadastrados manualmente para campanhas/teste
  - listar agentes reais do escritório no campo `Agente IA para esta campanha`
  - pré-preencher mensagem inicial por template do agente, mantendo edição manual
  - expor canal Z-API/Twilio na configuração de disparo
- inbox:
  - concluir o fluxo de transferência de conversa entre usuários
  - alinhar notificações com ownership real da thread
  - corrigir deep links de `abrir conversa` / `iniciar conversa` a partir do lead
## Atualizacao Importador / email da planilha nao pode quebrar go-live quando o schema operacional ainda nao suporta a coluna — 14/04/2026

- durante o reteste da base enriquecida `consulta completa lista RJ 2.csv`, a importação passou a inserir apenas `21` leads e falhar em `29`
- sintoma observado:
  - resumo da importação mostrava `29 falhas no insert`
  - os avisos listavam repetidamente:
    - `Could not find the 'email' column of 'leads' in the schema cache`
- causa:
  - a planilha já traz `EMAIL1/EMAIL2`
  - o importador tentava persistir `email` em `leads`
  - mas o schema operacional atual ainda não possui essa coluna
- correção aplicada:
  - o importador deixou de enviar `email` no insert de `leads`
  - quando a planilha trouxer e-mail, a UI passa a avisar que o campo foi detectado, mas ainda não é persistido no schema atual
- impacto operacional:
  - a base enriquecida volta a importar inteira sem perder linhas por causa de uma coluna opcional
  - o go-live não fica travado por divergência de schema periférica

## Proxima evolucao correta / campanhas por tipo de contato relacionado

- a operação enriquecida deixou explícita uma necessidade nova:
  - não basta guardar contatos de cônjuge, filho e irmão em texto livre
  - campanhas futuras devem poder filtrar por tipo de contato de abordagem
- objetivo de produto:
  - permitir campanhas como:
    - `só titulares`
    - `só cônjuges`
    - `só filhos`
    - `só irmãos`
- decisão:
  - isso entra como evolução estrutural depois do go-live imediato
  - não deve ser resolvido apenas com campo aberto de observação

## Atualização 2026-04-16 — Campanha titular legado, autoresponder interno e espelhamento `fromMe`

- problemas observados no reteste operacional:
  - campanhas criadas com `Somente titular` podiam encerrar com `0 enviados` quando o lead vinha de cadastro manual ou legado sem `contato_abordagem_tipo`
  - a continuação automática do agente não acontecia mesmo com resposta do lead entrando na inbox
  - mensagens enviadas diretamente do celular conectado ao número do escritório apareciam no WhatsApp real, mas não eram espelhadas na thread do sistema
- causas encontradas:
  - o disparo filtrava `contato_abordagem_tipo` por igualdade estrita, então `null` não entrava em `titular`
  - `triggerAgentAutoresponder` chamava `/api/agente/responder`, mas o middleware redirecionava a requisição interna para `/login`
  - o webhook Z-API ignorava payloads `fromMe`, então o sistema perdia o outbound digitado fora da plataforma
- correções aplicadas:
  - `titular` agora aceita lead sem tipo explícito como fallback seguro
  - leads manuais e leads automáticos criados por inbound passam a nascer com `contato_abordagem_tipo = titular`
  - o auto-responder interno passou a usar `ADMIN_FLUXROW_TOKEN` em header
  - o middleware passou a liberar apenas essa chamada interna autenticada para `/api/agente/responder`
  - o webhook Z-API agora espelha mensagens `fromMe` como outbound manual na mesma conversa
- efeito esperado no produto:
  - campanhas para leads manuais deixam de morrer com `0 enviados`
  - o agente consegue continuar a conversa depois da resposta do lead
  - a thread mostra tanto o que foi enviado pelo sistema quanto o que foi enviado diretamente do celular do escritório

- [x] Retomada automática do agente após resposta fora do horário
  - Mensagem fora da janela não derruba a conversa para `humano`
  - Novo worker `/api/agente/worker` reprocessa pendências a cada 5 minutos
  - Válido para Z-API e Twilio

## Atualização 2026-04-30 — Bianca mais natural e aba de leads com estado operacional visível

- a operação pediu duas melhorias de UX diretamente ligadas à campanha de `planejamento`:
  - a `Bianca` não deve repetir `bom dia` / `boa tarde` logo após já ter saudado o lead no disparo
  - a aba de leads precisa refletir o `estado operacional` definido na inbox para facilitar leitura e ações futuras
- direção aplicada:
  - o runtime de `planejamento` passa a detectar saudação curta e força uma ponte social breve antes de entrar no tema
  - no primeiro retorno pós-campanha, a resposta deixa de repetir a mesma saudação do disparo e pode usar só uma aproximação curta
  - o kanban de leads passa a mostrar badge com o mesmo `estado operacional` da conversa mais recente do lead

## Atualização 2026-04-30 — Duplicação visual de outbound manual na inbox

- no handoff humano, mensagens manuais enviadas pelo sistema podiam aparecer duplicadas na thread mesmo quando o WhatsApp real mostrava apenas um envio
- causa consolidada:
  - o envio manual criava um registro local imediatamente
  - depois o espelhamento `fromMe` da `Z-API` podia inserir um segundo registro com o mesmo corpo
- correção aplicada:
  - o espelhamento da `Z-API` reaproveita o outbound manual recente em vez de inserir nova linha
  - a leitura da conversa colapsa duplicatas manuais recentes com a mesma mensagem e mesmos telefones

## Atualização 2026-04-30 — Fundação segura do recontato automático (sem cron ativo)

- foi aberta a `V1` técnica do recontato automático para dois cenários distintos:
  - `campanha_sem_resposta`
  - `conversa_em_aberto`
- a entrega foi desenhada para **não ligar nada sozinho em produção por padrão**:
  - novas flags por tenant em `configuracoes`
  - modos:
    - `off`
    - `shadow`
    - `manual_review`
    - `live`
  - migration própria para base estrutural
  - worker interno preparado, mas **sem cron novo no `vercel.json` nesta rodada**
- superfícies entregues:
  - tabela de auditoria/candidatos `automation_recontact_candidates`
  - motor de elegibilidade para montar candidatos
  - rota de revisão manual em `/api/automacoes/recontato/candidates`
  - UI em `Configurações > Geral` para:
    - salvar flags
    - rodar varredura manual
    - revisar fila
    - disparar candidato manualmente em `manual_review`
- direção operacional consolidada:
  - massa e `base fria sem resposta` continuam mais próximas de campanha
  - retomada de conversa pausada passa a nascer como motor separado e auditável
  - rollout seguro canônico:
    - `off`
    - `shadow`
    - `manual_review`
    - só depois `live`

## Atualização 2026-04-30 — Fora do horário volta a entrar no worker quando a janela abre

- havia um buraco operacional na retomada pós-horário:
  - o lead recebia o aviso de `fora do horário`
  - mas o inbound original ficava marcado como se já estivesse resolvido
  - quando a janela útil abria, o worker não encontrava mais nada para a Bianca retomar
- correção aplicada:
  - `mensagens_inbound` agora pode guardar `agente_reprocessar_apos`
  - no caso `outside_hours`, o inbound original fica pendente com relógio de reprocesso
  - o aviso continua sendo enviado uma vez
  - o worker ignora a pendência até o horário liberar e então reprocessa a mesma mensagem
- endurecimento adicional:
  - o worker passa a ignorar pendência velha que já foi superada por mensagem mais nova na conversa
