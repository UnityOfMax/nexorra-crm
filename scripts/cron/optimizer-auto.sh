#!/bin/bash
# Auto-execute tier='auto' optimizer actions (no approval required)
set -a && source /home/max/crm/.env.local && set +a
curl -s -X POST "${NEXT_PUBLIC_SUPABASE_URL/supabase.co/vercel.app}/api/cron/optimizer-auto" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" | jq .
