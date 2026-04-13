#!/bin/bash
# Research Agent — Daily self-improvement + client service delivery
# Runs 11 AM daily (after Jeff finishes at ~10 AM)
# Track A: Self-improvement (memory, skills, GitHub research)
# Track B: Client service (ads, funnels, nurturing, campaigns)

set -euo pipefail
cd /home/max/crm

# Operating hours guard — skip if outside 10 AM – 2 AM BST
HOUR=$(TZ="Europe/London" date +%H)
if [ "$HOUR" -lt 10 ] && [ "$HOUR" -ge 2 ]; then
  echo "[$(date)] Outside active hours. Exiting."
  exit 0
fi

set -a && source .env.local && set +a

echo "[$(date)] Research agent starting..."

# Sign payload for daemon
PAYLOAD='{"agentId":"research","trigger":"cron"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$CRON_SECRET" | awk '{print $2}')

curl -s -X POST "http://localhost:4200/run" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "x-signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"

echo "[$(date)] Research agent triggered."
