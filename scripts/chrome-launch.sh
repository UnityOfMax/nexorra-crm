#!/bin/bash
# Launch Chrome with remote debugging enabled for Jeff (lead gen agent)
# This uses your real Chrome profile — cookies, extensions, fingerprint all active

echo "Launching Chrome with remote debugging on port 9222..."
echo "Keep this terminal open while Jeff is scraping."
echo ""

# Check if Chrome is already running with debugging
if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
  echo "Chrome is already running with remote debugging on port 9222."
  echo "Jeff can connect now."
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

echo "Using: $CHROME"
echo ""

# Launch Chrome with remote debugging
# --remote-debugging-port=9222: Allows Puppeteer to connect
# --no-first-run: Skip first-run dialogs
# --restore-last-session: Restore previous tabs
exec "$CHROME" \
  --remote-debugging-port=9222 \
  --no-first-run \
  --restore-last-session \
  "$@"
