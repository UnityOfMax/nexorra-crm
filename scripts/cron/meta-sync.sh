#!/bin/bash
# Sync Meta ad metrics — runs daily at 10:50 AM BST
# Crontab: 50 10 * * * /home/max/crm/scripts/cron/meta-sync.sh >> /home/max/crm/logs/meta-sync.log 2>&1

set -e
cd "$(dirname "$0")/../.."

source .env.local 2>/dev/null || true

BASE_URL="${CRM_BASE_URL:-https://nexorra-crm.vercel.app}"

echo "[$(date)] Starting Meta sync..."

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "${BASE_URL}/api/cron/meta-sync" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "[$(date)] Meta sync complete: $BODY"
else
  echo "[$(date)] Meta sync failed (HTTP $HTTP_STATUS): $BODY"
  exit 1
fi
