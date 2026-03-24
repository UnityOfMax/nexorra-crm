#!/bin/bash
# Launch Chrome for Derek's research (separate profile, port 9223)
CHROME="/opt/google/chrome/chrome"
PORT=9223
PROFILE="/home/max/.config/chrome-research"

# Check if already running on this port
if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
  echo "Chrome research already running on port $PORT"
  exit 0
fi

# Launch with Wayland support
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1000 "$CHROME" \
  --remote-debugging-port=$PORT \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  --disable-background-networking \
  &>/dev/null &

echo "Chrome research launched on port $PORT (PID: $!)"
sleep 3
