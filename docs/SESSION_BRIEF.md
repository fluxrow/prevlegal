# SESSION_BRIEF — PrevLegal (atualizado 09/04/2026)

## Stack e repositório
- Next.js 16 App Router + React 19 + Supabase + Twilio WhatsApp + Claude API + Vercel
- Repo: https://github.com/fluxrow/prevlegal
- Branch operacional: `main`

## Banco operacional
- Supabase project: `lrqvvxmgimjlghpwavdb`

## Fases entregues (todas no main)

| Fase | Descrição | Commits |
|------|-----------|---------|
| A | Colaboração interna — thread, tasks, handoff, inbox strip | 7b468e1..d7eea54 |
| B | Follow-up engine — worker Vercel Cron 5min, stop conditions em 4 pontos | e1a9027..8bea965 |
| C | Multi-agente por tenant — tabela agentes, CRUD, UI, wire responder com fallback | 1e8ae47 |
| D | Roteamento por campanha/estágio + métricas por agente | 34e3f92 |
| E | Gatilhos de Ativação Automática (BD, APIs e Orquestrador backend) | a528367..atual |

## Pendências operacionais (próxima rodada)
- Fechar a trilha comercial do OAuth do Google:
  - consent screen
  - verificação do app
  - domínio verificado
  - links públicos válidos
  - submissão com material pronto
- Rodar smoke test do tenant real com:
  - login
  - convite
  - permissões
  - inbox
  - follow-up
  - portal
  - agenda

## Arquitetura de Roteamento (Fase D & E)
Prioridade no responder mantém Fase D.
Gatilho automático: a mudança de status do lead na API `PATCH` chama o *Orquestrador*, varrendo `event_triggers` e rodando followups (podendo cancelar os velhos).

## Próximo bloco oficial
1. Fechar o checklist manual do Google OAuth comercial.
2. Rodar smoke test final do tenant real.
3. Só depois: Docling operacional, agenda premium extra e importador fase 2.

## Atualização 2026-04-09 - Go-live do Google OAuth endurecido no app e nos materiais públicos

