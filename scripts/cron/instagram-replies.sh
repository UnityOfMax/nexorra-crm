#!/bin/bash
# Instagram Reply Handler — runs every 15 minutes
# Processes inbound Instagram DM replies and generates responses

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG_FILE="logs/instagram-replies.log"
mkdir -p logs

# Quick check: any active conversations with recent inbound messages?
ACTIVE=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/instagram_conversations?status=eq.active&select=id&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

if [ "$ACTIVE" = "[]" ]; then
  exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') — Starting Instagram Reply Handler" >> "$LOG_FILE"

# Register run
RUN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/agents/runs" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"agentId": "instagram-replies", "trigger": "cron"}')

RUN_ID=$(echo "$RUN_RESPONSE" | grep -o '"runId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — Agent already running or failed to start" >> "$LOG_FILE"
  exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') — Run started: $RUN_ID" >> "$LOG_FILE"
