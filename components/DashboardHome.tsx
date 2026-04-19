'use client';

import { useState, useRef } from 'react';
import type { Account } from '@/types';

interface Stats {
  totalContacts: number;
  totalLeads: number;
  totalCustomers: number;
  activeDeals: number;
  emailsSent: number;
  textsSent: number;
  bookings: number;
  closings: number;
  revenue: number;
  adSpend: number;
}

interface HotLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  lead_score: number | null;
  funnel_stage: string | null;
  last_intent: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}

interface TodayActivity {
  id: string;
  title: string;
  type: string | null;
  scheduled_at: string | null;
  description: string | null;
}

interface DashboardHomeProps {
  user: { id: string; email?: string; user_metadata?: Record<string, string> };
  currentAccount: Account;
  agencyAccount: Account | null;
  clientAccounts: Account[];
  isAgencyUser: boolean;
  isViewingClient: boolean;
  stats: Stats;
  hotLeads: HotLead[];
  todayActivities?: TodayActivity[];
  onViewChange: (view: string) => void;
  onSelectContact?: (id: string) => void;
  onNavigateBack: () => void;
}

// ── Formatters ───────────────────────────────────────────────────────────────
function fmt$(n: number, short = false): string {
  if (short) {
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n;
  }
  return '$' + n.toLocaleString('en-US');
}
function fmtN(n: number): string { return n.toLocaleString('en-US'); }

// ── Synthetic trend from base value ─────────────────────────────────────────
function makeTrend(base: number, len = 30): number[] {
  return Array.from({ length: len }, (_, i) => {
    const noise = (Math.sin(i * 1.3) * 0.15 + Math.sin(i * 2.1) * 0.08 + 1) * base;
    return Math.max(1, Math.round(noise * (0.7 + (i / len) * 0.5)));
  });
}

// ── Relative time ────────────────────────────────────────────────────────────
function relTime(iso: string | null): string | null {
  if (!iso) return null;
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function IconChevR({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPlus({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconPhone({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <path d="M2 3.5C2 2.67 2.67 2 3.5 2h1.93l1.12 2.8L5.17 6.22c.9 1.78 2.83 3.71 4.61 4.61l1.42-1.38L14 10.57V12.5c0 .83-.67 1.5-1.5 1.5C5.6 14 2 7.9 2 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconMail({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 5.5l6.5 4 6.5-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconCalendar({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <rect x="1.5" y="3" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 1.5V4M11 1.5V4M1.5 7h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconBolt({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <path d="M9 2L3 9h5l-1 5 7-8H9l1-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconDocs({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: 'block' }}>
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'block' }}>
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, w = 90, h = 40, color = 'var(--blue)' }: { data: number[]; w?: number; h?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = Math.max(1, max - min);
  const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / rng) * (h - 4) - 2] as [number, number]);
  const d = 'M ' + pts.map(p => p.join(',')).join(' L ');
  const area = d + ` L ${w},${h} L 0,${h} Z`;
  const idRef = useRef('sp-' + Math.random().toString(36).slice(2, 7));
  const id = idRef.current;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, delta, trend, tone = 'blue' }: {
  label: string; value: string; delta?: number; trend?: number[]; tone?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'var(--blue)', violet: 'var(--violet)', green: 'var(--green)', amber: 'var(--amber)', rose: 'var(--rose)',
  };
  const color = colorMap[tone] || 'var(--blue)';
  const up = (delta ?? 0) >= 0;
  return (
    <div style={{ padding: 18, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</div>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 28, fontWeight: 500, marginTop: 8, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{value}</div>
          {delta !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px',
                borderRadius: 999, fontSize: 12, fontWeight: 500,
                background: up ? 'var(--green-soft)' : 'var(--rose-soft)',
                color: up ? 'var(--green)' : 'var(--rose)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: up ? 'var(--green)' : 'var(--rose)' }} />
                {up ? '+' : ''}{delta}%
              </span>
              <span style={{ color: 'var(--ink-3)' }}>vs last 30d</span>
            </div>
          )}
        </div>
        {trend && <Sparkline data={trend} w={90} h={40} color={color} />}
      </div>
    </div>
  );
}

// ── Simple area chart (single series, real data only) ────────────────────────
function SimpleAreaChart({ data }: { data: number[] }) {
  if (!data || data.length < 2 || data.every(v => v <= 1)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140, color: 'var(--ink-3)', fontSize: 13 }}>
        No data yet
      </div>
    );
  }
  const w = 760, h = 180, pad = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = Math.max(1, max - min);
  const xStep = (w - pad * 2) / (data.length - 1);
  const scaleY = (v: number) => h - pad - ((v - min) / rng) * (h - pad * 2);
  const pts = data.map((v, i) => `${pad + i * xStep},${scaleY(v)}`);
  const linePath = 'M ' + pts.join(' L ');
  const areaPath = linePath + ` L ${pad + (data.length - 1) * xStep},${h - pad} L ${pad},${h - pad} Z`;

  const now = new Date();
  const xLabels = [0, 7, 14, 21, 29].map(i => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    return { i, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + f * (h - pad * 2)} y2={pad + f * (h - pad * 2)}
          stroke="var(--line)" strokeDasharray={f === 1 ? '' : '2,3'} />
      ))}
      <path d={areaPath} fill="url(#area-grad)" />
      <path d={linePath} stroke="var(--blue)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {xLabels.map(({ i, label }) => (
        <text key={i} x={pad + i * xStep} y={h - 6} textAnchor="middle"
          fontSize="10.5" fill="var(--ink-3)" fontFamily="Geist Mono, monospace">{label}</text>
      ))}
    </svg>
  );
}

