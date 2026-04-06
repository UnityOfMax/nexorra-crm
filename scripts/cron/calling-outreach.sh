#!/bin/bash
# calling-outreach.sh — Cole's nightly review cron (runs after calling window closes)
# Cron: 0 3 * * * /home/max/crm/scripts/cron/calling-outreach.sh >> /home/max/crm/logs/calling-review.log 2>&1
# (3am BST = after 2am BST calling window closes)
#
# The CALLING WINDOW itself is managed by the orchestrator daemon:
# Start:  2pm BST daily → bash scripts/calling/start-calling.sh
# Stop:   2am BST daily → orchestrator auto-exits when all windows close

set -euo pipefail
cd /home/max/crm
set -a && source .env.local && set +a

LOG="/home/max/crm/logs/calling-review.log"
echo "$(date): Starting Cole calling review..." | tee -a "$LOG"

# Check if there were any calls today
TODAY_MIDNIGHT=$(date -u +%Y-%m-%dT00:00:00Z)
COUNT=$(curl -s \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/call_sessions?called_at=gte.${TODAY_MIDNIGHT}&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo "$(date): $COUNT calls today" | tee -a "$LOG"

if [ "$COUNT" = "0" ]; then
  echo "$(date): No calls today — skipping review." | tee -a "$LOG"
  exit 0
fi

# Trigger Cole's review agent via daemon
BODY='{"agentId": "cole", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" -hex 2>/dev/null | awk '{print $NF}' || echo "nosig")

curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "x-signature: ${SIGNATURE}" \
  -d "$BODY" | tee -a "$LOG"

echo "" | tee -a "$LOG"
echo "$(date): Cole calling review complete." | tee -a "$LOG"
