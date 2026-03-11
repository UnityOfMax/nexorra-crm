#!/usr/bin/env npx tsx

/**
 * Client Reply Agent
 * Process inbound SMS and email for all client sub-accounts
 * Uses Kimi K2.5 for reply generation, sends via Twilio (SMS) and Resend (email)
 */

import { supabaseAdmin } from '@/lib/supabase';
import { generateKimiReply } from '@/lib/kimi/generate-reply';
import { sendSMS, sendEmail } from '@/lib/ai/generate-and-send';

// Load environment variables
require('dotenv').config({ path: '.env.local' });

interface AIConfig {
  account_id: string;
  enabled: boolean;
  system_prompt: string;
  agent_name: string;
  agent_represents: string;
  business_context: string;
  tone: string;
  max_tokens: number;
  channels: { sms: boolean; email: boolean };
  email_system_prompt: string;
  email_agent_name: string;
  email_agent_represents: string;
  email_max_tokens: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  ai_enabled: boolean;
  custom_fields: Record<string, any>;
  status: string;
}

interface Message {
  id: string;
  contact_id: string;
  account_id: string;
  type: 'sms' | 'email';
  content: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
  is_ai_generated: boolean;
}

async function processClientReplies() {
  console.log('[Client Reply Agent] Starting...\n');
  console.time('Total');

  // Step 1: Find enabled AI accounts
  console.time('Step1-LoadConfigs');
  const { data: enabledConfigs, error: configError } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('account_id')
    .eq('enabled', true);
  console.timeEnd('Step1-LoadConfigs');

  if (configError || !enabledConfigs || enabledConfigs.length === 0) {
    console.log('[Pre-Check] No enabled AI accounts found. Exiting.');
    return { processed: 0, sent: { sms: 0, email: 0 }, followUps: 0 };
  }

  const enabledAccounts = enabledConfigs.map((c: any) => c.account_id);
  console.log(`[Pre-Check] Found ${enabledAccounts.length} enabled AI account(s)`);

  let totalProcessed = 0;
  let totalSent = { sms: 0, email: 0 };
  let totalFollowUps = 0;

  // Step 2: For each enabled account, check for pending inbound messages
  for (const accountId of enabledAccounts) {
    console.log(`\n[Account: ${accountId}]`);

    // Get pending inbound messages (no AI-generated reply yet)
    // is_ai_generated can be null or false (not yet replied)
    const { data: pendingMessages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('id, contact_id, type, content, created_at, direction')
      .eq('account_id', accountId)
      .eq('direction', 'inbound')
      .or('is_ai_generated.is.null,is_ai_generated.eq.false')
      .order('created_at', { ascending: true })
      .limit(10);

    if (msgError || !pendingMessages || pendingMessages.length === 0) {
      console.log('  No pending messages');
      continue;
    }

    console.log(`  Found ${pendingMessages.length} pending message(s)`);

    // Load AI config for this account
    const { data: configs, error: cfgError } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (cfgError || !configs) {
      console.log('  Error loading AI config, skipping account');
      continue;
    }

    const config: AIConfig = configs;

    // Process each message
    for (const message of pendingMessages as Message[]) {
      const messageId = message.id.substring(0, 8);
      const contactId = message.contact_id;
      const channel = message.type;

      console.log(`  \n  [Message ${messageId}] Type: ${channel}`);

      // Check if contact exists and has AI enabled
      const { data: contact, error: contactError } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('account_id', accountId)
        .single();

      if (contactError) {
        console.log(`    Contact not found, skipping`);
        continue;
      }

      const c: Contact = contact;
      if (!c.ai_enabled) {
        console.log(`    Contact AI disabled, skipping`);
        continue;
      }

      // Check channel is enabled
      const channelEnabled = channel === 'sms' ? config.channels.sms : config.channels.email;
      if (!channelEnabled) {
        console.log(`    Channel disabled in config, skipping`);
        continue;
      }

      // Load conversation history
      const { data: history, error: historyError } = await supabaseAdmin
        .from('messages')
        .select('direction, content, type, created_at')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true })
        .limit(10);

      if (historyError) {
        console.log(`    Error loading history, skipping`);
        continue;
      }

      // Convert history to Kimi conversation format
      const conversationHistory = history.map((h: any) => ({
        role: (h.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: h.content,
      }));

      // Use email config if channel is email, otherwise SMS config
      const systemPrompt = channel === 'email' && config.email_system_prompt
        ? config.email_system_prompt
        : config.system_prompt;

      const agentName = channel === 'email' && config.email_agent_name
        ? config.email_agent_name
        : config.agent_name;

      const maxTokens = channel === 'email' ? config.email_max_tokens : config.max_tokens;

      // Build contact context
      const contactContext = `
Contact: ${c.name || 'Unknown'}
Phone: ${c.phone || 'N/A'}
Email: ${c.email || 'N/A'}
Status: ${c.status || 'active'}
${Object.keys(c.custom_fields || {}).length > 0 ? `Fields: ${JSON.stringify(c.custom_fields)}` : ''}
      `.trim();

      // Build full system prompt with channel-specific guidance
      let fullSystemPrompt = systemPrompt;
      if (channel === 'sms') {
        fullSystemPrompt += `\n\nChannel: SMS. Keep replies concise (under 160 characters when possible). Natural texting rhythm.`;
      } else if (channel === 'email') {
        fullSystemPrompt += `\n\nChannel: Email. Use appropriate greeting and sign-off. Professional formatting.`;
      }

      try {
        // Generate reply via Haiku
        console.log(`    Generating reply via Haiku...`);
        const result = await generateKimiReply({
          systemPrompt: fullSystemPrompt,
          conversationHistory,
          contactContext,
          maxTokens,
          temperature: 0.7,
        });

        const replyText = result.reply;
        console.log(`    Generated: "${replyText.substring(0, 50)}..."`);

        // Send reply
        let sentOutcome: any;
        try {
          if (channel === 'sms') {
            console.log(`    Sending SMS...`);
            sentOutcome = await sendSMS({
              accountId,
              to: c.phone,
              message: replyText,
              contactId,
            });
            if (sentOutcome.success) {
              totalSent.sms++;
              console.log(`    ✓ SMS sent`);
            } else {
              console.log(`    ✗ SMS failed: ${sentOutcome.error}`);
            }
          } else if (channel === 'email') {
            console.log(`    Sending email...`);
            // Build email with proper subject and formatting
            const subject = `Re: Your Inquiry`;
            const htmlContent = `<p>${replyText.replace(/\n/g, '</p><p>')}</p><p>—<br>${agentName || 'Support Team'}</p>`;
            sentOutcome = await sendEmail({
              accountId,
              to: c.email,
              subject,
              textContent: replyText,
              htmlContent,
              contactId,
            });
            if (sentOutcome.success) {
              totalSent.email++;
              console.log(`    ✓ Email sent`);
            } else {
              console.log(`    ✗ Email failed: ${sentOutcome.error}`);
            }
          }
        } catch (sendError: any) {
          console.log(`    ✗ Send error: ${sendError.message}`);
          sentOutcome = null;
        }

        if (sentOutcome?.success) {
          // Mark the inbound message as AI-generated
          const { error: markError } = await supabaseAdmin
            .from('messages')
            .update({
              is_ai_generated: true,
              ai_metadata: { model: 'claude-haiku-4-5-20251001', channel, agentName },
            })
            .eq('id', message.id);

          if (!markError) {
            console.log(`    ✓ Marked as AI-generated`);
          }

          // Manage follow-up queue
          // Cancel any existing pending follow-ups
          await supabaseAdmin
            .from('ai_follow_up_queue')
            .update({ status: 'cancelled' })
            .eq('account_id', accountId)
            .eq('contact_id', contactId)
            .eq('channel', channel)
            .eq('status', 'pending');

          // Schedule new follow-up for 24 hours from now
          const nextFollowUp = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabaseAdmin
            .from('ai_follow_up_queue')
            .insert({
              account_id: accountId,
              contact_id: contactId,
              channel,
              follow_up_count: 0,
              next_follow_up_at: nextFollowUp,
              status: 'pending',
            });

          totalFollowUps++;
          console.log(`    ✓ Follow-up scheduled (24h)`);
          totalProcessed++;
        }
      } catch (error: any) {
        console.log(`    ✗ Error: ${error.message}`);
      }
    }
  }

  // Step 3: Process pending follow-ups
  console.log(`\n[Follow-ups]`);
  const now = new Date().toISOString();
  const { data: pendingFollowUps, error: followUpError } = await supabaseAdmin
    .from('ai_follow_up_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('next_follow_up_at', now)
    .limit(10);

  if (followUpError || !pendingFollowUps || pendingFollowUps.length === 0) {
    console.log('  No follow-ups due');
  } else {
    console.log(`  Processing ${pendingFollowUps.length} follow-up(s)`);
    // TODO: Implement follow-up processing (similar to above)
  }

  // Step 4: Update learnings
  console.log(`\n[Learnings]`);
  // TODO: Update agents/memory/client-reply.md with outcomes
  console.log('  (Learnings update would go here)');

  // Report
  console.log(`\n=== REPORT ===`);
  console.log(`Client replies: processed ${totalProcessed} messages across ${enabledAccounts.length} account(s).`);
  console.log(`Sent: ${totalSent.sms} SMS, ${totalSent.email} emails.`);
  console.log(`Follow-ups scheduled: ${totalFollowUps}.`);

  return {
    processed: totalProcessed,
    sent: totalSent,
    followUps: totalFollowUps,
  };
}

// Run
processClientReplies()
  .then((result) => {
    console.log(`\n[Done]`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Error]', error);
    process.exit(1);
  });
