#!/bin/bash
cd /home/max/crm || exit 1
HOUR=$(date +%H)
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -lt 10 ]; then exit 0; fi
set -a && source .env.local && set +a
# Launch Derek's Chrome first
bash scripts/chrome-launch-research.sh >> logs/derek-research.log 2>&1
# Trigger via daemon
BODY='{"agentId": "derek", "trigger": "cron"}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY" | awk '{print $2}')
curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: $SIGNATURE" \
  -d "$BODY" >> logs/derek-research.log 2>&1
