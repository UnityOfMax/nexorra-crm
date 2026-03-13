'use client';

import { useEffect, useState, useCallback } from 'react';
import FunnelChart from './FunnelChart';
import MetaCampaignTable, { AdSetRow } from './MetaCampaignTable';
import OptimizerFeed, { OptimizerAction } from './OptimizerFeed';
import { RefreshCw } from 'lucide-react';

interface FunnelMetrics {
  stages: Array<{ stage: string; count: number; conversionRate: number | null }>;
  totalLeads: number;
  totalBookings: number;
  bookingRate: number | null;
}

interface AdTotals {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  page_views: number;
  appointments: number;
  cpl: number | null;
  cpm: number | null;
  cpa: number | null;
}

interface AnalyticsDashboardProps {
  accountId: string;
}

function money(n: number | null, currency = 'USD') {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}
function fmt(n: number) { return n.toLocaleString('en-US'); }

interface KpiCardProps { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean }
function KpiCard({ label, value, sub, accent, warn }: KpiCardProps) {
  return (
    <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-5 py-4 flex flex-col gap-1 min-w-0">
      <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest truncate">{label}</p>
      <p className={`text-2xl font-mono font-bold tabular-nums leading-none ${
        accent ? 'text-[var(--analytics-accent)]'
        : warn ? 'text-[var(--analytics-negative)]'
        : 'text-white'
      }`}>{value}</p>
      {sub && <p className="text-[11px] text-white/30 truncate">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard({ accountId }: AnalyticsDashboardProps) {
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [adRows, setAdRows] = useState<AdSetRow[]>([]);
  const [adTotals, setAdTotals] = useState<AdTotals | null>(null);
  const [actions, setActions] = useState<OptimizerAction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [days, setDays] = useState(30);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadData = useCallback((live = false) => {
    setLoading(true);
    if (live) setSyncing(true);
    Promise.all([
      fetch(`/api/analytics/funnel?accountId=${accountId}&days=${days}`).then((r) => r.json()),
      fetch(`/api/meta/insights?accountId=${accountId}&days=${days}${live ? '&live=true' : ''}`).then((r) => r.json()),
      fetch(`/api/optimizer/actions?accountId=${accountId}`).then((r) => r.json()),
    ])
      .then(([funnelData, adsData, actionsData]) => {
        setFunnel(funnelData);
        setAdRows(adsData.data || []);
        setAdTotals(adsData.totals || null);
        if (live) setLastSync(new Date().toLocaleTimeString());
        const allActions: OptimizerAction[] = actionsData.data || [];
        setActions(allActions);
        setPendingCount(allActions.filter((a) => !a.approved && !a.applied && !a.rejected).length);
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setSyncing(false); });
  }, [accountId, days]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDecision = async (actionId: string, decision: 'approve' | 'reject') => {
    await fetch('/api/meta/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId, decision }),
    });
    loadData();
  };

  const t = adTotals;

  return (
    <div className="space-y-6 p-6" style={{ color: 'var(--analytics-text)' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Performance</h2>
          <p className="text-sm text-white/35 mt-0.5">Ad spend → leads → bookings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30 animate-pulse">
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} pending
            </span>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs bg-white/5 text-white/60 rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-white/25"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => loadData(true)}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          {lastSync && <span className="text-[11px] text-white/25">synced {lastSync}</span>}
        </div>
      </div>

      {/* ── Meta KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 px-5 py-4 h-20 animate-pulse" />
          ))
        ) : (
          <>
            <KpiCard label="Total Spend"   value={money(t?.spend ?? null)}          sub={`${fmt(t?.impressions ?? 0)} impressions`} />
            <KpiCard label="Reach"         value={fmt(t?.reach ?? 0)}               sub="unique people" />
            <KpiCard label="CPM"           value={money(t?.cpm ?? null)}            sub="per 1,000 shown" />
            <KpiCard label="Page Views"    value={fmt(t?.page_views ?? 0)}          sub={`${fmt(t?.clicks ?? 0)} link clicks`} />
            <KpiCard label="Leads"         value={fmt(t?.leads ?? 0)}               sub={t?.cpl ? `${money(t.cpl)} per lead` : undefined} accent />
            <KpiCard label="Booked Calls"  value={fmt(t?.appointments ?? 0)}        sub={t?.cpa ? `${money(t.cpa)} per appt` : undefined} accent={!!t?.appointments} />
          </>
        )}
      </div>

      {/* ── Funnel + Optimizer ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-5">
          <h3 className="text-[11px] font-semibold text-white/40 mb-5 uppercase tracking-widest">Funnel</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
            </div>
          ) : funnel ? (
            <FunnelChart
              stages={funnel.stages}
              totalLeads={funnel.totalLeads}
              totalBookings={funnel.totalBookings}
              bookingRate={funnel.bookingRate}
            />
          ) : (
            <p className="text-sm text-white/30">No funnel data yet.</p>
          )}
        </div>

        <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-5">
          <h3 className="text-[11px] font-semibold text-white/40 mb-5 uppercase tracking-widest">AI Optimizer</h3>
          <OptimizerFeed
            actions={actions.slice(0, 8)}
            onApprove={(id) => handleDecision(id, 'approve')}
            onReject={(id) => handleDecision(id, 'reject')}
            isLoading={loading}
          />
        </div>
      </div>

      {/* ── Ad Set Table ───────────────────────────────────────── */}
      <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-5">
        <h3 className="text-[11px] font-semibold text-white/40 mb-5 uppercase tracking-widest">Ad Set Breakdown</h3>
        <MetaCampaignTable rows={adRows} />
      </div>

    </div>
  );
}
