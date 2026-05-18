#!/bin/bash
# Morning run: Google Maps website leads scraper (no realtor.com/Jeff)
# Schedule: 30 10 * * 1-5
set -e

cd /home/max/crm || exit 1

LOCKFILE="/tmp/morning-run.lock"
if [ -f "$LOCKFILE" ] && kill -0 "$(cat "$LOCKFILE")" 2>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Already running (pid $(cat "$LOCKFILE")) — exiting" >> logs/morning-run.log
  exit 0
fi
echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

set -a && source .env.local && set +a

LOG="logs/morning-run.log"
mkdir -p logs

ts() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

send_alert() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d text="[Morning Run] $1" > /dev/null 2>&1 || true
}

trap 'ts "ERROR: step failed"; send_alert "Morning run failed at line $LINENO."; rm -f "$LOCKFILE"; exit 1' ERR

ts "=== Morning run started ==="

# ── 1. Google Maps website leads ─────────────────────────────────────────────
# Chrome :9223 must be started manually before running
ts "Running Google Maps leads scraper (1000/day target)"
node scripts/local-biz/gmaps-leads.js >> "$LOG" 2>&1
ts "Google Maps leads complete"

ts "=== Morning run complete ==="
send_alert "Morning run complete."
