# Briefing para Claude (com acesso web) — PrevLegal

> Criado em: 2026-03-17
> Branch atual de trabalho: `feat/financeiro`
> Repo: https://github.com/fluxrow/prevlegal

---

## O que é o PrevLegal

SaaS para advogados autônomos de direito previdenciário (Brasil).

- **Empresa operadora:** Fluxrow
- **Stack:** Next.js 16 App Router + React 19 + Supabase + Twilio WhatsApp + Anthropic Claude API + Vercel
- **Multi-tenant por RLS** — cada advogado (usuario_id) vê só seus dados
- **Modelo de negócio:** por consulta (não por assinatura). Sem planos.
- **Primeiro usuário real:** namorada do fundador, advogada previdenciária

---

## O que foi feito nas últimas sessões com Claude Code (sem web)

### PRs abertos (aguardam merge no main)

| Branch             | PR                                 | O que faz                                                                                            |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `fix/ui-melhorias` | #2                                 | Sidebar reordenada, confirm/alert→toast, labels humanizadas em campanhas, model ID correto no agente |
| `feat/financeiro`  | aberto via link (gh não instalado) | Fase 21 completa — gestão de honorários                                                              |

> **Para fazer merge:** acesse https://github.com/fluxrow/prevlegal/pulls — fazer merge do PR #2 primeiro, depois o de `feat/financeiro`

---

## Fase 21 — Gestão Financeira de Honorários (implementada, aguardando merge)

### Arquivos criados

**Migration:**

- `supabase/migrations/029_financeiro.sql`
  - Tabela `contratos`: lead_id, tipo_cobranca (exito/fixo/misto), valor_total, percentual_exito, status, data_inicio
  - Tabela `parcelas`: contrato_id, numero, valor, data_vencimento, data_pagamento, status (pendente/pago/atrasado)
  - RLS por usuario_id em ambas as tabelas

**APIs:**

- `GET/POST /api/financeiro/contratos` — lista por lead_id, cria contrato + gera parcelas mensais automaticamente
- `PATCH/DELETE /api/financeiro/contratos/[id]`
- `PATCH /api/financeiro/parcelas/[id]` — baixa pagamento (preenche data_pagamento automaticamente)
- `GET /api/financeiro/resumo` — KPIs: total_contratado, total_recebido, total_pendente, total_atrasado, recebido_mes, previsto_mes

**Frontend:**

- `/financeiro` — página de dashboard com 4 KPIs + lista parcelas em aberto + todos os contratos
- `src/components/contrato-lead.tsx` — componente embarcado no detalhe do lead
- Sidebar: item "Financeiro" com ícone DollarSign entre Agente IA e Relatórios

### Setup necessário no Supabase (AINDA NÃO FEITO)

Executar `supabase/migrations/029_financeiro.sql` no SQL Editor do projeto prevlegal no Supabase Dashboard.

---

## Fix do Drawer de Leads (implementado na mesma branch)

**Problema:** Ao clicar em um card de lead no Kanban, abria apenas um drawer lateral com dados básicos. Documentos, calculadora, gerador IA e honorários só ficavam acessíveis na página `/leads/[id]`.

**Solução:** Adicionado botão "Ver perfil completo — documentos, calculadora, IA e honorários" no cabeçalho do drawer (`src/components/lead-drawer.tsx`). O botão navega para `/leads/[id]` usando `router.push`.

---

## Bugs corrigidos (já no main)

1. **Campanhas disparando para CPF** em vez de telefone — `normalizePhone(lead.cpf)` → `normalizePhone(lead.telefone)`
2. **Middleware bloqueando rotas públicas** — `/portal/[token]`, `/admin/login`, `/auth/`, `/api/` agora são públicas
3. **Agente IA com model ID errado** — `claude-sonnet-4-20250514` → `claude-sonnet-4-5`

---

## Setup que ainda precisa ser feito

### 1. Executar migrations no Supabase

```sql
-- No SQL Editor do projeto prevlegal:
-- 029_financeiro.sql (tabelas contratos e parcelas)
```

