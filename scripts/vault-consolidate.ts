#!/usr/bin/env npx tsx
/**
 * Nightly vault consolidator — runs at 1:30 AM before sleep.
 * Reads today's notes, writes a recap, updates weekly summary, trims oversized files.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { writeDailyDigest, writeWeeklyConsolidation } from '../lib/obsidian/vault-writer';

const VAULT = join(homedir(), 'Obsidian', 'Nexorra');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[vault-consolidate] Starting nightly consolidation for ${today}`);

  // 1. Gather today's agent runs
  const { data: runs } = await supabase
    .from('agent_runs')
    .select('agent_id, status, duration_seconds, error_message')
    .gte('started_at', `${today}T00:00:00Z`)
    .order('started_at', { ascending: true });

  const agentRuns = (runs || []).map(r => ({
    agent: r.agent_id,
    status: r.status,
    duration: r.duration_seconds || 0,
  }));

  // 2. Gather lead stats
  const { count: scraped } = await supabase
    .from('leads').select('id', { count: 'exact', head: true })
    .gte('scraped_at', `${today}T00:00:00Z`);

  const { count: researched } = await supabase
    .from('leads').select('id', { count: 'exact', head: true })
    .eq('research_status', 'completed');

  // 3. Gather email/IG stats (approximate)
  const { count: emailConvos } = await supabase
    .from('lead_conversations').select('id', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00Z`);

  const { count: igMessages } = await supabase
    .from('instagram_unibox_messages').select('id', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00Z`);

  // 4. Identify highlights and issues
  const highlights: string[] = [];
  const issues: string[] = [];
  const completed = agentRuns.filter(r => r.status === 'completed');
  const failed = agentRuns.filter(r => r.status === 'failed');
  if (completed.length > 0) highlights.push(`${completed.length} agent runs completed`);
  if ((scraped || 0) > 0) highlights.push(`${scraped} new leads scraped`);
  if ((emailConvos || 0) > 0) highlights.push(`${emailConvos} email conversations active`);
  if (failed.length > 0) issues.push(`${failed.length} agent runs failed: ${failed.map(f => f.agent).join(', ')}`);

  // 5. Write daily digest
  writeDailyDigest({
    date: today,
    leadsScraped: scraped || 0,
    leadsResearched: researched || 0,
    emailsSent: 0, // TODO: track from conversation_messages
    emailReplies: emailConvos || 0,
    igDmsSent: 0,
    igReplies: igMessages || 0,
    bookings: 0,
    agentRuns,
    highlights,
    issues,
  });
  console.log(`[vault-consolidate] Daily digest written`);

  // 6. Weekly consolidation (on Sundays or if weekly-summary.md is older than 7 days)
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) { // Sunday
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { count: weekLeads } = await supabase
      .from('leads').select('id', { count: 'exact', head: true })
      .gte('scraped_at', `${weekAgo}T00:00:00Z`);

    const { data: cityData } = await supabase
      .from('leads')
      .select('city')
      .gte('scraped_at', `${weekAgo}T00:00:00Z`);

    const cityCounts: Record<string, number> = {};
    for (const r of (cityData || [])) {
      cityCounts[r.city] = (cityCounts[r.city] || 0) + 1;
    }
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, leads]) => ({ city, leads }));

    writeWeeklyConsolidation({
      weekOf: `${weekAgo} to ${today}`,
      totalLeads: weekLeads || 0,
      totalEmails: 0,
      totalBookings: 0,
      topPerformingCities: topCities,
      experimentResults: [],
      lessonsLearned: [],
      nextWeekPriorities: ['Continue lead scraping', 'Improve research quality', 'Launch email campaigns'],
    });
    console.log(`[vault-consolidate] Weekly summary written`);
  }

  // 7. Trim oversized vault files (>4KB)
  const dirs = ['Daily', 'Research', 'Engineering', 'Clients'];
  let trimmed = 0;
  for (const dir of dirs) {
    const fullDir = join(VAULT, dir);
    try {
      for (const file of readdirSync(fullDir)) {
        const fp = join(fullDir, file);
        const stat = statSync(fp);
        if (stat.size > 4096 && file.endsWith('.md')) {
          const content = readFileSync(fp, 'utf8');
          // Keep front-matter + first 3000 chars of body
          const fmEnd = content.indexOf('---', 4);
          if (fmEnd > 0) {
            const fm = content.slice(0, fmEnd + 3);
            const body = content.slice(fmEnd + 3).trim().slice(0, 3000);
            writeFileSync(fp, `${fm}\n\n${body}\n\n*[Trimmed for token efficiency]*\n`);
            trimmed++;
          }
        }
      }
    } catch {} // dir doesn't exist yet
  }
  if (trimmed > 0) console.log(`[vault-consolidate] Trimmed ${trimmed} oversized files`);

  console.log(`[vault-consolidate] Done`);
}

main().catch(e => { console.error(e); process.exit(1); });
