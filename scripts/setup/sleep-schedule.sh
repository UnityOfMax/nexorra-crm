#!/bin/bash
# Auto-sleep at 2 AM, wake at 9:00 AM UK time.
# Uses rtcwake to set hardware alarm — no user interaction needed.
# Crontab: 0 2 * * * /home/max/crm/scripts/setup/sleep-schedule.sh

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

LOG="logs/sleep.log"
mkdir -p logs

# Safety guard: only run if it's actually ~2 AM (1:45–2:15 window)
# Prevents accidental triggers at other times
HOUR=$(date +%H)
MIN=$(date +%M)
TOTAL_MIN=$((HOUR * 60 + MIN))
WINDOW_START=$((1 * 60 + 45))  # 01:45
WINDOW_END=$((2 * 60 + 15))    # 02:15

if [ $TOTAL_MIN -lt $WINDOW_START ] || [ $TOTAL_MIN -gt $WINDOW_END ]; then
  echo "$(date): Triggered outside 2 AM window (current: ${HOUR}:${MIN}) — ignoring." >> "$LOG"
  exit 0
fi

# Give running agents up to 5 minutes to finish, then sleep regardless
RUNNING=$(curl -s "http://localhost:4200/status" \
  -H "x-cron-secret: $CRON_SECRET" 2>/dev/null \
  | grep -o '"running":[0-9]*' | cut -d: -f2)
RUNNING="${RUNNING:-0}"

if [ "$RUNNING" != "0" ]; then
  echo "$(date): Agents still running ($RUNNING), waiting 5 min then sleeping regardless..." >> "$LOG"
  sleep 300
fi

# Calculate wake time: 9:00 AM today (same calendar day — script runs at 2 AM)
WAKE_AT=$(date -d "today 09:00" +%s)
echo "$(date): Going to sleep. Wake at $(date -d @$WAKE_AT '+%Y-%m-%d %H:%M:%S')" >> "$LOG"

# Suspend to RAM — RTC hardware alarm wakes the machine
sudo /usr/sbin/rtcwake -m mem -t "$WAKE_AT"

echo "$(date): Woke up" >> "$LOG"
