#!/bin/bash
# Chrome Watchdog — runs every 5 minutes via cron.
# Checks each Chrome debug port and restarts it if unresponsive.
# Protects against: screen lock SIGSEGV, OOM kills, GPU crashes.

cd /home/max/crm || exit 1
source .env.local 2>/dev/null || true

LOG="logs/chrome-watchdog.log"
mkdir -p logs

# Ensure Xvfb :99 is running — Chrome depends on it
if ! DISPLAY=":99" xdpyinfo >/dev/null 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Xvfb :99 not running — starting..." >> "$LOG"
  bash scripts/setup/start-xvfb.sh >> "$LOG" 2>&1
  sleep 3
fi

check_and_restart() {
  local PORT=$1
  local SCRIPT=$2
  local ARGS=${3:-}

  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    return 0  # healthy
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Port ${PORT} not responding — restarting..." >> "$LOG"
  DISPLAY=:99 WAYLAND_DISPLAY="" DBUS_SESSION_BUS_ADDRESS="" bash "$SCRIPT" $ARGS >> "$LOG" 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Port ${PORT} restart complete." >> "$LOG"
}

check_and_restart 9222 scripts/chrome-launch.sh                    # Jeff (lead-gen)
check_and_restart 9225 scripts/chrome-launch-instagram.sh          # Tara (Instagram)
check_and_restart 9232 scripts/chrome-launch-petra.sh "9232"       # Petra worker 1
check_and_restart 9233 scripts/chrome-launch-petra.sh "9233"       # Petra worker 2
check_and_restart 9234 scripts/chrome-launch-petra.sh "9234"       # Petra worker 3
check_and_restart 9235 scripts/chrome-launch-petra.sh "9235"       # Petra worker 4
check_and_restart 9236 scripts/chrome-launch-petra.sh "9236"       # Petra worker 5
check_and_restart 9240 scripts/chrome-launch-openphone.sh          # OpenPhone SMS (port 9240)
