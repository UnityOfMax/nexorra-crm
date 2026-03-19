#!/bin/bash
# Deploy to Vercel production — pushes to git, then triggers Vercel build via deploy hook.
# Vercel's "Ignored Build Step" is set to "Don't build anything" so git pushes alone
# don't trigger builds. The deploy hook bypasses this and starts a full production build.
# Usage: bash scripts/deploy-prod.sh

set -euo pipefail

cd /home/max/crm
mkdir -p logs

DEPLOY_HOOK="https://api.vercel.com/v1/integrations/deploy/prj_VwwBI1fpCFhrt0FQmAhpLz5beaCY/pVC5oD91XD"

echo "=== Nexorra Production Deploy ==="
echo ""

# Step 1: Push latest code to git
echo "[1/3] Pushing latest code to GitHub..."
GH_TOKEN=$(cat .gh-token)
git push "https://${GH_TOKEN}@github.com/UnityOfMax/nexorra-crm.git" main 2>&1 | tail -3
echo ""

# Step 2: Trigger Vercel build via deploy hook
echo "[2/3] Triggering Vercel production build..."
RESPONSE=$(curl -s -X POST "$DEPLOY_HOOK")
JOB_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('job',{}).get('id',''))" 2>/dev/null)
STATE=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('job',{}).get('state','error'))" 2>/dev/null)

echo ""
if [ "$STATE" = "PENDING" ]; then
  echo "[3/3] Build triggered!"
  echo "  Job ID:     $JOB_ID"
  echo "  State:      $STATE"
  echo "  Production: https://app.ainexorra.com"
  echo ""
  echo "  Monitor: https://vercel.com/maxs-projects-c8624c3e/nexorra-crm/deployments"
else
  echo "[3/3] Failed to trigger build."
  echo "  Response: $RESPONSE"
  exit 1
fi
