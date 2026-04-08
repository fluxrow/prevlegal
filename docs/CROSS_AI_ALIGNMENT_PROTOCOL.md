# PrevLegal — CROSS_AI_ALIGNMENT_PROTOCOL.md

Contexto: [[SESSION_HISTORY_MASTER]]
Mestra: [[MASTER_PREV_LEGAL]]
> Protocolo para manter Codex, Claude, AntiGravity e qualquer outra IA no mesmo trilho.
> Última atualização: 08/04/2026

## Objetivo

Evitar drift entre agentes.

Toda IA que entrar no projeto deve usar:
- as mesmas fontes de verdade
- o mesmo próximo passo oficial
- o mesmo ritual de atualização

## Fontes de verdade em ordem

Toda IA deve ler, nesta ordem:

1. `docs/EXECUTION_TRACK.md`
2. `docs/SESSION_BRIEF.md`
3. `docs/CODEX_HANDOFF.md`
4. `docs/ROADMAP.md`
5. `docs/LEARNINGS.md`
6. `docs/MASTER.md`

## Regra principal

Se houver conflito entre ideias da sessão e documentação:
- vence `EXECUTION_TRACK.md` para prioridade
- vence `MASTER.md` para doutrina de produto
- vence `LEARNINGS.md` para regra prática já aprendida

## O que nenhuma IA deve fazer

- mudar prioridade sem atualizar `EXECUTION_TRACK.md`
- começar feature nova enquanto existir bloqueio `P0` aberto no `EXECUTION_TRACK.md`
- confiar só na memória do chat
- encerrar sessão sem registrar:
  - o que foi feito
  - o que ficou pendente
  - o próximo passo oficial

## Ritual obrigatório de início

1. Ler os 6 arquivos na ordem acima
2. Confirmar:
- branch atual
- último commit
- próximo passo oficial
- bloqueios de go-live
3. Se o trabalho real não bater com o `EXECUTION_TRACK.md`, corrigir a documentação antes de continuar

## Ritual obrigatório de encerramento

1. Atualizar:
- `docs/CODEX_HANDOFF.md`
- `docs/ROADMAP.md`
- `docs/LEARNINGS.md`
- `docs/SESSION_BRIEF.md` se mudou o estado canônico
- `docs/EXECUTION_TRACK.md` se mudou prioridade ou etapa
2. Rodar `npm run build` se houve mudança de código
3. Rodar:
- `bash scripts/sync-obsidian.sh "<slug>" "<proximo passo>"`
4. Commitar com mensagem descritiva

## Prompt canônico para qualquer IA

Use este prompt ao retomar o PrevLegal em qualquer ferramenta:

```text
Retome o PrevLegal pelo protocolo.

Antes de propor ou implementar qualquer coisa, leia nesta ordem:
1. docs/EXECUTION_TRACK.md
2. docs/SESSION_BRIEF.md
3. docs/CODEX_HANDOFF.md
4. docs/ROADMAP.md
5. docs/LEARNINGS.md
6. docs/MASTER.md

Regras:
- siga o próximo passo oficial do EXECUTION_TRACK
- não abra nova frente se houver bloqueio P0 aberto
- atualize docs canônicos ao final
- se mudar prioridade, atualize o EXECUTION_TRACK
- se houver mudança de código, rode npm run build
- no encerramento, sincronize o Obsidian
```

## Estado oficial neste momento

O próximo passo oficial hoje é:

`Executar o patch 043 044 045 no banco operacional e validar a agenda Google sem fallback.`
