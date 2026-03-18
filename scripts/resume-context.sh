#!/bin/bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/Downloads/prevlegal}"
VAULT_DIR="${VAULT_DIR:-$HOME/Documents/Fluxrow/PrevLegal}"

cd "$PROJECT_DIR"

echo "== PrevLegal: Resume Context =="
echo
echo "-- Projeto"
printf 'cwd: %s\n' "$PROJECT_DIR"
printf 'branch: %s\n' "$(git branch --show-current)"
printf 'head: %s\n' "$(git rev-parse --short HEAD)"
printf 'status: %s\n' "$(git status --short | wc -l | tr -d ' ') arquivo(s) alterado(s)"
echo

echo "-- Session Brief"
sed -n '1,220p' docs/SESSION_BRIEF.md
echo

echo "-- Ultimos commits"
git log --oneline --decorate -n 8
echo

echo "-- Proximos passos do handoff"
awk '
  /^## Proximos Passos/ {flag=1; print; next}
  /^## / && flag {exit}
  flag {print}
' docs/CODEX_HANDOFF.md
echo

if [ -d "$VAULT_DIR" ]; then
  echo "-- Obsidian"
  printf 'vault: %s\n' "$VAULT_DIR"
  for file in MASTER.md ROADMAP.md LEARNINGS.md; do
    if [ -f "$VAULT_DIR/$file" ]; then
      printf 'ok: %s\n' "$VAULT_DIR/$file"
    else
      printf 'missing: %s\n' "$VAULT_DIR/$file"
    fi
  done
  echo
fi

echo "Comando sugerido para retomada no chat:"
echo "retoma prevlegal pelo protocolo"
