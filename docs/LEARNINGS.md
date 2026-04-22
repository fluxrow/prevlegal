# PrevLegal — LEARNINGS.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Erros encontrados, causas e correções aplicadas.
> Atualizado a cada sessão.

---

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[ROADMAP]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]

## Sessões Relacionadas

- [[Sessoes/2026-03-18-prevlegal-admin-roi-obsidian]]
- [[Sessoes/2026-03-18-sessoes-17-18-marco-prevlegal-completo]]

## Atualização 2026-04-18 — Diretrizes de segurança operacional do agente Ana

- Após smoke test com perguntas técnicas premium, identificamos 3 riscos:
  - Agente tendia a recomendar estratégia em vez de educar
  - Agente podia alucinar valores específicos (subsídios, tetos)
  - Agente se sentia obrigado a sustentar conversa técnica mesmo com perfis profissionais fora do seu repertório profundo
- Aplicamos 3 diretrizes absolutas no prompt_base:
  1. Nunca recomendar estratégia — sempre educar e remeter ao advogado
  2. Nunca estimar valores específicos não documentados
  3. Postura consultiva de descoberta para perfis fora do repertório
- Max_tokens ajustado para 1200 (apenas em planejamento_previdenciario) porque respostas técnicas de profundidade exigem mais espaço
- Perfis atualmente no repertório profundo:
  - Médico hospitalar e autônomo
  - Magistrado federal
  - Promotor/Procurador
  - Professor universitário
  - Executivo CLT
  - Empresário/PJ
  - Servidor federal de alto escalão
  - Militar das Forças Armadas
  - Professor de educação básica
- Perfis que recebem postura de descoberta (expansão futura da base):
  - Advogados especialistas
  - Dentistas
  - Engenheiros consultores
  - Arquitetos, psicólogos, contadores
  - Carreiras estaduais (PM, BM, servidor estadual/municipal)

## Atualização 2026-04-18 — Logging de uso LLM do agente

- Nova tabela `public.agent_llm_usage` registra cada chamada da Claude API
- Helper em `src/lib/agent-llm-logger.ts` calcula custo automaticamente
- Plugado no route `agente/responder` em padrão fire-and-forget
- Migration `054_agent_llm_usage.sql` criada
- Patch manual pronto em `supabase/manual/` para aplicação em produção
- Migration `054_agent_llm_usage` aplicada em produção em 2026-04-18 13:19:55 -03 no projeto `lrqvvxmgimjlghpwavdb`
- Dashboard de visualização fica como P1 pós-go-live

## Atualização 2026-04-18 — Bug latente nas policies RLS pós-migration 039

Durante investigação da policy da migration 054, foi descoberto que várias migrations posteriores (040, 042, 053 e a 054 original) usam:

`usuarios.id = auth.uid()`

Mas a convenção real do projeto, confirmada em:
- `supabase/migrations/005_usuarios_rls.sql`
- `src/lib/current-usuario.ts`

é:

`usuarios.auth_id = auth.uid()`

Confirmação em produção (projeto `lrqvvxmgimjlghpwavdb`) em 2026-04-18:
- `usuarios.id = auth_id`: 0 de 2 registros
- `usuarios.id <> auth_id`: 2 de 2 registros

Impacto prático:
- Policies nas tabelas `agentes`, `event_triggers` e outras que usam a convenção errada provavelmente retornam resultado vazio para qualquer usuário autenticado
- Rotas que acessam essas tabelas via client autenticado (não service role) estariam retornando listas vazias
- Rotas que usam service role no backend contornam o RLS e funcionam normalmente, mascarando o bug

Decisão: NÃO corrigir agora (pré-go-live). Corrigir após estabilização do piloto, com auditoria completa das policies afetadas e teste de regressão.

### 182. Minuta multi-tenant precisa nascer como template por escritório, não como HTML solto dentro da tela do lead
**Problema:** O go-live do escritório Pagliuca / Lessnau exigia preparar contrato com dados do cliente preenchidos, mas o produto não tinha onde guardar uma minuta padrão por tenant
**Causa:** O PrevLegal já tinha fluxo de contratos financeiros, porém não existia estrutura específica para minuta jurídica parametrizável por escritório
**Correção:** Criar `contract_templates` com `tenant_id`, `tipo`, `corpo_html`, `placeholders_definidos` e gestão própria na dashboard
**Regra pratica:** Quando um fluxo jurídico depende de documento padrão do escritório, o template precisa ser entidade de domínio do tenant. Guardar HTML ad hoc no front só empurra o problema para depois

### 183. Geração de PDF em Vercel fica mais segura com `puppeteer-core` + `@sparticuz/chromium`
**Problema:** O motor de minuta precisava gerar PDF no backend sem depender de Chrome do host
**Causa:** Em serverless, `puppeteer` completo costuma ser pesado e frágil; além disso, o runtime precisa de binário compatível com o ambiente do deploy
**Correção:** Adotar `puppeteer-core` com `@sparticuz/chromium`, gerando o PDF a partir do HTML renderizado do template
**Regra pratica:** Para PDF serverless no ecossistema Vercel, comece com `puppeteer-core` + Chromium empacotado. É o caminho MVP mais previsível antes de sofisticar

### 184. Minuta preparada precisa deixar rastro duplo: documento e evento de timeline
**Problema:** Gerar o PDF sem registrar contexto operacional deixaria o arquivo solto e dificultaria auditoria do atendimento
**Causa:** O documento por si só não conta quando foi preparado, por quem e em qual etapa do fluxo
**Correção:** Ao preparar a minuta, salvar o PDF no storage, registrar em `lead_documentos` e criar evento em `portal_timeline_events`
**Regra pratica:** Em operação jurídica assistida, artefato sem timeline vira anexo órfão. Documento e evento precisam nascer juntos

### 165. Automação por janela horária precisa usar o relógio operacional do produto, não o relógio do servidor
**Problema:** O lead respondia a campanha, a mensagem entrava na thread, mas o agente não continuava a conversa
**Causa:** `/api/agente/responder` comparava `janela_inicio/janela_fim` com `new Date().toTimeString()`, o que usa a hora local do host e bloqueava o agente com `403 Fora do horário de atendimento` mesmo durante o horário comercial do escritório
**Correção:** Calcular a janela do agente com `America/Sao_Paulo` como fuso operacional padrão
**Regra pratica:** Toda automação dependente de horário no PrevLegal deve comparar contra o relógio operacional do produto, nunca contra a hora crua do servidor

### 178. Em agente de planejamento premium, pergunta técnica difícil não deve disparar handoff automático
**Problema:** O playbook inicial do Ana ainda tratava complexidade técnica como gatilho de escalada, o que enfraquecia justamente o diferencial do escritório de planejamento previdenciário
**Causa:** O profile original de planejamento foi escrito com foco em triagem consultiva segura, não em condução quase completa do fluxo até pré-fechamento
**Correção:** Reescrever `gatilhos_escalada` para disparar handoff por etapa do processo, e não por dificuldade da pergunta: análise individual de documentos/CNIS, cálculo formal, aceite do diagnóstico pago, pedido explícito de humano ou momento de proposta/contrato/assinatura
**Regra pratica:** Em playbook premium, dificuldade técnica geral é trabalho do agente; handoff deve acontecer quando a conversa cruza o limite operacional da etapa

### 179. Base de conhecimento técnica precisa entrar no runtime por perfil operacional, não como prompt global
**Problema:** O agente Ana precisava ficar muito mais forte tecnicamente, mas injetar esse conhecimento de forma global ameaçaria custo, foco e comportamento da Jessica
**Causa:** O runtime anterior só usava `prompt_base` + blocos fixos; não existia distinção entre conhecimento técnico denso de planejamento e conhecimento operacional de benefícios
**Correção:** Criar loader dedicado para `docs/agent-knowledge/planejamento-previdenciario/*.md`, com cache por assinatura de `mtime` e injeção condicional apenas quando `perfil_operacao = planejamento_previdenciario`
**Regra pratica:** Conhecimento longo deve ser plugado de forma contextual por playbook. O que fortalece um agente premium pode só atrapalhar outro fluxo mais curto e operacional

### 180. Anti-flood de agente precisa agrupar mensagens antes de chamar o modelo, não só ignorar excesso
**Problema:** Sem proteção, leads que mandam várias mensagens em sequência podem gerar chamadas redundantes, respostas sobrepostas e custo desnecessário
**Causa:** O auto-responder era acionado a cada inbound e o runtime respondia imediatamente à última mensagem disponível
**Correção:** Introduzir coalescência de sequência rápida e janela anti-flood no runtime: se vierem várias mensagens próximas, o sistema espera um pequeno silêncio, reprocessa a última e só responde uma vez; se houver flood em 60 segundos, registra log estruturado
**Regra pratica:** Em WhatsApp, “muitas mensagens” quase sempre representam um mesmo turno humano fragmentado. O sistema deve juntar antes de responder para parecer mais natural e gastar menos

### 181. Memória curta persistida da conversa é melhor que ampliar indefinidamente o histórico bruto
**Problema:** Conversas longas de agente premium começam a dar sinais de reinício, custo maior e menor precisão quando o modelo precisa reler muitos turnos brutos
**Causa:** O runtime dependia apenas do recorte recente de mensagens, sem guardar um resumo cumulativo do caso
**Correção:** Adicionar `conversas.resumo_operacional`, `resumo_operacional_at` e `resumo_operacional_mensagens`, e refrescar esse resumo a cada lote de mensagens para reidratar o contexto nas próximas chamadas
**Regra pratica:** Para agente operacional de longo ciclo, histórico bruto recente + resumo persistido é mais estável e barato do que tentar carregar tudo toda vez

### 173. Campanha por familiar não pode depender só de `telefone_enriquecido`
**Problema:** O disparo por `filho` / `irmao` foi corrigido inicialmente usando o contato alternativo genérico do lead, mas o cadastro do lead não mostrava esses familiares como dados explícitos, o que deixava a operação dependente de inferência em vez de estrutura confiável
**Causa:** O importador enriquecido capturava cônjuge, filho e irmão, porém guardava esses dados principalmente em `anotacao` e em um slot genérico (`telefone_enriquecido`), sem campos específicos no lead
**Correção:** Criar campos estruturados em `leads` para nome/celular/telefone de `conjuge`, `filho` e `irmao`, preencher isso na importação, exibir na UI do lead e fazer o disparo e o lookup de webhook usarem esses campos
**Regra pratica:** Quando um fluxo operacional depende de um tipo específico de contato, esse dado precisa existir como estrutura explícita no modelo. Contexto textual e campos genéricos ajudam, mas não devem ser a base do disparo em produção

### 174. Quando o agente conclui o handoff para o humano, a conversa precisa sair do box de agente
**Problema:** No fluxo da Jessica, o agente já explicava a readequação e confirmava que a Dra. Jessica continuaria o atendimento, mas a conversa permanecia em `agente`
**Causa:** O runtime tratava a resposta final do agente apenas como mais uma continuidade da automação, sem refletir na `conversas.status` que o próximo responsável operacional agora era o humano
**Correção:** Detectar a etapa de confirmação do handoff em `beneficios_previdenciarios` e, quando o lead confirma que a Dra. Jessica pode seguir no mesmo número, mover a conversa para `aguardando_cliente`
**Regra pratica:** Se o agente já entregou a conversa para o humano, a inbox precisa mostrar isso imediatamente. Caso contrário, a thread fica no box errado e a fila perde valor operacional

### 175. Excluir lista precisa considerar campanhas vinculadas antes de tentar apagar o registro
**Problema:** Ao tentar excluir uma lista de teste, o produto retornava erro de constraint porque ainda existiam campanhas apontando para `listas.id`, mesmo quando a lista já estava vazia
**Causa:** A rota de exclusão removia `leads` e depois tentava apagar `listas`, mas `campanhas.lista_id` continua `NOT NULL` com `ON DELETE RESTRICT`, então qualquer campanha antiga travava o processo
**Correção:** Na exclusão de lista, consultar campanhas vinculadas e:
- bloquear se houver campanha `ativa` ou `pausada`
- apagar primeiro `disparos` e `campanhas` quando elas estiverem em `rascunho` ou `encerrada`
- só então remover `leads` e `listas`
**Regra pratica:** Lista operacional não vive sozinha: se campanhas ainda referenciam aquele conjunto, a exclusão precisa limpar ou bloquear conscientemente. Deixar o banco “surpreender” o operador com FK é UX ruim de backoffice

### 176. Para disparo de campanha, telefone fixo deve ser cadastro, não fallback de envio
**Problema:** Depois de estruturar cônjuge, filho e irmão no lead, ainda restava uma ambiguidade operacional: o dispatch podia cair em `telefone` fixo quando não encontrava `celular`
**Causa:** O runtime de campanhas ainda aceitava fallback para `telefone` em contatos familiares e tratava algumas origens `TELEFONE*` como se fossem WhatsApp-capable
**Correção:** Endurecer o dispatch para usar apenas contatos com origem `CELULAR/WHATSAPP/MOBILE`; `telefone` e `*_telefone` permanecem no cadastro como referência, mas não entram mais como fallback automático de envio
**Regra pratica:** Em operação de WhatsApp, fixo é contexto e cadastro. O número de disparo precisa ser móvel/WhatsApp explícito, senão o sistema parece “inteligente”, mas toma decisão errada no momento mais sensível

### 177. Modal do card do Kanban não pode depender da mesma visibilidade da inbox humana
**Problema:** Ao clicar no ícone de conversa no card do lead, alguns contatos mostravam "Nenhuma conversa encontrada" mesmo já tendo histórico, e outros abriam só pedaços da thread
**Causa:** O modal tentava se apoiar na lista e no detalhe da inbox (`/api/conversas` e `/api/conversas/[id]`), que obedecem à visibilidade operacional da fila humana. Isso é diferente da necessidade do Kanban, que precisa mostrar o histórico do próprio lead
**Correção:** Fazer o modal partir de `/api/leads/[id]`, resolver a conversa principal por `lead_id` com fallback por telefone e devolver também o histórico de WhatsApp por `lead_id`/telefone dentro do próprio escopo do lead
**Regra pratica:** Kanban e inbox servem propósitos diferentes. Se a UI está ancorada no lead, o histórico deve ser resolvido pelo lead, não pela fila operacional da inbox

### 169. Depois que existem tenants pagantes, evolução de playbook precisa ser isolada por tenant e rollout, não lançada como comportamento global
**Problema:** `beneficios_previdenciarios` e `planejamento_previdenciario` passaram a evoluir em paralelo, mas qualquer bug novo ainda poderia atingir escritórios já ativos porque o produto não tinha uma camada formal de isolamento/versionamento para essas frentes
**Causa:** O PrevLegal vinha sendo tratado como um único comportamento-base em produção, mesmo depois de entrar na fase de clientes pagantes e playbooks operacionais distintos
**Correção:** Formalizar a estratégia canônica de:
- `core único`
- `playbooks por perfil operacional`
- `tenant como unidade de rollout`
- `flags/versionamento por tenant`
e decidir que:
- Jessica permanece como tenant de `beneficios_previdenciarios`
- o escritório de planejamento deve nascer em tenant próprio
- novas evoluções devem entrar primeiro em tenant piloto antes de rollout mais amplo
**Regra pratica:** Quando o produto já tem pagantes, estabilidade deixa de ser só “qualidade de código” e vira arquitetura. Mudança nova precisa saber exatamente qual tenant pode ou não ser impactado.

### 166. Campanha com “agente padrão do escritório” deve persistir o agente resolvido
**Problema:** Campanhas criadas com “Usar agente padrão do escritório” podiam nascer com `agente_id = null`, o que enfraquecia a continuidade operacional quando o lead respondia depois
**Causa:** A UI tratava o agente padrão como fallback visual, mas o backend gravava `null` quando nenhum agente explícito vinha no payload
**Correção:** Resolver o agente padrão no backend durante a criação da campanha e persistir esse `agente_id`; além disso, o auto-responder passou a consultar a última `campanha_mensagens` do lead quando `lead.campanha_id` estiver vazio
**Regra pratica:** Quando o produto oferece um “padrão do escritório”, esse padrão precisa virar dado persistido, não só convenção implícita da interface

### 167. Falha de crédito do provedor de IA não pode parecer bug silencioso do fluxo
**Problema:** O lead respondia, a mensagem entrava na thread e a conversa permanecia em modo `agente`, mas nenhuma continuação aparecia
**Causa:** A rota `/api/agente/responder` estava chegando corretamente ao provedor, porém a Anthropic API retornava erro de saldo insuficiente (`credit balance is too low`)
**Correção:** Tratar esse erro de forma operacional: rebaixar a conversa para `humano`, gerar notificação explícita para a equipe e deixar claro que o bloqueio é do provedor, não da thread ou do webhook
**Regra pratica:** Quando um provedor externo falhar por crédito, quota ou billing, o produto precisa degradar para atendimento humano com sinalização clara. Nunca deixar o operador achando que “o sistema travou”

### 168. Continuidade de agente precisa respeitar o motivo real do contato outbound
**Problema:** O lead respondia pedindo explicação sobre a revisão, mas o agente continuava com perguntas genéricas como se ainda estivesse descobrindo se havia algum problema no benefício
**Causa:** A continuidade do agente ainda carregava uma lógica ampla de triagem previdenciária, sem assumir que a base da Jessica já veio mapeada para revisão/readequação
**Correção:** Reforçar no runtime e nos templates seedados que, em `beneficios_previdenciarios`, o agente deve partir de uma possibilidade já identificada, explicar o essencial de forma curta e preparar o handoff para a Dra. Jessica; em `planejamento_previdenciario`, a esteira pode seguir até proposta, contrato e preparação de assinatura antes do handoff humano
**Regra pratica:** Em operação outbound, o agente deve continuar do estágio real da conversa. Nunca reiniciar a triagem como se o caso ainda estivesse no zero

### 170. Resposta automática do agente precisa reconciliar o `fromMe` do provider para não reaparecer como mensagem humana
**Problema:** Depois que o agente respondia automaticamente, o mesmo texto podia aparecer na thread como `Agente` e depois como `Humano`
**Causa:** A resposta automática do agente ficava registrada no próprio `mensagens_inbound` original como `resposta_agente`, mas o webhook `fromMe` da Z-API não tinha um identificador externo salvo para reconhecer que aquele outbound já pertencia à automação
**Correção:** Quando o envio automático do agente retornar `externalMessageId`, gravar esse valor em `mensagens_inbound.twilio_sid` no mesmo registro que guarda a resposta do agente; assim o webhook `fromMe` consegue deduplicar o evento e não inserir uma réplica manual
**Regra pratica:** Sempre que uma automação depender de espelhamento posterior do provider, o id externo do envio precisa ser persistido na mesma trilha operacional que representa aquela mensagem

### 171. Em benefícios, um "sim" curto do lead não deve fazer o agente reiniciar a conversa
**Problema:** Depois de o lead responder com algo como `Tenho sim` ou `pode explicar`, o agente podia se reapresentar, repetir a abertura da campanha ou voltar a perguntar se havia interesse
**Causa:** Mesmo com o contexto de revisão/readequação já identificado, o prompt ainda deixava espaço demais para a IA reabrir a conversa como se fosse uma nova etapa de convencimento
**Correção:** Endurecer a camada de continuidade para obrigar que respostas curtas de aceite levem a conversa direto para a próxima etapa: explicação breve do cenário identificado + próximo passo operacional com a equipe ou Dra. Jessica
**Regra pratica:** Em outbound previdenciário, confirmações curtas do lead devem mover a conversa adiante. Não apresentar de novo, não perguntar interesse de novo, não reescrever a primeira mensagem da campanha

### 172. Histórico de conversa para agente precisa ser montado pelas mensagens mais recentes, não pelas mais antigas
**Problema:** Mesmo depois de ajustes de prompt, o agente ainda podia responder de forma estranha, parecendo reagir a uma saudação antiga da conversa em vez da última fala do lead
**Causa:** `/api/agente/responder` buscava `mensagens_inbound` com `order(created_at asc).limit(10)`, o que na prática carregava as 10 mensagens mais antigas do lead, não as 10 mais recentes
**Correção:** Buscar o histórico em `created_at desc`, limitar as 10 mais recentes e reverter em memória para remontar a ordem cronológica antes de enviar ao modelo; além disso, injetar a última fala do lead e a intenção imediata como diretiva obrigatória no system prompt
**Regra pratica:** Em agentes conversacionais, "último turno" não pode ser inferido por sorte. O runtime precisa carregar o recorte mais recente do histórico e explicitar qual mensagem deve ser respondida agora

### 160. Em operação previdenciária enriquecida, “telefone” sozinho não basta; campanha precisa saber quem é o contato de abordagem
**Problema:** Depois da importação da base enriquecida, o lead já mostrava o melhor número de abordagem e os familiares detectados, mas a campanha ainda não tinha estrutura para distinguir se o disparo deveria ir para titular, cônjuge, filho ou irmão
**Causa:** O modelo legado de `leads` e `campanhas` guardava apenas números, sem um tipo operacional do contato escolhido
**Correção:** Criar colunas estruturadas para:
- `leads.contato_abordagem_tipo`
- `leads.contato_abordagem_origem`
- `leads.contato_alternativo_tipo`
- `leads.contato_alternativo_origem`
- `campanhas.contato_alvo_tipo`
e usar isso para:
- exibir o contexto certo no cadastro
- editar manualmente o tipo/origem do contato
- filtrar campanhas por relação familiar
- ajustar o template inicial quando o contato não é o titular
**Regra pratica:** Quando a operação depende de familiares, o sistema precisa modelar o parentesco como dado operacional e não escondê-lo em texto livre. Só assim campanha, abordagem e supervisão conseguem trabalhar sem ambiguidade.

### 164. Em captação de benefícios, o primeiro contato precisa vender atenção, não despejar a tese inteira
**Problema:** O template padrão de `benefícios previdenciários` ainda soava genérico demais para o caso real da Jessica e podia cair no erro oposto: explicar demais logo na primeira mensagem
**Causa:** A operação manual atual já parte de uma base mapeada para possível revisão/readequação, mas o produto ainda tratava o primeiro toque como triagem previdenciária ampla; além disso, os prompts não explicitavam como continuar a conversa sem reiniciar contexto quando vários agentes da esteira estivessem ativos
**Correção:** Reescrever a copy de campanha e os prompts seedados de benefícios para:
- primeiro toque curto, específico e crível
- nada de valores, retroativos ou tese jurídica longa na abertura
- aquecimento breve até a continuidade com a advogada responsável
- instrução operacional clara para que qualquer agente use o histórico da conversa como fonte de verdade e continue o atendimento sem parecer que está começando do zero
**Regra pratica:** Em outbound previdenciário, a primeira mensagem deve conquistar abertura para explicar. A tese, a prova e o aprofundamento entram depois que o lead demonstra interesse.

### 162. Em campanha outbound, `tipo do agente` sozinho não basta; o template precisa conhecer o perfil operacional do playbook
**Problema:** Mesmo com o filtro por `titular / conjuge / filho / irmao` funcionando, a mensagem sugerida da campanha ainda podia falar como se fosse `inbound`, especialmente quando o escritório usava o modelo padrão de benefícios previdenciários
**Causa:** A campanha escolhia o template apenas por `tipo` do agente (`triagem`, `reativacao`, etc.), sem saber se o agente pertencia ao playbook de `benefícios previdenciários` ou `planejamento previdenciário`
**Correção:** Estruturar `agentes.perfil_operacao`, gravar isso no seed e passar a gerar o template da campanha com base em:
- `perfil_operacao`
- `tipo`
- `contato_alvo_tipo`
além de usar o agente padrão do escritório como fallback real quando nenhum agente específico for selecionado
**Regra pratica:** Em playbooks operacionais diferentes, o mesmo `tipo` de agente pode exigir mensagens iniciais completamente distintas. Sempre modelar explicitamente o perfil operacional antes de reutilizar template de campanha.

### 163. Em operação outbound, o template precisa refletir a etapa do funil, não só o público
**Problema:** Mesmo depois de separar `titular` de `conjuge/filho/irmao`, o escritório ainda corria o risco de usar uma mensagem boa para triagem em uma campanha que, na prática, era de reativação, confirmação ou etapa documental
**Causa:** Sem uma matriz clara por etapa, a copy padrão ficava genérica demais para um produto que pretende funcionar “pronto para uso”
**Correção:** A fundação de templates passou a separar, por perfil operacional:
- `triagem`
- `reativacao`
- `followup_comercial`
- `documental`
- `confirmacao_agenda`
e cruzar isso com `titular` ou familiar
**Regra pratica:** Quando o produto oferece templates operacionais prontos, eles precisam acompanhar o estágio real da conversa. Template bom de triagem não é automaticamente bom de reativação, e vice-versa.

