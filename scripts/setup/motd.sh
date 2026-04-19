#!/bin/bash
# Nexorra device quick-reference — shown on TTY login
cd /home/max/crm 2>/dev/null || true
set -a && source /home/max/crm/.env.local 2>/dev/null && set +a

# Check daemon status
DAEMON_STATUS=$(curl -s --max-time 2 "http://localhost:4200/status" \
  -H "x-cron-secret: $CRON_SECRET" 2>/dev/null || echo "offline")

cat << 'EOF'

╔══════════════════════════════════════════════════════════╗
║              NEXORRA BEELINK — QUICK REFERENCE           ║
╚══════════════════════════════════════════════════════════╝

  MODE
  ────
  fullmode          Restore desktop + Chrome + OpenPhone
  minimal           Drop to minimal (kills desktop/Chrome)

  MORNING RUN
  ───────────
  bash scripts/cron/morning-run.sh    Run manually

  GIT PUSH
  ────────
  GH_TOKEN=$(cat .gh-token) && git push https://${GH_TOKEN}@github.com/UnityOfMax/nexorra-crm.git main

EOF

# Daemon status (live)
echo "  DAEMON"
echo "  ──────"
echo "  Status: $DAEMON_STATUS"
echo ""

# Log tails (only if files exist)
echo "  RECENT LOGS"
echo "  ───────────"
for f in logs/chrome-watchdog.log logs/morning-run.log logs/daemon.log logs/minimal-mode.log; do
  if [ -f "/home/max/crm/$f" ]; then
    echo "  [$f]"
    tail -3 "/home/max/crm/$f" | sed 's/^/    /'
  else
    echo "  [$f] — no log yet"
  fi
  echo ""
done

echo "  TAIL COMMANDS"
echo "  ─────────────"
echo "  tail -20 /home/max/crm/logs/chrome-watchdog.log"
echo "  tail -20 /home/max/crm/logs/morning-run.log"
echo "  tail -20 /home/max/crm/logs/daemon.log"
echo "  tail -20 /home/max/crm/logs/minimal-mode.log"
echo ""
