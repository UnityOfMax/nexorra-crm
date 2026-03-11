'use client';

import { useEffect, useState, useCallback } from 'react';
import FunnelChart from './FunnelChart';
import MetaCampaignTable, { AdSetRow } from './MetaCampaignTable';
import OptimizerFeed, { OptimizerAction } from './OptimizerFeed';

interface FunnelMetrics {
  stages: Array<{ stage: string; count: number; conversionRate: number | null }>;
  totalLeads: number;
  totalBookings: number;
  bookingRate: number | null;
}

interface AnalyticsDashboardProps {
  accountId: string;
}

export default function AnalyticsDashboard({ accountId }: AnalyticsDashboardProps) {
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [adRows, setAdRows] = useState<AdSetRow[]>([]);
  const [actions, setActions] = useState<OptimizerAction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics/funnel?accountId=${accountId}&days=${days}`).then((r) => r.json()),
      fetch(`/api/meta/insights?accountId=${accountId}&days=${days}`).then((r) => r.json()),
      fetch(`/api/optimizer/actions?accountId=${accountId}`).then((r) => r.json()),
    ])
      .then(([funnelData, adsData, actionsData]) => {
        setFunnel(funnelData);
        setAdRows(adsData.data || []);
        const allActions: OptimizerAction[] = actionsData.data || [];
        setActions(allActions);
        setPendingCount(allActions.filter((a) => !a.approved && !a.applied && !a.rejected).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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

  return (
    <div className="space-y-6 p-6" style={{ color: 'var(--analytics-text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Funnel Analytics</h2>
          <p className="text-sm text-[var(--analytics-muted)] mt-0.5">Campaign → Lead → Booking</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30 animate-pulse">
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} pending approval
            </span>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs bg-white/5 text-white/70 rounded-md px-2 py-1.5 border border-white/10 focus:outline-none focus:border-white/30"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Funnel + Optimizer side-by-side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel chart */}
        <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-widest">Funnel</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded bg-white/5 animate-pulse" />)}
            </div>
          ) : funnel ? (
            <FunnelChart
              stages={funnel.stages}
              totalLeads={funnel.totalLeads}
              totalBookings={funnel.totalBookings}
              bookingRate={funnel.bookingRate}
            />
          ) : (
            <p className="text-sm text-[var(--analytics-muted)]">No funnel data yet.</p>
          )}
        </div>

        {/* Optimizer feed */}
        <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-5">
          <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-widest">AI Optimizer</h3>
          <OptimizerFeed
            actions={actions.slice(0, 8)}
            onApprove={(id) => handleDecision(id, 'approve')}
            onReject={(id) => handleDecision(id, 'reject')}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Campaign table */}
      <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-5">
        <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-widest">Ad Set Performance</h3>
        <MetaCampaignTable rows={adRows} />
      </div>
    </div>
  );
}
