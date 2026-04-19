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

const s: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: '24px 32px 48px',
    maxWidth: 1280,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  h1: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'var(--ink)',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: 'var(--ink-3)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  select: {
    padding: '7px 10px',
    background: 'var(--paper-2)',
    border: '1px solid var(--line)',
    borderRadius: 7,
    fontSize: 13,
    color: 'var(--ink)',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--ink)',
    color: 'var(--paper)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  refreshBtnDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--line)',
    color: 'var(--ink-4)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 14px',
    borderRadius: 8,
    border: '1px solid var(--line)',
    background: 'var(--paper-2)',
    color: 'var(--ink-2)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 20,
    background: 'color-mix(in srgb, var(--amber) 15%, transparent)',
    color: 'var(--amber)',
    fontSize: 12,
    fontFamily: 'Geist Mono, monospace',
    fontWeight: 600,
  },
  syncedText: {
    fontSize: 12,
    color: 'var(--ink-4)',
    fontFamily: 'Geist Mono, monospace',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  },
  kpiCard: {
    background: 'var(--paper-2)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  kpiLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-4)',
    fontFamily: 'Geist Mono, monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  kpiValueDefault: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    fontFamily: 'Geist Mono, monospace',
    letterSpacing: '-0.03em',
    color: 'var(--ink)',
    lineHeight: 1,
  },
  kpiValueAccent: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    fontFamily: 'Geist Mono, monospace',
    letterSpacing: '-0.03em',
    color: 'var(--green)',
    lineHeight: 1,
  },
  kpiValueWarn: {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    fontFamily: 'Geist Mono, monospace',
    letterSpacing: '-0.03em',
    color: 'var(--rose)',
    lineHeight: 1,
  },
  kpiSub: {
    margin: 0,
    fontSize: 11,
    color: 'var(--ink-4)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  kpiSkeleton: {
    background: 'var(--paper-3)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    height: 88,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  midRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 14,
  },
  card: {
    background: 'var(--paper-2)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    padding: '18px 20px',
  },
  cardTitle: {
    margin: '0 0 16px',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-4)',
    fontFamily: 'Geist Mono, monospace',
  },
  skeletonLine: {
    height: 28,
    borderRadius: 6,
    background: 'var(--paper-3)',
    marginBottom: 10,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  emptyText: {
    fontSize: 13,
    color: 'var(--ink-4)',
  },
  donutPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    gap: 8,
  },
  donutCircle: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    border: '10px solid var(--paper-3)',
    borderTopColor: 'var(--blue)',
    borderRightColor: 'var(--green)',
  },
  donutLabel: {
    fontSize: 12,
    color: 'var(--ink-4)',
    fontFamily: 'Geist Mono, monospace',
  },
  donutLegend: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: 'var(--ink-3)',
    fontFamily: 'Geist Mono, monospace',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'var(--paper-3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    margin: '0 0 4px',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--ink)',
  },
  emptyDesc: {
    margin: 0,
    fontSize: 13,
    color: 'var(--ink-3)',
    maxWidth: 320,
  },
  codeBlock: {
    background: 'var(--paper-3)',
    borderRadius: 8,
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'Geist Mono, monospace',
    color: 'var(--ink-2)',
  },
};

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  loading?: boolean;
}

