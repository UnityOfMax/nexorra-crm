#!/usr/bin/env npx tsx
/**
 * Morning briefing — runs at 9:55 AM (before agents wake at 10 AM).
 * Reads yesterday's digest, generates a briefing, injects into agent primers.
 */
import brain from '../lib/obsidian/brain';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';

const CRM = '/home/max/crm';
const PRIMERS_DIR = path.join(CRM, 'agents', 'primers');

console.log('[vault] Generating morning briefing...');

const briefing = brain.generateMorningBriefing();
console.log(`[vault] Briefing written (${briefing.length} chars)`);

// Inject a condensed version into every agent's primer
mkdirSync(PRIMERS_DIR, { recursive: true });
const condensed = briefing.split('\n').slice(0, 20).join('\n') + '\n*(See full briefing in Obsidian vault)*\n';

const primerFiles = existsSync(PRIMERS_DIR) ? readdirSync(PRIMERS_DIR).filter(f => f.endsWith('.md')) : [];

for (const file of primerFiles) {
  const filepath = path.join(PRIMERS_DIR, file);
  let content = readFileSync(filepath, 'utf-8');

  // Replace existing briefing section or append
  const briefingMarker = '## Today\'s Briefing';
  const endMarker = '## ';
  if (content.includes(briefingMarker)) {
    const start = content.indexOf(briefingMarker);
    const afterStart = content.indexOf(endMarker, start + briefingMarker.length);
    const end = afterStart > start ? afterStart : content.length;
    content = content.slice(0, start) + `${briefingMarker}\n\n${condensed}\n` + content.slice(end);
  } else {
    content += `\n${briefingMarker}\n\n${condensed}\n`;
  }

  writeFileSync(filepath, content, 'utf-8');
}

console.log(`[vault] Injected briefing into ${primerFiles.length} agent primers`);

// Rebuild index
brain.rebuildIndex();
console.log('[vault] Index rebuilt. Ready for the day.');
