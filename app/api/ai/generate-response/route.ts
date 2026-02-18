import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/ai/generate-response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, contactId, channel } = body;

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

    // Load recent message history (last 20)
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(20);

    const reversedMessages = (messages || []).reverse();

    // Build conversation for Claude
    const conversationMessages: Anthropic.MessageParam[] = reversedMessages.map((msg) => ({
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

    const systemParts = [
      config.system_prompt || 'You are a helpful business assistant responding to customer messages.',
      toneInstructions[config.tone] || toneInstructions.professional,
      config.business_context ? `Business context: ${config.business_context}` : '',
      `Contact info: ${contact.first_name || ''} ${contact.last_name || ''}, Email: ${contact.email || 'N/A'}, Phone: ${contact.phone || 'N/A'}, Status: ${contact.status}`,
      channel === 'sms' ? 'Keep responses concise and suitable for SMS (under 160 characters when possible).' : '',
      channel === 'email' ? 'Format the response appropriately for email. You may include a greeting and sign-off.' : '',
      'Respond only with the message text. Do not include any meta-commentary or labels.',
    ].filter(Boolean).join('\n\n');

    // Call Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: config.max_tokens || 500,
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
      const lastInbound = reversedMessages.find(m => m.direction === 'inbound');
      const lastSubject = lastInbound?.metadata?.subject;
      if (lastSubject) {
        subject = lastSubject.startsWith('Re:') ? lastSubject : `Re: ${lastSubject}`;
      } else {
        subject = 'Follow-up';
      }
    }

    return NextResponse.json({
      response: responseText,
      subject,
      model: 'claude-sonnet-4-20250514',
      tokens_used: aiResponse.usage?.output_tokens || 0,
    });
  } catch (error: any) {
    console.error('AI generate-response error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
