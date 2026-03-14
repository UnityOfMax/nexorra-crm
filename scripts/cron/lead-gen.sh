#!/bin/bash
# Lead Gen — scrape 1000 real estate agent leads
# Schedule: 8:00 AM daily
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
LOG="logs/lead-gen.log"
mkdir -p logs

echo "$(date '+%Y-%m-%d %H:%M:%S') — Triggering lead-gen" >> "$LOG"

# Launch Chrome for browser-based scraping
bash scripts/chrome-launch.sh >> "$LOG" 2>&1

# Trigger via daemon — it handles spawning, logging, status
RESPONSE=$(curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"agentId": "lead-gen", "trigger": "cron"}')

echo "$(date '+%Y-%m-%d %H:%M:%S') — $RESPONSE" >> "$LOG"
