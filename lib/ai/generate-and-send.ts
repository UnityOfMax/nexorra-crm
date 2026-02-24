import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase';
import { anthropicClient } from '@/lib/ai/client';
import { buildAIContext, updateSummary } from '@/lib/ai/context';
import { twilioClient } from '@/lib/twilio/client';
import { resendClient } from '@/lib/resend/client';

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

  if (!anthropicClient) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

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

  // Build memory-efficient context: rolling summary + last 5 messages + contact calendar slots
  const { summary, recentMessages, upcomingSlots } = await buildAIContext(accountId, contactId);

  // Build Claude messages array from recent history
  const conversationMessages: Anthropic.MessageParam[] = recentMessages.map((msg) => ({
    role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  // Build system prompt
  const toneInstructions: Record<string, string> = {
    professional: 'Maintain a professional and courteous tone.',
    casual: 'Use a casual, friendly tone as if talking to a friend.',
    friendly: 'Be warm, approachable, and helpful.',
    formal: 'Use formal language with proper business etiquette.',
  };

  // Use email-specific agent config when channel is email (falls back to SMS config)
  const isEmail = channel === 'email';
  const agentName = (isEmail && config.email_agent_name) ? config.email_agent_name : (config.agent_name || '');
  const agentRepresents = (isEmail && config.email_agent_represents) ? config.email_agent_represents : (config.agent_represents || '');
  const systemPrompt = (isEmail && config.email_system_prompt) ? config.email_system_prompt : (config.system_prompt || '');
  const maxTokens = (isEmail && config.email_max_tokens) ? config.email_max_tokens : (config.max_tokens || 500);

  const systemParts = [
    systemPrompt || 'You are a helpful business assistant responding to customer messages.',
    toneInstructions[config.tone] || toneInstructions.professional,
    agentName ? `Your name is ${agentName}.` : '',
    agentRepresents ? `You work on behalf of ${agentRepresents}.` : '',
    config.business_context ? `Business context: ${config.business_context}` : '',
    accountRow?.name ? `Account/business name: ${accountRow.name}` : '',
    // Compact contact snapshot
    `Contact: ${[contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unknown'} | Phone: ${contact.phone || 'N/A'} | Email: ${contact.email || 'N/A'} | Status: ${contact.status}`,
    // Form answers (from landing page lead capture) compressed into one line
    contact.custom_fields && Object.keys(contact.custom_fields).length > 0
      ? `Lead form answers: ${Object.entries(contact.custom_fields as Record<string, string>).map(([k, v]) => `${k}=${v}`).join(' | ')}`
      : '',
    summary ? `Conversation notes (compressed): ${summary}` : '',
    upcomingSlots
      ? `This contact's booked call: ${upcomingSlots}`
      : '',
    channel === 'sms' ? 'Keep responses concise and suitable for SMS (under 160 characters when possible).' : '',
    channel === 'email' ? 'Format the response appropriately for email. You may include a greeting and sign-off.' : '',
    isFollowUp
      ? `This is a follow-up message because the contact hasn't replied yet. Keep it brief and friendly, reference something from the conversation summary if available, and gently nudge without being pushy. This is follow-up #${(followUpCount ?? 0) + 1} of 3.`
      : '',
    'Respond only with the message text. Do not include any meta-commentary or labels.',
  ].filter(Boolean).join('\n\n');

  // Call Anthropic API using the singleton client
  const aiResponse = await anthropicClient.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: systemParts,
    messages: conversationMessages.length > 0 ? conversationMessages : [
      { role: 'user', content: 'Hello' },
    ],
  });

  const responseText = aiResponse.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

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
    tokens_used: aiResponse.usage?.output_tokens || 0,
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

  // Step 1: Generate AI response
  const { response: aiMessage, subject } = await generateAIResponse({
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
        ai_metadata: { model: 'claude-sonnet-4-6', channel },
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

  return {
    success: true,
    message: aiMessage,
    subject,
    channel,
  };
}
