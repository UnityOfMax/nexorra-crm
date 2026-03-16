#!/bin/bash
# Save the current Claude Code remote session URL to Supabase
# The bridge-pointer.json is created/updated whenever a Claude Code session
# starts with /remote-control. This script reads it and saves to CRM settings.
#
# Can be run:
# - Manually: bash scripts/setup/remote-control.sh
# - On boot via cron: @reboot sleep 30 && /home/max/crm/scripts/setup/remote-control.sh
# - After running /remote-control in any Claude session

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG="logs/remote.log"
AGENCY_ID="da99b768-79dd-48f8-af86-abf95e61a69f"

mkdir -p logs

# Check multiple possible bridge pointer locations
BRIDGE_FILE=""
for f in \
  "/home/max/.claude/projects/-home-max-crm/bridge-pointer.json" \
  "/home/max/.claude/projects/-home-max/bridge-pointer.json"; do
  if [ -f "$f" ]; then
    BRIDGE_FILE="$f"
    break
  fi
done

if [ -z "$BRIDGE_FILE" ]; then
  echo "$(date): No bridge-pointer.json found — run /remote-control in a Claude Code session first" >> "$LOG"
  exit 1
fi

SESSION_ID=$(python3 -c "
import json
with open('$BRIDGE_FILE') as f:
    d = json.load(f)
print(d.get('sessionId', ''))
" 2>/dev/null)

if [ -z "$SESSION_ID" ]; then
  echo "$(date): bridge-pointer.json exists but no sessionId found" >> "$LOG"
  exit 1
fi

SESSION_URL="https://claude.ai/code/${SESSION_ID}"
echo "$(date): Claude Code URL: $SESSION_URL" >> "$LOG"

# Read current account settings, merge claude_code_url, write back
CURRENT=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$AGENCY_ID&select=settings" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")

UPDATED=$(echo "$CURRENT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
settings = data[0].get('settings', {}) if data else {}
settings['claude_code_url'] = '$SESSION_URL'
print(json.dumps({'settings': settings}))
" 2>/dev/null)

if [ -n "$UPDATED" ]; then
  curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/accounts?id=eq.$AGENCY_ID" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$UPDATED"
  echo "$(date): Saved to Supabase" >> "$LOG"
else
  echo "$(date): Failed to build settings update" >> "$LOG"
fi
