#!/bin/bash
# Start Xvfb virtual display on :99
# Run at boot — Chrome instances use this instead of :0 so they are
# completely independent of the physical display, GNOME, Mutter, and XWayland.
# Screen state changes (lock, blank, idle, wake) have zero effect on :99.

DISPLAY_NUM=":99"
LOCK="/tmp/xvfb-99.pid"

# Already running?
if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK")" 2>/dev/null; then
  echo "Xvfb already running on $DISPLAY_NUM (PID $(cat "$LOCK"))"
  exit 0
fi

# Check if :99 is already listening (started by another process)
if DISPLAY="$DISPLAY_NUM" xdpyinfo >/dev/null 2>&1; then
  echo "Xvfb $DISPLAY_NUM already responding"
  exit 0
fi

echo "Starting Xvfb on $DISPLAY_NUM..."
Xvfb "$DISPLAY_NUM" \
  -screen 0 1920x1080x24 \
  -ac \
  -nolisten tcp \
  +extension GLX \
  +extension RANDR \
  +render \
  -dpi 96 \
  2>/home/max/crm/logs/xvfb.log &

XVFB_PID=$!
echo "$XVFB_PID" > "$LOCK"
disown "$XVFB_PID"

# Wait up to 10s for it to be ready
for i in $(seq 1 10); do
  if DISPLAY="$DISPLAY_NUM" xdpyinfo >/dev/null 2>&1; then
    echo "Xvfb ready on $DISPLAY_NUM (PID $XVFB_PID)"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Xvfb failed to start" >&2
exit 1
