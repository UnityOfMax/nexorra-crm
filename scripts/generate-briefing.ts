#!/usr/bin/env npx tsx
/**
 * Generate BRIEFING.md — strategic context for new Claude Code instances.
 * Reads: top-of-mind, latest daily digest, knowledge notes, DB stats.
 * Target: <2000 tokens, actionable, not just stats.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const VAULT = join(homedir(), 'Obsidian', 'Nexorra');
const today = new Date().toISOString().slice(0, 10);

async function main() {
  // 1. Read top-of-mind (priorities + blockers)
  let topOfMind = '';
  try {
    const raw = readFileSync(join(VAULT, '00-home', 'top-of-mind.md'), 'utf-8');
    // Extract just the bullet points, skip frontmatter and headers
    topOfMind = raw.split('\n')
      .filter(l => l.startsWith('- ') || l.startsWith('## '))
      .slice(0, 15)
      .join('\n');
  } catch { topOfMind = '- No priorities set'; }

  // 2. Read latest daily digest
  let latestDaily = '';
  try {
    const dailyDir = join(VAULT, 'daily');
    if (existsSync(dailyDir)) {
      const files = readdirSync(dailyDir).filter(f => f.endsWith('.md')).sort().reverse();
      if (files.length > 0) {
        const content = readFileSync(join(dailyDir, files[0]), 'utf-8');
        // Get first 500 chars of actual content (skip frontmatter)
        const body = content.replace(/---[\s\S]*?---/, '').trim();
        latestDaily = body.slice(0, 600);
      }
    }
  } catch {}

  // 3. Read recent knowledge notes (last 5 by modification time)
  let recentKnowledge: string[] = [];
  try {
    const knowledgeDirs = ['cold-email', 'lead-gen', 'instagram', 'experiments', 'engineering'];
    const allNotes: { name: string; mtime: number }[] = [];
    for (const dir of knowledgeDirs) {
      const dirPath = join(VAULT, 'knowledge', dir);
      if (!existsSync(dirPath)) continue;
      for (const f of readdirSync(dirPath).filter(f => f.endsWith('.md'))) {
        const stat = require('fs').statSync(join(dirPath, f));
        allNotes.push({ name: f.replace('.md', ''), mtime: stat.mtimeMs });
      }
    }
    allNotes.sort((a, b) => b.mtime - a.mtime);
    recentKnowledge = allNotes.slice(0, 5).map(n => `- [[${n.name}]]`);
  } catch {}

  // 4. DB stats (lightweight — 3 queries max)
  const { count: totalLeads } = await supabase.from('leads').select('id', { count: 'exact', head: true });
  const { count: researched } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('research_status', 'completed');
  const { data: convos } = await supabase.from('lead_conversations').select('status');
  const convoMap: Record<string, number> = {};
  for (const c of (convos || [])) convoMap[c.status] = (convoMap[c.status] || 0) + 1;

  // 5. Build briefing
  const briefing = `# Nexorra Briefing — ${today}

## What Nexorra Does
AI appointment-setting agency for real estate agents (US + Canada). CRM + 30 AI agents. Guarantee 3-5 closed deals in 90 days.

${topOfMind}

## Current Numbers
- **${totalLeads || 0}** leads in database (**${researched || 0}** researched)
- **Conversations**: ${Object.entries(convoMap).map(([k, v]) => `${v} ${k}`).join(', ') || 'none yet'}

## Latest Activity
${latestDaily || '*No activity recorded today*'}

## Key Learnings
${recentKnowledge.length > 0 ? recentKnowledge.join('\n') : '- No knowledge notes yet'}

## Vault Map
- \`00-home/\` — Start here: overview, priorities, blockers
- \`atlas/\` — Architecture, agent roster, pipeline flow
- \`knowledge/\` — Reusable learnings (prose-as-title claims)
- \`sessions/\` — Individual agent run summaries
- \`daily/\` — Consolidated daily digests
`;

  writeFileSync(join(VAULT, 'BRIEFING.md'), briefing);
  const size = Buffer.byteLength(briefing);
  console.log(`[briefing] Written to ${join(VAULT, 'BRIEFING.md')} (${size} bytes, ~${Math.round(size / 4)} tokens)`);
}

main().catch(e => { console.error(e); process.exit(1); });