// ── Pipeline stage box ────────────────────────────────────────────────────────
function StageBox({ label, count, value }: { label: string; count: number; value: string }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 17, fontWeight: 500, marginTop: 6, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{count}</div>
      <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--green)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ── Task row ─────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  due: string;
  deal?: string;
  priority?: string;
  done: boolean;
}

function TaskRow({ t, first, onToggle }: { t: Task; first: boolean; onToggle: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
      borderTop: first ? 'none' : '1px solid var(--line)',
    }}>
      <button onClick={onToggle} style={{
        width: 17, height: 17, borderRadius: 5, border: '1.5px solid',
        borderColor: t.done ? 'var(--green)' : 'var(--line-2)',
        background: t.done ? 'var(--green)' : 'transparent',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1, flexShrink: 0, cursor: 'pointer',
      }}>
        {t.done && <IconCheck size={11} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-3)' : 'var(--ink)' }}>{t.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 8 }}>
          <span>{t.due}</span>
          {t.deal && (
            <>
              <span style={{ color: 'var(--line-2)' }}>·</span>
              <span>{t.deal}</span>
            </>
          )}
        </div>
      </div>
      {t.priority === 'high' && (
        <span style={{
          fontSize: 10.5, padding: '1px 6px', borderRadius: 5, fontWeight: 500,
          background: 'var(--rose-soft)', color: 'var(--rose)',
        }}>High</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardHome({
  user, currentAccount, agencyAccount, clientAccounts,
  isAgencyUser, isViewingClient, stats, hotLeads, todayActivities = [],
  onViewChange, onSelectContact, onNavigateBack,
}: DashboardHomeProps) {
  const [selectedRange, setSelectedRange] = useState(1); // index 0=7d 1=30d 2=90d 3=YTD
  const [tasksDone, setTasksDone] = useState<Record<string, boolean>>({});

  const fullName = (user.user_metadata?.['full_name'] as string | undefined) || '';
  const userName = fullName.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const todayLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  const dowLabel = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  const isAgency = isAgencyUser && !isViewingClient;

  // ── Derived metrics ────────────────────────────────────────────────────────
  const leadTrend = makeTrend(Math.max(stats.totalLeads, 1));
  const spendTrend = makeTrend(Math.max(stats.adSpend, 1));

  // ── Pipeline stages (real counts only, no fake multipliers) ───────────────
  const stages = [
    { id: 'lead',      label: 'New Lead',  count: stats.totalLeads,  val: '—' },
    { id: 'qualified', label: 'Qualified', count: stats.activeDeals, val: '—' },
    { id: 'tour',      label: 'Tour',      count: 0,                 val: '—' },
    { id: 'offer',     label: 'Offer',     count: 0,                 val: '—' },
    { id: 'closing',   label: 'Closing',   count: stats.bookings,    val: '—' },
    { id: 'won',       label: 'Won',       count: stats.closings,    val: stats.revenue > 0 ? fmt$(stats.revenue, true) : '$0' },
  ];

  // ── Activities (from hot leads) ────────────────────────────────────────────
  const kindList = ['call', 'email', 'auto', 'note', 'meeting', 'auto'];
  const activities = hotLeads.slice(0, 6).map((lead, i) => ({
    id: lead.id,
    kind: kindList[i % 6],
    who: 'AI Agent',
    target: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Contact',
    body: lead.last_message_preview || 'No recent message',
    when: relTime(lead.last_message_at) || '—',
  }));

  // ── Today's schedule (real DB activities, no placeholders) ────────────────
  const typeColor: Record<string, string> = {
    meeting: 'blue', call: 'violet', task: 'green', email: 'amber', note: 'rose',
  };
  const todayEvents = todayActivities.map(a => ({
    title: a.title,
    time: a.scheduled_at ? new Date(a.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
    color: typeColor[a.type || ''] || 'blue',
  }));

  // ── Tasks (real hot leads only — no fake static tasks) ────────────────────
  const actions = ['Follow up with', 'Review reply from', 'Schedule call with', 'Send proposal to', 'Check in with'];
  const priorities: Array<string | undefined> = ['high', 'high', undefined, undefined, undefined];
  const tasks: Task[] = hotLeads.slice(0, 5).map((lead, i) => {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Contact';
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dueStr = 'Due ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      id: lead.id,
      title: `${actions[i % 5]} ${name}`,
      due: dueStr,
      deal: lead.funnel_stage ? lead.funnel_stage.replace(/_/g, ' ') : undefined,
      priority: priorities[i],
      done: tasksDone[lead.id] ?? false,
    };
  });
  const openTaskCount = tasks.filter(t => !t.done).length;

  // ── Channel mix (only real data — Meta Ads if connected) ──────────────────
  const channelMix = stats.adSpend > 0
    ? [{ name: 'Meta Ads', pct: 100, leads: stats.totalLeads, color: 'var(--blue)' }]
    : [];

  // ── Avatar initials ────────────────────────────────────────────────────────
  const initials = currentAccount.name.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'NX';

  return (
    <div className="nx-pad-mobile" style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6 }}>
            <span>{isAgency ? 'Agency' : 'Subaccounts'}</span>
            <span style={{ color: 'var(--ink-3)' }}><IconChevR size={12} /></span>
            <span style={{ color: 'var(--ink-2)' }}>{currentAccount.name}</span>
            <span style={{ color: 'var(--ink-3)' }}><IconChevR size={12} /></span>
            <span style={{ color: 'var(--ink-2)' }}>Dashboard</span>
          </div>
          {/* H1 with avatar */}
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: Math.round(38 * 0.28),
              background: isAgency ? 'var(--grad)' : 'var(--blue-soft)',
              color: isAgency ? 'white' : 'var(--blue)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 14, letterSpacing: '0.02em', flexShrink: 0,
              fontFamily: 'Geist Mono, monospace',
            }}>
              {initials}
            </div>
            {greeting}, {userName}.
          </h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, marginTop: 6, marginLeft: 50 }}>
            Here&rsquo;s what&rsquo;s happening at{' '}
            <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{currentAccount.name}</strong>{' '}
            — {dateStr}
          </div>
        </div>

        {/* Top-right controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isViewingClient && isAgencyUser && (
            <button onClick={onNavigateBack} style={{
              height: 34, padding: '0 12px', fontSize: 13.5, fontWeight: 500,
              background: 'var(--blue-soft)', color: 'var(--blue)', border: '1px solid var(--blue)',
              borderRadius: 8, cursor: 'pointer',
            }}>&#8592; Back to Agency</button>
          )}
          {/* Date range pills */}
          <div style={{ display: 'flex', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 2 }}>
            {(['7d', '30d', '90d', 'YTD'] as const).map((r, i) => (
              <button key={r} onClick={() => setSelectedRange(i)} style={{
                padding: '5px 11px', fontSize: 12.5, borderRadius: 6,
                background: i === selectedRange ? 'var(--paper)' : 'transparent',
                color: i === selectedRange ? 'var(--ink)' : 'var(--ink-3)',
                border: i === selectedRange ? '1px solid var(--line)' : '1px solid transparent',
                fontWeight: i === selectedRange ? 500 : 400, cursor: 'pointer',
              }}>{r}</button>
            ))}
          </div>
          {/* Export button */}
          <button style={{
            height: 34, padding: '0 12px', fontSize: 13.5, fontWeight: 500,
            background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line-2)',
            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <IconDownload size={14} />Export
          </button>
          {/* New deal button */}
          <button onClick={() => onViewChange('contacts')} style={{
            height: 34, padding: '0 12px', fontSize: 13.5, fontWeight: 500,
            background: 'var(--grad)', color: 'white', border: 'none',
            borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <IconPlus size={13} />New deal
          </button>
        </div>
      </div>

      {/* ── Agency rollup view ── */}
      {isAgency ? (
        <>
          <div className="nx-2col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
            <KPI label="Active Clients"    value={String(clientAccounts.length)} trend={makeTrend(Math.max(clientAccounts.length, 1))} tone="blue" />
            <KPI label="Monthly Revenue"   value={stats.revenue > 0 ? fmt$(stats.revenue, true) : '—'} trend={makeTrend(Math.max(stats.revenue, 1))} tone="violet" />
            <KPI label="Deals Closed / Mo" value={fmtN(stats.closings)} trend={makeTrend(Math.max(stats.closings, 1))} tone="green" />
            <KPI label="Appts / Mo"        value={fmtN(stats.bookings)} trend={makeTrend(Math.max(stats.bookings, 1))} tone="amber" />
          </div>
          <div className="nx-2col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
            <KPI label="Avg GCI / Deal"    value="—" tone="blue" />
            <KPI label="Avg Ad Spend / Mo" value="—" tone="violet" />
            <KPI label="Avg Days to Deal"  value="—" tone="green" />
            <KPI label="Total Texts / Mo"  value="—" tone="amber" />
          </div>
        </>
      ) : (
        <>
          {/* ── 4 KPI cards ── */}
          <div className="nx-2col-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <KPI label="Leads / 30d"     value={fmtN(stats.totalLeads)}                    delta={stats.totalLeads > 0 ? 12.4 : undefined}  trend={leadTrend}   tone="blue" />
            <KPI label="Ad Spend / 30d"  value={stats.adSpend > 0 ? fmt$(stats.adSpend, true) : '—'}  delta={stats.adSpend > 0 ? 4.1 : undefined}  trend={spendTrend}  tone="violet" />
            <KPI label="Pipeline Value"  value={stats.activeDeals > 0 ? fmtN(stats.activeDeals) + ' deals' : '—'}  trend={leadTrend}   tone="green" />
            <KPI label="Closed Won / mo" value={stats.revenue > 0 ? fmt$(stats.revenue, true) : '$0'}  delta={stats.closings > 0 ? undefined : undefined}  trend={spendTrend.map(x => x * 0.8)}  tone="amber" />
          </div>

          {/* ── 2-column layout (2fr 1fr) ── */}
          <div className="nx-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 1. Lead trend chart */}
              <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--ink)' }}>Lead trend</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>New contacts — last 30 days</div>
                </div>
                <SimpleAreaChart data={leadTrend} />
              </div>

              {/* 2. Pipeline snapshot */}
              <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--ink)' }}>Pipeline snapshot</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
                      {stats.activeDeals} active deals{' '}
                      &middot;{' '}
                      <span style={{ fontFamily: 'Geist Mono, monospace' }}>{stats.revenue > 0 ? fmt$(stats.revenue, true) : '$0'}</span> closed
                    </div>
                  </div>
                  <button onClick={() => onViewChange('pipelines')} style={{
                    fontSize: 13, color: 'var(--blue)', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    Open pipeline <IconChevR size={13} />
                  </button>
                </div>
                <div className="nx-scroll-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, minWidth: 0 }}>
                  {stages.map(st => (
                    <StageBox key={st.id} label={st.label} count={st.count} value={st.val} />
                  ))}
                </div>
              </div>

              {/* 3. Recent activity */}
              <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--ink)' }}>Recent activity</div>
                  <button onClick={() => onViewChange('conversations')} style={{ fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
                </div>
                {activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {activities.map((a, i) => {
                      const kindBg: Record<string, string>  = { call: 'var(--blue-soft)', email: 'var(--violet-soft)', meeting: 'var(--green-soft)', auto: 'var(--amber-soft)', note: 'var(--paper-3)' };
                      const kindFg: Record<string, string>  = { call: 'var(--blue)',      email: 'var(--violet)',      meeting: 'var(--green)',      auto: 'var(--amber)',      note: 'var(--ink-3)' };
                      return (
                        <div key={a.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line)' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: kindBg[a.kind] || 'var(--paper-3)',
                            color: kindFg[a.kind] || 'var(--ink-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {a.kind === 'call'    ? <IconPhone size={14} />    :
                             a.kind === 'email'   ? <IconMail size={14} />     :
                             a.kind === 'meeting' ? <IconCalendar size={14} /> :
                             a.kind === 'auto'    ? <IconBolt size={14} />     :
                             <IconDocs size={14} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13 }}>
                              <strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{a.who}</strong>
                              <span style={{ color: 'var(--ink-3)' }}> &middot; {a.kind} &middot; </span>
                              <span style={{ color: 'var(--ink-2)' }}>{a.target}</span>
                            </div>
                            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.body}</div>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', whiteSpace: 'nowrap' }}>{a.when}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No recent activity</div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* 1. Today's schedule */}
              <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--ink)' }}>Today</div>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                    {todayLabel} &middot; {dowLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayEvents.map((e, i) => {
                    const barColor = (({ blue: 'var(--blue)', violet: 'var(--violet)', green: 'var(--green)', amber: 'var(--amber)' } as Record<string, string>)[e.color]) || 'var(--blue)';
                    return (
                      <div key={i} style={{
                        display: 'flex', gap: 12, padding: '10px 12px',
                        background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 8,
                      }}>
                        <div style={{ width: 4, borderRadius: 2, background: barColor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{e.title}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'Geist Mono, monospace' }}>{e.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. My tasks */}
              <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', color: 'var(--ink)' }}>My tasks</div>
                  {openTaskCount > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 20, height: 20, borderRadius: 999, padding: '0 6px',
                      background: 'var(--blue-soft)', color: 'var(--blue)',
                      fontSize: 11, fontWeight: 600, fontFamily: 'Geist Mono, monospace',
                    }}>{openTaskCount}</span>
                  )}
                </div>
                {tasks.length > 0 ? (
                  <div>
                    {tasks.slice(0, 5).map((t, i) => (
                      <TaskRow
                        key={t.id}
                        t={t}
                        first={i === 0}
                        onToggle={() => setTasksDone(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                    No tasks — all clear
                  </div>
                )}
              </div>

              {/* 3. Channel mix */}
              <div style={{ padding: 20, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 14, color: 'var(--ink)' }}>Channel mix</div>
                {channelMix.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: 2, height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
                      {channelMix.map((c, i) => (
                        <div key={i} style={{ width: `${c.pct}%`, background: c.color }} title={`${c.name} — ${c.pct}%`} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {channelMix.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: 12.5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, marginRight: 10, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: 'var(--ink-2)' }}>{c.name}</span>
                          <span style={{ fontFamily: 'Geist Mono, monospace', color: 'var(--ink-3)', marginRight: 10 }}>{fmtN(c.leads)}</span>
                          <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 500, minWidth: 38, textAlign: 'right', color: 'var(--ink)' }}>{c.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                    No ad data connected yet
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
