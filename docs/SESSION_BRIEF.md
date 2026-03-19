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
- Fase atual: estabilizacao do fluxo de acesso/admin e provisionamento do responsavel
- Producao atual: `https://prevlegal.vercel.app`
- Dominio comprado: `prevlegal.com.br`

## Proximo Passo Recomendado

Fechar a validacao funcional do acesso:
- confirmar com a Jessica o recebimento do email de definicao de senha
- concluir a criacao da senha em `/auth/redefinir-senha`
- validar login em `/login`
- depois seguir com o fluxo certo: admin do sistema cria escritorio -> responsavel ativa a conta -> admin do escritorio convida os demais usuarios

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
