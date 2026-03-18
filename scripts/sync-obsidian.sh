#!/bin/bash
# sync-obsidian.sh — executar ao final de cada sessao de desenvolvimento

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$HOME/Downloads/prevlegal}"
VAULT_DIR="${VAULT_DIR:-$HOME/Documents/Fluxrow}"
DATA="$(date +%Y-%m-%d)"
TEMA="${1:-sessao}"
PROXIMO_PASSO="${2:-a definir}"

echo
echo "Sincronizando Obsidian..."

mkdir -p "$VAULT_DIR/PrevLegal"
mkdir -p "$VAULT_DIR/Sessoes"

# 1. Copia todos os MDs do diretório docs para o vault do PrevLegal
find "$PROJECT_DIR/docs" -maxdepth 1 -type f -name '*.md' | while read -r file; do
  cp "$file" "$VAULT_DIR/PrevLegal/$(basename "$file")"
done

# 2. Cria nota da sessao
SESSAO_FILE="$VAULT_DIR/Sessoes/$DATA-$TEMA.md"

{
  echo "# Sessao $DATA - $TEMA"
  echo
  echo "## Navegação"
  echo "- [[PrevLegal/INDEX]]"
  echo "- [[PrevLegal/MASTER]]"
  echo "- [[PrevLegal/ROADMAP]]"
  echo "- [[PrevLegal/LEARNINGS]]"
  echo "- [[PrevLegal/SESSION_BRIEF]]"
  echo
  echo "## Commits desta sessao"
  git -C "$PROJECT_DIR" log --oneline --since='12 hours ago' --format='- %h %s'
  echo
  echo "## Ultimo commit"
  git -C "$PROJECT_DIR" log --oneline -1
  echo
  echo "## Status"
  git -C "$PROJECT_DIR" status --short --branch
  echo
  echo "## Proximo passo"
  echo "- [ ] $PROXIMO_PASSO"
} > "$SESSAO_FILE"

echo "Vault atualizado"
echo "Nota criada: $SESSAO_FILE"
echo "Proximo passo registrado: $PROXIMO_PASSO"
