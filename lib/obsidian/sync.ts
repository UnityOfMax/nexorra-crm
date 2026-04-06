import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { VAULT_ROOT, ensureVault } from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Sync daily scraping session summary to Obsidian vault.
 * Does NOT create individual lead notes — only session summaries with stats.
 * Also syncs new client accounts.
 */
export async function syncLeads(): Promise<{ created: number; updated: number }> {
  await ensureVault();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Get today's lead stats by brokerage and category
  const { data: emailLeads, count: emailCount } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('lead_category', 'email')
    .gte('scraped_at', `${today}T00:00:00Z`);

  const { count: igCount } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('lead_category', 'instagram')
    .gte('scraped_at', `${today}T00:00:00Z`);

  const { count: totalCount } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true });

  const { count: videosCount } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .not('video_url', 'is', null);

  const { count: pushedCount } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('pushed_to_instantly', true);

  // Get brokerage breakdown for today
  const { data: brokerageBreakdown } = await supabaseAdmin
    .from('leads')
    .select('source_brokerage')
    .gte('scraped_at', `${today}T00:00:00Z`);

  const brokerageCounts: Record<string, number> = {};
  for (const lead of brokerageBreakdown || []) {
    const b = lead.source_brokerage || 'unknown';
    brokerageCounts[b] = (brokerageCounts[b] || 0) + 1;
  }

  // Write daily summary
  const summaryDir = path.join(VAULT_ROOT, 'Daily');
  await fs.mkdir(summaryDir, { recursive: true });

  const summaryPath = path.join(summaryDir, `${today}-scraping.md`);
  const brokerageLines = Object.entries(brokerageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([b, c]) => `- ${b}: ${c}`)
    .join('\n');

  const summary = `---
date: ${today}
type: scraping-session
---

# Scraping Session — ${today}

## Today's Numbers
- Email leads scraped: ${emailCount || 0}
- Instagram leads scraped: ${igCount || 0}
- Total today: ${(emailCount || 0) + (igCount || 0)}

## Brokerage Breakdown
${brokerageLines || '- No leads scraped today'}

## Pipeline Totals
- Total leads in DB: ${totalCount || 0}
- With videos generated: ${videosCount || 0}
- Pushed to Instantly: ${pushedCount || 0}
- Pending video generation: ${(totalCount || 0) - (videosCount || 0)}
`;

  await fs.writeFile(summaryPath, summary, 'utf-8');
  console.log(`Written daily summary: ${summaryPath}`);

  // Sync client accounts (only new ones)
  const clientsDir = path.join(VAULT_ROOT, 'Clients');
  await fs.mkdir(clientsDir, { recursive: true });

  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('id, name, created_at')
    .neq('id', 'da99b768-79dd-48f8-af86-abf95e61a69f'); // Exclude agency account

  let clientsCreated = 0;
  for (const acct of accounts || []) {
    const clientPath = path.join(clientsDir, `${acct.name}.md`);
    try {
      await fs.access(clientPath);
      // Already exists, skip
    } catch {
      // Create new client note
      await fs.writeFile(clientPath, `---
name: ${acct.name}
status: active
account_id: ${acct.id}
added: ${acct.created_at?.slice(0, 10) || today}
---

# ${acct.name}

Client sub-account. Details from CRM.
`, 'utf-8');
      clientsCreated++;
      console.log(`Created client note: ${acct.name}`);
    }
  }

  return { created: clientsCreated, updated: 1 }; // 1 = daily summary written
}
