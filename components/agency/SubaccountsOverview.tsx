'use client';

import { useState, useEffect, useRef } from 'react';
import type { Account } from '@/types';
import { supabase } from '@/lib/supabase-browser';
import CreateSubAccountModal from './CreateSubAccountModal';

// ── Helpers ──────────────────────────────────────────────────────────────────
const COLOR_CYCLE = ['blue', 'violet', 'green', 'amber', 'rose'] as const;
type AvatarColor = typeof COLOR_CYCLE[number] | 'grad';

function stringToColor(s: string): AvatarColor {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return COLOR_CYCLE[Math.abs(h) % COLOR_CYCLE.length];
}
function accountTag(name: string) {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'N';
}
function fmt$(n: number, short = false) {
  if (short) {
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1) + 'K';
  }
  return '$' + n.toLocaleString('en-US');
}
function fmtN(n: number) { return n.toLocaleString('en-US'); }

// ── Per-account stat shape ────────────────────────────────────────────────────
interface AccountStat {
  leads30: number;
  spend30: number;
  cpl: number;
  roas: number;
  status: 'healthy' | 'attention' | 'onboarding';
  listings: number;
  location: string;
  trend: number[]; // 6-month lead counts
  hasMetaData: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ tag, size = 28, color = 'blue' }: { tag: string; size?: number; color?: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    blue:   { bg: 'var(--blue-soft)',   fg: 'var(--blue)' },
    violet: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
    green:  { bg: 'var(--green-soft)',  fg: 'var(--green)' },
    amber:  { bg: 'var(--amber-soft)',  fg: 'var(--amber)' },
    rose:   { bg: 'var(--rose-soft)',   fg: 'var(--rose)' },
    grad:   { bg: 'var(--grad)',        fg: 'white' },
  };
  const c = colors[color] || { bg: 'var(--paper-3)', fg: 'var(--ink-2)' };
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: c.bg, color: c.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.42, letterSpacing: '0.02em',
      flexShrink: 0, fontFamily: 'Geist Mono, monospace',
    }}>
      {tag.slice(0, 2)}
    </div>
  );
}

function Badge({ children, tone = 'neutral', dot }: { children: React.ReactNode; tone?: string; dot?: boolean }) {
  const tones: Record<string, { bg: string; fg: string; dot: string }> = {
    neutral: { bg: 'var(--paper-3)',    fg: 'var(--ink-2)',  dot: 'var(--ink-3)' },
    blue:    { bg: 'var(--blue-soft)',  fg: 'var(--blue)',   dot: 'var(--blue)' },
    green:   { bg: 'var(--green-soft)', fg: 'var(--green)',  dot: 'var(--green)' },
    amber:   { bg: 'var(--amber-soft)', fg: 'var(--amber)',  dot: 'var(--amber)' },
    rose:    { bg: 'var(--rose-soft)',  fg: 'var(--rose)',   dot: 'var(--rose)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '1px 7px', borderRadius: 999,
      background: t.bg, color: t.fg,
      fontSize: 10.5, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }} />}
      {children}
    </span>
  );
}

