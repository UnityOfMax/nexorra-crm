#!/bin/bash
# Sync Claude Code conversation sessions to Obsidian
# Runs at 1:15 AM — after landing page cleanup, before sleep

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

echo "$(date) — Syncing conversations to Obsidian"
npx tsx scripts/obsidian-conversation-sync.ts >> logs/obsidian-sync.log 2>&1
echo "$(date) — Obsidian sync complete"
