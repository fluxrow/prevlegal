# SESSION_BRIEF — PrevLegal (atualizado 05/04/2026)

## Stack e repositório
- Next.js 16 App Router + React 19 + Supabase + Twilio WhatsApp + Claude API + Vercel
- Repo: https://github.com/fluxrow/prevlegal
- Branch operacional: `main` (commit atual: 34e3f92)

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
- Validar se o Vercel Cron das 5min foi oficialmente pausado na dashboard para usar o plano Hobby (atualmente 0 0 * * *).
- Continuar desenhando a interface do Formulário Modal Avançado de Gatilhos na aba de `Automações`.

## Arquitetura de Roteamento (Fase D & E)
Prioridade no responder mantém Fase D.
Gatilho automático: a mudança de status do lead na API `PATCH` chama o *Orquestrador*, varrendo `event_triggers` e rodando followups (podendo cancelar os velhos).

## Próximo bloco (Divisão Segura anti-timeout)
1. Concluir a Interface Modal de Automações (`novo gatilho`).
2. Fazer o Botão "Templates Seed" que injeta os padrões de mercado.
3. Dashboard Executivo e Warm-up.

## Arquivos-chave para contexto rápido
- `docs/ROADMAP.md` — histórico completo
- `docs/SESSION_BRIEF.md` — estado atual e transição de IAs
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
