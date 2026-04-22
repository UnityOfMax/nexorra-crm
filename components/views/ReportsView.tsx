'use client';
import React, { useState, useEffect } from 'react';
import { Card, Avatar, Button, KPI } from '../ui/primitives';
import { Icons } from '../Icons';
import type { SubAccount } from '../Sidebar';

interface ReportsViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
  userRole?: string;
}

interface OverviewData {
  meta: {
    spend: number;
    impressions: number;
    clicks: number;
    leads: number;
    cpl: number;
    ctr: number;
    adsets: Array<{ name: string; spend: number; leads: number; cpl: number }>;
    hasData: boolean;
  };
  landingPages: {
    page_views: number;
    cta_clicks: number;
    form_starts: number;
    form_submits: number;
    conversion: number;
    sessions: number;
    hasData: boolean;
  };
  conversations: {
    total: number;
    ai_sent: number;
    inbound: number;
    outbound: number;
    sms: number;
    email: number;
    reply_rate: number;
    hasData: boolean;
  };
  funnel: {
    stages: Array<{ label: string; count: number }>;
    hasData: boolean;
  };
}

function fmt$(n: number) { return '$' + (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toFixed(0)); }
function fmtN(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icons.chart size={18} style={{ color: 'var(--ink-4)' }} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>No {label} data yet</div>
    </div>
  );
}

export default function ReportsView({ sub, accountId }: ReportsViewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/client-overview?accountId=${accountId}&days=${days}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accountId, days]);

  const meta = data?.meta;
  const lp = data?.landingPages;
  const conv = data?.conversations;
  const funnel = data?.funnel;
  const funnelMax = funnel?.stages?.[0]?.count || 1;

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar tag={sub.tag} color={sub.color} size={16} /> {sub.name} <Icons.chevR size={12} /> Analytics
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Analytics &amp; Reports</h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 4 }}>Marketing performance, AI conversations, funnel</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              border: '1px solid var(--line-2)', background: days === d ? 'var(--blue)' : 'var(--paper-2)',
              color: days === d ? '#fff' : 'var(--ink-2)',
            }}>{d}d</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--line-2)', borderTopColor: 'var(--blue)', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="nx-2col-mobile">
            <KPI
              label="Ad Spend"
              value={meta?.hasData ? fmt$(meta.spend) : '—'}
              delta={undefined}
              trend={[]}
              tone="blue"
            />
            <KPI
              label="Leads (Meta)"
              value={meta?.hasData ? fmtN(meta.leads) : '—'}
              delta={undefined}
              trend={[]}
              tone="violet"
            />
            <KPI
              label="Cost per Lead"
              value={meta?.hasData && meta.leads > 0 ? fmt$(meta.cpl) : '—'}
              delta={undefined}
              trend={[]}
              tone="green"
            />
            <KPI
              label="AI Reply Rate"
              value={conv?.hasData ? `${conv.reply_rate}%` : '—'}
              delta={undefined}
              trend={[]}
              tone="amber"
            />
          </div>

          {/* Row 1: Funnel + Conversations */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }} className="nx-stack-mobile">
            <Card padding={20}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 4 }}>Conversion funnel</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 18 }}>Last {days} days · unique contacts per stage</div>
              {funnel?.hasData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {funnel.stages.map((s, i) => {
                    const prev = i > 0 ? funnel.stages[i - 1].count : null;
                    const conv = prev && prev > 0 ? (s.count / prev * 100).toFixed(0) : null;
                    return (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 130, fontSize: 12.5, color: 'var(--ink-2)', flexShrink: 0 }}>{s.label}</div>
                        <div style={{ flex: 1, height: 28, background: 'var(--paper-2)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            width: `${Math.max((s.count / funnelMax) * 100, s.count > 0 ? 4 : 0)}%`,
                            height: '100%',
                            background: i === 0 ? 'var(--blue)' : i < 2 ? 'var(--violet)' : i < 4 ? 'var(--amber)' : 'var(--green)',
                            display: 'flex', alignItems: 'center', paddingLeft: 10, color: '#fff',
                            fontSize: 12, fontWeight: 500, fontFamily: 'Geist Mono, monospace',
                          }}>{s.count > 0 ? fmtN(s.count) : ''}</div>
                        </div>
                        <div style={{ width: 48, textAlign: 'right', fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
                          {conv ? `${conv}%` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState label="funnel" />
              )}
            </Card>

            <Card padding={20}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 4 }}>AI Conversations</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16 }}>Last {days} days</div>
              {conv?.hasData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'Total messages', value: fmtN(conv.total) },
                    { label: 'AI generated', value: fmtN(conv.ai_sent) },
                    { label: 'Inbound replies', value: fmtN(conv.inbound) },
                    { label: 'Outbound sent', value: fmtN(conv.outbound) },
                    { label: 'Via SMS', value: fmtN(conv.sms) },
                    { label: 'Via email', value: fmtN(conv.email) },
                    { label: 'Reply rate', value: `${conv.reply_rate}%`, highlight: true },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{row.label}</span>
                      <span style={{
                        fontSize: 13, fontFamily: 'Geist Mono, monospace', fontWeight: 600,
                        color: row.highlight ? 'var(--green)' : 'var(--ink)',
                      }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="conversation" />
              )}
            </Card>
          </div>

          {/* Row 2: Ad campaigns + Landing pages */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="nx-stack-mobile">
            <Card padding={20}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 14 }}>Ad set performance</div>
              {meta?.hasData ? (
                <>
                  {/* Summary row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Spend', value: fmt$(meta.spend) },
                      { label: 'Impressions', value: fmtN(meta.impressions) },
                      { label: 'CTR', value: `${meta.ctr.toFixed(2)}%` },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ background: 'var(--paper-2)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>{kpi.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Geist Mono, monospace' }}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)' }}>
                        {['Ad set', 'Spend', 'Leads', 'CPL'].map((h, i) => (
                          <th key={i} style={{
                            padding: '6px 8px', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
                            textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 0 ? 'left' : 'right',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {meta.adsets.length > 0 ? meta.adsets.map((r, i) => (
                        <tr key={i} style={{ borderBottom: i < meta.adsets.length - 1 ? '1px solid var(--line)' : 'none' }}>
                          <td style={{ padding: '9px 8px', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>{fmt$(r.spend)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>{r.leads}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: r.cpl < 50 ? 'var(--green)' : 'var(--ink-2)' }}>
                            {r.leads > 0 ? fmt$(r.cpl) : '—'}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={4} style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>No ad sets in this period</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              ) : (
                <EmptyState label="ad" />
              )}
            </Card>

            <Card padding={20}>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 14 }}>Landing pages</div>
              {lp?.hasData ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Page views', value: fmtN(lp.page_views || lp.sessions) },
                      { label: 'CTA clicks', value: fmtN(lp.cta_clicks) },
                      { label: 'Form starts', value: fmtN(lp.form_starts) },
                      { label: 'Submissions', value: fmtN(lp.form_submits) },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ background: 'var(--paper-2)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 3 }}>{kpi.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'Geist Mono, monospace' }}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'var(--paper-2)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Conversion rate</div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Geist Mono, monospace', color: lp.conversion >= 10 ? 'var(--green)' : 'var(--ink)' }}>
                        {lp.conversion}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>Form submits / CTA clicks</div>
                      <div style={{ fontSize: 13, fontFamily: 'Geist Mono, monospace', color: 'var(--ink-2)' }}>
                        {lp.form_submits} / {lp.cta_clicks || lp.sessions}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState label="landing page" />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