### 161. Nem todo dado detectado na planilha precisa entrar no schema imediatamente
**Problema:** A base enriquecida passou a trazer `email`, mas o schema operacional de `leads` ainda não suporta esse campo
**Causa:** Adicionar `email` em `leads` perto do go-live abriria uma mudança estrutural mais ampla do que o fluxo principal de WhatsApp exigia naquele momento
**Correção:** O importador agora:
- detecta a presença de email
- informa isso claramente no resumo da importação
- segue normalmente sem falhar nem persistir `email`
**Regra pratica:** Se um dado novo ainda não é necessário para o fluxo principal validado, prefira registrá-lo como evolução planejada em vez de expandir o schema no reflexo. A mudança estrutural entra quando já existe um caso de uso fechado, como a futura frente de `Resend` para mail marketing/newsletter.

### 159. Base enriquecida pode parecer “rica em WhatsApp”, mas o produto precisa distinguir contato do titular de contato relacionado
**Problema:** Após importar a base enriquecida da Jessica, o operador esperava ver um `CELULAR` principal do titular, mas o cadastro mostrava telefone fixo do beneficiário e não deixava claro de onde vinham os contatos melhores da família
**Causa:** A CSV `Enriquecimento_COMPLETO-LISTA-RJ.csv` traz `TELEFONE1/2` do titular e celulares de cônjuge, filho e irmão, mas não traz uma coluna numérica `CELULAR` do próprio titular; sem explicitar isso na UI, o sistema parecia “escolher o telefone errado”
**Correção:** Ajustar o importador para:
- priorizar contato direto com melhor sinal de WhatsApp
- depois priorizar celulares de familiares como canal de abordagem
- só então cair para telefone direto do titular
- registrar no lead o `Contato de abordagem`, `Contato alternativo` e o `Contexto operacional` com origem e parentes detectados
**Regra pratica:** Em operação previdenciária enriquecida, o melhor canal de abordagem nem sempre é o do titular. O sistema precisa mostrar claramente quando está falando com um familiar e preservar um contato alternativo para o operador não agir no escuro.

### 157. Em importador com cabeçalho variável, matcher permissivo demais pode transformar linha de dado em linha de schema
**Problema:** Uma planilha enriquecida com `CPF`, `NOME` e múltiplos campos familiares foi importada com só 6 leads de 78, enquanto o produto reportava dezenas de “duplicatas da planilha”
**Causa:** O detector de cabeçalho aceitava matches por substring curtos demais (`tipo`, `rma`, `mail`) e acabou elegendo uma linha de dado como se fosse o cabeçalho real; isso embaralhava o field map, gerava `nb` sintético errado e inflava falsamente a deduplicação em memória
**Correção:** Endurecer `src/lib/import-schema.ts` para:
- priorizar match exato
- só aceitar `includes` em aliases compostos
- exigir fronteira de palavra para aliases curtos
**Regra pratica:** Em planilhas heterogêneas, detecção automática de schema só é segura quando aliases curtos respeitam fronteiras; substring solta em linha de dado é receita para importação silenciosamente errada

### 151. Em webhook de mensageria, o critico nao e so receber o payload, e conseguir reutilizar a conversa operacional ja existente
**Problema:** O inbound da Z-API ja chegava ao sistema, mas a mensagem ainda nao aparecia na plataforma
**Causa:** Mesmo com o webhook entregue, o fluxo podia falhar ao nao casar corretamente o telefone mascarado com o lead/conversa humanos ja existentes, deixando `lead_id` e `conversa_id` nulos no meio da trilha
**Correção:** Endurecer o matcher para telefone mascarado e, ao encontrar conversa preexistente, preencher tambem `lead_id` e `whatsapp_number_id`
**Regra pratica:** Em inbox operacional, o sucesso do inbound nao e apenas “salvar o evento recebido”; o objetivo real e reencaixar a mensagem na conversa certa, com o lead certo, sem criar ruptura visivel na operacao

### 152. Admin do escritorio nao deve herdar visao total da inbox como padrão operacional
**Problema:** No smoke test com convite de novo usuário, um segundo admin do mesmo escritório passou a enxergar conversas da carteira principal logo no primeiro acesso
**Causa:** As rotas da inbox usavam bypass automático por `context.isAdmin`, então qualquer admin do tenant via toda a fila humana, independentemente de dono do lead ou de ter assumido o atendimento
**Correção:** Criar `src/lib/inbox-visibility.ts` e aplicar a mesma regra nas rotas de listagem, detalhe, operação e resposta humana:
- pode ver a conversa quem é `responsavel_id` do lead
- ou quem está em `conversas.assumido_por`
- admin deixa de ser bypass implícito na inbox
**Regra pratica:** Em operação multiusuário, inbox deve ser pessoal por padrão. Visão total de equipe é ferramenta de supervisão e precisa aparecer como modo explícito, não como atalho invisível do perfil admin

### 153. Cadastro manual não deve exigir CPF no primeiro contato
**Problema:** Ao criar um lead manual para campanha ou teste operacional, o modal permitia deixar o CPF em branco, mas o banco ainda falhava com `null value in column "cpf" of relation "leads" violates not-null constraint`
**Causa:** O produto já se comportava como se CPF fosse opcional, mas o schema legado mantinha `leads.cpf` como obrigatório
**Correção:** Tornar `leads.cpf` anulável via migration `046_leads_cpf_optional.sql`, alinhar tipagem e explicitar no modal que CPF é opcional
**Regra pratica:** No PrevLegal, dados sensíveis como CPF não devem ser exigidos antes da hora. No primeiro contato, basta o mínimo operacional para iniciar a relação; documentos mais sensíveis entram depois, quando houver contexto e confiança

### 154. Template de agente deve ser descrito pelo tipo de operação, não pelo nome do cliente que inspirou o playbook
**Problema:** A UX de templates de agentes expunha rótulos como `Modelo Jessica` e `Modelo Ana`, o que não faz sentido para outros escritórios e ainda escondia a natureza real da operação
**Causa:** O seed nasceu de casos reais de cliente e o nome da fonte acabou virando rótulo de produto
**Correção:** Trocar a apresentação para nomes operacionais explícitos, como `Captação de Benefícios Previdenciários` e `Captação de Planejamento Previdenciário`, mantendo o treinamento específico por perfil no backend
**Regra pratica:** Em produto multi-tenant, o cliente precisa escolher um modelo de operação, não herdar na UX o nome de quem serviu de referência interna

### 155. Responder no portal deve encerrar a pendência visível daquela thread
**Problema:** O badge da inbox podia continuar mostrando pendência mesmo depois que o escritório já respondeu no portal
**Causa:** A UI zerava o contador localmente, mas o banco ainda mantinha mensagens do cliente como `lida = false`, então `/api/pendencias` recalculava o badge com o valor antigo
**Correção:** Ao responder em `POST /api/portal/responder`, marcar como lidas as mensagens pendentes do cliente para aquele `lead_id` antes de inserir a resposta do escritório
**Regra pratica:** Quando o escritório responde uma thread do portal, o sistema deve considerar que aquela pendência foi tratada, não exigir um segundo gesto do operador só para limpar badge

### 156. Deep link de inbox só funciona de verdade quando thread, notificação e redirecionamento falam a mesma língua
**Problema:** Notificações apareciam no sino, mas ao abrir a `Caixa de Entrada` a thread não vinha selecionada; o mesmo ruído aparecia em ações como `Abrir conversa` e `Iniciar conversa` a partir do lead
**Causa:** Cada ponto do produto apontava para a inbox com parâmetros diferentes ou insuficientes, e a própria tela nem sempre reconciliava a seleção com o estado recém-carregado
**Correção:** Unificar links operacionais com `conversaId`, `telefone`, `tab` e `leadId`, atualizar a inbox para reconciliar conversa/thread selecionada após refresh e fazer notificações/webhooks/atalhos apontarem para o mesmo contrato
**Regra pratica:** Em superfícies operacionais, “ir para a inbox” não basta. O sistema precisa saber qual thread abrir e manter esse foco após recarregar os dados

### 157. Transferência de atendimento precisa mover carteira e visibilidade, não só gravar um log
**Problema:** Ao transferir um lead, a conversa podia sair do usuário antigo mas não aparecer corretamente para o novo responsável
**Causa:** O handoff registrava a transferência operacional, mas a carteira do lead (`leads.responsavel_id`) podia continuar desatualizada em relação à conversa humana
**Correção:** No handoff interno, além do histórico e da thread, atualizar também `leads.responsavel_id` para o novo usuário
**Regra pratica:** Transferir atendimento no PrevLegal deve mover o dono operacional do caso. Se a carteira e a thread divergem, a inbox multiusuário fica incoerente

### 158. Campanha precisa nascer de entidades reais do escritório, não de selects estáticos
**Problema:** Na campanha, não era possível escolher corretamente agente, canal ou listas manuais do escritório, e a mensagem inicial ficava solta do contexto do agente selecionado
**Causa:** A tela ainda refletia uma fundação legada com foco em Twilio fixo e sem carregar agentes/canais/listas reais do tenant
**Correção:** Fazer `/campanhas` carregar listas com `include_system=1`, agentes reais do tenant, canais reais via `/api/whatsapp-numbers` e sugerir um template inicial coerente com o tipo do agente, mantendo edição livre
**Regra pratica:** Se a campanha é uma ferramenta operacional do escritório, ela precisa enxergar os recursos reais daquele tenant e já nascer com uma mensagem inicial contextualizada

### 159. Deep link de inbox não pode sequestrar a aba ativa depois que o operador assume o controle da tela
**Problema:** Após transferências, notificações ou ações como `Abrir conversa` / `Iniciar conversa`, a inbox podia ficar visualmente incoerente: abas deixavam de responder, a thread certa não abria de forma estável e a página parecia “presa” em um estado antigo
**Causa:** A tela de `/caixa-de-entrada` reaplicava o deep link (`conversaId`, `telefone`, `leadId`) a cada refresh de dados, mesmo depois que o usuário já tinha clicado em outra aba ou mudado o foco operacional
**Correção:** Tratar deep link como hidratação pontual, com controle de “já processado”, e limpar parâmetros concorrentes ao alternar entre inbox humana e portal
**Regra pratica:** Link profundo deve servir para abrir o contexto certo uma vez. Depois disso, quem manda na navegação é o operador, não a query string antiga

### 160. Contador de lista não pode mentir sobre elegibilidade de campanha
**Problema:** Na criação de campanha, a lista técnica `Cadastro manual` aparecia com `0 com WhatsApp` mesmo já havendo leads manuais aptos para disparo
**Causa:** `/api/listas` ainda entregava `com_whatsapp`, `sem_whatsapp` e `nao_verificado` com base em colunas-resumo de `listas`, que podem ficar defasadas em relação ao estado real dos leads
**Correção:** Recalcular os contadores diretamente da tabela `leads` no momento da leitura da lista
**Regra pratica:** Se uma ação operacional depende de elegibilidade real do lead, o contador mostrado na UI deve vir do dado vivo que alimenta aquela ação, não de um snapshot auxiliar suscetível a drift

### 147. Webhook de provider nao pode assumir JSON puro
**Problema:** O inbound da Z-API seguia falhando mesmo com rota publicada, parser ampliado e webhook salvo corretamente
**Causa:** A variante `web / multi-device` pode enviar o corpo do webhook como `application/x-www-form-urlencoded`, texto cru ou JSON serializado dentro de campos string; assumir `request.json()` fazia o body virar `{}` e o payload era descartado
**Correção:** Trocar a leitura do body para `request.text()`, detectar `content-type`, suportar `form-urlencoded`, JSON cru, query params e parse recursivo de strings serializadas em JSON
**Regra pratica:** Em integrações com providers de mensageria, o backend deve tolerar pelo menos:
- `application/json`
- `application/x-www-form-urlencoded`
- texto cru ou campos serializados

### 148. Webhook de provider nao pode assumir `POST` como metodo unico
**Problema:** Mesmo com parser mais tolerante, o inbound da Z-API ainda podia falhar silenciosamente na variante `web`
**Causa:** Alguns providers ou painéis de webhook podem disparar eventos por `GET`, mantendo os dados em query string ou shape simplificado
**Correção:** Permitir que `GET /api/webhooks/zapi?event=on-receive` reutilize o mesmo fluxo de processamento do `POST`
**Regra pratica:** Em integrações externas sujeitas a variação de painel/proxy, o handler de webhook deve ser tolerante a `GET` e `POST` sempre que isso não abrir risco de segurança desnecessário

### 149. Quando uma integração já funcionava em outro produto, copiar a topologia pode ser mais eficaz do que insistir no mesmo alvo
**Problema:** O inbound da Z-API continuou instável no PrevLegal mesmo após várias correções de parser e compatibilidade de payload
**Causa:** O Orbit, que já funcionava com a Z-API, não recebia os callbacks em uma app route do frontend; ele usava uma Supabase Edge Function pública dedicada
**Correção:** Criar e deployar `supabase/functions/zapi-webhook/index.ts` no PrevLegal como relay público no mesmo padrão arquitetural do Orbit
**Regra pratica:** Quando um provider é sensível ao alvo do webhook, vale reproduzir primeiro a arquitetura já validada em produção antes de continuar refinando apenas o parser

### 150. Match de telefone para inbound não pode depender de dígitos contínuos quando o dado salvo está mascarado
**Problema:** O webhook inbound da Z-API já estava chegando e gravando em `mensagens_inbound`, mas `lead_id` e `conversa_id` seguiam nulos
**Causa:** O matcher buscava padrões como `5541992361868` ou `41992361868`, mas o telefone salvo estava mascarado como `(41) 99236-1868`; esses blocos não aparecem de forma contínua no texto, então a busca não retornava o lead nem a conversa
**Correção:** Passar a gerar padrões que sobrevivem à máscara (`99236`, `1868`, etc.), buscar por esses fragmentos e normalizar em memória antes de decidir o vínculo
**Regra pratica:** Em números de telefone, a busca operacional deve assumir máscara, prefixo de país e variações humanas como padrão do sistema, não como exceção

### 146. Busca global não pode depender de acento ou formatação perfeita
**Problema:** Na busca global (`Ctrl+K`), digitar `Caua` não encontrava `Cauã`, e números formatados de forma diferente também podiam escapar
**Causa:** A rota `/api/busca` usava `ilike` direto no banco, enquanto a busca de leads já fazia normalização de acentos e dígitos em memória
**Correção:** Criar uma fundação compartilhada de normalização (`src/lib/search-normalization.ts`) e aplicar a mesma lógica na busca global, unificando comparação por texto sem acento e por dígitos
**Regra pratica:** Em fluxos de busca do PrevLegal, o sistema deve tratar variações humanas como comportamento esperado. Nome com acento, telefone mascarado e pequenas diferenças de entrada não podem ser barreiras de uso

### 36. Documento IA não pode contornar o contrato do módulo de documentos
**Problema:** Ao gerar `Petição Inicial`, `Procuração` ou `Requerimento INSS`, o backend falhava com `null value in column "arquivo_url" of relation "lead_documentos" violates not-null constraint`
**Causa:** A geração por IA salvava apenas `conteudo_texto` em `lead_documentos`, mas a tabela foi desenhada para sempre ter arquivo persistido e `arquivo_url`
**Correção:** Fazer a geração IA subir um `.txt` real no bucket `lead-documentos`, gerar URL assinada e só então inserir o registro completo com metadados de arquivo, `tenant_id` e `created_by`
**Regra pratica:** No PrevLegal, features beta não devem criar um “subtipo informal” de documento fora do contrato principal de `lead_documentos`; se entra na mesma tabela, precisa obedecer o mesmo padrão de storage/metadados

### 37. Template de automação precisa nascer editável e explicável
**Problema:** O seed dos gatilhos funcionava, mas a operação ficava sem botão de editar e com pouca clareza sobre o que cada template realmente faria
**Causa:** O foco inicial foi colocar a Fase E para rodar no banco e no orquestrador, deixando a superfície de ajuste ainda crua
**Correção:** Reaproveitar a mesma UI de gatilhos para permitir edição dos templates padrão e adicionar leitura humana do disparo, da ação e do motivo operacional de cada status
**Regra pratica:** Template no PrevLegal deve ser “atalho configurável”, não “preset travado”. Sempre expor:
- quando dispara
- o que executa
- e um resumo em linguagem operacional

### 38. Reativação por status `lost` não pode herdar a regra antiga de stop por `lost`
**Problema:** O template novo `lost -> follow-up/reativação` chegava a criar `followup_runs`, mas o worker ainda carregava a regra antiga que parava runs quando o lead estivesse `lost`
**Causa:** O motor de follow-up foi criado antes da Fase E de gatilhos por status. Na lógica antiga, `lost` significava encerrar tudo; na nova lógica, `lost` pode ser exatamente o gatilho para reativar
**Correção:** Remover `lost` das stop conditions automáticas do worker e manter stop automático apenas para `converted`
**Regra pratica:** Quando um status passa a virar gatilho de automação, ele não pode continuar tratado globalmente como motivo obrigatório de parada no worker

### 39. Teste de automação precisa ter confirmação visual no detalhe do lead
**Problema:** O operador pode mudar o status do lead e não perceber que o `followup_run` foi criado, concluindo erroneamente que a automação falhou
**Causa:** O componente `FollowupLead` buscava dados apenas no mount e não se atualizava após mudança de status na mesma tela
**Correção:** Adicionar atualização periódica, refresh ao voltar foco para a aba e botão explícito de atualizar
**Regra pratica:** Toda automação testável no PrevLegal deve ter algum feedback visível de curto prazo na própria tela operacional, sem depender de reload manual

### 40. Validação de follow-up não deve depender exclusivamente do cron
**Problema:** Mesmo com a run criada corretamente, a equipe ainda ficava bloqueada para validar o disparo do próximo passo se o cron não estivesse imediatamente acessível ou se a regra estivesse com delay longo
**Causa:** A engine tinha worker e cron, mas não havia uma ação operacional controlada para executar o passo atual sob demanda
**Correção:** Adicionar ação manual `executar_agora` na run do lead, reaproveitando a mesma engine de envio e registrando `step_disparado` ou `step_falhou` em `followup_events`
**Regra pratica:** Em fluxos automatizados críticos, além do cron, vale ter um caminho manual autenticado para validação e suporte operacional, desde que ele use a mesma lógica do runtime real

### 41. Evento de falha precisa mostrar o motivo, não só o tipo
**Problema:** A UI do follow-up mostrava apenas `Envio falhou`, o que ainda obrigava investigação técnica para descobrir se o problema era telefone ausente, canal desconectado ou erro externo
**Causa:** O backend já gravava `metadata.erro` em `followup_events`, mas o endpoint do lead não retornava esse campo e o componente não o renderizava
**Correção:** Expor `metadata` no `GET /api/leads/[id]/followup` e mostrar o motivo logo abaixo do evento no histórico
**Regra pratica:** Quando o sistema já conhece a causa da falha, a UI operacional deve exibi-la no próprio contexto da execução

### 42. Importador não pode ficar preso à ordem fixa das colunas quando a fonte já traz cabeçalhos
**Problema:** O import atual só funcionava bem para a planilha clássica lida por índice fixo, o que quebraria com fornecedores diferentes, CSVs em outra ordem e planilhas geradas por outras ferramentas
**Causa:** `src/app/api/import/route.ts` estava acoplado ao layout `NOMES_RJ_BNG.xlsx`, assumindo posição fixa para cada campo
**Correção:** Criar uma camada `src/lib/import-schema.ts` para detectar cabeçalhos reconhecíveis e mapear campos canônicos automaticamente, mantendo fallback para o layout legado
**Regra pratica:** Em importação operacional, a ordem externa das colunas deve ser flexível sempre que os cabeçalhos forem bons; o sistema deve padronizar o modelo interno, não exigir a mesma planilha externa

### 43. Fontes sem `NB` são uma nova fase de produto, não um detalhe do import atual
**Problema:** Fontes como Google Maps / Places e listas comerciais B2B podem não trazer `NB`, mesmo contendo bons dados de prospecção
**Causa:** O core atual de `leads` e da importação ainda é orientado ao modelo previdenciário clássico, com `NB` como âncora importante de deduplicação/identidade
**Correção:** Formalizar em `docs/IMPORTADOR_INTELIGENTE_PLAN.md` que o importador atual resolve variedade de layout, mas a entrada de fontes sem `NB` exige uma Fase 2 com staging, templates de importação e confirmação de mapeamento
**Regra pratica:** Quando a nova fonte muda o modelo de identidade do lead, isso deve virar evolução explícita de arquitetura, não gambiarra no parser existente

### 44. Agendamento precisa separar criador, responsável e dono do calendário
**Problema:** Em operação real de escritório, uma secretária pode criar um agendamento para outro advogado, mas o evento não deve necessariamente nascer no Google do admin/secretária
**Causa:** A integração inicial com Google Calendar era singleton por tenant em `configuracoes.google_calendar_token`, o que misturava quem agenda com quem realmente atende
**Correção:** Evoluir a integração para conexão por usuário com fallback do escritório e registrar no agendamento quem foi o `calendar_owner`
**Regra pratica:** No PrevLegal, `quem criou`, `quem é o responsável` e `em qual calendário o evento foi salvo` são conceitos diferentes e devem ser modelados separadamente

### 45. Inbox com status legado precisa normalizar o dado antes de filtrar
**Problema:** Na `Caixa de Entrada`, as abas específicas podiam parecer “não clicáveis” quando as conversas existentes vinham com `status` nulo ou fora do conjunto esperado
**Causa:** O filtro da UI dependia de igualdade exata com `agente`, `humano`, `aguardando_cliente` e `resolvido`, sem normalizar conversa legada
**Correção:** Normalizar o status na API e na tela, tratando qualquer valor inválido como `agente`, além de sincronizar a aba ativa pela URL
**Regra pratica:** Quando uma UI depende de estados categóricos antigos, normalize primeiro o dado legado antes de concluir que o problema é só visual

### 46. Role sozinha não sustenta a operação real do escritório
**Problema:** O modelo rígido `admin / operador / visualizador` não cobre cenários reais como secretária com agenda, coordenador operacional sem acesso financeiro ou operador sênior com automações sem acesso a usuários
**Causa:** A fase inicial do produto simplificou acesso em três perfis fixos, o que acelera o MVP, mas trava o uso em times reais
**Correção:** Criar `permissions` por usuário com preset padrão por role e liberar edição granular nos módulos críticos
**Regra pratica:** Em produto operacional multiusuário, role deve ser preset inicial; a governança madura nasce quando permissões granulares podem refinar esse preset

### 47. Google OAuth comercial depende tanto de escopo mínimo quanto de disclosure público consistente
**Problema:** Mesmo com a conexão Google funcionando em runtime, o consentimento ainda passava imagem de “app inseguro” para escritório pagante
**Causa:** A confiança comercial do OAuth não depende só do fluxo técnico; ela também depende de:
- escopos estritamente mínimos
- política de privacidade e termos descrevendo o uso real dos dados
- material coerente para submissão no Google Auth Platform
**Correção:** Reduzir os escopos do app para `calendar.events` e `userinfo.email`, endurecer as páginas públicas de privacidade/termos com linguagem explícita sobre agenda Google e preparar um documento de submissão pronto para o Google
**Regra pratica:** Sempre que uma integração OAuth for parte do onboarding comercial, o produto deve alinhar ao mesmo tempo:
- código
- disclosure jurídico público
- narrativa de submissão/verification

### 33. Expansao de produto precisa entrar por arquitetura de portfólio, nao por mistura de narrativas
**Problema:** Novas oportunidades reais, como `PrevGlobal`, CNIS com IA e modulos tecnicos premium, podem comecar a competir com o core operacional do PrevLegal se entrarem sem separacao clara
**Causa:** O produto cresceu alem da ideia inicial e abriu adjacencias fortes, mas isso aumenta o risco de descaracterizar a oferta principal
**Correção:** Formalizar uma arquitetura de portfólio com tres camadas:
- `PrevLegal Core`
- adjacencias operacionais
- modulos premium
**Regra pratica:** Novas frentes devem se conectar ao core, nao reescrever sua identidade. Sempre classificar a iniciativa como `core`, `adjacencia` ou `modulo premium` antes de executar

### 34. Portal mobile precisa sair de leitura passiva para ação útil do cliente
**Problema:** Um portal que só mostra status e mensagens ainda força o cliente a voltar para WhatsApp ou canais paralelos quando precisa mandar documentos
**Causa:** O mobile-first do portal estava evoluindo a leitura do caso, mas ainda sem uma ação operacional central para o cliente/familiar
**Correção:** Permitir upload de documento direto na aba `Documentos` do portal, com reflexo em pendências, timeline e notificações internas
**Regra pratica:** Toda fase do mobile do cliente deve adicionar pelo menos uma ação útil do usuário final, e não apenas mais visualização

