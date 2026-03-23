#!/bin/bash
cd /home/max/crm
set -a && source .env.local && set +a
npx tsx scripts/vault-morning-briefing.ts >> logs/vault.log 2>&1
