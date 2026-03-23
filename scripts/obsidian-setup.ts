#!/usr/bin/env node

/**
 * One-time setup: creates the Obsidian vault directory structure
 * and writes the lead template note.
 *
 * Run: npx tsx scripts/obsidian-setup.ts
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const VAULT_ROOT = path.join(os.homedir(), 'Obsidian', 'Nexorra');

const DIRS = ['Leads', 'Clients', 'Research', 'Engineering', 'Daily'];

const TEMPLATE = `---
name: Jane Smith
email: jane.smith@remax.com
phone: "+15551234567"
brokerage: RE/MAX Elite
city: Toronto
state: "ON"
source: brokerage-scrape
research_status: completed
lead_id: abc123-def456
synced_at: "2026-03-23T12:00:00.000Z"
---

## Research

Jane Smith is a top-producing agent at RE/MAX Elite in Toronto, specializing in luxury condos in the downtown core. She has been in the industry for 12 years and currently manages a team of 4 agents. Her social media presence is strong with 15K followers on Instagram. She appears to be doing her own lead generation through organic content but has expressed interest in scaling through paid ads.

## Loom Video

https://www.loom.com/share/example-video-id

## Notes

Initial outreach sent via Instantly campaign on 2026-03-20. Opened email twice.
`;

async function main() {
  // Create directories
  for (const dir of DIRS) {
    const dirPath = path.join(VAULT_ROOT, dir);
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created: ${dirPath}`);
  }

  // Write template
  const templatePath = path.join(VAULT_ROOT, 'Leads', '_template.md');
  await fs.writeFile(templatePath, TEMPLATE, 'utf-8');
  console.log(`Template: ${templatePath}`);

  console.log('\nObsidian vault ready at:', VAULT_ROOT);
}

main().catch(console.error);
