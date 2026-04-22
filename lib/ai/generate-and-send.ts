import { supabaseAdmin } from '@/lib/supabase';
import { callKimi } from '@/lib/kimi/client';
import { buildAIContext, updateSummary } from '@/lib/ai/context';
import { loadReplyMemory, buildMemoryBlock } from '@/lib/ai/reply-memory';
import { twilioClient } from '@/lib/twilio/client';
import { resendClient } from '@/lib/resend/client';
import { updateLeadScore } from '@/lib/ai/lead-scoring';
import mulch from '@/lib/mulch/client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GenerateAIResponseParams {
  accountId: string;
  contactId: string;
  channel: 'sms' | 'email';
  isFollowUp?: boolean;
  followUpCount?: number;
}

interface GenerateAIResponseResult {
  response: string;
  subject?: string;
  model: string;
  tokens_used: number;
  lastInboundIntent?: string;
}

interface SendSMSParams {
  accountId: string;
  to: string;
  message: string;
  contactId?: string;
  userId?: string;
}

interface SendSMSResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
}

interface SendEmailParams {
  accountId: string;
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  contactId?: string;
  userId?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface GenerateAndSendAIParams {
  accountId: string;
  contactId: string;
  channel: 'sms' | 'email';
  isFollowUp?: boolean;
  followUpCount?: number;
}

interface GenerateAndSendAIResult {
  success: boolean;
  message: string;
  subject?: string;
  channel: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve the owner userId for an account.
 * Used when server-side callers (cron, webhooks) don't have a session userId.
 */
async function resolveAccountOwner(accountId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('account_members')
    .select('id')
    .eq('account_id', accountId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// ─── generateAIResponse ─────────────────────────────────────────────────────

/**
 * Core AI response generation logic extracted from api/ai/generate-response.
 * Does NOT perform HTTP request/response handling.
 */
export async function generateAIResponse(
  params: GenerateAIResponseParams
): Promise<GenerateAIResponseResult> {
  const { accountId, contactId, channel, isFollowUp, followUpCount } = params;

  // Load AI config for this account
  const { data: config } = await supabaseAdmin
    .from('ai_agent_configs')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (!config || !config.enabled) {
    throw new Error('AI agent not enabled for this account');
  }

  // Check channel is enabled
  const channels = config.channels || { sms: true, email: true };
  if (channel && !channels[channel]) {
    throw new Error(`AI agent not enabled for ${channel}`);
  }

  // Load contact details
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (!contact) {
    throw new Error('Contact not found');
  }

  // Check per-contact AI toggle
  if (contact.ai_enabled === false) {
    throw new Error('AI disabled for this contact');
  }

  // Load account name for context
  const { data: accountRow } = await supabaseAdmin
    .from('accounts')
    .select('name')
    .eq('id', accountId)
    .maybeSingle();

  // Build memory-efficient context: rolling summary + last 5 messages + calendar slots + last intent + meta attribution
  const { summary, recentMessages, upcomingSlots, availableSlots, lastInboundIntent, fbc, fbp } = await buildAIContext(accountId, contactId);

  // Load local memory: agent patterns + Obsidian contact note + skills
  const memoryCtx = loadReplyMemory(contact.first_name ?? null, contact.last_name ?? null);
  const memoryBlock = buildMemoryBlock(memoryCtx);

  // Build Claude messages array from recent history
  const conversationMessages = recentMessages.map((msg) => ({
    role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  // Use email-specific agent config when channel is email (falls back to SMS config)
  const isEmail = channel === 'email';
  const agentName = (isEmail && config.email_agent_name) ? config.email_agent_name : (config.agent_name || '');
  const agentRepresents = (isEmail && config.email_agent_represents) ? config.email_agent_represents : (config.agent_represents || '');
  const systemPrompt = (isEmail && config.email_system_prompt) ? config.email_system_prompt : (config.system_prompt || '');
  const maxTokens = (isEmail && config.email_max_tokens) ? config.email_max_tokens : (config.max_tokens || 500);

  // Strip em-dashes from injected account content so they don't model bad behavior
  const clean = (s: string) => s.replace(/ [—–] /g, ', ').replace(/[—–]/g, ', ');

  // ── LAYER 1: Base behavior — always applies, sets the floor ──────────────
  // These rules take precedence over everything in the account config below.
  const baseRules = [
    memoryCtx.stopSlopSkill ? `## COPY RULES — apply to every single word you write\n${memoryCtx.stopSlopSkill}` : '',
    memoryCtx.humanizerSkill ? `## WRITING VOICE — non-negotiable\n${memoryCtx.humanizerSkill}` : '',
  ].filter(Boolean).join('\n\n');

  // ── LAYER 2: Identity — who you are for this account ─────────────────────
  // Injected per-account. Does NOT override the base rules above.
  const identityParts = [
    agentName ? `Your name is ${agentName}.` : '',
    agentRepresents ? `You represent ${agentRepresents}.` : '',
    config.business_context ? `Business: ${clean(config.business_context)}` : '',
    accountRow?.name ? `Account: ${accountRow.name}` : '',
    clean(systemPrompt) || 'You are a helpful business assistant responding to customer messages.',
  ].filter(Boolean).join('\n');

  // ── LAYER 3: Lead context — who you're talking to ────────────────────────
  const score = contact.lead_score ?? 0;
  const toneGuide =
    score <= 30 ? 'Warm and curious, no pressure, ask one open question.' :
    score <= 60 ? 'Engaged, qualify timeline and situation, move toward next step.' :
    score <= 80 ? 'Direct and specific, suggest a concrete next step.' :
                  'Clarity and speed, remove all friction.';

  const contactParts = [
    `Contact: ${[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown'} | score=${score}/100 | stage=${contact.funnel_stage || 'lead'} | source=${contact.source || 'unknown'}${contact.company ? ` | company=${contact.company}` : ''}`,
    `Tone for this lead: ${toneGuide}`,
    lastInboundIntent && lastInboundIntent !== 'neutral' ? `Last intent: ${lastInboundIntent}` : '',
    (fbc || fbp) ? `Meta ad lead (${fbc ? 'click tracked' : 'pixel match'}) — treat as warm, not cold.` : '',
    contact.custom_fields && Object.keys(contact.custom_fields as Record<string, string>).length > 0
      ? `Form answers: ${Object.entries(contact.custom_fields as Record<string, string>).filter(([k]) => !k.startsWith('meta_')).map(([k, v]) => `${k}=${v}`).join(' | ')}`
      : '',
    summary ? `Conversation summary: ${summary}` : '',
  ].filter(Boolean).join('\n');

  // ── LAYER 4: Knowledge + context ─────────────────────────────────────────
  const knowledgeParts = [
    config.knowledge_base ? `## Knowledge base\n${clean(config.knowledge_base)}` : '',
    upcomingSlots ? `Contact's booked call: ${upcomingSlots}` : '',
    availableSlots ? `Your available slots: ${availableSlots}. Offer 2 specific options when booking.` : 'Calendar not connected — do not name specific times.',
    memoryBlock !== '(No prior memory for this contact)' ? `## Agent memory\n${memoryBlock}` : '',
  ].filter(Boolean).join('\n\n');

  // ── LAYER 5: Output constraints ───────────────────────────────────────────
  const outputRules = [
    channel === 'sms' ? 'SMS: under 160 chars when possible. One idea. No filler greetings.' : '',
    channel === 'email' ? 'Email: first-name greeting, one-line sign-off, no walls of text.' : '',
    isFollowUp ? `Follow-up #${(followUpCount ?? 0) + 1} of 3 — they have not replied. Brief nudge, specific reference, not pushy.` : '',
    'Reply with the message text only. No labels, no meta-commentary, no quotation marks.',
  ].filter(Boolean).join('\n');

  const systemParts = [baseRules, identityParts, contactParts, knowledgeParts, outputRules]
    .filter(Boolean).join('\n\n---\n\n');

  // Generate via Claude Haiku 4.5 (daemon bridge)
  const kimiResult = await callKimi({
    messages: [
      { role: 'system', content: systemParts },
      ...(conversationMessages.length > 0
        ? conversationMessages
        : [{ role: 'user' as const, content: 'Hello' }]),
    ],
    maxTokens,
  });

  // Hard strip: replace em-dashes and en-dashes before they reach anyone.
  // Spaced em-dash ( — ) becomes a comma; bare em/en-dash becomes a comma.
  const responseText = kimiResult.reply
    .replace(/ [—–] /g, ', ')
    .replace(/[—–]/g, ', ');

  // Generate subject for email if needed
  let subject: string | undefined;
  if (channel === 'email') {
    const lastInbound = recentMessages.find(m => m.direction === 'inbound');
    const lastSubject = (lastInbound as any)?.metadata?.subject;
    if (lastSubject) {
      subject = lastSubject.startsWith('Re:') ? lastSubject : `Re: ${lastSubject}`;
    } else {
      subject = isFollowUp ? 'Following up' : 'Follow-up';
    }
  }

  // Async: update rolling summary (non-blocking)
  updateSummary(accountId, contactId).catch(err =>
    console.error('[generateAIResponse] updateSummary error:', err)
  );

  return {
    response: responseText,
    subject,
    model: 'claude-haiku-4-5-20251001',
    tokens_used: kimiResult.tokensUsed.output,
    lastInboundIntent,
  };
}

// ─── sendSMS ────────────────────────────────────────────────────────────────

/**
 * Core SMS send logic extracted from api/sms/send.
 * Sends via Twilio, saves message to DB, creates activity.
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const { accountId, to, message, contactId, userId } = params;

  if (!twilioClient) {
    return { success: false, error: 'Twilio not configured. Please add credentials to environment variables.' };
  }

  if (!accountId || !to || !message) {
    return { success: false, error: 'Missing required fields' };
  }

  // Get account settings to find selected phone number
  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();

  if (accountError || !account) {
    return { success: false, error: 'Account not found' };
  }

  const twilioPhoneNumber = account.settings?.twilio_phone_number;

  if (!twilioPhoneNumber) {
    return { success: false, error: 'No Twilio phone number selected for this account. Please select one in Settings.' };
  }

  // Send SMS
  const twilioMessage = await twilioClient.messages.create({
    body: message,
    from: twilioPhoneNumber,
    to: to,
  });

  // Save message to messages table
  const { error: messageError } = await supabaseAdmin
    .from('messages')
    .insert({
      account_id: accountId,
      contact_id: contactId || null,
      direction: 'outbound',
      type: 'sms',
      content: message,
      from_address: twilioPhoneNumber,
      to_address: to,
      status: twilioMessage.status,
      external_id: twilioMessage.sid,
    });

  if (messageError) {
    console.error('Error saving message:', messageError);
  }

  // Resolve userId for activity logging if not provided
  const activityUserId = userId || await resolveAccountOwner(accountId);

  // Log the activity
  const { error: activityError } = await supabaseAdmin
    .from('activities')
    .insert({
      account_id: accountId,
      contact_id: contactId || null,
      type: 'sms',
      subject: `SMS to ${to}`,
      description: message,
      completed: true,
      created_by: activityUserId,
    });

  if (activityError) {
    console.error('Error logging SMS activity:', activityError);
  }

  return {
    success: true,
    messageSid: twilioMessage.sid,
    status: twilioMessage.status,
  };
}

// ─── sendEmail ──────────────────────────────────────────────────────────────

/**
 * Core email send logic extracted from api/email/send.
 * Sends via Resend, saves message to DB, creates activity.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { accountId, to, subject, htmlContent, textContent, contactId, userId } = params;

  if (!resendClient) {
    return { success: false, error: 'Resend not configured. Please add RESEND_API_KEY to environment variables.' };
  }

  if (!accountId || !to || !subject || (!htmlContent && !textContent)) {
    return { success: false, error: 'Missing required fields' };
  }

  // Get account settings for from email/name
  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();

  if (accountError || !account) {
    return { success: false, error: 'Account not found' };
  }

  const fromEmail = account.settings?.from_email || 'test@email.ourlimitedoffer.com';
  const fromName = account.settings?.from_name || 'CRM System';

  // Send email
  const { data, error } = await resendClient.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [to],
    subject: subject,
    html: htmlContent || `<p>${textContent}</p>`,
    text: textContent,
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to send email via Resend' };
  }

  // Save message to messages table
  const { error: messageError } = await supabaseAdmin
    .from('messages')
    .insert({
      account_id: accountId,
      contact_id: contactId || null,
      direction: 'outbound',
      type: 'email',
      content: textContent || htmlContent,
      from_address: fromEmail,
      to_address: to,
      status: 'sent',
      external_id: data?.id,
      metadata: { subject },
    });

  if (messageError) {
    console.error('Error saving message:', messageError);
  }

  // Resolve userId for activity logging if not provided
  const activityUserId = userId || await resolveAccountOwner(accountId);

  // Log as activity
  await supabaseAdmin.from('activities').insert({
    account_id: accountId,
    contact_id: contactId || null,
    type: 'email',
    subject: subject,
    description: textContent || (htmlContent ? htmlContent.substring(0, 500) : ''),
    completed: true,
    created_by: activityUserId,
  });

  return {
    success: true,
    messageId: data?.id,
  };
}

// ─── generateAndSendAI ─────────────────────────────────────────────────────

/**
 * Main orchestrator: generates an AI response then sends it via the appropriate channel.
 * Also manages the follow-up queue. Replaces the self-referential fetch chain in ai/send.
 */
export async function generateAndSendAI(
  params: GenerateAndSendAIParams
): Promise<GenerateAndSendAIResult> {
  const { accountId, contactId, channel, isFollowUp, followUpCount } = params;

  if (!accountId || !contactId || !channel) {
    throw new Error('accountId, contactId, and channel required');
  }

  // Deduplication: skip if there's already any outbound reply after the most recent inbound.
  // This catches both AI-generated replies AND manual replies from the account owner,
  // regardless of how long ago they were sent.
  const { data: lastInbound } = await supabaseAdmin
    .from('messages')
    .select('created_at')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .eq('direction', 'inbound')
    .eq('type', channel === 'sms' ? 'sms' : 'email')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastInbound) {
    const { data: replySinceInbound } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('direction', 'outbound')
      .gt('created_at', lastInbound.created_at)
      .limit(1);

    if (replySinceInbound && replySinceInbound.length > 0) {
      console.log(`[generateAndSendAI] Skipping — already replied to latest inbound from ${contactId}`);
      return { success: false, message: 'Skipped: already replied to latest inbound', channel };
    }
  }

  // Step 1: Generate AI response
  const { response: aiMessage, subject, lastInboundIntent } = await generateAIResponse({
    accountId,
    contactId,
    channel,
    isFollowUp,
    followUpCount,
  });

  // Step 2: Load contact info
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (!contact) {
    throw new Error('Contact not found');
  }

  // Step 3: Send via appropriate channel
  if (channel === 'sms') {
    if (!contact.phone) {
      throw new Error('Contact has no phone number');
    }

    const smsResult = await sendSMS({
      accountId,
      to: contact.phone,
      message: aiMessage,
      contactId,
    });

    if (!smsResult.success) {
      throw new Error(smsResult.error || 'Failed to send SMS');
    }
  } else if (channel === 'email') {
    if (!contact.email) {
      throw new Error('Contact has no email');
    }

    const emailResult = await sendEmail({
      accountId,
      to: contact.email,
      subject: subject || 'Follow-up',
      textContent: aiMessage,
      htmlContent: `<p>${aiMessage.replace(/\n/g, '<br>')}</p>`,
      contactId,
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email');
    }
  } else {
    throw new Error('Invalid channel');
  }

  // Step 4: Mark the last outbound message as AI-generated
  const { data: lastMessage } = await supabaseAdmin
    .from('messages')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastMessage) {
    await supabaseAdmin
      .from('messages')
      .update({
        is_ai_generated: true,
        ai_metadata: { model: 'claude-haiku-4-5-20251001', channel },
      })
      .eq('id', lastMessage.id);
  }

  // Step 5: Manage follow-up queue
  // Cancel existing pending follow-up for this contact+channel, then schedule a new one.
  await supabaseAdmin
    .from('ai_follow_up_queue')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .eq('channel', channel)
    .eq('status', 'pending');

  // Only schedule follow-up if this is not already the 3rd follow-up
  const currentFollowUpCount = followUpCount ?? 0;
  if (!isFollowUp || currentFollowUpCount < 3) {
    await supabaseAdmin.from('ai_follow_up_queue').insert({
      account_id: accountId,
      contact_id: contactId,
      channel,
      follow_up_count: isFollowUp ? currentFollowUpCount + 1 : 0,
      next_follow_up_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'pending',
    });
  }

  // Step 6: Funnel tracking + lead score (non-blocking)
  void supabaseAdmin
    .from('funnel_events')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      event_type: 'replied',
      channel,
    });

  // Advance funnel_stage to 'engaged' if contact is still at 'lead'
  void supabaseAdmin
    .from('contacts')
    .update({ funnel_stage: 'engaged' })
    .eq('id', contactId)
    .eq('funnel_stage', 'lead');

  updateLeadScore(contactId).catch(() => {});

  // Write outcome to Mulch for cross-agent learning (non-blocking)
  void mulch.record({
    agent: 'client-reply',
    domain: 'client-reply',
    content: `AI reply sent via ${channel}. Intent: ${lastInboundIntent || 'neutral'}. Lead score: ${contact.lead_score ?? 0}. Funnel: ${contact.funnel_stage || 'lead'}. Follow-up: ${isFollowUp ? `#${(followUpCount ?? 0) + 1}` : 'initial'}.`,
    classification: 'observational',
    tags: [lastInboundIntent || 'neutral', contact.funnel_stage || 'lead', channel, 'reply-sent'],
  }).catch(() => {});

  return {
    success: true,
    message: aiMessage,
    subject,
    channel,
  };
}
