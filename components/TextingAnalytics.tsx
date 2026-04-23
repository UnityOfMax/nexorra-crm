'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScriptStats {
  scriptId: number;
  totalSent: number;
  replies: number;
  optedOut: number;
  bookingIntent: number;
  replyRate: number;    // 0–100
  bookingRate: number;  // 0–100
  optOutRate: number;   // 0–100
}

interface DailyRow {
  day: string;       // 'YYYY-MM-DD'
  scriptId: number;
  sent: number;
  replies: number;
  bookingIntent: number;
}

interface PendingVariant {
  id: string;
  scriptId: number;
  messageType: string;
  body: string;
  performance?: number | null;
  createdAt: string;
}

interface AnalyticsData {
  scripts: ScriptStats[];
  daily: DailyRow[];
  pending_variants: PendingVariant[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: 'Geist Mono, monospace' };

const LOW_REPLY_THRESHOLD = 8; // below this % → red

// Message type label map
const MSG_TYPE_LABEL: Record<string, string> = {
  initial:   'Initial',
  followup1: 'Follow-up 1',
  followup2: 'Follow-up 2',
  followup_1: 'Follow-up 1',
  followup_2: 'Follow-up 2',
  auto_reply: 'Auto-Reply',
};

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ daily, scriptId }: { daily: DailyRow[]; scriptId: number }) {
  // Build last-7-day buckets
  const today = new Date();
  const buckets: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const match = daily.find(r => r.day === dateStr && r.scriptId === scriptId);
    buckets.push(match ? match.sent : 0);
  }

  const max = Math.max(...buckets, 1);
  const barW = 6;
  const barGap = 3;
  const totalW = buckets.length * (barW + barGap) - barGap;
  const h = 28;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: barGap, height: h, marginTop: 10 }}>
      {buckets.map((val, i) => {
        const barH = Math.max(2, Math.round((val / max) * h));
        return (
          <div
            key={i}
            title={`${val} sent`}
            style={{
              width: barW,
              height: barH,
              borderRadius: 2,
              background: val > 0 ? 'var(--blue)' : 'var(--line)',
              opacity: val > 0 ? 0.75 : 1,
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Script Card ───────────────────────────────────────────────────────────────

function ScriptCard({ stats, daily }: { stats: ScriptStats; daily: DailyRow[] }) {
  const rateColor = stats.replyRate >= LOW_REPLY_THRESHOLD ? 'var(--blue)' : 'var(--red)';

  return (
    <div
      style={{
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', ...MONO }}>
          Script {stats.scriptId}
        </span>
        <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: rateColor, ...MONO, letterSpacing: '-0.02em' }}>
          {stats.replyRate.toFixed(1)}%
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 14 }}>reply rate</div>

      {/* 3-stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
          background: 'var(--line)',
          borderRadius: 8,
          overflow: 'hidden',
          gap: 0,
        }}
      >
        {[
          { label: 'Sent',           value: stats.totalSent.toLocaleString() },
          { label: 'Replies',        value: stats.replies.toLocaleString() },
          { label: 'Book. Intent',   value: stats.bookingIntent.toLocaleString() },
        ].map((item, i) => (
          <>
            {i > 0 && (
              <div key={`div-${i}`} style={{ background: 'var(--line)', width: 1 }} />
            )}
            <div
              key={item.label}
              style={{
                background: 'var(--paper-2)',
                padding: '10px 12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', ...MONO, letterSpacing: '-0.01em' }}>
                {item.value}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {item.label}
              </div>
            </div>
          </>
        ))}
      </div>

      {/* Opt-out rate */}
      <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-3)', ...MONO }}>
        <span style={{ color: stats.optOutRate > 3 ? 'var(--red)' : 'var(--ink-3)' }}>
          {stats.optOutRate.toFixed(1)}%
        </span>
        {' '}opt-out rate
      </div>

      {/* Sparkline */}
      <Sparkline daily={daily} scriptId={stats.scriptId} />
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>last 7 days</div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '32px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[80, 60, 72].map((w, i) => (
        <div
          key={i}
          style={{
            height: 16,
            width: `${w}%`,
            borderRadius: 6,
            background: 'var(--line)',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

// ── Overall Stats Strip ───────────────────────────────────────────────────────

function StatsStrip({ scripts, pendingCount }: { scripts: ScriptStats[]; pendingCount: number }) {
  const totalSent = scripts.reduce((a, s) => a + (s.totalSent || 0), 0);
  const avgReply = scripts.length > 0
    ? scripts.reduce((a, s) => a + (s.replyRate || 0), 0) / scripts.length
    : 0;
  const avgBooking = scripts.length > 0
    ? scripts.reduce((a, s) => a + (s.bookingRate || 0), 0) / scripts.length
    : 0;

  const kpis = [
    { label: 'Total Sent',        value: totalSent.toLocaleString(), accent: false },
    { label: 'Avg Reply Rate',    value: `${avgReply.toFixed(1)}%`,  accent: false },
    { label: 'Avg Booking Rate',  value: `${avgBooking.toFixed(1)}%`, accent: false },
    { label: 'Pending Variants',  value: String(pendingCount),       accent: pendingCount > 0 },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        background: 'var(--line)',
        gap: 1,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        marginBottom: 24,
      }}
    >
      {kpis.map(k => (
        <div
          key={k.label}
          style={{
            background: 'var(--paper-2)',
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', ...MONO, marginBottom: 6 }}>
            {k.label}
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: k.accent ? 'var(--yellow)' : 'var(--ink)',
            ...MONO,
            lineHeight: 1,
          }}>
            {k.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TextingAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/texting/analytics');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVariantAction = async (id: string, action: 'approve' | 'reject') => {
    setActioning(id);
    try {
      const res = await fetch('/api/texting/analytics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: id, action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error('Variant action failed:', json.error);
      }
      await fetchData();
    } finally {
      setActioning(null);
    }
  };

  const pendingCount = data?.pending_variants?.length ?? 0;

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, ...MONO, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Nexorra</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>Agency</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>SMS</span>
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
          SMS Campaigns
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={fetchData}
            style={{
              padding: '7px 14px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--paper-2)',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? 'spin 1s linear infinite' : undefined }}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setShowVariants(v => !v)}
            style={{
              padding: '7px 14px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: showVariants ? 'var(--paper-3)' : 'var(--paper-2)',
              color: 'var(--ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Script Variants
            {pendingCount > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 99,
                background: 'var(--yellow)',
                color: '#000',
                ...MONO,
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && <Skeleton />}

      {/* Error */}
      {!loading && error && (
        <div style={{
          padding: '20px 24px',
          borderRadius: 12,
          border: '1px solid var(--red)',
          background: 'color-mix(in oklch, var(--red) 8%, var(--paper))',
          color: 'var(--red)',
          fontSize: 13,
          ...MONO,
        }}>
          Error: {error}
        </div>
      )}

      {/* Data */}
      {!loading && !error && data && (
        <>
          {/* Stats strip */}
          <StatsStrip scripts={data.scripts} pendingCount={pendingCount} />

          {/* No data state */}
          {data.scripts.length === 0 ? (
            <div style={{
              padding: '64px 32px',
              textAlign: 'center',
              background: 'var(--paper-2)',
              border: '1px solid var(--line)',
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>No data yet</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Texting stats will appear once the campaign starts sending.
              </div>
            </div>
          ) : (
            /* 2×2 Script card grid */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
                marginBottom: 28,
              }}
            >
              {data.scripts.map(stats => (
                <ScriptCard
                  key={stats.scriptId}
                  stats={stats}
                  daily={data.daily}
                />
              ))}
            </div>
          )}

          {/* Pending variants section */}
          {(showVariants || pendingCount > 0) && pendingCount > 0 && (
            <div style={{ marginTop: 8 }}>
              {/* Section header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
              }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                  Pending Improvements
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: 'var(--yellow)',
                  color: '#000',
                  ...MONO,
                }}>
                  {pendingCount}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.pending_variants.map(variant => (
                  <div
                    key={variant.id}
                    style={{
                      background: 'var(--paper-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 12,
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    {/* Variant header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', ...MONO }}>
                        Script {variant.scriptId}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 5,
                        background: 'color-mix(in oklch, var(--blue) 15%, var(--paper))',
                        color: 'var(--blue)',
                        ...MONO,
                        whiteSpace: 'nowrap',
                      }}>
                        {MSG_TYPE_LABEL[variant.messageType] || variant.messageType}
                      </span>
                      {variant.performance != null && (
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', ...MONO }}>
                          projected +{variant.performance}% reply rate
                        </span>
                      )}
                    </div>

                    {/* Proposed message body */}
                    <div style={{
                      fontSize: 13.5,
                      color: 'var(--ink)',
                      lineHeight: 1.55,
                      background: 'var(--paper-3)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      border: '1px solid var(--line)',
                    }}>
                      {variant.body}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleVariantAction(variant.id, 'approve')}
                        disabled={actioning === variant.id}
                        style={{
                          padding: '7px 18px',
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: 'none',
                          background: 'var(--green)',
                          color: 'white',
                          cursor: actioning === variant.id ? 'not-allowed' : 'pointer',
                          opacity: actioning === variant.id ? 0.55 : 1,
                        }}
                      >
                        {actioning === variant.id ? 'Saving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleVariantAction(variant.id, 'reject')}
                        disabled={actioning === variant.id}
                        style={{
                          padding: '7px 18px',
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                          background: 'var(--paper-3)',
                          color: 'var(--ink-2)',
                          cursor: actioning === variant.id ? 'not-allowed' : 'pointer',
                          opacity: actioning === variant.id ? 0.55 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty variants state when panel is open but nothing pending */}
          {showVariants && pendingCount === 0 && (
            <div style={{
              marginTop: 8,
              padding: '28px 24px',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--paper-2)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No pending variants right now.</div>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
