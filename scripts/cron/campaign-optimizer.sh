#!/bin/bash
# Campaign Optimizer — analyze Meta + funnel data, propose ad changes
# Schedule: 10:00 PM daily
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
LOG="logs/campaign-optimizer.log"
mkdir -p logs

echo "$(date '+%Y-%m-%d %H:%M:%S') — Triggering campaign-optimizer" >> "$LOG"

# Trigger via daemon — it handles spawning, logging, status
RESPONSE=$(curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"agentId": "campaign-optimizer", "trigger": "cron"}')

echo "$(date '+%Y-%m-%d %H:%M:%S') — $RESPONSE" >> "$LOG"
