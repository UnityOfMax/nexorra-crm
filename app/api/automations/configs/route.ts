import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/automations/configs?accountId=xxx&automationId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const automationId = searchParams.get('automationId');

  if (!accountId || !automationId) {
    return NextResponse.json({ error: 'accountId and automationId required' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('automation_configs')
    .select('templates')
    .eq('account_id', accountId)
    .eq('automation_id', automationId)
    .maybeSingle();

  return NextResponse.json({ templates: data?.templates ?? null });
}

// PUT /api/automations/configs — save custom templates
export async function PUT(request: NextRequest) {
  try {
    const { accountId, automationId, templates } = await request.json();

    if (!accountId || !automationId || !Array.isArray(templates)) {
      return NextResponse.json({ error: 'accountId, automationId, templates required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('automation_configs')
      .upsert(
        { account_id: accountId, automation_id: automationId, templates, updated_at: new Date().toISOString() },
        { onConflict: 'account_id,automation_id' }
      );

    if (error) {
      console.error('Error saving automation config:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/automations/configs?accountId=xxx&automationId=xxx — reset to defaults
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const automationId = searchParams.get('automationId');

  if (!accountId || !automationId) {
    return NextResponse.json({ error: 'accountId and automationId required' }, { status: 400 });
  }

  await supabaseAdmin
    .from('automation_configs')
    .delete()
    .eq('account_id', accountId)
    .eq('automation_id', automationId);

  return NextResponse.json({ ok: true });
}
