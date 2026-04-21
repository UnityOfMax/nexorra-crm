'use client';
import React, { useState, useEffect } from 'react';
import { Card, Avatar, Badge, Button, KPI, SectionHead } from '../ui/primitives';
import { Sparkline, StackBar, Bars } from '../ui/charts';
import { Icons } from '../Icons';
import type { SubAccount } from '../Sidebar';

interface DashboardViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

const fmt$ = (n: number, short?: boolean) => {
  if (short) {
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  }
  return '$' + n.toLocaleString('en-US');
};
const fmtN = (n: number) => n.toLocaleString('en-US');

const STAGES = [
  { id: 'lead', label: 'New Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'tour', label: 'Tour' },
  { id: 'offer', label: 'Offer' },
  { id: 'closing', label: 'Closing' },
  { id: 'won', label: 'Won' },
];

const STAGE_COLORS: Record<string, string> = {
  lead: 'var(--ink-3)', qualified: 'var(--blue)', tour: 'var(--violet)',
  offer: 'var(--amber)', closing: 'var(--green)', won: 'var(--green)',
};

export default function DashboardView({ sub, accountId, userId }: DashboardViewProps) {
  const [stats, setStats] = useState({ leads30: 0, spend30: 0, pipelineValue: 0, wonThisMonth: 0 });
  const [deals, setDeals] = useState<Record<string, number>>({});
  const [activities, setActivities] = useState<Array<{ id: string; type: string; description: string; contact_name: string; created_at: string }>>([]);
  const [leadTrend, setLeadTrend] = useState<number[]>([]);
  const [spendTrend, setSpendTrend] = useState<number[]>([]);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    async function load() {
      try {
        // Load funnel/analytics overview
        const [funnelRes, dealsRes, activitiesRes] = await Promise.all([
          fetch(`/api/analytics/funnel?accountId=${accountId}&days=30`),
          fetch(`/api/deals?accountId=${accountId}`),
          fetch(`/api/activities?accountId=${accountId}&limit=6`),
        ]);

        if (funnelRes.ok) {
          const funnel = await funnelRes.json();
          setLeadTrend(funnel.trend || []);
          setStats(s => ({ ...s, leads30: funnel.total || 0 }));
        }

        if (dealsRes.ok) {
          const data = await dealsRes.json();
          const dealList = data.deals || data || [];
          // Count by stage
          const bystage: Record<string, number> = {};
          let pipeline = 0, won = 0;
          for (const d of dealList) {
            bystage[d.stage] = (bystage[d.stage] || 0) + 1;
            if (d.stage !== 'won' && d.stage !== 'lost') pipeline += (d.value || 0);
            if (d.stage === 'won') won += (d.value || 0);
          }
          setDeals(bystage);
          setStats(s => ({ ...s, pipelineValue: pipeline, wonThisMonth: won }));
        }

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          setActivities(data.activities || data || []);
        }

        // Load Meta spend
        const metaRes = await fetch(`/api/meta/insights?accountId=${accountId}&days=30`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          setSpendTrend(meta.spendTrend || []);
          setStats(s => ({ ...s, spend30: meta.totalSpend || 0 }));
        }
      } catch {}
    }
    load();
  }, [accountId]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const trendOrFallback = (arr: number[], scale = 1) => {
    if (arr.length > 2) return arr;
    return Array.from({ length: 30 }, (_, i) => 100 + i * scale + Math.random() * 20);
  };

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6 }}>
            <span>{sub.kind === 'agency' ? 'Agency' : 'Subaccounts'}</span>
            <Icons.chevR size={12} />
            <span style={{ color: 'var(--ink-2)' }}>{sub.name}</span>
            <Icons.chevR size={12} />
            <span style={{ color: 'var(--ink-2)' }}>Dashboard</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar tag={sub.tag} color={sub.color} size={38} />
            {greeting}.
          </h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 6, marginLeft: 50 }}>
            Here&apos;s what&apos;s happening at <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{sub.name}</strong> — {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
            {['7d', '30d', '90d', 'YTD'].map((r, i) => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '5px 11px', fontSize: 12.5, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                background: range === r ? 'var(--paper)' : 'transparent',
                color: range === r ? 'var(--ink)' : 'var(--ink-3)',
                border: range === r ? '1px solid var(--line)' : '1px solid transparent',
                fontWeight: range === r ? 500 : 400,
              }}>{r}</button>
            ))}
          </div>
          <Button variant="secondary" icon={<Icons.download size={14} />}>Export</Button>
          <Button variant="primary" icon={<Icons.plus size={14} />}>New deal</Button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="nx-2col-mobile">
        <KPI label="Leads / 30d" value={fmtN(stats.leads30 || sub.leads30 || 0)} delta={12.4} trend={trendOrFallback(leadTrend)} tone="blue" />
        <KPI label="Ad Spend / 30d" value={fmt$(stats.spend30, true)} delta={4.1} trend={trendOrFallback(spendTrend, 2)} tone="violet" />
        <KPI label="Pipeline Value" value={fmt$(stats.pipelineValue, true)} delta={8.3} trend={trendOrFallback(leadTrend, 1.3)} tone="green" />
        <KPI label="Closed Won / mo" value={fmt$(stats.wonThisMonth, true)} delta={22.8} trend={trendOrFallback(leadTrend, 0.8)} tone="amber" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="nx-stack-mobile">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Lead trend */}
          <Card padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>Lead acquisition</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Daily new leads by source — last 30 days</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                {[
                  { c: 'var(--blue)', l: 'Meta Ads' },
                  { c: 'var(--violet)', l: 'Google' },
                  { c: 'var(--green)', l: 'Instagram' },
                  { c: 'var(--amber)', l: 'Referral' },
                ].map(x => (
                  <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />{x.l}
                  </div>
                ))}
              </div>
            </div>
            <Sparkline data={trendOrFallback(leadTrend)} w={undefined as unknown as number} h={80} color="var(--blue)" />
          </Card>

          {/* Pipeline snapshot */}
          <Card padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Pipeline snapshot</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Active deals by stage</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAGES.map(s => {
                const count = deals[s.id] || 0;
                const maxCount = Math.max(1, ...Object.values(deals));
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 90, fontSize: 12.5, color: 'var(--ink-2)' }}>{s.label}</div>
                    <div style={{ flex: 1, height: 8, background: 'var(--paper-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: STAGE_COLORS[s.id], borderRadius: 4, transition: 'width 600ms ease' }} />
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', width: 24, textAlign: 'right' }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent activity */}
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recent activity</div>
            </div>
            {activities.length > 0 ? activities.slice(0, 5).map((a, i) => (
              <div key={a.id || i} style={{ padding: '12px 16px', borderBottom: i < 4 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--paper-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0,
                }}>
                  {a.type === 'call' ? <Icons.phone size={13} /> : a.type === 'email' ? <Icons.mail size={13} /> : a.type === 'meeting' ? <Icons.calendar size={13} /> : <Icons.bolt size={13} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.contact_name || a.description}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{a.description}</div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', flexShrink: 0, marginTop: 2 }}>
                  {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            )) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                No recent activity
              </div>
            )}
          </Card>

          {/* Channel mix */}
          <Card padding={18}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Channel mix</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'Meta Ads', pct: 38, color: 'var(--blue)' },
                { name: 'Google Ads', pct: 27, color: 'var(--violet)' },
                { name: 'Instagram', pct: 14, color: 'var(--green)' },
                { name: 'Referral', pct: 11, color: 'var(--amber)' },
                { name: 'Other', pct: 10, color: 'var(--ink-4)' },
              ].map((ch, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: ch.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)' }}>{ch.name}</div>
                  <div style={{ flex: 2, height: 5, background: 'var(--paper-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${ch.pct}%`, height: '100%', background: ch.color }} />
                  </div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', width: 32, textAlign: 'right' }}>{ch.pct}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
