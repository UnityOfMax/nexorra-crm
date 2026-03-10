#!/usr/bin/env npx tsx

import { supabaseAdmin } from '@/lib/supabase';
import { generateKimiReply } from '@/lib/kimi/generate-reply';
import { sendSMS } from '@/lib/ai/generate-and-send';

require('dotenv').config({ path: '.env.local' });

async function test() {
  console.log('[Test] Starting...\n');

  // Hard-coded account ID with test messages
  const accountId = '6924dcc7-58ce-479b-a9d5-f88ef4ca3ebe';

  // Load AI config
  console.log('[1] Loading AI config...');
  const { data: config } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (!config) {
    console.log('No config found');
    return;
  }

  console.log(`  Agent: ${config.agent_name}`);
  console.log(`  Enabled: ${config.enabled}`);

  // Get first pending message
  console.log('[2] Finding pending messages...');
  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('id, contact_id, content, type')
    .eq('account_id', accountId)
    .eq('direction', 'inbound')
    .or('is_ai_generated.is.null,is_ai_generated.eq.false')
    .order('created_at', { ascending: true })
    .limit(1);

  if (!messages || messages.length === 0) {
    console.log('  No pending messages');
    return;
  }

  const message = messages[0] as any;
  console.log(`  Found: "${message.content}"`);

  // Load contact
  console.log('[3] Loading contact...');
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', message.contact_id)
    .single();

  if (!contact) {
    console.log('  No contact record found (this is OK for test)');
  } else {
    console.log(`  Contact: ${contact.name || 'Unknown'}`);
  }

  // Load conversation history
  console.log('[4] Loading history...');
  const { data: history } = await supabaseAdmin
    .from('messages')
    .select('direction, content')
    .eq('account_id', accountId)
    .eq('contact_id', message.contact_id)
    .order('created_at', { ascending: true })
    .limit(10);

  const conversationHistory = (history || []).map((h: any) => ({
    role: (h.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: h.content,
  }));

  console.log(`  History: ${conversationHistory.length} messages`);

  // Generate reply
  console.log('[5] Generating reply with Kimi...');
  try {
    const result = await generateKimiReply({
      systemPrompt: config.system_prompt,
      conversationHistory,
      maxTokens: config.max_tokens,
      temperature: 0.7,
    });

    console.log(`  Generated: "${result.reply}"`);
    console.log(`  Tokens: ${result.tokensUsed.total}`);

    // Try to send SMS (requires Twilio)
    if (contact?.phone && message.type === 'sms') {
      console.log('[6] Sending SMS...');
      const smsResult = await sendSMS({
        accountId,
        to: contact.phone,
        message: result.reply,
        contactId: message.contact_id,
      });
      console.log(`  Result: ${smsResult.success ? 'Sent' : smsResult.error}`);
    } else {
      console.log('[6] SMS send skipped (no phone or not SMS)');
    }

    // Mark as AI-generated
    console.log('[7] Marking message...');
    await supabaseAdmin
      .from('messages')
      .update({ is_ai_generated: true })
      .eq('id', message.id);
    console.log('  ✓ Marked as AI-generated');
  } catch (error: any) {
    console.error(`  Error: ${error.message}`);
  }

  console.log('\n[Done]');
}

test().then(() => process.exit(0)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
