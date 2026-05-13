# PrevLegal — MASTER.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Documento vivo. Atualizado a cada sessão de desenvolvimento.
> Última atualização: 09/04/2026

---

## Navegação

- [[INDEX]]
- [[OPERATIONAL_BOOK]]
- [[OPERATIONAL_BOOK_GO_LIVE]]
- [[OPERATIONAL_BOOK_CHANNELS]]
- [[OPERATIONAL_BOOK_AGENTS]]
- [[OPERATIONAL_BOOK_DOCUMENTS]]
- [[OPERATIONAL_BOOK_CAMPAIGNS]]
- [[OPERATIONAL_BOOK_PORTAL]]
- [[OPERATIONAL_BOOK_FINANCE]]
- [[OPERATIONAL_BOOK_INBOX]]
- [[OPERATIONAL_BOOK_SCHEDULING]]
- [[OPERATIONAL_BOOK_ADMIN]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[EXECUTION_TRACK]]
- [[GOOGLE_OAUTH_GO_LIVE_CHECKLIST]]
- [[GOOGLE_OAUTH_SUBMISSION_COPY]]
- [[DOMAIN_MIGRATION]]
- [[MOBILE_CLIENT_APP_PLAN]]
- [[MOBILE_CLIENT_APP_BACKLOG]]
- [[PREVIDENCIARIO_EXPANSION_STRATEGY]]
- [[PRODUCT_PORTFOLIO_STRATEGY]]
- [[IMPORTADOR_INTELIGENTE_PLAN]]
- [[DOCLING_INTEGRATION_PLAN]]
- [[PRODUCTION_ISOLATION_STRATEGY]]

## Produto

**Nome:** PrevLegal
**Categoria:** SaaS B2B para operações de captação previdenciária
**Repositório:** https://github.com/fluxrow/prevlegal
**Produção atual:** https://app.prevlegal.com.br
**LP atual:** https://www.prevlegal.com.br
**Domínio próprio adquirido:** `prevlegal.com.br`

## Estado operacional atual

- o projeto agora passa a manter duas camadas formais de memória:
  - memória bruta e histórica em `LEARNINGS`
  - memória canônica de execução em `OPERATIONAL_BOOK`

Estado confirmado em 27/04/2026:
- `npm run lint` verde localmente
- `npm run build` verde localmente
- campanhas agora têm controle operacional direto de `Pausar` e `Retomar` na UI, sem depender de SQL manual no banco
- a leitura de `respondidos` na tela de campanhas deixou de depender só do contador materializado:
  - a listagem agora cruza `campanha_mensagens` e inbound real da inbox para refletir melhor respostas já ocorridas
- a trilha `Z-API` passou a fechar resposta de campanha com a mesma semântica da `Twilio`, evitando subcontagem de `respondidos`
- campanhas por seleção personalizada agora resolvem a resposta pelo histórico real de disparo (`campanha_mensagens`) mesmo quando `lead.campanha_id` está nulo
- a inbox passou a ter base própria de `estado_operacional` por conversa, separada do funil do lead:
  - badge visível na lista e no painel
  - troca manual pelo operador
  - prazo opcional já persistido para estados que pedem acompanhamento
  - automações por esse estado continuam fora do ar até aprovação
- o modal `Novo lead` voltou a respeitar o perfil operacional padrão do tenant:
  - `planejamento_previdenciario` agora abre cadastro com campos de contexto do planejamento
  - `beneficios_previdenciarios` continua com a seção de benefício/NB/banco/RMA
- no cadastro manual de `planejamento_previdenciario`, quando o telefone já existe na base do tenant, o sistema reaproveita o lead em vez de explodir com colisão de `nb`
- o cadastro manual técnico deixou de depender semanticamente de `NB` para planejamento; o `NB` legado segue existindo só como identificador técnico interno
- a trilha de texto com acentos ganhou reparo nos pontos mais sensíveis de hoje:
  - import de nomes
  - interpolação de campanhas/follow-up
  - prompt do runtime do agente
