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

// ─── Spin keyframe ────────────────────────────────────────────────────────────
const SPIN_STYLE = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

// ─── Types ────────────────────────────────────────────────────────────────────

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
  daily: Array<{
    id: string;
    date: string;
    campaign_name: string;
    campaign_id: string;
    sent: number;
    opened: number;
    replied: number;
    bounced: number;
    status?: string;
  }>;
  conversationOutcomes: Record<string, number>;
}

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
  needs_reply: { bg: 'var(--amber-soft)', color: 'var(--amber)' },
  replied:     { bg: 'var(--blue-soft)',  color: 'var(--blue)' },
  booked:      { bg: 'var(--green-soft)', color: 'var(--green)' },
  ghosted:     { bg: 'var(--paper-3)',    color: 'var(--ink-3)' },
  rejected:    { bg: 'var(--rose-soft)',  color: 'var(--rose)' },
  active:      { bg: 'var(--violet-soft)', color: 'var(--violet)' },
};

const TZ_BADGE: Record<string, { bg: string; color: string }> = {
  EST: { bg: 'var(--blue-soft)',   color: 'var(--blue)' },
  CST: { bg: 'var(--green-soft)',  color: 'var(--green)' },
  MST: { bg: 'var(--amber-soft)',  color: 'var(--amber)' },
  PST: { bg: 'var(--violet-soft)', color: 'var(--violet)' },
};