### 2. Inserir número Twilio na tabela numeros_whatsapp

```sql
INSERT INTO numeros_whatsapp (numero, ativo, bloqueado, limite_diario, total_enviados_hoje)
VALUES ('whatsapp:+14155238886', true, false, 500, 0);
-- Usar o número sandbox do Twilio até ter número próprio
```

### 3. Autenticar MCPs no Claude (`/mcp`)

- Vercel — para deploy automático
- Supabase — para gerenciar banco direto
- Stripe — para cobrança por consulta (ainda não implementada)
- Google Calendar/Gmail — para agendamentos e notificações

---

## Arquitetura atual do banco (Supabase)

### Schema do advogado (multi-tenant por usuario_id)

Tabelas principais:

- `leads` — lead previdenciário com score, ganho_potencial, status (new/contacted/awaiting/scheduled/converted/lost)
- `lead_anotacoes` — anotações por lead
- `lead_documentos` — documentos anexados (storage Supabase)
- `conversas` + `mensagens` — histórico WhatsApp por lead
- `agendamentos` — consultas agendadas
- `campanhas` + `lista_leads` — disparo em massa via Twilio
- `configuracoes` + `advogados` — perfil do advogado (OAB, escritório, assinatura)
- `usuarios` + `usuario_roles` — multi-usuário por escritório
- `contratos` + `parcelas` — honorários (nova, aguarda migration 029)

### Schema central Fluxrow (admin)

- `tenants` — todos os advogados cadastrados
- `faturamento` — cobrança da Fluxrow pelos advogados (não confundir com honorários dos advogados)

---

## Convenções do projeto (regras para o Claude)

1. **NUNCA commitar direto no main** — sempre branch + PR
2. **Conventional Commits obrigatório:** `feat|fix|docs|style|refactor|perf|test|build|ci|chore`
3. **Multi-tenant sagrado** — todo query novo deve ter `.eq('usuario_id', user.id)` (RLS cobre, mas por segurança)
4. **LGPD** — nenhum dado de lead exposto sem consentimento rastreado
5. **Sem planos** — modelo por consulta, não por assinatura
6. **WhatsApp first** — canal principal via Twilio

---

## Próximas prioridades

1. **Merge dos PRs abertos** (#2 e feat/financeiro)
2. **Executar migration 029** no Supabase para ativar o módulo financeiro
3. **Inserir número Twilio** em `numeros_whatsapp` para liberar disparo de campanhas
4. **Testar fluxo completo com a advogada** (primeira usuária real):
   - Importar lista → campanha → disparo → resposta → agendamento
5. **Implementar Stripe** — cobrança por consulta ao escritório parceiro
6. **Landing page** — `public/lp.html` já existe, falta publicar e configurar domínio
7. **Autenticar MCPs** no Claude

---

## Infraestrutura de automação no Mac do fundador

**LaunchAgents ativos (rodam automaticamente):**

- `com.fluxrow.prevlegal.standup` — Seg-Sex 8:57h → standup diário
- `com.fluxrow.prevlegal.content` — Segunda 8:03h → calendário editorial semanal
- `com.fluxrow.prevlegal.codereview` — Sexta 17:03h → revisão de código
- `com.fluxrow.prevlegal.report` — Segunda 9:03h → relatório executivo semanal

**Hooks Claude Code ativos:**

- `sql-governance.py` — bloqueia SQL destrutivo
- `pre-commit-validation.sh` — bloqueia commit com TypeScript errors
- `commit-message-formatter.sh` — valida Conventional Commits
- `auto-format.sh` — roda Prettier após Write/Edit

---

## Notas importantes

- **Vercel preview deploy falha** com `supabaseUrl is required` — é bug pré-existente (env vars não configuradas no preview). Produção funciona. Não bloqueia merge.
- **Twilio em sandbox** — para testar disparo de campanhas, lead precisa enviar "join [código]" para o número sandbox
- **README no GitHub está vazio** (`# prevlegal`) — o Codex pode ter feito mudanças locais que não foram commitadas. Verificar com `git status` no diretório do projeto antes de trabalhar.
