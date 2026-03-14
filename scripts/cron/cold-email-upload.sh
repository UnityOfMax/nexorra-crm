#!/bin/bash
# Cold Email Upload — push leads to Instantly
# Schedule: 9:00 AM daily
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
LOG="logs/cold-email.log"
mkdir -p logs

echo "$(date '+%Y-%m-%d %H:%M:%S') — Triggering cold-email-upload" >> "$LOG"

# Trigger via daemon — it handles spawning, logging, status
RESPONSE=$(curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"agentId": "cold-email-upload", "trigger": "cron"}')

echo "$(date '+%Y-%m-%d %H:%M:%S') — $RESPONSE" >> "$LOG"
