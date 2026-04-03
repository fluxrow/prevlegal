Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

# PrevLegal — Fase A Spec: Colaboração Interna Mínima

> Backlog técnico e modelo de dados executável para a primeira fase de colaboração interna contextual.
> Atualizado em 03/04/2026.

## Navegação

- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[AGENTES_CADENCIAS_COLABORACAO_PLAN]]

## Objetivo

Entregar a primeira camada de colaboração interna do PrevLegal sem criar um chat solto e sem virar uma ferramenta paralela.

O foco é:

- registrar coordenação humana
- deixar claro quem está cuidando de quê
- centralizar comunicação interna no contexto do lead e da conversa
- criar trilha auditável para o administrador do escritório

## Escopo da Fase A

### Entram nesta fase

- thread interna por lead
- mini thread interna dentro da Caixa de Entrada do lead/conversa
- notas internas com autor e horário
- `@menção` básica
- dono atual do lead
- handoff simples
- task interna rápida
- timeline interna operacional mínima

### Não entram nesta fase

- chat livre entre toda a equipe
- follow-up automático
- múltiplos agentes
- roteamento por agente
- workflow visual genérico
- notificações push complexas

## Base já existente para reaproveitar

O produto já não está no zero.

Foundation que podemos aproveitar:

- `conversas.status`
- `conversas.nao_lidas`
- `conversas.assumido_por`
- `conversas.assumido_em`
- inbox com ações:
  - assumir
  - devolver ao agente
  - aguardando cliente
  - resolvido

Referências reais:

- `supabase/migrations/018_conversas_handoff.sql`
- `src/app/(dashboard)/caixa-de-entrada/page.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`

## Tese de UX

O centro da colaboração não é um chat global.

O centro é o trabalho.

Por isso a colaboração deve nascer em dois lugares:

1. `Detalhe do lead`
2. `Caixa de Entrada`

## Modelo de dados recomendado

### 1. `lead_threads_internas`

Uma thread principal interna por lead.

Campos:

- `id`
- `tenant_id`
- `lead_id`
- `created_by`
- `created_at`
- `updated_at`
- `status`
  - `ativa`
  - `arquivada`

Regras:

- uma thread ativa por lead
- nasce automaticamente no primeiro comentário/tarefa/handoff

### 2. `lead_mensagens_internas`

Mensagens e comentários internos do time.

Campos:

- `id`
- `tenant_id`
- `thread_id`
- `lead_id`
- `autor_usuario_id`
- `tipo`
  - `comentario`
  - `handoff`
  - `menção`
  - `sistema`
- `mensagem`
- `metadata`
  - jsonb
- `created_at`

Uso de `metadata`:

- usuário mencionado
- usuário destino do handoff
- status anterior/novo
- origem da ação (`lead`, `inbox`)

### 3. `lead_tasks`

Pequenas ações internas rastreáveis.

Campos:

- `id`
- `tenant_id`
- `lead_id`
- `thread_id`
- `titulo`
- `descricao`
- `status`
  - `aberta`
  - `em_andamento`
  - `concluida`
  - `cancelada`
- `prioridade`
  - `baixa`
  - `media`
  - `alta`
- `assigned_to`
- `created_by`
- `due_at`
- `created_at`
- `completed_at`

### 4. `lead_handoffs`

Histórico explícito de passagem de responsabilidade.

Campos:

- `id`
- `tenant_id`
- `lead_id`
- `conversa_id`
  - opcional
- `from_usuario_id`
  - opcional
- `to_usuario_id`
  - opcional
- `motivo`
- `status_destino`
  - `agente`
  - `humano`
  - `aguardando_cliente`
  - `resolvido`
  - `financeiro`
  - `juridico`
- `created_at`

### 5. `lead_watchers`

Quem quer acompanhar atualizações internas daquele lead.

Campos:

- `id`
- `tenant_id`
- `lead_id`
- `usuario_id`
- `created_at`

## Decisão importante sobre escopo

Na Fase A:

- `lead_threads_internas` é o eixo principal
- `conversa_id` entra só como contextualização adicional
- a colaboração continua sendo do lead, não de um chat abstrato

## APIs recomendadas

### Lead interno

- `GET /api/leads/[id]/interno`
  - carrega:
    - thread
    - mensagens internas
    - tasks
    - dono atual
    - watchers

- `POST /api/leads/[id]/interno/mensagens`
  - cria comentário interno

- `POST /api/leads/[id]/interno/tasks`
  - cria task

- `PATCH /api/leads/[id]/interno/tasks/[taskId]`
  - atualiza task

