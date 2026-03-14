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
    <div className="card flex flex-col gap-1 min-w-0">
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest truncate">{label}</p>
      <p className={`text-2xl font-mono font-bold tabular-nums leading-none ${
        accent ? 'text-primary-600 dark:text-primary-400'
        : warn ? 'text-red-600 dark:text-red-400'
        : 'text-gray-900 dark:text-gray-100'
      }`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{sub}</p>}
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
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Ad spend → leads → bookings</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {pendingCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse">
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} pending
            </span>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input text-sm py-1.5"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={() => loadData(true)}
            disabled={syncing}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Pulling…' : 'Pull Data from Meta'}
          </button>
          {lastSync && <span className="text-xs text-gray-400">synced {lastSync}</span>}
        </div>
      </div>

      {/* ── Meta KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-gray-100 dark:bg-white/5" />
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

      {/* ── No data empty state ────────────────────────────────── */}
      {!loading && (!t || t.spend === 0) && adRows.length === 0 && (
        <div className="card p-8 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">No Meta ad data yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Add your Meta access token and ad account ID to Vercel environment variables, then click <span className="font-semibold text-primary-600 dark:text-primary-400">Pull Data from Meta</span> above.
            </p>
          </div>
          <div className="text-xs text-gray-400 space-y-1 bg-gray-50 dark:bg-white/5 rounded-lg px-4 py-3">
            <p className="font-mono">META_ACCESS_TOKEN</p>
            <p className="font-mono">META_AD_ACCOUNT_ID</p>
          </div>
        </div>
      )}

      {/* ── Funnel + Optimizer ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-5 uppercase tracking-wider">Funnel</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 rounded-lg bg-gray-100 dark:bg-white/5 animate-pulse" />)}
            </div>
          ) : funnel ? (
            <FunnelChart
              stages={funnel.stages}
              totalLeads={funnel.totalLeads}
              totalBookings={funnel.totalBookings}
              bookingRate={funnel.bookingRate}
            />
          ) : (
            <p className="text-sm text-gray-400">No funnel data yet.</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-5 uppercase tracking-wider">AI Optimizer</h3>
          <OptimizerFeed
            actions={actions.slice(0, 8)}
            onApprove={(id) => handleDecision(id, 'approve')}
            onReject={(id) => handleDecision(id, 'reject')}
            isLoading={loading}
          />
        </div>
      </div>

      {/* ── Ad Set Table ───────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-5 uppercase tracking-wider">Ad Set Breakdown</h3>
        <MetaCampaignTable rows={adRows} />
      </div>

    </div>
  );
}
