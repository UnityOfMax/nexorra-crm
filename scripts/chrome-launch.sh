#!/bin/bash
# Launch Chrome with remote debugging for Jeff (lead gen agent).
# Safe to call repeatedly — exits immediately if port 9222 is already up.
# NEVER headless — Jeff needs a visible window to scrape Instagram.
# On reboot: waits up to 60s for the display to become available before giving up.

set -euo pipefail

PORT=9222
DEBUG_PROFILE="/home/max/.config/chrome-debug"
LOG="/home/max/crm/logs/chrome-debug.log"
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
  MSG="⚠️ Jeff Chrome (port ${PORT}) could not start — Chrome binary not found on $(hostname)."
  echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
  send_telegram "$MSG"
  exit 1
fi

mkdir -p "$DEBUG_PROFILE" "$(dirname "$LOG")"
echo "[$(date)] Launching Chrome debug instance on port ${PORT}..." | tee -a "$LOG"

resolve_display() {
  # PREFERRED: Xvfb on :99 — completely independent of physical display, GNOME, Mutter, XWayland.
  # Chrome on :99 cannot crash from screen lock, idle, blank, or wake events.
  unset WAYLAND_DISPLAY
  export XDG_RUNTIME_DIR="/run/user/1000"

  # Wait up to 60s for Xvfb :99 — at boot it may not be ready yet.
  for _i in $(seq 1 12); do
    if DISPLAY=":99" xdpyinfo >/dev/null 2>&1; then
      export DISPLAY=":99"
      export XAUTHORITY=""
      return 0
    fi
    [ "$_i" -eq 1 ] && bash /home/max/crm/scripts/setup/start-xvfb.sh >/dev/null 2>&1 &
    sleep 5
  done

  # Xvfb failed to start after 60s — fall back to XWayland :0.
  # Wait up to 30s for XWayland auth file (@reboot: GNOME may not have initialised it yet)
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

  # xdpyinfo failed but auth file exists — force :0 anyway.
  if [ -n "$XAUTH_CANDIDATE" ]; then
    export DISPLAY=":0"
    return 0
  fi

  return 1
}

WAITED=0
until resolve_display; do
  if [ $WAITED -ge 60 ]; then
    MSG="⚠️ Jeff Chrome (port ${PORT}) could not start — no X11 display after 60s on $(hostname)."
    echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
    send_telegram "$MSG"
    exit 1
  fi
  echo "[$(date)] Waiting for X11 display... (${WAITED}s)" | tee -a "$LOG"
  sleep 5
  WAITED=$((WAITED + 5))
done

echo "[$(date)] Using DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY" | tee -a "$LOG"

# Launch Chrome — X11 forced at both env and flag level
# --disable-gpu: eliminates Chrome's GPU process entirely (confirmed root cause of
# Intel i915/EGL crash that kills Mutter on screen lock → blank screen requiring hard reboot).
# Chrome falls back to CPU/software rendering — fully functional for scraping.
XDG_RUNTIME_DIR=/run/user/1000 "$CHROME" \
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
  --js-flags="--max-old-space-size=512" \
  --memory-pressure-off \
  --disable-extensions \
  --disable-plugins \
  --disable-infobars \
  --disable-blink-features=AutomationControlled \
  --exclude-switches=enable-automation \
  "$@" >> "$LOG" 2>&1 &
disown

for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    echo "[$(date)] Chrome debug ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

MSG="⚠️ Jeff Chrome (port ${PORT}) launched but not responding after 30s on $(hostname)."
echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
send_telegram "$MSG"
exit 1
