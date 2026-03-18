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

Ultima atualizacao: 2026-03-18

- Branch principal: `main`
- Linha atual do produto no Obsidian: Fases 21, 22, 23 e 24 concluidas
- Proxima fase recomendada: `Fase 25 — Session Security Hardening`
- Producao atual: `https://prevlegal.vercel.app`
- Dominio comprado: `prevlegal.com.br`

## Proximo Passo Recomendado

Implementar hardening de sessao:
- timeout por inatividade no app: `45 min`
- timeout por inatividade no admin: `15 min`
- reautenticacao para acoes sensiveis:
  - admin
  - financeiro
  - exportacoes
  - exclusoes
  - integracoes e credenciais

## Bloqueios e Cuidados

- Sempre rodar `npm run build` antes de concluir uma fase
- Sempre atualizar `docs/CODEX_HANDOFF.md`, `docs/ROADMAP.md` e `docs/LEARNINGS.md`
- Sempre sincronizar os docs com o Obsidian ao final da sessao
- Ao mexer em produto, considerar `SITE_URL` separado de `APP_URL`
- O modelo atual ainda tem trechos single-tenant; nao assumir multi-tenant real sem revisar

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
