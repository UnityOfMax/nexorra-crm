#!/bin/bash
# Cold Email Replies — classify + respond to inbound replies
# Schedule: every 15 minutes
export PATH="/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd /home/max/crm
source .env.local 2>/dev/null
AGENT_ID="cold-email-replies"
API_URL="http://localhost:3000/api/agents/runs"
LOG_FILE="logs/cold-email.log"

# Register run start
RUN_ID=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d "{\"agentId\":\"$AGENT_ID\",\"trigger\":\"cron\"}" 2>/dev/null | grep -o '"runId":"[^"]*"' | cut -d'"' -f4)

START=$(date +%s)

claude -p "$(cat .claude/commands/nexorra/cold-email-replies.md)" \
  --model haiku \
  --allowedTools "Bash,Read,Write,Grep,Glob" \
  --max-turns 80 \
  >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

END=$(date +%s)
DURATION=$((END - START))
STATUS="completed"
[ $EXIT_CODE -ne 0 ] && STATUS="failed"

if [ -n "$RUN_ID" ]; then
  curl -s -X PATCH "$API_URL?id=$RUN_ID" \
    -H "Content-Type: application/json" \
    -H "x-cron-secret: $CRON_SECRET" \
    -d "{\"status\":\"$STATUS\",\"duration_seconds\":$DURATION}" 2>/dev/null
fi
