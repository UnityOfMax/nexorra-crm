#!/bin/bash
# Campaign Optimizer — analyze Meta + funnel data, propose ad changes
# Schedule: 10:00 PM daily
cd /home/max/crm || exit 1

# Operating hours guard: 10am-2am only
HOUR=$(date +%H)
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -lt 10 ]; then
  echo "$(date) — Outside operating hours (10am-2am). Skipping." >> "$LOG"
  exit 0
fi
set -a && source .env.local && set +a
LOG="logs/campaign-optimizer.log"
mkdir -p logs

echo "$(date '+%Y-%m-%d %H:%M:%S') — Triggering campaign-optimizer" >> "$LOG"

# Trigger via daemon — it handles spawning, logging, status
BODY='{"agentId": "marcus", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" | awk '{print $2}')
RESPONSE=$(curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: $SIGNATURE" \
  -d "$BODY")

echo "$(date '+%Y-%m-%d %H:%M:%S') — $RESPONSE" >> "$LOG"
