#!/bin/bash
# Enter minimal mode: kill Chrome/Xvfb, keep daemon running for AI replies
LOG="/home/max/crm/logs/minimal-mode.log"
mkdir -p "$(dirname "$LOG")"

pkill -f "remote-debugging-port" || true
pkill Xvfb || true
sudo systemctl stop nexorra-remote.service 2>/dev/null || true
sudo systemctl stop gdm 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Entered minimal mode" >> "$LOG"
echo "Minimal mode active. Daemon still running. Type 'fullmode' to restore."
