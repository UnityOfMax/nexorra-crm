#!/usr/bin/env npx tsx
/**
 * Client Reply Agent - Process inbound SMS/email for all sub-accounts
 * Runs every 5 minutes via cron
 */

require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { generateAndSendAI } from '@/lib/ai/generate-and-send';
import mulch from '@/lib/mulch/client';

// Create Supabase admin client directly (avoid lib/supabase.ts initialization issues)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[ERROR] Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface AiAgentConfig {
  account_id: string;
  enabled: boolean;
  system_prompt?: string;
  agent_name?: string;
  agent_represents?: string;
  business_context?: string;
  tone?: string;
  max_tokens?: number;
  channels?: {
    sms?: boolean;
    email?: boolean;
  };
  email_system_prompt?: string;
  email_agent_name?: string;
  email_agent_represents?: string;
  email_max_tokens?: number;
}

interface Message {
  id: string;
  account_id: string;
  contact_id: string;
  type: 'sms' | 'email';
  direction: 'inbound' | 'outbound';
  content: string;
  created_at: string;
  metadata?: any;
  is_ai_generated?: boolean;
}

interface Contact {
  id: string;
  account_id: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  custom_fields?: any;
  ai_enabled?: boolean;
}

async function preCheck(): Promise<string[]> {
  console.log('[PRE-CHECK] Querying enabled AI agent configs...');

  const { data: configs, error: configError } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('account_id')
    .eq('enabled', true);

  if (configError) {
    console.error('[ERROR] Failed to fetch AI configs:', configError);
    return [];
  }

  if (!configs || configs.length === 0) {
    console.log('[PRE-CHECK] No enabled AI agent configs found. Exiting.');
    return [];
  }

  const accountIds = configs.map(c => (c as any).account_id);
  console.log(`[PRE-CHECK] Found ${accountIds.length} enabled account(s)`);

  // Check for pending messages in each account
  let totalPendingMessages = 0;
  for (const accountId of accountIds) {
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('account_id', accountId)
      .eq('direction', 'inbound')
      .is('is_ai_generated', null)
      .limit(1);

    if (!msgError && messages && messages.length > 0) {
      totalPendingMessages += messages.length;
    }
  }

  if (totalPendingMessages === 0) {
    console.log('[PRE-CHECK] No pending messages found. Exiting.');
    return [];
  }

  console.log(`[PRE-CHECK] Found ${totalPendingMessages} pending message(s) across accounts`);
  return accountIds;
}

async function loadContext(): Promise<{ defaultPrompt: string; learnings: string }> {
  console.log('[CONTEXT] Loading default system prompt and learnings...');

  const defaultPromptPath = path.join(process.cwd(), 'agents/prompts/client-reply-defaults.md');
  const learningsPath = path.join(process.cwd(), 'agents/memory/client-reply.md');

  let defaultPrompt = 'You are a helpful assistant. Respond concisely and professionally.';
  let learnings = '';

  try {
    if (fs.existsSync(defaultPromptPath)) {
      defaultPrompt = fs.readFileSync(defaultPromptPath, 'utf-8');
    }
  } catch (e) {
    console.warn('[WARN] Could not read default prompt');
  }

  try {
    if (fs.existsSync(learningsPath)) {
      learnings = fs.readFileSync(learningsPath, 'utf-8');
    }
  } catch (e) {
    console.warn('[WARN] Could not read learnings');
  }

  // Augment with Mulch learnings (cross-run compounding memory)
  const mulchContext = await mulch.loadAgentContext('client-reply');
  if (mulchContext) {
    console.log(`[CONTEXT] Loaded Mulch learnings for client-reply`);
    learnings = learnings ? `${learnings}\n\n--- MULCH LEARNINGS ---\n${mulchContext}` : mulchContext;
  }

  return { defaultPrompt, learnings };
}

async function getAccountName(accountId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('accounts')
    .select('name')
    .eq('id', accountId)
    .single();

  return data?.name || accountId.substring(0, 8);
}

