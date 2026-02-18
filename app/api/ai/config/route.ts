import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/ai/config?accountId=...
export async function GET(request: NextRequest) {
  try {
    const accountId = new URL(request.url).searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_agent_configs')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error || !data) {
      // Return default config if none exists
      return NextResponse.json({
        config: {
          account_id: accountId,
          enabled: false,
          mode: 'suggest',
          system_prompt: '',
          tone: 'professional',
          max_tokens: 500,
          channels: { sms: true, email: true },
          business_context: '',
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
    const { accountId, enabled, mode, system_prompt, tone, max_tokens, channels, business_context } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    // Upsert config
    const { data, error } = await supabaseAdmin
      .from('ai_agent_configs')
      .upsert({
        account_id: accountId,
        enabled: enabled ?? false,
        mode: mode || 'suggest',
        system_prompt: system_prompt || '',
        tone: tone || 'professional',
        max_tokens: max_tokens || 500,
        channels: channels || { sms: true, email: true },
        business_context: business_context || '',
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
