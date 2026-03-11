/**
 * Funnel metrics aggregation.
 *
 * Queries funnel_events grouped by event_type to produce per-stage counts
 * and conversion rates. Also provides agency-wide overview across all accounts.
 */

import { supabaseAdmin } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number | null; // % from previous stage; null for first stage
}

export interface FunnelMetrics {
  accountId: string;
  days: number;
  stages: FunnelStage[];
  totalLeads: number;
  totalBookings: number;
  bookingRate: number | null; // bookings / leads
  generatedAt: string;
}

export interface ClientOverview {
  accountId: string;
  accountName: string;
  leads: number;
  engaged: number;
  bookings: number;
  bookingRate: number | null;
  avgLeadScore: number | null;
  spend: number | null;       // from meta_ad_metrics
  cpl: number | null;
  cpa: number | null;
}

export interface AgencyOverview {
  totalLeads: number;
  totalBookings: number;
  totalSpend: number;
  avgBookingRate: number | null;
  avgCpl: number | null;
  avgCpa: number | null;
  clients: ClientOverview[];
  generatedAt: string;
}

// Ordered funnel stages
const STAGE_ORDER = [
  'form_submit',
  'replied',
  'booking_page_viewed',
  'booking_confirmed',
  'showed',
] as const;

// ─── Per-account funnel metrics ───────────────────────────────────────────────

export async function getFunnelMetrics(
  accountId: string,
  days = 30,
): Promise<FunnelMetrics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await supabaseAdmin
    .from('funnel_events')
    .select('event_type')
    .eq('account_id', accountId)
    .gte('created_at', since);

  const counts: Record<string, number> = {};
  for (const e of events || []) {
    counts[e.event_type] = (counts[e.event_type] || 0) + 1;
  }

  const stages: FunnelStage[] = [];
  let prevCount: number | null = null;

  for (const stage of STAGE_ORDER) {
    const count = counts[stage] || 0;
    stages.push({
      stage,
      count,
      conversionRate: prevCount != null && prevCount > 0
        ? Math.round((count / prevCount) * 100)
        : null,
    });
    prevCount = count;
  }

  const totalLeads = counts['form_submit'] || 0;
  const totalBookings = counts['booking_confirmed'] || 0;

  return {
    accountId,
    days,
    stages,
    totalLeads,
    totalBookings,
    bookingRate: totalLeads > 0 ? Math.round((totalBookings / totalLeads) * 100) : null,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Agency-wide overview ─────────────────────────────────────────────────────

export async function getAgencyOverview(): Promise<AgencyOverview> {
  // All client accounts (exclude Nexorra agency account — no campaign data)
  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('id, name')
    .neq('id', 'da99b768-79dd-48f8-af86-abf95e61a69f'); // Nexorra agency account

  if (!accounts || accounts.length === 0) {
    return {
      totalLeads: 0,
      totalBookings: 0,
      totalSpend: 0,
      avgBookingRate: null,
      avgCpl: null,
      avgCpa: null,
      clients: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since30dDate = since30d.slice(0, 10); // YYYY-MM-DD

  // Batch: funnel events for all accounts in last 30d
  const { data: funnelEvents } = await supabaseAdmin
    .from('funnel_events')
    .select('account_id, event_type')
    .in('account_id', accounts.map((a) => a.id))
    .gte('created_at', since30d);

  // Batch: meta ad metrics aggregated per account
  const { data: adMetrics } = await supabaseAdmin
    .from('meta_ad_metrics')
    .select('account_id, spend, leads, cpl, cpa')
    .in('account_id', accounts.map((a) => a.id))
    .gte('date', since30dDate);

  // Batch: avg lead scores
  const { data: leadScores } = await supabaseAdmin
    .from('contacts')
    .select('account_id, lead_score')
    .in('account_id', accounts.map((a) => a.id))
    .not('lead_score', 'is', null);

  // Aggregate per account
  const funnelByAccount: Record<string, Record<string, number>> = {};
  for (const e of funnelEvents || []) {
    if (!funnelByAccount[e.account_id]) funnelByAccount[e.account_id] = {};
    funnelByAccount[e.account_id][e.event_type] =
      (funnelByAccount[e.account_id][e.event_type] || 0) + 1;
  }

  const metricsByAccount: Record<string, { spend: number; leads: number; cpls: number[]; cpas: number[] }> = {};
  for (const m of adMetrics || []) {
    if (!metricsByAccount[m.account_id]) {
      metricsByAccount[m.account_id] = { spend: 0, leads: 0, cpls: [], cpas: [] };
    }
    metricsByAccount[m.account_id].spend += parseFloat(m.spend || '0');
    metricsByAccount[m.account_id].leads += m.leads || 0;
    if (m.cpl != null) metricsByAccount[m.account_id].cpls.push(parseFloat(m.cpl));
    if (m.cpa != null) metricsByAccount[m.account_id].cpas.push(parseFloat(m.cpa));
  }

  const scoresByAccount: Record<string, number[]> = {};
  for (const s of leadScores || []) {
    if (!scoresByAccount[s.account_id]) scoresByAccount[s.account_id] = [];
    scoresByAccount[s.account_id].push(s.lead_score);
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const clients: ClientOverview[] = accounts.map((account) => {
    const funnel = funnelByAccount[account.id] || {};
    const metrics = metricsByAccount[account.id];
    const scores = scoresByAccount[account.id] || [];

    const leads = funnel['form_submit'] || 0;
    const engaged = funnel['replied'] || 0;
    const bookings = funnel['booking_confirmed'] || 0;

    return {
      accountId: account.id,
      accountName: account.name,
      leads,
      engaged,
      bookings,
      bookingRate: leads > 0 ? Math.round((bookings / leads) * 100) : null,
      avgLeadScore: scores.length > 0 ? Math.round(avg(scores)!) : null,
      spend: metrics ? metrics.spend : null,
      cpl: metrics?.cpls.length ? Math.round(avg(metrics.cpls)! * 100) / 100 : null,
      cpa: metrics?.cpas.length ? Math.round(avg(metrics.cpas)! * 100) / 100 : null,
    };
  });

  const totalLeads = clients.reduce((s, c) => s + c.leads, 0);
  const totalBookings = clients.reduce((s, c) => s + c.bookings, 0);
  const totalSpend = clients.reduce((s, c) => s + (c.spend || 0), 0);
  const bookingRates = clients.filter((c) => c.bookingRate != null).map((c) => c.bookingRate!);
  const cpls = clients.filter((c) => c.cpl != null).map((c) => c.cpl!);
  const cpas = clients.filter((c) => c.cpa != null).map((c) => c.cpa!);

  return {
    totalLeads,
    totalBookings,
    totalSpend: Math.round(totalSpend * 100) / 100,
    avgBookingRate: bookingRates.length > 0 ? Math.round(avg(bookingRates)!) : null,
    avgCpl: cpls.length > 0 ? Math.round(avg(cpls)! * 100) / 100 : null,
    avgCpa: cpas.length > 0 ? Math.round(avg(cpas)! * 100) / 100 : null,
    clients,
    generatedAt: new Date().toISOString(),
  };
}