- o app Next deixou de puxar `supabase/functions/*` para o typecheck do runtime web; as edge functions Deno continuam fora do build do app, como deve ser
- o smoke técnico do agente de `planejamento_previdenciario` voltou a rodar de ponta a ponta via `scripts/smoke-test-agent-ana.ts`
- o playbook de `planejamento_previdenciario` foi endurecido no seed e no runtime para:
  - responder em blocos curtos de WhatsApp
  - evitar subtítulos/listas com cara de parecer
  - reduzir números ilustrativos e recomendações prematuras
  - usar a knowledge como apoio, não como roteiro de laudo precoce
  - tratar `Bom dia` e saudações curtas de forma mais natural no primeiro retorno após campanha, sem responder como se o lead tivesse perguntado `tudo bem?`
  - evitar sobras de cortesia mecânica como `obrigada.` em parágrafo solto
  - segurar presunções sobre profissão/contexto societário antes de o lead dizer o próprio perfil
  - reescrever automaticamente respostas longas demais, com perguntas demais ou com cara de textão, tanto em `planejamento_previdenciario` quanto em `beneficios_previdenciarios`
  - operar com teto de tokens mais conservador no runtime para reduzir verbosidade sem trocar o motor do agente
  - não continuar respondendo quando a conversa já saiu de `agente` para `humano`, inclusive se a tomada humana acontecer no meio do processamento
  - suprimir loops de despedida cordial quando o lead e a Bianca entram num “muito obrigada / até breve” sem pedido aberto real
  - encerrar de forma imediata e cordial quando o lead se identifica como colega da própria área previdenciária, sem insistir na qualificação comercial
- a própria knowledge de `planejamento_previdenciario` também foi podada em pontos críticos:
  - menos “regra prática” absoluta em PGBL/VGBL/FUNPRESP/matching
  - menos exemplos com cifras e patrimônios hipotéticos
  - mais linguagem de estrutura de análise e variáveis
- campanhas de `planejamento_previdenciario` agora nascem com `apenas_verificados = false` por padrão na UI e no fallback da API
- campanhas de `beneficios_previdenciarios` continuam com `apenas_verificados = true` por padrão
- campanhas agora podem ser criadas com início agendado:
  - sem horário futuro, continuam em `rascunho`
  - com horário futuro, nascem em `agendada`
  - o worker promove para `ativa` só quando chega a hora do primeiro envio
  - a preparação de minuta/contrato agora pode aproveitar também documentos já processados do lead como evidência para preencher placeholders do cliente:
    - conversa continua valendo
    - documentos parseados passam a reforçar CPF/RG/endereço/profissão e outros campos cadastrais
    - `categoria_profissional` do lead também passa a servir como fallback seguro para `cliente_profissao` quando a conversa/documentos não trouxerem esse campo de forma explícita
    - sem foundation documental, o fluxo degrada para “só conversa” sem quebrar geração
  - `lead_documentos` agora guarda referência canônica de storage (`storage_bucket` + `storage_path`) nos fluxos principais:
    - upload interno
    - portal
    - documentos gerados por IA
    - minutas/contratos
  - delete, reprocesso e compartilhamento passam a preferir essa referência antes do fallback por signed URL
