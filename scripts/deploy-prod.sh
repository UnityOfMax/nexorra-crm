#!/bin/bash
# Deploy to Vercel production.
# Vercel is set to "Automatic" — pushing to git triggers a full remote build + deploy.
# This script is ONLY called after Max approves the preview.
# Usage: bash scripts/deploy-prod.sh

set -euo pipefail

cd /home/max/crm
mkdir -p logs

echo "=== Nexorra Production Deploy ==="
echo ""

# Step 1: Push to GitHub (triggers Vercel build automatically)
echo "[1/2] Pushing to GitHub (triggers Vercel build)..."
GH_TOKEN=$(cat .gh-token)
git push "https://${GH_TOKEN}@github.com/UnityOfMax/nexorra-crm.git" main 2>&1 | tail -3
echo ""

echo "[2/2] Build triggered on Vercel!"
echo "  Production: https://app.ainexorra.com"
echo "  Monitor:    https://vercel.com/maxs-projects-c8624c3e/nexorra-crm/deployments"
