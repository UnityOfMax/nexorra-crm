#!/bin/bash
# Lead Deep Research (Chrome) — enrich leads with social profiles + bio for personalised cold emails
# Schedule: 10:00 AM daily (after lead-gen + cold-email-upload)
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
mkdir -p logs
LOG="logs/lead-research.log"
echo "$(date '+%Y-%m-%d %H:%M:%S') — Starting lead research (Chrome)" >> "$LOG"
node scripts/lead-research-chrome.js --batch 100 >> "$LOG" 2>&1
echo "$(date '+%Y-%m-%d %H:%M:%S') — Research complete" >> "$LOG"
