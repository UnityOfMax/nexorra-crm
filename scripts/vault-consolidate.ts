#!/usr/bin/env npx tsx
/**
 * Nightly vault consolidator — runs at 1:30 AM before sleep.
 * Reads today's scattered notes, writes a digest, rebuilds index.
 */
import brain from '../lib/obsidian/brain';

console.log('[vault] Starting nightly consolidation...');

const digest = brain.consolidateDay();
console.log(`[vault] Digest written (${digest.length} chars)`);

brain.rebuildIndex();
console.log('[vault] Index rebuilt');

console.log('[vault] Done.');