- a frente do Google saiu do modo “falta ajustar código” e entrou no modo “falta fechar Console/submissão”
- arquivos principais:
  - `src/app/api/google/auth/route.ts`
  - `public/privacidade/index.html`
  - `public/termos/index.html`
  - `site/privacidade/index.html`
  - `site/termos/index.html`
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/GOOGLE_OAUTH_SUBMISSION_COPY.md`
- mudanças aplicadas:
  - remoção do escopo desnecessário `calendar.readonly`
  - manutenção apenas dos escopos:
    - `calendar.events`
    - `userinfo.email`
  - textos públicos passaram a explicar explicitamente o uso do Google Calendar
  - foi preparado um material pronto para preencher o Google Auth Platform com menos improviso
- leitura prática:
  - o que ainda falta nessa frente agora é majoritariamente manual:
    - consent screen
    - domínio/branding
    - submissão de verificação
  - o app já está mais alinhado ao que o Google e o cliente esperam ver
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Parser do webhook Z-API foi ampliado para instância web/multi-device

- no teste real, o outbound já funcionava, mas o inbound ainda não aparecia na caixa de entrada
- a hipótese mais forte passou a ser formato de payload da variante `web / multi-device`
- a rota `src/app/api/webhooks/zapi/route.ts` foi endurecida para aceitar também:
  - `messages[0].chatId`
  - `messages[0].author`
  - `messages[0].body`
  - `messages[0].id`
  - `messages[0].fromMe`
- também entrou log defensivo quando o webhook chega sem telefone ou texto suficiente para processamento
- resultado esperado:
  - mensagens recebidas pela instância web/multi-device passam a alimentar `mensagens_inbound`, `conversas` e notificações operacionais
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Inbound Z-API agora cria lead técnico quando o número ainda não existe

- no teste real, o webhook passou a bater no PrevLegal, mas a conversa ainda não aparecia
- o log de produção mostrou o erro:
  - `null value in column "lead_id" of relation "conversas" violates not-null constraint`
- causa:
  - o número que respondeu ainda não existia como lead no tenant
  - o schema atual de `conversas` exige `lead_id`
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - garantir busca do lead por telefone antes da criação da conversa
  - se o telefone não existir, criar automaticamente um lead técnico mínimo em `Cadastro manual`
  - seguir com persistência da mensagem inbound, abertura da conversa e notificação operacional
- resultado esperado:
  - respostas de números novos deixam de morrer no inbound e passam a cair na caixa de entrada
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Placeholder lead do inbound Z-API foi ajustado ao schema real da produção

- no teste seguinte, o webhook continuou chegando corretamente na produção, mas o inbound ainda morria antes de abrir a conversa
- o log de produção mostrou o erro:
  - `Could not find the 'observacoes' column of 'leads' in the schema cache`
- causa:
  - o lead técnico criado pelo webhook tentava gravar `leads.observacoes`
  - essa coluna não existe no schema operacional atual, então a criação do lead falhava e `conversas.lead_id` continuava nulo
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - remover `observacoes` do insert do lead técnico
  - manter o fallback de criação automática, mas preso apenas a colunas confirmadas da produção
- resultado esperado:
  - inbound Z-API de números ainda não reconhecidos deixa de falhar por incompatibilidade de schema
  - a mensagem passa a conseguir abrir conversa e cair na caixa de entrada
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Matcher do inbound Z-API agora reconhece lead manual com telefone formatado

- no banco operacional, o telefone do lead manual do teste apareceu salvo como:
  - `(41) 99236-1868`
- causa do desvio:
  - a primeira busca do webhook priorizava igualdade exata por variantes já normalizadas
  - com telefone salvo formatado, o match podia falhar e o fluxo cair no placeholder
- correção aplicada em `src/app/api/webhooks/zapi/route.ts`:
  - manter a busca exata normalizada como primeira etapa
  - adicionar fallback por candidatos usando `like` com sufixo do telefone
  - normalizar os candidatos em memória e priorizar o lead manual quando houver correspondência única
- resultado esperado:
  - respostas vindas do WhatsApp passam a casar com leads manuais mesmo quando o telefone estiver salvo com máscara
  - o sistema evita criar lead técnico desnecessário para números já cadastrados
- validação:
  - `npm run build` passou

## Arquivos-chave para contexto rápido
- `docs/ROADMAP.md` — histórico completo
- `docs/SESSION_BRIEF.md` — estado atual e transição de IAs
- `docs/EXECUTION_TRACK.md` — trilho executivo de execução e go-live
- `src/lib/events/orchestrator.ts` — orquestrador de gatilhos na mudança de status do lead
- `supabase/migrations/042_event_triggers.sql` — infra de BD para eventos

## Atualização 2026-04-08 - Loop de login virou estado explícito de acesso pendente

- sintoma reportado:
  - usuário conseguia autenticar, entrava na plataforma e quase em seguida era devolvido ao login
- causa confirmada em código:
  - o app distinguia mal `sessão Supabase válida` de `acesso operacional válido ao escritório`
  - quando o usuário não tinha contexto resolvível em `usuarios`, a experiência parecia “login quebrado”
- arquivos principais:
  - `src/app/(dashboard)/layout.tsx`
  - `src/app/(auth)/login/page.tsx`
  - `src/lib/supabase/middleware.ts`
  - `src/app/acesso-pendente/page.tsx`
- correção:
  - dashboard agora manda para `/acesso-pendente` quando há sessão mas não há contexto do escritório
  - login passou a usar `POST /api/session/login`, com autenticação server-side e cookie já estabilizado antes do redirect
  - middleware passou a tratar `/acesso-pendente` como rota pública
- leitura prática:
  - daqui para frente, se o usuário cair em `acesso-pendente`, o problema não é senha
  - o ponto a revisar é provisionamento / vínculo do usuário no tenant
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Templates Seed da Fase E fechados

- a aba `Automações` agora aplica templates padrão direto no banco
- arquivos principais:
  - `src/app/api/automacoes/triggers/route.ts`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
  - `src/app/api/automacoes/triggers/seed/route.ts`
  - `src/components/automacoes/trigger-config.tsx`
- comportamento:
  - o botão `Templates PrevLegal` deixou de ser placeholder
  - agora dispara um seed idempotente por tenant
  - insere apenas gatilhos faltantes para slots padrão:
    - `new`
    - `contacted`
    - `scheduled`
    - `lost`
  - o seed só usa regras e agentes ativos realmente existentes no tenant atual
  - se já houver gatilho no slot, preserva a configuração atual e sinaliza `skip`
  - a UI mostra feedback com contagem de inseridos, já existentes e indisponíveis
- ajuste técnico importante:
  - as rotas de `event_triggers` foram alinhadas ao `tenant-context` canônico
- validação:
  - `npm run build` passou
- próximo passo:
  - validar em runtime o clique do seed e depois voltar ao modal avançado de criação/edição de gatilhos

## Atualização 2026-04-08 - UX da tela de Gatilhos refinada

- a interface de `Automações` ficou mais legível e menos opaca para o operador
- arquivo principal:
  - `src/components/automacoes/trigger-config.tsx`
- ajustes:
  - o botão `Novo Gatilho` passou a usar contraste explícito e deixou de cair em preto sem texto visível
  - a tela agora mostra o erro real retornado por `/api/automacoes/triggers` quando houver falha
  - a UI também passou a avisar quando faltam pré-requisitos do tenant para o `Templates PrevLegal`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Pré-requisitos dos gatilhos ficaram explícitos na UI

- a validação em runtime mostrou que o seed estava correto, mas o tenant atual ainda não tem base suficiente para popular todos os templates
- estado observado no tenant operacional:
  - nenhuma régua de follow-up ativa
  - nenhum agente ativo
  - nenhum `event_trigger` criado ainda
- ajustes aplicados em `src/components/automacoes/trigger-config.tsx`:
  - `Novo Gatilho` e `Salvar Gatilho` passaram a usar contraste e aparência explícitos, reduzindo risco de botão “bloco preto” por override visual
  - o feedback do seed deixa de parecer “sucesso verde” quando nada foi inserido por falta de recurso e passa a sinalizar aviso
  - o modal desabilita opções sem recurso real e explica o que falta no tenant:
    - régua ativa
    - agente ativo
  - quando houver só 1 agente ativo, a UI informa isso explicitamente
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - criar pelo menos 1 agente de triagem, 1 de confirmação, 1 de reativação e ativar 1 régua para que o `Templates PrevLegal` consiga popular a base

## Atualização 2026-04-08 - Superfície de Agentes virou multiagente canônica

- a tela `/agente` deixou de ser o editor singleton legado e passou a expor a operação real de múltiplos agentes do escritório
- arquivos principais:
  - `src/app/(dashboard)/agente/page.tsx`
  - `src/components/agentes-config.tsx`
  - `src/app/api/agentes/route.ts`
  - `src/app/api/agentes/[id]/route.ts`
  - `src/app/api/agentes/seed/route.ts`
- mudanças principais:
  - `POST /api/agentes` agora persiste `tipo`
  - `PATCH /api/agentes/[id]` também passou a permitir atualização de `tipo`
  - foi criado o seed idempotente `POST /api/agentes/seed`
  - o seed sobe a base recomendada:
    - triagem
    - confirmação de agenda
    - reativação
    - documentos
    - fechamento via `followup_comercial`
  - a UI de agentes agora tem botão `Templates PrevLegal`
  - o papel de fechamento entra nesta rodada sem abrir novo enum/coluna: usamos o tipo já existente `followup_comercial`
- leitura estratégica:
  - isso corrige o descompasso entre a Fase C/D implementada e a tela antiga que ainda parecia “agente único”
  - também deixa o produto mais pronto para operações além do caso previdenciário clássico, onde fechamento/proposta têm papel próprio
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - validar o seed dos agentes em runtime no tenant atual e depois voltar ao seed dos gatilhos

## Atualização 2026-04-08 - Rota rápida de status agora também dispara a Fase E

- foi corrigida uma inconsistência entre os dois caminhos de atualização de status do lead
- arquivo principal:
  - `src/app/api/leads/[id]/status/route.ts`
- correção:
  - a rota rápida de status agora também chama `processEventTriggers` quando o status realmente muda
  - antes disso, os gatilhos da Fase E só rodavam no `PATCH /api/leads/[id]`, o que criava comportamento diferente dependendo do ponto da UI usado pelo operador
- impacto:
  - o teste e a operação ficam mais confiáveis
  - mudar o status pelo fluxo rápido ou pelo update completo do lead passa a acionar a mesma automação
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Templates de gatilho ficaram editáveis e legíveis

- a tela de `Automações` deixou de depender de apagar/recriar para ajustar templates padrão
- arquivos principais:
  - `src/components/automacoes/trigger-config.tsx`
  - `src/app/api/automacoes/triggers/[id]/route.ts`
- mudanças:
  - cada card de gatilho agora mostra:
    - status com nome mais legível
    - resumo humano da ação
    - explicação rápida de por que aquele estágio costuma ser útil
  - foi adicionado botão `Editar` também nos templates padrão
  - o modal passou a servir tanto para criação quanto para edição
  - o modal agora explica em linguagem natural o que vai acontecer quando salvar
- efeito de produto:
  - reduz dependência operacional do time técnico
  - torna os templates do PrevLegal mais próximos de um playbook configurável
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Geração de documentos IA agora salva no módulo canônico

- o beta de documentos IA foi alinhado ao contrato real da tabela `lead_documentos`
- arquivo principal:
  - `src/app/api/leads/[id]/gerar-documento/route.ts`
- correção:
  - o backend agora gera o conteúdo com Claude e sobe um `.txt` real para o bucket `lead-documentos`
  - depois grava o documento com:
    - `arquivo_url`
    - `arquivo_nome`
    - `arquivo_tamanho`
    - `arquivo_tipo`
    - `tenant_id`
    - `created_by`
  - em caso de falha no insert, o arquivo é removido para evitar lixo órfão no bucket
- erro eliminado:
  - `null value in column "arquivo_url" of relation "lead_documentos" violates not-null constraint`
- validação:
  - `npm run build` passou
- próximo passo recomendado:
  - testar os três documentos beta em runtime e depois decidir a próxima camada de produto:
    - revisão
    - versionamento
    - análise documental por IA

## Atualização 2026-04-08 - Follow-up por status validado no banco e visibilidade melhorada

- o teste com o lead `VALTERLINO AQUINO S RIBEIRO` confirmou que os gatilhos por status estavam funcionando no backend
- estado confirmado:
  - mudança para `contacted` criou uma run
  - mudança seguinte para `lost` cancelou a anterior e abriu nova run ativa
- isso mostrou dois pontos:
  - não dependia de WhatsApp conectado para a run nascer
  - a UI do lead ainda não dava feedback bom o suficiente logo após a troca de status
- ajustes aplicados:
  - `src/components/followup-lead.tsx`
    - atualização automática a cada 10 segundos
    - refresh ao voltar foco para a aba
    - botão `Atualizar`
  - `src/app/api/followup/worker/route.ts`
    - remoção da regra antiga que dava stop automático em `lost`
    - stop automático mantido apenas para `converted`
- efeito de produto:
  - o template `lost -> reativação` deixa de entrar em conflito com o worker
  - a validação operacional fica mais legível para o escritório
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Execução manual do follow-up adicionada ao detalhe do lead

- para fechar a validação sem depender do cron, a run ativa do lead agora pode executar o passo atual manualmente
- arquivos principais:
  - `src/app/api/leads/[id]/followup/[runId]/route.ts`
  - `src/components/followup-lead.tsx`
- mudanças:
  - nova ação `executar_agora` na API da run
  - o botão `Executar agora` aparece nas runs ativas do detalhe do lead
  - a execução manual:
    - usa o canal real do step
    - registra `step_disparado` ou `step_falhou`
    - avança o próximo passo ou conclui a run
- efeito de produto:
  - a Fase E fica testável ponta a ponta sem depender exclusivamente do cron
  - a operação ganha um mecanismo seguro de validação e destravamento
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Motivo da falha agora aparece no histórico do follow-up

- o refinamento final de UX da Fase E foi concluído
- arquivos principais:
  - `src/app/api/leads/[id]/followup/route.ts`
  - `src/components/followup-lead.tsx`
- mudança:
  - a UI agora mostra o motivo real de `step_falhou` usando `followup_events.metadata.erro`
- caso validado:
  - no lead `VALTERLINO AQUINO S RIBEIRO`, a run falhou por:
    - `Lead sem telefone para disparo via WhatsApp`
- efeito:
  - a validação do escritório fica autoexplicativa
  - a frente de follow-up pode ser considerada fechada do ponto de vista de engine + visibilidade básica
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Importador ficou flexível para planilhas com cabeçalhos

- a frente seguinte começou pelo ponto mais pragmático: tornar o import atual menos frágil para fontes variadas
- arquivos principais:
  - `src/lib/import-schema.ts`
  - `src/app/api/import/route.ts`
  - `src/app/(dashboard)/leads/import/page.tsx`
- mudanças:
  - o backend agora detecta planilhas por cabeçalhos reconhecíveis
  - colunas em ordem diferente passaram a funcionar quando os nomes forem inteligíveis
  - o layout legado por posição fixa continua suportado
  - o import já aproveita mais campos quando existirem:
    - `telefone`
    - `email`
    - `categoria_profissional`
  - a UI mostra se a leitura foi:
    - `header_mapping`
    - ou `legacy_fixed`
  - a UI também mostra os campos detectados
- limite explicitado:
  - o import atual ainda pertence ao core previdenciário e continua orientado a `NB`
  - fontes sem `NB`, como Google Maps / Places e listas comerciais externas, entram numa próxima fase
- documento criado:
  - `docs/IMPORTADOR_INTELIGENTE_PLAN.md`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agenda passou a suportar Google por usuário com fallback do escritório

- a frente de agendamentos ganhou a foundation correta para operação de equipe real
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
- mudanças:
  - cada usuário agora pode conectar o próprio Google Calendar
  - admin continua podendo conectar um calendário padrão do escritório
  - o sistema tenta usar primeiro o calendário do responsável do agendamento
  - se ele não tiver conexão própria, usa o calendário padrão do escritório como fallback
  - cada agendamento agora registra de onde veio o evento:
    - `calendar_owner_scope = user`
    - `calendar_owner_scope = tenant`
  - remarcação e cancelamento voltam para a mesma origem do evento
  - a UI de `Agendamentos` ficou mais explícita sobre:
    - meu Google
    - fallback do escritório
    - qual calendário será usado
  - o `Perfil` virou a área natural para o usuário conectar o próprio Google
  - a gestão de usuários passou a sinalizar quem já tem agenda própria conectada
- efeito de produto:
  - permite cenário de secretária/admin agendando para outro responsável sem concentrar tudo no calendário do admin
  - reduz ruído operacional entre criação do agendamento e propriedade real do compromisso
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Inbox estabilizada e permissões por usuário iniciadas

- a `Caixa de Entrada` recebeu um ajuste importante de robustez:
  - conversas sem status válido agora são normalizadas como `agente`
  - a aba ativa passou a ser sincronizada com a URL
  - a seleção é limpa quando deixa de pertencer ao filtro escolhido
- isso reduz o caso em que o operador sente que só `Todas` e `Portal` funcionam
- em paralelo, o sistema ganhou a primeira foundation real de permissões granulares por usuário
- arquivos principais:
  - `supabase/migrations/044_user_permissions_foundation.sql`
  - `src/lib/permissions.ts`
  - `src/components/gestao-usuarios.tsx`
  - `src/app/api/usuarios/route.ts`
  - `src/app/api/usuarios/[id]/route.ts`
  - `src/app/api/usuarios/convidar/route.ts`
- modelo novo:
  - a role continua existindo como preset
  - cada usuário pode ter permissões ajustadas ponto a ponto
- permissões já aplicadas em backend para áreas críticas:
  - usuários
  - agentes
  - automações / gatilhos / réguas
  - reatribuição de agenda
  - listas
  - financeiro
  - operação humana da inbox
- limite atual:
  - ainda não é substituição total de todo `isAdmin` do sistema
  - é uma foundation útil focada nos módulos mais sensíveis
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agenda desktop virou painel lateral de operação

- a tela de `Agendamentos` deu mais um salto de UX no desktop:
  - o calendário mensal ficou mais compacto
  - a fila operacional saiu da parte inferior e foi para uma coluna lateral fixa
  - o operador agora enxerga `Precisa confirmação`, `Confirmados` e `Histórico recente` sem rolar a página
- a decisão de produto foi tratar a agenda menos como “calendário cheio” e mais como painel de execução
- no mobile e em telas menores, a composição empilhada continua existindo para preservar legibilidade
- arquivo principal:
  - `src/app/(dashboard)/agendamentos/page.tsx`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Inteligência documental com Docling formalizada

- foi criada a spec oficial de integração documental em:
  - `docs/DOCLING_INTEGRATION_PLAN.md`
- tese aprovada:
  - o maior ROI inicial não está em gerar mais petições, e sim em compreender documentos já enviados
  - `lead_documentos` vira a primeira superfície prioritária
  - `agent_documents` entra na segunda fase
- arquitetura recomendada:
  - upload canônico continua igual
  - entra uma fila assíncrona de processamento
  - um worker Python com `Docling` gera texto, markdown, JSON e chunks
  - o produto passa a consumir isso em busca, agentes e análise futura
- próximo passo sugerido:
  - implementar a `Fase A` da foundation documental

## Atualização 2026-04-08 - Fase A da inteligência documental entrou no código

- a foundation documental saiu do plano e entrou no runtime:
  - `supabase/migrations/045_document_processing_foundation.sql`
  - `src/lib/document-processing.ts`
  - `src/app/api/document-processing/worker/route.ts`
- comportamento novo:
  - uploads manuais do lead entram na fila de processamento
  - uploads do portal entram na fila de processamento
  - documentos gerados por IA também entram na fila
  - a listagem de documentos do lead agora pode mostrar:
    - `Na fila do Docling`
    - `Processando`
    - `Estruturado`
    - `Falhou`
- tela principal atualizada:
  - `src/app/(dashboard)/leads/[id]/page.tsx`
- foundation externa já preparada:
  - `workers/docling/app.py`
  - `workers/docling/requirements.txt`
  - `workers/docling/README.md`
- limite atual:
  - parsing binário real ainda depende de `DOCLING_SERVICE_URL`
  - sem isso, o sistema só processa inline arquivos textuais e mantém os demais como fila pendente/foundation
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agendamentos ficaram compatíveis com schema legado da produção

- a criação de agendamento deixou de quebrar quando a produção ainda não tem `calendar_owner_scope`, `calendar_owner_usuario_id` e `calendar_owner_email` em `agendamentos`
- arquivos ajustados:
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
  - `src/lib/permissions.ts`
- comportamento novo:
  - a API tenta persistir ownership do calendário, mas rebaixa para o payload legado se a `043` ainda não estiver aplicada
  - `PATCH` e `DELETE` leem o agendamento atual com fallback de select para conviver com schema incompleta
  - update/cancel do evento Google usam owner columns apenas quando elas existem de fato
- impacto prático:
  - o modal `Novo agendamento` deixa de falhar com erro de `schema cache`
  - a agenda continua operacional até o banco receber a migration `043`
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - Agenda desktop ficou mais operacional em larguras comuns

- a página de agendamentos deixou de depender de `xl` para mostrar a lateral operacional
- arquivo principal:
  - `src/app/(dashboard)/agendamentos/page.tsx`
- comportamento novo:
  - a composição com calendário + rail agora aparece em `lg`
  - o rail ganhou um card `Em foco` com o item selecionado ou mais prioritário
  - as células do calendário foram comprimidas para reduzir scroll e abrir espaço para contexto
- impacto prático:
  - notebooks e janelas menores já mostram o trabalho a fazer sem jogar a fila para baixo
- validação:
  - `npm run build` passou

## Atualização 2026-04-08 - API de agendamentos foi alinhada ao novo schema já migrado

- após a aplicação da `043`, surgiu um bug novo de runtime:
  - o evento era criado no Google e podia chegar por e-mail
  - mas a resposta da API quebrava com embed ambíguo entre `agendamentos` e `usuarios`
- causa:
  - `agendamentos` passou a ter duas FKs para `usuarios`
  - os selects ainda usavam `usuarios(...)` sem explicitar qual relação era a do responsável
- correção aplicada:
  - `src/app/api/agendamentos/route.ts`
  - `src/app/api/agendamentos/[id]/route.ts`
  - os embeds agora usam:
    - `usuarios:usuarios!agendamentos_usuario_id_fkey(...)`
- impacto prático:
  - a listagem de agendamentos deixa de “sumir” depois da migration
  - a criação/edição volta a responder corretamente no modo já migrado
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - Agenda runtime validada, foco agora é go-live

- os testes reais da agenda ficaram verdes:
  - `listagem antiga: ok`
  - `novo agendamento: ok`
  - `remarcar: ok`
  - `cancelar: ok`
- leitura executiva:
  - a frente de agenda Google saiu da zona vermelha técnica
  - o próximo gargalo real para segunda-feira é:
    - confiança comercial do OAuth do Google
    - smoke test final do tenant
- documentos novos de execução:
  - `docs/GOOGLE_OAUTH_GO_LIVE_CHECKLIST.md`
  - `docs/TENANT_SMOKE_TEST_CHECKLIST.md`

## Atualização 2026-04-09 - Admin de canais WhatsApp ficou menos ambíguo e a Z-API do teste revelou webhook legado

- a tela de admin do tenant ajustou a UX dos canais WhatsApp em:
  - `src/app/admin/[id]/page.tsx`
- comportamento novo:
  - ao clicar em `Editar` ou `Novo canal`, a viewport desce automaticamente até o formulário inline
  - quando a reautenticação admin expira, a UI mostra aviso antes do redirecionamento
- impacto prático:
  - o operador deixa de interpretar `Editar` e `Novo Z-API/Twilio` como botões sem ação
  - `Definir padrão` e demais mutações passam a ficar mais inteligíveis quando a sessão recente venceu
- leitura operacional da Z-API de teste:
  - o print enviado mostrava webhooks preenchidos
  - mas os endpoints ainda apontavam para `orbit-zapi-webhook` em um projeto antigo do Orbit
  - isso não deve ser tratado como inbound ativo do PrevLegal
- validação:
  - `npm run build` passou

## Atualização 2026-04-09 - PrevLegal ganhou webhook inbound nativo para Z-API

- o produto já enviava via Z-API pelo canal configurado no admin, mas ainda não tinha uma rota inbound própria
- arquivos principais:
  - `src/lib/whatsapp-provider.ts`
  - `src/app/api/webhooks/zapi/route.ts`
- melhorias entregues:
  - resolução de tenant/canal pelo `zapi_instance_id`
  - suporte inicial a `event=on-receive`
  - parsing defensivo de payload para telefone, mensagem textual, `fromMe` e ID externo
  - upsert de conversa + mensagem inbound + notificação
  - stop automático de follow-up quando o lead responde via canal Z-API
- impacto prático:
  - o time deixa de depender do webhook antigo do Orbit
  - a instância Z-API do tenant agora pode apontar para o PrevLegal de forma canônica
  - inbound e outbound passam a existir na mesma trilha do produto atual
- validação:
  - `npm run build` passou
