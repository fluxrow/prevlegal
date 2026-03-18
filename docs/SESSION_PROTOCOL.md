# PrevLegal — SESSION_PROTOCOL.md

Protocolo operacional para nao perder contexto entre sessoes.

## Navegação

- [[INDEX]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[MASTER]]
- [[ROADMAP]]
- [[LEARNINGS]]

## Objetivo

Garantir retomada rapida, consistente e segura, mesmo se:
- a sessao cair
- trocar de agente
- voltar depois de dias
- precisar repassar para Claude ou outro assistente

## Fontes de Verdade

Dentro do repo:
- `docs/INDEX.md`
- `docs/SESSION_BRIEF.md`
- `docs/CODEX_HANDOFF.md`
- `docs/MASTER.md`
- `docs/ROADMAP.md`
- `docs/LEARNINGS.md`

No Obsidian:
- `~/Documents/Fluxrow/PrevLegal/MASTER.md`
- `~/Documents/Fluxrow/PrevLegal/ROADMAP.md`
- `~/Documents/Fluxrow/PrevLegal/LEARNINGS.md`
- `~/Documents/Fluxrow/Sessoes/`

## Ritual de Inicio

1. Ler `docs/SESSION_BRIEF.md`
2. Rodar `scripts/resume-context.sh`
3. Confirmar:
   - branch atual
   - ultimo commit
   - proximo passo
   - bloqueios conhecidos

## Ritual de Encerramento

1. Atualizar:
   - `docs/CODEX_HANDOFF.md`
   - `docs/ROADMAP.md`
   - `docs/LEARNINGS.md`
   - `docs/SESSION_BRIEF.md` se mudou fase, status ou bloqueio
2. Rodar build se houve mudanca relevante:
   - `npm run build`
3. Sincronizar com Obsidian:
   - `scripts/sync-obsidian.sh "<tema>" "<proximo passo>"`

## Regra Permanente

Toda sessao deve terminar com:
- estado atual documentado
- proximo passo explicito
- caminhos importantes preservados
- sincronizacao com o vault
- links cruzados mantidos entre as notas centrais

## Comando de Retomada para o Usuario Enviar

Quando quiser me chamar para continuar daqui, use esta frase:

`retoma prevlegal pelo protocolo`

Se quiser forcar o uso do Obsidian tambem:

`retoma prevlegal pelo protocolo e confira o obsidian`
