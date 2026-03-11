#!/bin/bash
# Launch Chrome with remote debugging enabled for Jeff (lead gen agent)
# This uses your real Chrome profile — cookies, extensions, fingerprint all active
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

# Launch Chrome in background and detach so it survives parent exit
"$CHROME" \
  --remote-debugging-port=9222 \
  --no-first-run \
  --restore-last-session \
  "$@" &
disown

# Wait for Chrome to be ready (up to 15s)
for i in $(seq 1 15); do
  if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
    echo "Chrome is ready on port 9222."
    exit 0
  fi
  sleep 1
done

echo "WARNING: Chrome launched but not responding on port 9222 after 15s."
exit 1