### 35. Remarcação pelo portal deve sinalizar intenção, não mudar a agenda automaticamente
**Problema:** O cliente precisa pedir remarcação pelo app, mas alterar o horário sem mediação humana pode bagunçar a operação do escritório
**Causa:** O portal é uma superfície de cliente/familiar, enquanto a agenda operacional continua sendo responsabilidade da equipe
**Correção:** Criar um fluxo de `pedido de remarcação` que registra motivo e sugestão, alimenta timeline/notificação e mantém o time humano no controle da agenda
**Regra pratica:** No mobile do cliente, ações com impacto operacional forte devem entrar primeiro como `pedido` ou `sinalização`, e só depois como automação total

## Padrões TypeScript/Next.js 16

### 1. `createClient` admin no nível de módulo
**Erro:** `supabaseUrl is required`
**Causa:** `createClient` chamado fora de função — env vars não disponíveis no build
**Correção:** Sempre instanciar `createClient` DENTRO de cada função handler (GET, POST, etc.)
**Arquivos afetados:** `src/app/api/admin/tenants/route.ts`, `src/app/api/admin/tenants/[id]/route.ts`

### 2. `params` em dynamic routes
**Erro:** TypeScript error no build
**Causa:** Next.js 16 exige `params` como `Promise`
**Padrão correto:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // sempre await
}
```

### 3. `useRef` sem valor inicial
**Erro:** TypeScript strict mode
**Padrão correto:** `useRef<Tipo | undefined>(undefined)`

### 4. `cookies()` assíncrono
**Padrão correto:** `const cookieStore = await cookies()` antes de `.getAll()`

### 5. `middleware.ts` → `proxy.ts`
**Causa:** Next.js 16 reserva o nome `middleware`
**Correção:** Renomear arquivo e trocar export de `middleware` para `proxy`

---

## Supabase

### 6. Coluna `tenant_id` não existe em `usuarios`
**Erro:** `column tenant_id does not exist`
**Causa:** A tabela `usuarios` é single-tenant — não tem `tenant_id`
**Correção:** Remover `tenant_id` do select em `src/lib/auth-role.ts`

### 7. Coluna `updated_at` não existe em `conversas`
**Erro:** Query falha na busca global
**Causa:** Tabela `conversas` usa `ultima_mensagem_em` em vez de `updated_at`
**Correção:** Atualizar query em `/api/busca/route.ts`

### 8. Migrations devem ser aplicadas antes do deploy
**Causa:** Tabelas `contratos` e `parcelas` criadas localmente mas não no Supabase
**Correção:** Sempre aplicar via Supabase MCP antes de fazer push

---

## LP / Frontend

### 9. Posicionamento incorreto do produto
**Erro:** LP dizia 'para advogados autônomos'
**Causa:** Briefing inicial incompleto
**Correção:** Produto é para OPERAÇÕES DE CAPTAÇÃO, não advogados diretos

### 10. Agente se identificando com escritório parceiro
**Erro:** Mockup mostrava 'Sou assistente do escritório Alexandrini Advogados'
**Causa:** Viola o modelo legal — empresa de captação não pode se vincular ao escritório
**Correção:** Agente se apresenta como '(nome) — Consultor(a) Previdenciário(a)'
**Regra permanente:** NUNCA vincular empresa de captação ao escritório parceiro na comunicação inicial

### 11. NB do beneficiário no mockup da LP
**Erro:** Mockup mostrava 'NB 1234567' na mensagem do agente
**Causa:** Viola compliance definido pela Jéssica
**Correção:** Remover NB da abordagem inicial — só mencionar 'direito reconhecido pelo STF'

---

## Honorários previdenciários — aprendizado de negócio

### 12. Dois tipos de honorários por caso
**Aprendizado:** Uma ação previdenciária bem-sucedida gera DOIS honorários:
- **Contratual:** definido no contrato de êxito com o cliente (20-30% do benefício)
- **Sucumbência:** definido pelo juiz na sentença, pago pelo INSS (~10% do valor da causa)
**Impacto:** Sistema financeiro precisa registrar e trackear os dois separadamente
**Implementado:** Migration 030 + campos na tabela contratos + KPIs no financeiro

### 13. LP CTA deve apontar para /login não para a raiz
**Erro:** Botão "Acessar plataforma" redirecionava para o dashboard da Alexandrini
**Causa:** URL apontava para prevlegal.vercel.app sem path — usuário já logado ia direto pro dashboard
**Correção:** Todos os CTAs da LP apontam para /login

### 14. Env vars admin hardcoded no código
**Erro:** Token admin era string literal no código — inseguro
**Causa:** Variáveis não configuradas no Vercel
**Correção:** 3 env vars adicionadas no Vercel — EMAIL, SENHA e TOKEN gerado com openssl rand -hex 24

### 15. Agente NUNCA pode se identificar com o escritório parceiro
**Regra permanente de negócio e compliance OAB**
**Errado:** "Sou assistente do escritório Alexandrini Advogados"
**Correto:** "(nome) — Consultor(a) Previdenciário(a)"
**Motivo:** Empresa de captação não pode ter vínculo público com o escritório — viola o Provimento 205/2021 OAB

### 16. Obsidian MCP — vault precisa estar aberto
**Erro:** mcp-obsidian retornava 404 mesmo com plugin ativo
**Causa:** Obsidian aberto mas sem vault carregado
**Correção:** Sempre abrir a pasta ~/Documents/Fluxrow como cofre antes de usar o MCP
**Porta:** HTTPS 27124, requer NODE_TLS_REJECT_UNAUTHORIZED=0

### 17. Dois tipos de honorários em ações previdenciárias
**Aprendizado de negócio crítico — definido pela Jéssica Alexandrini**
- Contratual: definido no contrato de êxito com o cliente (20-30% do benefício)
- Sucumbência: definido pelo juiz na sentença, pago pelo INSS (~10% do valor da causa)
**Impacto no sistema:** tabela contratos tem campos separados — honorario_contratual e honorario_sucumbencia
**ROI real de cada caso = contratual + sucumbência**

### 18. PrevLegal não é para advogados autônomos
**Posicionamento correto:** SaaS para OPERAÇÕES DE CAPTAÇÃO PREVIDENCIÁRIA
**Modelo:** Empresa de captação (não-OAB) + Escritório parceiro (OAB)
**A empresa de captação usa o PrevLegal — o escritório recebe os leads qualificados**
**Base legal:** Provimento 205/2021 OAB + Art. 34 IV Estatuto da Advocacia

### 19. LP precisa de responsividade específica para 768px e 480px
**Erro:** Layout da LP quebrava em telas móveis estreitas, especialmente em 390px
**Causa:** O bloco responsivo antigo era genérico demais e não tratava nav, hero, mockup, pricing, ROI e footer com granularidade suficiente
**Correção:** Padronizar um bloco mobile completo com breakpoints em `768px` e `480px`
**Regra prática:** Em landing pages ricas, revisar sempre nav, hero CTA, mockup, métricas, pricing, ROI e footer separadamente no mobile

### 20. Chat do portal precisa de polling + Realtime no painel interno
**Erro:** As mensagens novas do cliente e do escritório só apareciam após recarregar a tela do lead
**Causa:** `portal-lead.tsx` fazia fetch único no mount e não mantinha a conversa sincronizada
**Correção:** Adicionar polling de 5 segundos + canal Supabase Realtime por `lead_id`
**Regra prática:** Em chat bidirecional do PrevLegal, usar Realtime para inserções e polling leve como fallback de consistência

### 21. Botões de mensagem rápida no Kanban dependem do telefone no select dos leads
**Erro:** O modal do card não consegue localizar a conversa WhatsApp se o kanban não carregar `telefone`
**Causa:** A página de leads buscava apenas campos visuais do board e omitia o identificador usado pela conversa
**Correção:** Incluir `telefone` no `select` da página de leads e normalizar o número para casar com `conversas.telefone`
**Regra prática:** Sempre que um card abrir ações de comunicação, carregar no dataset ao menos `id`, `nome` e `telefone`

### 22. Security Advisor do Supabase: zerar ERRORs primeiro, interpretar WARNINGs no contexto do produto
**Cenário:** O relatório do Security Advisor apontou erros críticos em `prevlegal-alexandrini` e `prevlegal-central`
**Correções aplicadas:** RLS ativado nas tabelas expostas, views trocadas para `security_invoker`, convites protegidos, tabela de teste removida e funções corrigidas com `search_path`
**Resultado:** Todos os `ERRORs` foram eliminados; restaram apenas `WARNINGs`
**Leitura correta dos WARNINGs atuais:**
- `rls_policy_always_true` é aceitável no modelo `single-tenant` atual, porque todos os usuários autenticados pertencem ao mesmo tenant operacional
- `pg_trgm` no schema `public` é um aviso técnico de baixo risco no contexto atual
- `Leaked password protection disabled` deve ser ativado no Dashboard do Supabase em `Authentication -> Password Settings`
**Regra prática:** Em auditoria de segurança, diferenciar achado crítico de aviso contextual. Quando o produto migrar para multi-tenant real, revisar todas as policies `USING (true)` para filtrar por `tenant_id`

### 23. Demos embedados na LP precisam ser autossuficientes
**Erro:** O demo novo ainda dependia de Google Fonts externas e inicialização direta no fim do script
**Risco:** Assets externos e boot frágil aumentam chance de falha visual dentro de `iframe` e prejudicam previsibilidade em produção
**Correção:** Trocar para stacks locais de fonte e inicializar a animação com `window.load` + guard idempotente
**Regra prática:** Todo `public/demo.html` do PrevLegal deve funcionar sozinho, sem dependência crítica de terceiros para tipografia ou start das cenas

### 24. Transição de cenas no demo precisa adicionar `visible` depois de `active`
**Erro:** A cena inicial podia entrar como `active` sem ganhar `visible`, quebrando a transição visual
**Causa:** O boot e a navegação trocavam a cena ativa sem garantir um frame de separação antes da classe final
**Correção:** Usar `requestAnimationFrame` duplo após `classList.add('active')` tanto no init quanto em `goTo`
**Regra prática:** Em animações de cena dentro de `iframe`, separar classes de estado em dois frames para evitar race condition de renderização

### 25. Drawer de lead precisa oferecer atalho para a página completa
**Problema:** O drawer resolve consulta rápida, mas tarefas de edição, documentos e contratos exigem navegação adicional manual
**Correção:** Adicionar CTA "Ver completo" no header do drawer apontando para `/leads/[id]`
**Regra prática:** Componentes de preview lateral devem sempre oferecer um caminho explícito para a tela completa quando houver ações avançadas fora do escopo do drawer

### 26. Twilio multi-tenant precisa de fallback global e helper único
**Problema:** Envio do agente, resposta manual e campanhas estavam com fetch Twilio duplicado e acoplado às env vars globais
**Correção:** Centralizar em `src/lib/twilio.ts`, buscar credenciais por tenant quando existirem e usar env vars globais como fallback silencioso
**Regra prática:** Todo envio WhatsApp no PrevLegal deve passar por helper compartilhado para unificar autenticação, número de origem, tratamento de erro e futura expansão multi-tenant

### 27. Mensagem do portal precisa notificar fora do detalhe do lead
**Problema:** O cliente podia mandar mensagem pelo portal sem gerar visibilidade imediata no sino ou na Caixa de Entrada
**Correção:** Criar notificação do tipo `portal` no backend e expor contagem agregada de não lidas via endpoint próprio
**Regra prática:** Toda entrada assíncrona relevante do cliente deve alimentar dois níveis de atenção: notificação global e badge agregado da área operacional

### 28. Inbox operacional unificada precisa separar canal e pendência real
**Problema:** Badge global sem fila operacional gera alerta, mas não resolve ação humana
**Correção:** A `Caixa de Entrada` passou a distinguir WhatsApp (`todas`, `agente`, `humano`) e `portal` como aba própria, enquanto a sidebar usa endpoint agregado de pendências reais
**Regra prática:** Badge só faz sentido quando aponta para uma fila acionável; sempre modelar junto contagem agregada + lista operacional + painel de resposta

### 29. Inputs perdem foco quando subcomponentes de formulário são declarados dentro do componente principal
**Problema:** Ao digitar uma letra, o cursor sai do campo e o usuário precisa clicar novamente para continuar
**Causa:** Helpers como `Section`, `Field`, `Grid` e similares foram declarados dentro de componentes client-side; a cada mudança de estado, React recria esse tipo de componente e pode remontar o trecho da árvore
**Correção:** Mover subcomponentes reutilizados de formulário para o escopo do módulo, fora do componente principal
**Regra prática:** Em formulários do PrevLegal, nunca declarar componentes React auxiliares dentro do componente que mantém o estado de digitação

### 30. Detalhe do tenant no admin precisa deixar explícito quando a métrica ainda vem do projeto piloto único
**Problema:** A página de detalhe do tenant pode sugerir isolamento real por cliente mesmo quando o backend ainda lê de uma única base operacional
**Causa:** O modelo multi-tenant administrativo evoluiu antes do isolamento físico dos dados por tenant
**Correção:** Implementar a tela já com endpoint dedicado, mas documentar que as métricas ainda usam o projeto único do piloto até a camada de credenciais/base por tenant ficar pronta
**Regra prática:** Sempre sinalizar quando uma feature admin é `tenant-aware` na interface, mas ainda não `tenant-isolated` na infraestrutura

### 31. Vale encapsular contexto recorrente do PrevLegal em uma skill local
**Problema:** Muitas sessões repetem o mesmo contexto de produto, compliance OAB, prioridades e rituais de build/docs
**Causa:** O projeto ficou mais complexo e o conhecimento ficou espalhado entre código, `MASTER`, `ROADMAP`, `LEARNINGS` e memória da sessão
**Correção:** Criar uma skill local `prevlegal-product-ops` com gatilho para tarefas de produto, arquitetura e implementação no PrevLegal
**Regra prática:** Quando um projeto acumula regras próprias, fluxos repetitivos e linguagem de negócio específica, vale transformar isso em skill para reduzir retrabalho e manter consistência

### 32. Domínio principal merece separação entre site e app
**Cenário:** O domínio `prevlegal.com.br` foi adquirido
**Decisão recomendada:** usar `prevlegal.com.br` para site/LP e `app.prevlegal.com.br` para a plataforma
**Motivo:** melhora organização, escalabilidade, clareza comercial e reduz acoplamento entre marketing, autenticação e links do produto

### 33. Identidade persistente do portal pode nascer como ponte segura antes de virar auth completa
**Problema:** O portal do cliente funcionava só com `portal_token`, o que bastava para o piloto, mas não distinguia cliente, familiar e cuidador nem registrava quem acessou o caso
**Correção:** Criar `portal_users` + `portal_access_links` e tratar o primeiro link persistente como ponte controlada para o portal atual
**Padrão aplicado:** o link individual registra uso, atualiza `ultimo_acesso_em` e redireciona para `/portal/[portal_token]`
**Regra prática:** Antes de abrir uma auth completa de cliente, vale criar uma camada de identidade observável e tenant-aware para aprender quem acessa o portal sem duplicar cedo demais a superfície de login

### 34. O portal do cliente pode ganhar sessão real sem herdar a auth do backoffice
**Problema:** O link persistente resolvia identidade, mas o app ainda não mantinha sessão do cliente/familiar dentro do portal
**Correção:** Criar `portal_sessions` e fazer `/portal/acesso/[token]` gerar um cookie httpOnly próprio do portal
**Padrão aplicado:** sessão separada do app interno, ligada a `portal_user`, `lead` e `tenant`, com logout próprio e fallback seguro se a foundation ainda não existir
**Regra prática:** No PrevLegal, auth do portal do cliente deve ser uma trilha própria e mais leve, sem misturar sessão de cliente/familiar com sessão do operador interno
**Regra prática:** Quando o produto sair do estágio de subdomínio temporário, migrar com ordem explícita: arquitetura -> Vercel -> DNS -> URLs canônicas -> links automáticos -> validação final

### 33. Migração de domínio precisa começar pelo inventário de URLs absolutas e fallbacks

### 34. Cadastro de escritório no admin não pode falhar em silêncio
**Problema:** Depois do reset operacional, o modal de novo escritório podia falhar sem salvar e sem mostrar motivo ao admin
**Causa:** O frontend ignorava respostas não-`ok` do `POST /api/admin/tenants`, e o backend aceitava `slug` vazio/sem normalização
**Correção:** Normalizar payload no backend, gerar `slug` automaticamente a partir do nome quando vazio, evitar colisões de slug no update e exibir a mensagem real de erro no modal do admin
**Regra prática:** Fluxos de bootstrap do tenant nunca podem depender de campo técnico manual sem fallback automático, e todo erro de persistência no admin precisa aparecer na UI

### 35. APIs do admin não podem passar pelo gate de login do app
**Problema:** `POST /api/admin/tenants` falhava mesmo com `admin_token` válido
**Causa:** O middleware tratava `/api/admin/*` como API comum do app e redirecionava para `/login` quando não havia sessão Supabase do produto
**Correção:** Tratar `/api/admin/*` como superfície administrativa no middleware, respeitando `admin_token` e retornando `401` JSON quando a autenticação do admin estiver ausente
**Regra prática:** Toda rota `/api/admin/*` do PrevLegal deve ser autenticada pelo contexto do admin, não pelo contexto do app

### 36. `/api/admin/reauth` precisa continuar pública para o próprio fluxo de reautenticação funcionar
**Problema:** A tela de reautenticação do admin parecia rejeitar a senha correta
**Causa:** O middleware protegia `/api/admin/reauth` como se fosse rota privada do app, então a chamada era redirecionada para `/login` antes de validar as credenciais
**Correção:** Incluir `/api/admin/reauth` entre as rotas públicas do middleware

### 37. Camada de provider WhatsApp precisa nascer com fallback para o legado
**Problema:** O produto precisa suportar Z-API e multiplos numeros por escritorio, mas o runtime atual ainda depende do modelo Twilio unico por tenant/env
**Risco:** Se a aplicacao passar a depender de tabela nova antes da migration/base estarem prontas, o envio quebra em producao
**Correcao:** Criar `src/lib/whatsapp-provider.ts` com resolucao em duas camadas:
- primeiro tenta `whatsapp_numbers`
- se a tabela nao existir ou nao houver numero ativo, faz fallback para `getTwilioCredentialsByTenantId`
**Regra pratica:** Em transicoes de arquitetura no PrevLegal, a camada nova precisa conviver com o legado ate a base operacional estar populada

### 38. Suporte a multiplos numeros deve entrar antes de acoplar Z-API direto nos fluxos
**Problema:** Z-API e campanhas sugerem encaixar mais um provider rapidamente, mas o produto ja aponta para o cenario de um escritorio operar mais de um numero de prospeccao
**Risco:** Integrar Z-API direto nas rotas atuais geraria retrabalho quando entrasse o segundo numero do mesmo tenant
**Correcao:** Modelar `whatsapp_numbers` por tenant com `provider`, credenciais e `is_default`, e deixar campanhas/conversas prontas para futuramente apontar para `whatsapp_number_id`
**Regra pratica:** Quando um integrador novo chega junto com necessidade de roteamento por origem, modelar primeiro o canal, depois o provider

### 39. Sender global errado pode mascarar bug como falha de produto
**Problema:** O fluxo de `Iniciar conversa` saiu do erro de numero invalido e passou para `Twilio could not find a Channel with the specified From address`
**Causa:** O `Account SID` e o `Auth Token` eram os mesmos entre local e producao, mas o `TWILIO_WHATSAPP_NUMBER` em producao apontava para um sender diferente do sandbox valido
**Correcao:** Aplicar a migration `032`, registrar o primeiro canal em `whatsapp_numbers` e sincronizar o tenant `Fluxrow` com `whatsapp:+14155238886` como origem default
**Regra pratica:** Quando o erro do provider aponta para `From address`, validar primeiro o sender configurado antes de concluir que o fluxo do produto quebrou

### 40. O “app do cliente” precisa de manifesto proprio por portal, nao do manifest global da plataforma
**Problema:** O projeto ja tinha `public/manifest.json`, mas ele foi desenhado para o app interno e apontava para `/dashboard`
**Causa:** A frente mobile do cliente nasceu depois da plataforma interna e exige `start_url` contextualizado por token/caso
**Correcao:** Criar manifesto dinamico em `GET /api/portal/manifest/[token]` e ligá-lo ao layout de `/portal/[token]`
**Regra pratica:** Quando a experiencia PWA nasce de uma superficie contextualizada por token, o manifesto precisa apontar para essa superficie, nao para um dashboard generico

### 41. Installability pode entrar antes da estrategia de cache offline completa
**Problema:** O portal precisava ficar instalavel no celular sem abrir agora uma frente grande de offline/cache
**Causa:** Esperar uma estrategia completa de cache atrasaria a validacao de uso real do “app” com clientes
**Correcao:** Registrar um `service worker` leve em `public/sw.js` e mostrar o CTA `Instalar app` no proprio portal
**Regra pratica:** Em MVPs mobile do PrevLegal, primeiro habilitar installability e validar uso; cache/offline avancado entra depois

### 87. O backlog mobile precisa nascer do portal real, nao de uma ideia abstrata de app
**Problema:** Planejar “app mobile” sem olhar o portal atual levaria a duplicar superficie e ignorar debitos reais do produto
**Causa:** O PrevLegal ja possui uma base funcional em `src/app/portal/[token]/page.tsx` e `src/app/api/portal/[token]/route.ts`, mas com limitacoes concretas como branding hardcoded e acesso apenas por token
**Correcao:** Formalizar a direcao `portal mobile-first -> PWA -> identidade persistente -> nativo se justificar` e transformar isso em backlog tecnico canônico em `docs/MOBILE_CLIENT_APP_BACKLOG.md`
**Regra pratica:** Em novas frentes de produto no PrevLegal, o primeiro backlog deve partir do estado real do codigo e dos debitos atuais, nao de uma superficie idealizada

### 88. O portal atual ainda nao e uma base multi-tenant pronta para virar app do cliente
**Problema:** O portal parecia reutilizavel como app do cliente, mas a leitura do codigo mostrou dependencias fixas de escritorio e payload restrito
**Causa:** `src/app/portal/[token]/page.tsx` ainda exibe `Alexandrini Advogados`, telefone fixo e dominio fixo, enquanto `GET /api/portal/[token]` ainda retorna so lead basico, documentos compartilhados e mensagens
**Correcao:** Registrar como debito de Fase 1:
- remover branding hardcoded
- ampliar o payload do portal
- expor agenda/Meet e pendencias de documento
**Regra pratica:** Antes de chamar uma superficie de “base do app”, validar se branding, auth e payload ja estao prontos para tenant-awareness e uso recorrente

### 89. A primeira evolucao do app do cliente deve trocar branding fixo por branding dinamico antes de qualquer “novo app”
**Problema:** Mesmo com a estrategia certa de `portal mobile-first`, o cliente ainda via `Alexandrini Advogados` hardcoded no header, nas mensagens e no footer
**Causa:** `src/app/portal/[token]/page.tsx` estava acoplada ao piloto inicial e `GET /api/portal/[token]` nao devolvia dados de tenant/configuracao para o front
**Correcao:** Expandir `GET /api/portal/[token]` para devolver `branding`, `proximo_agendamento` e `resumo`, e fazer a pagina do portal consumir `configuracoes` + `tenants` em vez de texto fixo
**Regra pratica:** Em superficies cliente-facing do PrevLegal, o primeiro passo para virar produto e remover hardcode de escritorio e passar a ler branding/contato do tenant correto

### 40. Funil executivo so fecha o ciclo quando a tela de leads tambem aceita filtro por URL
**Problema:** O pipeline em `/relatorios` e os cards do dashboard ja apontavam para filas reais de inbox, agenda e financeiro, mas o kanban de leads continuava abrindo sempre sem recorte
**Causa:** `/leads` era renderizada sem ler `searchParams`, entao o produto perdia contexto ao sair dos cards-resumo e voltar para o funil comercial
**Correcao:** Fazer `/leads` aceitar `?status=` no servidor, aplicar o filtro direto na query e expor faixa de filtro ativo + chips de status na UI
**Regra pratica:** Quando uma métrica ou card executivo representa uma etapa do funil, a tela de destino precisa abrir ja no recorte operacional correspondente

### 41. Sidebar retraida so funciona bem quando respeita a capacidade real de hover do dispositivo
**Problema:** Recolher a navegação lateral pode abrir muito espaço útil, mas em touch isso vira fricção e pode esconder o produto
**Causa:** O comportamento de hover não existe do mesmo jeito em touchscreens, então colapsar a sidebar indiscriminadamente pioraria a navegação
**Correcao:** Ativar auto-retracao apenas quando `matchMedia('(hover: hover) and (pointer: fine)')` for verdadeiro, mantendo a sidebar expandida em dispositivos sem hover fino
**Regra pratica:** Otimizacoes de densidade visual que dependem de hover precisam degradar com segurança em telas touch

### 42. App mobile do cliente deve nascer como evolucao do portal, nao como produto paralelo
**Problema:** Começar direto com app nativo parece atraente, mas abre uma segunda frente técnica antes de validar o modelo de uso do cliente/familiar
**Causa:** O PrevLegal já possui portal, mensagens, documentos e agenda; criar um app separado cedo demais duplicaria superfície e regras de negócio
**Correcao:** Definir a direção oficial como `portal mobile-first -> PWA -> identidade persistente -> nativo só se justificar`
**Regra pratica:** Quando a base web já entrega o fluxo principal do cliente, a primeira versão mobile deve reaproveitar essa superfície antes de abrir uma stack nativa própria

### 40. Saúde do tenant no admin só serve para decisão quando as métricas são recortadas pelo tenant certo
**Problema:** O detalhe do tenant no admin podia exibir leituras operacionais convincentes, mas parte das contagens ainda não filtrava por `tenant_id`
**Risco:** A tela parecia executiva, mas podia induzir leitura errada de adoção, volume e risco de um escritório específico
**Correção:** Reescrever `GET /api/admin/tenants/[id]/metricas` para filtrar por `tenant_id`, adicionar sinais de saúde recentes (`usuariosAtivos7d`, `conversas7d`, `agendamentosPendentes`, `ultimoAcessoEquipe`) e resumir o risco operacional na própria UI
**Regra prática:** No PrevLegal, qualquer métrica administrativa só deve virar badge, resumo ou diagnóstico quando estiver claramente `tenant-aware` e operacionalmente acionável

### 41. Financeiro previsível exige recorte tenant-aware antes de qualquer “inteligência”
**Problema:** Contratos e parcelas já alimentavam um dashboard útil, mas updates sensíveis ainda não confirmavam pertença ao tenant atual e a leitura financeira era quase toda retrovisora
**Risco:** O módulo podia parecer maduro na superfície enquanto ainda deixava espaço para leitura cruzada e pouca orientação de curto prazo
**Correção:** Endurecer `GET/POST/PATCH/DELETE` do bloco financeiro com validação de vínculo ao lead do tenant atual e adicionar sinais simples de previsão (`previsto7d`, `previsto30d`, `recebivelAberto`, `ticketMedioContrato`, `riscoFinanceiro`, `proximasParcelas`) no resumo
**Regra prática:** No PrevLegal, previsibilidade financeira só vale quando nasce do mesmo recorte tenant-aware que protege a operação; primeiro segurança do dado, depois “inteligência”

### 42. Pipeline financeiro fica muito mais acionável quando expõe origem comercial, não só recebimento
**Problema:** Mesmo com previsão de caixa, o financeiro ainda dizia “quanto” sem dizer “de onde veio” a carteira que está sustentando esse caixa
**Risco:** Fica difícil decidir se a operação está saudável por campanha, por lista ou por ação manual, e o time perde a ponte entre comercial e receita
**Correção:** Cruzar contratos com `leads.campanha_id`, `leads.lista_id` e presença de `agendamentos`, expondo no dashboard a origem comercial da carteira e os contratos que já passaram por agendamento
**Regra prática:** No PrevLegal, toda leitura de receita que influencia operação deve apontar para a origem comercial que a gerou

### 40. Inbox WhatsApp nao pode ecoar outbound como se fosse resposta real
**Problema:** Ao enviar uma mensagem manual pelo lead/inbox, a thread mostrava a mesma mensagem dos dois lados mesmo sem o lead responder
**Causa:** O registro outbound estava sendo lido da tabela `mensagens_inbound`, e a UI da inbox sempre renderizava a bolha da esquerda antes de renderizar `resposta_agente`
**Correcao:** Tratar como outbound os registros cujo `telefone_destinatario` bate com o telefone da conversa e renderizar apenas a bolha da direita nesses casos
**Regra pratica:** Enquanto o historico WhatsApp ainda misturar eventos inbound e outbound na mesma origem, a UI precisa distinguir direcao pelo par `telefone_remetente`/`telefone_destinatario`, nao so pelos flags de resposta

### 41. Send box da inbox precisa mostrar erro real do provider
**Problema:** O operador podia clicar em enviar, ver a thread atualizada e concluir que a mensagem saiu mesmo quando o provider falhava depois
**Causa:** O front da inbox limpava o texto e recarregava a conversa sem verificar `res.ok`
**Correcao:** O composer da inbox agora preserva o texto em falha e mostra a mensagem de erro retornada pela API
**Regra pratica:** Em fluxos operacionais do PrevLegal, nunca tratar tentativa de envio como sucesso sem validar explicitamente a resposta HTTP

### 42. Cadastro de canais WhatsApp por tenant precisa sincronizar com o legado durante a transicao
**Problema:** A nova camada `whatsapp_numbers` convive com partes do runtime que ainda consultam `tenants.twilio_*`
**Risco:** Cadastrar ou trocar o canal padrao no admin e deixar os campos legado desatualizados criaria comportamento incoerente entre envio, webhook e fallback
**Correcao:** O admin agora gerencia canais em `/api/admin/tenants/[id]/whatsapp-numbers*` e, sempre que um canal `Twilio` ativo/padrao muda, sincroniza `twilio_account_sid`, `twilio_auth_token` e `twilio_whatsapp_number` no `tenant`
**Regra pratica:** Em migracoes de integracao, a UI nova deve atualizar a fonte canônica nova e manter a fonte legada coerente ate o corte definitivo
**Regra prática:** Endpoints que estabelecem autenticação ou reautenticação não podem depender da sessão que eles próprios estão tentando renovar

### 37. Contenção do tenant não pode travar o próprio primeiro tenant depois do bootstrap inicial
**Problema:** Depois de criar o primeiro escritório e o primeiro usuário operacional, `Enviar acesso do responsável` e `Copiar link manual` voltaram a responder que o rollout estava pausado
**Causa:** A contenção temporária liberava apenas `usuarios = 0`; assim que o primeiro usuário surgia, o único tenant operacional também ficava bloqueado
**Correção:** Permitir as rotas de onboarding do único tenant existente quando todos os usuários atuais pertencem a esse mesmo tenant
**Regra prática:** Em contenção multi-tenant, o bloqueio precisa impedir expansão para um segundo tenant, não quebrar o bootstrap do primeiro tenant real

### 38. Tela de redefinição precisa aceitar os formatos reais de link enviados pelo Supabase Auth
**Problema:** O email de acesso/redefinição podia abrir a página de nova senha e ainda assim cair como "link inválido ou expirou"
**Causa:** A tela dependia quase só de uma sessão já estabelecida; ela não tratava explicitamente `token_hash` ou `code` na URL
**Correção:** A página `/auth/redefinir-senha` agora processa `token_hash`, `type` e `code`, além do fluxo de sessão existente
**Regra prática:** Páginas de auth do PrevLegal devem suportar os diferentes formatos de callback que o Supabase pode emitir em ambientes reais

### 39. `Enviar acesso do responsável` não deve depender do email chegar para o onboarding continuar
**Problema:** A API de provisionamento respondia sucesso, mas o email podia não chegar imediatamente e o operador ficava sem certeza do que fazer
**Causa:** O fluxo separava demais "enviar email" e "copiar link manual", mesmo quando o email é a parte mais instável do processo
**Correção:** Após sucesso em `Enviar acesso do responsável`, o admin agora já gera e copia automaticamente o link manual de contingência
**Regra prática:** Em onboarding crítico, sempre devolver um caminho manual utilizável no mesmo passo em que o sistema dispara um email externo

### 40. Reset de senha do responsável deve ter a mesma contingência do onboarding
**Problema:** O email de reset podia chegar, mas o clique ainda falhar com erro do Supabase/session JWT
**Causa:** O fluxo de reset ainda dependia exclusivamente do link enviado por email
**Correção:** Após sucesso em `Enviar reset de senha`, o admin agora também gera e copia automaticamente o link manual de contingência
**Regra prática:** Sempre que um email de auth for opcionalmente instável, o operador deve sair da ação já com um link manual funcional em mãos

### 41. Reset manual robusto é melhor do que depender da sessão recovery do Supabase
**Problema:** Mesmo com link manual, o reset podia falhar com `User from sub claim in JWT does not exist`
**Causa:** O fluxo ainda acabava dependendo da sessão recovery/JWT emitida pelo Supabase Auth
**Correção:** Criar `reset-manual` via token próprio salvo em `convites` e aplicar a nova senha com `auth.admin.updateUserById`
**Regra prática:** Para fluxos administrativos críticos do PrevLegal, preferir tokens próprios no backend quando a UX de recovery do provedor externo se mostrar inconsistente

### 34. Contenção por allowlist sozinha não basta quando o tenant piloto ainda tem múltiplos usuários
**Cenário:** Mesmo após bloquear novos escritórios no app, algumas superfícies continuavam amplas demais para o modelo legado compartilhado
**Causa:** O banco operacional ainda não tem `tenant_id`, então várias rotas liam dados globais ou dependiam de permissões abertas herdadas do modelo `um banco por tenant`
**Correção temporária:** Criar `src/lib/tenant-context.ts` e endurecer páginas/rotas principais para usar o usuário autenticado como âncora de escopo
**Regra prática:** Em incidente multi-tenant sem migração aplicada, a ordem segura é:
- 1. conter acesso por allowlist
- 2. endurecer auth e ownership por usuário nas superfícies mais críticas
- 3. só depois avançar para `tenant_id` + backfill + RLS

### 35. Build limpo é obrigatório antes de chamar uma contenção temporária de "publicável"
**Cenário:** A camada temporária de isolamento tocou muitas superfícies ao mesmo tempo (`dashboard`, `leads`, `conversas`, `portal`, `financeiro`, `relatorios`, `configuracoes`)
**Risco:** Mudanças amplas de escopo podem parecer corretas em leitura, mas quebrar em tipos, joins Supabase ou páginas server-side
**Correção:** Sempre fechar `npm run build` completo antes de publicar uma onda de contenção desse tipo
**Regra prática:** Em PrevLegal, contenção P0 também precisa passar pelo mesmo ritual de qualidade: build, docs, handoff, Obsidian e só então push/deploy

### 36. Quando o legado e descartável, reset limpo é melhor que backfill “forçado”
**Cenário:** O banco operacional tinha dados piloto/contextuais (`Alexandrini/Jessica`) usados só para prototipagem do produto
**Risco:** Backfillar esse legado para um tenant “real” carrega sujeira e ambiguidade para dentro do modelo multi-tenant final
**Correção:** Se o dado piloto puder ser descartado, preferir:
- aplicar a migration estrutural
- resetar o operacional
- bootstrapar o primeiro escritorio real do zero
**Regra prática:** Em transição de single-tenant piloto para multi-tenant real, só fazer backfill quando o legado for de fato produção que precisa ser preservada

### 37. Reset limpo no banco so resolve metade do problema; o bootstrap precisa nascer tenant-aware
**Cenário:** Depois da `031` e do reset operacional, o banco ficou limpo, mas as rotas de onboarding e criação ainda poderiam voltar a gravar dados sem `tenant_id`
**Risco:** Recriar o primeiro escritório real em cima de fluxos antigos recoloca dados “soltos” logo após o reset
**Correção:** Ajustar imediatamente o bootstrap:
- responsável do tenant gravando `usuarios.tenant_id`
- convites internos gravando `convites.tenant_id`
- aceite de convite gravando `usuarios.tenant_id`
- importação de listas e criação manual de leads gravando `tenant_id`
**Regra prática:** Toda vez que houver reset estrutural para bootstrap limpo, revisar antes os fluxos de criação para garantir que o novo dado já nasce no modelo final
### 34. Estrutura duplicada na raiz pode fazer a Vercel/Next publicar o app errado
**Problema:** O deploy público passou a responder só `lp.html` e `404` nas rotas do app, mesmo com aliases corretos na Vercel
**Causa:** Havia uma árvore `app/` vazia na raiz e um `next.config.js` residual competindo com a aplicação real em `src/app` e com `next.config.ts`
**Correção:** Remover a árvore `app/` vazia, apagar `next.config.js`, centralizar a config em `next.config.ts` e fixar `turbopack.root` com `process.cwd()`
**Regra prática:** No PrevLegal, manter apenas uma raiz de App Router e um único arquivo de configuração do Next; qualquer resíduo estrutural pode mascarar erros no build e gerar deploy aparentemente "pronto" mas servindo o artefato errado

### 35. `createBrowserClient` não deve rodar no corpo de componentes que podem prerenderizar
**Problema:** O build quebrava no `/login` com `Your project's URL and API key are required to create a Supabase client`
**Causa:** `createClient()` do browser era chamado no corpo do componente durante o prerender
**Correção:** Instanciar o client apenas dentro de handlers/eventos do cliente, como submit de login e logout
**Regra prática:** Em componentes client-side do PrevLegal, `createBrowserClient` só deve nascer em interação do usuário, `useEffect` ou import dinâmico controlado

### 36. `useSearchParams` em páginas client do App Router precisa de `Suspense`
**Problema:** O build falhava em `/reauth` com `useSearchParams() should be wrapped in a suspense boundary`
**Causa:** Next 16 exige boundary explícita quando `useSearchParams` dispara bailout CSR em página
**Correção:** Criar um componente interno com `useSearchParams` e exportar a página com wrapper `<Suspense>`
**Regra prática:** Toda página client do PrevLegal que usar `useSearchParams` deve sair já envolvida em `Suspense`

### 37. Acoes sensiveis do admin devem ficar dentro do modal do tenant quando dependem do email do responsavel
**Cenario:** Reset de senha precisava ser executado sem sair da tela de edicao do escritorio
**Correcao:** Criar endpoint dedicado em `src/app/api/admin/tenants/[id]/reset-senha/route.ts` e acionar do proprio modal com feedback local
**Regra pratica:** Quando a acao depende do tenant carregado e exige reauth do admin, ela deve viver junto do modal/detalhe para evitar friccao operacional

### 38. Recriar acesso de usuario nao pode depender de inserir um novo `usuarios` com o mesmo email
**Problema:** O fluxo de convite quebraria ao recriar acesso de um usuario ja existente, porque `usuarios.email` e unico e o aceite tentava sempre fazer `insert`
**Correcao:** No aceite do convite, se o email ja existir em `usuarios`, o sistema atualiza `auth_id` e reativa o registro existente em vez de criar outro
**Regra pratica:** Em reonboarding ou recriacao de acesso no PrevLegal, preservar o registro funcional de `usuarios` e trocar apenas a vinculacao com `auth.users`
**Problema:** É fácil trocar o domínio visível da LP e esquecer convites, portal, webhooks, callbacks e links internos do admin
**Causa:** O projeto mistura CTAs estáticos, variáveis de ambiente e fallbacks hardcoded para `prevlegal.vercel.app`
**Correção:** Criar checklist técnico dedicado (`docs/DOMAIN_MIGRATION.md`) antes da migração, mapeando arquivos, envs e riscos
**Regra prática:** Toda migração de domínio deve começar por inventário de URLs absolutas reais no código, não por ajuste visual de superfície

### 34. Cadastro manual de lead ainda depende do modelo legado de listas
**Problema:** Criar lead manual pelo modal falhava com `null value in column "lista_id" of relation "leads" violates not-null constraint`
**Causa:** A tabela `leads` continua exigindo `lista_id`, mesmo para leads que não vieram de importação de lista
**Correção:** A API de criação manual passou a criar/reutilizar uma lista técnica `Cadastro manual` e vincular o lead a ela
**Regra prática:** Enquanto `leads.lista_id` existir como obrigatório, todo lead avulso precisa nascer com uma lista técnica associada para preservar compatibilidade com o restante do modelo

### 35. Domínio do site e domínio do app precisam de env vars separadas
**Problema:** Reaproveitar uma única URL base para LP, SEO, convites, portal e login mistura contextos e complica a migração para domínio próprio
**Correção:** manter `SITE_URL` e `APP_URL` separados em código, envs e callbacks
**Regra prática:** nenhum fluxo de auth, convite, portal ou integração externa deve inferir domínio a partir da LP

### 36. O schema operacional do PrevLegal nasceu para "um banco por tenant", não para multi-tenant lógico
**Problema:** O produto passou a operar mais de um escritório no mesmo banco operacional, mas o schema principal foi criado com a premissa de que cada cliente teria sua própria base
**Evidência:** `supabase/migrations/001_initial_schema.sql` traz explicitamente a regra `cada tenant tem seu proprio banco`
**Impacto:** tabelas principais e policies antigas não usam `tenant_id`, então qualquer expansão multi-escritório no mesmo banco causa vazamento sistêmico
**Regra prática:** enquanto não houver tenant isolation real, não tratar o ambiente compartilhado como multi-tenant seguro

### 37. Quando o CLI estiver linkado no projeto errado e o remoto nao tiver historico local confiavel, o caminho seguro e SQL direto no alvo correto
**Problema:** Em uma etapa critica de isolamento multi-tenant, o Supabase CLI estava apontando para o projeto central e `db push` sugeria um fluxo enganoso para o banco operacional
**Causa:** O projeto remoto nao estava alinhado a um historico normal de migrations locais, entao confiar em link do CLI + `db push` aumentava o risco de executar no lugar errado
**Correcao:** Para o reset limpo do operacional, executar diretamente o arquivo `supabase/reset/combined_apply_031_and_reset.sql` no host do projeto correto (`lrqvvxmgimjlghpwavdb`) e validar as contagens finais no mesmo banco
**Regra pratica:** Em operacoes destrutivas do PrevLegal, sempre travar 3 confirmacoes antes de rodar:
- `project ref` alvo
- metodo de execucao real
- query final de validacao no mesmo banco
**Regra complementar:** Nunca usar `db push` como atalho quando houver duvida de link do CLI ou quando o remoto nao refletir o historico local de migrations

### 37. `src/lib/types.ts` já assume `tenant_id`, mas o banco ainda não
**Problema:** Tipos TypeScript de `Usuario`, `Lead`, `Lista`, `Campanha`, `Agendamento` e outros já carregam `tenant_id`, mas as tabelas equivalentes do banco operacional não
**Impacto:** gera falsa sensação de multi-tenant pronto no código, enquanto a persistência e as APIs continuam globais
**Regra prática:** considerar drift entre tipagem e schema como sinal de arquitetura incompleta; nunca usar os types como prova de isolamento real

### 38. `configuracoes` singleton e token Google global quebram multi-tenant
**Problema:** `src/app/api/configuracoes/route.ts` lê e escreve `configuracoes` com `limit(1)`, e `src/app/api/google/status/route.ts` usa `google_calendar_token` nessa configuração única
**Impacto:** branding, Twilio e Google Calendar podem ficar compartilhados entre escritorios
**Regra prática:** em multi-tenant real, `configuracoes` precisa ser "uma linha por tenant", não singleton global por banco

### 39. `service_role` sem escopo explícito de tenant vira bypass estrutural
**Problema:** APIs como listas, conversas e configurações usam `service_role` para ler/escrever dados globais
**Impacto:** mesmo com RLS futura, qualquer rota com `service_role` sem filtro explícito de `tenant_id` continua podendo vazar dados
**Regra prática:** `service_role` só é aceitável no PrevLegal quando a query já entra com escopo explícito de tenant e ownership

### 40. Em incidente multi-tenant P0, contenção também precisa atingir onboarding
**Problema:** Bloquear só o acesso ao app reduz exposição, mas ainda permite provisionar novos responsaveis e expandir um rollout inseguro
**Correção:** As rotas de onboarding do responsavel passaram a devolver `423` para emails fora da allowlist durante a contingência
**Regra prática:** Em incidente de isolamento, não basta bloquear navegação; também é preciso travar pontos que aumentem a superfície de exposição

### 41. Quando o banco real confirma que todo o dado operacional é legado de um único escritório, a allowlist do app deve voltar ao piloto
**Problema:** Manter emails de novos escritorios na allowlist do app faz esses usuarios entrarem numa base que ainda e legado do tenant piloto
**Correção:** A allowlist do app foi reduzida novamente para `jessica@alexandrini.adv.br`; novos escritorios permanecem só no admin até a Fase 26 fechar
**Regra prática:** Em incidente LGPD, priorizar bloqueio duro do acesso operacional em vez de conveniência de teste
**Causa:** Antes do cutover, o projeto tratava `prevlegal.vercel.app` como host único para marketing e plataforma
**Correção:** Padronizar `NEXT_PUBLIC_SITE_URL` para site/LP/metadata e `NEXT_PUBLIC_APP_URL` para plataforma, convites, portal e fluxos autenticados
**Regra prática:** Tudo que for canônico, indexável ou marketing usa `SITE_URL`; tudo que for login, convite, portal, webhook e app usa `APP_URL`

### 36. HTML estático público não consegue consumir env vars do Next em runtime
**Problema:** `public/lp.html` e `public/demo.html` não conseguem interpolar `process.env` como componentes do App Router
**Causa:** Arquivos em `public/` são servidos como estáticos puros, fora do pipeline de renderização do Next
**Correção:** Manter fallback literal temporário para `https://prevlegal.vercel.app/login` até a janela final de cutover, documentando a troca no runbook
**Regra prática:** Se a LP continuar em `public/*.html`, mudanças de domínio precisam ser feitas por substituição literal controlada, não por `process.env` no cliente

### 37. Segurança de sessão precisa equilibrar proteção real e fricção de uso
**Problema:** Exigir login constante irrita o usuário; deixar sessão aberta indefinidamente em máquina compartilhada expõe dados sensíveis
**Causa:** Produtos B2B com dados operacionais sensíveis precisam de política de sessão por inatividade, não só login inicial
**Correção recomendada:** usar expiração por inatividade na plataforma (`45 min`), política mais rígida no admin (`15 min`) e reautenticação apenas para ações críticas
**Regra prática:** No PrevLegal, UX normal do dia a dia pode continuar fluida, mas abandono de máquina e áreas sensíveis devem ser protegidos por timeout e reauth seletiva

### 38. GoDaddy WebsiteBuilder no apex pode bloquear toda a emissão de SSL na Vercel
**Problema:** `prevlegal.com.br` aparentava estar configurado, mas o apex ainda respondia pelo WebsiteBuilder da GoDaddy, enquanto `www`, `app` e `admin` ficavam presos em `Invalid Configuration` ou aguardando certificado
**Causa:** O domínio raiz estava misturando IP da GoDaddy com IPs da Vercel. Enquanto o apex não validava corretamente, a cadeia de SSL e de configuração dos subdomínios ficava inconsistente
**Correção:** Remover o apontamento do apex para a GoDaddy, deixar o `@` somente na configuração pedida pela Vercel e aguardar a emissão em cascata dos certificados
**Sinal prático:** Se `https://prevlegal.com.br` responder com `Server: DPS/2.0.0-beta`, ainda está servindo GoDaddy e não Vercel
**Regra prática:** Em migração de domínio para a Vercel, nunca considerar DNS "ok" só porque `www/app/admin` já apontam por CNAME. O primeiro checkpoint real é o apex deixar de responder GoDaddy e começar a mostrar `Generating SSL Certificate` no painel

### 39. Reautenticação seletiva funciona melhor do que expirar tudo a cada ação sensível
**Problema:** Proteger financeiro e admin apenas com login inicial deixa áreas críticas expostas em máquinas compartilhadas; proteger tudo com login constante degrada demais a UX
**Causa:** O app mistura uso operacional frequente com áreas sensíveis que exigem um nível extra de confiança
**Correção:** Adotar dois mecanismos combinados:
- timeout por inatividade da sessão (`45 min` app, `15 min` admin)
- reautenticação recente apenas para financeiro e operações administrativas críticas
**Regra prática:** No PrevLegal, sessão expira por abandono da máquina; ações e telas sensíveis exigem um carimbo recente de reauth, não um novo login completo em cada navegação

### 40. Middleware do app e auth do admin precisam ser tratados como trilhas diferentes
**Problema:** O app usa Supabase auth, enquanto o admin usa cookie próprio httpOnly; tratar ambos como se fossem a mesma sessão causa redirecionamentos errados
**Causa:** O proxy global protegia rotas com base em uma única lógica de autenticação
**Correção:** Separar a trilha do admin dentro do middleware/proxy:
- `/admin` valida `admin_token` e cookie de atividade do admin
- app normal valida usuário Supabase e cookie de atividade do app
**Regra prática:** Sempre que coexistirem auths diferentes no mesmo domínio, o middleware deve reconhecer explicitamente cada área antes de aplicar redirecionamentos

### 41. Cookie ausente de reautenticação deve falhar fechado, não passar silenciosamente
**Problema:** As APIs sensíveis do admin respondiam normalmente mesmo sem cookie recente de reautenticação
**Causa:** O helper considerava timestamp ausente como "não expirado", o que abre uma brecha lógica
**Correção:** `hasRecentReauth` e `verificarAdminReauthRecente` agora exigem timestamp válido antes de aceitar a sessão
**Regra prática:** Em qualquer verificação de reauth no PrevLegal, ausência do cookie deve ser tratada como falha de segurança, nunca como sessão válida

### 42. Sandbox do WhatsApp precisa usar o mesmo número em Twilio, env e UI
**Problema:** O painel da Twilio mostrava o sandbox `whatsapp:+14155238886`, mas o ambiente local estava configurado com outro número de origem
**Causa:** O projeto evoluiu com defaults corretos na UI, mas o `.env.local` ficou divergente
**Correção:** Alinhar `TWILIO_WHATSAPP_NUMBER` com o sender real do sandbox e manter os webhooks apontando para a mesma `APP_URL`
**Regra prática:** Em teste com Twilio WhatsApp Sandbox, sempre conferir este trio antes de depurar o app:
- número `From` no painel Twilio
- `TWILIO_WHATSAPP_NUMBER`
- URLs `/api/webhooks/twilio` e `/api/webhooks/twilio/status`

### 43. Cadastro manual de lead precisa gerar NB técnico quando o banco ainda exige `nb NOT NULL`
**Problema:** O modal de novo lead voltava a quebrar com `null value in column "nb" of relation "leads" violates not-null constraint`
**Causa:** O modelo legado continua tratando `nb` como obrigatório e único, mesmo para leads avulsos criados sem número de benefício
**Correção:** A API de criação manual passou a gerar um `nb` técnico no formato `MANUAL-<telefone|cpf|timestamp>` quando o campo vier vazio
**Regra prática:** Enquanto o schema legado exigir `nb` obrigatório, todo cadastro manual deve receber um identificador técnico estável em vez de enviar `null`

### 44. Reset de senha do responsavel precisa mandar email real e ter pagina de conclusao
**Problema:** `generateLink({ type: 'recovery' })` nao fechava o fluxo real de senha do responsavel no produto
**Correcao:** O PrevLegal passou a usar `auth.resetPasswordForEmail()` com redirect para `auth/redefinir-senha`, e essa pagina conclui a troca com `auth.updateUser({ password })`
**Regra pratica:** Sempre que o sistema disser que enviou email de redefinicao, o produto precisa ter a pagina final de nova senha pronta e publicada

### 45. Provisionamento do responsavel nao pode depender de `tenant_id` em `usuarios`
**Problema:** Recriar acesso do responsavel e aceitar convite quebravam com `column usuarios.tenant_id does not exist`
**Causa:** Parte do fluxo novo assumiu multi-tenant fisico na tabela `usuarios`, mas o schema operacional atual continua sem essa coluna
**Correcao:** Remover `tenant_id` dos selects e payloads em `src/app/api/admin/tenants/[id]/recriar-acesso/route.ts` e `src/app/api/usuarios/aceitar-convite/route.ts`
**Regra pratica:** Enquanto `usuarios` nao tiver isolamento real por tenant, sincronizar provisao e convites usando `email`, `auth_id`, `role` e estado do convite, nunca `tenant_id`

### 46. Trigger de `auth.users` exige provisionamento temporario quando o registro logico do usuario ja existe
**Problema:** `auth.admin.createUser()` retornava `Database error creating new user` ao reprovisionar responsaveis ou aceitar convite de email que ja existia em `public.usuarios`
**Causa:** O trigger `public.handle_new_user()` insere automaticamente em `public.usuarios`; se a linha logica do usuario ja existe, o insert automatico colide com o `UNIQUE(email)` antes do fluxo customizado conseguir sincronizar
**Correcao:** Criar o usuario Auth com email tecnico temporario, remover a linha automatica criada pelo trigger e depois atualizar `auth.users` + reaproveitar a linha original de `public.usuarios`
**Regra pratica:** Em reonboarding no PrevLegal, preservar o `id` funcional de `usuarios` e tratar o trigger de `auth.users` como etapa automatica que precisa ser neutralizada quando o usuario ja existe na base operacional

### 47. Responsavel provisionado nao deve continuar aceitando link antigo de convite
**Problema:** O usuario podia clicar num email antigo de `/auth/aceitar-convite` e cair de novo no fluxo legado, mesmo depois de o responsavel ja ter sido provisionado pelo admin
**Causa:** O endpoint de validacao do convite aceitava qualquer token ainda valido sem checar se aquele email ja tinha `auth_id` ativo em `usuarios`
**Correcao:** `src/app/api/usuarios/convite/route.ts` agora rejeita convites obsoletos para emails ja provisionados, e `src/app/auth/aceitar-convite/page.tsx` mostra mensagem clara para usar o email mais recente de definicao de senha ou fazer login
**Regra pratica:** Para responsavel de escritorio, o fluxo oficial e `Gerar acesso do responsavel` + email de definicao de senha; convite antigo nao deve mais competir com esse caminho

### 48. Dominio do site do escritorio nao garante dominio valido para email
**Problema:** O tenant estava com `jessica@alexandrini.com.br`, mas o envio de acesso/reset falhava com email invalido
**Causa:** `alexandrini.com.br` nao recebe email (`MX 0 .`), enquanto o dominio real de caixa postal e `alexandrini.adv.br`
**Correcao:** Atualizar o responsavel para `jessica@alexandrini.adv.br` e reprovisionar o acesso do responsavel
**Regra pratica:** Antes de concluir que o erro e do fluxo de auth, validar se o dominio do email do escritorio realmente possui MX funcional; dominio de site e dominio de email podem ser diferentes

### 49. Quando site e app compartilham o mesmo projeto Vercel, o host publico pode acabar herdando redirects errados
**Problema:** `www.prevlegal.com.br` chegou a cair no `/login`, porque estava apontando para o mesmo projeto do app, cuja raiz redireciona para autenticacao
**Causa:** Marketing/site e plataforma estavam disputando o mesmo deploy e o mesmo comportamento de rota raiz
**Correcao:** Separar a LP em um projeto Vercel dedicado (`prevlegal-site`, `Root Directory = site`) e deixar o projeto principal apenas com `app.prevlegal.com.br` e `admin.prevlegal.com.br`
**Regra pratica:** No PrevLegal, `www` deve servir o site em projeto proprio; `app` e `admin` ficam no projeto da plataforma. Nao reutilizar o mesmo host/projeto para LP e produto autenticado

### 50. Vercel CLI pode exigir branch especifica para env de Preview
**Problema:** Ao tentar alinhar `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_SITE_URL` no ambiente `Preview`, a CLI retornou `git_branch_required`
**Causa:** Neste projeto/time, a Vercel esta tratando `Preview` como env branch-specific no fluxo da CLI atual
**Correcao:** Fechar o cutover em `Production` e `Development`, registrar a limitacao no handoff e tratar `Preview` explicitamente por branch quando necessario
**Regra pratica:** Ao atualizar envs de dominio na Vercel via CLI, nao assumir que `Preview` aceita valor global; validar o comportamento do projeto antes de marcar a migracao como totalmente alinhada em todos os ambientes

### 51. Supabase Auth pode ignorar `redirectTo` e cair em `localhost` quando a URL de Auth do projeto esta desatualizada
**Problema:** O email de primeiro acesso chegou, mas ao clicar abriu `http://localhost:3000/#error=access_denied...`
**Causa confirmada:** A geracao real de link no Supabase retornou `redirect_to=http://localhost:3000`, mesmo quando o app pediu `https://app.prevlegal.com.br/auth/redefinir-senha`
**Correcao aplicada no produto:** criar um caminho de contingencia com link manual em `app.prevlegal.com.br/auth/confirm`, gerado no admin por `src/app/api/admin/tenants/[id]/link-acesso/route.ts`
**Correcao externa ainda necessaria:** ajustar no painel do Supabase Auth a URL base/allowlist para o dominio `app.prevlegal.com.br`
**Regra pratica:** Se o email de recovery/primeiro acesso abrir `localhost`, o problema esta no Auth URL Configuration do Supabase, nao no `redirectTo` do codigo

### 52. O produto ainda nao tem isolamento real por escritorio no banco operacional
**Problema:** Um novo escritorio logado passou a enxergar leads, conversas, listas, financeiro, configuracoes e outros dados da Jessica
**Causa confirmada:** O banco operacional e as APIs principais continuam sem `tenant_id` funcional nas tabelas de negocio e sem filtros de isolamento por escritorio; o modelo atual se comporta como single-tenant
**Impacto:** Risco critico de LGPD, quebra de sigilo operacional e violacao etica entre escritorios
**Contencao recomendada:** Nao onboardar mais de um escritorio real no mesmo banco/app sem isolamento; tratar como incidente P0
**Regra pratica:** Multiusuario com roles nao significa multi-tenant. Antes de cadastrar um segundo escritorio em producao, todas as superficies de negocio precisam filtrar por tenant/escritorio

### 53. Google OAuth em mudanca de dominio precisa ser ajustado no Google Cloud Console, nao so no codigo
**Problema:** Ao tentar conectar Google Calendar, a tela exibiu `Erro 400: invalid_request` com bloqueio de autorizacao
**Causa mais provavel no contexto atual:** O dominio/callback mudou para `app.prevlegal.com.br`, mas o OAuth Client do Google nao foi alinhado no Console com os novos redirect URIs/origins e possivelmente com a tela de consentimento
**Correcao operacional:** Revisar o OAuth Client no Google Cloud Console usando navegador autenticado e garantir os redirect URIs do dominio `app`
**Regra pratica:** Sempre que APP_URL muda, revisar imediatamente Google OAuth Client e tela de consentimento; so mudar env no app nao conclui a integracao

### 54. Em incidente P0 de multi-tenant, uma allowlist temporaria no middleware e melhor do que deixar o ambiente “meio aberto”
**Problema:** Sem isolamento real, um segundo escritorio autenticado conseguia navegar por dados de outro escritorio
**Causa:** O app ainda opera como single-tenant em partes relevantes; esperar a modelagem completa sem contencao deixaria o vazamento ativo
**Correcao aplicada:** Adotar contencao temporaria no middleware, permitindo acesso apenas a uma allowlist minima de emails enquanto a Fase 26 nao termina
**Regra pratica:** Quando houver risco LGPD imediato, primeiro conter o acesso, depois modelar a arquitetura definitiva

### 55. Importacao de lista nao pode “parecer sucesso” quando o batch de leads falha
**Problema:** A lista era criada e aparecia na UI, mas os leads nao entravam no banco; ainda assim o fluxo terminava sem erro util
**Causa:** A rota `/api/import` criava a lista primeiro e depois engolia o erro do `upsert` em batch, apenas deixando `inseridos = 0`
**Correcao aplicada:** Fazer fallback row-by-row quando um batch falha, expor o primeiro erro real ao usuario e remover a lista criada se nenhum lead for inserido
**Regra pratica:** Em importacao em lote, nunca concluir o fluxo como sucesso se a entidade-pai foi criada mas os registros-filho falharam silenciosamente

### 56. UI e API precisam falar os mesmos nomes de campo para os totais da lista
**Problema:** A pagina `/listas` mostrava contadores zerados ou vazios mesmo quando a lista possuia dados agregados
**Causa:** O banco grava `total_com_whatsapp`, `total_sem_whatsapp` e `total_nao_verificado`, mas a UI esperava `com_whatsapp`, `sem_whatsapp` e `nao_verificado`
**Correcao aplicada:** Mapear os nomes reais na API `/api/listas` antes de responder para a UI
**Regra pratica:** Quando a interface usar nomes derivados mais amigaveis do que o schema, a adaptacao deve acontecer na API e nao ficar implícita

### 57. Duplicidade de lista precisa ser bloqueada no tenant antes de persistir a importacao
**Problema:** A mesma planilha foi importada duas vezes no mesmo escritorio, criando conflito operacional e duplicidade de base
**Causa:** Nao havia validacao previa por `tenant_id` + `nome`/`arquivo_original`
**Correcao aplicada:** Bloquear a importacao se ja existir lista com o mesmo nome ou arquivo original no mesmo tenant
**Regra pratica:** Em fluxos de importacao manual, sempre validar duplicidade de lote antes de criar a lista/pai

### 58. Google OAuth pode quebrar por `redirect_uri` com whitespace invisivel
**Problema:** O Google Calendar retornou `Erro 400: invalid_request` apontando para `redirect_uri=https://app.prevlegal.com.br/api/google/callback`
**Causa:** Alem da necessidade de cadastrar a URI no Google Cloud Console, a env `GOOGLE_REDIRECT_URI` estava com quebra de linha no fim, o que pode gerar mismatch dificil de enxergar
**Correcao aplicada:** Normalizar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` com `trim()` antes de criar o `OAuth2 client`
**Regra pratica:** Em integrações OAuth, sempre sanitizar envs usadas em `redirect_uri`; um whitespace invisivel basta para o provedor devolver `invalid_request`

### 62. Se a conexao Google nasce na aba de agendamentos, o callback deve voltar para agendamentos
**Problema:** O usuario iniciava `Conectar Google` em `/agendamentos`, mas ao concluir o consentimento era redirecionado para `/configuracoes`, enquanto o feedback visual de sucesso/erro estava implementado apenas na aba de agendamentos
**Causa:** O callback do OAuth salvava o token corretamente, mas devolvia para uma tela diferente da que consumia `?google=conectado|erro`
**Correcao aplicada:** Redirecionar o callback para `/agendamentos` e alinhar `src/lib/google-calendar.ts` ao mesmo `trim()` das envs usado nas rotas de auth/callback
**Regra pratica:** Em integrações OAuth do PrevLegal, a tela que inicia a conexão deve ser a mesma que recebe o retorno e confirma o estado conectado para o usuário

### 63. Google OAuth em producao pede paginas publicas reais de privacidade e termos no dominio do site
**Problema:** Para sair de `Testing` no Google Auth Platform e publicar o consent screen, o app precisava de links publicos de homepage, privacidade e termos
**Causa:** A LP tinha links legais no footer ainda apontando para `#`, o que nao resolve exigencias de consentimento/verificacao
**Correcao aplicada:** Criar paginas publicas em `https://www.prevlegal.com.br/privacidade` e `https://www.prevlegal.com.br/termos`, ligar esses links no footer da LP e incluir ambas no sitemap do site
**Regra pratica:** Sempre que o PrevLegal precisar publicar OAuth externo em producao, o dominio publico deve oferecer homepage, politica de privacidade e termos acessiveis e indexaveis

### 64. Google Calendar pode “conectar e desconectar” quando o callback redireciona sucesso sem persistir o token
**Problema:** O usuario concluia o OAuth, voltava para `/agendamentos` com toast de sucesso, mas a UI em seguida mostrava Google desconectado
**Causa confirmada:** A rota `src/app/api/google/callback/route.ts` podia cair no branch de insert da tabela `configuracoes` logo apos o reset operacional; esse insert nao enviava `nome_escritorio`, ignorava erro e redirecionava como sucesso mesmo sem gravar `google_calendar_token`. Alem disso, leitura e escrita de `configuracoes` ainda estavam sem filtro por `tenant_id`
**Correcao aplicada:** Criar helper de configuracoes por tenant em `src/lib/configuracoes.ts`, garantir a existencia de uma linha valida com `nome_escritorio` default antes de salvar o token e ancorar `callback`, `status`, `google-calendar`, `/api/configuracoes` e `/api/agente/config` no `tenant_id` atual
**Regra pratica:** No PrevLegal pos-reset multi-tenant, qualquer fluxo que leia ou escreva `configuracoes` precisa ser tenant-aware e nunca pode sinalizar sucesso ao usuario sem conferir o resultado real da persistencia

### 65. Atalho de contato so gera velocidade real quando cai direto na thread certa ou abre o WhatsApp sem friccao
**Problema:** Em varios pontos do produto o operador via o lead, mas precisava navegar manualmente ate a `Caixa de Entrada` ou sair procurando o numero para iniciar contato
**Causa:** Havia leitura de conversa e historico, mas faltavam CTAs operacionais consistentes entre lead, drawer, agendamentos e busca global
**Correcao aplicada:** Criar helper compartilhado de atalhos em `src/lib/contact-shortcuts.ts`, adicionar links para `Caixa de Entrada` e `WhatsApp` em `lead drawer`, detalhe do lead, modal de mensagens e agendamentos, e fazer a inbox aceitar deep-link por `conversaId`/`telefone`
**Regra pratica:** No PrevLegal, superficies operacionais que exibem um lead precisam oferecer pelo menos um atalho de contato imediato; ver dado sem conseguir agir gera friccao e reduz conversao operacional

### 66. Runtime de campanhas WhatsApp nao pode depender de tabelas legado fora do schema operacional atual
**Problema:** O disparo de campanhas ainda buscava leads em `lista_leads`, tentava reservar numero em `numeros_whatsapp` e usava status que nao existem mais no enum atual
**Causa:** O fluxo de campanhas preservou fragmentos de um modelo antigo, anterior ao schema consolidado em `leads.lista_id`, credenciais por tenant e enum `campanha_status` com `encerrada`
**Correcao aplicada:** Reancorar `src/app/api/campanhas/route.ts` e `src/app/api/campanhas/[id]/disparar/route.ts` no schema operacional vigente: validar `lista_id` dentro do tenant, contar/envia leads a partir de `leads`, resolver Twilio por `tenant_id` e finalizar campanhas com `encerrada`
**Regra pratica:** Quando houver reset operacional ou transicao de modelo, o runtime de campanhas precisa refletir exatamente o schema ativo do banco; manter referencia a tabela legado e uma fonte comum de bug silencioso

### 67. Webhook e automacao Twilio precisam rotear por tenant a partir do numero WhatsApp de destino
**Problema:** Mesmo com credenciais Twilio por tenant, inbound webhook, resposta manual e automacao do agente ainda podiam ler `configuracoes` globais ou validar assinatura com token incorreto
**Causa:** O envio multi-tenant foi centralizado antes do recebimento e da automacao; faltava usar o numero WhatsApp do tenant como ancora de roteamento para webhook, conversa, notificacao e prompt do agente
**Correcao aplicada:** Expandir `src/lib/twilio.ts` com routing por numero WhatsApp, gravar `tenant_id` em `mensagens_inbound` e `notificacoes`, filtrar/upsert `conversas` por tenant e fazer `src/app/api/agente/responder/route.ts` e `src/app/api/webhooks/twilio*/route.ts` lerem `configuracoes`/auth no contexto do tenant certo
**Regra pratica:** No PrevLegal multi-tenant, o numero Twilio do escritorio e a chave de roteamento do inbound; qualquer webhook ou automacao que ignore isso corre risco de quebrar assinatura, notificar o lugar errado ou vazar contexto entre escritorios

### 68. O lead precisa permitir abordagem ativa sem depender de conversa previa
**Problema:** O detalhe do lead ja ajudava a abrir uma thread existente, mas nao permitia ao advogado iniciar um contato manual quando ainda nao havia conversa aberta
**Causa:** O fluxo operacional estava centrado na `Caixa de Entrada` como lugar de resposta, nao como ponto unico de criacao da conversa
**Correcao aplicada:** Adicionar um fluxo de `Iniciar conversa` no detalhe do lead e no drawer, com modal de primeira mensagem e backend dedicado em `src/app/api/leads/[id]/iniciar-conversa/route.ts` para criar/assumir a thread humana, enviar a mensagem inicial e redirecionar para a inbox na thread correta
**Regra pratica:** No PrevLegal, o lead detail nao deve ser apenas leitura; se o operador decidiu agir sobre um lead especifico, ele precisa conseguir iniciar a conversa dali mesmo, sem friccao e sem depender de thread preexistente

### 69. Runtime de WhatsApp precisa normalizar telefone visual antes de enviar ao provider
**Problema:** O fluxo `Iniciar conversa` falhou com `The 'To' number whatsapp:(41) 99236-1868 is not a valid phone number`
**Causa:** O lead guardava telefone em formato humano e o runtime repassava esse valor cru ao provider
**Correcao aplicada:** Centralizar no `sendWhatsApp` a normalizacao do destinatario para E.164 brasileiro, aceitando formatos como `(41) 99236-1868`, `41992361868` e `+5541992361868`
**Regra pratica:** No PrevLegal, todo envio WhatsApp deve normalizar o numero no backend; nao confiar que o cadastro do lead ja esta no formato tecnico correto

### 70. Numero novo em provider nao-oficial precisa de warm-up enforce no backend, nao apenas “boa vontade” operacional
**Problema:** O produto ja tinha delays, lotes e limite diario, mas os defaults (`500/dia`, lote `50`, pausa `30s`, delay `1.5s-3.5s`) ainda permitiam blast agressivo demais para um numero novo de `Z-API`
**Causa:** Os freios existentes foram pensados para um sender mais estabelecido e nao havia politica de warm-up por canal
**Correcao aplicada:** Criar `src/lib/whatsapp-warmup.ts`, ler `metadata.warmup_*` do canal em `whatsapp_numbers`, clampando campanhas na criacao e no disparo com caps conservadores (`15/dia`, lote `5`, pausa `600s`, delay `60s-180s`)
**Regra pratica:** Se o canal estiver em warm-up, o backend deve impor caps conservadores automaticamente; isso nao pode depender de o operador lembrar de baixar os numeros manualmente

### 71. Canais WhatsApp precisam aceitar estado de rascunho antes de ficarem ativos
**Problema:** O schema de `whatsapp_numbers` exigia credenciais completas mesmo para canais ainda nao plugados, o que impedia registrar hoje um numero de amanha sem usar placeholder feio
**Causa:** As constraints iniciais de `032` validavam credenciais por provider sem considerar se o canal estava `ativo`
**Correcao aplicada:** A migration `033_whatsapp_warmup_and_drafts.sql` relaxa as constraints para exigir credenciais apenas quando o canal esta ativo, e as rotas admin passaram a aceitar `Twilio`/`Z-API` pausados como rascunho
**Regra pratica:** No PrevLegal, um canal WhatsApp pode existir em modo rascunho/inativo antes das credenciais finais; ativacao e que deve exigir completude tecnica

### 72. O lead detail nao pode ser so consulta; ele precisa permitir enriquecimento operacional do cadastro
**Problema:** O advogado conseguia ver o lead e conversar com ele, mas nao conseguia corrigir ou complementar os dados quando o cliente trazia novas informacoes no meio do atendimento
**Causa:** O detalhe do lead e o drawer tinham apenas leitura, e a API do lead expunha `GET` sem rota de atualizacao
**Correcao aplicada:** Criar `PATCH /api/leads/[id]` com whitelist de campos editaveis e adicionar o CTA `Editar dados` no detalhe e no drawer usando um modal compartilhado
**Regra pratica:** No PrevLegal, qualquer superficie operacional que concentra contexto do lead tambem deve permitir editar o cadastro basico; obrigar nova importacao ou SQL para complementar dados mata autonomia do operador

### 73. Inbox humana vira operacao de verdade quando conversa tem estado, ownership e reabertura automatica
**Problema:** A `Caixa de Entrada` ja permitia assumir uma conversa, mas ainda tratava quase tudo como binario entre `agente` e `humano`, sem fila operacional real
**Causa:** A UI ignorava parte do potencial da modelagem (`assumido_por`, `assumido_em`) e o webhook inbound nao sabia reabrir threads que estavam aguardando cliente ou resolvidas
**Correcao aplicada:** Expandir a inbox com estados `aguardando_cliente` e `resolvido`, usar `assumido_em` na leitura operacional, sanitizar `PATCH /api/conversas/[id]` com acoes explicitas (`assume`, `awaiting_customer`, `resolve`, `reopen`, `return_to_agent`, `mark_read`) e fazer o webhook Twilio reabrir para `humano` quando o cliente responde nessas filas
**Regra pratica:** No PrevLegal, fila humana nao pode ser apenas um badge; conversa assumida precisa ter ownership explicito, estados operacionais claros e reabertura automatica quando o cliente volta a falar

### 74. Agendamentos operacionais precisam ser fila de trabalho, nao apenas agenda cronologica
**Problema:** A tela de `Agendamentos` mostrava os eventos em ordem temporal, mas faltava leitura de operacao: o que ainda precisa confirmar, o que ja esta validado e quem e o responsavel atual
**Causa:** A UI tratava quase tudo como `agendado`/`realizado`/`cancelado`, e a API de update ainda nao reforcava tenant/access nem usava o enum completo (`confirmado`, `remarcado`)
**Correcao aplicada:** Transformar a tela em fila operacional com secoes (`Fila que precisa confirmacao`, `Confirmados`, `Historico recente`), quick actions de `confirmar`, `remarcar`, `realizado` e `cancelar`, reatribuicao de responsavel para admin e endurecimento de `PATCH/DELETE /api/agendamentos/[id]` com `tenant_id`, validacao de acesso e sincronizacao do status do lead
**Regra pratica:** No PrevLegal, agendamento gerado pelo agente precisa virar tarefa operacional com dono e proxima acao explicita; mostrar apenas a data da reuniao nao basta para a equipe executar bem

### 75. Saude do tenant no admin so serve para tomada de decisao quando as metricas estao filtradas pelo tenant certo
**Problema:** O detalhe do tenant no admin exibia sinais de uso, mas a rota de metricas ainda fazia varias contagens sem ancora explicita em `tenant_id`, o que fragilizava a leitura executiva
**Causa:** O painel cresceu primeiro como visao de produto e so depois virou ferramenta operacional de CS/comercial; faltava endurecer o recorte por tenant e adicionar sinais mais proximos de adocao real
**Correcao aplicada:** Reancorar `src/app/api/admin/tenants/[id]/metricas/route.ts` em `tenant_id` para leads, conversas, campanhas, contratos, portal, agendamentos e usuarios; adicionar `ultimoAcessoEquipe`, `usuariosAtivos7d`, `conversas7d`, `agendamentosPendentes`, `riscoOperacional` e `resumoSaude`; e expor isso em `src/app/admin/[id]/page.tsx`
**Regra pratica:** No PrevLegal, dashboard executivo sem filtro tenant-aware vira uma falsa sensação de controle; metrica de saúde precisa refletir uso real do escritório e não ruído global da base

### 59. A lista tecnica de cadastro manual nao deve disputar espaco com listas importadas
**Problema:** O agrupador tecnico `Cadastro manual` aparecia na aba de listas como se fosse uma importacao operacional, poluindo a leitura do escritorio
**Causa:** A API de listas retornava indiscriminadamente todas as `listas`, inclusive a lista interna criada para suportar leads avulsos
**Correcao aplicada:** Excluir a lista tecnica da listagem padrao e orientar na UI que cadastros manuais ficam agrupados no Kanban de Leads
**Regra pratica:** Estruturas tecnicas de apoio nao devem aparecer na mesma camada visual das entidades operacionais do usuario final

### 60. Exclusao de lista precisa existir na plataforma para corrigir importacao ruim sem SQL manual
**Problema:** Quando uma lista foi importada de forma errada, nao havia como removê-la pela plataforma
**Causa:** Faltava endpoint de exclusao e acao na UI
**Correcao aplicada:** Criar `DELETE /api/listas/[id]` para excluir a lista importada e os leads vinculados, com escopo por tenant e bloqueio da lista tecnica manual
**Regra pratica:** Fluxos de importacao precisam ter um caminho de reversao operacional dentro do produto, sem depender de acesso ao banco

### 61. Tema claro/escuro funciona melhor quando nasce das variaveis globais, nao de ajustes isolados por tela
**Problema:** O dashboard inteiro operava apenas em modo escuro
**Causa:** As telas dependiam de variaveis CSS globais, mas so existia uma paleta
**Correcao aplicada:** Criar paletas `dark` e `light` em `globals.css`, inicializacao no `RootLayout` via `data-theme` e um toggle persistido em `localStorage`
**Regra pratica:** Quando a UI ja usa CSS vars de tema, a forma menos invasiva de adicionar modo claro/escuro e trocar as variaveis globais, nao reescrever componente por componente

### 76. Agendamento manual pode falhar como descoberta de produto mesmo quando a API ja existe
**Problema:** O sistema parecia so permitir agendamento criado pelo agente, porque a interface nao oferecia CTA humano para marcar consulta manualmente
**Causa:** `POST /api/agendamentos` ja existia, mas a tela de agendamentos e o contexto do lead nao expunham esse fluxo
**Correcao aplicada:** Criar um modal unico de `Novo agendamento` e plugar o CTA em:
- `/agendamentos`
- detalhe do lead
- `lead drawer`
**Regra pratica:** Se a operacao humana precisa executar uma acao obvia depois da qualificacao, a capacidade nao pode ficar escondida so na API ou em automacao do agente

### 77. Agendamentos precisam nascer tenant-aware, nao apenas serem editados tenant-aware
**Problema:** A manutencao de agendamentos ja validava `tenant_id`, mas a criacao e a listagem ainda deixavam margem para leitura/insercao menos canonica
**Causa:** A rota `POST /api/agendamentos` foi criada antes do endurecimento multi-tenant mais recente
**Correcao aplicada:** `GET /api/agendamentos` passou a filtrar explicitamente por `tenant_id`, e `POST /api/agendamentos` agora:
- valida o lead dentro do tenant atual
- valida o usuario responsavel dentro do tenant atual
- insere `tenant_id` no novo agendamento
**Regra pratica:** Em transicoes para multi-tenant real, nao basta endurecer update/delete; a criacao e a listagem inicial tambem precisam carregar o escopo canonico

### 78. Busca operacional nao pode esconder lead valido por filtro booleano estrito demais
**Problema:** No modal de agendamento manual, o operador digitava nome ou telefone corretamente e nao encontrava o lead
**Causa:** A busca curta filtrava com `lgpd_optout = false`, entao leads com valor nulo nesse campo sumiam da lista mesmo sendo operacionalmente validos
**Correcao aplicada:** Trocar o filtro para `lgpd_optout != true` e reforcar a UX do modal com busca reativa + botao explicito `Buscar lead`
**Regra pratica:** Em fluxos de busca operacional do PrevLegal, filtros booleanos devem tratar `null` como estado legivel quando esse valor ainda e comum na base

### 79. Convite de reuniao precisa aceitar email operacional do momento, nao so o email historico do lead
**Problema:** O lead pode avancar na conversa usando um email diferente do cadastro original, e o operador ficava preso ao email antigo na hora de marcar a consulta
**Causa:** O agendamento reutilizava apenas `lead.email` para o Google Calendar
**Correcao aplicada:** O modal manual ganhou o campo `E-mail da reunião`, e `POST /api/agendamentos` agora aceita `email_reuniao` para sobrescrever o `emailLead` enviado ao Google Calendar
**Regra pratica:** No PrevLegal, dados de contato usados para operacionalizar a proxima acao precisam aceitar override humano quando a conversa trouxer informacao mais atual do que a base

### 80. Agendamento vira muito mais legivel quando combina fila operacional com calendario visual
**Problema:** Mesmo com a fila de confirmacao/remarcacao melhorada, a tela de agendamentos ainda exigia leitura linear demais para quem pensa em agenda como bloco visual de tempo
**Causa:** A UI tinha uma boa camada operacional, mas faltava a representacao espacial do mes que usuarios acostumados ao Google Calendar esperam
**Correcao aplicada:** Adicionar uma visao mensal na propria tela `/agendamentos`, com cores por status e clique no evento para abrir um painel/modal com as mesmas acoes operacionais da fila
**Regra pratica:** No PrevLegal, agenda nao deve ser so lista de tarefas nem so calendario bonito; a melhor UX combina leitura temporal visual com acoes diretas de operacao

### 81. Busca operacional de lead fica mais confiavel quando a normalizacao sai do PostgREST e vai para o servidor
**Problema:** Mesmo digitando nome ou telefone corretamente, o modal de agendamento ainda podia nao encontrar o lead
**Causa:** A busca curta dependia de `or(...)` com `ilike` no PostgREST, o que fica frágil com telefone formatado, acentos e combinacoes com `null`
**Correcao aplicada:** Buscar um conjunto curto tenant-aware no banco e filtrar no servidor com normalizacao de texto e digitos de telefone antes de devolver os resultados
**Regra pratica:** Em buscas operacionais pequenas do PrevLegal, confiabilidade vale mais do que “query esperta”; quando o matching ficar frágil demais no SQL, normalize no servidor e devolva um resultado mais previsível

### 82. Picker de lead para agendamento nao deve depender nem de email nem do dono atual do lead
**Problema:** No modal de agendamento manual, o operador podia digitar o nome certo e ainda assim nao ver o lead para selecionar
**Causa:** O problema nao era falta de email; o gargalo estava na combinacao de duas coisas: a busca curta continuava sensivel ao escopo do usuario e o picker ainda dependia demais de um fluxo de selecao mais fragil
**Correcao aplicada:** Tornar `GET /api/leads` explicitamente tenant-aware com `scope=scheduling`, remover a restricao por `responsavel_id` nesse escopo, endurecer `/api/busca` com `tenant_id` explicito e trocar o select nativo do modal por uma lista clicavel que mescla resultados das duas rotas
**Regra pratica:** Em fluxo operacional de agenda, o usuario precisa encontrar rapidamente qualquer lead relevante do tenant; email pode ajudar no convite, mas nunca pode ser precondicao invisivel para o lead aparecer no picker

### 83. Busca digitada nao pode depender de coluna que ainda nao existe no schema operacional
**Problema:** No modal global de `Novo agendamento`, clicar no campo mostrava alguns leads, mas digitar o nome fazia a busca falhar
**Causa:** `GET /api/leads` ainda montava o filtro `email.ilike...` quando havia texto digitado, mas `leads.email` ainda nao existe no schema operacional atual
**Correcao aplicada:** Remover `email.ilike` da busca curta e alinhar o recorte tenant-aware de superfícies relacionadas (`tenant-context`, tela de leads, relatórios e portal threads)
**Regra pratica:** Antes de enriquecer uma busca operacional com novos campos, confirmar que o schema remoto realmente contem essas colunas; se o schema ainda nao estiver alinhado, a busca deve degradar de forma segura em vez de quebrar so quando o usuario digita

### 84. Status do lead sozinho nao conta o pipeline real da operacao
**Problema:** O produto ja tinha lead, conversa, inbox humana, agendamento e contrato, mas a leitura executiva ainda ficava fragmentada e dependente demais do `status` do lead
**Causa:** Cada modulo cresceu bem isoladamente, mas faltava uma camada que unificasse o funil operacional completo
**Correcao aplicada:** Adicionar em `/api/relatorios` um `pipelineOperacional` que cruza conversas, fila humana, agendamentos e contratos por `lead_id`, e expor isso na aba `Funil` de `/relatorios`
**Regra pratica:** Quando o PrevLegal evoluir um caso por mais de um modulo, os relatórios precisam mostrar a travessia inteira, nao apenas o último status gravado no lead

### 85. Dashboard precisa filtrar por tenant explicitamente mesmo quando o restante do app ja endureceu
**Problema:** A leitura rápida da home podia continuar vendo leads fora do tenant atual mesmo com outras áreas já tenant-aware
**Causa:** O `Dashboard` ainda consultava `leads` só por `responsavel_id` / `lgpd_optout`, sem `tenant_id` explícito
**Correcao aplicada:** Adicionar filtro por `tenant_id` nas queries de leads e stats do dashboard
**Regra pratica:** Em transições de hardening multi-tenant, telas “resumo” costumam sobrar para trás; revisar sempre dashboard, relatórios e buscas globais depois de endurecer as rotas principais

### 86. Funil executivo fica muito mais útil quando cada etapa cai numa fila real
**Problema:** O pipeline em `/relatorios` mostrava bem o estágio da operação, mas ainda parava em insight e obrigava o usuário a navegar manualmente até a fila certa
**Causa:** As telas operacionais já existiam, mas não liam parâmetros simples de URL para abrir o recorte desejado
**Correcao aplicada:** Tornar os cards do pipeline clicáveis e ensinar:
- `Caixa de Entrada` a respeitar `tab`
- `Agendamentos` a respeitar `status`
- `Financeiro` a respeitar `filtro`
**Regra pratica:** Sempre que um dashboard do PrevLegal mostrar uma quantidade operacional relevante, o próximo clique precisa levar para uma fila acionável, não para uma navegação em branco

### 87. O PrevLegal nao deve competir como “mais um software de calculo previdenciario”
**Problema:** A comparacao com ferramentas como `Prévius` e `Tramitação Inteligente` pode empurrar o produto para uma corrida de checklist de calculo puro
**Causa:** O mercado ja tem polos bem definidos:
- profundidade tecnica de calculo
- conveniencia operacional de escritorio
**Correcao aplicada:** Registrar como tese de produto que o PrevLegal deve unir:
- CRM
- IA
- operacao comercial
- atendimento
- agenda
- contrato
- calculo integrado ao lead
**Regra pratica:** Toda nova frente previdenciaria deve ser avaliada pelo quanto ela fortalece o fluxo completo do lead, e nao apenas pela sofisticacao isolada do motor de calculo

### 88. Modulos premium previdenciarios fazem mais sentido do que inflar o core com tudo de uma vez
**Problema:** Blocos como pecas com IA, acompanhamento processual e totalizacao internacional tem alto valor, mas aumentam demais a superficie do produto base
**Causa:** Exigem curadoria juridica, regras especializadas e ticket diferente do fluxo operacional central do PrevLegal
**Correcao aplicada:** Separar a estrategia em:
- core:
  - analise de CNIS com IA
  - score de viabilidade
  - calculo preliminar integrado ao lead
- premium:
  - geracao de pecas com IA
  - acompanhamento processual inteligente
  - totalizacao internacional (`PrevGlobal`)
**Regra pratica:** Quando uma frente previdenciaria exigir alta especializacao e gerar valor percebido proprio, tratar como modulo premium antes de tentar encaixar tudo no core

### 89. Totalizacao internacional tem cara de nicho premium com UX baseada em comparacao de cenarios
**Problema:** Casos de contribuicao em mais de um pais nao se resolvem apenas “somando tempos”; as regras variam e nem sempre totalizar e vantajoso
**Causa:** O valor juridico real esta em comparar:
- sem totalizacao
- com totalizacao
e destacar quando o acordo ajuda ou atrapalha o caso
**Correcao aplicada:** Registrar a tese `PrevGlobal` com:
- toggle por pais
- adaptacao por acordo internacional
- comparativo automatico de cenarios
- foco inicial em poucos corredores de maior demanda
**Regra pratica:** Em modulos previdenciarios internacionais, priorizar primeiro os paises de maior fluxo e uma UX comparativa, nao um cadastro enciclopedico de todos os acordos logo de inicio

### 90. O portal mobile-first precisa evoluir com fallback seguro quando a fundacao de dados ainda nao estiver aplicada no operacional
**Problema:** O portal precisava passar a mostrar pendencias de documento e uma timeline mais rica, mas as entidades novas (`portal_document_requests` e `portal_timeline_events`) ainda nao existiam garantidamente no banco operacional
**Causa:** A frente mobile esta andando antes da fundacao completa de schema e antes da superficie interna de abastecimento desses dados
**Correcao aplicada:** Expandir `GET /api/portal/[token]` com leitura segura:
- se as tabelas novas existirem, usar os dados reais
- se nao existirem, fazer fallback para timeline derivada de:
  - abertura do caso
  - mensagens do portal
  - documentos compartilhados
  - agendamentos
**Regra pratica:** Em evolucoes do portal do cliente no PrevLegal, a UX pode avancar antes da modelagem ficar 100% abastecida, desde que a API degrade com seguranca e nunca quebre o portal em producao

### 91. Timeline do cliente e mais útil quando combina etapa macro com acontecimentos concretos
**Problema:** So mostrar o `status` do lead e as etapas macro do atendimento nao dava uma leitura viva do andamento do caso no portal
**Causa:** O cliente precisava de sinais concretos de movimento, nao apenas de uma trilha abstrata de progresso
**Correcao aplicada:** Manter as `Etapas do atendimento` como macro-estados e adicionar uma `Linha do tempo do caso` com eventos reais/derivados
**Regra pratica:** No app/portal do cliente, combinar sempre:
- camada macro: etapa do caso
- camada concreta: acontecimentos recentes
Isso gera mais confianca e reduz sensacao de “portal vazio”

### 92. O mesmo lugar onde o escritorio acompanha o lead deve abastecer o portal do cliente
**Problema:** Depois de enriquecer a home mobile-first com pendencias e timeline, ainda faltava um lugar simples para a equipe alimentar esses dados sem abrir um modulo separado
**Causa:** Criar uma area nova cedo demais aumentaria friccao e reduziria adoção interna
**Correcao aplicada:** A secao `Portal do Cliente` dentro do detalhe do lead passou a ser a superficie minima para:
- criar pendencias de documento
- criar eventos manuais de timeline
- controlar visibilidade para o cliente
**Regra pratica:** No PrevLegal, quando uma funcionalidade do cliente depender de input do escritorio, a primeira superficie deve nascer no contexto do lead, nao em um modulo paralelo

### 93. Foundation pendente no banco deve aparecer como aviso funcional, nao como erro opaco de produto
**Problema:** O front do portal e a nova superficie interna dependem de tabelas novas (`portal_document_requests` e `portal_timeline_events`) que ainda podem nao existir no operacional em alguns momentos
**Causa:** A frente mobile esta sendo construida antes da rodada final de aplicacao de schema
**Correcao aplicada:** As rotas internas e do portal agora distinguem:
- tabela ausente = aviso/fallback seguro
- erro real = falha explicita
**Regra pratica:** Em evolucao incremental de schema no PrevLegal, a UI deve informar quando a foundation ainda nao foi aplicada, em vez de parecer que a feature quebrou por motivo desconhecido

### 94. Confirmacao de presenca e uma boa automacao leve para o app do cliente
**Problema:** O cliente ja via a proxima consulta no portal, mas ainda faltava uma acao simples para reduzir no-show e dar previsibilidade ao escritorio
**Causa:** O sistema interno ja trabalhava com status `confirmado`, mas o mobile do cliente ainda nao acionava esse passo
**Correcao aplicada:** Criar `POST /api/portal/[token]/confirmacao`, permitindo ao cliente/familiar confirmar presenca na proxima consulta, atualizar o agendamento e alimentar timeline/notificacao
**Regra pratica:** No mobile do cliente, automacoes de baixo risco operacional devem entrar cedo quando ajudam a equipe e nao tiram o controle humano de decisoes sensiveis

### 95. Novidades do portal precisam usar o ultimo acesso inicial da sessao, nao um corte que anda a cada refetch
**Problema:** Ao tentar mostrar "novidades desde o ultimo acesso", o portal podia recalcular esse marco depois de a propria pagina disparar um novo fetch, fazendo algumas novidades desaparecerem cedo demais na mesma sessao
**Causa:** `ultimo_acesso_em` e atualizado no backend a cada resolucao de sessao; se o front usar sempre o valor mais recente retornado pela API, o comparativo deixa de representar o retorno original do cliente ao portal
**Correcao aplicada:** Fixar no front o baseline do `ultimo_acesso_em` recebido na entrada da sessao e usar esse ponto como referencia para resumir timeline, mensagens e pendencias
**Regra pratica:** Em experiencias de "desde seu ultimo acesso", capture o marco de comparacao uma vez por sessao e nao deixe refetch interno reescrever essa memoria

### 96. Resumo mobile so vira valor real quando aponta para a proxima acao
**Problema:** Mesmo com novidades e pendencias visiveis na home do portal, o cliente ainda precisava descobrir sozinho onde agir depois de entender o aviso
**Causa:** A interface mostrava o contexto, mas nem sempre o proximo clique natural
**Correcao aplicada:** Transformar a home em fila acionavel com:
- bloco `O que precisa da sua atencao agora`
- atalhos para `Mensagens` e `Documentos`
- CTA `Enviar agora` nas pendencias
**Regra pratica:** No portal mobile do PrevLegal, qualquer badge, resumo ou alerta so deve existir se levar para uma acao concreta dentro da propria jornada

### 97. Home mobile madura precisa destacar urgencia sem parecer alarmista
**Problema:** Depois de transformar a home do portal em fila acionavel, ainda faltava deixar claro o que era mais urgente e tambem quando nao havia nada para fazer
**Causa:** Sem hierarquia visual, varias acoes competem entre si; sem estado positivo, a ausencia de pendencias pode parecer falta de dados
**Correcao aplicada:** Dar destaque principal ao primeiro item da fila, adicionar selos curtos de prioridade, badges nas abas e um estado `Tudo em dia por aqui`
**Regra pratica:** Em home mobile do PrevLegal, a interface deve responder duas perguntas em poucos segundos:
- o que eu preciso fazer agora
- esta tudo em ordem ou existe algo pendente

### 98. Badge operacional nao pode depender de campo fantasma nem ignorar o tenant atual
**Problema:** O sidebar dependia de `/api/pendencias`, mas a rota misturava contagens nao tenant-aware e filtros de agendamento baseados em campos que nao estavam fechados no codigo/schema local
**Causa:** A intencao de produto ("agendamentos novos do agente ainda nao visualizados") ficou registrada antes de a modelagem dessa origem/visualizacao existir de ponta a ponta
**Correcao aplicada:** Reescrever `/api/pendencias` para usar `getTenantContext` + `getAccessibleLeadIds` e contar apenas filas reais:
- portal nao lido
- conversas humanas com nao lidas
- agendamentos em `agendado` ou `remarcado`
**Regra pratica:** No PrevLegal, badge operacional so deve nascer de estado real do produto e sempre com ancora canonica de tenant/escopo; se a modelagem futura ainda nao existe, a contagem precisa degradar para a fila concreta mais proxima

### 99. Notificacao global sem tenant-aware e vazamento silencioso esperando acontecer
**Problema:** A API `/api/notificacoes` lia e atualizava registros com service role sem autenticar o usuario do app e sem filtrar por `tenant_id`
**Causa:** A tabela `notificacoes` ganhou `tenant_id` na foundation multi-tenant, mas a rota antiga ficou presa a um modelo global anterior
**Correcao aplicada:** Exigir `getTenantContext`, usar o `tenantId` canonico e limitar tanto leitura quanto update ao tenant atual
**Regra pratica:** Em superfícies transversais como notificacoes, usar service role sem resolver antes o tenant do usuario e equivalente a abrir uma porta para leitura cruzada de contexto

### 100. Resumo e detalhe analitico precisam compartilhar exatamente o mesmo recorte tenant-aware
**Problema:** `/api/relatorios` e `/api/relatorios/roi` mostravam metricas de campanhas sem aplicar `tenant_id`, o que podia misturar performance de escritorios diferentes em uma UI aparentemente correta
**Causa:** A camada de relatorios ficou parcialmente migrada: leads e pipeline ja usavam contexto tenant-aware, mas as consultas de `campanhas` ainda herdavam um modelo mais antigo
**Correcao aplicada:** Reancorar ambas as rotas no contexto canonico do tenant, aplicar filtro por `tenant_id` nas campanhas e preservar o recorte por `responsavel_id` para usuario nao-admin
**Regra pratica:** No PrevLegal, quando existir resumo executivo e aba detalhada da mesma entidade, os dois precisam ler o mesmo universo tenant-aware; se um deles escapar desse contrato, o produto passa confianca falsa em vez de insight real

### 101. Em rota operacional por `leadId`, autenticacao nao substitui guarda canonica de acesso ao lead
**Problema:** Rotas de link do portal, compartilhamento e documentos do lead ainda aceitavam usuario autenticado e operavam diretamente por `leadId` ou `documento_id`
**Causa:** Parte dessa superficie nasceu antes da consolidacao de `getTenantContext` + `canAccessLeadId`, entao ficou presa a uma confianca implícita em RLS ou no simples fato de haver sessao
**Correcao aplicada:** Reancorar essas rotas na guarda canonica, validar o `lead_id` do documento antes de compartilhar e contar `portal_mensagens` apenas sobre `accessibleLeadIds`
**Regra pratica:** No PrevLegal, qualquer rota que toque um lead por ID deve provar acesso com `canAccessLeadId`; “usuario autenticado” por si so nao autoriza ler, gerar, compartilhar ou contabilizar dados daquele lead

### 102. Corrigir auth legado nao e so trocar middleware; e alinhar o identificador canonico que a rota grava
**Problema:** A rota de anotacoes do lead ainda buscava `usuarios` por `auth_user_id`, enquanto o contexto canonico do produto trabalha com `auth_id` e ja resolve `usuarioId`
**Causa:** A rota vinha de uma fase anterior da modelagem e permaneceu funcional por compatibilidade acidental, nao por contrato claro
**Correcao aplicada:** Passar `anotacoes` e `calculadora` para `getTenantContext` + `canAccessLeadId` e gravar anotacoes direto com `context.usuarioId`
**Regra pratica:** Quando uma rota legada migrar para o contexto canonico, nao basta trocar a autenticacao; vale remover tambem buscas antigas de usuario e gravar logo com o identificador que o produto reconhece como fonte da verdade

### 103. Quando a tabela ainda nao tem `tenant_id`, o minimo aceitavel e recortar pelo vinculo canonico mais proximo
**Problema:** `agent_documents` nao tinha `tenant_id`, mas a API usava service role para listar e deletar tudo como se a base de conhecimento do agente fosse global
**Causa:** A tabela nasceu antes da consolidacao do isolamento real e ficou esquecida fora do contrato tenant-aware que o resto do produto passou a seguir
**Correcao aplicada:** Reancorar `/api/agente/documentos` em `getTenantContext`, resolver os `usuarios.id` do tenant atual e limitar leitura/remoção a esse conjunto, gravando novos documentos com `context.usuarioId`
**Regra pratica:** No PrevLegal, quando uma tabela legada ainda nao tem `tenant_id`, a rota nao pode continuar global por comodidade; ela deve ao menos herdar o escopo do tenant pelo relacionamento canonico mais proximo e documentar claramente que ainda e `tenant-aware`, nao `tenant-isolated`

### 104. Quando o helper canonico ja existe, auth manual vira divida tecnica mesmo sem bug visivel
**Problema:** `POST /api/leads` e `POST /api/import` ainda resolviam usuario, role e tenant por consultas manuais, apesar de o produto ja ter `getTenantContext`
**Causa:** Essas rotas continuaram funcionais por inercia e acabaram ficando fora do padrão que o resto da base adotou durante a migracao multi-tenant
**Correcao aplicada:** Trocar a resolucao manual por `getTenantContext` e passar a usar `context.usuarioId`, `context.tenantId` e `context.isAdmin`
**Regra pratica:** No PrevLegal, quando a regra de escopo ja estiver consolidada num helper canonico, manter rotas novas ou antigas em `auth.getUser()` + query manual so aumenta a chance de divergencia futura; alinhar cedo evita drift mesmo antes de aparecer um bug

### 105. Chat interno solto vale menos que colaboracao operacional contextual
**Problema:** A ideia de comunicacao interna pode parecer forte, mas um "mini Slack" embutido tende a criar ruido, perder contexto e competir com a execucao do caso
**Causa:** Ferramentas internas genericas de conversa ajudam pouco quando o valor do produto esta em registrar decisao, dono, handoff e proxima acao no lugar exato do trabalho
**Correcao aplicada:** Formalizar a proxima frente do core como combinacao de `agentes + cadencias + colaboracao interna contextual`, deixando claro que a colaboracao deve nascer em torno de lead, conversa, agendamento e contrato, e nao como chat solto
**Regra pratica:** No PrevLegal, conversa interna so vira vantagem competitiva quando nasce presa ao fluxo operacional; se for livre demais, vira ferramenta paralela e nao camada de execucao

### 106. Quando ja existe foundation de handoff, a nova fase deve expandir o eixo certo em vez de reiniciar do zero
**Problema:** Seria facil desenhar a colaboracao interna como um modulo novo demais, ignorando que a inbox ja possui seme de dono, fila humana e handoff
**Causa:** Em fases de arquitetura, a tentacao e redesenhar tudo como se o produto ainda nao tivesse estrutura operacional previa
**Correcao aplicada:** Especificar a Fase A de colaboracao interna aproveitando `conversas.status`, `assumido_por` e `assumido_em`, fazendo a thread interna nascer no lead e se refletir depois na inbox
**Regra pratica:** No PrevLegal, quando uma fase nova amplia uma capacidade operacional ja existente, a implementacao deve crescer a partir da foundation real do produto e nao abrir uma segunda trilha concorrente

### 107. Colaboracao interna so e segura quando valida o usuario de destino dentro do tenant atual
**Problema:** A primeira versao de handoff e task interna aceitava `to_usuario_id` e `assigned_to` sem provar que aquele usuario pertencia ao escritorio atual
**Causa:** Em rotas novas de coordenacao interna, e facil focar no fluxo do lead e esquecer que o identificador do usuario tambem precisa de guarda tenant-aware
**Correcao aplicada:** Criar validacao explicita do usuario de destino em `internal-collaboration.ts` e bloquear handoff/task quando o responsavel nao pertencer ao tenant ou nao estiver ativo
**Regra pratica:** No PrevLegal, toda acao interna que direciona responsabilidade para uma pessoa deve validar o destino no tenant atual; `UUID` conhecido nao pode virar atalho para atravessar escritorios

### 108. Fase nova so fica realmente pronta para uso quando schema e runtime andam juntos
**Problema:** A foundation da colaboracao interna pode passar em build e ainda assim nao funcionar no operacional se a migration correspondente nao tiver sido aplicada no banco
**Causa:** O produto esta evoluindo em camadas, e nem toda sessao consegue fechar codigo + schema remoto no mesmo momento
**Correcao aplicada:** Registrar a fundacao da Fase A com honestidade operacional: rotas, UI e helper estao prontos, mas a feature depende da migration `038_internal_collaboration_phase_one.sql`
**Regra pratica:** No PrevLegal, quando uma entrega nova depender de schema ainda nao aplicado, documentar isso como dependencia explicita de rollout; build verde sozinho nao significa prontidao operacional completa

### 109. Painel lateral contextual vale mais que nova aba na inbox
**Problema:** A primeira opcao para expor coordenacao interna na inbox seria abrir uma aba nova (ao lado de Portal), mas isso fragmenta o foco do operador e esconde o contexto do caso
**Causa:** A inbox e uma ferramenta de execucao e nao de navegacao; adicionar aba coloca a coordenacao em competicao com a conversa principal
**Correcao aplicada:** Implementar strip-toggle abaixo do header que abre painel lateral (272px) sem sair da thread — dono, tasks e notas ficam visiveis enquanto o operador continua lendo a conversa
**Regra pratica:** No PrevLegal, quando um recurso novo precisa coexistir com o fluxo principal da inbox, painel lateral recolhivel preserva contexto melhor do que nova aba; nova aba so se o recurso precisar de espaco vertical propio

### 110. Quick note na inbox so e util se persistir e refletir imediatamente sem recarregar pagina
**Problema:** Um campo de nota que requer navegar para o detalhe do lead para confirmar se foi salva quebra o fluxo operacional da inbox
**Causa:** O operador esta na conversa — qualquer salto de pagina para confirmar uma acao interna tem custo cognitivo alto
**Correcao aplicada:** Apos `POST /api/leads/[id]/interno/mensagens`, o painel chama `fetchInternoData` no mesmo componente e atualiza a lista de notas sem reload — confirmacao visual imediata dentro do painel
**Regra pratica:** No PrevLegal, acoes rapidas de coordenacao interna (nota, check-off de task) precisam ter feedback imediato no proprio componente onde foram acionadas; redirecionamento ou reload quebra o contexto operacional

### 111. Unique index parcial é a forma certa de garantir 1 run ativa por lead
**Problema:** Sem restrição no banco, seria possível ativar dois follow-ups simultâneos no mesmo lead, criando conflito de mensagens e histórico inconsistente
**Causa:** Controle só em código (checar antes de inserir) tem race condition — dois requests simultâneos passariam na verificação antes de qualquer um inserir
**Correcao aplicada:** `create unique index idx_followup_runs_lead_ativo on followup_runs(lead_id) where status = 'ativo'` — o banco rejeita o segundo insert com conflito 409 antes de qualquer duplicidade
**Regra pratica:** No PrevLegal, quando a regra de negócio é "no máximo 1 registro ativo por entidade pai", usar unique index parcial no banco é mais seguro do que validação em código

### 112. Worker de disparo é dependência explícita — não esconder isso no produto
**Problema:** O follow-up engine ficaria silencioso sem o worker: runs ficam com `proximo_envio_at` calculado mas nada dispara, criando expectativa falsa para o operador
**Causa:** Implementar schema + API sem o worker é correto (fundação antes do motor), mas a UI precisa refletir esse estado
**Correcao aplicada:** Card do lead mostra `proximo_envio_at` apenas quando `status = 'ativo'`, deixando claro que há um próximo passo agendado; documentado como dependência explícita no handoff
**Regra pratica:** No PrevLegal, quando uma feature depende de um worker ainda não implementado, a UI deve mostrar o estado pendente com clareza e o handoff deve registrar a dependência antes de fechar a fase

### 113. Vercel Cron é a forma mais simples de worker no mesmo codebase Next.js
**Problema:** Edge Function separada no Supabase exige deploy independente, variáveis duplicadas e pipeline separado para um worker que usa as mesmas libs do app
**Causa:** A tentação de usar Supabase Edge Functions é alta por já estar no ecossistema, mas o worker precisa de `whatsapp-provider`, `twilio` e outras libs do app
**Correcao aplicada:** Criar `GET /api/followup/worker` protegido por `CRON_SECRET` e declarar o schedule em `vercel.json` — mesmo deploy, mesmas libs, zero infraestrutura extra
**Regra pratica:** No PrevLegal, workers leves que dependem de libs do app devem nascer como rotas API + Vercel Cron; Edge Functions do Supabase ficam reservadas para lógica de banco que não depende do codebase Next.js

### 114. Stop conditions no banco evitam mensagens indevidas mesmo se o worker rodar com atraso
**Problema:** Se o cron rodar 5min depois do lead ser marcado como convertido, sem stop condition no worker ele ainda dispararia a mensagem de follow-up
**Causa:** Crons têm delay inherente — nunca são exatos; qualquer lógica de parada que dependa só de "não ativar runs novas" ainda pode disparar steps já agendados
**Correcao aplicada:** No início de cada run processada, o worker lê o `status` atual do lead e aplica stop automático antes de tentar enviar qualquer mensagem
**Regra pratica:** No PrevLegal, stop conditions de follow-up precisam ser verificadas no momento do disparo, não só na ativação; o estado do lead pode mudar entre a ativação e o próximo ciclo do cron

### 115. Stop conditions devem ser implementadas em todos os pontos de entrada, não só no worker
**Problema:** Implementar stop só no worker deixa janela: se o lead responde ou humano assume ANTES do próximo ciclo, o worker ainda poderia disparar na próxima rodada porque a run ainda está com status `ativo`
**Causa:** O cron tem delay de até 5min — eventos de negócio (lead respondeu, humano assumiu) são imediatos e precisam parar a run imediatamente
**Correcao aplicada:** Stop conditions implementadas em 3 pontos:
  - worker (verificação no início de cada run processada)
  - webhook Twilio inbound (lead responde → stop imediato)
  - conversas PATCH (humano assume → stop imediato)
**Regra pratica:** No PrevLegal, stop conditions de follow-up precisam existir em TODOS os pontos onde o estado relevante muda, não só no worker; o worker é última linha de defesa, não a única

### 116. Fallback transparente é a estratégia correta ao migrar de config global para por-entidade
**Problema:** Ao introduzir agentes por tenant, os clientes que não criaram nenhum agente ainda perderiam o funcionamento do responder se ele exigisse agente configurado
**Causa:** Migrações de modelo de dados devem ser zero-disruption — o comportamento antigo precisa continuar enquanto o novo não está configurado
**Correcao aplicada:** O responder busca agente `is_default=true` do tenant; se não existir, cai transparentemente para `configuracoes` global — nenhum cliente precisa reconfigurar nada
**Regra pratica:** No PrevLegal, ao adicionar uma nova entidade de configuração mais granular (por agente, por campanha), sempre manter o fallback para o nível anterior; o novo nível é opt-in, não obrigatório

### 117. Seed de automação bom precisa ser idempotente e respeitar a configuração real do tenant
**Problema:** Um botão de `Templates Seed` pode criar duplicidade, competição entre gatilhos e sobrescrita indireta da operação do escritório se inserir padrões cegamente
**Causa:** É fácil tratar seed como massa fixa sem verificar se aquele status já tem gatilho configurado ou se o tenant realmente possui a régua/agente necessário
**Correcao aplicada:** O seed de `event_triggers` passou a:
- usar apenas regras e agentes ativos realmente disponíveis
- preservar slots já configurados
- inserir só o que está faltando
- devolver resumo explícito de `inseridos`, `já existentes` e `indisponíveis`
**Regra pratica:** No PrevLegal, qualquer seed operacional por tenant deve ser repetível sem efeito colateral e nunca assumir que todos os recursos de apoio já estão configurados

### 118. Variável de tema inválida em botão crítico vira bug funcional, não só detalhe visual
**Problema:** O botão `Novo Gatilho` apareceu como um bloco preto sem texto visível na tela de automações
**Causa:** O componente usava `var(--bg-default)`, mas essa variável não existe no tema atual; o navegador caía para cores inválidas e o CTA perdia contraste
**Correcao aplicada:** Trocar a dependência por cores explícitas e variáveis reais do design system (`var(--accent)` + `#fff`) e revisar outros pontos da mesma tela que ainda usavam `--bg-default`
**Regra pratica:** No PrevLegal, CTA operacional importante não deve depender de variável de tema inexistente ou ambígua; em ações primárias, prefira contraste explícito e previsível

