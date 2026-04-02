# PrevLegal — MOBILE_CLIENT_APP_BACKLOG.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

> Backlog técnico canônico do MVP mobile do cliente/familiar.
> Derivado do portal atual, do plano de produto e do estado real do código em 2026-04-01.

---

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[MOBILE_CLIENT_APP_PLAN]]

## Estado Real de Partida

O mobile do cliente não começa do zero. Ele começa do portal atual.

Superfícies já existentes:
- `src/app/portal/[token]/page.tsx`
- `src/app/api/portal/[token]/route.ts`
- `src/app/api/portal/link/[leadId]/route.ts`
- `src/app/api/portal/threads/route.ts`
- `src/app/api/portal/mensagens/[leadId]/route.ts`

Capacidades já presentes no produto:
- acesso por `portal_token`
- mensagens via `portal_mensagens`
- documentos compartilhados via `lead_documentos`
- leitura de status do lead
- agendamentos no domínio do produto
- Google Meet quando o agendamento existir

Débitos reais já confirmados:
- o portal atual ainda é `token-only`
- o portal atual ainda tem branding hardcoded de `Alexandrini Advogados`
- não existe identidade persistente de cliente/familiar
- o portal ainda não expõe agenda e documentos com ergonomia mobile de app
- o portal ainda não foi modelado como PWA instalável

## Decisão Técnica

Ordem oficial:
1. endurecer e evoluir o portal atual
2. transformar em experiência mobile-first
3. publicar como PWA instalável
4. criar identidade persistente do cliente/familiar
5. avaliar app nativo apenas depois

## Objetivo do MVP

Entregar uma experiência em que cliente ou familiar consiga:
- entender em que etapa o caso está
- ver próximos passos e próximas consultas
- entrar no Meet
- enviar e receber mensagens
- acompanhar documentos e pendências
- atualizar dados básicos de contato

## Escopo Técnico por Fase

### Fase 1 — Portal Mobile-First

Objetivo:
- transformar o portal atual em uma superfície realmente usável no celular

Entregas:
- home do portal com resumo do caso e próximos passos
- agenda do cliente com próxima consulta e link do Meet
- documentos organizados por checklist
- envio de documento pelo cliente/familiar dentro do portal
- pedido de remarcação pelo cliente/familiar
- mensagens com hierarquia melhor
- branding dinâmico por tenant no lugar de conteúdo fixo
- layout preparado para PWA

Dependências reais:
- tenant branding/configuração pública por escritório
- leitura tenant-aware das informações exibidas ao cliente
- revisão do payload de `GET /api/portal/[token]`

### Fase 2 — PWA Instalável

Objetivo:
- permitir que o cliente “instale” o portal como app

Entregas:
- manifest
- ícones
- splash/cores
- metadados mobile
- experiência offline mínima de shell

Dependências reais:
- branding dinâmico
- home mobile estável

### Fase 3 — Identidade Persistente

Objetivo:
- parar de depender apenas de link com token

Entregas:
- modelo de `portal_users`
- acesso por magic link ou OTP
- sessão persistente simples
- vínculo entre cliente/familiar e lead/caso

Dependências reais:
- separação explícita entre usuário interno e usuário de portal
- definição de política de acesso por lead/caso

### Fase 4 — Canal Mobile Operacional

Objetivo:
- transformar o portal em canal recorrente de relacionamento

Entregas:
- notificações
- upload melhor de documentos
- pedido de remarcação
- histórico de andamento mais rico

### Fase 5 — App Nativo, se justificar

Objetivo:
- capturar ganhos que a PWA não resolver bem

Gatilhos:
- necessidade real de push nativo
- necessidade real de câmera/scan/background
- retenção recorrente suficiente para justificar store presence

## Backlog de Entidades

### 1. `portal_users`

Função:
- representar cliente, familiar ou cuidador com acesso persistente

Campos sugeridos:
- `id`
- `tenant_id`
- `lead_id`
- `nome`
- `email`
- `telefone`
- `papel` (`cliente`, `familiar`, `cuidador`)
- `ativo`
- `ultimo_acesso_em`
- `created_at`
- `updated_at`

### 2. `portal_access_links`

Função:
- controlar acesso por link temporário e futura transição para magic link/OTP

Campos sugeridos:
- `id`
- `tenant_id`
- `portal_user_id` nullable
- `lead_id`
- `token_hash`
- `tipo` (`portal_link`, `magic_link`, `otp`)
- `expira_em`
- `usado_em`
- `created_at`

### 3. `portal_timeline_events`

Função:
- fornecer uma linha do tempo clara do caso para o cliente

