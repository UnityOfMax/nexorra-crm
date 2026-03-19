#!/bin/bash
# Launch local Next.js preview with Cloudflare tunnel for remote access.
# Usage: bash scripts/preview.sh [port]
# The tunnel URL is accessible from anywhere in the world.

set -euo pipefail

PORT="${1:-3001}"
LOG_DIR="/home/max/crm/logs"
mkdir -p "$LOG_DIR"

echo "=== Nexorra Preview Server ==="
echo ""

# Check if port is already in use
if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
  echo "Port ${PORT} already in use. Reusing existing server."
else
  echo "[1/3] Starting Next.js dev server on port ${PORT}..."
  cd /home/max/crm
  set -a && source .env.local && set +a
  PORT=${PORT} npx next dev -p ${PORT} >> "$LOG_DIR/preview.log" 2>&1 &
  DEV_PID=$!
  echo "  Dev server PID: $DEV_PID"

  # Wait for server to be ready
  for i in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:${PORT}/"; then
      echo "  Dev server ready."
      break
    fi
    sleep 1
  done
fi

echo "[2/3] Starting Cloudflare tunnel..."
cloudflared tunnel --url "http://localhost:${PORT}" 2>&1 | tee "$LOG_DIR/preview-tunnel.log" &
TUNNEL_PID=$!

# Wait for tunnel URL
echo "[3/3] Waiting for tunnel URL..."
for i in $(seq 1 20); do
  TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_DIR/preview-tunnel.log" 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

echo ""
echo "============================================"
if [ -n "$TUNNEL_URL" ]; then
  echo "  PREVIEW URL: $TUNNEL_URL"
else
  echo "  Tunnel URL not yet available — check logs/preview-tunnel.log"
fi
echo "  Local: http://localhost:${PORT}"
echo "  Press Ctrl+C to stop"
echo "============================================"
echo ""

# Wait for Ctrl+C
wait
