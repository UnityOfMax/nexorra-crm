#!/bin/bash
# Launch Chrome with remote debugging enabled for Jeff (lead gen agent)
# Uses a dedicated debug profile so remote debugging is permitted by Chrome.
# Supports both foreground (interactive) and background (cron) usage

# Check if Chrome is already running with debugging
if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
  echo "Chrome is already running with remote debugging on port 9222."
  exit 0
fi

# Try common Chrome locations
CHROME=""
for cmd in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v "$cmd" > /dev/null 2>&1; then
    CHROME="$cmd"
    break
  fi
done

if [ -z "$CHROME" ]; then
  echo "ERROR: Chrome not found. Install Google Chrome or Chromium."
  exit 1
fi

echo "Launching Chrome ($CHROME) with remote debugging on port 9222..."

# Chrome requires a non-default user-data-dir to enable remote debugging
DEBUG_PROFILE="/home/max/.config/chrome-debug"
mkdir -p "$DEBUG_PROFILE"

# Launch on Wayland session with dedicated debug profile
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1000 "$CHROME" \
  --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$DEBUG_PROFILE" \
  --no-first-run \
  "$@" >> /home/max/crm/logs/chrome.log 2>&1 &
disown

# Wait for Chrome to be ready (up to 20s)
for i in $(seq 1 20); do
  if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
    echo "Chrome is ready on port 9222."
    exit 0
  fi
  sleep 1
done

echo "WARNING: Chrome launched but not responding on port 9222 after 20s."
exit 1
