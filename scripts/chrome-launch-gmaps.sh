#!/bin/bash
# Launch Chrome with remote debugging for Google Maps scraper (port 9223).
# Mirrors chrome-launch.sh but uses a separate profile to avoid session conflicts.

set -euo pipefail

PORT=9223
DEBUG_PROFILE="/home/max/.config/chrome-gmaps"
MAIN_PROFILE="/home/max/.config/google-chrome/Default"
LOG="/home/max/crm/logs/chrome-gmaps.log"

source /home/max/crm/.env.local 2>/dev/null || true

if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
  echo "Chrome GMaps port ${PORT} already up."
  exit 0
fi

CHROME=""
for cmd in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$cmd" > /dev/null 2>&1; then CHROME="$cmd"; break; fi
done
[ -z "$CHROME" ] && echo "ERROR: Chrome not found" && exit 1

mkdir -p "$DEBUG_PROFILE/Default" "$(dirname "$LOG")"
echo "[$(date)] Launching Chrome GMaps instance on port ${PORT}..." | tee -a "$LOG"

# Resolve display (same logic as chrome-launch.sh)
unset WAYLAND_DISPLAY
export XDG_RUNTIME_DIR="/run/user/1000"
XAUTH_CANDIDATE=$(ls -t /run/user/1000/.mutter-Xwaylandauth.* 2>/dev/null | head -1 || echo "")
[ -n "$XAUTH_CANDIDATE" ] && export XAUTHORITY="$XAUTH_CANDIDATE" || export XAUTHORITY=""

DISPLAY_FOUND=""
for disp in ":0" ":1" ":99"; do
  if DISPLAY="$disp" xdpyinfo >/dev/null 2>&1; then DISPLAY_FOUND="$disp"; break; fi
done
[ -z "$DISPLAY_FOUND" ] && echo "ERROR: No X11 display available" | tee -a "$LOG" && exit 1
export DISPLAY="$DISPLAY_FOUND"
echo "[$(date)] Using DISPLAY=$DISPLAY" | tee -a "$LOG"

# Sync cookies from main profile for Google auth
for ITEM in Cookies "Local State" Preferences "Web Data"; do
  SRC="${MAIN_PROFILE}/${ITEM}"
  DST="${DEBUG_PROFILE}/Default/${ITEM}"
  [ -f "$SRC" ] && cp "$SRC" "$DST" 2>/dev/null || true
done
[ -f "/home/max/.config/google-chrome/Local State" ] && \
  cp "/home/max/.config/google-chrome/Local State" "${DEBUG_PROFILE}/Local State" 2>/dev/null || true

XDG_RUNTIME_DIR=/run/user/1000 "$CHROME" \
  --remote-debugging-port=${PORT} \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$DEBUG_PROFILE" \
  --no-first-run \
  --ozone-platform=x11 \
  "$@" >> "$LOG" 2>&1 &
disown

for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    echo "[$(date)] Chrome GMaps ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

echo "[$(date)] ERROR: Chrome GMaps not responding after 30s." | tee -a "$LOG"
exit 1
