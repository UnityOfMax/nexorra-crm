import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const VAULT = join(homedir(), 'Obsidian', 'Nexorra');

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeNote(relativePath: string, frontmatter: Record<string, any>, body: string) {
  const full = join(VAULT, relativePath);
  ensureDir(join(full, '..'));
  const fm = Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  writeFileSync(full, `---\n${fm}\n---\n\n${body}\n`);
}

export function readVaultNote(relativePath: string): string | null {
  try { return readFileSync(join(VAULT, relativePath), 'utf8'); } catch { return null; }
}

export function writeDailyDigest(data: {
  date: string; leadsScraped: number; leadsResearched: number;
  emailsSent: number; emailReplies: number; igDmsSent: number; igReplies: number;
  bookings: number; agentRuns: Array<{agent: string, status: string, duration: number}>;
  highlights: string[]; issues: string[];
}) {
  const successful = data.agentRuns.filter(r => r.status === 'completed').length;
  const failed = data.agentRuns.filter(r => r.status === 'failed').length;
  const body = `# Daily Digest — ${data.date}

## Pipeline
- Leads scraped: **${data.leadsScraped}**
- Leads researched: **${data.leadsResearched}**
- Emails sent: **${data.emailsSent}** | Replies: **${data.emailReplies}**
- IG DMs sent: **${data.igDmsSent}** | Replies: **${data.igReplies}**
- Bookings: **${data.bookings}**

## Agent Activity
${data.agentRuns.map(r => `- ${r.agent}: ${r.status} (${r.duration}s)`).join('\n')}

**${successful} succeeded, ${failed} failed**

## Highlights
${data.highlights.map(h => `- ${h}`).join('\n') || '- None'}

## Issues
${data.issues.map(i => `- ${i}`).join('\n') || '- None'}

---
Links: [[${data.date}-briefing|Morning Briefing]]`;

  writeNote(`Daily/${data.date}.md`, { date: data.date, type: 'daily-digest', tags: ['daily'] }, body);
}

export function writeResearchNote(data: {
  title: string; category: string; content: string; sources: string[]; tags: string[];
}) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const body = `# ${data.title}

${data.content}

## Sources
${data.sources.map(s => `- ${s}`).join('\n')}`;

  writeNote(`Research/${date}-${slug}.md`, { date, type: data.category, tags: data.tags }, body);
}

export function writeEngineeringLog(data: {
  title: string; type: string; filesChanged: string[]; summary: string; reviewNotes?: string;
}) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  const body = `# ${data.title}

**Type**: ${data.type}

## Summary
${data.summary}

## Files Changed
${data.filesChanged.map(f => `- \`${f}\``).join('\n')}
${data.reviewNotes ? `\n## Review Notes\n${data.reviewNotes}` : ''}`;

  writeNote(`Engineering/${date}-${slug}.md`, { date, type: data.type, tags: ['engineering', data.type] }, body);
}

export function writeClientNote(data: {
  accountId: string; clientName: string; avatarData: any; notes: string;
}) {
  const slug = data.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const body = `# ${data.clientName}

Account: \`${data.accountId}\`

## Avatar Profile
${typeof data.avatarData === 'object' ? Object.entries(data.avatarData).map(([k, v]) => `- **${k}**: ${v}`).join('\n') : data.avatarData}

## Notes
${data.notes}`;

  writeNote(`Clients/${slug}.md`, { accountId: data.accountId, type: 'client', tags: ['client'] }, body);
}

export function writeMorningBriefing(data: {
  date: string;
  agentStatuses: Array<{agent: string, lastRun: string, status: string, nextScheduled: string}>;
  pendingTasks: number; leadsPending: number; leadsResearched: number;
  emailCampaignStatus: string; priorities: string[];
}) {
  const body = `# Morning Briefing — ${data.date}

## Agent Status
| Agent | Last Run | Status | Next |
|-------|----------|--------|------|
${data.agentStatuses.map(a => `| ${a.agent} | ${a.lastRun} | ${a.status} | ${a.nextScheduled} |`).join('\n')}

## Pipeline
- Leads pending research: **${data.leadsPending}**
- Leads researched: **${data.leadsResearched}**
- Email campaign: ${data.emailCampaignStatus}
- Pending tasks: **${data.pendingTasks}**

## Today's Priorities
${data.priorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---
Links: [[${data.date}|Daily Digest]]`;

  writeNote(`Daily/${data.date}-briefing.md`, { date: data.date, type: 'briefing', tags: ['daily', 'briefing'] }, body);
}

export function writeWeeklyConsolidation(data: {
  weekOf: string; totalLeads: number; totalEmails: number; totalBookings: number;
  topPerformingCities: Array<{city: string, leads: number}>;
  experimentResults: string[]; lessonsLearned: string[]; nextWeekPriorities: string[];
}) {
  const body = `# Weekly Summary — ${data.weekOf}

## Totals
- Leads: **${data.totalLeads}**
- Emails sent: **${data.totalEmails}**
- Bookings: **${data.totalBookings}**

## Top Cities
${data.topPerformingCities.map(c => `- ${c.city}: ${c.leads} leads`).join('\n')}

## Experiment Results
${data.experimentResults.map(r => `- ${r}`).join('\n') || '- None this week'}

## Lessons Learned
${data.lessonsLearned.map(l => `- ${l}`).join('\n') || '- None'}

## Next Week
${data.nextWeekPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

  writeNote(`Research/weekly-summary.md`, { weekOf: data.weekOf, type: 'weekly', tags: ['weekly', 'summary'] }, body);
}
