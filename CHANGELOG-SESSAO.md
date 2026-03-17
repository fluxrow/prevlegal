# Changelog de Sessão — PrevLegal

> Documento gerado pelo Claude Code para atualização do contexto no VS Code
> Data: Março 2026 | Branch: `auditoria/fluxos`

---

## O que foi feito nesta sessão

### 1. Auditoria completa do repositório

Analisados todos os arquivos do projeto após clone completo em `~/prevlegal-local`.
Estado do projeto antes desta sessão:

- ✅ 27 migrations SQL aplicadas no Supabase
- ✅ 18 grupos de endpoints API implementados
- ✅ 17 componentes React criados
- ✅ Auth + RLS multi-tenant funcionando
- ✅ Webhook Twilio (receber mensagens) implementado e correto
- ✅ Agente IA com histórico, escalada e auto-resposta
- ✅ Gerador de documentos via Claude (petição, procuração, requerimento INSS)
- ✅ Calculadora previdenciária EC 103/2019 completa
- ❌ Bug crítico no disparo de campanhas (CPF no lugar de telefone)
- ❌ Bug médio no middleware (rotas públicas bloqueadas)

---

## Bugs corrigidos

### 🔴 BUG 1 — Campanhas disparando para CPF em vez de telefone

**Arquivo:** `src/app/api/campanhas/[id]/disparar/route.ts`
**Linha:** 115 (antes da correção)

**Problema:**

```typescript
// ERRADO — passava CPF de 11 dígitos como se fosse telefone
const phone = normalizePhone(lead.cpf || "");
```

A função `normalizePhone` aceita strings de 11 dígitos (tanto celular quanto CPF têm 11 dígitos). Resultado: todas as mensagens de campanha iam para números no formato `+5512345678909` que não existem — falha silenciosa em 100% dos disparos.

**Correção:**

```typescript
// CORRETO — usa o campo telefone do lead
const phone = normalizePhone(lead.telefone || "");
```

---

### 🟡 BUG 2 — Middleware bloqueando rotas públicas

**Arquivo:** `src/lib/supabase/middleware.ts`
**Linha:** 26 (antes da correção)

**Problema:**

```typescript
// ERRADO — só excluía /login, bloqueava tudo mais
if (!user && !request.nextUrl.pathname.startsWith("/login")) {
  redirect("/login");
}
```

Rotas quebradas:

- `/portal/[token]` — leads recebiam link mas eram mandados pro login
- `/admin/login` — página de login do painel admin não carregava
- `/auth/aceitar-convite` — convites de novos usuários quebravam
- `/api/*` — rotas de API retornavam redirect HTML em vez de JSON

**Correção:**

```typescript
// CORRETO — define todas as rotas que não precisam de auth
const publicPaths = ["/login", "/admin/login", "/portal", "/auth/", "/api/"];
const isPublic = publicPaths.some((p) =>
  request.nextUrl.pathname.startsWith(p),
);

if (!user && !isPublic) {
  redirect("/login");
}
```

---

## O que ainda precisa ser feito (setup de banco)

### Tabela `numeros_whatsapp` — precisa de 1 registro

O disparo de campanhas busca um número ativo nessa tabela. Se vazia, retorna erro `"Nenhum número WhatsApp ativo disponível"` e bloqueia todos os disparos.

**SQL para inserir o número Twilio:**

```sql
INSERT INTO numeros_whatsapp (
  numero,
  ativo,
  bloqueado,
  limite_diario,
  total_enviados_hoje
) VALUES (
  'whatsapp:+SEU_NUMERO_TWILIO',  -- ex: whatsapp:+14155238886
  true,
  false,
  500,
  0
);
```

Executar no Supabase Dashboard → SQL Editor do projeto prevlegal.

---

## Contexto de negócio (para o CLAUDE.md no VS Code)

### Modelo de negócio real

