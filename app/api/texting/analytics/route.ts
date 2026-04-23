import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/texting/analytics
// Returns script-level stats, daily breakdown, and pending variant proposals.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Script-level aggregates from view
  const { data: scripts, error: scriptsErr } = await supabaseAdmin
    .from('text_script_stats')
    .select('*')
    .order('script_id', { ascending: true });

  if (scriptsErr) {
    return NextResponse.json({ error: scriptsErr.message }, { status: 500 });
  }

  // Daily breakdown for last 7 days from view
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const { data: daily, error: dailyErr } = await supabaseAdmin
    .from('text_script_daily')
    .select('*')
    .gte('day', sevenDaysAgo)
    .order('day', { ascending: false });

  if (dailyErr) {
    return NextResponse.json({ error: dailyErr.message }, { status: 500 });
  }

  // Pending variant proposals awaiting approval
  const { data: pending_variants, error: variantsErr } = await supabaseAdmin
    .from('text_script_variants')
    .select('id, script_id, message_type, body, performance, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (variantsErr) {
    return NextResponse.json({ error: variantsErr.message }, { status: 500 });
  }

  // Normalise view column names to camelCase for the response
  const normalisedScripts = (scripts || []).map((r: Record<string, unknown>) => ({
    scriptId:     r.script_id,
    totalSent:    r.total_sent,
    replies:      r.replies,
    optedOut:     r.opted_out,
    bookingIntent: r.booking_intent,
    replyRate:    r.reply_rate,
    bookingRate:  r.booking_rate,
    optOutRate:   r.opt_out_rate,
  }));

  const normalisedDaily = (daily || []).map((r: Record<string, unknown>) => ({
    day:          r.day,
    scriptId:     r.script_id,
    sent:         r.sent,
    replies:      r.replies,
    bookingIntent: r.booking_intent,
  }));

  const normalisedVariants = (pending_variants || []).map((r: Record<string, unknown>) => ({
    id:          r.id,
    scriptId:    r.script_id,
    messageType: r.message_type,
    body:        r.body,
    performance: r.performance,
    createdAt:   r.created_at,
  }));

  return NextResponse.json({
    scripts:          normalisedScripts,
    daily:            normalisedDaily,
    pending_variants: normalisedVariants,
  });
}

// PATCH /api/texting/analytics
// Body: { variantId: string, action: 'approve' | 'reject' }
// approve → sets status='approved', approved_at=now() (script-improver cron applies it to message-scripts.json)
// reject  → sets status='rejected'
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: { variantId?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { variantId, action } = body;

  if (!variantId || !action) {
    return NextResponse.json({ error: 'variantId and action are required' }, { status: 400 });
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
  }

  const update =
    action === 'approve'
      ? { status: 'approved', approved_at: new Date().toISOString() }
      : { status: 'rejected' };

  const { error } = await supabaseAdmin
    .from('text_script_variants')
    .update(update)
    .eq('id', variantId)
    .eq('status', 'pending'); // guard: only allow transitions from pending state

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, variantId, action });
}
