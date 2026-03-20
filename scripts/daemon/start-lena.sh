#!/bin/bash
cd /home/max/crm
set -a && source .env.local && set +a
echo "[lena-bridge] Starting Lena bridge on port 4201..."
npx tsx scripts/daemon/lena-bridge.ts