- `POST /api/leads/[id]/interno/handoff`
  - registra handoff
  - opcionalmente atualiza a conversa vinculada

- `POST /api/leads/[id]/interno/watch`
  - seguir/parar de seguir

### Inbox contextual

- `GET /api/conversas/[id]/interno`
  - carrega resumo interno do lead vinculado à conversa

- `POST /api/conversas/[id]/interno/handoff`
  - handoff direto da thread da inbox

## Superfícies de UI

### 1. Detalhe do lead

Novo bloco:

- `Coordenação interna`

Conteúdo:

- campo de comentário rápido
- lista de comentários internos
- tarefas abertas
- dono atual do lead
- botão `Transferir`
- botão `Marcar tarefa`

### 2. Caixa de Entrada

No painel da conversa:

- novo card lateral/resumo:
  - dono atual
  - última anotação interna
  - tasks abertas

Mais ações:

- `Adicionar nota`
- `Transferir`
- `Criar tarefa`
- `Aguardar financeiro`
- `Aguardar jurídico`

### 3. Kanban

Não abrir chat completo no card.

Entram só atalhos:

- `Ativar follow-up` fica para fase seguinte
- nesta fase:
  - indicador de dono atual
  - contador de tasks abertas
  - atalho `Adicionar nota`

## Fluxos principais

### Fluxo 1 — Passagem de bastão na inbox

1. humano assume a conversa
2. registra nota interna
3. transfere para outro usuário
4. sistema grava handoff
5. conversa e lead refletem novo dono atual

### Fluxo 2 — Coordenação no detalhe do lead

1. usuário abre lead
2. registra orientação interna
3. cria task para outro membro
4. task aparece no próprio lead
5. administrador consegue auditar depois

### Fluxo 3 — Escalada operacional

1. atendimento identifica que precisa de jurídico/financeiro
2. registra handoff interno com motivo
3. lead passa a mostrar status interno compatível
4. histórico fica salvo

## Regras operacionais

### 1. Toda ação interna precisa de autor

Não existe evento interno sem `autor_usuario_id`.

### 2. Handoff precisa virar registro

Troca de dono não pode ser só update de status.

Precisa gerar:

- `lead_handoffs`
- mensagem interna tipo `sistema` ou `handoff`

### 3. Task interna não substitui comentário

Task responde:

- o que precisa ser feito
- por quem
- até quando

Comentário responde:

- contexto
- decisão
- orientação

### 4. Timeline do cliente continua separada

Nada interno do escritório aparece no portal do cliente.

## Backlog técnico sugerido

### Bloco 1 — Banco

- criar migrations de:
  - `lead_threads_internas`
  - `lead_mensagens_internas`
  - `lead_tasks`
  - `lead_handoffs`
  - `lead_watchers`
- índices por:
  - `tenant_id`
  - `lead_id`
  - `assigned_to`
  - `created_at`

### Bloco 2 — Backend

- APIs do lead interno
- API de handoff da inbox
- validação tenant-aware por lead
- serialização de resumo interno

### Bloco 3 — UI do detalhe do lead

- card `Coordenação interna`
- comentário rápido
- lista de notas
- criação de task
- bloco de dono atual

### Bloco 4 — UI da inbox

- resumo interno no painel
- ação de handoff
- ação de criar nota
- ação de criar task

### Bloco 5 — Gestão mínima

- no admin do escritório depois
- não precisa entrar na primeira entrega da Fase A

## Critérios de aceite

### Entrega mínima aceita

- usuário autenticado consegue comentar internamente em um lead
- comentário fica salvo com autor e horário
- usuário consegue transferir responsabilidade
- handoff fica registrado
- usuário consegue criar task interna simples
- inbox mostra resumo interno do lead atual
- tudo respeita tenant-aware e acesso por lead

### Entrega ainda não necessária para concluir a fase

- feed global de colaboração
- dashboard avançado de produtividade
- menção com notificação sofisticada
- automações automáticas baseadas em task

## Riscos e cuidados

### 1. Não duplicar status demais

Evitar criar um segundo sistema de status que brigue com:

- `lead.status`
- `conversa.status`

A camada interna deve complementar, não substituir.

### 2. Não virar CRM paralelo dentro do CRM

Task e comentário devem continuar leves.

Se ficarem genéricos demais, a equipe perde velocidade.

### 3. Não esconder ação importante

Se handoff existir, ele precisa aparecer:

- no lead
- na inbox
- no histórico interno

## Próximo passo após esta spec

Transformar a Fase A em:

1. migration SQL
2. rotas API
3. primeira UI no detalhe do lead
4. depois integração com inbox
