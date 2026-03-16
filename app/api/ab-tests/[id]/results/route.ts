import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/ab-tests/:id/results — get results for a test
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { data: results, error } = await supabaseAdmin
    .from('ab_results')
    .select('*')
    .eq('test_id', params.id)
    .order('variant', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calculate conversion rates
  const enriched = (results || []).map(r => ({
    ...r,
    submit_rate: r.impressions > 0 ? (r.form_submits / r.impressions * 100).toFixed(1) : '0.0',
    booking_rate: r.form_submits > 0 ? (r.bookings / r.form_submits * 100).toFixed(1) : '0.0',
    reply_rate: r.impressions > 0 ? (r.replies / r.impressions * 100).toFixed(1) : '0.0',
  }));

  return NextResponse.json({ results: enriched });
}

// POST /api/ab-tests/:id/results — increment a metric for a variant
// Body: { variant: "A", metric: "impressions" | "form_submits" | "bookings" | "replies" }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { variant, metric } = body;

  if (!variant || !metric) {
    return NextResponse.json({ error: 'variant and metric required' }, { status: 400 });
  }

  const validMetrics = ['impressions', 'form_submits', 'bookings', 'replies'];
  if (!validMetrics.includes(metric)) {
    return NextResponse.json({ error: `Invalid metric. Valid: ${validMetrics.join(', ')}` }, { status: 400 });
  }

  // Atomic increment via RPC or manual read+write
  const { data: existing } = await supabaseAdmin
    .from('ab_results')
    .select('*')
    .eq('test_id', params.id)
    .eq('variant', variant)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('ab_results')
    .update({ [metric]: ((existing as any)[metric] || 0) + 1 })
    .eq('id', (existing as any).id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
