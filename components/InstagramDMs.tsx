'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';

// ─── Spin keyframe ────────────────────────────────────────────────────────────

const SPIN_STYLE = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconRefresh({ spinning }: { spinning?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 1s linear infinite' : undefined }}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconSend({ pulsing }: { pulsing?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: pulsing ? 'spin 1s linear infinite' : undefined }}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
function IconBarChart() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconPower() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}
function IconMessageSquare() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconMessageSquareSm() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
function IconSendSm() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// Instagram gradient icon
function IconInstagram({ size = 20 }: { size?: number }) {
  const id = 'ig-grad';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f58529" />
          <stop offset="35%" stopColor="#dd2a7b" />
          <stop offset="70%" stopColor="#8134af" />
          <stop offset="100%" stopColor="#515bd4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'inbox' | 'cold-outreach';

interface UMessage {
  id: string;
  our_account_id: string;
  our_username: string | null;
  sender_id: string;
  sender_username: string | null;
  direction: 'inbound' | 'outbound';
  content: string | null;
  created_at: string;
}
interface Conversation {
  key: string;
  our_account_id: string;
  our_username: string | null;
  sender_id: string;
  sender_username: string | null;
  latest_message: string | null;
  latest_at: string;
  message_count: number;
  messages: UMessage[];
}
interface AccountConfig {
  ig_account_id: string;
  username: string;
  display_name: string | null;
}

interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  instagram_handle: string | null;
  instagram_status: string | null;
}
interface InstagramMessage {
  id: string;
  conversation_id: string;
  lead_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sent_via: string | null;
  instagram_message_id: string | null;
  created_at: string;
}
interface InstagramConversation {
  id: string;
  lead_id: string;
  status: 'active' | 'booked' | 'closed';
  last_message_at: string | null;
  message_count: number;
  created_at: string;
  lead: Lead | null;
  latest_message: InstagramMessage | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const AVATAR_COLORS = ['#e11d48', '#7c3aed', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899'];

function avatarColor(username: string | null, index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

const ACCOUNT_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  maximillian_fawcett: { bg: 'rgba(139,92,246,0.15)', color: 'var(--violet)' },
  _mmmmmmmax:          { bg: 'rgba(14,165,233,0.15)', color: 'var(--blue)' },
  maximefawcett:       { bg: 'rgba(34,197,94,0.13)',  color: 'var(--green)' },
  fawcettmaximilian:   { bg: 'rgba(245,158,11,0.15)', color: 'var(--amber)' },
  maxwellfawctt:       { bg: 'rgba(225,29,72,0.12)',  color: 'var(--rose)' },
};
function accountBadge(username: string | null): { bg: string; color: string } {
  if (!username) return { bg: 'var(--paper-3)', color: 'var(--ink-4)' };
  return ACCOUNT_BADGE_COLORS[username] || { bg: 'rgba(139,92,246,0.12)', color: 'var(--violet)' };
}

const STATUS_LABELS: Record<string, string> = { active: 'Active', booked: 'Booked', closed: 'Closed' };
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active: { bg: 'rgba(59,130,246,0.12)', color: 'var(--blue)' },
  booked: { bg: 'rgba(34,197,94,0.12)',  color: 'var(--green)' },
  closed: { bg: 'var(--paper-3)',         color: 'var(--ink-4)' },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function leadName(lead: Lead | null) {
  if (!lead) return 'Unknown';
  const parts = [lead.first_name, lead.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : lead.instagram_handle || lead.email || 'Unknown';
}

// ─── Inbox Analytics Bar ──────────────────────────────────────────────────────

function InboxAnalyticsBar() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<{
    activeAccounts: number;
    messagesIn: number;
    messagesOut: number;
    uniqueConversations: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    Promise.all([
      supabase.from('instagram_account_configs').select('ig_account_id', { count: 'exact', head: true }),
      supabase.from('instagram_unibox_messages').select('id', { count: 'exact', head: true }).eq('direction', 'inbound').gte('created_at', since),
      supabase.from('instagram_unibox_messages').select('id', { count: 'exact', head: true }).eq('direction', 'outbound').gte('created_at', since),
      supabase.from('instagram_unibox_messages').select('sender_id').gte('created_at', since),
    ]).then(([acctRes, inRes, outRes, convRes]) => {
      if (cancelled) return;
      const uniqueSenders = new Set((convRes.data || []).map((r: { sender_id: string }) => r.sender_id));
      setStats({
        activeAccounts: acctRes.count || 0,
        messagesIn: inRes.count || 0,
        messagesOut: outRes.count || 0,
        uniqueConversations: uniqueSenders.size,
      });
    }).catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const v = (n: number | undefined) => (n == null || loading) ? '-' : n.toLocaleString();

  return (
    <div style={{ marginBottom: 12 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { label: 'Active Accounts', value: v(stats?.activeAccounts), color: 'var(--ink)' },
                { label: 'Messages In (7d)', value: v(stats?.messagesIn), color: 'var(--green)' },
                { label: 'Messages Out (7d)', value: v(stats?.messagesOut), color: 'var(--blue)' },
                { label: 'Conversations (7d)', value: v(stats?.uniqueConversations), color: 'var(--violet)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--paper-3)', borderRadius: 8, padding: '10px 12px',
                  border: '1px solid var(--line)',
                }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '2px 0 0', fontFamily: 'Geist Mono, monospace' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inbox (Unibox) ───────────────────────────────────────────────────────────

function InboxTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [accountConfigs, setAccountConfigs] = useState<AccountConfig[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const url = accountFilter !== 'all'
        ? `/api/instagram/unibox?account=${encodeURIComponent(accountFilter)}`
        : '/api/instagram/unibox';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setConversations(data.conversations || []);
      setAccountConfigs(data.accountConfigs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [accountFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('ig-unibox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'instagram_unibox_messages' }, () => load(true))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const sendReply = async () => {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/instagram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          our_account_id: selected.our_account_id,
          recipient_id: selected.sender_id,
          message: replyText.trim(),
        }),
      });
      if (res.ok) {
        setReplyText('');
        await load(true);
        const refreshed = conversations.find(c => c.key === selected.key);
        if (refreshed) setSelected(refreshed);
      } else {
        const err = await res.json();
        console.error('Send failed:', err);
        alert(`Send failed: ${err.error || 'Unknown error'}`);
      }
    } finally { setSending(false); }
  };

  useEffect(() => {
    if (selected && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selected]);

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.sender_username || '').toLowerCase().includes(q)
      || c.sender_id.includes(q)
      || (c.our_username || '').toLowerCase().includes(q)
      || (c.latest_message || '').toLowerCase().includes(q);
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'var(--ink-4)', gap: 8 }}>
      <IconRefresh spinning /> Loading…
    </div>
  );

  return (
    <>
      <InboxAnalyticsBar />
      <div style={{
        display: 'flex', height: 'calc(100dvh - 11rem)',
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--line)', background: 'var(--paper)',
      }}>
        {/* Left panel */}
        <div style={{
          display: selected ? 'none' : 'flex',
          flexDirection: 'column',
          width: 340, flexShrink: 0,
          borderRight: '1px solid var(--line)',
        }}
          className="ig-left-panel"
        >
          <style>{`
            @media (min-width: 768px) {
              .ig-left-panel { display: flex !important; }
            }
          `}</style>

          {/* Panel header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                style={{
                  padding: 5, borderRadius: 6, border: '1px solid var(--line)',
                  background: 'var(--paper-2)', color: 'var(--ink-4)', cursor: 'pointer',
                  opacity: refreshing ? 0.4 : 1,
                }}
              >
                <IconRefresh spinning={refreshing} />
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none' }}>
                <IconSearch />
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                  fontSize: 13, borderRadius: 8, border: '1px solid var(--line)',
                  background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Account filter pills */}
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
              {['all', ...accountConfigs.map(a => a.ig_account_id)].map(id => {
                const cfg = accountConfigs.find(a => a.ig_account_id === id);
                const active = accountFilter === id;
                return (
                  <button
                    key={id}
                    onClick={() => setAccountFilter(id)}
                    style={{
                      padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                      fontSize: 11, fontWeight: 500, cursor: 'pointer',
                      border: active ? '1px solid var(--blue)' : '1px solid var(--line)',
                      background: active ? 'rgba(59,130,246,0.12)' : 'var(--paper-2)',
                      color: active ? 'var(--blue)' : 'var(--ink-3)',
                      fontFamily: 'Geist Mono, monospace',
                    }}
                  >
                    {id === 'all' ? 'All' : `@${cfg?.username || id}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 192, gap: 8, color: 'var(--ink-4)' }}>
                <IconMessageSquare />
                <p style={{ fontSize: 13, margin: 0, color: 'var(--ink-3)' }}>No messages yet</p>
                <p style={{ fontSize: 12, margin: 0, textAlign: 'center', padding: '0 24px' }}>DMs to your accounts will appear here in real time</p>
              </div>
            ) : filtered.map((conv, idx) => {
              const isSelected = selected?.key === conv.key;
              const ab = accountBadge(conv.our_username);
              const initial = (conv.sender_username || conv.sender_id || '?')[0].toUpperCase();
              const bgColor = avatarColor(conv.sender_username, idx);
              return (
                <button
                  key={conv.key}
                  onClick={() => setSelected(conv)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--line)',
                    borderLeft: isSelected ? '2px solid var(--blue)' : '2px solid transparent',
                    background: isSelected ? 'var(--paper-3)' : 'transparent',
                    cursor: 'pointer', border: 'none',
                    borderBottomColor: 'var(--line)',
                    borderLeftStyle: 'solid',
                    borderLeftWidth: 2,
                    borderLeftColor: isSelected ? 'var(--blue)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.sender_username ? `@${conv.sender_username}` : conv.sender_id}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0, fontFamily: 'Geist Mono, monospace' }}>{timeAgo(conv.latest_at)}</span>
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: 20, fontSize: 10, fontWeight: 500,
                        background: ab.bg, color: ab.color, marginBottom: 3, fontFamily: 'Geist Mono, monospace',
                      }}>
                        @{conv.our_username || conv.our_account_id}
                      </span>
                      <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.latest_message || '(no text)'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel — thread */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--paper-2)' }}>
            {/* Thread header */}
            <div style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderBottom: '1px solid var(--line)',
              background: 'var(--paper)',
            }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: 5, borderRadius: 6, border: '1px solid var(--line)',
                  background: 'var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer',
                  flexShrink: 0,
                }}
                className="md:hidden"
              >
                <IconChevronLeft />
              </button>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: avatarColor(selected.sender_username, 0),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {(selected.sender_username || selected.sender_id)[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>
                    {selected.sender_username ? `@${selected.sender_username}` : selected.sender_id}
                  </span>
                  {(() => {
                    const ab = accountBadge(selected.our_username);
                    return (
                      <span style={{
                        padding: '2px 7px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                        background: ab.bg, color: ab.color, fontFamily: 'Geist Mono, monospace',
                      }}>
                        to @{selected.our_username || selected.our_account_id}
                      </span>
                    );
                  })()}
                </div>
                <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '2px 0 0', fontFamily: 'Geist Mono, monospace' }}>
                  {selected.message_count} messages · ID: {selected.sender_id}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selected.messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{
                      borderRadius: 16,
                      borderBottomRightRadius: msg.direction === 'outbound' ? 4 : 16,
                      borderBottomLeftRadius: msg.direction === 'inbound' ? 4 : 16,
                      padding: '10px 14px', fontSize: 13,
                      background: msg.direction === 'outbound'
                        ? 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)'
                        : 'var(--paper)',
                      color: msg.direction === 'outbound' ? '#fff' : 'var(--ink)',
                      border: msg.direction === 'inbound' ? '1px solid var(--line)' : 'none',
                    }}>
                      {msg.content || '(no text)'}
                    </div>
                    <p style={{
                      fontSize: 10, color: 'var(--ink-4)', margin: '3px 4px 0',
                      textAlign: msg.direction === 'outbound' ? 'right' : 'left',
                      fontFamily: 'Geist Mono, monospace',
                    }}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div style={{
              flexShrink: 0, padding: '10px 14px', borderTop: '1px solid var(--line)',
              background: 'var(--paper)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{
                  flex: 1, border: '1px solid var(--line)', borderRadius: 22,
                  background: 'var(--paper-2)', overflow: 'hidden',
                }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                    placeholder="Type a message…"
                    rows={1}
                    style={{
                      width: '100%', padding: '9px 14px', resize: 'none',
                      border: 'none', background: 'transparent',
                      color: 'var(--ink)', fontSize: 13, outline: 'none',
                      maxHeight: 96, boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none',
                    background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)',
                    color: '#fff', cursor: !replyText.trim() || sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    opacity: !replyText.trim() || sending ? 0.4 : 1,
                  }}
                >
                  <IconSend pulsing={sending} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'var(--ink-4)', background: 'var(--paper-2)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--paper-3)', border: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconInstagram size={28} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-3)', margin: 0 }}>Select a conversation</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Cold Outreach ────────────────────────────────────────────────────────────

function ColdOutreachTab() {
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<InstagramMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async (off = 0) => {
    setLoading(true);
    try {
      let query = supabase
        .from('instagram_conversations')
        .select('*, lead:leads!lead_id(id, first_name, last_name, email, instagram_handle, instagram_status)', { count: 'exact' })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(off, off + PAGE_SIZE - 1);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);

      const { data, count, error } = await query;
      if (error) { console.error(error); return; }

      const convos: InstagramConversation[] = (data || []).map((row: any) => ({
        id: row.id, lead_id: row.lead_id, status: row.status,
        last_message_at: row.last_message_at, message_count: row.message_count || 0,
        created_at: row.created_at, lead: row.lead, latest_message: null,
      }));

      if (convos.length > 0) {
        const ids = convos.map(c => c.id);
        const { data: msgs } = await supabase
          .from('instagram_messages').select('*').in('conversation_id', ids)
          .order('created_at', { ascending: false });
        if (msgs) {
          const map = new Map<string, InstagramMessage>();
          for (const m of msgs) { if (!map.has(m.conversation_id)) map.set(m.conversation_id, m as InstagramMessage); }
          for (const c of convos) { c.latest_message = map.get(c.id) || null; }
        }
      }

      let filtered = convos;
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = convos.filter(c =>
          leadName(c.lead).toLowerCase().includes(q)
          || (c.lead?.instagram_handle || '').toLowerCase().includes(q)
          || (c.lead?.email || '').toLowerCase().includes(q)
        );
      }
      setConversations(filtered);
      setTotal(search.trim() ? filtered.length : (count || 0));
    } finally { setLoading(false); }
  }, [filterStatus, search]);

  useEffect(() => { setOffset(0); setSelectedId(null); setThread([]); fetchConversations(0); }, [filterStatus, search]); // eslint-disable-line
  useEffect(() => { fetchConversations(offset); }, [offset]); // eslint-disable-line
  useEffect(() => {
    const t = setInterval(() => fetchConversations(offset), 30000);
    return () => clearInterval(t);
  }, [offset, fetchConversations]);

  const openThread = async (conv: InstagramConversation) => {
    setSelectedId(conv.id); setThreadLoading(true);
    const { data } = await supabase.from('instagram_messages').select('*')
      .eq('conversation_id', conv.id).order('created_at', { ascending: true });
    setThread((data as InstagramMessage[]) || []);
    setThreadLoading(false);
  };

  useEffect(() => {
    if (thread.length > 0 && threadEndRef.current) threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div style={{ display: 'flex', gap: 12, height: 'calc(100dvh - 8rem)' }}>
      {/* List */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        width: selectedId ? 420 : undefined, flex: selectedId ? undefined : 1,
        background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
        overflow: 'hidden', visibility: selectedId ? undefined : undefined,
      }}
        className={selectedId ? 'cold-list-panel' : undefined}
      >
        <style>{`
          @media (max-width: 767px) {
            .cold-list-panel { display: none !important; }
          }
        `}</style>

        {/* Filters */}
        <div style={{
          flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none' }}>
              <IconSearch />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or handle…"
              style={{
                width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                fontSize: 13, borderRadius: 8, border: '1px solid var(--line)',
                background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'active', 'booked', 'closed'].map(s => {
              const active = filterStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    border: active ? '1px solid var(--violet)' : '1px solid transparent',
                    background: active ? 'rgba(139,92,246,0.12)' : 'transparent',
                    color: active ? 'var(--violet)' : 'var(--ink-3)',
                    fontFamily: 'Geist Mono, monospace',
                  }}
                >
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
                <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>LEAD</th>
                {!selectedId && <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>LAST MESSAGE</th>}
                <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>STATUS</th>
                <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>MSGS</th>
                <th style={{ textAlign: 'left', padding: '9px 14px', fontWeight: 500, color: 'var(--ink-4)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>LAST</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <IconRefresh spinning />
                      <span style={{ fontSize: 13 }}>Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-4)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ opacity: 0.3 }}><IconInstagram size={28} /></span>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--ink-3)' }}>No cold outreach threads</p>
                    </div>
                  </td>
                </tr>
              ) : conversations.map(conv => {
                const isSelected = selectedId === conv.id;
                const sb = STATUS_BADGE[conv.status] || { bg: 'var(--paper-3)', color: 'var(--ink-4)' };
                return (
                  <tr
                    key={conv.id}
                    onClick={() => openThread(conv)}
                    style={{
                      borderBottom: '1px solid var(--line)', cursor: 'pointer',
                      background: isSelected ? 'var(--paper-3)' : undefined,
                      borderLeft: isSelected ? '2px solid var(--violet)' : '2px solid transparent',
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', margin: 0 }}>{leadName(conv.lead)}</p>
                      {conv.lead?.instagram_handle && (
                        <p style={{ fontSize: 11, color: 'var(--violet)', margin: '2px 0 0', fontFamily: 'Geist Mono, monospace' }}>
                          @{conv.lead.instagram_handle.replace(/^@/, '')}
                        </p>
                      )}
                    </td>
                    {!selectedId && (
                      <td style={{ padding: '10px 14px', maxWidth: 280 }}>
                        {conv.latest_message ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                            {conv.latest_message.direction === 'outbound' && (
                              <span style={{ color: 'var(--ink-4)', marginTop: 1, flexShrink: 0 }}><IconSendSm /></span>
                            )}
                            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {conv.latest_message.content.slice(0, 100)}
                            </p>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>No messages</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                        fontSize: 11, fontWeight: 500, background: sb.bg, color: sb.color,
                        fontFamily: 'Geist Mono, monospace',
                      }}>
                        {STATUS_LABELS[conv.status] || conv.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>
                        <IconMessageSquareSm />{conv.message_count}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>
                        <IconClock />{timeAgo(conv.last_message_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderTop: '1px solid var(--line)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                style={{
                  padding: 5, borderRadius: 6, border: '1px solid var(--line)',
                  background: 'var(--paper-2)', color: 'var(--ink-3)',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.3 : 1,
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
                  padding: 5, borderRadius: 6, border: '1px solid var(--line)',
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
          overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderBottom: '1px solid var(--line)',
          }}>
            <button
              onClick={() => { setSelectedId(null); setThread([]); }}
              style={{
                padding: 5, borderRadius: 6, border: '1px solid var(--line)',
                background: 'var(--paper-2)', color: 'var(--ink-3)', cursor: 'pointer',
              }}
            >
              <IconChevronLeft />
            </button>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--ink)', margin: 0, fontSize: 14 }}>{leadName(selectedConv.lead)}</p>
              {selectedConv.lead?.instagram_handle && (
                <p style={{ fontSize: 11, color: 'var(--violet)', margin: '2px 0 0', fontFamily: 'Geist Mono, monospace' }}>
                  @{selectedConv.lead.instagram_handle}
                </p>
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {(() => {
                const sb = STATUS_BADGE[selectedConv.status] || { bg: 'var(--paper-3)', color: 'var(--ink-4)' };
                return (
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: sb.bg, color: sb.color, fontFamily: 'Geist Mono, monospace',
                  }}>
                    {STATUS_LABELS[selectedConv.status]}
                  </span>
                );
              })()}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {threadLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0', color: 'var(--ink-4)' }}>
                <IconRefresh spinning />
              </div>
            ) : thread.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-4)', padding: '32px 0' }}>
                No messages in this thread yet
              </p>
            ) : thread.map(msg => (
              <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%' }}>
                  <div style={{
                    borderRadius: 16,
                    borderBottomRightRadius: msg.direction === 'outbound' ? 4 : 16,
                    borderBottomLeftRadius: msg.direction === 'inbound' ? 4 : 16,
                    padding: '10px 14px', fontSize: 13,
                    background: msg.direction === 'outbound'
                      ? 'linear-gradient(135deg, #8134af, #dd2a7b, #f58529)'
                      : 'var(--paper-2)',
                    color: msg.direction === 'outbound' ? '#fff' : 'var(--ink)',
                    border: msg.direction === 'inbound' ? '1px solid var(--line)' : 'none',
                  }}>
                    {msg.content}
                  </div>
                  <p style={{
                    fontSize: 10, color: 'var(--ink-4)', margin: '3px 4px 0',
                    textAlign: msg.direction === 'outbound' ? 'right' : 'left',
                    fontFamily: 'Geist Mono, monospace',
                  }}>
                    {formatTime(msg.created_at)}{msg.sent_via ? ` · ${msg.sent_via}` : ''}
                  </p>
                </div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function InstagramDMs({ initialTab = 'inbox' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiToggling, setAiToggling] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('instagram_account_configs').select('active');
      if (data && data.length > 0) {
        setAiEnabled(data.some((a: { active: boolean }) => a.active));
      }
    })();
  }, []);

  const toggleAI = async () => {
    setAiToggling(true);
    const newState = !aiEnabled;
    const { error } = await supabase
      .from('instagram_account_configs')
      .update({ active: newState })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) setAiEnabled(newState);
    setAiToggling(false);
  };

  return (
    <div>
      <style>{SPIN_STYLE}</style>

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Instagram gradient icon box */}
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af, #515bd4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Instagram DMs</h1>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: '2px 0 0' }}>Unibox across 3 connected accounts</p>
          </div>
          {/* Live badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--green)', flexShrink: 0,
              boxShadow: '0 0 5px var(--green)',
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', fontFamily: 'Geist Mono, monospace' }}>LIVE</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* AI Toggle */}
          <button
            onClick={toggleAI}
            disabled={aiToggling}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: aiToggling ? 'not-allowed' : 'pointer', opacity: aiToggling ? 0.5 : 1,
              border: '1px solid ' + (aiEnabled ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)'),
              background: aiEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
              color: aiEnabled ? 'var(--green)' : 'var(--rose)',
            }}
          >
            <IconPower />
            {aiToggling ? 'Switching...' : aiEnabled ? 'AI On' : 'AI Off'}
          </button>

          {/* Tabs */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'var(--paper-2)', border: '1px solid var(--line)',
            padding: 3, borderRadius: 10,
          }}>
            {(['inbox', 'cold-outreach'] as Tab[]).map(t => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', border: 'none',
                    background: active ? 'var(--paper-3)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--ink-3)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                  }}
                >
                  {t === 'inbox' ? 'Inbox' : 'Cold Outreach'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === 'inbox' ? <InboxTab /> : <ColdOutreachTab />}
    </div>
  );
}