- a inbox humana agora mostra melhor o contexto operacional do lead sem alterar o runtime de conversa:
  - badge de responsável visível na lista e no cabeçalho da conversa
  - faixa rápida com os documentos já vinculados ao lead dentro da própria thread
  - o operador agora também consegue compartilhar documento do lead pela própria inbox, em V1 segura por link assinado no WhatsApp
  - a troca de responsável do caso agora também pode acontecer direto na inbox, reaproveitando o mesmo handoff formal do lead
  - admins/backoffice passam a manter visibilidade operacional das conversas após transferência de responsabilidade
  - a inbox agora também expõe o `status do lead` do kanban:
    - badge na lista
    - badge no cabeçalho da conversa
    - filtro próprio por `status do kanban` dentro da inbox
  - a troca de `estado operacional` ganhou sync assistido com o kanban:
    - `agendado` pode refletir para `scheduled`
    - `aguardando_cliente` pode refletir para `awaiting`
    - `convertido` pode refletir para `converted`
    - `encerrado` exige escolha manual, em vez de adivinhar `lost` ou `converted`
  - quando a conversa é marcada como `agendado` com data/hora, o sistema agora sobe automaticamente para `agendamento` real:
    - cria ou atualiza o compromisso em `/agendamentos`
    - tenta colocar o evento no Google Calendar do responsável do lead
    - se o lead já tiver e-mail, esse e-mail passa a ser aproveitado como convidado também
    - se o Google Calendar não estiver conectado, o compromisso ainda nasce no calendário interno do produto
  - o feedback operacional passou a deixar explícito quando:
    - o compromisso entrou na agenda do responsável
    - o lead ficou fora do convite por falta de e-mail
  - a aba de relatórios agora ganhou uma leitura operacional própria da Bianca nos últimos 30 dias:
    - volume recente de respostas IA
    - custo LLM agregado em USD
    - latência média
    - takeovers humanos respeitados
    - loops de despedida suprimidos
    - encerramentos automáticos de colegas previdenciaristas
    - floods contidos
    - falhas recentes de LLM
    - o comparativo `Agente IA vs. Atendimento Manual` agora separa corretamente:
      - atendimento humano real
      - mensagens ainda pendentes
  - resposta manual enviada diretamente pelo WhatsApp do número conectado agora também vale como takeover humano:
    - o espelhamento `fromMe` da Z-API passa a trocar a conversa para `humano`
    - o estado operacional vai para `em_atendimento_humano`
    - o Google Calendar não estava conectado
  - a leitura continua `texto-first`: anexo binário direto e resposta automática por áudio seguem fora do fluxo atual
 - campanhas agora também podem ser criadas por `estado operacional` da conversa:
   - o público é resolvido a partir da conversa mais recente de cada lead
   - o sistema congela os `lead_ids` no momento da criação, como já faz em `contatos específicos` e `por status`
   - o worker e o dispatch não mudam; só a camada de seleção da audiência ganha esse novo recorte
- a visualização de conversa na área do lead voltou a respeitar a mesma semântica da inbox:
  - mensagem do lead aparece como inbound
  - resposta da Bianca/humano aparece como outbound
  - o histórico deixa de parecer “só Bianca falou”
- a esteira de campanhas deixou de depender de uma única requisição longa para disparos médios/grandes
- `POST /api/campanhas/[id]/disparar` agora só inicia a campanha, processa o primeiro passo e devolve diagnóstico operacional
- o restante do envio segue por `POST/GET /api/campanhas/worker`, pensado para rodar por cron
- o smoke técnico confirmou runtime ativo e knowledge carregando, mas ainda expôs um risco de copy/conduta no playbook de planejamento:
  - ainda existe resíduo de respostas numéricas demais em alguns cenários técnicos
  - depois da poda da knowledge, `advogado` e `dentista` melhoraram bem
  - o principal caso residual agora está em `médico PJ / pró-labore`, onde o agente ainda puxa números gerais cedo demais
- o gargalo detectado em campanhas de `beneficios_previdenciarios` não era só copy ou lista:
  - o disparo antigo fazia sleeps dentro da própria request
  - com `warmup`, lote e delays, a função podia morrer após poucos envios
  - isso explicava sintomas como campanha de `~50` contatos parar em `3-4` mensagens
- o smoke real do tenant Pagliuca continua dependendo do canal WhatsApp conectado; build/lint verdes não substituem a validação operacional do webhook e da conversa real

