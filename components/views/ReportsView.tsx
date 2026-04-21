'use client';
import React, { useState, useEffect } from 'react';
import { Card, Avatar, Badge, Button, KPI } from '../ui/primitives';
import { Sparkline, Donut } from '../ui/charts';
import { Icons } from '../Icons';
import type { SubAccount } from '../Sidebar';

interface ReportsViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

export default function ReportsView({ sub, accountId, userId }: ReportsViewProps) {
  const [funnel, setFunnel] = useState<Array<{ label: string; value: number; color: string }>>([]);
  const [campaigns, setCampaigns] = useState<Array<{ name: string; spend: number; leads: number; cpl: number; roas: number }>>([]);
  const [leadTrend, setLeadTrend] = useState<number[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [funnelRes, metaRes] = await Promise.all([
          fetch(`/api/analytics/funnel?accountId=${accountId}&days=30`),
          fetch(`/api/meta/insights?accountId=${accountId}&days=30`),
        ]);
        if (funnelRes.ok) {
          const data = await funnelRes.json();
          setLeadTrend(data.trend || []);
          if (data.stages) setFunnel(data.stages);
        }
        if (metaRes.ok) {
          const data = await metaRes.json();
          if (data.campaigns) setCampaigns(data.campaigns);
        }
      } catch {}
    }
    load();
  }, [accountId]);

  const funnelData = funnel.length > 0 ? funnel : [
    { label: 'Impressions', value: 2140000, color: 'var(--blue)' },
    { label: 'Clicks', value: 81748, color: 'var(--blue)' },
    { label: 'Leads', value: 4821, color: 'var(--violet)' },
    { label: 'Qualified', value: 1142, color: 'var(--violet)' },
    { label: 'Tours', value: 487, color: 'var(--amber)' },
    { label: 'Offers', value: 186, color: 'var(--green)' },
    { label: 'Closed', value: 94, color: 'var(--ink)' },
  ];

  const fmtN = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(n);
  const max = funnelData[0]?.value || 1;
  const fallbackTrend = Array.from({ length: 30 }, (_, i) => 100 + i * 5 + Math.random() * 30);

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar tag={sub.tag} color={sub.color} size={16} /> {sub.name} <Icons.chevR size={12} /> Reports
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Analytics &amp; Reports</h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 4 }}>Marketing performance, lead quality, conversion funnel</div>
        </div>
        <Button variant="secondary" icon={<Icons.download size={13} />}>Download PDF</Button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="nx-2col-mobile">
        <KPI label="Impressions" value="2.14M" delta={8.2} trend={leadTrend.length > 2 ? leadTrend : fallbackTrend} tone="blue" />
        <KPI label="Click-through" value="3.82%" delta={0.4} trend={fallbackTrend.map(x => x * 1.1)} tone="violet" />
        <KPI label="Cost per click" value="$2.41" delta={-5.1} trend={fallbackTrend.map(x => x * 0.7)} tone="green" />
        <KPI label="Lead → Tour" value="18.2%" delta={2.3} trend={fallbackTrend.map(x => x * 0.6)} tone="amber" />
      </div>

      {/* Funnel + Quality */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }} className="nx-stack-mobile">
        <Card padding={20}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 4 }}>Conversion funnel</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 18 }}>Last 30 days · all channels</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {funnelData.map((s, i) => {
              const prev = i > 0 ? funnelData[i - 1].value : null;
              const conv = prev ? (s.value / prev * 100).toFixed(1) : null;
              return (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 100, fontSize: 12.5, color: 'var(--ink-2)' }}>{s.label}</div>
                  <div style={{ flex: 1, height: 30, background: 'var(--paper-2)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${s.value / max * 100}%`, height: '100%', background: s.color,
                      display: 'flex', alignItems: 'center', paddingLeft: 10, color: 'white',
                      fontSize: 12, fontWeight: 500, minWidth: 60, fontFamily: 'Geist Mono, monospace',
                    }}>{fmtN(s.value)}</div>
                  </div>
                  <div style={{ width: 60, textAlign: 'right', fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
                    {conv ? `${conv}%` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding={20}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 4 }}>Lead quality</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 16 }}>Score distribution</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Donut value={67} size={120} stroke={12} color="var(--blue)" label="67" />
            <div style={{ flex: 1 }}>
              {[
                { l: 'High (80+)', v: 312, c: 'var(--green)' },
                { l: 'Medium (50–79)', v: 684, c: 'var(--amber)' },
                { l: 'Low (<50)', v: 146, c: 'var(--ink-4)' },
              ].map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--ink-2)' }}>{r.l}</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{r.v}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${r.v / 11.42}%`, height: '100%', background: r.c }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Campaign table + Top listings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="nx-stack-mobile">
        <Card padding={20}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 14 }}>Campaign performance</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Campaign', 'Spend', 'Leads', 'CPL', 'ROAS'].map((h, i) => (
                  <th key={i} style={{
                    padding: '8px 10px', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i === 0 ? 'left' : 'right',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(campaigns.length > 0 ? campaigns : [
                { name: 'Luxury Waterfront — Meta', spend: 12400, leads: 186, cpl: 66.67, roas: 5.2 },
                { name: 'Penthouse Buyers — Google', spend: 8600, leads: 142, cpl: 60.56, roas: 6.1 },
                { name: 'First-Time — Instagram', spend: 4200, leads: 198, cpl: 21.21, roas: 4.8 },
                { name: 'Repeat Client Retarget', spend: 2800, leads: 94, cpl: 29.79, roas: 7.3 },
              ]).map((r, i) => (
                <tr key={i} style={{ borderBottom: i < 3 ? '1px solid var(--line)' : 'none' }}>
                  <td style={{ padding: '10px', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>${r.spend.toLocaleString()}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>{r.leads}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'Geist Mono, monospace' }}>${r.cpl.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: r.roas >= 5 ? 'var(--green)' : 'var(--ink-2)' }}>
                    {r.roas.toFixed(1)}×
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card padding={20}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 14 }}>Top performing listings</div>
          {['1428 Ocean Terrace', '8 Palmetto Crescent, Penthouse', 'Highland Park Lot 22', 'Marina Isle #1104', 'Coral Point Villa'].map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
              <div style={{ width: 50, height: 40, borderRadius: 6, background: 'var(--paper-3)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{[284, 241, 203, 187, 152][i]} leads · {[18.2, 16.4, 14.1, 12.8, 11.3][i]}% CTR</div>
              </div>
              <Sparkline data={fallbackTrend.map(x => x * (1 - i * 0.1))} w={60} h={28} color="var(--blue)" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
