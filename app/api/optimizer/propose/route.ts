import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/optimizer/propose
 *
 * Inserts a new optimizer_action proposal (applied: false, approved: false).
 * Called by the campaign-optimizer agent. Auth: CRON_SECRET.
 *
 * Idempotent: if a pending (not rejected, not applied) action of the same
 * type + target_id already exists, returns 200 with existing=true instead of inserting.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { account_id, action_type, target_id, target_name, reason, before_state, after_state } = body;

  if (!account_id || !action_type || !reason) {
    return NextResponse.json(
      { error: 'account_id, action_type, and reason are required' },
      { status: 400 }
    );
  }

  // Idempotency check: skip if identical pending action exists
  const { data: existing } = await supabaseAdmin
    .from('optimizer_actions')
    .select('id')
    .eq('account_id', account_id)
    .eq('action_type', action_type)
    .eq('target_id', target_id || '')
    .eq('applied', false)
    .eq('rejected', false)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, existing: true, id: existing.id });
  }

  const { data, error } = await supabaseAdmin
    .from('optimizer_actions')
    .insert({
      account_id,
      action_type,
      target_id: target_id || null,
      target_name: target_name || null,
      reason,
      before_state: before_state || null,
      after_state: after_state || null,
      applied: false,
      approved: false,
      rejected: false,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, existing: false, id: data.id });
}
