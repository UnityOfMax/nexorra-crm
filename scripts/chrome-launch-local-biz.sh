#!/bin/bash
# Launch Chrome with remote debugging for Petra local-biz pipeline (port 9232).
# Safe to call repeatedly — exits immediately if port is already up.
# Usage: bash scripts/chrome-launch-local-biz.sh

set -euo pipefail

PORT=9232
DEBUG_PROFILE="/home/max/.config/chrome-local-biz"
LOG="/home/max/crm/logs/chrome-local-biz.log"
ERROR_LOCK="/tmp/chrome-error-sent-${PORT}"

source /home/max/crm/.env.local 2>/dev/null || true

send_telegram() {
  if [ ! -f "$ERROR_LOCK" ]; then
    touch "$ERROR_LOCK"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"5880638817\",\"text\":\"$1\"}" > /dev/null 2>&1 || true
  fi
}

if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
  echo "Chrome debug port ${PORT} already up."
  exit 0
fi

CHROME=""
for cmd in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$cmd" > /dev/null 2>&1; then CHROME="$cmd"; break; fi
done

if [ -z "$CHROME" ]; then
  MSG="⚠️ Petra Chrome (port ${PORT}) could not start — Chrome binary not found on $(hostname)."
  echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
  send_telegram "$MSG"
  exit 1
fi

mkdir -p "$DEBUG_PROFILE" "$(dirname "$LOG")"
echo "[$(date)] Launching Petra Chrome on port ${PORT}..." | tee -a "$LOG"

resolve_display() {
  # PREFERRED: Xvfb on :99
  unset WAYLAND_DISPLAY
  export XDG_RUNTIME_DIR="/run/user/1000"

  if DISPLAY=":99" xdpyinfo >/dev/null 2>&1; then
    export DISPLAY=":99"
    export XAUTHORITY=""
    return 0
  fi

  XAUTH_CANDIDATE=""
  for i in $(seq 1 6); do
    XAUTH_CANDIDATE=$(ls -t /run/user/1000/.mutter-Xwaylandauth.* 2>/dev/null | head -1)
    [ -n "$XAUTH_CANDIDATE" ] && break
    sleep 5
  done

  if [ -n "$XAUTH_CANDIDATE" ]; then
    export XAUTHORITY="$XAUTH_CANDIDATE"
  elif [ -f "${HOME}/.Xauthority" ]; then
    export XAUTHORITY="${HOME}/.Xauthority"
  else
    export XAUTHORITY=""
  fi

  for disp in ":0" ":1"; do
    if DISPLAY="$disp" xdpyinfo >/dev/null 2>&1; then
      export DISPLAY="$disp"
      return 0
    fi
  done

  if [ -n "$XAUTH_CANDIDATE" ]; then
    export DISPLAY=":0"
    return 0
  fi

  return 1
}

WAITED=0
until resolve_display; do
  if [ $WAITED -ge 60 ]; then
    MSG="⚠️ Petra Chrome (port ${PORT}) could not start — no X11 display after 60s on $(hostname)."
    echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
    send_telegram "$MSG"
    exit 1
  fi
  echo "[$(date)] Waiting for X11 display... (${WAITED}s)" | tee -a "$LOG"
  sleep 5
  WAITED=$((WAITED + 5))
done

echo "[$(date)] Using DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY" | tee -a "$LOG"

mkdir -p "/tmp/chrome-xdg-${PORT}"
DBUS_SESSION_BUS_ADDRESS="" WAYLAND_DISPLAY="" XDG_RUNTIME_DIR="/tmp/chrome-xdg-${PORT}" "$CHROME" \
  --remote-debugging-port=${PORT} \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$DEBUG_PROFILE" \
  --no-first-run \
  --ozone-platform=x11 \
  --disable-gpu \
  --disable-gpu-sandbox \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --disable-dev-shm-usage \
  --disable-blink-features=AutomationControlled \
  "$@" >> "$LOG" 2>&1 &
disown

for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    echo "[$(date)] Petra Chrome ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

MSG="⚠️ Petra Chrome (port ${PORT}) launched but not responding after 30s on $(hostname)."
echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
send_telegram "$MSG"
exit 1
