#!/bin/bash
# Launch Chrome with remote debugging for Jeff (lead gen agent).
# Smart: works whether a regular Chrome session exists or not.
# Safe to call repeatedly — exits immediately if port 9222 is already up.

set -euo pipefail

PORT=9222
DEBUG_PROFILE="/home/max/.config/chrome-debug"
LOG="/home/max/crm/logs/chrome-debug.log"

# Already running with debug port? Done.
if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
  echo "Chrome debug port ${PORT} already up."
  exit 0
fi

# Find Chrome binary
CHROME=""
for cmd in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$cmd" > /dev/null 2>&1; then
    CHROME="$cmd"
    break
  fi
done

if [ -z "$CHROME" ]; then
  echo "ERROR: Chrome not found."
  exit 1
fi

# Ensure dirs exist
mkdir -p "$DEBUG_PROFILE" "$(dirname "$LOG")"

echo "[$(date)] Launching Chrome debug instance on port ${PORT}..." | tee -a "$LOG"

# Launch with dedicated profile (separate from any running Chrome session)
# Use X11 if Wayland is unavailable
if curl -s --connect-timeout 1 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
  echo "Chrome already up after flag check." | tee -a "$LOG"
  exit 0
fi

# Determine display mode: prefer X11, fall back to headless
EXTRA_FLAGS=""
if DISPLAY="${DISPLAY:-:0}" XAUTHORITY="${HOME}/.Xauthority" xdpyinfo >/dev/null 2>&1; then
  DISPLAY_ENV="DISPLAY=${DISPLAY:-:0} XAUTHORITY=${HOME}/.Xauthority WAYLAND_DISPLAY="
  EXTRA_FLAGS="--ozone-platform=x11"
  echo "[$(date)] Using X11 display ${DISPLAY:-:0}" | tee -a "$LOG"
else
  DISPLAY_ENV="DISPLAY= WAYLAND_DISPLAY="
  EXTRA_FLAGS="--headless=new"
  echo "[$(date)] X11 unavailable, using headless mode" | tee -a "$LOG"
fi

env DISPLAY="${DISPLAY:-:0}" XAUTHORITY="${HOME}/.Xauthority" WAYLAND_DISPLAY="" XDG_RUNTIME_DIR=/run/user/1000 "$CHROME" \
  --remote-debugging-port=${PORT} \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$DEBUG_PROFILE" \
  --no-first-run \
  $EXTRA_FLAGS \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --disable-dev-shm-usage \
  --js-flags="--max-old-space-size=512" \
  --memory-pressure-off \
  --disable-extensions \
  --disable-plugins \
  --disable-infobars \
  "$@" >> "$LOG" 2>&1 &
disown

# Wait up to 30s for debug port
for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    echo "[$(date)] Chrome debug ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

echo "[$(date)] ERROR: Chrome launched but port ${PORT} not responding after 30s." | tee -a "$LOG"
exit 1
