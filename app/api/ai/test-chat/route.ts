import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateText } from '@/lib/ai/daemon-client';

// POST /api/ai/test-chat
// Simulates the AI agent responding to a message. No contact DB lookup — uses
// the provided conversation history directly. Useful for testing the AI config.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, messages, leadName, channel = 'sms' } = body;
    // messages: Array<{ role: 'user' | 'assistant'; content: string }>
    // channel: 'sms' | 'email'

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    const { data: config } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'No AI config found for this account' }, { status: 404 });
    }

    const isEmail = channel === 'email';
    const agentName = (isEmail && config.email_agent_name) ? config.email_agent_name : (config.agent_name || 'Assistant');
    const agentRepresents = (isEmail && config.email_agent_represents) ? config.email_agent_represents : (config.agent_represents || '');
    const systemPrompt = (isEmail && config.email_system_prompt) ? config.email_system_prompt : (config.system_prompt || '');
    const maxTokens = (isEmail && config.email_max_tokens) ? config.email_max_tokens : (config.max_tokens || 300);

    const systemParts = [
      systemPrompt || 'You are a helpful business assistant.',
      agentName ? `Your name is ${agentName}.` : '',
      agentRepresents ? `You work on behalf of ${agentRepresents}.` : '',
      config.business_context ? `Business context: ${config.business_context}` : '',
      isEmail
        ? `You are emailing with ${leadName || 'a lead'} (this is a test simulation). Format responses as email — brief greeting, concise body, sign-off.`
        : `You are texting with ${leadName || 'a lead'} (this is a test simulation). Keep responses concise and suitable for SMS.`,
      'Respond only with the message text. Do not include any meta-commentary or labels.',
    ].filter(Boolean).join('\n\n');

    const aiResult = await generateText({
      model: 'claude-haiku-4-5-20251001',
      system: systemParts,
      messages: messages?.length > 0
        ? messages
        : [{ role: 'user', content: 'Hello' }],
      maxTokens,
    });

    return NextResponse.json({
      response: aiResult.text,
      model: 'claude-haiku-4-5-20251001',
      tokens_used: aiResult.usage.output,
    });
  } catch (error: any) {
    console.error('AI test-chat error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
