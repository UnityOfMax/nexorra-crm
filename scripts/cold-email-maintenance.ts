#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const instantlyToken = process.env.INSTANTLY_API_KEY;

if (!supabaseUrl || !supabaseKey || !instantlyToken) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INSTANTLY_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface LeadConversation {
  id: string;
  lead_email: string;
  instantly_email_acct: string;
  campaign_id: string;
  lead_name: string;
  status: string;
  last_outbound_at: string;
}

interface Outcome {
  id: string;
  status: string;
  outcome_learned: boolean;
}

interface Learning {
  outcome: string;
  learning_note: string;
}

async function getDaysAgo(days: number): Promise<string> {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// Step 1: Nudge Check
async function nudgeCheck() {
  console.log('\n📬 Step 1: Nudge Check...');

  const twoDaysAgo = await getDaysAgo(2);

  const { data: conversations, error } = await supabase
    .from('lead_conversations')
    .select('id, lead_email, instantly_email_acct, campaign_id, lead_name')
    .eq('status', 'replied')
    .is('nudge_sent_at', null)
    .lt('last_outbound_at', twoDaysAgo)
    .limit(10);

  if (error) {
    console.error('Error fetching nudge candidates:', error);
    return { nudged: 0 };
  }

  if (!conversations || conversations.length === 0) {
    console.log('  → No nudge candidates found');
    return { nudged: 0 };
  }

  console.log(`  → Found ${conversations.length} candidates for nudging`);

  let nudged = 0;
  for (const conv of conversations) {
    const nudgeTemplate = `Hey ${conv.lead_name}, just checking if you had a chance to look at that link. No rush — just wanted to make sure it did not get buried. Stacey`;

    try {
      // Schedule nudge via Instantly API
      const response = await fetch('https://api.instantly.ai/api/v1/email/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${instantlyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: conv.lead_email,
          from_email: conv.instantly_email_acct,
          campaign_id: conv.campaign_id,
          subject_line: 'RE: Appointment Setting for Real Estate Agents',
          body: nudgeTemplate,
          delay: Math.floor(Math.random() * 5) + 1, // 1-5 min delay
        }),
      });

      if (response.status === 429) {
        console.log('  → Instantly rate limit hit, waiting 60s...');
        await new Promise(r => setTimeout(r, 60000));
        continue;
      }

      if (!response.ok) {
        console.warn(`  ⚠ Failed to send nudge for ${conv.lead_email}: ${response.status}`);
        continue;
      }

      // Mark conversation
      await supabase
        .from('lead_conversations')
        .update({
          status: 'nudge_sent',
          nudge_sent_at: new Date().toISOString(),
        })
        .eq('id', conv.id);

      nudged++;
      console.log(`  ✓ Nudged: ${conv.lead_email}`);
    } catch (e) {
      console.error(`  ✗ Error nudging ${conv.lead_email}:`, e);
    }
  }

  return { nudged };
}

