#!/bin/bash
# Launch Chrome for Quo (my.quo.com — OpenPhone web client).
# Fixed port 9240 — persistent profile retains login session.
# Safe to call repeatedly — exits immediately if port is already up.

set -euo pipefail

PORT=9240
DEBUG_PROFILE="/home/max/.config/chrome-openphone"
LOG="/home/max/crm/logs/chrome-openphone.log"

if curl -s --connect-timeout 5 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
  echo "Chrome OpenPhone (port ${PORT}) already up."
  exit 0
fi

pkill -9 -f "chrome-openphone" 2>/dev/null || true
sleep 1

CHROME=""
for cmd in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$cmd" > /dev/null 2>&1; then CHROME="$cmd"; break; fi
done

if [ -z "$CHROME" ]; then
  echo "[$(date)] ERROR: Chrome binary not found." | tee -a "$LOG"
  exit 1
fi

mkdir -p "$DEBUG_PROFILE" "$(dirname "$LOG")"
echo "[$(date)] Launching Chrome OpenPhone on port ${PORT}..." | tee -a "$LOG"

resolve_display() {
  unset WAYLAND_DISPLAY
  export XDG_RUNTIME_DIR="/run/user/1000"

  for _i in $(seq 1 12); do
    if DISPLAY=":99" xdpyinfo >/dev/null 2>&1; then
      export DISPLAY=":99"
      export XAUTHORITY=""
      return 0
    fi
    [ "$_i" -eq 1 ] && bash /home/max/crm/scripts/setup/start-xvfb.sh >/dev/null 2>&1 &
    sleep 5
  done

  XAUTH_CANDIDATE=""
  for i in $(seq 1 6); do
    XAUTH_CANDIDATE=$(ls -t /run/user/1000/.mutter-Xwaylandauth.* 2>/dev/null | head -1)
    [ -n "$XAUTH_CANDIDATE" ] && break
    sleep 5
  done

  [ -n "$XAUTH_CANDIDATE" ] && export XAUTHORITY="$XAUTH_CANDIDATE"
  [ -f "${HOME}/.Xauthority" ] && export XAUTHORITY="${HOME}/.Xauthority"

  for disp in ":0" ":1"; do
    if DISPLAY="$disp" xdpyinfo >/dev/null 2>&1; then
      export DISPLAY="$disp"
      return 0
    fi
  done

  [ -n "$XAUTH_CANDIDATE" ] && export DISPLAY=":0" && return 0
  return 1
}

# Detect the active X11 display from the logged-in session
ACTIVE_DISPLAY=$(who | grep '(:' | grep -o '(:[0-9]*)' | tr -d '()' | head -1)
export DISPLAY="${ACTIVE_DISPLAY:-:1}"

echo "[$(date)] Using DISPLAY=$DISPLAY" | tee -a "$LOG"

mkdir -p "/tmp/chrome-xdg-${PORT}"
WAYLAND_DISPLAY="" XDG_RUNTIME_DIR="/tmp/chrome-xdg-${PORT}" "$CHROME" \
  --remote-debugging-port=${PORT} \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$DEBUG_PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  --ozone-platform=x11 \
  --window-size=1280,900 \
  "https://my.quo.com" >> "$LOG" 2>&1 &
disown

for i in $(seq 1 30); do
  if curl -s --connect-timeout 2 "http://localhost:${PORT}/json/version" > /dev/null 2>&1; then
    echo "[$(date)] Chrome OpenPhone ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

echo "[$(date)] ERROR: Chrome OpenPhone (port ${PORT}) not responding after 30s." | tee -a "$LOG"
exit 1