function Sparkline({ data, w = 96, h = 32, color = 'var(--blue)' }: { data: number[]; w?: number; h?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = Math.max(1, max - min);
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / rng) * (h - 4) - 2]);
  const d = 'M ' + pts.map(p => p.join(',')).join(' L ');
  const area = d + ` L ${w},${h} L 0,${h} Z`;
  const uidRef = useRef('sp-' + Math.random().toString(36).slice(2, 8));
  const uid = uidRef.current;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${uid})`} />
      <path d={d} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClientCard({
  account, stat, color, tag, onClick,
}: {
  account: Account; stat: AccountStat; color: AvatarColor; tag: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const spColor = color === 'violet' ? 'var(--violet)'
    : color === 'green'  ? 'var(--green)'
    : color === 'amber'  ? 'var(--amber)'
    : color === 'rose'   ? 'var(--rose)'
    : 'var(--blue)';

  const trendUp = stat.trend[stat.trend.length - 1] > stat.trend[0];
  const trendPct = Math.round(
    (stat.trend[stat.trend.length - 1] - stat.trend[0]) / Math.max(1, stat.trend[0]) * 100
  );

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 120ms, transform 120ms',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.12)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* Card top */}
      <div style={{ padding: 18, borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Avatar tag={tag} color={color} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{
                fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.005em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: 'var(--ink)',
              }}>
                {account.name}
              </div>
              {stat.status === 'attention'  && <Badge tone="amber" dot>Attention</Badge>}
              {stat.status === 'onboarding' && <Badge tone="blue"  dot>Onboarding</Badge>}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--ink-3)', marginTop: 2,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {/* pin icon */}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {stat.location || account.settings?.timezone || 'USA'}
              </span>
              <span style={{ color: 'var(--line-2)' }}>·</span>
              <span>{stat.listings} listings</span>
            </div>
          </div>
          <button
            style={{ padding: 4, color: 'var(--ink-3)', border: 'none', background: 'transparent', cursor: 'pointer' }}
            onClick={e => e.stopPropagation()}
          >
            {/* more icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 3-col stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
        <div style={{ padding: '0 18px', borderRight: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Leads 30d</div>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 16, fontWeight: 500, marginTop: 2, color: 'var(--ink)' }}>
            {fmtN(stat.leads30)}
          </div>
        </div>
        <div style={{ padding: '0 18px', borderRight: '1px solid var(--line)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>CPL</div>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 16, fontWeight: 500, marginTop: 2, color: 'var(--ink)' }}>
            {stat.hasMetaData ? '$' + stat.cpl.toFixed(2) : '—'}
          </div>
        </div>
        <div style={{ padding: '0 18px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>ROAS</div>
          <div style={{
            fontFamily: 'Geist Mono, monospace', fontSize: 16, fontWeight: 500, marginTop: 2,
            color: stat.hasMetaData
              ? (stat.roas >= 5 ? 'var(--green)' : stat.roas >= 4 ? 'var(--ink)' : 'var(--rose)')
              : 'var(--ink-3)',
          }}>
            {stat.hasMetaData ? stat.roas.toFixed(1) + '×' : '—'}
          </div>
        </div>
      </div>

      {/* Bottom: sparkline */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>Leads — last 6 mo</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
              {stat.leads30 > 0 ? fmtN(stat.trend.reduce((s, v) => s + v, 0)) + ' leads' : '—'}
            </span>
            {stat.trend.length >= 2 && stat.trend[0] > 0 && (
              <span style={{ fontSize: 11.5, color: trendUp ? 'var(--green)' : 'var(--rose)' }}>
                {trendUp ? '+' : ''}{trendPct}%
              </span>
            )}
          </div>
        </div>
        <Sparkline data={stat.trend} w={96} h={32} color={spColor} />
      </div>
    </div>
  );
}

function ClientTableRow({
  account, stat, color, tag, isLast, onClick,
}: {
  account: Account; stat: AccountStat; color: AvatarColor; tag: string; isLast: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--line)',
        cursor: 'pointer',
        background: hovered ? 'var(--paper-2)' : 'transparent',
        transition: 'background 80ms',
      }}
    >
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar tag={tag} color={color} size={28} />
          <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{account.name}</div>
        </div>
      </td>
      <td style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>
        {stat.location || account.settings?.timezone || '—'}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: 'var(--ink-2)' }}>
        {stat.listings}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: 'var(--ink-2)' }}>
        {fmtN(stat.leads30)}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: 'var(--ink-2)' }}>
        {stat.hasMetaData ? fmt$(stat.spend30, true) : '—'}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace', color: 'var(--ink-2)' }}>
        {stat.hasMetaData ? '$' + stat.cpl.toFixed(2) : '—'}
      </td>
      <td style={{
        padding: '12px 16px', textAlign: 'right', fontFamily: 'Geist Mono, monospace',
        color: stat.hasMetaData
          ? (stat.roas >= 5 ? 'var(--green)' : stat.roas >= 4 ? 'var(--ink)' : 'var(--rose)')
          : 'var(--ink-3)',
      }}>
        {stat.hasMetaData ? stat.roas.toFixed(1) + '×' : '—'}
      </td>
      <td style={{ padding: '12px 16px' }}>
        {stat.status === 'healthy'    && <Badge tone="green" dot>Healthy</Badge>}
        {stat.status === 'attention'  && <Badge tone="amber" dot>Attention</Badge>}
        {stat.status === 'onboarding' && <Badge tone="blue"  dot>Onboarding</Badge>}
      </td>
      <td style={{ padding: '12px 16px', color: 'var(--ink-3)', textAlign: 'right' }}>
        {/* chevron right */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </td>
    </tr>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SubaccountsOverviewProps {
  agencyAccount: Account;
  userId: string;
  clientAccounts: Account[];
  onEnterClient: (id: string) => void;
  onRefreshClients: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SubaccountsOverview({
  agencyAccount, userId, clientAccounts, onEnterClient, onRefreshClients,
}: SubaccountsOverviewProps) {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [sort, setSort] = useState('leads');
  const [showCreate, setShowCreate] = useState(false);
  const [stats, setStats] = useState<Record<string, AccountStat>>({});
  const [loading, setLoading] = useState(true);

  // ── Fetch real DB data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (clientAccounts.length === 0) { setLoading(false); return; }

    const realIds = clientAccounts.filter(a => !a.id.startsWith('mock-')).map(a => a.id);

    async function fetchStats() {
      const newStats: Record<string, AccountStat> = {};
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // For each real account, fetch contact counts + meta metrics
      await Promise.all(
        clientAccounts.map(async (account) => {
          const isMock = account.id.startsWith('mock-');

          if (isMock) {
            // Fallback for mock accounts
            const seed = Math.abs(
              account.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
            ) % 10;
            const leads30 = 120 + seed * 60;
            const trend = Array.from({ length: 6 }, (_, i) => Math.max(1, leads30 * (0.6 + i * 0.09)));
            newStats[account.id] = {
              leads30, spend30: 0, cpl: 0, roas: 0,
              status: 'onboarding', listings: seed * 8 + 4,
              location: '', trend, hasMetaData: false,
            };
            return;
          }

          // Real account: fetch contacts created in last 30 days
          const { count: leads30 } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', account.id)
            .gte('created_at', thirtyDaysAgo);

          // Fetch monthly contact counts for last 6 months (sparkline)
          const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: contactRows } = await supabase
            .from('contacts')
            .select('created_at')
            .eq('account_id', account.id)
            .gte('created_at', sixMonthsAgo)
            .order('created_at', { ascending: true });

          // Build 6-bucket trend
          const trend = Array.from({ length: 6 }, (_, i) => {
            const bucketStart = new Date(now.getTime() - (6 - i) * 30 * 24 * 60 * 60 * 1000);
            const bucketEnd   = new Date(now.getTime() - (5 - i) * 30 * 24 * 60 * 60 * 1000);
            return (contactRows || []).filter(r => {
              const d = new Date(r.created_at);
              return d >= bucketStart && d < bucketEnd;
            }).length;
          });

          // Fetch Meta ad metrics for last 30 days
          const { data: metaRows } = await supabase
            .from('meta_ad_metrics')
            .select('spend, impressions, clicks, conversions, roas')
            .eq('account_id', account.id)
            .gte('date', thirtyDaysAgo.slice(0, 10));

          const hasMetaData = !!(metaRows && metaRows.length > 0);
          const spend30 = hasMetaData
            ? metaRows!.reduce((s, r) => s + (r.spend || 0), 0)
            : 0;
          const roasAvg = hasMetaData
            ? metaRows!.reduce((s, r) => s + (r.roas || 0), 0) / metaRows!.length
            : 0;
          const l30 = leads30 ?? 0;
          const cpl = hasMetaData && spend30 > 0 && l30 > 0 ? spend30 / l30 : 0;

          // Determine status
          const status: AccountStat['status'] = l30 > 50
            ? 'healthy'
            : l30 > 10
            ? 'onboarding'
            : 'attention';

          newStats[account.id] = {
            leads30: l30,
            spend30,
            cpl,
            roas: roasAvg,
            status,
            listings: 0,
            location: account.settings?.timezone || '',
            trend: trend.every(v => v === 0) ? [1, 1, 1, 1, 1, 1] : trend,
            hasMetaData,
          };
        })
      );

      setStats(newStats);
      setLoading(false);
    }

    void fetchStats();
  }, [clientAccounts]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const allStats = clientAccounts.map(a => stats[a.id]).filter(Boolean) as AccountStat[];
  const totalLeads = allStats.reduce((s, c) => s + c.leads30, 0);
  const totalSpend = allStats.reduce((s, c) => s + c.spend30, 0);
  const hasAnyMeta = allStats.some(c => c.hasMetaData);
  const avgCpl  = hasAnyMeta && totalLeads > 0 ? totalSpend / totalLeads : 0;
  const metaAccounts = allStats.filter(c => c.hasMetaData);
  const avgRoas = metaAccounts.length > 0
    ? metaAccounts.reduce((s, c) => s + c.roas, 0) / metaAccounts.length
    : 0;

  // ── Sorted list ────────────────────────────────────────────────────────────
  const sorted = [...clientAccounts]
    .map(a => ({
      account: a,
      stat: stats[a.id] ?? {
        leads30: 0, spend30: 0, cpl: 0, roas: 0,
        status: 'onboarding' as const, listings: 0, location: '',
        trend: [1, 1, 1, 1, 1, 1], hasMetaData: false,
      },
      color: stringToColor(a.id),
      tag: accountTag(a.name),
    }))
    .sort((a, b) => {
      if (sort === 'leads') return b.stat.leads30 - a.stat.leads30;
      if (sort === 'spend') return b.stat.spend30 - a.stat.spend30;
      if (sort === 'roas')  return b.stat.roas  - a.stat.roas;
      return a.account.name.localeCompare(b.account.name);
    });

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }}>

      {/* ── Hero Banner ────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 16,
        padding: '28px 28px 24px',
        background: 'var(--grad-soft)',
        border: '1px solid var(--line)',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Orb 1 */}
        <div style={{
          position: 'absolute', right: -60, top: -60,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(60% 0.22 295 / 0.12), transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Orb 2 */}
        <div style={{
          position: 'absolute', right: 80, bottom: -100,
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(58% 0.18 258 / 0.12), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Hero top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, position: 'relative' }}>
          <Avatar tag="NX" color="grad" size={48} />
          <div>
            <div style={{
              fontSize: 11.5, color: 'var(--ink-3)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              fontWeight: 500, marginBottom: 4,
              fontFamily: 'Geist Mono, monospace',
            }}>
              NEXORRA HQ · AGENCY ROLLUP
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              {clientAccounts.length} client workspaces
              <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 8 }}>
                / {monthLabel}
              </span>
            </h1>
          </div>
        </div>

        {/* 4-KPI strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--line)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          overflow: 'hidden',
          marginTop: 20,
        }}>
          {[
            {
              l: 'Leads / 30d',
              v: loading ? '…' : fmtN(totalLeads),
              d: null,
            },
            {
              l: 'Ad spend / 30d',
              v: loading ? '…' : hasAnyMeta ? fmt$(totalSpend, true) : '—',
              d: null,
            },
            {
              l: 'Blended CPL',
              v: loading ? '…' : hasAnyMeta && avgCpl > 0 ? '$' + avgCpl.toFixed(2) : '—',
              d: null,
            },
            {
              l: 'Portfolio ROAS',
              v: loading ? '…' : metaAccounts.length > 0 ? avgRoas.toFixed(1) + '×' : '—',
              d: null,
            },
          ].map((k, i) => (
            <div key={i} style={{ background: 'var(--paper)', padding: '16px 20px' }}>
              <div style={{
                fontSize: 11.5, color: 'var(--ink-3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500,
              }}>
                {k.l}
              </div>
              <div style={{
                fontFamily: 'Geist Mono, monospace',
                fontSize: 22, fontWeight: 500, marginTop: 6,
                letterSpacing: '-0.01em', color: 'var(--ink)',
              }}>
                {k.v}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                vs last 30d
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
            Client subaccounts
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
            Click any workspace to enter it.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Cards / Table toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: 2,
          }}>
            <button
              onClick={() => setView('cards')}
              style={{
                padding: '5px 10px', fontSize: 12.5, borderRadius: 6,
                background: view === 'cards' ? 'var(--paper)' : 'transparent',
                color: view === 'cards' ? 'var(--ink)' : 'var(--ink-3)',
                border: view === 'cards' ? '1px solid var(--line)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer',
              }}
            >
              {/* grid-2x2 icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Cards
            </button>
            <button
              onClick={() => setView('table')}
              style={{
                padding: '5px 10px', fontSize: 12.5, borderRadius: 6,
                background: view === 'table' ? 'var(--paper)' : 'transparent',
                color: view === 'table' ? 'var(--ink)' : 'var(--ink-3)',
                border: view === 'table' ? '1px solid var(--line)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer',
              }}
            >
              {/* list icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Table
            </button>
          </div>

          {/* Sort select */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              padding: '7px 10px', fontSize: 12.5,
              border: '1px solid var(--line)',
              background: 'var(--paper)',
              borderRadius: 8, outline: 'none',
              color: 'var(--ink)',
            }}
          >
            <option value="leads">Sort: Leads</option>
            <option value="spend">Sort: Spend</option>
            <option value="roas">Sort: ROAS</option>
            <option value="name">Sort: Name</option>
          </select>

          {/* New client button */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--grad)', color: 'white',
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              borderRadius: 8, border: 'none', cursor: 'pointer',
            }}
          >
            {/* plus icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New client
          </button>
        </div>
      </div>

      {/* ── Cards view ────────────────────────────────────────────────────── */}
      {view === 'cards' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>
          {sorted.map(({ account, stat, color, tag }) => (
            <ClientCard
              key={account.id}
              account={account}
              stat={stat}
              color={color}
              tag={tag}
              onClick={() => onEnterClient(account.id)}
            />
          ))}
        </div>
      )}

      {/* ── Table view ────────────────────────────────────────────────────── */}
      {view === 'table' && (
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 860 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid var(--line)' }}>
                {['Workspace', 'Location', 'Listings', 'Leads', 'Spend', 'CPL', 'ROAS', 'Status', ''].map((hd, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: (i >= 2 && i <= 6) ? 'right' : 'left',
                      padding: '11px 16px',
                      fontSize: 11.5, fontWeight: 500,
                      color: 'var(--ink-3)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}
                  >
                    {hd}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ account, stat, color, tag }, i) => (
                <ClientTableRow
                  key={account.id}
                  account={account}
                  stat={stat}
                  color={color}
                  tag={tag}
                  isLast={i === sorted.length - 1}
                  onClick={() => onEnterClient(account.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create modal ──────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateSubAccountModal
          agencyId={agencyAccount.id}
          userId={userId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); onRefreshClients(); }}
        />
      )}
    </div>
  );
}
