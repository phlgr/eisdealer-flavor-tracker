#!/bin/bash
set -e

cd /app

# Run the scraper
bun run packages/scraper/src/index.ts

# Check if data changed
if git diff --quiet data/; then
  echo "[run] No data changes"
  exit 0
fi

# Commit and push
echo "[run] Data changed, committing..."
git config user.name "eisdealer-bot"
git config user.email "eisdealer-bot@users.noreply.github.com"
git add data/
git commit -m "update flavor data"
git push
echo "[run] Pushed data update"
