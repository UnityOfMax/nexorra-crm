#!/bin/bash
# System Health Check — runs daily after lead gen + Petra are done (full and minimal mode)
# Checks all cron jobs, endpoints, and DB state. Invokes engineering to fix failures.
# Crontab: 0 14 * * * /home/max/crm/scripts/cron/system-health-check.sh >> /home/max/crm/logs/system-health-check.log 2>&1

LOG="/home/max/crm/logs/system-health-check.log"
cd /home/max/crm || exit 1
source .env.local 2>/dev/null || true

echo "[$(date)] System health check starting..."

# Run the agent
npx claude --dangerously-skip-permissions -p "$(cat .claude/commands/ops/system-health-check.md)

Run the full system health check now. Today's date: $(date). Environment is /home/max/crm. Source .env.local before running any commands." \
  >> "$LOG" 2>&1

echo "[$(date)] System health check complete."