### 119. Seed operacional precisa dizer com clareza quando o problema é falta de prerequisito, nao erro de sistema
**Problema:** A UI de automações parecia “quebrada” quando o seed retornava `Nenhum template novo foi inserido`, mesmo com o backend funcionando corretamente
**Causa:** O tenant real ainda nao tinha agentes ativos nem regua ativa, mas a tela devolvia um feedback visual que soava como sucesso generico ou falha ambigua
**Correcao aplicada:** O feedback do seed passou a diferenciar `warning` de `success`, o modal bloqueia selecoes sem recurso disponivel e a UI explica exatamente o que falta no tenant para criar gatilhos
**Regra pratica:** No PrevLegal, quando uma automacao depende de configuracao previa do escritorio, a interface deve expor o prerequisito faltante e orientar o proximo passo; nao deixar o operador adivinhar se houve bug ou apenas setup incompleto

### 120. Quando uma capability nova vira real, a superficie principal precisa migrar junto
**Problema:** O produto ja tinha multiagentes implementados, mas a navegação principal ainda levava para uma tela antiga de agente único, criando a impressão de que só existia um agente configurável
**Causa:** A Fase C/D cresceu em `/configuracoes?tab=agentes`, mas a antiga rota `/agente` continuou viva e virou uma camada de UX incoerente
**Correcao aplicada:** A página `/agente` foi transformada na superfície canônica de multiagentes e o seed de agentes passou a ficar visível na própria operação
**Regra pratica:** No PrevLegal, quando uma nova camada do produto substitui a lógica anterior, a navegação principal precisa apontar para a nova superfície; deixar a UI antiga como caminho principal distorce a leitura do que o sistema realmente suporta

