#!/bin/bash
# Morning run: realtor.com scraping → Google Maps leads → minimal mode
# Schedule: 30 9 * * 1-5
# Chrome runs on DISPLAY=:0 (real GDM desktop) — required for bot detection bypass
set -e

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG="logs/morning-run.log"
mkdir -p logs

ts() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

send_alert() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="${TELEGRAM_CHAT_ID}" \
    -d text="[Morning Run] $msg" > /dev/null 2>&1 || true
}

trap 'ts "ERROR: step failed — entering minimal mode anyway"; send_alert "Step failed at line $LINENO. Entering minimal mode."; bash /home/max/crm/scripts/setup/minimal-mode.sh; exit 1' ERR

ts "=== Morning run started ==="

# ── 1. Start GDM (real desktop — required for Chrome fingerprint) ────────────
ts "Starting GDM desktop"
sudo systemctl start gdm
sleep 30  # XWayland needs ~20-30s to create auth file after GDM starts

# ── 2. Chrome on port 9222 (Jeff) and 9223 (GMaps) ──────────────────────────
ts "Starting Chrome :9222 for realtor.com scraping"
DISPLAY=:0 bash scripts/chrome-launch.sh >> logs/chrome-debug.log 2>&1 &
ts "Starting Chrome :9223 for Google Maps scraping"
DISPLAY=:0 bash scripts/chrome-launch-gmaps.sh >> logs/chrome-gmaps.log 2>&1 &
sleep 10

# ── 3. Realtor.com scraping ───────────────────────────────────────────────────
ts "Running realtor.com scraping (realtor-leads.js)"
DISPLAY=:0 node scripts/calling/realtor-leads.js >> "$LOG" 2>&1
ts "Realtor.com scraping complete"

# ── 4. Kill scraping Chromes ──────────────────────────────────────────────────
ts "Killing Chrome :9222 and :9223"
pkill -f "remote-debugging-port=9222" || true
pkill -f "remote-debugging-port=9223" || true
sleep 2

# ── 5. Google Maps leads (no-website businesses) ─────────────────────────────
ts "Running Google Maps leads scraper"
node scripts/local-biz/gmaps-leads.js >> "$LOG" 2>&1
ts "Google Maps leads complete"

# ── 6. Enter minimal mode (kills GDM + Chrome) ───────────────────────────────
ts "=== Morning run complete — entering minimal mode ==="
send_alert "Morning run complete. Entering minimal mode."
bash /home/max/crm/scripts/setup/minimal-mode.sh