- o core do produto já está funcional
- o maior risco atual não é falta de feature principal
- o maior risco atual é de `go-live incompleto`, especialmente por:
  - Google OAuth ainda sem verificação comercial
  - smoke test final do tenant real ainda não fechado ponta a ponta
  - necessidade de fechar o checklist manual do Google Auth Platform antes de onboarding pago

Estado confirmado em 09/04/2026:
- patch manual `043`, `044` e `045` aplicado no banco operacional
- agenda Google validada em runtime:
  - criar
  - listar
  - remarcar
  - cancelar
- textos públicos de privacidade e termos endurecidos para agenda Google
- escopos do OAuth reduzidos ao mínimo operacional
- material de submissão do Google pronto em `docs/GOOGLE_OAUTH_SUBMISSION_COPY.md`

Referencia executiva principal:
- `docs/EXECUTION_TRACK.md`

### Arquitetura de domínio aprovada
- `www.prevlegal.com.br` -> site / LP canônico
- `prevlegal.com.br` -> redirect para `www.prevlegal.com.br`
- `app.prevlegal.com.br` -> plataforma principal
- `admin.prevlegal.com.br` -> painel admin desde o início

### Variáveis públicas aprovadas para o cutover
- `NEXT_PUBLIC_SITE_URL=https://www.prevlegal.com.br`
- `NEXT_PUBLIC_APP_URL=https://app.prevlegal.com.br`

### Ordem lógica de execução da migração de domínio
1. Definir a arquitetura final (`site` vs `app`)
2. Configurar domínio e subdomínios no Vercel
3. Ajustar DNS do domínio comprado
4. Atualizar URLs canônicas, CTAs e links absolutos do sistema
5. Revisar login, portal, notificações e links enviados automaticamente
6. Validar redirects e HTTPS em produção

### Estado confirmado em 2026-03-19

- `https://www.prevlegal.com.br` -> LP pública canônica
- `https://prevlegal.com.br` -> `307` para `https://www.prevlegal.com.br/`
- `https://app.prevlegal.com.br` -> plataforma principal
- `https://admin.prevlegal.com.br` -> admin principal
- `https://prevlegal.vercel.app` -> host técnico de fallback, não mais canônico
- banco operacional `lrqvvxmgimjlghpwavdb` resetado com sucesso via SQL direto (`031` + reset limpo)
- banco central `zjelgobexwhhfoisuilm` preservado sem execução destrutiva
- legado piloto foi descartado; o próximo passo correto é recadastrar o primeiro escritório real do zero

Checklist detalhado em: [[DOMAIN_MIGRATION]]

### Posicionamento correto
O PrevLegal NÃO é para advogados autônomos.
É para **operações de captação previdenciária** — empresas não-OAB que:
1. Compram listas de beneficiários elegíveis
2. Usam o PrevLegal para qualificar leads via agente IA no WhatsApp
3. Repassam leads qualificados para **escritórios parceiros** (OAB)
4. Dividem honorários com o escritório

Modelo legal baseado no Provimento 205/2021 OAB + Art. 34 IV Estatuto da Advocacia.
A empresa de captação NUNCA se identifica como vinculada ao escritório parceiro.

### Agente IA — regras críticas
- Se apresenta como: "(nome) — Consultor(a) Previdenciário(a)"
- NUNCA menciona o escritório parceiro na abordagem inicial
- NUNCA revela NB, valores do benefício ou dados bancários
- Referência jurídica: STF RE 564.354 (08/09/2010, Informativo 599)
- ~70% dos contatos são feitos por filhos/familiares do beneficiário
- Em campanhas de benefícios, o primeiro toque deve ser curto, crível e focado em obter abertura para explicar, sem despejar tese jurídica
- Em campanhas de benefícios, a mensagem inicial não deve falar de valores, retroativos ou cifras antes de existir interesse claro
- Todo agente deve continuar a conversa com base no histórico real do lead, sem reiniciar o atendimento como se fosse um contato novo
- Quando só a triagem estiver ativa, ela deve aquecer brevemente o lead e deixar o caso pronto para a advogada responsável assumir
- Em planejamento previdenciário, a esteira pode seguir com agentes até o momento em que o especialista ou advogado assume para validar a estrutura final e colher assinatura
- em planejamento previdenciário, a abordagem padrão é `titular-only`; contatos de familiares não entram como fluxo principal desse playbook
- com tenants pagantes ativos, mudanças de playbook devem ser isoladas por tenant, perfil operacional e rollout controlado

