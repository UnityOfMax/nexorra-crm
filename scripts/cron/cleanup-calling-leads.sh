#!/bin/bash
# Cleanup exported calling leads (1 hour after export)
# Schedule: every 30 minutes
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
npx tsx scripts/cleanup-calling-leads.ts >> logs/cleanup-calling-leads.log 2>&1
