#!/bin/bash
# Launch Chrome with remote debugging for video recording (Derek).
# Ports: 9224 (primary), 9226 (worker-2), 9227 (worker-3).
# Usage: bash chrome-launch-video.sh [PORT]  (defaults to 9224)
# Safe to call repeatedly — exits immediately if port is already up.

set -euo pipefail

PORT=${1:-9224}
DEBUG_PROFILE="/home/max/.config/chrome-video-${PORT}"
LOG="/home/max/crm/logs/chrome-video-${PORT}.log"
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

if curl -s --connect-timeout 5 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
  echo "Chrome debug port ${PORT} already up."
  exit 0
fi

# Kill any orphaned Chrome processes for this port before launching fresh
pkill -9 -f "chrome-video-${PORT}" 2>/dev/null || true
sleep 1

CHROME=""
for cmd in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$cmd" > /dev/null 2>&1; then CHROME="$cmd"; break; fi
done

if [ -z "$CHROME" ]; then
  MSG="⚠️ Derek video Chrome (port ${PORT}) could not start — Chrome binary not found on $(hostname)."
  echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
  send_telegram "$MSG"
  exit 1
fi

mkdir -p "$DEBUG_PROFILE" "$(dirname "$LOG")"
echo "[$(date)] Launching Chrome video instance on port ${PORT}..." | tee -a "$LOG"

resolve_display() {
  # PREFERRED: Xvfb on :99 — completely independent of physical display, GNOME, Mutter, XWayland.
  # Chrome on :99 cannot crash from screen lock, idle, blank, or wake events.
  unset WAYLAND_DISPLAY
  export XDG_RUNTIME_DIR="/run/user/1000"

  if DISPLAY=":99" xdpyinfo >/dev/null 2>&1; then
    export DISPLAY=":99"
    export XAUTHORITY=""
    return 0
  fi

  # Xvfb not running — fall back to XWayland :0.
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
    MSG="⚠️ Derek video Chrome (port ${PORT}) could not start — no X11 display after 60s on $(hostname)."
    echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
    send_telegram "$MSG"
    exit 1
  fi
  echo "[$(date)] Waiting for X11 display... (${WAITED}s)" | tee -a "$LOG"
  sleep 5
  WAITED=$((WAITED + 5))
done

echo "[$(date)] Using DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY" | tee -a "$LOG"

# Launch Chrome — isolated from GNOME session so it never steals focus or appears
# in Alt+Tab on the real display.
# - DBUS_SESSION_BUS_ADDRESS="": prevents registration with GNOME session manager
# - WAYLAND_DISPLAY="": forces X11 path, no Wayland fallback
# - XDG_RUNTIME_DIR=/tmp/chrome-xdg-${PORT}: isolated runtime dir (no wayland socket)
# --disable-gpu: eliminates Chrome's GPU process (confirmed root cause of Intel i915/EGL
# crash that kills Mutter on screen lock → blank screen requiring hard reboot).
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
  --disable-back-forward-cache \
  --start-maximized \
  --window-size=1920,1080 \
  --window-position=0,0 \
  "$@" >> "$LOG" 2>&1 &
disown

for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    echo "[$(date)] Chrome video ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

MSG="⚠️ Derek video Chrome (port ${PORT}) launched but not responding after 30s on $(hostname)."
echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
send_telegram "$MSG"
exit 1
