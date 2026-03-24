#!/bin/bash
# Instantly Reply Poller — catches replies missed by webhooks
# Schedule: every 15 minutes during operating hours (10am-2am)
cd /home/max/crm || exit 1

LOG="logs/instantly-poller.log"
mkdir -p logs

# Operating hours guard: 10am-2am only
HOUR=$(date +%H)
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -lt 10 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') — Outside operating hours (10am-2am). Skipping." >> "$LOG"
  exit 0
fi

set -a && source .env.local && set +a

echo "$(date '+%Y-%m-%d %H:%M:%S') — Running instantly-reply-poller" >> "$LOG"
npx tsx scripts/instantly-reply-poller.ts >> "$LOG" 2>&1
echo "$(date '+%Y-%m-%d %H:%M:%S') — Poller finished (exit: $?)" >> "$LOG"