- **Empresa:** Fluxrow — opera o PrevLegal
- **Produto:** SaaS para advogados autônomos de direito previdenciário
- **Restrição legal:** Plataforma NÃO pode ter vínculo com escritórios de advocacia (proibido no Brasil). Advogados usam individualmente.
- **Fluxo real:**
  1. Empresa intermediária (Fluxrow/PrevLegal) compra listas de leads com direitos previdenciários
  2. IA qualifica os leads via WhatsApp
  3. Lead qualificado → escritório parceiro (sem vínculo formal) fecha o caso
- **Monetização:** Por consulta — sem planos mensais. Alto valor por cliente.
- **Primeiro usuário:** Namorada do fundador, advogada previdenciária

### Infraestrutura Claude Code instalada na máquina

Todos os agentes, skills e hooks abaixo estão disponíveis tanto no terminal (Claude Code CLI) quanto no VS Code (extensão `anthropic.claude-code-2.1.76`):

| Item                              | Quantidade |
| --------------------------------- | ---------- |
| Agentes em `~/.claude/agents/`    | 322        |
| Skills em `~/.claude/skills/`     | 75         |
| Commands em `~/.claude/commands/` | 30         |
| Plugins ativos                    | 18         |
| MCP servers                       | 9          |

**Agentes mais importantes para o PrevLegal:**

- `@aiox-architect` — decisões de arquitetura, PRDs
- `@aiox-dev` — implementação Next.js + Supabase
- `@aiox-qa` — qualidade e testes
- `@aiox-devops` — CI/CD e deploys
- `@legal-chief` — orquestração jurídica
- `@copy-chief` — copy e mensagens de campanhas
- `@traffic-masters-chief` — tráfego pago

**Hooks ativos (rodam automaticamente):**

- `sql-governance.py` — bloqueia SQL destrutivo (PreToolUse:Bash)
- `pre-commit-validation.sh` — bloqueia commit com TypeScript errors (PreToolUse:Bash)
- `commit-message-formatter.sh` — valida Conventional Commits (PreToolUse:Bash)
- `auto-format.sh` — roda Prettier após salvar arquivo (PostToolUse:Write/Edit)
- `precompact-session-digest.cjs` — preserva contexto entre sessões (PreCompact)

**LaunchAgents ativos (rodam automaticamente no Mac):**

- `com.fluxrow.prevlegal.standup` — Seg-Sex 8:57h → standup diário
- `com.fluxrow.prevlegal.content` — Segunda 8:03h → calendário editorial semanal
- `com.fluxrow.prevlegal.codereview` — Sexta 17:03h → revisão de código
- `com.fluxrow.prevlegal.report` — Segunda 9:03h → relatório executivo semanal

**MCPs conectados:**

- ✅ `filesystem`, `memory`, `github` — funcionando
- ⚡ `vercel`, `supabase-mcp`, `stripe`, `gcal`, `gmail`, `apollo` — precisam OAuth (`/mcp` no Claude)
- ❌ `postgresql` — precisa connection string do Supabase

---

## Próximas prioridades (em ordem)

1. **Autenticar MCPs** — rodar `/mcp` no Claude e autorizar Vercel + Supabase + Stripe + Google
2. **Inserir número na tabela `numeros_whatsapp`** — libera disparo de campanhas
3. **Testar fluxo completo com a namorada** — import de lista → campanha → disparo → resposta → agendamento
4. **Landing page de captação orgânica** — LP para advogados autônomos encontrarem o PrevLegal organicamente
5. **Stripe** — cobrança por consulta (não por assinatura)

---

## Convenções do projeto (regras para o Claude no VS Code)

1. **Nunca tocar** em arquivos existentes sem análise prévia
2. **Sempre usar branch** para qualquer mudança — nunca commitar direto no `main`
3. **Conventional Commits obrigatório:** `feat|fix|docs|style|refactor|perf|test|build|ci|chore`
4. **Multi-tenant sagrado** — todo query novo deve ter `.eq('tenant_id', ...)` ou usar RLS
5. **LGPD** — nenhum dado de lead exposto sem consentimento rastreado
6. **Sem planos** — modelo de negócio é por consulta, não assinatura
7. **WhatsApp first** — canal principal, toda feature nova considera integração Twilio

---

_Atualizar o CLAUDE.md do projeto com essas informações após fazer merge do PR._
