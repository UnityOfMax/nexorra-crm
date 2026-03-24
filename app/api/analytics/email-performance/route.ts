import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7');
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  // 1. Campaign metrics (from email_campaign_metrics)
  const { data: campaignMetrics } = await supabaseAdmin
    .from('email_campaign_metrics')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: false });

  // 2. Copy variant performance (from email_copy_variants)
  const { data: variants } = await supabaseAdmin
    .from('email_copy_variants')
    .select('id, name, category, times_sent, times_replied, times_booked, times_ghosted, booking_rate, reply_rate, is_active')
    .eq('is_active', true)
    .order('booking_rate', { ascending: false });

  // 3. Landing page funnel (from landing_page_events, aggregated)
  const { data: pageEvents } = await supabaseAdmin
    .from('landing_page_events')
    .select('event_type, lead_id')
    .gte('created_at', `${since}T00:00:00Z`);

  const funnel: Record<string, number> = {};
  const uniqueLeads: Record<string, Set<string>> = {};
  for (const event of (pageEvents || [])) {
    funnel[event.event_type] = (funnel[event.event_type] || 0) + 1;
    if (event.lead_id) {
      if (!uniqueLeads[event.event_type]) uniqueLeads[event.event_type] = new Set();
      uniqueLeads[event.event_type].add(event.lead_id);
    }
  }

  const landingPageFunnel = {
    page_views: funnel['page_view'] || 0,
    video_plays: funnel['video_play'] || 0,
    video_completed: funnel['video_100'] || 0,
    calendly_clicks: funnel['calendly_click'] || 0,
    bookings: funnel['booking_confirmed'] || 0,
    unique_visitors: uniqueLeads['page_view']?.size || 0,
  };

  // 4. Conversation outcomes (from lead_conversations)
  const { data: outcomes } = await supabaseAdmin
    .from('lead_conversations')
    .select('status')
    .gte('created_at', `${since}T00:00:00Z`);

  const outcomeCounts: Record<string, number> = {};
  for (const o of (outcomes || [])) {
    outcomeCounts[o.status] = (outcomeCounts[o.status] || 0) + 1;
  }

  // 5. Totals
  const totals = (campaignMetrics || []).reduce((acc, m) => ({
    sent: acc.sent + (m.sent || 0),
    opened: acc.opened + (m.opened || 0),
    replied: acc.replied + (m.replied || 0),
    bounced: acc.bounced + (m.bounced || 0),
  }), { sent: 0, opened: 0, replied: 0, bounced: 0 });

  return NextResponse.json({
    period: { days, since },
    totals: {
      ...totals,
      open_rate: totals.sent > 0 ? (totals.opened / totals.sent) : 0,
      reply_rate: totals.sent > 0 ? (totals.replied / totals.sent) : 0,
    },
    daily: campaignMetrics || [],
    variants: variants || [],
    landingPageFunnel,
    conversationOutcomes: outcomeCounts,
  });
}
