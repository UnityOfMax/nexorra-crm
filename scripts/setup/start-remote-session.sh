#!/bin/bash
# Start a persistent Claude Code session with remote control enabled.
# This creates a long-lived session that stays connected to claude.ai.
#
# The trick: we start claude in interactive mode with --resume to keep
# the same session, pipe /remote-control as the first command, then
# keep stdin open so the session doesn't exit.
#
# Used by nexorra-remote.service systemd unit.

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG="logs/remote.log"
BRIDGE_FILE="/home/max/.claude/projects/-home-max-crm/bridge-pointer.json"
AGENCY_ID="da99b768-79dd-48f8-af86-abf95e61a69f"

mkdir -p logs

echo "$(date): Starting persistent Claude Code remote session..." >> "$LOG"

# Start Claude with a simple prompt that just enables remote control and waits
# Using --output-format stream-json so we can detect when it's ready
# The prompt tells Claude to enable remote control and then just wait
/home/max/.npm-global/bin/claude \
  -p "Run the /remote-control slash command to enable remote access, then say 'Remote control enabled' and nothing else." \
  --max-turns 2 \
  --output-format stream-json \
  >> /tmp/claude-remote-output.log 2>&1 &

CLAUDE_PID=$!
echo "$(date): Claude session starting (pid=$CLAUDE_PID)..." >> "$LOG"

# Wait for the bridge-pointer.json to update
sleep 15

# Now read and save the URL
if [ -f "$BRIDGE_FILE" ]; then
  SESSION_ID=$(python3 -c "
import json
try:
    with open('$BRIDGE_FILE') as f:
        d = json.load(f)
    print(d.get('sessionId', ''))
except:
    print('')
" 2>/dev/null)

  if [ -n "$SESSION_ID" ]; then
    SESSION_URL="https://claude.ai/code/${SESSION_ID}"
    echo "$(date): Session URL: $SESSION_URL" >> "$LOG"

    # Save to Supabase
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
      echo "$(date): Saved URL to Supabase" >> "$LOG"
    fi
  else
    echo "$(date): No sessionId in bridge-pointer.json" >> "$LOG"
  fi
else
  echo "$(date): bridge-pointer.json not found" >> "$LOG"
fi

# Wait for the Claude process to finish
wait $CLAUDE_PID 2>/dev/null
EXIT_CODE=$?
echo "$(date): Claude session ended (exit=$EXIT_CODE)" >> "$LOG"

# If it exited, sleep a bit and let systemd restart us
sleep 5
