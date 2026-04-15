#!/bin/bash
# Polls Google Calendar for new discovery call bookings and sends email sequence
# Runs every 5 minutes via cron

cd "$(dirname "$0")/../.." || exit 1

set -a && source .env.local && set +a

node scripts/google-calendar-poll.js >> /tmp/calendar-poll.log 2>&1