### 121. Fechamento pode entrar antes de existir um estágio dedicado, desde que use um papel já compatível
**Problema:** A operação começou a exigir um agente de fechamento/proposta, mas abrir um novo `tipo` no banco sem validar enum/schema real aumenta risco de drift
**Causa:** O produto já tinha um papel suficientemente próximo (`followup_comercial`), então forçar uma categoria nova agora geraria complexidade antes da hora
**Correcao aplicada:** O agente de fechamento entrou nesta rodada modelado como `followup_comercial`, com naming e objetivo explícitos de proposta/fechamento
**Regra pratica:** No PrevLegal, quando uma nova função operacional cabe semanticamente em um papel já existente, prefira encaixar no tipo compatível e só abrir novo enum/estágio quando houver necessidade real de roteamento ou métrica separados

### 122. Gatilho por status precisa disparar em todos os caminhos de troca de status
**Problema:** A automação da Fase E podia parecer instável porque o gatilho rodava no update completo do lead, mas não no endpoint rápido de mudança de status
**Causa:** O produto ganhou mais de um caminho de edição de `lead.status`, e só um deles tinha sido ligado ao `processEventTriggers`
**Correcao aplicada:** `PATCH /api/leads/[id]/status` agora também lê o status anterior e dispara o orquestrador quando houver mudança real
**Regra pratica:** No PrevLegal, sempre que uma automação depender de um evento de domínio como “status mudou”, todos os endpoints que produzem esse evento precisam chamar a mesma orquestração; não confiar em apenas um caminho da UI

