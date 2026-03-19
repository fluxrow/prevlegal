# PrevLegal — SESSION_BRIEF.md

Resumo curto para retomada rapida de contexto no inicio de qualquer sessao.

## Navegação

- [[INDEX]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]
- [[CODEX_HANDOFF]]
- [[SESSION_PROTOCOL]]

## Fonte de Verdade

Ordem de leitura:
1. `docs/SESSION_BRIEF.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/ROADMAP.md`
4. `docs/LEARNINGS.md`
5. Vault Obsidian em `~/Documents/Fluxrow/PrevLegal/`

## Estado Atual

Ultima atualizacao: 2026-03-19

- Branch principal: `main`
- Linha atual do produto no Obsidian: Fases 21, 22, 23, 24 e 25 concluidas
- Fase atual: incidente critico de isolamento de dados entre escritorios + ajuste do Google OAuth
- Producao atual: `https://app.prevlegal.com.br`
- LP canônica: `https://www.prevlegal.com.br`
- Dominio comprado: `prevlegal.com.br`

## Proximo Passo Recomendado

Conter e corrigir o risco de multi-tenant:
- confirmar e mapear todas as superficies vazando dados entre escritorios
- bloquear onboarding multi-escritorio no mesmo banco enquanto nao houver isolamento real
- fechar o modelo canonico de tenancy antes de iniciar migration/backfill
- atacar a primeira onda de correcao em leads, listas, conversas, portal, financeiro e configuracoes
- em paralelo, corrigir o Google OAuth no Console para `app.prevlegal.com.br`

## Bloqueios e Cuidados

- Sempre rodar `npm run build` antes de concluir uma fase
- Sempre atualizar `docs/CODEX_HANDOFF.md`, `docs/ROADMAP.md` e `docs/LEARNINGS.md`
- Sempre sincronizar os docs com o Obsidian ao final da sessao
- Ao mexer em produto, considerar `SITE_URL` separado de `APP_URL`
- Na Vercel CLI atual, env de `Preview` pode exigir branch especifica; registrar isso antes de assumir que o projeto esta 100% alinhado
- O modelo atual tem comportamento single-tenant em varias tabelas e APIs; nao subir novos escritorios sem revisar isolamento de dados

## Caminhos Importantes

- Handoff local: `docs/CODEX_HANDOFF.md`
- Roadmap local: `docs/ROADMAP.md`
- Learnings locais: `docs/LEARNINGS.md`
- Master local: `docs/MASTER.md`
- Vault Obsidian:
  - `~/Documents/Fluxrow/PrevLegal/MASTER.md`
  - `~/Documents/Fluxrow/PrevLegal/ROADMAP.md`
  - `~/Documents/Fluxrow/PrevLegal/LEARNINGS.md`

## Regra de Sessao

No inicio:
- ler este arquivo
- rodar `scripts/resume-context.sh`

No final:
- atualizar docs locais
- rodar `scripts/sync-obsidian.sh "<tema>" "<proximo passo>"`
