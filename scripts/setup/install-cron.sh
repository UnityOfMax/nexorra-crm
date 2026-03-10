#!/bin/bash
# Install all Nexorra cron jobs
# Run: bash scripts/setup/install-cron.sh

set -e

CRON_DIR="/home/max/crm/scripts/cron"

# Ensure scripts are executable
chmod +x "$CRON_DIR"/*.sh

# Build crontab entries
CRON_ENTRIES="# Nexorra CRM — Agent Cron Jobs
# Installed by scripts/setup/install-cron.sh
PATH=/usr/local/bin:/usr/bin:/bin:/home/max/.local/bin

# Lead Gen — 8:00 AM daily
0 8 * * * $CRON_DIR/lead-gen.sh

# Cold Email Upload — 9:00 AM daily
0 9 * * * $CRON_DIR/cold-email-upload.sh

# Cold Email Replies — webhook-triggered (Instantly inbound)
# Client Replies — webhook-triggered (Twilio SMS / Resend email inbound)

# Cold Email Maintenance — 8:00 PM daily
0 20 * * * $CRON_DIR/cold-email-maintenance.sh

# Daily Report — 9:00 PM daily
0 21 * * * $CRON_DIR/daily-report.sh
"

# Remove existing Nexorra entries and add new ones
(crontab -l 2>/dev/null | grep -v "# Nexorra CRM" | grep -v "$CRON_DIR" | grep -v "^PATH=" | grep -v "^$"; echo "$CRON_ENTRIES") | crontab -

echo "Cron jobs installed. Verify with: crontab -l"
echo ""
echo "Schedule:"
echo "  8:00 AM  — Lead Gen (scrape 1000 leads)"
echo "  9:00 AM  — Cold Email Upload (push to Instantly)"
echo "  8:00 PM  — Cold Email Maintenance (nudge/ghost/learn)"
echo "  9:00 PM  — Daily Report (aggregate metrics)"
echo ""
echo "Webhook-triggered (no cron):"
echo "  Cold Email Replies — fires on Instantly reply webhook"
echo "  Client Replies     — fires on Twilio/Resend inbound webhook"