---

## Fundador

**Nome:** Flávio Cauã Farias de Farias
**Email:** fbcfarias@icloud.com / fbcfarias@icloud.com
**GitHub:** fbcfarias (NÃO é CauaFarias — pessoa diferente)
**Empresa:** Fluxrow

---

## Cliente Piloto

**Jéssica Alexandrini** — advogada previdenciária
**Escritório:** Alexandrini Advogados
**Endereço:** Rua Paula Gomes, 853 — São Francisco — Curitiba/PR
**Email:** jessica@alexandrini.adv.br
**WhatsApp:** (41) 99984-4234
**Site:** alexandrini.adv.br
**OAB/PR**

Opera como hunter via empresa secundária (captação) + escritório (jurídico).
Ainda não usa o PrevLegal — implementação planejada com as listas que ela trabalha.

---

## Pricing

| Plano | Preço | Leads/mês |
|-------|-------|-----------|
| Entrada | R$ 1.997/mês | Até 2.000 |
| Profissional | R$ 3.497/mês | Até 10.000 |
| Enterprise | R$ 5.000+/mês | Ilimitado |

Jéssica avaliou que o mercado paga facilmente R$ 5k/mês.
Estratégia: entrar com R$ 1.997 para gerar cases, subir gradualmente.

---

## Stack Técnica

- **Framework:** Next.js 16.1.6 App Router (TypeScript)
- **Banco:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deploy:** Vercel (auto-deploy no push para main)
- **WhatsApp:** camada em transicao para providers (`Twilio` agora, `Z-API` a seguir) com suporte planejado a multiplos numeros por tenant
- **Mail marketing planejado:** `Resend`, com entrada prevista primeiro para operações de planejamento previdenciário e newsletter
- **IA:** Claude API (claude-sonnet-4-20250514)
- **Agendamentos:** Google Calendar OAuth por usuário com fallback do escritório
- **Charts:** Recharts
- **Automação:** n8n

### Supabase
| Ambiente | Project ID |
|----------|-----------|
| Alexandrini (dev/piloto) | lrqvvxmgimjlghpwavdb |
| Central | zjelgobexwhhfoisuilm |

### Vercel
- Project: prevlegal
- projectId: prj_riweCOowADD0JR7rGw8yzSVQOEp8
- teamId: team_zeCqZtYRVn7PT9BHODcWKQiw

---

## Preferências de Desenvolvimento (Cauã)

1. Claude arquiteta e gera código/prompts completos
2. AgentVS Code (AntiGravity) executa no terminal local
3. npm run build local antes de cada push — obrigatório
4. Push para main → Vercel auto-deploya
5. Supabase MCP para queries e migrations direto

### Preferências de comunicação
- Direto ao ponto, sem rodeios
- Código completo, não parcial
- Commits com mensagens descritivas
- Sempre informar o commit hash após deploy
- Separar sempre `SITE_URL` de `APP_URL` ao mexer em SEO, LP, convites, portal ou links absolutos

### Pilar de experiência da Fluxrow
- o sistema deve ser tolerante ao comportamento humano normal, não exigir digitação “perfeita”
- buscas e vínculos operacionais devem aceitar:
  - acentos e sem acentos
  - telefone com ou sem máscara
  - pequenas variações naturais de entrada
