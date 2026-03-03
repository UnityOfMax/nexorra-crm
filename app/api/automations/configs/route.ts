import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/automations/configs?accountId=xxx&automationId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const automationId = searchParams.get('automationId');

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  if (!accountId || !automationId) {
    return NextResponse.json({ error: 'accountId and automationId required' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('automation_configs')
    .select('templates, is_enabled')
    .eq('account_id', accountId)
    .eq('automation_id', automationId)
    .maybeSingle();

  return NextResponse.json({
    templates: data?.templates ?? null,
    is_enabled: data?.is_enabled ?? true,
  });
}

// PUT /api/automations/configs — save custom templates
export async function PUT(request: NextRequest) {
  try {
    const { accountId, automationId, templates, is_enabled } = await request.json();

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    if (!accountId || !automationId) {
      return NextResponse.json({ error: 'accountId and automationId required' }, { status: 400 });
    }

    // Build upsert payload — only include fields that were provided
    const payload: Record<string, any> = {
      account_id: accountId,
      automation_id: automationId,
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(templates)) payload.templates = templates;
    if (typeof is_enabled === 'boolean') payload.is_enabled = is_enabled;

    const { error } = await supabaseAdmin
      .from('automation_configs')
      .upsert(payload, { onConflict: 'account_id,automation_id' });

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

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  if (!accountId || !automationId) {
    return NextResponse.json({ error: 'accountId and automationId required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('automation_configs')
    .delete()
    .eq('account_id', accountId)
    .eq('automation_id', automationId);

  if (error) return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
