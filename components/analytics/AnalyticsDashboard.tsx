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

function fmtImpressions(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return fmt(n);
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
  const ctr = t && t.impressions > 0 ? ((t.clicks / t.impressions) * 100) : null;
  const cpc = t && t.clicks > 0 ? (t.spend / t.clicks) : null;
  const bookingRate = funnel?.bookingRate;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .nx-pad-mobile { padding: 16px 16px 40px !important; }
          .nx-2col-mobile { grid-template-columns: repeat(2, 1fr) !important; }
          .nx-stack-mobile { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="nx-pad-mobile"
        style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', letterSpacing: '0.02em' }}>
              Nexorra › Analytics
            </p>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--ink)' }}>
              Analytics
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {pendingCount > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: 'color-mix(in srgb, var(--amber) 15%, transparent)',
                color: 'var(--amber)', fontSize: 12,
                fontFamily: 'Geist Mono, monospace', fontWeight: 600,
              }}>
                {pendingCount} action{pendingCount !== 1 ? 's' : ''} pending
              </span>
            )}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{
                padding: '7px 10px',
                background: 'var(--paper-2)', border: '1px solid var(--line)',
                borderRadius: 7, fontSize: 13, color: 'var(--ink)',
                outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={() => loadData(true)}
              disabled={syncing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: syncing ? 'var(--line)' : 'var(--ink)',
                color: syncing ? 'var(--ink-3)' : 'var(--paper)',
                fontSize: 13, fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none"
                style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}
              >
                <path d="M14 8A6 6 0 1 1 9 2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {syncing ? 'Pulling…' : 'Pull from Meta'}
            </button>
            {lastSync && (
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
                synced {lastSync}
              </span>
            )}
          </div>
        </div>

        {/* KPI cards — 4 col, 2 col on mobile */}
        <div
          className="nx-2col-mobile"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}
        >
          {/* Impressions — blue */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Impressions
            </div>
            {loading ? (
              <div style={{ height: 36, borderRadius: 6, background: 'var(--paper-3)' }} />
            ) : (
              <>
                <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Geist Mono, monospace', letterSpacing: '-0.02em', color: 'var(--blue)' }}>
                  {t ? fmtImpressions(t.impressions) : '—'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', marginTop: 8 }}>
                  {t ? `${fmt(t.reach)} reach` : 'No data'}
                </div>
              </>
            )}
          </div>

          {/* Click-through — ink */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Click-through
            </div>
            {loading ? (
              <div style={{ height: 36, borderRadius: 6, background: 'var(--paper-3)' }} />
            ) : (
              <>
                <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Geist Mono, monospace', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                  {ctr != null ? `${ctr.toFixed(2)}%` : '—'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', marginTop: 8 }}>
                  {t ? `${fmt(t.clicks)} clicks` : 'No data'}
                </div>
              </>
            )}
          </div>

          {/* Cost per click — violet */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Cost per click
            </div>
            {loading ? (
              <div style={{ height: 36, borderRadius: 6, background: 'var(--paper-3)' }} />
            ) : (
              <>
                <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Geist Mono, monospace', letterSpacing: '-0.02em', color: 'var(--violet)' }}>
                  {money(cpc)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', marginTop: 8 }}>
                  {t ? `${money(t.spend)} total spend` : 'No data'}
                </div>
              </>
            )}
          </div>

          {/* Lead→Tour rate — green */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Lead → Tour rate
            </div>
            {loading ? (
              <div style={{ height: 36, borderRadius: 6, background: 'var(--paper-3)' }} />
            ) : (
              <>
                <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Geist Mono, monospace', letterSpacing: '-0.02em', color: 'var(--green)' }}>
                  {bookingRate != null ? `${(bookingRate * 100).toFixed(1)}%` : '—'}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--green)', marginTop: 8 }}>
                  {funnel ? `${fmt(funnel.totalBookings)} bookings` : 'No data'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Funnel + Lead quality — 2fr 1fr */}
        <div
          className="nx-stack-mobile"
          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}
        >
          {/* Funnel chart card */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
              Funnel
            </p>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ height: 28, borderRadius: 6, background: 'var(--paper-3)' }} />
                ))}
              </div>
            ) : funnel ? (
              <FunnelChart
                stages={funnel.stages}
                totalLeads={funnel.totalLeads}
                totalBookings={funnel.totalBookings}
                bookingRate={funnel.bookingRate}
              />
            ) : (
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>No funnel data yet.</p>
            )}
          </div>

          {/* Lead quality card */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
              Lead Quality
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'High', count: 89, color: 'var(--green)', soft: 'var(--green-soft)' },
                { label: 'Med', count: 147, color: 'var(--amber)', soft: 'var(--amber-soft)' },
                { label: 'Low', count: 71, color: 'var(--rose)', soft: 'var(--rose-soft)' },
              ].map(({ label, count, color, soft }) => {
                const total = 89 + 147 + 71;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</span>
                      <span style={{ fontSize: 12, fontFamily: 'Geist Mono, monospace', color, fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: 'var(--paper-3)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ad table + Optimizer — 1fr 1fr */}
        <div
          className="nx-stack-mobile"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
        >
          {/* Meta Campaign Table */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
              Ad Set Breakdown
            </p>
            <MetaCampaignTable rows={adRows} />
          </div>

          {/* Optimizer Feed */}
          <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
              AI Optimizer
            </p>
            <OptimizerFeed
              actions={actions.slice(0, 8)}
              onApprove={(id) => handleDecision(id, 'approve')}
              onReject={(id) => handleDecision(id, 'reject')}
              isLoading={loading}
            />
          </div>
        </div>
      </div>
    </>
  );
}