- no cadastro manual inicial, o sistema não deve exigir documentos sensíveis antes da hora
- CPF pode entrar depois do primeiro contato, quando houver contexto e confiança para pedir esse dado
- a inbox humana deve nascer `pessoal por padrão`, mesmo para perfis administrativos do escritório
- o mesmo princípio de carteira pessoal vale para superfícies paralelas da inbox, como portal e badges de pendência
- templates padrão devem ser nomeados pelo tipo de operação que representam, nunca pelo nome do cliente que inspirou o playbook
- visão ampla da equipe é capacidade de supervisão e deve aparecer como modo explícito, não como padrão invisível
- quando houver conflito entre rigidez técnica e fluidez de uso, a preferência padrão do produto é resolver a rigidez no backend
- onboarding, atendimento, diagnóstico e resolução de problemas devem seguir a mesma lógica:
  - menos atrito
  - menos passos desnecessários
  - mais clareza para o usuário final

### Política de sessão recomendada
- Plataforma principal: expiração por inatividade após `45 minutos`
- Admin: expiração por inatividade após `15 minutos`
- Portal do cliente: continua por link/token, sem sessão persistente clássica de backoffice
- Ações sensíveis devem exigir reautenticação adicional:
  - admin
  - financeiro
  - exportações
  - exclusões
  - troca de credenciais/integradores

---

## Twilio — Situação atual e roadmap

**Atual:** Conta pessoal do Cauã (sandbox) — não escala
**Planejado:** Subcontas Twilio por tenant
- Cada cliente terá sua própria subconta Twilio
- Campos necessários no tenant: twilio_account_sid, twilio_auth_token, twilio_number
- APIs de disparo usarão credenciais do tenant em vez das globais
- Onboarding: Fluxrow cria subconta e provisiona número para o cliente

## WhatsApp Providers — Direcao atual

- a camada `src/lib/whatsapp-provider.ts` passa a ser a fundacao canonica para envio outbound
- o modelo novo admite:
  - `provider = twilio`
  - `provider = zapi`
  - multiplos numeros por tenant
- a tabela planejada para isso e `whatsapp_numbers`
- o runtime continua com fallback seguro para o helper legado de Twilio enquanto a base nova nao estiver populada
- objetivo de produto:
  - permitir mais de um numero de prospeccao por escritorio
  - escolher origem por campanha e, depois, por conversa humana
  - reduzir dependencia de um unico sender ou provider global

## Mobile do Cliente — Direcao atual

- o app mobile do cliente deve nascer como extensao do portal
- ordem recomendada:
  - portal mobile-first
  - PWA instalavel
  - identidade persistente do cliente/familiar
  - app nativo apenas se o uso provar necessidade
- objetivo do MVP:
  - acompanhamento do caso
  - mensagens
  - agenda / Meet
  - documentos
  - perfil do cliente/familiar
- referencia canonica:
  - `docs/MOBILE_CLIENT_APP_PLAN.md`
- backlog tecnico inicial:
  - `docs/MOBILE_CLIENT_APP_BACKLOG.md`
- fase 1 ja iniciada:
  - o portal atual passou a ler branding dinamico do tenant
  - o payload do portal ja inclui `branding`, `proximo_agendamento` e `resumo`
  - o payload do portal agora tambem inclui:
    - `pendencias_documento`
    - `timeline`
    - `resumo.documentos_pendentes`

## Agentes IA — Direcao atual

- a superficie canonica de operacao dos agentes passou a ser `/agente`
- ela agora representa o modelo multiagente do produto, nao mais o singleton legado
- o escritorio pode operar multiplos agentes com papeis distintos, incluindo:
  - triagem
  - confirmacao de agenda
  - reativacao
  - documental
  - follow-up comercial / fechamento
- o produto agora oferece dois kits canônicos de agentes para inicio rapido:
  - `Modelo Jessica`: beneficios previdenciarios, acolhimento juridico inicial e conversao para consulta / analise
  - `Modelo Ana`: planejamento previdenciario consultivo, diagnostico comercial e fechamento de planos
