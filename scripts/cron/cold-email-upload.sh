#!/bin/bash
# Cold Email Upload — push leads to Instantly
# Schedule: 9:00 AM daily
export PATH="/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd /home/max/crm
source .env.local 2>/dev/null
AGENT_ID="cold-email-upload"
DAEMON_URL="http://localhost:4200"
LOG_FILE="logs/cold-email.log"

# Register run start
RUN_ID=$(curl -s -X POST "$DAEMON_URL/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d "{\"agentId\":\"$AGENT_ID\",\"trigger\":\"cron\"}" 2>/dev/null | grep -o '"runId":"[^"]*"' | cut -d'"' -f4)

START=$(date +%s)
echo "$(date): Starting cold-email-upload (run: $RUN_ID)" >> "$LOG_FILE"

claude -p "$(cat .claude/commands/nexorra/cold-email-upload.md)" \
  --model haiku \
  --allowedTools "Bash,Read,Write,Grep,Glob" \
  --max-turns 50 \
  >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

END=$(date +%s)
DURATION=$((END - START))
STATUS="completed"
[ $EXIT_CODE -ne 0 ] && STATUS="failed"
echo "$(date): Finished cold-email-upload ($STATUS, ${DURATION}s)" >> "$LOG_FILE"

if [ -n "$RUN_ID" ]; then
  curl -s -X PATCH "$DAEMON_URL/runs/$RUN_ID" \
    -H "Content-Type: application/json" \
    -H "x-cron-secret: $CRON_SECRET" \
    -d "{\"status\":\"$STATUS\",\"duration_seconds\":$DURATION}" 2>/dev/null
fi
