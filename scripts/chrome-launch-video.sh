#!/bin/bash
# Launch Chrome with remote debugging for video recording.
# Dedicated port 9224 — separate from Jeff (9222) and Derek (9223).
# Safe to call repeatedly — exits immediately if port 9224 is already up.

set -euo pipefail

PORT=9224
DEBUG_PROFILE="/home/max/.config/chrome-video"
LOG="/home/max/crm/logs/chrome-video.log"

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

echo "[$(date)] Launching Chrome video instance on port ${PORT}..." | tee -a "$LOG"

# Launch with dedicated profile (separate from any running Chrome session)
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1000 "$CHROME" \
  --remote-debugging-port=${PORT} \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$DEBUG_PROFILE" \
  --no-first-run \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  "$@" >> "$LOG" 2>&1 &
disown

# Wait up to 30s for debug port
for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    echo "[$(date)] Chrome video ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

echo "[$(date)] ERROR: Chrome launched but port ${PORT} not responding after 30s." | tee -a "$LOG"
exit 1
