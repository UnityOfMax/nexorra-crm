#!/bin/bash
# Deploy to Vercel production.
# Uses `vercel build` + `vercel deploy --prebuilt` to skip Vercel's remote build.
# Usage: bash scripts/deploy-prod.sh

set -euo pipefail

cd /home/max/crm
set -a && source .env.local && set +a
mkdir -p logs

echo "=== Nexorra Production Deploy ==="
echo ""

echo "[1/3] Building with Vercel..."
vercel build --prod --yes 2>&1 | tail -10

echo ""
echo "[2/3] Deploying prebuilt output to production..."
vercel deploy --prebuilt --prod --yes 2>&1 | tee logs/deploy.log

DEPLOY_URL=$(grep -oP 'https://[^\s]+' logs/deploy.log 2>/dev/null | tail -1)

echo ""
echo "[3/3] Done!"
if [ -n "$DEPLOY_URL" ]; then
  echo "  Deployed to: $DEPLOY_URL"
fi
echo "  Production: https://app.ainexorra.com"
