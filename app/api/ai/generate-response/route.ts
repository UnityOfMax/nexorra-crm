import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { anthropicClient } from '@/lib/ai/client';
import type Anthropic from '@anthropic-ai/sdk';
import { buildAIContext, updateSummary } from '@/lib/ai/context';

// POST /api/ai/generate-response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, contactId, channel, isFollowUp, followUpCount } = body;

    if (!accountId || !contactId) {
      return NextResponse.json({ error: 'accountId and contactId required' }, { status: 400 });
    }

    // Load AI config for this account
    const { data: config } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!config || !config.enabled) {
      return NextResponse.json({ error: 'AI agent not enabled for this account' }, { status: 400 });
    }

    // Check channel is enabled
    const channels = config.channels || { sms: true, email: true };
    if (channel && !channels[channel]) {
      return NextResponse.json({ error: `AI agent not enabled for ${channel}` }, { status: 400 });
    }

    // Load contact details
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check per-contact AI toggle
    if (contact.ai_enabled === false) {
      return NextResponse.json({ error: 'AI disabled for this contact' }, { status: 400 });
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
      role: msg.direction === 'inbound' ? 'user' as const : 'assistant' as const,
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

    // Call Anthropic API
    if (!anthropicClient) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

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
      console.error('[generate-response] updateSummary error:', err)
    );

    return NextResponse.json({
      response: responseText,
      subject,
      model: 'claude-haiku-4-5-20251001',
      tokens_used: aiResponse.usage?.output_tokens || 0,
    });
  } catch (error: any) {
    console.error('AI generate-response error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
