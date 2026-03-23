#!/bin/bash
# Lead Deep Research — enrich leads with personal info for cold emails
# Schedule: 10:00 AM daily (after lead-gen + cold-email-upload)
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
mkdir -p logs
npx tsx scripts/lead-research.ts >> logs/lead-research.log 2>&1
