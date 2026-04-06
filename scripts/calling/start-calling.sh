#!/bin/bash
# start-calling.sh — Launch the full calling stack for the day's session.
# Called by cron at 2pm BST daily.
# Cron: 0 14 * * * cd /home/max/crm && bash scripts/calling/start-calling.sh >> logs/calling.log 2>&1

set -euo pipefail
cd /home/max/crm
set -a && source .env.local && set +a

LOG="/home/max/crm/logs/calling.log"
BRIDGE_PID_FILE="/tmp/audio-bridge.pid"
ROUTER_PID_FILE="/tmp/transcript-router.pid"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Calling session starting ==="

# 1. Ensure virtual audio devices are loaded
bash scripts/calling/setup-audio.sh | tee -a "$LOG" || log "Audio setup warning (may already be loaded)"

# 2. Start Audio Bridge (if not running)
if [ -f "$BRIDGE_PID_FILE" ] && kill -0 "$(cat $BRIDGE_PID_FILE)" 2>/dev/null; then
  log "Audio Bridge already running (PID $(cat $BRIDGE_PID_FILE))"
else
  python3 scripts/calling/audio-bridge.py >> "$LOG" 2>&1 &
  echo $! > "$BRIDGE_PID_FILE"
  log "Audio Bridge started (PID $!)"
  sleep 2
fi

# 3. Start Transcript Router (if not running)
if [ -f "$ROUTER_PID_FILE" ] && kill -0 "$(cat $ROUTER_PID_FILE)" 2>/dev/null; then
  log "Transcript Router already running (PID $(cat $ROUTER_PID_FILE))"
else
  python3 scripts/calling/transcript-router.py >> "$LOG" 2>&1 &
  echo $! > "$ROUTER_PID_FILE"
  log "Transcript Router started (PID $!)"
  sleep 2
fi

# 4. Verify Audio Bridge is responding
if curl -s --connect-timeout 3 http://127.0.0.1:5051/status > /dev/null 2>&1; then
  log "Audio Bridge responding OK"
else
  log "WARNING: Audio Bridge not responding on port 5051"
fi

# 5. Start the Orchestrator (runs until all calling windows close)
log "Starting Calling Orchestrator..."
set -a && source .env.local && set +a
npx tsx scripts/calling/orchestrator.ts 2>&1 | tee -a "$LOG"

log "=== Calling session complete ==="
