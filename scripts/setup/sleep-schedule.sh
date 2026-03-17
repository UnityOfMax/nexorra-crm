#!/bin/bash
# Auto-sleep at 2 AM, wake at 9:50 AM UK time
# Uses rtcwake to set hardware alarm — no user interaction needed
# Safety: waits for running agents to finish before sleeping
# Crontab: 0 2 * * * /home/max/crm/scripts/setup/sleep-schedule.sh

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG="logs/sleep.log"
mkdir -p logs

# Check if any agents are currently running
check_agents() {
  RUNNING=$(curl -s "http://localhost:4200/status" \
    -H "x-cron-secret: $CRON_SECRET" 2>/dev/null \
    | grep -o '"running":[0-9]*' | cut -d: -f2)
  echo "${RUNNING:-0}"
}

RUNNING=$(check_agents)
if [ "$RUNNING" != "0" ]; then
  echo "$(date): Agents still running ($RUNNING), waiting 30 min..." >> "$LOG"
  sleep 1800

  RUNNING=$(check_agents)
  if [ "$RUNNING" != "0" ]; then
    echo "$(date): Still running ($RUNNING) after 30 min delay, skipping sleep" >> "$LOG"
    exit 0
  fi
fi

# Calculate wake time: 9:50 AM today (same day — script runs at 2 AM)
# "today 09:50" = ~7h50m from now, which is correct
WAKE_AT=$(date -d "today 09:50" +%s)
echo "$(date): Sleeping until $(date -d @$WAKE_AT '+%Y-%m-%d %H:%M:%S')" >> "$LOG"

# Suspend to RAM — RTC hardware alarm wakes the machine
sudo /usr/sbin/rtcwake -m mem -t "$WAKE_AT"

echo "$(date): Woke up" >> "$LOG"
