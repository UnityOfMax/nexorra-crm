#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';

// Load env vars before any other imports
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { syncLeads } from '../lib/obsidian/sync';

async function main() {
  console.log('Starting Obsidian lead sync...');
  const result = await syncLeads();
  console.log(`Synced: ${result.created} created, ${result.updated} updated`);
}

main().catch(console.error);
