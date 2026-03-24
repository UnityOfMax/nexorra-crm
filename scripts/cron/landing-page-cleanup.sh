#!/bin/bash
cd /home/max/crm || exit 1
HOUR=$(date +%H)
if [ "$HOUR" -ge 2 ] && [ "$HOUR" -lt 10 ]; then exit 0; fi
set -a && source .env.local && set +a
npx tsx scripts/landing-page-cleanup.ts >> logs/landing-page-cleanup.log 2>&1