### 123. Sessao valida e acesso operacional valido nao sao a mesma coisa
**Problema:** O usuario conseguia autenticar, via a plataforma por um instante e era devolvido para `/login`, criando a impressao de login quebrado
**Causa:** O produto tratava `TenantContext = null` como se fosse falha de autenticacao, mas esse estado tambem acontece quando o usuario existe no Supabase e ainda nao tem vinculo ativo/utilizavel em `usuarios`
**Correcao aplicada:** Separar os estados no app:
- sem sessao -> `/login`
- sessao valida sem contexto operacional -> `/acesso-pendente`
e mover o login principal para uma rota server-side (`POST /api/session/login`) para a sessao nascer no servidor antes do redirect para o dashboard
**Regra pratica:** No PrevLegal, nunca colapsar `auth` e `provisionamento` no mesmo redirect de login; quando o problema for acesso do escritorio, a UI deve dizer isso explicitamente

### 124. Migracao de permissao granular nao pode derrubar o login do tenant se ainda nao estiver aplicada em producao
**Problema:** Depois da rodada de permissões granulares, usuários do app podiam cair em `acesso-pendente` mesmo com tenant e login antes funcionais
**Causa:** O código passou a selecionar `usuarios.permissions`, mas a produção ainda pode estar sem a migration `044_user_permissions_foundation.sql`; nesse caso, `getTenantContext()` falha e o app interpreta como ausência de contexto operacional
**Correcao aplicada:** Adicionar fallback nos pontos críticos (`getTenantContext`, `getUsuarioLogado`, APIs de usuários) para reexecutar a consulta sem a coluna `permissions` e operar só com os presets por `role`
**Regra pratica:** No PrevLegal, quando uma migration de segurança/governança ainda não está garantida em todos os ambientes, o runtime deve degradar com segurança em vez de bloquear autenticação e contexto base do tenant

