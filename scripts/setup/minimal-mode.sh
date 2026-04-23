#!/bin/bash
# Enter minimal mode: drop to TTY3 text console, kill desktop + Chrome/Xvfb.
# You land at a usable terminal. Run 'fullmode' to restore the desktop.
LOG="/home/max/crm/logs/minimal-mode.log"
mkdir -p "$(dirname "$LOG")"

# Ensure TTY3 has a getty (text login) ready, then switch to it BEFORE
# killing the display manager so the screen never goes fully black.
sudo systemctl start getty@tty3.service 2>/dev/null || true
sleep 0.5
sudo chvt 3

# Now it's safe to kill the graphical session
sudo systemctl stop gdm 2>/dev/null || true
pkill -f "remote-debugging-port" || true
pkill Xvfb || true
sudo systemctl stop nexorra-remote.service 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Entered minimal mode (TTY3)" >> "$LOG"
