#!/bin/bash
# Start the Nexorra Agent Daemon
# Run via: tmux new-session -d -s daemon 'bash scripts/daemon/start.sh'

cd /home/max/crm || exit 1
set -a && source .env.local && set +a

echo "[daemon] Starting Nexorra Agent Daemon..."
echo "[daemon] CWD: $(pwd)"
echo "[daemon] Time: $(date)"

npx tsx scripts/daemon/server.ts
