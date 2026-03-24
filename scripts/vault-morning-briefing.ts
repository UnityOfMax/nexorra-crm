#!/usr/bin/env npx tsx
/**
 * Morning briefing — runs at 9:55 AM (before agents wake at 10 AM).
 * Reads yesterday's data, generates a briefing for today.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeMorningBriefing } from '../lib/obsidian/vault-writer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CRON_SCHEDULE: Record<string, string> = {
  jeff: '10:00 AM', stacey: '10:00 AM', tara: '10:30 AM',
  jess: '6:00 PM', lionel: '8:00 PM', glen: '9:00 PM',
  marcus: '10:00 PM', hugo: '10:00 PM', nina: '11:00 PM',
  omar: 'Every 5 min', priya: 'Webhook', malik: 'Webhook',
};

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  console.log(`[vault-briefing] Generating morning briefing for ${today}`);

  const { data: runs } = await supabase
    .from('agent_runs')
    .select('agent_id, status, started_at, duration_seconds')
    .gte('started_at', `${yesterday}T00:00:00Z`)
    .lt('started_at', `${today}T00:00:00Z`)
    .order('started_at', { ascending: false });

  const agentStatuses = Object.entries(CRON_SCHEDULE).map(([agent, sched]) => {
    const lastRun = (runs || []).find(r => r.agent_id === agent);
    return {
      agent,
      lastRun: lastRun ? lastRun.started_at.slice(11, 16) : 'none',
      status: lastRun ? lastRun.status : 'idle',
      nextScheduled: sched,
    };
  });

  const { count: pendingLeads } = await supabase
    .from('leads').select('id', { count: 'exact', head: true })
    .eq('research_status', 'pending');

  const { count: researchedLeads } = await supabase
    .from('leads').select('id', { count: 'exact', head: true })
    .eq('research_status', 'completed');

  const { count: pendingTasks } = await supabase
    .from('task_board').select('id', { count: 'exact', head: true })
    .eq('status', 'todo');

  const { count: emailConvos } = await supabase
    .from('lead_conversations').select('id', { count: 'exact', head: true });

  const failedRuns = (runs || []).filter(r => r.status === 'failed');
  const priorities: string[] = [];
  if ((pendingLeads || 0) > 500) priorities.push(`${pendingLeads} leads need research`);
  if (failedRuns.length > 0) priorities.push(`${failedRuns.length} agent runs failed yesterday`);
  priorities.push('Jeff: lead scraping at 10 AM');
  priorities.push('Stacey: email upload at 10 AM');

  writeMorningBriefing({
    date: today,
    agentStatuses,
    pendingTasks: pendingTasks || 0,
    leadsPending: pendingLeads || 0,
    leadsResearched: researchedLeads || 0,
    emailCampaignStatus: `${emailConvos || 0} active conversations`,
    priorities,
  });

  console.log(`[vault-briefing] Written to Daily/${today}-briefing.md`);
}

main().catch(e => { console.error(e); process.exit(1); });
