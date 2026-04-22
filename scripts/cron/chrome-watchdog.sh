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

check_and_restart 9222 scripts/chrome-launch.sh                    # Jeff (realtor.com)
check_and_restart 9223 scripts/chrome-launch-gmaps.sh              # GMaps (website leads)
check_and_restart 9225 scripts/chrome-launch-instagram.sh          # Tara (Instagram)
