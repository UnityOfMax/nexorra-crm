#!/bin/bash
# Instagram Follow-up — 6:00 PM daily
# Sends follow-up GIFs/messages to non-repliers (Chrome) and Peoples DM repliers (API)
# Crontab: 0 18 * * * /home/max/crm/scripts/cron/instagram-followup.sh

set -a && source /home/max/crm/.env.local && set +a

LOG="/home/max/crm/logs/cron-instagram-followup.log"
mkdir -p /home/max/crm/logs

echo "$(date): Triggering instagram-followup via daemon..." >> "$LOG"

BODY='{"agentId": "jess", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" | awk '{print $2}')
RESPONSE=$(curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: $SIGNATURE" \
  -d "$BODY")

echo "$(date): Daemon response: $RESPONSE" >> "$LOG"
