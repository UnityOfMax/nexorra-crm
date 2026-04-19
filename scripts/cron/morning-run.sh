#!/bin/bash
# Morning run: realtor.com scraping → Petra build (4 workers) → Gmail outreach → minimal mode
# Schedule: 30 9 * * 1-5
# Both Chromes run on DISPLAY=:0 (real GDM desktop) — required for bot detection bypass + screenshots
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

# ── 1. Start GDM (real desktop — required for Chrome fingerprint + screenshots) ─
ts "Starting GDM desktop"
sudo systemctl start gdm
sleep 10

# ── 2. Chrome on port 9222 (Jeff — realtor.com scraping) ─────────────────────
ts "Starting Chrome :9222 for realtor.com scraping"
DISPLAY=:0 bash scripts/chrome-launch.sh >> logs/chrome-debug.log 2>&1 &
sleep 5

# ── 3. Realtor.com scraping ───────────────────────────────────────────────────
ts "Running realtor.com scraping (realtor-leads.js)"
DISPLAY=:0 node scripts/calling/realtor-leads.js >> "$LOG" 2>&1
ts "Realtor.com scraping complete"

# ── 4. Kill scraping Chrome ───────────────────────────────────────────────────
ts "Killing Chrome :9222"
pkill -f "remote-debugging-port=9222" || true
sleep 2

# ── 5. Chrome on port 9232 (Petra — scout + build + screenshots) ─────────────
ts "Starting Chrome :9232 for Petra"
DISPLAY=:0 bash scripts/chrome-launch-local-biz.sh >> logs/chrome-local-biz.log 2>&1 &
sleep 5

# ── 6. Petra scout ───────────────────────────────────────────────────────────
ts "Running Petra scout"
DISPLAY=:0 npx tsx scripts/local-biz/scout.ts >> "$LOG" 2>&1
ts "Scout complete"

# ── 7. Petra build (4 workers) ───────────────────────────────────────────────
ts "Running Petra build (4 workers)"
DISPLAY=:0 npx tsx scripts/local-biz/build-demo.ts --workers 4 >> "$LOG" 2>&1
ts "Build complete"

# ── 8. Kill Petra Chrome ──────────────────────────────────────────────────────
ts "Killing Chrome :9232"
pkill -f "remote-debugging-port=9232" || true
sleep 2

# ── 9. Gmail outreach ─────────────────────────────────────────────────────────
ts "Running Gmail outreach"
npx tsx scripts/local-biz/gmail-outreach.ts >> "$LOG" 2>&1
ts "Gmail outreach complete"

# ── 10. Enter minimal mode (kills GDM + Chrome) ──────────────────────────────
ts "=== Morning run complete — entering minimal mode ==="
send_alert "Morning run complete. Entering minimal mode."
bash /home/max/crm/scripts/setup/minimal-mode.sh
