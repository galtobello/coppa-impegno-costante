#!/bin/sh
# Aggiorna il numero di versione dei file del sito (?v=...) prima di ogni pubblicazione,
# così i browser scaricano subito i file nuovi invece di usare quelli in cache (GitHub Pages li tiene 10 minuti).
# Uso: sh scripts/versione.sh
set -e
cd "$(dirname "$0")/../docs"
V=$(date +%Y%m%d%H%M)
for f in index.html app.js api.js; do
  sed -i.bak -E "s/\?v=[0-9]+/?v=$V/g" "$f" && rm -f "$f.bak"
done
echo "versione $V"
grep -n "?v=" index.html app.js api.js
