#!/usr/bin/env node

/**
 * One-time setup: creates the Obsidian vault directory structure.
 * Lead data lives in Supabase only — no lead notes written here.
 *
 * Run: npx tsx scripts/obsidian-setup.ts
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const VAULT_ROOT = path.join(os.homedir(), 'Obsidian', 'Nexorra');

const DIRS = ['Clients', 'Research', 'Engineering', 'Daily'];


async function main() {
  // Create directories
  for (const dir of DIRS) {
    const dirPath = path.join(VAULT_ROOT, dir);
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created: ${dirPath}`);
  }

  console.log('\nObsidian vault ready at:', VAULT_ROOT);
}

main().catch(console.error);
