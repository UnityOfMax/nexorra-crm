#!/bin/bash
# Lead Quality Check — 1:00 AM daily
# Jeff reviews yesterday's leads, deletes bad names, updates his memory
# Crontab: 0 1 * * * /home/max/crm/scripts/cron/lead-gen-quality-check.sh

set -a && source /home/max/crm/.env.local && set +a

LOG="/home/max/crm/logs/cron-quality-check.log"
mkdir -p /home/max/crm/logs

echo "$(date): Triggering lead-gen-quality-check via daemon..." >> "$LOG"

BODY='{"agentId": "nina", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" | awk '{print $2}')
RESPONSE=$(curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: $SIGNATURE" \
  -d "$BODY")

echo "$(date): Daemon response: $RESPONSE" >> "$LOG"
