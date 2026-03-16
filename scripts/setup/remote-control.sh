#!/bin/bash
# Start Claude Code remote control and save session URL to Supabase
# Used by nexorra-remote.service systemd unit

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG="logs/remote.log"
mkdir -p logs

AGENCY_ID="da99b768-79dd-48f8-af86-abf95e61a69f"

echo "$(date): Starting Claude Code Remote Control..." >> "$LOG"

/home/max/.npm-global/bin/claude remote-control --name "Nexorra CRM" 2>&1 | while IFS= read -r line; do
  echo "$line"

  # Capture session URL from output
  URL=$(echo "$line" | grep -oP 'https://claude\.ai/code/[^\s"]+' || true)
  if [ -n "$URL" ]; then
    echo "$(date): Captured URL: $URL" >> "$LOG"

    # Read current settings, merge in claude_code_url, write back
    CURRENT=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$AGENCY_ID&select=settings" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

    UPDATED=$(echo "$CURRENT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
settings = data[0].get('settings', {}) if data else {}
settings['claude_code_url'] = '$URL'
print(json.dumps({'settings': settings}))
" 2>/dev/null)

    if [ -n "$UPDATED" ]; then
      curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$AGENCY_ID" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$UPDATED"
      echo "$(date): Saved URL to Supabase" >> "$LOG"
    fi
  fi
done
