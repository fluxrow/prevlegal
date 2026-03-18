# PrevLegal — Claude Code Context

## Skills locais — ler no início de cada sessão

- **prevlegal-product-ops**: ~/.codex/skills/prevlegal-product-ops/SKILL.md
- **prevlegal-dev**: /mnt/skills/user/prevlegal-dev/SKILL.md

Leia AMBAS as skills antes de qualquer implementação.

## Memória do projeto

Antes de propor ou implementar qualquer coisa, leia:
1. `docs/MASTER.md` — contexto do produto, modelo de negócio, stack
2. `docs/ROADMAP.md` — fases concluídas e backlog priorizado
3. `docs/LEARNINGS.md` — erros conhecidos e padrões a seguir

## Ritual de entrega (obrigatório ao final de toda sessão)

1. `npm run build` — sempre antes de qualquer push
2. Atualizar `docs/ROADMAP.md` com o que foi feito
3. Adicionar novos aprendizados em `docs/LEARNINGS.md`
4. `bash scripts/sync-obsidian.sh "tema-da-sessao"`
5. `git add -A && git commit -m "mensagem descritiva" && git push origin main`

## Stack

Next.js 16.1.6 · TypeScript · Supabase · Vercel · Twilio · Claude API · Recharts

## Padrões críticos

- `params` em dynamic routes: sempre `await params`
- `createClient` admin: instanciar DENTRO de cada handler
- `cookies()`: sempre `await cookies()`
- Commits em português, descritivos
- RTK instalado: comprime outputs CLI automaticamente
