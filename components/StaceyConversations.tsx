'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 1s linear infinite' : undefined }}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
}
function IconFilter() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconChevronUp() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconBarChart() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ─── Spin keyframe (injected once) ───────────────────────────────────────────

const SPIN_STYLE = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

// ─── Email Analytics Types ───────────────────────────────────────────────────

interface EmailAnalytics {
  totals: {
    sent: number;
    opened: number;
    replied: number;
    bounced: number;
    open_rate: number;
    reply_rate: number;
  };
  variants: Array<{
    id: string;
    name: string;
    booking_rate: number;
    reply_rate: number;
    times_sent: number;
  }>;
  conversationOutcomes: Record<string, number>;
}

// ─── Inline Analytics Bar ────────────────────────────────────────────────────

function EmailAnalyticsBar() {
  const [data, setData] = useState<EmailAnalytics | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch('/api/analytics/email-performance?days=7')
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(json => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const v = (n: number | undefined) => (n == null || loading) ? '-' : n.toLocaleString();
  const pct = (n: number | undefined) => (n == null || loading) ? '-' : `${(n * 100).toFixed(1)}%`;

  const outcomes = data?.conversationOutcomes || {};
  const totalConvos = Object.values(outcomes).reduce((a, b) => a + b, 0);
  const topVariants = (data?.variants || []).slice(0, 3);

  return (
    <div style={{ marginBottom: 16 }}>
      <style>{SPIN_STYLE}</style>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--ink-3)',
          fontSize: 12, fontWeight: 500,
        }}
      >
        <IconBarChart />
        {expanded ? 'Hide Analytics' : 'Show Analytics'}
        {expanded ? <IconChevronUp /> : <IconChevronDown />}
      </button>

      {expanded && (
        <div style={{
          marginTop: 8, background: 'var(--paper-2)', border: '1px solid var(--line)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          {error ? (
            <p style={{ fontSize: 12, color: 'var(--rose)', textAlign: 'center', padding: '8px 0' }}>Failed to load analytics</p>
          ) : (
            <>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Sent', value: v(data?.totals.sent), color: 'var(--ink)' },
                  { label: `Opened (${pct(data?.totals.open_rate)})`, value: v(data?.totals.opened), color: 'var(--ink)' },
                  { label: `Replied (${pct(data?.totals.reply_rate)})`, value: v(data?.totals.replied), color: 'var(--blue)' },
                  { label: 'Bounced', value: v(data?.totals.bounced), color: 'var(--rose)' },
                ].map(s => (
                  <div key={s.label} style={{
                    background: 'var(--paper-3)', borderRadius: 8,
                    padding: '10px 12px', border: '1px solid var(--line)',
                  }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '2px 0 0', fontFamily: 'Geist Mono, monospace' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Conversation outcomes */}
              <div style={{
                background: 'var(--paper-3)', borderRadius: 8, padding: '10px 12px',
                border: '1px solid var(--line)', marginBottom: 10,
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', margin: '0 0 8px', fontFamily: 'Geist Mono, monospace' }}>
                  CONVERSATIONS ({v(totalConvos || undefined)})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { key: 'needs_reply', label: 'Needs Reply', bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)' },
                    { key: 'replied', label: 'Replied', bg: 'rgba(59,130,246,0.12)', color: 'var(--blue)' },
                    { key: 'booked', label: 'Booked', bg: 'rgba(34,197,94,0.12)', color: 'var(--green)' },
                    { key: 'ghosted', label: 'Ghosted', bg: 'var(--paper-2)', color: 'var(--ink-4)' },
                    { key: 'rejected', label: 'Rejected', bg: 'rgba(239,68,68,0.1)', color: 'var(--rose)' },
                  ].map(s => (
                    <span key={s.key} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: s.bg, color: s.color,
                    }}>
                      {s.label}: {loading ? '-' : (outcomes[s.key] || 0)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Top variants */}
              {topVariants.length > 0 && (
                <div style={{
                  background: 'var(--paper-3)', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid var(--line)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ color: 'var(--amber)' }}><IconTrophy /></span>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', margin: 0, fontFamily: 'Geist Mono, monospace' }}>TOP VARIANTS (by booking rate)</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {topVariants.map((vr, i) => (
                      <div key={vr.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', width: 16, flexShrink: 0, fontFamily: 'Geist Mono, monospace' }}>{i + 1}.</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vr.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', flexShrink: 0, fontFamily: 'Geist Mono, monospace' }}>
                          {(vr.booking_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sent_at: string;
}

interface Conversation {
  id: string;
  lead_email: string;
  campaign_id: string;
  campaign_name: string | null;
  timezone: string | null;
  instantly_email_acct: string | null;
  sender_name: string | null;
  status: 'active' | 'needs_reply' | 'replied' | 'booked' | 'ghosted' | 'rejected';
  calendly_booked: boolean;
  booking_link_sent: boolean;
  last_reply_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  latest_message: ConversationMessage | null;
  lead: {
    full_name: string;
    source_brokerage: string;
    city: string;
    state_province: string;
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  needs_reply: 'Needs Reply',
  replied: 'Replied',
  booked: 'Booked',
  ghosted: 'Ghosted',
  rejected: 'Rejected',
  active: 'Active',
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  needs_reply: { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)' },
  replied:     { bg: 'rgba(59,130,246,0.12)', color: 'var(--blue)' },
  booked:      { bg: 'rgba(34,197,94,0.12)',  color: 'var(--green)' },
  ghosted:     { bg: 'var(--paper-3)',         color: 'var(--ink-4)' },
  rejected:    { bg: 'rgba(239,68,68,0.1)',   color: 'var(--rose)' },
  active:      { bg: 'rgba(139,92,246,0.12)', color: 'var(--violet)' },
};

const TZ_BADGE: Record<string, { bg: string; color: string }> = {
  EST: { bg: 'rgba(59,130,246,0.12)',  color: 'var(--blue)' },
  CST: { bg: 'rgba(34,197,94,0.12)',   color: 'var(--green)' },
  MST: { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)' },
  PST: { bg: 'rgba(139,92,246,0.12)', color: 'var(--violet)' },
};

const PAGE_SIZE = 50;

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] || { bg: 'var(--paper-3)', color: 'var(--ink-3)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
      fontFamily: 'Geist Mono, monospace',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 0,
    }}>
      <p style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--ink)', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '4px 0 0', fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaceyConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ConversationMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('needs_reply');
  const [filterTimezone, setFilterTimezone] = useState('');

  // KPI data from analytics
  const [kpi, setKpi] = useState<{ sent: number; openRate: number; replyRate: number; meetings: number } | null>(null);

  useEffect(() => {
    fetch('/api/analytics/email-performance?days=30')
      .then(r => r.json())
      .then(d => {
        if (d?.totals) {
          setKpi({
            sent: d.totals.sent || 0,
            openRate: d.totals.open_rate || 0,
            replyRate: d.totals.reply_rate || 0,
            meetings: (d.conversationOutcomes?.booked) || 0,
          });
        }
      }).catch(() => {});
  }, []);

  const fetchConversations = useCallback(async (off = 0) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(off) });
    if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
    if (filterTimezone) params.set('timezone', filterTimezone);
    try {
      const res = await fetch(`/api/conversations?${params}`);
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations || []);
        setTotal(json.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterTimezone]);

  useEffect(() => {
    setOffset(0);
    setSelectedId(null);
    fetchConversations(0);
  }, [filterStatus, filterTimezone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConversations(offset);
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const openThread = async (conv: Conversation) => {
    setSelectedId(conv.id);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}/messages`);
      if (res.ok) {
        const json = await res.json();
        setThread(json.messages || []);
      }
    } finally {
      setThreadLoading(false);
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const kpiFmt = (n: number | null | undefined, pct = false) => {
    if (n == null) return '—';
    if (pct) return `${(n * 100).toFixed(1)}%`;
    return n.toLocaleString();
  };

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <style>{SPIN_STYLE}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Email Campaigns</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '4px 0 0' }}>
            Cold outreach sequences powered by Instantly + Gmail rotation.
          </p>
        </div>
        <button
          onClick={() => fetchConversations(offset)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)',
            background: 'var(--paper)', color: 'var(--ink-3)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <IconRefresh spinning={loading} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Sent (30d)" value={kpiFmt(kpi?.sent)} />
        <KpiCard label="Open rate" value={kpiFmt(kpi?.openRate, true)} accent="var(--blue)" />
        <KpiCard label="Reply rate" value={kpiFmt(kpi?.replyRate, true)} accent="var(--violet)" />
        <KpiCard label="Meetings booked" value={kpiFmt(kpi?.meetings)} accent="var(--green)" />
      </div>

      {/* Analytics Bar */}
      <EmailAnalyticsBar />

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ color: 'var(--ink-4)' }}><IconFilter /></span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['needs_reply', 'replied', 'booked', 'ghosted', 'rejected', 'all'].map(s => {
            const active = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '5px 12px', borderRadius: 7, border: '1px solid ' + (active ? 'var(--blue)' : 'transparent'),
                  background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--ink-3)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'Geist Mono, monospace',
                }}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
        <select
          value={filterTimezone}
          onChange={e => setFilterTimezone(e.target.value)}
          style={{
            marginLeft: 'auto', padding: '5px 10px', borderRadius: 7,
            border: '1px solid var(--line)', background: 'var(--paper-2)',
            color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'Geist Mono, monospace',
          }}
        >
          <option value="">All Timezones</option>
          {['EST', 'CST', 'MST', 'PST'].map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Split view */}
      <div style={{
        display: 'flex', gap: 12,
        height: 'calc(100dvh - 18rem)',
        overflow: 'hidden',
      }}>
        {/* Conversation list */}
        <div style={{
          display: selectedId ? 'none' : 'flex',
          flexDirection: 'column',
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
          overflow: 'hidden', flex: 1, minWidth: 0,
        }}
          className={selectedId ? 'hidden-on-mobile list-panel' : 'list-panel'}
        >
          {/* Make it visible on md+ when panel is selected */}
          <style>{`
            @media (min-width: 768px) {
              .list-panel { display: flex !important; width: 420px !important; flex-shrink: 0 !important; flex: unset !important; }
            }
          `}</style>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>LEAD</th>
                  {!selectedId && (
                    <>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>PREVIEW</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>TZ</th>
                    </>
                  )}
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>STATUS</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>LAST REPLY</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={selectedId ? 3 : 5} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <IconRefresh spinning />
                        <span style={{ fontSize: 13 }}>Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={selectedId ? 3 : 5} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ opacity: 0.3 }}><IconMail /></span>
                        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--ink-3)' }}>No conversations</p>
                        <p style={{ fontSize: 12, margin: 0 }}>Replies from Instantly will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  conversations.map(conv => {
                    const isSelected = selectedId === conv.id;
                    return (
                      <tr
                        key={conv.id}
                        onClick={() => openThread(conv)}
                        style={{
                          borderBottom: '1px solid var(--line)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--paper-3)' : undefined,
                          borderLeft: isSelected ? '2px solid var(--blue)' : '2px solid transparent',
                        }}
                      >
                        <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                          <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {conv.lead?.full_name || conv.lead_email.split('@')[0]}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lead_email}</p>
                          {conv.lead?.city && (
                            <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {conv.lead.city}, {conv.lead.state_province}
                            </p>
                          )}
                        </td>

                        {!selectedId && (
                          <>
                            <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                              {conv.latest_message ? (
                                <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {conv.latest_message.content.slice(0, 120)}
                                </p>
                              ) : (
                                <span style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>No messages yet</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {conv.timezone ? (() => {
                                const tz = TZ_BADGE[conv.timezone];
                                return tz ? (
                                  <span style={{
                                    padding: '2px 7px', borderRadius: 20, fontSize: 11,
                                    fontWeight: 600, background: tz.bg, color: tz.color,
                                    fontFamily: 'Geist Mono, monospace',
                                  }}>{conv.timezone}</span>
                                ) : null;
                              })() : <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>—</span>}
                            </td>
                          </>
                        )}

                        <td style={{ padding: '10px 14px' }}>
                          <StatusBadge status={conv.status} />
                          {conv.calendly_booked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, color: 'var(--green)', fontSize: 11 }}>
                              <IconCheck /> cal
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap', fontFamily: 'Geist Mono, monospace' }}>
                            <IconClock />
                            {timeAgo(conv.last_reply_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderTop: '1px solid var(--line)', flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  style={{
                    padding: 6, borderRadius: 6, border: '1px solid var(--line)',
                    background: 'var(--paper-2)', color: 'var(--ink-3)',
                    cursor: offset === 0 ? 'not-allowed' : 'pointer',
                    opacity: offset === 0 ? 0.3 : 1,
                  }}
                >
                  <IconChevronLeft />
                </button>
                <span style={{ fontSize: 11, color: 'var(--ink-4)', padding: '0 8px', fontFamily: 'Geist Mono, monospace' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  style={{
                    padding: 6, borderRadius: 6, border: '1px solid var(--line)',
                    background: 'var(--paper-2)', color: 'var(--ink-3)',
                    cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer',
                    opacity: offset + PAGE_SIZE >= total ? 0.3 : 1,
                  }}
                >
                  <IconChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Thread panel */}
        {selectedId && selectedConv && (
          <div style={{
            flex: 1, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
            overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0,
          }}>
            {/* Thread header */}
            <div style={{
              flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--line)', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => { setSelectedId(null); setThread([]); }}
                  style={{
                    padding: 4, borderRadius: 6, border: '1px solid var(--line)',
                    background: 'var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <IconChevronLeft />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedConv.lead?.full_name || selectedConv.lead_email}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedConv.lead_email}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                    <StatusBadge status={selectedConv.status} />
                    {selectedConv.timezone && (() => {
                      const tz = TZ_BADGE[selectedConv.timezone];
                      return tz ? (
                        <span style={{
                          padding: '2px 7px', borderRadius: 20, fontSize: 11,
                          fontWeight: 600, background: tz.bg, color: tz.color,
                          fontFamily: 'Geist Mono, monospace',
                        }}>{selectedConv.timezone}</span>
                      ) : null;
                    })()}
                    {selectedConv.calendly_booked && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
                      }}>
                        <IconCheck /> Booked
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedId(null); setThread([]); }}
                style={{
                  padding: 6, borderRadius: 6, border: '1px solid var(--line)',
                  background: 'var(--paper-2)', color: 'var(--ink-4)', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <IconX />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {threadLoading ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <IconRefresh spinning />
                    <span style={{ fontSize: 13 }}>Loading thread…</span>
                  </div>
                </div>
              ) : thread.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-4)', padding: '32px 0' }}>
                  No messages in this thread yet
                </p>
              ) : (
                thread.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{
                      maxWidth: '85%',
                      background: msg.direction === 'outbound' ? 'rgba(59,130,246,0.12)' : 'var(--paper-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 12, padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px 8px', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, fontFamily: 'Geist Mono, monospace' }}>
                          {msg.direction === 'outbound'
                            ? (msg.sender_name || selectedConv.sender_name || 'Stacey')
                            : (selectedConv.lead?.full_name || msg.sender_email || selectedConv.lead_email)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap', fontFamily: 'Geist Mono, monospace' }}>
                          {new Date(msg.sent_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--ink)' }}>{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px', borderTop: '1px solid var(--line)', flexShrink: 0,
              background: 'var(--paper-2)',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                  Campaign: {selectedConv.campaign_name || selectedConv.campaign_id}
                </span>
                {selectedConv.instantly_email_acct && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    From: {selectedConv.instantly_email_acct}
                  </span>
                )}
                {selectedConv.booking_link_sent && (
                  <span style={{ color: 'var(--blue)', whiteSpace: 'nowrap' }}>Calendly link sent</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
