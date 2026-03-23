#!/bin/bash
# Video Generation — batch generate personalized loom-style videos for leads
# Schedule: once daily (e.g., 11 AM)
cd /home/max/crm || exit 1
set -a && source .env.local && set +a
mkdir -p logs
npx tsx scripts/loom-video/batch-generate.ts >> logs/video-gen.log 2>&1
