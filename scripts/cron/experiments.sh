#!/bin/bash
# Experiments (Hugo) — 10:00 PM daily
# Starts Hugo who triggers Mira (10:30 PM) and Quinn (11:00 PM) if needed

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG_FILE="logs/experiments.log"
mkdir -p logs

echo "$(date '+%Y-%m-%d %H:%M:%S') — Starting Experiments (Hugo)" >> "$LOG_FILE"

DAEMON_URL="http://localhost:4200"
BODY='{"agentId": "hugo", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" | awk '{print $2}')

RUN_RESPONSE=$(curl -s -X POST "$DAEMON_URL/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: $SIGNATURE" \
  -d "$BODY")

RUN_ID=$(echo "$RUN_RESPONSE" | grep -o '"runId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — Hugo already running or failed to start" >> "$LOG_FILE"
  echo "$RUN_RESPONSE" >> "$LOG_FILE"
  exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') — Hugo spawned, run ID: $RUN_ID" >> "$LOG_FILE"
