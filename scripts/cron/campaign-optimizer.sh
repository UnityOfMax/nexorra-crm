#!/bin/bash
# Campaign optimizer — runs nightly at 10 PM
# Crontab: 0 22 * * * /home/max/crm/scripts/cron/campaign-optimizer.sh >> /home/max/crm/logs/campaign-optimizer.log 2>&1

set -e
cd "$(dirname "$0")/../.."

source .env.local 2>/dev/null || true

echo "[$(date)] Starting campaign optimizer..."

claude --print \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch" \
  --max-turns 30 \
  "$(cat .claude/commands/nexorra/campaign-optimizer.md)"

echo "[$(date)] Campaign optimizer complete."