const PAGE_SIZE = 50;
const MONO: React.CSSProperties = { fontFamily: 'Geist Mono, monospace' };

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
      ...MONO,
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{
      background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 12,
      padding: '18px 20px',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || 'var(--ink)', margin: 0, lineHeight: 1, ...MONO }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.07em', ...MONO }}>
        {label}
      </div>
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

  // Analytics data
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    setAnalyticsLoading(true);
    fetch('/api/analytics/email-performance?days=30')
      .then(r => r.json())
      .then(d => { setAnalytics(d); })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
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

  // KPI derivations
  const outcomes = analytics?.conversationOutcomes || {};
  const totalConvos = analyticsLoading ? '—' : Object.values(outcomes).reduce((a, b) => a + b, 0).toLocaleString();
  const hotCount = analyticsLoading ? '—' : (outcomes['booked'] || 0).toLocaleString();
  const notPushedCount = analyticsLoading ? '—' : (outcomes['needs_reply'] || 0).toLocaleString();

  // Unique brokerages from current page of conversations
  const uniqueBrokerages = Array.from(new Set(
    conversations.map(c => c.lead?.source_brokerage).filter(Boolean)
  )).length;

  // Build campaigns table from analytics daily data (group by campaign)
  const campaignMap: Record<string, { name: string; sent: number; opened: number; replied: number; status?: string; positive: number; booked: number }> = {};
  for (const row of (analytics?.daily || [])) {
    const key = row.campaign_id || row.campaign_name || 'Unknown';
    if (!campaignMap[key]) {
      campaignMap[key] = { name: row.campaign_name || key, sent: 0, opened: 0, replied: 0, status: row.status, positive: 0, booked: 0 };
    }
    campaignMap[key].sent += row.sent || 0;
    campaignMap[key].opened += row.opened || 0;
    campaignMap[key].replied += row.replied || 0;
  }
  const campaigns = Object.values(campaignMap);

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      <style>{SPIN_STYLE}</style>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, ...MONO, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Nexorra</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>Agency</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>Email Campaigns</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>Email Campaigns</h1>
        <button
          onClick={() => fetchConversations(offset)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)',
            background: 'var(--paper-2)', color: 'var(--ink-3)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <IconRefresh spinning={loading} />
          Refresh
        </button>
      </div>

      {/* KPI Cards — 4-col */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }} className="nx-2col-mobile">
        <KpiCard label="Total" value={totalConvos} />
        <KpiCard label="Hot / Sent to OpenPhone" value={hotCount} accent="var(--green)" />
        <KpiCard label="Not Pushed" value={notPushedCount} accent="var(--amber)" />
        <KpiCard label="Unique Brokerages" value={loading ? '—' : uniqueBrokerages} />
      </div>

      {/* Campaigns table */}
      {campaigns.length > 0 && (
        <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 80px 80px 80px 80px 80px', gap: 0, borderBottom: '1px solid var(--line)', background: 'var(--paper-3)' }}>
            {['Campaign', 'Status', 'Sent', 'Opens', 'Replies', 'Positive', 'Booked'].map(h => (
              <div key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', ...MONO }}>
                {h}
              </div>
            ))}
          </div>
          {campaigns.map((camp, i) => {
            const isActive = !camp.status || camp.status === 'active';
            const isLast = i === campaigns.length - 1;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 90px 80px 80px 80px 80px 80px', gap: 0, borderBottom: isLast ? 'none' : '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {camp.name}
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: isActive ? 'var(--green)' : 'var(--amber)', ...MONO }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--green)' : 'var(--amber)', display: 'inline-block', flexShrink: 0 }} />
                    {isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink)', ...MONO }}>{camp.sent.toLocaleString()}</div>
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink)', ...MONO }}>{camp.opened.toLocaleString()}</div>
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--blue)', ...MONO }}>{camp.replied.toLocaleString()}</div>
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--green)', ...MONO }}>{camp.positive.toLocaleString()}</div>
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--green)', fontWeight: 600, ...MONO }}>{camp.booked.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ color: 'var(--ink-3)' }}><IconFilter /></span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['needs_reply', 'replied', 'booked', 'ghosted', 'rejected', 'all'].map(s => {
            const active = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '5px 12px', borderRadius: 7,
                  border: `1px solid ${active ? 'var(--blue)' : 'transparent'}`,
                  background: active ? 'var(--blue-soft)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--ink-3)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  ...MONO,
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
            ...MONO,
          }}
        >
          <option value="">All Timezones</option>
          {['EST', 'CST', 'MST', 'PST'].map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Split view */}
      <div style={{ display: 'flex', gap: 12, height: 'calc(100dvh - 18rem)', overflow: 'hidden' }}>
        {/* Conversation list */}
        <div
          style={{
            display: selectedId ? 'none' : 'flex',
            flexDirection: 'column',
            background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14,
            overflow: 'hidden', flex: 1, minWidth: 0,
          }}
          className={selectedId ? 'hidden-on-mobile list-panel' : 'list-panel'}
        >
          <style>{`
            @media (min-width: 768px) {
              .list-panel { display: flex !important; width: 420px !important; flex-shrink: 0 !important; flex: unset !important; }
            }
          `}</style>

          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper-3)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-3)', fontSize: 11, ...MONO }}>LEAD</th>
                  {!selectedId && (
                    <>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-3)', fontSize: 11, ...MONO }}>PREVIEW</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-3)', fontSize: 11, ...MONO }}>TZ</th>
                    </>
                  )}
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-3)', fontSize: 11, ...MONO }}>STATUS</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 500, color: 'var(--ink-3)', fontSize: 11, ...MONO }}>LAST REPLY</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={selectedId ? 3 : 5} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <IconRefresh spinning />
                        <span style={{ fontSize: 13 }}>Loading…</span>
                      </div>
                    </td>
                  </tr>
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={selectedId ? 3 : 5} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ opacity: 0.3 }}><IconMail /></span>
                        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--ink-2)' }}>No conversations</p>
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
                          <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.lead_email}</p>
                          {conv.lead?.city && (
                            <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>No messages yet</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {conv.timezone ? (() => {
                                const tz = TZ_BADGE[conv.timezone];
                                return tz ? (
                                  <span style={{
                                    padding: '2px 7px', borderRadius: 20, fontSize: 11,
                                    fontWeight: 600, background: tz.bg, color: tz.color,
                                    ...MONO,
                                  }}>{conv.timezone}</span>
                                ) : null;
                              })() : <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>—</span>}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', ...MONO }}>
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
              <span style={{ fontSize: 11, color: 'var(--ink-3)', ...MONO }}>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  style={{
                    padding: 6, borderRadius: 6, border: '1px solid var(--line)',
                    background: 'var(--paper-3)', color: 'var(--ink-3)',
                    cursor: offset === 0 ? 'not-allowed' : 'pointer',
                    opacity: offset === 0 ? 0.3 : 1,
                  }}
                >
                  <IconChevronLeft />
                </button>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', padding: '0 8px', ...MONO }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  style={{
                    padding: 6, borderRadius: 6, border: '1px solid var(--line)',
                    background: 'var(--paper-3)', color: 'var(--ink-3)',
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
            flex: 1, background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14,
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
                    background: 'var(--paper-3)', color: 'var(--ink-3)', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <IconChevronLeft />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedConv.lead?.full_name || selectedConv.lead_email}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                          ...MONO,
                        }}>{selectedConv.timezone}</span>
                      ) : null;
                    })()}
                    {selectedConv.calendly_booked && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: 'var(--green-soft)', color: 'var(--green)',
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
                  background: 'var(--paper-3)', color: 'var(--ink-3)', cursor: 'pointer', flexShrink: 0,
                }}
              >
                <IconX />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {threadLoading ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <IconRefresh spinning />
                    <span style={{ fontSize: 13 }}>Loading thread…</span>
                  </div>
                </div>
              ) : thread.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', padding: '32px 0' }}>
                  No messages in this thread yet
                </p>
              ) : (
                thread.map(msg => (
                  <div
                    key={msg.id}
                    style={{ display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}
                  >
                    <div style={{
                      maxWidth: '85%',
                      background: msg.direction === 'outbound' ? 'var(--blue-soft)' : 'var(--paper-3)',
                      border: '1px solid var(--line)',
                      borderRadius: 12, padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '3px 8px', marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, ...MONO }}>
                          {msg.direction === 'outbound'
                            ? (msg.sender_name || selectedConv.sender_name || 'Stacey')
                            : (selectedConv.lead?.full_name || msg.sender_email || selectedConv.lead_email)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', ...MONO }}>
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
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', flexShrink: 0, background: 'var(--paper-3)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', fontSize: 11, color: 'var(--ink-3)', ...MONO }}>
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
