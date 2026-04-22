import { NextRequest, NextResponse } from 'next/server';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/client-overview?accountId=X&days=30
 *
 * Returns all four real analytics data sources for a client account:
 * - Meta ad metrics (spend, leads, CPL, ROAS)
 * - Landing page events (views, CTA clicks, form starts, submits)
 * - AI conversation stats (messages sent, AI generated, inbound replies)
 * - Funnel events (stage-by-stage contact counts)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const days = parseInt(searchParams.get('days') || '30', 10);

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
  const sinceDate = since.slice(0, 10);

  const [metaRes, landingRes, messagesRes, funnelRes] = await Promise.allSettled([
    // ── 1. Meta ad metrics ──────────────────────────────────────────────────
    supabaseAdmin
      .from('meta_ad_metrics')
      .select('spend, impressions, clicks, leads, roas, date, adset_name, campaign_name')
      .eq('account_id', accountId!)
      .gte('date', sinceDate),

    // ── 2. Landing page events ──────────────────────────────────────────────
    supabaseAdmin
      .from('landing_page_events')
      .select('event_type, created_at, landing_page_id')
      .in(
        'landing_page_id',
        (await supabaseAdmin
          .from('landing_pages')
          .select('id')
          .eq('account_id', accountId!)
        ).data?.map((p: { id: string }) => p.id) ?? []
      )
      .gte('created_at', since),

    // ── 3. Messages (AI conversations) ─────────────────────────────────────
    supabaseAdmin
      .from('messages')
      .select('direction, type, is_ai_generated, created_at')
      .eq('account_id', accountId!)
      .gte('created_at', since),

    // ── 4. Funnel events ────────────────────────────────────────────────────
    supabaseAdmin
      .from('funnel_events')
      .select('event_type, contact_id')
      .eq('account_id', accountId!)
      .gte('occurred_at', since),
  ]);

  // ── Meta aggregation ──────────────────────────────────────────────────────
  const metaRows = metaRes.status === 'fulfilled' ? (metaRes.value.data ?? []) : [];
  const meta = {
    spend:       metaRows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.spend) || 0), 0),
    impressions: metaRows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.impressions) || 0), 0),
    clicks:      metaRows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.clicks) || 0), 0),
    leads:       metaRows.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.leads) || 0), 0),
    cpl:         0 as number,
    ctr:         0 as number,
    adsets:      [] as Array<{ name: string; spend: number; leads: number; cpl: number }>,
    hasData:     metaRows.length > 0,
  };
  meta.cpl = meta.leads > 0 ? meta.spend / meta.leads : 0;
  meta.ctr = meta.impressions > 0 ? (meta.clicks / meta.impressions) * 100 : 0;

  // Per-adset rollup
  const adsetMap = new Map<string, { name: string; spend: number; leads: number }>();
  for (const r of metaRows as Record<string, unknown>[]) {
    const name = String(r.adset_name || r.campaign_name || 'Unknown');
    const existing = adsetMap.get(name) ?? { name, spend: 0, leads: 0 };
    existing.spend += Number(r.spend) || 0;
    existing.leads += Number(r.leads) || 0;
    adsetMap.set(name, existing);
  }
  meta.adsets = Array.from(adsetMap.values())
    .map(a => ({ ...a, cpl: a.leads > 0 ? a.spend / a.leads : 0 }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 5);

  // ── Landing page aggregation ──────────────────────────────────────────────
  const lpEvents = landingRes.status === 'fulfilled' ? (landingRes.value.data ?? []) : [];
  const lpCounts: Record<string, number> = {};
  for (const e of lpEvents as Record<string, unknown>[]) {
    const t = String(e.event_type);
    lpCounts[t] = (lpCounts[t] || 0) + 1;
  }
  // Count unique sessions/visitors by distinct landing_page_id + day combos (rough)
  const uniqueSessions = new Set(
    (lpEvents as Record<string, unknown>[]).map(e => `${e.landing_page_id}-${String(e.created_at).slice(0, 10)}`)
  ).size;
  const landingPages = {
    page_views:   lpCounts['page_view']      || lpCounts['cta_click']   || 0,
    cta_clicks:   lpCounts['cta_click']      || 0,
    form_starts:  lpCounts['step_view']      || 0,
    form_submits: lpCounts['form_submit']    || 0,
    conversion:   0 as number,
    sessions:     uniqueSessions,
    hasData:      lpEvents.length > 0,
    eventCounts:  lpCounts,
  };
  // Conversion = form submits / CTA clicks (or sessions if no CTA clicks tracked)
  const denom = landingPages.cta_clicks || landingPages.sessions || 1;
  landingPages.conversion = landingPages.form_submits > 0
    ? Math.round((landingPages.form_submits / denom) * 100)
    : 0;

  // ── Messages aggregation ──────────────────────────────────────────────────
  const msgs = messagesRes.status === 'fulfilled' ? (messagesRes.value.data ?? []) : [];
  const conversations = {
    total:        msgs.length,
    ai_sent:      (msgs as Record<string, unknown>[]).filter(m => m.is_ai_generated).length,
    inbound:      (msgs as Record<string, unknown>[]).filter(m => m.direction === 'inbound').length,
    outbound:     (msgs as Record<string, unknown>[]).filter(m => m.direction === 'outbound').length,
    sms:          (msgs as Record<string, unknown>[]).filter(m => m.type === 'sms').length,
    email:        (msgs as Record<string, unknown>[]).filter(m => m.type === 'email').length,
    reply_rate:   0 as number,
    hasData:      msgs.length > 0,
  };
  // Reply rate = inbound / outbound (how many outbound messages got a reply)
  conversations.reply_rate = conversations.outbound > 0
    ? Math.round((conversations.inbound / conversations.outbound) * 100)
    : 0;

  // ── Funnel aggregation ────────────────────────────────────────────────────
  const funnelEvents = funnelRes.status === 'fulfilled' ? (funnelRes.value.data ?? []) : [];
  const funnelByType: Record<string, Set<string>> = {};
  for (const e of funnelEvents as Record<string, unknown>[]) {
    const t = String(e.event_type);
    if (!funnelByType[t]) funnelByType[t] = new Set();
    funnelByType[t].add(String(e.contact_id));
  }
  const FUNNEL_STAGES = [
    { key: 'form_submit',           label: 'Form submitted' },
    { key: 'replied',               label: 'Replied' },
    { key: 'booking_page_viewed',   label: 'Booking page viewed' },
    { key: 'booking_confirmed',     label: 'Booking confirmed' },
    { key: 'showed',                label: 'Showed' },
  ];
  const funnel = {
    stages: FUNNEL_STAGES.map(s => ({
      label: s.label,
      count: funnelByType[s.key]?.size ?? 0,
    })),
    hasData: funnelEvents.length > 0,
  };

  return NextResponse.json({
    accountId,
    days,
    generatedAt: new Date().toISOString(),
    meta,
    landingPages,
    conversations,
    funnel,
  });
}
