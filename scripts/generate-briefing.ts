#!/usr/bin/env npx tsx
/**
 * Generate BRIEFING.md — the project brain.
 * Queries DB + primers + git for current state. Max 3KB output.
 * Run: npx tsx scripts/generate-briefing.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const VAULT = join(homedir(), 'Obsidian', 'Nexorra');
const CRM = join(__dirname, '..');
const PRIMERS = join(CRM, 'agents', 'primers');
const now = new Date();
const today = now.toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

async function main() {
  // 1. Currently running agents
  const { data: running } = await supabase
    .from('agent_runs')
    .select('agent_id, started_at')
    .eq('status', 'running');

  const runningStr = (running || []).length > 0
    ? (running || []).map(r => `- **${r.agent_id}** (started ${r.started_at.slice(11, 16)} UTC)`).join('\n')
    : '- None';

  // 2. Last 24h completed runs
  const { data: recentRuns } = await supabase
    .from('agent_runs')
    .select('agent_id, status, started_at, duration_seconds, summary')
    .gte('started_at', `${yesterday}T00:00:00Z`)
    .neq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(15);

  const completedStr = (recentRuns || []).length > 0
    ? (recentRuns || []).map(r => {
        const dur = r.duration_seconds ? `${r.duration_seconds}s` : '?';
        return `- ${r.agent_id}: ${r.status} (${r.started_at.slice(11, 16)} UTC, ${dur})`;
      }).join('\n')
    : '- No runs in last 24h';

  // 3. Lead counts
  const { count: totalLeads } = await supabase.from('leads').select('id', { count: 'exact', head: true });
  const { count: pendingResearch } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('research_status', 'pending');
  const { count: completedResearch } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('research_status', 'completed');

  // 4. Conversation status
  const { data: convos } = await supabase.from('lead_conversations').select('status');
  const convoMap: Record<string, number> = {};
  for (const c of (convos || [])) convoMap[c.status] = (convoMap[c.status] || 0) + 1;
  const convoStr = Object.entries(convoMap).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';

  // 5. Recent git commits
  let gitLog = '';
  try {
    gitLog = execSync('git log --oneline -5', { cwd: CRM, encoding: 'utf-8' }).trim();
  } catch { gitLog = '(git unavailable)'; }

  // 6. Agent primer summaries (just status line from each)
  const agentStatuses: string[] = [];
  if (existsSync(PRIMERS)) {
    for (const file of readdirSync(PRIMERS).filter(f => f.endsWith('.md')).sort()) {
      try {
        const content = readFileSync(join(PRIMERS, file), 'utf-8');
        const name = file.replace('.md', '');
        const lastRun = content.match(/Last run: (.+)/)?.[1] || 'never';
        const status = content.match(/Status: (.+)/)?.[1] || 'idle';
        if (lastRun !== 'never' && lastRun !== 'Not yet') {
          agentStatuses.push(`- ${name}: ${status} (${lastRun.slice(0, 16)})`);
        }
      } catch {}
    }
  }
  const agentStr = agentStatuses.length > 0 ? agentStatuses.join('\n') : '- No agents have run yet';

  // 7. Known issues (from recent daily notes)
  let issues = '';
  try {
    const dailyDir = join(VAULT, 'Daily');
    if (existsSync(dailyDir)) {
      const files = readdirSync(dailyDir).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 2);
      for (const f of files) {
        const content = readFileSync(join(dailyDir, f), 'utf-8');
        const issueMatch = content.match(/## Issues\n([\s\S]*?)(?=\n##|\n---|\Z)/);
        if (issueMatch && issueMatch[1].trim()) {
          issues += issueMatch[1].trim() + '\n';
        }
      }
    }
  } catch {}

  // Build BRIEFING.md
  const briefing = `# Nexorra — Current State (${now.toISOString().slice(0, 16)} UTC)

## Active Now
${runningStr}

## Last 24h Runs
${completedStr}

## Key Numbers
- **Leads:** ${totalLeads || 0} total (${pendingResearch || 0} pending research, ${completedResearch || 0} researched)
- **Conversations:** ${convoStr}

## Agent Status (recently active)
${agentStr}

## Recent Commits
\`\`\`
${gitLog}
\`\`\`
${issues ? `\n## Known Issues\n${issues}` : ''}
## Quick Reference
- Daemon: \`curl -s http://localhost:4200/status -H "x-cron-secret: $CRON_SECRET"\`
- Start agent: \`curl -X POST localhost:4200/run -d '{"agentId":"jeff","trigger":"manual"}' -H "x-signature: $(echo -n '...' | openssl dgst -sha256 -hmac "$DAEMON_SIGNING_KEY")"\`
- Obsidian vault: \`~/Obsidian/Nexorra/\`
- Agent primers: \`agents/primers/{name}.md\`
- Mulch query: \`npx tsx -e "require('./lib/mulch/client').query('topic')"\`
`;

  // Write
  const outPath = join(VAULT, 'BRIEFING.md');
  writeFileSync(outPath, briefing);
  const size = Buffer.byteLength(briefing);
  console.log(`[briefing] Written to ${outPath} (${size} bytes, ~${Math.round(size / 4)} tokens)`);

  // Also write INDEX.md
  try {
    const indexEntries: string[] = [];
    const dirs = ['Daily', 'Research', 'Marketing', 'Engineering', 'Experiments'];
    for (const dir of dirs) {
      const dirPath = join(VAULT, dir);
      if (!existsSync(dirPath)) continue;
      const files = readdirSync(dirPath).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 5);
      for (const f of files) {
        const date = f.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '?';
        indexEntries.push(`| ${date} | ${dir.toLowerCase()} | ${f.replace('.md', '')} |`);
      }
    }
    const leadsCount = existsSync(join(VAULT, 'Leads'))
      ? readdirSync(join(VAULT, 'Leads')).filter(f => f.endsWith('.md') && f !== '_template.md').length
      : 0;

    const index = `# Vault Index (auto-generated ${today})

## Recent Notes
| Date | Type | Title |
|------|------|-------|
${indexEntries.slice(0, 20).join('\n')}

## Stats
- ${leadsCount} lead profiles
- ${dirs.map(d => {
      const p = join(VAULT, d);
      return existsSync(p) ? `${readdirSync(p).filter(f => f.endsWith('.md')).length} ${d.toLowerCase()}` : '';
    }).filter(Boolean).join(', ')}
`;
    writeFileSync(join(VAULT, 'INDEX.md'), index);
  } catch {}
}

main().catch(e => { console.error(e); process.exit(1); });
