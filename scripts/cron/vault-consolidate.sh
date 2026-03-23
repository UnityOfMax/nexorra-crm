#!/bin/bash
cd /home/max/crm
set -a && source .env.local && set +a
npx tsx scripts/vault-consolidate.ts >> logs/vault.log 2>&1
