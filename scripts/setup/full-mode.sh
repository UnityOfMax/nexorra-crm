#!/bin/bash
# Restore full mode: Xvfb, Chrome (main + OpenPhone), PA
LOG="/home/max/crm/logs/minimal-mode.log"
mkdir -p "$(dirname "$LOG")"

# Start desktop if not already running
if ! systemctl is-active --quiet gdm; then
  sudo systemctl start gdm
  sleep 5
fi

bash /home/max/crm/scripts/setup/start-xvfb.sh
sleep 3
bash /home/max/crm/scripts/chrome-launch.sh &
sleep 5
bash /home/max/crm/scripts/chrome-launch-openphone.sh &
bash /home/max/crm/scripts/setup/restart-nexorra-pa.sh

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Entered full mode" >> "$LOG"
echo "Full mode active."
