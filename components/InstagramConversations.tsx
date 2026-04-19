'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';

const INSTA_GRAD = 'linear-gradient(135deg, #f58529 0%, #dd2a7b 40%, #8134af 70%, #515bd4 100%)';

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

interface Lead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  instagram_handle: string | null;
  instagram_status: string | null;
}

interface InstagramConversation {
  id: string;
  lead_id: string;
  instagram_thread_id: string | null;
  status: 'active' | 'booked' | 'closed';
  last_message_at: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  lead: Lead | null;
  latest_message: InstagramMessage | null;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: 'oklch(91% 0.04 258 / 0.3)', color: 'var(--blue)' },
  booked: { bg: 'oklch(91% 0.04 160 / 0.3)', color: 'var(--green)' },
  closed: { bg: 'var(--paper-3)', color: 'var(--ink-3)' },
};
const STATUS_LABELS: Record<string, string> = { active: 'Active', booked: 'Booked', closed: 'Closed' };

const PAGE_SIZE = 50;
const AUTO_REFRESH_INTERVAL = 30_000;

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

function leadName(lead: Lead | null): string {
  if (!lead) return 'Unknown';
  const parts = [lead.first_name, lead.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (lead.instagram_handle || lead.email || 'Unknown');
}

function leadInitials(lead: Lead | null): string {
  return leadName(lead).split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '?';
}

export default function InstagramConversations() {
  const [conversations, setConversations] = useState<InstagramConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<InstagramMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
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
      if (error) { console.error('Failed to fetch instagram conversations:', error); return; }

      const convos: InstagramConversation[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        lead_id: row.lead_id as string,
        instagram_thread_id: row.instagram_thread_id as string | null,
        status: row.status as 'active' | 'booked' | 'closed',
        last_message_at: row.last_message_at as string | null,
        message_count: (row.message_count as number) || 0,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        lead: row.lead as Lead | null,
        latest_message: null,
      }));

      if (convos.length > 0) {
        const convoIds = convos.map(c => c.id);
        const { data: messages } = await supabase
          .from('instagram_messages').select('*').in('conversation_id', convoIds)
          .order('created_at', { ascending: false });
        if (messages) {
          const latestByConvo = new Map<string, InstagramMessage>();
          for (const msg of messages) {
            if (!latestByConvo.has(msg.conversation_id)) latestByConvo.set(msg.conversation_id, msg as InstagramMessage);
          }
          for (const conv of convos) conv.latest_message = latestByConvo.get(conv.id) || null;
        }
      }

      let filtered = convos;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = convos.filter(c => {
          const name = leadName(c.lead).toLowerCase();
          const handle = (c.lead?.instagram_handle || '').toLowerCase();
          const email = (c.lead?.email || '').toLowerCase();
          return name.includes(q) || handle.includes(q) || email.includes(q);
        });
      }

      setConversations(filtered);
      setTotal(searchQuery.trim() ? filtered.length : (count || 0));
    } finally { setLoading(false); }
  }, [filterStatus, searchQuery]);

  useEffect(() => { setOffset(0); setSelectedId(null); setThread([]); fetchConversations(0); }, [filterStatus, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchConversations(offset); }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = setInterval(() => fetchConversations(offset), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [offset, fetchConversations]);

  const openThread = async (conv: InstagramConversation) => {
    setSelectedId(conv.id);
    setThreadLoading(true);
    try {
      const { data, error } = await supabase
        .from('instagram_messages').select('*').eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
      if (error) { console.error('Failed to fetch messages:', error); return; }
      setThread((data as InstagramMessage[]) || []);
    } finally { setThreadLoading(false); }
  };

  useEffect(() => {
    if (thread.length > 0 && threadEndRef.current) threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: INSTA_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>Instagram DMs</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
              {total.toLocaleString()} conversation{total !== 1 ? 's' : ''} with leads
            </p>
          </div>
        </div>
        <button onClick={() => fetchConversations(offset)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? 'spin 1s linear infinite' : undefined }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or handle..."
            style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'active', 'booked', 'closed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 999, cursor: 'pointer',
              background: filterStatus === s ? 'oklch(91% 0.04 300 / 0.3)' : 'transparent',
              color: filterStatus === s ? 'var(--violet)' : 'var(--ink-3)',
              border: filterStatus === s ? '1px solid oklch(80% 0.04 300 / 0.4)' : '1px solid transparent',
            }}>{s === 'all' ? 'All' : STATUS_LABELS[s]}</button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '340px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        {/* Thread list */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </div>
              {searchQuery ? 'No results match your search' : 'No Instagram conversations yet'}
            </div>
          ) : conversations.map((conv, i) => {
            const active = selectedId === conv.id;
            const sc = STATUS_COLORS[conv.status] || STATUS_COLORS.closed;
            return (
              <div key={conv.id} onClick={() => openThread(conv)} style={{
                display: 'flex', gap: 10, padding: '12px 14px', cursor: 'pointer',
                background: active ? 'var(--paper-3)' : 'transparent',
                borderLeft: active ? '2px solid var(--violet)' : '2px solid transparent',
                borderBottom: i < conversations.length - 1 ? '1px solid var(--line)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--paper-2)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: INSTA_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'Geist Mono, monospace' }}>
                  {leadInitials(conv.lead)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leadName(conv.lead)}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', flexShrink: 0, marginLeft: 8 }}>{timeAgo(conv.last_message_at)}</span>
                  </div>
                  {conv.lead?.instagram_handle && (
                    <div style={{ fontSize: 11.5, color: 'var(--violet)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{conv.lead.instagram_handle.replace(/^@/, '')}</div>
                  )}
                  {conv.latest_message && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {conv.latest_message.content.slice(0, 80)}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, fontWeight: 500, background: sc.bg, color: sc.color }}>{STATUS_LABELS[conv.status] || conv.status}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'Geist Mono, monospace' }}>{conv.message_count} msgs</span>
                  </div>
                </div>
              </div>
            );
          })}

          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: offset === 0 ? 'not-allowed' : 'pointer', opacity: offset === 0 ? 0.4 : 1 }}>‹</button>
                <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', padding: '0 6px', lineHeight: '26px' }}>{currentPage}/{totalPages}</span>
                <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-2)', cursor: offset + PAGE_SIZE >= total ? 'not-allowed' : 'pointer', opacity: offset + PAGE_SIZE >= total ? 0.4 : 1 }}>›</button>
              </div>
            </div>
          )}
        </div>

        {/* Thread panel */}
        {selectedId && selectedConv && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
            {/* Thread header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: INSTA_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'Geist Mono, monospace' }}>
                  {leadInitials(selectedConv.lead)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leadName(selectedConv.lead)}</div>
                  {selectedConv.lead?.instagram_handle && (
                    <div style={{ fontSize: 12, color: 'var(--violet)' }}>@{selectedConv.lead.instagram_handle.replace(/^@/, '')}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {(() => { const sc = STATUS_COLORS[selectedConv.status] || STATUS_COLORS.closed; return (
                  <span style={{ fontSize: 11.5, padding: '2px 8px', borderRadius: 999, fontWeight: 500, background: sc.bg, color: sc.color }}>{STATUS_LABELS[selectedConv.status]}</span>
                ); })()}
                <button onClick={() => { setSelectedId(null); setThread([]); }} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', background: 'var(--paper-2)', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--paper-2)', minHeight: 0 }}>
              {threadLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading thread…</div>
              ) : thread.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No messages yet</div>
              ) : thread.map(msg => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', borderRadius: 18, padding: '9px 14px',
                    background: msg.direction === 'outbound' ? INSTA_GRAD : 'var(--paper)',
                    color: msg.direction === 'outbound' ? 'white' : 'var(--ink)',
                    border: msg.direction === 'outbound' ? 'none' : '1px solid var(--line)',
                    fontSize: 13.5, lineHeight: 1.45, wordBreak: 'break-word',
                  }}>
                    {msg.content}
                    <div style={{ fontSize: 10.5, marginTop: 4, opacity: 0.7, fontFamily: 'Geist Mono, monospace' }}>
                      {new Date(msg.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {msg.sent_via && msg.direction === 'outbound' && ` · ${msg.sent_via}`}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', flexShrink: 0, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {selectedConv.lead?.email && <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Email: {selectedConv.lead.email}</span>}
              {selectedConv.instagram_thread_id && <span style={{ fontSize: 11.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>Thread: {selectedConv.instagram_thread_id}</span>}
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 'auto' }}>
                Started {new Date(selectedConv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
