#!/bin/bash
# Restart nexorra-pa Telegram listener — kills old session, starts fresh.
# Run daily at 9:52 AM after machine wakes from sleep.
# Also run at @reboot.

LOG="/home/max/crm/logs/nexorra-pa.log"

# Kill any existing nexorra-pa sessions
pkill -f "nexorra-pa" 2>/dev/null
sleep 3

# Start fresh session
cd /home/max/crm
nohup /usr/bin/script -qfc \
  "/home/max/.npm-global/bin/claude --channels plugin:telegram@claude-plugins-official --permission-mode bypassPermissions --name nexorra-pa" \
  /dev/null >> "$LOG" 2>&1 &

echo "$(date): nexorra-pa restarted (PID $!)" >> "$LOG"