function KpiCard({ label, value, sub, accent, warn, loading }: KpiCardProps) {
  if (loading) return <div style={s.kpiSkeleton} />;
  const valStyle = accent ? s.kpiValueAccent : warn ? s.kpiValueWarn : s.kpiValueDefault;
  return (
    <div style={s.kpiCard}>
      <p style={s.kpiLabel}>{label}</p>
      <p style={valStyle}>{value}</p>
      {sub && <p style={s.kpiSub}>{sub}</p>}
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
  const noData = !loading && (!t || t.spend === 0) && adRows.length === 0;

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <h1 style={s.h1}>Analytics &amp; Reports</h1>
          <p style={s.subtitle}>Ad spend → leads → bookings</p>
        </div>
        <div style={s.headerRight}>
          {pendingCount > 0 && (
            <span style={s.pendingBadge}>
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} pending
            </span>
          )}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={s.select}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button style={s.downloadBtn}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Download PDF
          </button>
          <button onClick={() => loadData(true)} disabled={syncing} style={syncing ? s.refreshBtnDisabled : s.refreshBtn}>
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none"
              style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}
            >
              <path d="M14 8A6 6 0 1 1 9 2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {syncing ? 'Pulling…' : 'Pull from Meta'}
          </button>
          {lastSync && <span style={s.syncedText}>synced {lastSync}</span>}
        </div>
      </div>

      {/* KPI cards */}
      <div style={s.kpiGrid}>
        <KpiCard loading={loading} label="Total Spend"  value={money(t?.spend ?? null)}       sub={`${fmt(t?.impressions ?? 0)} impressions`} />
        <KpiCard loading={loading} label="Total Leads"  value={fmt(t?.leads ?? 0)}            sub={t?.cpl ? `${money(t.cpl)} per lead` : undefined} accent />
        <KpiCard loading={loading} label="Booking Rate" value={funnel?.bookingRate != null ? `${(funnel.bookingRate * 100).toFixed(1)}%` : '—'} sub={`${fmt(funnel?.totalBookings ?? 0)} bookings`} accent />
        <KpiCard loading={loading} label="Cost / Lead"  value={money(t?.cpl ?? null)}         sub={t?.cpa ? `${money(t.cpa)} per appt` : undefined} warn={!!(t?.cpl && t.cpl > 50)} />
      </div>

      {/* Empty state */}
      {noData && (
        <div style={{ ...s.card, padding: '0' }}>
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M14 8A6 6 0 1 1 9 2.1" stroke="var(--ink-3)" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M9 1v4h4" stroke="var(--ink-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p style={s.emptyTitle}>No Meta ad data yet</p>
              <p style={s.emptyDesc}>
                Add your Meta access token and ad account ID to Vercel environment variables, then click Pull from Meta above.
              </p>
            </div>
            <div style={s.codeBlock}>
              <span style={s.codeText}>META_ACCESS_TOKEN</span>
              <span style={s.codeText}>META_AD_ACCOUNT_ID</span>
            </div>
          </div>
        </div>
      )}

      {/* Funnel + Lead Quality */}
      <div style={s.midRow}>
        <div style={s.card}>
          <p style={s.cardTitle}>Funnel</p>
          {loading ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={s.skeletonLine} />
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
            <p style={s.emptyText}>No funnel data yet.</p>
          )}
        </div>

        <div style={s.card}>
          <p style={s.cardTitle}>Lead Quality</p>
          <div style={s.donutPlaceholder}>
            <div style={s.donutCircle} />
            <span style={s.donutLabel}>Quality breakdown</span>
            <div style={s.donutLegend}>
              <span style={s.legendItem}>
                <span style={{ ...s.legendDot, background: 'var(--green)' }} />
                Hot
              </span>
              <span style={s.legendItem}>
                <span style={{ ...s.legendDot, background: 'var(--blue)' }} />
                Warm
              </span>
              <span style={s.legendItem}>
                <span style={{ ...s.legendDot, background: 'var(--ink-4)' }} />
                Cold
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ad Set Table */}
      <div style={s.card}>
        <p style={s.cardTitle}>Ad Set Breakdown</p>
        <MetaCampaignTable rows={adRows} />
      </div>

      {/* Optimizer Feed */}
      <div style={s.card}>
        <p style={s.cardTitle}>AI Optimizer</p>
        <OptimizerFeed
          actions={actions.slice(0, 8)}
          onApprove={(id) => handleDecision(id, 'approve')}
          onReject={(id) => handleDecision(id, 'reject')}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
