#!/bin/bash
# Cold Email Replies — every 15 min — Priya processes needs_reply conversations
cd /home/max/crm || exit 1
HOUR=$(date +%H)
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -lt 10 ]; then exit 0; fi
set -a && source .env.local && set +a

# Quick check: any needs_reply conversations?
COUNT=$(curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/lead_conversations?status=eq.needs_reply&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
  exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') — $COUNT conversations need reply, triggering Priya" >> logs/cold-email-replies.log

BODY='{"agentId": "priya", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" | awk '{print $2}')
curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: $SIGNATURE" \
  -d "$BODY" >> logs/cold-email-replies.log 2>&1