### 125. Vínculo por `auth_id` pode driftar; o runtime precisa saber se autocurar por e-mail
**Problema:** Um tenant pode continuar com `usuarios` existente e ativo, mas o login da plataforma cair em `acesso-pendente` porque o `usuarios.auth_id` não bate mais com o usuário autenticado no Supabase
**Causa:** Reprovisionamento, reset de acesso, convites e recriação de usuário auth podem deixar o registro operacional existente com `auth_id` antigo, mesmo mantendo o mesmo e-mail responsável
**Correcao aplicada:** Criar um resolvedor único do usuário atual que:
- tenta achar por `auth_id`
- faz fallback por e-mail autenticado
- autocorrige `usuarios.auth_id` quando encontra o registro certo
- se ainda assim não existir `usuarios` compatível, tenta derivar o acesso pelo próprio `tenants.responsavel_email` e garante um admin operacional mínimo para o responsável
**Regra pratica:** No PrevLegal, identidade operacional do usuário deve preferir `auth_id`, mas precisa ter caminho seguro de auto-heal por e-mail para evitar bloqueio após reprovisionamento legítimo

### 126. Métrica de adoção do tenant não pode depender de acesso que o app nunca persiste
**Problema:** O admin podia mostrar `Último acesso da equipe: Sem acesso` e `Usuários ativos 7D: 0` mesmo quando o responsável realmente usava a plataforma havia dias
**Causa:** O app renovava a sessão com `POST /api/session/touch`, mas não atualizava `usuarios.ultimo_acesso`; a métrica do tenant lia esse campo e acabava parecendo prova de falta de uso quando era só telemetria faltando
**Correcao aplicada:** Criar um caminho canônico para registrar `ultimo_acesso` do usuário operacional e chamá-lo tanto no login server-side quanto no heartbeat de sessão do app
**Regra pratica:** No PrevLegal, qualquer métrica de saúde operacional usada no admin precisa nascer de um write real no runtime correspondente; não inferir adoção a partir de campo que a própria sessão nunca atualiza

### 127. Fallback de schema em `usuarios` precisa cobrir todas as colunas opcionais da fase nova, não só `permissions`
**Problema:** Mesmo depois do fallback da coluna `permissions`, o login do tenant ainda podia cair em `acesso-pendente` em produção
**Causa:** A produção não estava sem apenas a migration `044`; também faltava a `043`, então o resolvedor do usuário quebrava ao selecionar `google_calendar_email` e `google_calendar_connected_at`
**Correcao aplicada:** O lookup de `usuarios` passou a tentar o schema em três camadas:

### 128. Convite de usuário no go-live não pode prometer envio automático nem deixar email já cadastrado cair em erro cru
**Problema:** No smoke test, o fluxo de convite deixava parecer que um email seria enviado automaticamente, e o aceite de um email já cadastrado em outra conta do PrevLegal caía no erro cru `A user with this email address has already been registered`
**Causa:** `src/app/api/usuarios/convidar/route.ts` só gerava URL manual e não validava a existência do email no Supabase Auth; `src/app/api/usuarios/aceitar-convite/route.ts` ainda tentava criar `auth user` novo mesmo quando o email já existia
**Correcao aplicada:** O convite passou a bloquear emails já presentes em `public.usuarios` ou `auth.users` com mensagem clara de go-live, o aceite passou a devolver `409` amigável em português, e a UI passou a explicitar que o envio do link ainda é manual
**Regra pratica:** No PrevLegal, onboarding de usuário em fase de go-live precisa ser explícito sobre o que é link manual e o que é provisionamento automático; se o modelo atual ainda for `um email -> um escritório`, isso deve aparecer como regra de operação e não como erro inesperado do provedor
- completo
- sem colunas de agenda própria
- mínimo sem agenda própria nem permissões
e a API de listagem de usuários ganhou a mesma resiliência
**Regra pratica:** No PrevLegal, quando o runtime precisa sobreviver a migrations pendentes, o fallback deve cobrir todo o grupo de colunas opcionais daquela fase e não apenas a primeira coluna nova que causou erro

### 128. Agenda por usuário não pode travar o agendamento básico enquanto a migration ainda não existe
**Problema:** Depois que o login foi destravado, o modal de novo agendamento ainda falhava com `column usuarios.google_calendar_email does not exist`, e a verificação do Google podia parecer infinita
**Causa:** A fase de agenda por usuário foi implementada no código, mas a produção ainda não tem a `043`; algumas rotas de agenda continuavam consultando as colunas novas de `usuarios` sem fallback
**Correcao aplicada:** Tornar a camada de agenda resiliente:
- fallback do responsável do agendamento para schema mínimo (`id, nome, email`)
- status do Google devolvendo estado neutro em vez de erro fatal
- leitura da conexão por usuário retornando `null` quando as colunas da `043` ainda não existem
- callback de OAuth por usuário falhando de forma controlada, sem quebrar a navegação
**Regra pratica:** No PrevLegal, capacidades novas como Google por usuário podem degradar para fallback do escritório, mas nunca devem bloquear a criação do agendamento básico por coluna ausente

### 129. Tela operacional com tema dual não pode depender de hardcodes escuros
**Problema:** A agenda ficava aceitável no escuro, mas no claro parecia quebrada ou “lavada”, porque título, cards e calendário continuavam presos a cores escuras fixas
**Causa:** A página de agendamentos cresceu rápido com classes hardcoded (`#11131b`, `text-white`, `bg-[#13131f]`) e deixou de respeitar os tokens do tema global
**Correcao aplicada:** Reestruturar a superfície de `Agendamentos` para usar `var(--bg)`, `var(--bg-card)`, `var(--bg-surface)`, `var(--border)` e cores semânticas do sistema, além de reforçar a hierarquia visual no topo e nos cards da fila operacional
**Regra pratica:** No PrevLegal, telas de operação que existem nos dois temas devem nascer com tokens semânticos desde o começo; hardcode de cor escura em página principal quase sempre vira regressão visual no claro

### 130. Agenda operacional desktop precisa expor o que exige ação sem empurrar tudo para baixo
**Problema:** Mesmo mais bonita, a tela de `Agendamentos` ainda obrigava o operador a descer para ver a fila de confirmação, histórico e confirmados, enquanto o calendário ocupava largura e altura demais no desktop
**Causa:** A composição seguia linear: hero, calendário grande e só depois os cards operacionais; isso tratava a página mais como calendário tradicional do que como painel de execução
**Correcao aplicada:** Reorganizar a tela em desktop com um trilho lateral fixo para `Precisa confirmação`, `Confirmados` e `Histórico recente`, reduzir a densidade do calendário mensal e limitar a quantidade de eventos visíveis por célula para privilegiar leitura + ação sem scroll
**Regra pratica:** No PrevLegal, telas operacionais densas devem usar a lateral do desktop para fila acionável; o calendário continua importante, mas não pode esconder o trabalho que a equipe precisa executar agora

### 131. O maior ROI documental vem de compreender o que já foi enviado, não de gerar mais texto primeiro
**Problema:** O produto já tinha upload de documentos, base documental do agente e geração beta por IA, mas o arquivo continuava sendo tratado quase só como storage + link
**Causa:** A evolução inicial priorizou captura, compartilhamento e geração, sem ainda introduzir uma camada canônica de parsing estrutural
**Correcao aplicada:** Formalizar a direção de inteligência documental com `Docling` como motor de parsing para `lead_documentos` e depois `agent_documents`, com fila assíncrona, persistência de texto/markdown/JSON e chunks para consumo por agentes, busca e análise
**Regra pratica:** No PrevLegal, antes de investir pesado em “gerar novos documentos”, o maior ganho costuma estar em transformar o acervo já enviado em conteúdo entendível, pesquisável e reutilizável pelo sistema

### 132. Foundation documental nova precisa degradar sem quebrar quando a migration ou o serviço externo ainda não chegaram
**Problema:** O PrevLegal já sofreu com regressões quando o código passou a depender de colunas/tabelas novas antes do rollout completo no banco de produção
**Causa:** Features foundation como permissões granulares, agenda por usuário e agora parsing documental nascem no código antes de a migration estar garantida em todos os ambientes
**Correcao aplicada:** A camada de `document_processing_jobs` e `document_parsed_contents` foi introduzida com fallback seguro:
- enqueue vira no-op se a `045` ainda não existir
- listagem do lead continua funcionando sem status de parsing quando a schema ainda não foi aplicada
- o worker devolve estado neutro quando a foundation ainda não está disponível
- documentos `text/plain` podem ser parseados inline; binários dependem do serviço Docling externo
**Regra pratica:** No PrevLegal, foundations que dependem de schema novo e serviço externo devem sempre degradar para “sem processamento”, nunca bloquear upload, leitura ou operação do lead

