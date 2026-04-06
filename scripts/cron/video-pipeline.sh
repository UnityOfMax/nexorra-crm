#!/bin/bash
# Daily Video + Landing Page Pipeline (Derek's job)
# Generates videos and landing pages for all leads that don't have them yet
# Runs after Jeff's scraping completes

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

echo "$(date) — Starting daily video pipeline"

# Ensure video Chrome is running
bash scripts/chrome-launch-video.sh

# Run the pipeline — nice+ionice so ffmpeg doesn't starve gnome-shell on 4-core machine
nice -n 15 ionice -c 3 npx tsx scripts/daily-video-pipeline.ts --limit 2000

echo "$(date) — Video pipeline complete"
