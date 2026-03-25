#!/bin/bash
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
npx tsx scripts/generate-briefing.ts >> logs/briefing.log 2>&1