- o seed de agentes nao deve mais refletir um unico caso-piloto; a escolha do modelo operacional do escritorio precisa ser explicita na UI
- o runtime continua com fallback seguro para a configuracao global antiga quando o tenant ainda nao tiver agentes configurados
  - o portal agora tambem permite confirmar presenca na proxima consulta, gerando timeline e notificacao interna para a equipe
  - a home do portal agora combina:
  - o portal agora tambem permite:
    - envio de documentos pelo proprio cliente/familiar
    - associacao opcional do envio a uma pendencia existente
    - atualizacao automatica da timeline e notificacao interna da equipe
    - pedido de remarcacao pelo proprio cliente/familiar, sem alterar a agenda automaticamente

## Inteligencia Documental — Direcao atual

- o PrevLegal deve evoluir de `arquivo armazenado` para `documento compreendido`
- a fundacao escolhida para isso e `Docling`, inicialmente como camada de parsing estrutural para:
  - `lead_documentos`
  - `agent_documents`
- o primeiro ROI nao e gerar mais documentos, e sim:
  - entender documentos ja enviados
  - tornar o acervo pesquisavel
  - melhorar contexto de agentes e operacao humana
- referencia canonica:
  - `docs/DOCLING_INTEGRATION_PLAN.md`

## Arquitetura de Portfólio — Regra atual

- `PrevLegal Core` continua sendo a plataforma principal:
  - captacao
  - qualificacao
  - inbox humana
  - agenda
  - portal/app do cliente
  - financeiro
- expansoes nao substituem o core; elas se conectam a ele
- `PrevGlobal` e demais frentes previdenciarias avancadas devem entrar como modulos premium
- principio atual preservado:
  - o produto central continua orientado a operacao previdenciaria ponta a ponta
  - o crescimento acontece por camadas, nao por troca de identidade
- referencia canonica:
  - `docs/PRODUCT_PORTFOLIO_STRATEGY.md`
    - status macro do caso
    - proxima consulta
    - documentos pendentes
    - linha do tempo do caso
  - a fundacao de schema para a fase seguinte foi preparada em:
    - `supabase/migrations/035_portal_mobile_foundation.sql`
  - a migration `035_portal_mobile_foundation.sql` ja foi aplicada no operacional `lrqvvxmgimjlghpwavdb`
  - o portal agora tambem ganhou installability de PWA:
    - manifesto dinamico por token
    - `service worker` leve em `public/sw.js`
    - CTA `Instalar app` dentro do proprio portal
    - fallback instrucional para iPhone / iOS
  - a foundation de identidade persistente do portal tambem ja foi aberta:
    - migration `036_portal_identity_foundation.sql` aplicada no operacional
    - novas tabelas:
      - `portal_users`
      - `portal_access_links`
    - o detalhe do lead agora permite:
      - cadastrar cliente / familiar / cuidador para o portal
      - ativar / pausar acesso
      - excluir acesso
      - gerar link persistente individual
    - o link persistente atual funciona como ponte segura:
      - registra o acesso em `portal_access_links`
      - atualiza `ultimo_acesso_em` em `portal_users`
      - redireciona para o portal tokenizado existente
  - a foundation de sessao do portal tambem ja foi aberta:
    - migration `037_portal_session_foundation.sql` aplicada no operacional
    - nova tabela:
      - `portal_sessions`
    - o acesso por `/portal/acesso/[token]` agora:
      - cria sessao real de portal em cookie httpOnly
      - registra `ultimo_acesso_em` da sessao
      - permite reconhecer o cliente/familiar dentro do app
    - o portal agora tambem ganhou a primeira aba de `Perfil`:
      - edicao de nome
      - e-mail
      - telefone
      - acao de sair do acesso persistente

