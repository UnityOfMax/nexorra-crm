#!/bin/bash
# Install all Nexorra cron jobs
# Run: bash scripts/setup/install-cron.sh
# All times are UK (GMT/Europe/London)

set -e

CRON_DIR="/home/max/crm/scripts/cron"
SETUP_DIR="/home/max/crm/scripts/setup"

# Ensure scripts are executable
chmod +x "$CRON_DIR"/*.sh
chmod +x "$SETUP_DIR"/*.sh 2>/dev/null || true

# Build crontab entries
CRON_ENTRIES="# Nexorra CRM — Agent Cron Jobs
# Installed by scripts/setup/install-cron.sh
# All times UK (GMT)
PATH=/usr/local/bin:/usr/bin:/bin:/home/max/.local/bin

# Meta Ad Metrics Sync — 6:00 AM daily
0 6 * * * $CRON_DIR/meta-sync.sh

# Lead Gen — 11:00 AM daily (UK time)
0 11 * * * $CRON_DIR/lead-gen.sh

# Cold Email Upload — 12:00 PM daily (UK time)
0 12 * * * $CRON_DIR/cold-email-upload.sh

# Instagram Outreach — 1:00 PM daily (after lead gen)
0 13 * * * $CRON_DIR/instagram-outreach.sh

# Cold Email Maintenance — 8:00 PM daily
0 20 * * * $CRON_DIR/cold-email-maintenance.sh

# Daily Report — 9:00 PM daily
0 21 * * * $CRON_DIR/daily-report.sh

# Campaign Optimizer — 10:00 PM daily
0 22 * * * $CRON_DIR/campaign-optimizer.sh

# Auto-Sleep — 2:00 AM daily (wake at 9:50 AM)
0 2 * * * $SETUP_DIR/sleep-schedule.sh
"

# Remove existing Nexorra entries and add new ones
(crontab -l 2>/dev/null | grep -v "# Nexorra CRM" | grep -v "$CRON_DIR" | grep -v "$SETUP_DIR" | grep -v "^PATH=" | grep -v "^$" | grep -v "^#.*Agent Cron\|^#.*Installed\|^#.*All times"; echo "$CRON_ENTRIES") | crontab -

echo "Cron jobs installed. Verify with: crontab -l"
echo ""
echo "Schedule (UK time):"
echo "  6:00 AM  — Meta Ad Metrics Sync"
echo "  11:00 AM — Lead Gen (scrape leads)"
echo "  12:00 PM — Cold Email Upload (push to Instantly)"
echo "  1:00 PM  — Instagram DM Outreach"
echo "  8:00 PM  — Cold Email Maintenance"
echo "  9:00 PM  — Daily Report"
echo "  10:00 PM — Campaign Optimizer"
echo "  2:00 AM  — Auto-Sleep (wake at 9:50 AM)"
echo ""
echo "Webhook-triggered (no cron):"
echo "  Cold Email Replies — Instantly reply webhook"
echo "  Client Replies     — Twilio/Resend inbound webhook"
echo "  Instagram Replies  — Peoples DM webhook"
