#!/bin/bash
# RETIRED 2026-04-08 — Sequential 3-phase pipeline replaced by petra-pipeline.sh
# (5-7 parallel workers at 10:30 AM BST). This file is kept for reference.
# The 11:30 AM BST cron slot for this script should be removed from crontab.
echo "$(date) — local-biz-pipeline.sh is retired. Use petra-pipeline.sh instead."
exit 0
: <<'RETIRED'
# Original script below — kept for reference only
# Petra — Daily Local Business Website Demo Pipeline
# Runs at 11:30 AM BST daily (after video pipeline ~11 AM)
# Three phases: Scout -> Build -> Outreach

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

echo "$(date) — Starting Petra local-biz pipeline"

# Ensure Petra Chrome is running (port 9232)
bash scripts/chrome-launch-local-biz.sh

# Phase 1: Scout (Outscraper + Apollo enrichment)
echo "$(date) — Phase 1: Scout"
npx tsx scripts/local-biz/scout.ts --limit 15

# Phase 2: Build demos
echo "$(date) — Phase 2: Build demos"
npx tsx scripts/local-biz/build-demo.ts --limit 50

# Phase 3a: Email outreach (Instantly, max 428/day)
echo "$(date) — Phase 3a: Email outreach"
npx tsx scripts/local-biz/email-outreach.ts

# Phase 3b: SMS outreach (OpenPhone, 10AM-1PM BST window only)
echo "$(date) — Phase 3b: SMS outreach"
npx tsx scripts/local-biz/sms-outreach.ts --limit 200

echo "$(date) — Petra pipeline complete"
