#!/bin/bash
# Instagram DM Outreach — runs after lead-gen (e.g., 9:30 AM daily)
# Sends initial cold DMs to leads with Instagram handles

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG_FILE="logs/instagram-outreach.log"
mkdir -p logs

echo "$(date '+%Y-%m-%d %H:%M:%S') — Starting Instagram DM Outreach" >> "$LOG_FILE"

# Ensure Chrome is running
if ! curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — Chrome not running, launching..." >> "$LOG_FILE"
  bash scripts/chrome-launch.sh >> "$LOG_FILE" 2>&1
  sleep 5
fi

# Register run start
DAEMON_URL="http://localhost:4200"

RUN_RESPONSE=$(curl -s -X POST "$DAEMON_URL/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"agentId": "instagram-outreach", "trigger": "cron"}')

RUN_ID=$(echo "$RUN_RESPONSE" | grep -o '"runId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — Agent already running or failed to start" >> "$LOG_FILE"
  echo "$RUN_RESPONSE" >> "$LOG_FILE"
  exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') — Run started: $RUN_ID" >> "$LOG_FILE"

# Wait for completion (agent runs as detached process via API route)
echo "$(date '+%Y-%m-%d %H:%M:%S') — Instagram DM agent spawned, run ID: $RUN_ID" >> "$LOG_FILE"
