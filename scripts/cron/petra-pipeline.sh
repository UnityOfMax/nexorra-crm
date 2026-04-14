#!/bin/bash
# Petra — GMB Demo Pipeline (replaces Derek's video pipeline)
# Runs at 10:30 AM BST daily.
# 5–7 workers, each doing: find lead → build demo → outreach → repeat
# Hard cap: 300 demos/day across all workers.
#
# To adjust worker count (based on available RAM):
#   5 workers (~3.5 GB Chrome RAM) — default, safe on 8GB machine
#   7 workers (~5 GB Chrome RAM)   — use if machine has 16GB+
#
# Cron entry (replaces video-pipeline):
#   30 9 * * * bash /home/max/crm/scripts/cron/petra-pipeline.sh >> /home/max/crm/logs/petra-pipeline.log 2>&1

set -a && source /home/max/crm/.env.local && set +a
cd /home/max/crm || exit 1

WORKERS=${PETRA_WORKERS:-5}
DAILY_CAP=${PETRA_DAILY_CAP:-300}
LOG_DIR="/home/max/crm/logs"
mkdir -p "$LOG_DIR"

echo "============================================================"
echo "$(date) — Petra pipeline starting (${WORKERS} workers, cap ${DAILY_CAP})"
echo "============================================================"

# ── Launch Chrome on each worker port ────────────────────────────────────────
# Petra uses ports 9232–9236 (5 workers) or up to 9238 (7 workers)
PETRA_PORTS=(9232 9233 9234 9235 9236 9237 9238)

for i in $(seq 0 $((WORKERS - 1))); do
  PORT=${PETRA_PORTS[$i]}
  echo "$(date) — Launching Chrome port ${PORT}..."
  bash scripts/chrome-launch-petra.sh "$PORT"
done

echo "$(date) — All Chrome instances ready."

# ── Run the coordinator ────────────────────────────────────────────────────────
# nice+ionice so Chrome/Node don't starve gnome-shell (same as Derek's config)
nice -n 15 ionice -c 3 npx tsx scripts/local-biz/petra-pipeline.ts \
  --workers "$WORKERS" \
  --daily-cap "$DAILY_CAP"

echo "$(date) — Petra pipeline complete."

# ── Gmail direct-send outreach ────────────────────────────────────────────────
echo "$(date) — Starting Gmail outreach..."
npx tsx scripts/local-biz/gmail-outreach.ts
echo "$(date) — Gmail outreach complete."