### 133. Agenda por usuário precisa degradar também na tabela `agendamentos`, não só em `usuarios`
**Problema:** Mesmo depois de endurecer a leitura das colunas novas em `usuarios`, o modal `Novo agendamento` ainda podia falhar com `Could not find the 'calendar_owner_email' column of 'agendamentos' in the schema cache`
**Causa:** A produção ainda está sem a migration `043`, e o `POST /api/agendamentos` passou a gravar `calendar_owner_scope`, `calendar_owner_usuario_id` e `calendar_owner_email` sem fallback para schema legado
**Correcao aplicada:** A API de agendamentos ganhou fallback de schema também na própria tabela `agendamentos`:
- criação tenta inserir com `calendar_owner_*` e rebaixa automaticamente para payload legado se a coluna não existir
- leitura do agendamento atual em `PATCH` e `DELETE` tenta primeiro o select completo e depois volta para o schema mínimo
- atualização/cancelamento do evento Google passam a usar `ownerScope` e `ownerUsuarioId` só quando essas colunas realmente existem
**Regra pratica:** No PrevLegal, toda fase que adiciona ownership explícito ao runtime precisa cobrir três camadas de fallback: `usuarios`, `configuracoes` e a tabela operacional que persiste o efeito final da feature

### 134. Agenda operacional desktop precisa mostrar fila acionável já no breakpoint de trabalho comum
**Problema:** Mesmo com a lateral implementada, a tela de `Agendamentos` ainda ficava parecendo “calendário primeiro, operação depois” em larguras intermediárias; o operador continuava rolando a página para ver a fila e o contexto importante
**Causa:** A composição lateral só aparecia em `xl`, tarde demais para muitos notebooks e janelas reduzidas, e o calendário seguia com altura visual maior do que precisava
**Correcao aplicada:** A página passou a abrir o rail já em `lg`, com:
- coluna lateral fixa para filas operacionais
- card de `Em foco` mostrando o item mais urgente ou selecionado
- células do calendário mais compactas
- empilhamento mobile mantido só abaixo de `lg`
**Regra pratica:** No PrevLegal, telas operacionais de uso diário devem revelar fila e contexto no primeiro breakpoint desktop real; se a ação principal some em notebook, o layout ainda está priorizando a superfície errada

### 135. Quando o histórico remoto do Supabase diverge dos nomes locais, o caminho seguro é patch SQL idempotente, não `db push` no escuro
**Problema:** Na etapa de estabilização para go-live, o repo precisava aplicar `043`, `044` e `045`, mas o `supabase db push` não era confiável
**Causa:** O projeto operacional remoto está com histórico de migration em timestamps antigos, enquanto o repo local usa a sequência canônica `001..045`; além disso, o CLI da sessão não tinha senha válida do Postgres remoto para `db push`
**Correcao aplicada:** Foi formalizado um caminho operacional seguro:
- patch SQL idempotente contendo `043`, `044` e `045`
- runbook curto para aplicação e validação
- trilho executivo apontando para esse fluxo como etapa oficial de go-live
**Regra pratica:** No PrevLegal, quando o histórico do Supabase divergir e o CLI não puder empurrar schema com segurança, aplique apenas o delta necessário via SQL idempotente e registre isso como runbook, em vez de tentar “consertar tudo” no histórico remoto no impulso

### 136. Quando uma migration cria uma segunda FK para a mesma tabela, todo embed Supabase precisa virar explícito
**Problema:** Depois de aplicar a `043`, o `Novo agendamento` podia até criar o evento no Google e enviar o e-mail, mas a UI quebrava com `Could not embed because more than one relationship was found for 'agendamentos' and 'usuarios'`
**Causa:** A tabela `agendamentos` passou a ter duas relações com `usuarios`:
- `usuario_id`
- `calendar_owner_usuario_id`
Os selects ainda pediam apenas `usuarios(...)`, então o PostgREST não sabia qual FK usar no embed
**Correcao aplicada:** As rotas de agenda passaram a nomear explicitamente o relacionamento do responsável operacional:
- `usuarios:usuarios!agendamentos_usuario_id_fkey(...)`
- o mesmo ajuste foi aplicado na listagem, no retorno do `POST` e no retorno do `PATCH`
**Regra pratica:** No PrevLegal, sempre que uma tabela ganhar múltiplas FKs para o mesmo destino, nenhum embed pode continuar genérico; o FK canônico precisa ser nomeado explicitamente na query para evitar bugs “meio invisíveis”, onde a escrita funciona mas a resposta da API quebra

### 137. Quando o fluxo técnico já está verde, o próximo bloqueio de go-live pode ser pura percepção de confiança
**Problema:** Mesmo com conexão Google e agenda funcionando, o cliente ainda pode ver o alerta de app não verificado no consentimento e interpretar isso como insegurança do produto
**Causa:** A feature técnica e a prontidão comercial do OAuth são coisas diferentes; o runtime pode estar certo enquanto a consent screen ainda está em fase de teste/verificação
**Correcao aplicada:** Formalizar a frente do Google como checklist de go-live separado, com foco em:
- consent screen
- domínio e links públicos
- escopos
- verificação/submissão
**Regra pratica:** No PrevLegal, integração externa só pode ser considerada “pronta para cliente pagante” quando o fluxo técnico e a confiança comercial estiverem fechados; alerta de OAuth não é bug de código, mas é bloqueio real de onboarding

### 138. Em superfícies admin com formulário inline, ação que não reposiciona viewport parece botão quebrado
**Problema:** Na gestão de canais WhatsApp do admin, os botões `Editar` e `Novo Z-API/Twilio` podiam parecer sem efeito mesmo quando a tela estava funcionando
**Causa:** O formulário de edição/criação abre inline abaixo da lista. Sem reposicionar a viewport, o operador clica no botão, nada muda no trecho visível da tela e a ação parece “morta”
**Correcao aplicada:** A tela passou a:
- fazer scroll automático até o formulário inline quando `Editar` ou `Novo canal` são acionados
- mostrar mensagem explícita antes de redirecionar para reautenticação admin quando a sessão recente expira
**Regra pratica:** No PrevLegal, telas administrativas com edição inline precisam sempre revelar visualmente onde a ação abriu; se o operador precisar “descobrir” que o formulário apareceu fora da viewport, a UX está induzindo falso bug

### 139. Webhook de provider externo pode parecer configurado e ainda estar apontando para outro produto
**Problema:** A instância Z-API do teste mostrava webhooks aparentemente preenchidos, mas eles não estavam ligados ao PrevLegal
**Causa:** Os endpoints configurados na Z-API apontavam para um Supabase Function antigo do Orbit (`orbit-zapi-webhook`), não para uma trilha atual do PrevLegal
**Correcao aplicada:** Registrar explicitamente que:
- outbound via Z-API no PrevLegal pode ser testado pelas credenciais do canal no admin
- inbound/webhook só pode ser tratado como válido depois que os endpoints da instância apontarem para a integração correta do produto atual
**Regra pratica:** No PrevLegal, nunca assuma que “webhook preenchido” significa integração pronta; sempre validar domínio, produto-alvo e rota exata antes de considerar um provider conectado de verdade

### 140. Provider externo nunca deve persistir URL operacional com token em campo de configuração exibível
**Problema:** Ao cadastrar um canal Z-API, a `Base URL` podia acabar salvando a URL completa de envio (`/instances/.../token/.../send-text`) e a tela do admin exibia isso cru
**Causa:** O input aceitava qualquer string e a normalização tratava apenas barras finais, sem reduzir a URL para a origem segura do provider
**Correcao aplicada:** O fluxo passou a normalizar `zapi_base_url` para apenas `origin` em:
- persistência do admin
- runtime de envio
- exibição na UI do admin
**Regra pratica:** No PrevLegal, campos de configuração de provider devem guardar apenas host/base estável; caminhos operacionais com token ou credenciais nunca podem ser persistidos nem renderizados em tela administrativa

### 141. Z-API outbound e inbound são trilhas diferentes e precisam ficar explícitas
**Problema:** O canal Z-API podia aparecer como conectado no admin, mas a operação ainda ficava sem recebimento real no produto porque os webhooks da instância apontavam para um fluxo antigo do Orbit
**Causa:** O PrevLegal já tinha camada outbound via `src/lib/whatsapp-provider.ts`, mas não tinha uma rota inbound nativa como a de `Twilio`, o que deixava a integração parecer pronta sem estar fechada ponta a ponta
**Correcao aplicada:** Criar `src/app/api/webhooks/zapi/route.ts` com:
- resolução do canal por `zapi_instance_id`
- tratamento defensivo de payload inbound por `event=on-receive`
- criação/reativação de conversa
- persistência em `mensagens_inbound`
- notificação operacional
- stop automático de `followup_runs` quando o lead responde
**Regra pratica:** No PrevLegal, provider só pode ser tratado como realmente integrado quando:
- o envio outbound funciona
- a instância aponta para webhook do produto atual
- e o inbound real já alimenta `conversas` e `mensagens_inbound`

### 142. Instância web/multi-device da Z-API pode entregar inbound em `messages[]` com `chatId/body/id`
**Problema:** Mesmo com o webhook canônico da Z-API apontando para o PrevLegal, a mensagem inbound ainda podia não aparecer na caixa de entrada
**Causa:** A rota inicial do produto lia melhor payloads achatados (`phone`, `messageId`, `text.message`), mas instâncias `web / multi-device` podem enviar eventos em formato de lista (`messages[]`) com campos como `chatId`, `author`, `body`, `id` e `fromMe`
**Correcao aplicada:** O parser de `src/app/api/webhooks/zapi/route.ts` passou a aceitar múltiplas fontes candidatas (`payload`, `data`, `message`, `messages[0]`, `data.messages[0]`) e a extrair:
- origem por `phone`, `from`, `author` ou `chatId`
- conteúdo por `text.message`, `body`, `caption` ou `content`
- id externo por `messageId`, `id` ou `key.id`
- autoria por `fromMe` ou `key.fromMe`
**Regra pratica:** Em integrações Z-API, sempre validar explicitamente o formato de webhook da variante `web / multi-device`, porque ela pode divergir do payload achatado usado em exemplos mais simples

### 143. Inbound WhatsApp não pode depender de lead já pré-existente quando a conversa exige `lead_id`
**Problema:** O webhook da Z-API passou a chegar na produção, mas a mensagem ainda não aparecia porque a criação da conversa falhava com `null value in column "lead_id" of relation "conversas"`
**Causa:** O número que respondeu ainda não existia como lead, e o fluxo inbound tentava abrir `conversas` com `lead_id = null` em um schema que exige vínculo obrigatório com `leads`
**Correcao aplicada:** O webhook `src/app/api/webhooks/zapi/route.ts` passou a:
- garantir o lead por telefone no tenant antes de abrir a conversa
- criar automaticamente um lead técnico mínimo em `Cadastro manual` quando o número ainda não existe
- seguir com `mensagens_inbound`, `conversas`, notificação e stop de follow-up no mesmo fluxo
**Regra pratica:** No PrevLegal, inbound de WhatsApp precisa ser resiliente a números novos; se o schema exigir `lead_id`, o produto deve criar o lead placeholder em vez de perder a mensagem

### 144. Fallback de lead técnico precisa usar só colunas confirmadas no schema de produção
**Problema:** Mesmo depois de criar o fallback para lead técnico no inbound da Z-API, a mensagem continuava fora da caixa de entrada
**Causa:** O insert do lead automático tentava gravar `leads.observacoes`, mas essa coluna não existe no schema operacional atual; por isso a criação do lead falhava e a conversa ainda morria com `lead_id = null`
**Correcao aplicada:** Remover `observacoes` do insert em `src/app/api/webhooks/zapi/route.ts` e manter o placeholder preso apenas a campos confirmados na produção
**Regra pratica:** Em hotfixes de go-live, qualquer fallback que crie registros automaticamente deve evitar colunas opcionais ou históricas do ambiente local; se o schema remoto não estiver 100% convergente, use o menor insert possível

### 145. Match de lead por telefone no inbound precisa tolerar máscara e formatação humana
**Problema:** Um lead manual já existente continuava sem ser reconhecido no inbound da Z-API, mesmo com o número correto
**Causa:** O telefone estava salvo como `(41) 99236-1868`, enquanto o webhook chegava normalizado (`+5541992361868`); a busca exata inicial não considerava essa máscara como correspondência já resolvida
**Correcao aplicada:** Em `src/app/api/webhooks/zapi/route.ts`, manter a busca exata por variantes normalizadas e, se ela falhar, buscar candidatos por sufixo com `like`, normalizar os telefones encontrados em memória e aceitar o match quando houver uma correspondência única
**Regra pratica:** Em integrações WhatsApp, telefone salvo manualmente nunca deve depender de igualdade literal de string; o matcher precisa normalizar e comparar formatos humanos antes de cair em placeholder

### 146. Seed de agentes precisa expor o modelo operacional do escritório, não esconder o piloto
**Problema:** O botão `Templates PrevLegal` de agentes estava funcional, mas refletia só o contexto comercial da Ana, o que empurrava todos os escritórios para uma abordagem de planejamento previdenciário consultivo
**Causa:** O catálogo de seed cresceu a partir de um único caso-piloto sem separar explicitamente os modelos de operação do produto
**Correcao aplicada:** O seed passou a oferecer dois kits canônicos com escolha explícita na UI de `/agente`:
- `Modelo Jessica`: benefícios previdenciários, acolhimento jurídico inicial e conversão para consulta/análise
- `Modelo Ana`: planejamento previdenciário consultivo, diagnóstico comercial e fechamento de planos
**Regra pratica:** Template operacional nunca pode carregar viés oculto de um único cliente; quando houver mais de um playbook válido, a escolha do modelo precisa ser explícita para o escritório
## 2026-04-13 — Campo de canal WhatsApp do agente não pode ser input cru legado

**Problema:** A configuração avançada dos agentes ainda expunha `whatsapp_number_id_default` como campo texto com placeholder `ID do número no Twilio/Meta`, mesmo depois da operação do tenant já aceitar `Z-API` e múltiplos canais reais em `whatsapp_numbers`.

**Por que isso importa:** A UX empurrava o usuário para um modelo mental errado:
- parecia que cada agente precisava de um identificador técnico diferente
- escondia os canais reais já conectados no escritório
- não reforçava a recomendação operacional de usar o mesmo número do escritório para a maioria dos agentes

**Correção:** Criar `GET /api/whatsapp-numbers` no contexto do tenant, trocar o input cru por um seletor de canais ativos do escritório em `agentes-config.tsx` e validar no backend que o canal escolhido pertence ao tenant.

**Regra de produto derivada:** por padrão, agentes devem compartilhar o mesmo canal do escritório; separação por agente só entra quando houver uma operação explicitamente distinta.

## 2026-04-14 — Campanha personalizada precisa aceitar contatos específicos como público nativo

**Problema:** No uso real, o escritório pode querer disparar para dois, três ou poucos leads específicos, sem transformar isso numa lista inteira só para contornar a UI.

**Por que isso importa:** Campanhas de recuperação, retomada, teste e abordagem dirigida ficam artificiais quando o produto só aceita `lista completa` como unidade de público.

**Correção:** Criar a fundação `campanha_leads`, permitir dois modos de público em campanhas (`lista` e `selecionados`) e fazer o disparo priorizar `campanha_leads` quando existir seleção explícita. Para manter compatibilidade com o schema legado, o sistema cria uma lista técnica do tipo `Seleção personalizada`.

**Regra de produto derivada:** lista completa é apenas um modo de público. Quando o operador quer falar com contatos específicos, o sistema deve tratar isso como comportamento nativo, não como exceção improvisada.

## 2026-04-14 — Troca manual de aba na inbox precisa cancelar o deep link antigo

**Problema:** Os filtros da `Caixa de Entrada` podiam parecer travados porque `conversaId` e `telefone` antigos continuavam na URL, reabrindo a mesma thread logo depois do clique do operador.

**Por que isso importa:** Para quem está operando a inbox, isso passa sensação de sistema “teimoso” ou de box que não responde, mesmo quando o clique foi aceito.

**Correção:** Ao trocar de aba manualmente, limpar `conversaId`, `telefone` e `leadId` da query string e resetar a hidratação de deep link para humano e portal.

**Regra de produto derivada:** deep link serve para posicionar a tela uma vez. Depois que o operador assume o controle e troca a aba, a navegação precisa respeitar a intenção humana imediatamente.
- Import enriquecido de listas familiares: para operação real, o contato prioritário deve preferir `CELULAR1`/`CELULAR2` do titular antes de telefones fixos, e a UI do lead precisa expor claramente contatos relacionados (cônjuge/filho/irmão) sem esconder isso apenas em campos internos.
### 160. Coluna opcional da planilha não pode derrubar a importação inteira quando o schema operacional ainda não a suporta
**Problema:** A base enriquecida `consulta completa lista RJ 2.csv` importava só `21` de `50` leads, com `29 falhas no insert`
**Causa:** As 29 linhas que tinham `EMAIL1/EMAIL2` faziam o importador tentar persistir `email` em `leads`, mas a produção ainda não tem essa coluna
**Correção:** Parar de enviar `email` no insert de `leads` até o schema operacional suportar esse campo; manter apenas um aviso informativo na UI de importação
**Regra pratica:** Em go-live, um campo opcional enriquecido nunca deve bloquear a carga do registro principal se o schema central ainda não o absorve

### 161. Contato relacionado não pode viver só em texto livre quando a campanha precisa operar por vínculo familiar
**Problema:** Depois de enriquecer leads com contatos de cônjuge, filho e irmão, surgiu a necessidade operacional de disparar campanhas por tipo de vínculo
**Causa:** Hoje o produto expõe esses contatos no `Contexto operacional`, mas ainda não os modela de forma estruturada para segmentação
**Correção:** Registrar essa frente como próxima evolução correta: contatos relacionados precisam virar estrutura consultável para filtros de campanha, não apenas anotação humana
**Regra pratica:** Se uma informação precisa virar critério de campanha, ela não pode depender de texto livre como fonte única de verdade
## 2026-04-16 — campanha enviada e thread da inbox não são a mesma coisa por padrão

- sintomas observados no reteste:
  - a campanha enviava corretamente pelo WhatsApp
  - a resposta do lead aparecia na inbox
  - a mensagem originalmente enviada pela campanha não aparecia na mesma thread
  - o agente não continuava automaticamente a conversa após a resposta
- aprendizado:
  - `campanha_mensagens` não serve sozinho como fonte da thread operacional
  - a inbox lê `mensagens_inbound`, então qualquer outbound que precise aparecer na conversa também precisa ser espelhado ali
  - salvar o inbound no webhook sem disparar explicitamente a continuação do agente não é suficiente para a automação “parecer viva”
- regra consolidada:
  - campanha outbound que inicia atendimento precisa entrar também na trilha de `mensagens_inbound`
  - webhook inbound precisa reconciliar a thread e acionar o auto-responder quando a conversa ainda está em modo `agente`

## 2026-04-16 — Lead manual legado sem tipo explícito não pode ser excluído de campanha “Somente titular”

- problema:
  - campanhas novas criadas com `contato_alvo_tipo = titular` podiam encerrar com `0 enviados` mesmo quando havia lead manual válido e `tem_whatsapp = true`
- causa:
  - o filtro exigia `lead.contato_abordagem_tipo === 'titular'`
  - leads manuais/legados ainda estavam com `contato_abordagem_tipo = null`
- correção:
  - no disparo, `titular` agora aceita `null` como fallback compatível
  - novos leads manuais e leads automáticos criados por inbound passam a nascer com `contato_abordagem_tipo = titular`
- regra prática:
  - quando o produto introduzir um campo estruturante novo no meio da operação, o runtime precisa tratar o legado com fallback explícito para não matar fluxo válido

## 2026-04-16 — Auto-responder interno não pode depender da mesma proteção de sessão do navegador

- problema:
  - o lead respondia, a mensagem entrava em `mensagens_inbound`, mas o agente não continuava a conversa
- causa:
  - o `triggerAgentAutoresponder` chamava `/api/agente/responder` sem credencial interna
  - o middleware redirecionava a chamada para `/login`, então a continuação automática nunca atingia a rota
- correção:
  - usar `ADMIN_FLUXROW_TOKEN` como `Bearer` interno
  - liberar bypass no middleware apenas para `/api/agente/responder` quando esse token vier correto
- regra prática:
  - worker, webhook e auto-responder internos precisam de autenticação própria de máquina; não devem depender de cookie/sessão de navegador

## 2026-04-16 — Mensagem enviada diretamente pelo celular do escritório também precisa entrar na thread operacional

- problema:
  - quando a advogada respondia pelo celular conectado ao número do escritório, o lead recebia normalmente no WhatsApp, mas a thread do sistema ficava “capada”
- causa:
  - o webhook Z-API descartava eventos `fromMe`
- correção:
  - espelhar `fromMe` como outbound manual, reconciliando lead e conversa, mas sem gerar notificação nem acionar auto-responder
- regra prática:
  - se o número do escritório é a fonte de verdade do atendimento, o sistema precisa refletir tanto o outbound enviado pela plataforma quanto o outbound digitado fora dela

## 2026-04-17 — Outbound precisa empurrar o lead para `Contatados`, e o Kanban precisa deixar claro com quem estamos falando

- problema:
  - o lead recebia mensagem por campanha ou envio individual, mas o card podia continuar em `Novos`
  - no Kanban, não ficava visualmente claro se o contato atual era `titular`, `cônjuge`, `filho` ou `irmão`
- causa:
  - o outbound não promovia o status do lead para `contacted`
  - o card do Kanban não consumia `contato_abordagem_tipo`
- correção:
  - campanha e `iniciar conversa` agora promovem leads `new` para `contacted` e disparam `processEventTriggers`
  - a página de leads passou a carregar `contato_abordagem_tipo`
  - o card do Kanban agora renderiza um selo visual com o tipo de contato
- regra prática:
  - mensagem enviada para lead novo deve refletir imediatamente em `Contatados`
  - o operador precisa enxergar no card, sem abrir o lead, se está falando com titular ou familiar

## Atualização 2026-04-18 — Migration 055 aplicada + smoke test de convite

- Migration `055_convites_permissions` aplicada em produção em `2026-04-18 17:37:00 -03` no projeto `lrqvvxmgimjlghpwavdb`
- Coluna `convites.permissions` (`jsonb`) validada com `insert/delete` de teste
- Convite real criado para `marcos-teste-golive@pagliucalessnau.adv.br` com permissões customizadas: `usuarios_manage=false`, `inbox_humana_manage=true`, `agendamentos_assign=true`
- Aceite pendente — será feito pelo Cauã via navegador
- Próximo passo: após aceite, validar `usuarios.permissions` persistiu corretamente e usar esse usuário para smoke test da Pendência 2 (portal)

## Atualização 2026-04-22 — Cleanup smoke test + convite real Ana Terra

- Cleanup do usuário de teste Marcos-teste executado com sucesso:
  - DELETE em `public.usuarios` (id `a54acbed-6280-4d51-ab82-e9c03f5761d1`)
  - DELETE em `public.convites` (id `7a123205-ebe1-43c1-9d0c-1e85af6fd858`)
  - DELETE em `auth.users` (id `fb6c1380-db30-46c0-8a17-3eb2fca905e1`)
- Convite real criado para Ana Terra Antunes Pagliuca (`anaterra@advocaciacomproposito.com.br`) como `admin` do tenant Pagliuca
- Expiração do convite: `29/04/2026 11:06` (America/Sao_Paulo)
- Próximo passo: Cauã envia link para Ana Terra. Após aceite, validar persistência e acesso ao sistema.

## Atualização 2026-04-22 — Containment por tenant + auto-login no aceite de convite

- O bloqueio de `isolamento-em-andamento` deixou de depender só de allowlist por email e passou a aceitar allowlist explícita por `tenant_id`
- O tenant Pagliuca (`dbb8ae41-8d87-4305-80c0-40a8958d9688`) foi incluído como tenant liberado por padrão no containment controlado do pré-go-live
- As rotas admin de provisioning (`link-acesso`, `recriar-acesso`, `reset-senha`) passaram a consultar containment com `tenant_id` além do email
- O fluxo de `/auth/aceitar-convite` foi endurecido para limpar a sessão anterior e autenticar a conta recém-criada antes de redirecionar para `/dashboard`
- Regra prática: aceite de convite não pode depender do estado prévio do navegador; o próprio fluxo precisa terminar com a sessão correta do usuário recém-criado
