#!/bin/bash
# sync-obsidian.sh — executar ao final de cada sessao de desenvolvimento

PROJECT_DIR=~/Downloads/prevlegal
VAULT_DIR=~/Documents/Fluxrow
DATA=$(date +%Y-%m-%d)
TEMA=${1:-sessao}

echo ''
echo 'Sincronizando Obsidian...'

# 1. Copia MDs atualizados para o vault
cp $PROJECT_DIR/docs/MASTER.md $VAULT_DIR/PrevLegal/MASTER.md
cp $PROJECT_DIR/docs/ROADMAP.md $VAULT_DIR/PrevLegal/ROADMAP.md
cp $PROJECT_DIR/docs/LEARNINGS.md $VAULT_DIR/PrevLegal/LEARNINGS.md

# 2. Cria nota da sessao
SESSAO_FILE="$VAULT_DIR/Sessoes/$DATA-$TEMA.md"

echo "# Sessao $DATA - $TEMA" > $SESSAO_FILE
echo '' >> $SESSAO_FILE
echo '## Commits desta sessao' >> $SESSAO_FILE
git -C $PROJECT_DIR log --oneline --since='12 hours ago' --format='- %h %s' >> $SESSAO_FILE
echo '' >> $SESSAO_FILE
echo '## Ultimo commit' >> $SESSAO_FILE
git -C $PROJECT_DIR log --oneline -1 >> $SESSAO_FILE
echo '' >> $SESSAO_FILE
echo '## Proximo passo' >> $SESSAO_FILE
echo '- [ ] a definir' >> $SESSAO_FILE

echo "Vault atualizado"
echo "Nota criada: $SESSAO_FILE"
