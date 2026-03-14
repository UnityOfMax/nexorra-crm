#!/bin/bash
# Start cloudflared tunnel to expose the daemon securely
# Run via: tmux new-session -d -s tunnel 'bash scripts/daemon/tunnel.sh'
#
# After starting, copy the tunnel URL and set it as DAEMON_URL in Vercel:
#   vercel env add DAEMON_URL production
#
# For persistent named tunnels (requires cloudflared login):
#   cloudflared tunnel create nexorra-daemon
#   cloudflared tunnel route dns nexorra-daemon daemon.yourdomain.com

cd /home/max/crm || exit 1

echo "[tunnel] Starting cloudflared tunnel for daemon on localhost:4200..."
cloudflared tunnel --url http://127.0.0.1:4200