async function processPendingMessages(accountIds: string[], _context: any): Promise<{ sms: number; email: number; followUpsScheduled: number; learningsCollected: number }> {
  console.log('[PROCESSING] Starting message processing...');

  let smsSent = 0;
  let emailSent = 0;
  let followUpsScheduled = 0;
  let learningsCollected = 0;

  const learningsBuffer: string[] = [];

  for (const accountId of accountIds) {
    const accountName = await getAccountName(accountId);
    console.log(`\n[ACCOUNT: ${accountName}] Processing messages...`);

    // Fetch pending messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('id,contact_id,type,content,created_at,metadata')
      .eq('account_id', accountId)
      .eq('direction', 'inbound')
      .is('is_ai_generated', null)
      .order('created_at', { ascending: true })
      .limit(10);

    if (msgError || !messages || messages.length === 0) {
      console.log(`[ACCOUNT: ${accountName}] No pending messages`);
      continue;
    }

    console.log(`[ACCOUNT: ${accountName}] Found ${messages.length} pending message(s)`);

    // Fetch AI config for this account
    const { data: configData } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!configData) {
      console.log(`[ACCOUNT: ${accountName}] No AI config found, skipping`);
      continue;
    }

    const config = configData as AiAgentConfig;

    // Group messages by contact — generate ONE reply per contact, not per message
    const byContact = new Map<string, Message[]>();
    for (const msg of messages as Message[]) {
      const bucket = byContact.get(msg.contact_id) || [];
      bucket.push(msg);
      byContact.set(msg.contact_id, bucket);
    }

    for (const [contactId, contactMsgs] of byContact) {
      // Most recent inbound message in this group
      const latestMsg = contactMsgs[contactMsgs.length - 1];
      const contactPrefix = `[contact:${contactId.substring(0, 8)}]`;

      // ── 15-second debounce ────────────────────────────────────────────────
      // If the most recent inbound arrived less than 15s ago, skip — more
      // messages may still be incoming. The next cron run will process them.
      const elapsedMs = Date.now() - new Date(latestMsg.created_at).getTime();
      if (elapsedMs < 15_000) {
        console.log(`${contactPrefix} Debouncing — last message ${Math.round(elapsedMs / 1000)}s ago, waiting for more`);
        continue;
      }

      // Fetch contact details
      const { data: contactData } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (!contactData) {
        console.log(`${contactPrefix} Contact not found, skipping`);
        continue;
      }

      const contact = contactData as Contact;

      if (contact.ai_enabled === false) {
        console.log(`${contactPrefix} AI disabled for this contact, skipping`);
        continue;
      }

      const channel = latestMsg.type;
      const channelEnabled = channel === 'sms'
        ? config.channels?.sms !== false
        : config.channels?.email !== false;

      if (!channelEnabled) {
        console.log(`${contactPrefix} ${channel.toUpperCase()} not enabled for this account, skipping`);
        continue;
      }

      try {
        console.log(`${contactPrefix} Generating ${channel.toUpperCase()} reply for ${contactMsgs.length} message(s)...`);

        const result = await generateAndSendAI({
          accountId,
          contactId,
          channel,
          isFollowUp: false,
          followUpCount: 0,
        });

        if (result.success) {
          if (channel === 'sms') smsSent++; else emailSent++;
          followUpsScheduled++;
          console.log(`${contactPrefix} ✓ ${channel.toUpperCase()} reply sent`);

          // Mark ALL pending messages for this contact as processed
          const ids = contactMsgs.map(m => m.id);
          void supabaseAdmin
            .from('messages')
            .update({ is_ai_generated: false })
            .in('id', ids);

          const intent = latestMsg.metadata?.intent || 'neutral';
          const leadScore = (contactData as any).lead_score ?? 0;
          const funnelStage = (contactData as any).funnel_stage || 'lead';
          learningsBuffer.push(`[SENT] ${accountName}: ${channel}, contact: ${(contact as any).name || 'unknown'}, intent: ${intent}, score: ${leadScore}, funnel: ${funnelStage}`);
          // Write outcome to Mulch for cross-agent learning
          void mulch.record({
            agent: 'client-reply',
            domain: 'client-reply',
            content: `Reply sent via ${channel}. Intent: ${intent}. Lead score: ${leadScore}. Funnel stage: ${funnelStage}. Account: ${accountName}.`,
            classification: 'observational',
            tags: [intent, funnelStage, channel, 'reply-sent'],
          });
          learningsCollected++;
        } else {
          console.error(`${contactPrefix} Failed to send reply:`, result);
        }
      } catch (error) {
        console.error(`${contactPrefix} Error processing contact:`, error);
      }
    }
  }

  // Process follow-ups that are due
  console.log('\n[FOLLOW-UPS] Checking for due follow-ups...');
  const { data: dueFollowUps } = await supabaseAdmin
    .from('ai_follow_up_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('next_follow_up_at', new Date().toISOString())
    .limit(10);

  if (dueFollowUps && dueFollowUps.length > 0) {
    console.log(`[FOLLOW-UPS] Found ${dueFollowUps.length} due follow-up(s)`);

    for (const followUp of dueFollowUps) {
      try {
        // Check if contact replied since scheduling
        const { data: recentOutbound } = await supabaseAdmin
          .from('messages')
          .select('id')
          .eq('account_id', followUp.account_id)
          .eq('contact_id', followUp.contact_id)
          .eq('direction', 'outbound')
          .eq('type', followUp.channel)
          .gte('created_at', followUp.next_follow_up_at)
          .limit(1);

        if (recentOutbound && recentOutbound.length > 0) {
          // Contact replied, cancel follow-up
          void supabaseAdmin
            .from('ai_follow_up_queue')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', followUp.id);

          console.log(`[FOLLOW-UP] Contact ${followUp.contact_id.substring(0, 8)}... replied, cancelling follow-up`);
          continue;
        }

        // Check max follow-ups (3)
        if (followUp.follow_up_count >= 3) {
          // Max follow-ups reached
          void supabaseAdmin
            .from('ai_follow_up_queue')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', followUp.id);

          console.log(`[FOLLOW-UP] Max follow-ups (3) reached for contact ${followUp.contact_id.substring(0, 8)}..., stopping`);
          learningsBuffer.push(`[MAX_FOLLOWUPS] Contact: ${followUp.contact_id.substring(0, 8)}..., channel: ${followUp.channel}`);
          continue;
        }

        // Send follow-up via generateAndSendAI
        const result = await generateAndSendAI({
          accountId: followUp.account_id,
          contactId: followUp.contact_id,
          channel: followUp.channel,
          isFollowUp: true,
          followUpCount: followUp.follow_up_count + 1
        });

        if (result.success) {
          if (followUp.channel === 'sms') {
            smsSent++;
          } else {
            emailSent++;
          }

          // Update follow-up queue
          const nextFollowUpAt = new Date();
          nextFollowUpAt.setTime(nextFollowUpAt.getTime() + 24 * 60 * 60 * 1000);

          void supabaseAdmin
            .from('ai_follow_up_queue')
            .update({
              follow_up_count: followUp.follow_up_count + 1,
              next_follow_up_at: nextFollowUpAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', followUp.id);

          console.log(`[FOLLOW-UP] Sent follow-up #${followUp.follow_up_count + 1} for contact ${followUp.contact_id.substring(0, 8)}...`);
          learningsCollected++;
        } else {
          console.error(`[FOLLOW-UP] Failed to send follow-up:`, result);
        }

      } catch (error) {
        console.error(`[FOLLOW-UP] Error processing follow-up ${followUp.id.substring(0, 8)}...:`, error);
      }
    }
  }

  // Update learnings file
  if (learningsBuffer.length > 0) {
    console.log('\n[LEARNINGS] Updating shared memory...');
    const learningsPath = path.join(process.cwd(), 'agents/memory/client-reply.md');

    try {
      let currentLearnings = '';
      if (fs.existsSync(learningsPath)) {
        currentLearnings = fs.readFileSync(learningsPath, 'utf-8');
      }

      const now = new Date().toISOString().split('T')[0];
      const section = `## Recent Learnings (${now})\n${learningsBuffer.map(l => `- ${l}`).join('\n')}`;

      // Keep file under 4KB by keeping only recent entries
      let updated = currentLearnings;
      const recentSection = currentLearnings.split('## Recent Learnings')[0];
      updated = recentSection + section;

      if (updated.length > 4096) {
        // Condense: keep header and last 10 learnings
        const lines = updated.split('\n');
        const headerLines = lines.slice(0, 10); // Keep metadata lines
        const learningLines = lines.slice(10).filter(l => l.trim() !== '').slice(-10);
        updated = headerLines.join('\n') + '\n' + learningLines.join('\n');
      }

      fs.writeFileSync(learningsPath, updated, 'utf-8');
      console.log('[LEARNINGS] ✓ Updated agents/memory/client-reply.md');
    } catch (e) {
      console.warn('[WARN] Could not update learnings:', e);
    }
  }

  return { sms: smsSent, email: emailSent, followUpsScheduled, learningsCollected };
}

async function main() {
  console.log('\n===== CLIENT REPLY AGENT =====');
  console.log(`[START] ${new Date().toISOString()}`);

  try {
    // Step 1: Pre-check for enabled accounts and pending messages
    const accountIds = await preCheck();

    if (accountIds.length === 0) {
      console.log('\n[COMPLETE] No work to do. Exiting.');
      process.exit(0);
    }

    // Step 2: Load context (prompts and learnings)
    const context = await loadContext();

    // Step 3: Process pending messages
    const results = await processPendingMessages(accountIds, context);

    // Step 4: Report
    const total = results.sms + results.email;
    console.log(`\n[REPORT] Client replies: processed ${total} messages across ${accountIds.length} account(s).`);
    console.log(`[REPORT] Sent: ${results.sms} SMS, ${results.email} emails. Follow-ups scheduled: ${results.followUpsScheduled}. Learnings: ${results.learningsCollected}.`);
    console.log(`[END] ${new Date().toISOString()}\n`);

    process.exit(0);
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    process.exit(1);
  }
}

main();
