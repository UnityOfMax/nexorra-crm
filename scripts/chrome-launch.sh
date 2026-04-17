#!/bin/bash
# Launch Chrome with remote debugging for Jeff (lead gen agent).
# Safe to call repeatedly — exits immediately if port 9222 is already up.
# NEVER headless — Jeff needs a visible window to scrape Instagram.
# On reboot: waits up to 60s for the display to become available before giving up.

set -euo pipefail

PORT=9222
DEBUG_PROFILE="/home/max/.config/chrome-debug"
MAIN_PROFILE="/home/max/.config/google-chrome/Default"
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
  # PREFERRED: real display :0 (XWayland) — user can see Chrome and solve CAPTCHAs manually.
  unset WAYLAND_DISPLAY
  export XDG_RUNTIME_DIR="/run/user/1000"

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

  # Last resort: Xvfb :99
  if DISPLAY=":99" xdpyinfo >/dev/null 2>&1; then
    export DISPLAY=":99"
    export XAUTHORITY=""
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

# Full profile sync from Max's real Chrome — copies cookies, session, extensions,
# and preferences so the debug instance has the same fingerprint as his real browser.
mkdir -p "${DEBUG_PROFILE}/Default"
for ITEM in Cookies "Local State" Preferences "Secure Preferences" "Web Data" "Visited Links"; do
  SRC="${MAIN_PROFILE}/${ITEM}"
  DST="${DEBUG_PROFILE}/Default/${ITEM}"
  [ -f "$SRC" ] && cp "$SRC" "$DST" 2>/dev/null && echo "[$(date)] Synced ${ITEM}" | tee -a "$LOG" || true
done
for DIR in "Local Storage" "Session Storage" "Extension State" "Extension Rules" "Local Extension Settings" Extensions; do
  SRC="${MAIN_PROFILE}/${DIR}"
  DST="${DEBUG_PROFILE}/Default/${DIR}"
  [ -d "$SRC" ] && cp -r "$SRC" "$DST" 2>/dev/null && echo "[$(date)] Synced ${DIR}/" | tee -a "$LOG" || true
done
# Sync top-level Local State (browser-level, not profile-level)
[ -f "/home/max/.config/google-chrome/Local State" ] && \
  cp "/home/max/.config/google-chrome/Local State" "${DEBUG_PROFILE}/Local State" 2>/dev/null || true

# Launch Chrome with minimal flags — as close to a real user browser as possible.
# Only add flags needed for remote debugging and automation detection suppression.
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
    echo "[$(date)] Chrome debug ready on port ${PORT}." | tee -a "$LOG"
    exit 0
  fi
  sleep 1
done

MSG="⚠️ Jeff Chrome (port ${PORT}) launched but not responding after 30s on $(hostname)."
echo "[$(date)] ERROR: $MSG" | tee -a "$LOG"
send_telegram "$MSG"
exit 1
