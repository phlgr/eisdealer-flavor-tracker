#!/bin/bash
set -e

cd /app

# Pull latest data before scraping
git pull --ff-only || true

# Run the scraper
bun run packages/scraper/src/index.ts

# Check if data changed
if git diff --quiet data/; then
  echo "[run] No data changes"
  exit 0
fi

# Commit and push using GH_TOKEN
if [ -z "$GH_TOKEN" ]; then
  echo "[run] Error: GH_TOKEN not set, cannot push"
  exit 1
fi

echo "[run] Data changed, committing..."
git config user.name "eisdealer-bot"
git config user.email "eisdealer-bot@users.noreply.github.com"
git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/phlgr/eisdealer-flavor-tracker.git"
git add data/
git commit -m "update flavor data"
git push
echo "[run] Pushed data update"
