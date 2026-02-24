import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/ai/config?accountId=...
export async function GET(request: NextRequest) {
  try {
    const accountId = new URL(request.url).searchParams.get('accountId');

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    const { data, error } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        config: {
          account_id: accountId,
          enabled: false,
          mode: 'suggest',
          system_prompt: '',
          agent_name: '',
          agent_represents: '',
          tone: 'professional',
          max_tokens: 500,
          channels: { sms: true, email: true },
          business_context: '',
          email_agent_name: '',
          email_agent_represents: '',
          email_system_prompt: '',
          email_max_tokens: 500,
        }
      });
    }

    return NextResponse.json({ config: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/ai/config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId, enabled, mode, system_prompt, agent_name, agent_represents, tone, max_tokens, channels, business_context,
      email_agent_name, email_agent_represents, email_system_prompt, email_max_tokens,
    } = body;

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    // Upsert config
    const { data, error } = await supabaseAdmin
      .from('ai_agent_configs')
      .upsert({
        account_id: accountId,
        enabled: enabled ?? false,
        mode: mode || 'suggest',
        system_prompt: system_prompt || '',
        agent_name: agent_name || '',
        agent_represents: agent_represents || '',
        tone: tone || 'professional',
        max_tokens: max_tokens || 500,
        channels: channels || { sms: true, email: true },
        business_context: business_context || '',
        email_agent_name: email_agent_name || '',
        email_agent_represents: email_agent_represents || '',
        email_system_prompt: email_system_prompt || '',
        email_max_tokens: email_max_tokens || 500,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving AI config:', error);
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
