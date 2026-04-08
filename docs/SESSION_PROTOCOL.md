# PrevLegal — SESSION_PROTOCOL.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]

Protocolo operacional para nao perder contexto entre sessoes.

## Navegação

- [[INDEX]]
- [[SESSION_BRIEF]]
- [[CODEX_HANDOFF]]
- [[EXECUTION_TRACK]]
- [[CROSS_AI_ALIGNMENT_PROTOCOL]]
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

1. Ler `docs/EXECUTION_TRACK.md`
2. Ler `docs/SESSION_BRIEF.md`
3. Ler `docs/CROSS_AI_ALIGNMENT_PROTOCOL.md`
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

Toda IA que entrar no projeto deve obedecer o `EXECUTION_TRACK.md` como prioridade canônica.

## Comando de Retomada para o Usuario Enviar

Quando quiser me chamar para continuar daqui, use esta frase:

`retoma prevlegal pelo protocolo`

Se quiser forcar o uso do Obsidian tambem:

`retoma prevlegal pelo protocolo e confira o obsidian`