## Expansao Previdenciaria — Direcao atual

- a leitura competitiva entre `Prévius` e `Tramitação Inteligente` reforca que o PrevLegal nao deve virar apenas um “software de calculo”
- a tese mais forte e unir:
  - CRM
  - IA
  - operacao comercial
  - calculo previdenciario integrado ao lead
  - agenda
  - contrato
- blocos mais promissores:
  - analise de CNIS com IA
  - score de viabilidade
  - calculo preliminar integrado ao lead
  - geracao de pecas com IA como modulo premium
  - acompanhamento processual como modulo premium
- tese de modulo premium separado:
  - totalizacao internacional (`PrevGlobal`)
- referencia canonica:
  - `docs/PREVIDENCIARIO_EXPANSION_STRATEGY.md`

## Atualização 2026-04-30 — Operação da Pagliuca refinada na camada de conversa e carteira

- a timeline da inbox e do histórico do lead foi normalizada para conversas retomadas após `outside_hours`:
  - quando uma mensagem do lead recebe aviso de horário e só depois a Bianca retoma, o sistema deixa de “colar” a retomada na bolha antiga do lead
  - a resposta retomada passa a aparecer na ordem correta da linha do tempo, alinhada ao que saiu no WhatsApp real
  - a mesma normalização foi reaproveitada no histórico que o próprio agente lê para continuar a conversa
- a Bianca ganhou uma trava leve para retomadas em que o lead já sinaliza encerramento educado, como `já estou aposentada, obrigada`:
  - isso reduz o risco de sair apenas uma saudação vazia como `Boa noite!`
  - nesses casos, a preferência passa a ser um fechamento cordial e contextualizado
- a frente de `planejamento` recebeu ajuste fino para a `Bianca` ficar mais natural na sequência do disparo:
  - saudação curta do lead deixa de gerar resposta que repete `bom dia` / `boa tarde`
  - o primeiro retorno pós-campanha passa a privilegiar uma aproximação social breve antes da ponte para o diagnóstico
- a aba de `Leads` agora reflete o `estado operacional` da conversa mais recente no próprio card, aproximando carteira e inbox
- a trilha de handoff humano com `Z-API` foi endurecida para evitar falso duplicado visual em outbound manual:
  - o espelhamento do canal reaproveita o registro manual recente
  - a leitura da thread colapsa mensagens manuais espelhadas com mesmo corpo e mesmos telefones

## Atualização 2026-04-30 — Base de recontato automático preparada com rollout seguro

- foi aberta a fundação do recontato automático para dois tipos de retomada:
  - `campanha_sem_resposta`
  - `conversa_em_aberto`
- a base ficou pronta para operar em quatro modos por tenant:
  - `off`
  - `shadow`
  - `manual_review`
  - `live`
- esta rodada **não liga automação nova em produção por padrão**:
  - não foi adicionado cron novo ao `vercel.json`
  - o worker interno existe, mas depende de ativação deliberada posterior
- a UI de `Configurações > Geral` agora já permite:
  - ajustar flags
  - rodar varredura manual
  - revisar candidatos
  - disparar manualmente em `manual_review`
- implicação prática:
  - o escritório pode testar a lógica de recontato com rastreabilidade e sem deixar o sistema “sair falando sozinho” cedo demais

## Atualização 2026-04-30 — Retomada automática pós-fora-do-horário estabilizada

- o fluxo de `outside_hours` da Bianca foi corrigido para o comportamento canônico:
  - o lead recebe aviso de horário
  - a conversa permanece em `agente`
  - o inbound original fica agendado para reprocessamento interno
  - quando a janela útil abre, o worker volta a acionar a Bianca automaticamente
- base técnica aplicada:
  - nova coluna `mensagens_inbound.agente_reprocessar_apos`
  - worker do agente endurecido para respeitar esse relógio
  - pendências antigas superadas por mensagens mais novas deixam de ser reprocessadas à toa
