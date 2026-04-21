'use client';
import React, { useState, useEffect } from 'react';
import { Card, Avatar, KPI } from '../ui/primitives';
import { Sparkline } from '../ui/charts';
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

const SOURCE_COLORS: Record<string, string> = {
  'Facebook Lead Ad': 'var(--blue)',
  'Meta': 'var(--blue)',
  'Landing Page': 'var(--violet)',
  'Google': 'var(--violet)',
  'Instagram': 'var(--green)',
  'Referral': 'var(--amber)',
  'Manual': 'var(--ink-3)',
};

function sourceColor(source: string): string {
  for (const key of Object.keys(SOURCE_COLORS)) {
    if (source?.toLowerCase().includes(key.toLowerCase())) return SOURCE_COLORS[key];
  }
  return 'var(--ink-4)';
}

// Build a 30-value array of daily lead counts from a list of contacts
function buildDailyTrend(contacts: Array<{ created_at: string }>, days = 30): number[] {
  const now = Date.now();
  const counts = Array(days).fill(0);
  for (const c of contacts) {
    const daysAgo = Math.floor((now - new Date(c.created_at).getTime()) / (24 * 60 * 60 * 1000));
    if (daysAgo >= 0 && daysAgo < days) counts[days - 1 - daysAgo]++;
  }
  return counts;
}

export default function DashboardView({ sub, accountId, userId }: DashboardViewProps) {
  const [stats, setStats] = useState({ leads30: 0, spend30: 0, pipelineValue: 0, wonThisMonth: 0 });
  const [pipelineStages, setPipelineStages] = useState<Array<{ name: string; count: number }>>([]);
  const [activities, setActivities] = useState<Array<{ id: string; type: string; description: string; contact_name: string; created_at: string }>>([]);
  const [leadTrend, setLeadTrend] = useState<number[]>([]);
  const [channelMix, setChannelMix] = useState<Array<{ name: string; count: number; color: string }>>([]);
  useEffect(() => {
    async function load() {
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [contactsRes, dealsRes, activitiesRes] = await Promise.all([
          fetch(`/api/contacts?accountId=${accountId}&limit=200&since=${thirtyDaysAgo}`),
          fetch(`/api/deals?accountId=${accountId}`),
          fetch(`/api/activities?accountId=${accountId}&limit=6`),
        ]);

        if (contactsRes.ok) {
          const cData = await contactsRes.json();
          const contacts: Array<{ created_at: string; source?: string }> = cData.contacts || [];
          const total = cData.total ?? contacts.length;

          setStats(s => ({ ...s, leads30: total }));
          setLeadTrend(buildDailyTrend(contacts));

          // Channel mix from real source data
          const sourceCounts: Record<string, number> = {};
          for (const c of contacts) {
            const src = c.source || 'Other';
            sourceCounts[src] = (sourceCounts[src] || 0) + 1;
          }
          const mix = Object.entries(sourceCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, color: sourceColor(name) }));
          setChannelMix(mix);
        }

        if (dealsRes.ok) {
          const data = await dealsRes.json();
          const dealList: Array<{ stage?: string; status?: string; value?: number }> = data.data || data.deals || [];

          const bystage: Record<string, number> = {};
          let pipeline = 0, won = 0;
          for (const d of dealList) {
            const stageName = d.stage || 'Unknown';
            bystage[stageName] = (bystage[stageName] || 0) + 1;
            if (d.status !== 'won' && d.status !== 'lost') pipeline += (d.value || 0);
            if (d.status === 'won') won += (d.value || 0);
          }

          // Build ordered stage list from actual deal data
          const stages = Object.entries(bystage).map(([name, count]) => ({ name, count }));
          setPipelineStages(stages);
          setStats(s => ({ ...s, pipelineValue: pipeline, wonThisMonth: won }));
        }

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          setActivities(data.activities || data || []);
        }

        // Meta spend — try live fetch first, falls back to cached DB rows
        const metaRes = await fetch(`/api/meta/insights?accountId=${accountId}&days=30&live=true`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          setStats(s => ({ ...s, spend30: meta.totals?.spend || 0 }));
        }
      } catch {}
    }
    load();
  }, [accountId]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const totalLeads = channelMix.reduce((s, c) => s + c.count, 0);
  const maxStageCount = Math.max(1, ...pipelineStages.map(s => s.count));

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6 }}>
          <span style={{ color: 'var(--ink-2)' }}>{sub.name}</span>
          <Icons.chevR size={12} />
          <span style={{ color: 'var(--ink-2)' }}>Dashboard</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar tag={sub.tag} color={sub.color} size={38} />
          {greeting}.
        </h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 6, marginLeft: 50 }}>
          Here&apos;s what&apos;s happening at <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{sub.name}</strong> {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="nx-2col-mobile">
        <KPI label="Leads / 30d" value={fmtN(stats.leads30)} trend={leadTrend.length > 0 ? leadTrend : undefined} tone="blue" />
        <KPI label="Ad Spend / 30d" value={fmt$(stats.spend30, true)} tone="violet" />
        <KPI label="Pipeline" value={fmtN(pipelineStages.reduce((s, p) => s + p.count, 0)) + ' leads'} tone="green" />
        <KPI label="Closed Won / mo" value={fmt$(stats.wonThisMonth, true)} tone="amber" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="nx-stack-mobile">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Lead trend */}
          <Card padding={20}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>Lead acquisition</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>New leads per day, last 30 days</div>
              </div>
              {channelMix.slice(0, 3).length > 0 && (
                <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                  {channelMix.slice(0, 3).map(ch => (
                    <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: ch.color }} />{ch.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {leadTrend.some(v => v > 0) ? (
              <Sparkline data={leadTrend} w={undefined as unknown as number} h={80} color="var(--blue)" />
            ) : (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                No leads in the last 30 days
              </div>
            )}
          </Card>

          {/* Pipeline snapshot */}
          <Card padding={20}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Pipeline snapshot</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>Active leads by stage</div>
            </div>
            {pipelineStages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pipelineStages.map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 140, fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ flex: 1, height: 8, background: 'var(--paper-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(s.count / maxStageCount) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 4, transition: 'width 600ms ease' }} />
                    </div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', width: 24, textAlign: 'right' }}>{s.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--ink-4)', fontSize: 13, padding: '8px 0' }}>No leads in pipeline yet</div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recent activity */}
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recent activity</div>
            </div>
            {activities.length > 0 ? activities.slice(0, 5).map((a, i) => (
              <div key={a.id || i} style={{ padding: '12px 16px', borderBottom: i < Math.min(activities.length, 5) - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', flexShrink: 0 }}>
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
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No recent activity</div>
            )}
          </Card>

          {/* Channel mix — only shown when there's real data */}
          {channelMix.length > 0 && (
            <Card padding={18}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Lead sources</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {channelMix.map((ch) => {
                  const pct = totalLeads > 0 ? Math.round((ch.count / totalLeads) * 100) : 0;
                  return (
                    <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: ch.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</div>
                      <div style={{ flex: 2, height: 5, background: 'var(--paper-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: ch.color }} />
                      </div>
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', width: 32, textAlign: 'right' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
