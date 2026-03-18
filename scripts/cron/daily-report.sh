#!/bin/bash
# Daily Report — aggregate metrics
# Schedule: 9:00 PM daily
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
LOG="logs/report.log"
mkdir -p logs

echo "$(date '+%Y-%m-%d %H:%M:%S') — Triggering daily report" >> "$LOG"

# Trigger via daemon — it handles spawning, logging, status
BODY='{"agentId": "ops-report", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" | awk '{print $2}')
RESPONSE=$(curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: $SIGNATURE" \
  -d "$BODY")

echo "$(date '+%Y-%m-%d %H:%M:%S') — $RESPONSE" >> "$LOG"