Campos sugeridos:
- `id`
- `tenant_id`
- `lead_id`
- `tipo`
- `titulo`
- `descricao`
- `visivel_cliente`
- `created_at`

### 4. `portal_document_requests`

Função:
- explicitar checklist de documentos pendentes

Campos sugeridos:
- `id`
- `tenant_id`
- `lead_id`
- `titulo`
- `descricao`
- `status` (`pendente`, `enviado`, `aprovado`, `rejeitado`)
- `created_at`
- `updated_at`

## Backlog de Rotas

### Fase 1

- `GET /api/portal/[token]`
  - expandir payload para:
    - próximos agendamentos
    - link do Meet
    - pendências de documento
    - branding do tenant
- `POST /api/portal/[token]/documentos/upload`
  - opcional em fase 1.5 se o upload já entrar

### Fase 2

- `GET /api/portal/manifest/[token-or-tenant]`
- `GET /api/portal/branding/[token-or-tenant]`

### Fase 3

- `POST /api/portal/auth/request-access`
- `POST /api/portal/auth/verify`
- `GET /api/portal/me`
- `PATCH /api/portal/me`

### Fase 4

- `GET /api/portal/me/agendamentos`
- `GET /api/portal/me/documentos`
- `GET /api/portal/me/timeline`
- `POST /api/portal/me/remarcacao`

## Backlog de Telas

### Tela 1 — Home

Conteúdo:
- status do caso
- última atualização
- próxima ação esperada
- próxima consulta
- pendências de documento

### Tela 2 — Mensagens

Conteúdo:
- histórico com equipe
- composer simples
- anexos leves depois

### Tela 3 — Agenda

Conteúdo:
- próxima consulta
- histórico próximo
- botão para entrar no Meet
- instruções da reunião

### Tela 4 — Documentos

Conteúdo:
- compartilhados
- pendentes
- checklist do que falta
- upload em fase seguinte

### Tela 5 — Perfil

Conteúdo:
- nome
- telefone
- e-mail
- responsável familiar
- preferências de contato

### Tela 6 — Acesso

Conteúdo:
- magic link / OTP / entrada por link seguro
- explicação simples
- reforço de segurança

## Débitos a Resolver Antes do MVP

### 1. Branding hardcoded no portal

Hoje `src/app/portal/[token]/page.tsx` ainda mostra:
- `Alexandrini Advogados`
- telefone fixo
- domínio fixo

Isso precisa sair antes de chamar a experiência de produto multi-tenant.

### 2. Payload do portal é estreito demais

Hoje `GET /api/portal/[token]` retorna:
- lead básico
- documentos compartilhados
- mensagens

Para o MVP mobile-first ele precisa também retornar:
- branding do tenant
- agenda futura
- meet link quando existir
- pendências de documento
- resumo mais claro do estágio do caso

### 3. Acesso ainda depende só de token

Isso é aceitável para fase inicial, mas não sustenta a visão de app recorrente.

### 4. Linguagem do portal ainda é pouco orientada a “próximos passos”

O app do cliente não deve parecer uma tela interna adaptada.

## Ordem de Implementação Recomendada

### Sprint 1

- remover branding hardcoded do portal
- ampliar payload do portal
- redesenhar home mobile-first
- mostrar próxima consulta e Meet

### Sprint 2

- checklist de documentos
- revisão da área de mensagens
- manifest e installability de PWA

### Sprint 3

- modelagem de `portal_users`
- fluxo de acesso persistente
- perfil do cliente/familiar

### Sprint 4

- timeline do caso
- remarcação
- notificações

## Critérios de Sucesso

### Produto

- cliente/familiar entende o andamento sem depender de WhatsApp solto
- link de reunião fica fácil de achar
- pendências de documento ficam explícitas
- o portal passa a ser usável no celular como ferramenta diária

### Técnica

- nenhuma regra de negócio duplicada fora do backend atual
- nada mistura `usuarios` internos com identidade de cliente
- branding e dados do portal ficam tenant-aware
- a PWA nasce sobre a superfície existente, não como app paralelo

## Próximo Passo Imediato

Iniciar pela Fase 1:
- remover branding hardcoded do portal atual
- reestruturar `GET /api/portal/[token]` para suportar home mobile-first
- desenhar a nova home do cliente com:
  - status
  - próxima consulta
  - mensagens
  - documentos pendentes

## Atualizacao 2026-04-02 - Confirmacao de presenca

- a fase 1 do portal mobile-first agora tambem cobre:
  - confirmacao de presenca na proxima consulta
- isso fortalece o app do cliente como canal de agenda e reduz friccao operacional para o escritorio