// Step 2: Ghosted Detection
async function ghostedDetection() {
  console.log('\n👻 Step 2: Ghosted Detection...');

  const sevenDaysAgo = await getDaysAgo(7);
  const fourDaysAgo = await getDaysAgo(4);

  // Replied with no follow-up for 7+ days
  const { data: group1, error: err1 } = await supabase
    .from('lead_conversations')
    .select('id')
    .eq('status', 'replied')
    .lt('last_outbound_at', sevenDaysAgo);

  // Nudge sent but no response for 4+ days
  const { data: group2, error: err2 } = await supabase
    .from('lead_conversations')
    .select('id')
    .eq('status', 'nudge_sent')
    .lt('nudge_sent_at', fourDaysAgo);

  if (err1 || err2) {
    console.error('Error fetching ghosted candidates:', err1 || err2);
    return { ghosted: 0 };
  }

  const allGhosted = [...(group1 || []), ...(group2 || [])];
  const uniqueIds = Array.from(new Set(allGhosted.map(c => c.id)));

  if (uniqueIds.length === 0) {
    console.log('  → No ghosted conversations found');
    return { ghosted: 0 };
  }

  console.log(`  → Found ${uniqueIds.length} ghosted conversations`);

  // Bulk update
  for (const id of uniqueIds) {
    await supabase
      .from('lead_conversations')
      .update({
        status: 'ghosted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  return { ghosted: uniqueIds.length };
}

// Step 3: Send Scheduled Messages (Instantly already handles scheduling)
async function sendScheduledMessages() {
  console.log('\n📤 Step 3: Scheduled Messages...');
  console.log('  → Instantly API handles scheduling. Messages will send per configured delays.');
  return { sent: 0 };
}

// Step 4-7: Learning Cycle
async function learningCycle() {
  console.log('\n📚 Step 4-7: Learning Cycle...');

  const { data: outcomes, error } = await supabase
    .from('lead_conversations')
    .select('id, lead_email, lead_name, status')
    .in('status', ['booked', 'ghosted', 'rejected', 'no_show', 'closed_deal'])
    .eq('outcome_learned', false)
    .limit(10);

  if (error) {
    console.error('Error fetching outcomes:', error);
    return { learned: 0 };
  }

  if (!outcomes || outcomes.length === 0) {
    console.log('  → No new outcomes to learn from');
    return { learned: 0, bookings: 0, ghosted: 0, rejected: 0 };
  }

  console.log(`  → Found ${outcomes.length} new outcomes to analyze`);

  let learned = 0;
  const stats: { [key: string]: number } = { booked: 0, ghosted: 0, rejected: 0, no_show: 0, closed_deal: 0 };

  for (const outcome of outcomes) {
    // Fetch full conversation thread
    const { data: thread, error: threadError } = await supabase
      .from('conversation_messages')
      .select('direction, content, classification, sender_email')
      .eq('conversation_id', outcome.id)
      .order('sent_at', { ascending: true });

    if (threadError || !thread) {
      console.warn(`  ⚠ Could not fetch thread for ${outcome.lead_email}`);
      continue;
    }

    // Get copy_variant_id if available
    const { data: convData } = await supabase
      .from('lead_conversations')
      .select('copy_variant_id')
      .eq('id', outcome.id)
      .single();

    // Create learning note from thread analysis
    const firstReply = thread.find((m: any) => m.direction === 'inbound');
    const classification = firstReply?.classification || 'unknown';
    const replyContent = (firstReply?.content || '').slice(0, 100);
    const threadLength = thread.length;

    const learning = `Outcome: ${outcome.status}. Lead's first reply was "${classification}" — "${replyContent}". ` +
      `Thread had ${threadLength} messages. ` +
      (outcome.status === 'booked' ? 'The engagement pattern worked — replicate this approach.' :
       outcome.status === 'ghosted' ? 'Lost momentum after initial contact. Try faster follow-up or different angle.' :
       outcome.status === 'rejected' ? `Quick rejection. The "${classification}" response suggests the pitch didn't resonate.` :
       `${outcome.status} after ${threadLength} exchanges.`);

    // Save to stacey_learnings
    const { error: saveError } = await supabase
      .from('stacey_learnings')
      .insert({
        conversation_id: outcome.id,
        outcome: outcome.status,
        learning_note: learning,
      });

    if (saveError) {
      console.warn(`  ⚠ Could not save learning for ${outcome.lead_email}:`, saveError);
      continue;
    }

    // Update copy variant stats if available
    if (convData?.copy_variant_id) {
      const statField = outcome.status === 'booked' ? 'times_booked'
        : outcome.status === 'ghosted' ? 'times_ghosted'
        : outcome.status === 'rejected' ? 'times_ghosted' : null;
      if (statField) {
        await supabase.rpc('increment_variant_stat', {
          p_id: convData.copy_variant_id,
          p_stat: statField,
        });
        console.log(`  → Updated variant stats: ${statField}`);
      }
    }

    // Record to Mulch (using proper locked write)
    try {
      const mulchClient = require(require('path').join(process.cwd(), 'lib/mulch/client'));
      void mulchClient.record({
        agent: 'lionel',
        domain: 'cold-email',
        content: learning,
        tags: [outcome.status, classification],
        classification: 'tactical',
      });
    } catch {}

    // Mark as learned
    await supabase
      .from('lead_conversations')
      .update({ outcome_learned: true })
      .eq('id', outcome.id);

    stats[outcome.status]++;
    learned++;
    console.log(`  ✓ Learned: ${outcome.status} for ${outcome.lead_email}`);
  }

  return { learned, ...stats };
}

// Step 8: Report
async function report(results: any) {
  console.log('\n📊 Step 8: Summary Report');
  console.log('================================');
  console.log(`✓ Nudged: ${results.nudged || 0}`);
  console.log(`✓ Ghosted: ${results.ghosted || 0}`);
  console.log(`✓ Learning cycle: ${results.learned || 0} outcomes`);
  if (results.booked) console.log(`  - Booked: ${results.booked}`);
  if (results.ghosted && results.ghosted > 0) console.log(`  - Ghosted: ${results.ghosted}`);
  if (results.rejected && results.rejected > 0) console.log(`  - Rejected: ${results.rejected}`);
  console.log('================================\n');

  return results;
}

// Main execution
async function main() {
  console.log('🔧 Cold Email Maintenance Agent — Starting\n');

  const results: any = {};

  try {
    Object.assign(results, await nudgeCheck());
    Object.assign(results, await ghostedDetection());
    Object.assign(results, await sendScheduledMessages());
    Object.assign(results, await learningCycle());
    await report(results);

    console.log('✅ Maintenance complete!');
  } catch (e) {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  }
}

main();
