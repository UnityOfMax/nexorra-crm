#!/bin/bash
# Lead Gen — scrape 1000 real estate agent leads
# Schedule: 8:00 AM daily
export PATH="/home/max/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd /home/max/crm
source .env.local 2>/dev/null
AGENT_ID="lead-gen"
DAEMON_URL="http://localhost:4200"
LOG_FILE="logs/lead-gen.log"

# Auto-launch Chrome if not already running
bash scripts/chrome-launch.sh >> "$LOG_FILE" 2>&1

# Register run start
RUN_ID=$(curl -s -X POST "$DAEMON_URL/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d "{\"agentId\":\"$AGENT_ID\",\"trigger\":\"cron\"}" 2>/dev/null | grep -o '"runId":"[^"]*"' | cut -d'"' -f4)

START=$(date +%s)
echo "$(date): Starting lead-gen (run: $RUN_ID)" >> "$LOG_FILE"

claude -p "$(cat .claude/commands/nexorra/lead-gen.md)" \
  --model haiku \
  --allowedTools "Bash,Read,Write,Grep,Glob,WebFetch" \
  --max-turns 100 \
  >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

END=$(date +%s)
DURATION=$((END - START))
STATUS="completed"
[ $EXIT_CODE -ne 0 ] && STATUS="failed"
echo "$(date): Finished lead-gen ($STATUS, ${DURATION}s)" >> "$LOG_FILE"

# Report completion
if [ -n "$RUN_ID" ]; then
  curl -s -X PATCH "$DAEMON_URL/runs/$RUN_ID" \
    -H "Content-Type: application/json" \
    -H "x-cron-secret: $CRON_SECRET" \
    -d "{\"status\":\"$STATUS\",\"duration_seconds\":$DURATION}" 2>/dev/null
fi
