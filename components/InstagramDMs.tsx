'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Instagram, Search, RefreshCw, MessageSquare, Send,
  ChevronLeft, ChevronRight, Clock, User, Filter,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'inbox' | 'cold-outreach';

// Unibox (inbox)
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

// Cold outreach
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

const ACCOUNT_COLORS: Record<string, string> = {
  maximillian_fawcett: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  _mmmmmmmax:          'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  maximefawcett:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  fawcettmaximilian:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  maxwellfawctt:       'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};
function accountColor(username: string | null) {
  if (!username) return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400';
  return ACCOUNT_COLORS[username] || 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
}

const STATUS_LABELS: Record<string, string> = { active: 'Active', booked: 'Booked', closed: 'Closed' };
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  booked: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400',
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

// ─── Inbox (Unibox) ───────────────────────────────────────────────────────────

function InboxTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [accountConfigs, setAccountConfigs] = useState<AccountConfig[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');

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

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.sender_username || '').toLowerCase().includes(q)
      || c.sender_id.includes(q)
      || (c.our_username || '').toLowerCase().includes(q)
      || (c.latest_message || '').toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="flex items-center justify-center h-72 text-gray-400 dark:text-gray-500">
      <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-[#1c1c1e]">
      {/* Left panel */}
      <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-200/60 dark:border-gray-700/40 flex-shrink-0`}>
        <div className="p-3 border-b border-gray-200/60 dark:border-gray-700/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => load(true)} disabled={refreshing}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-[#2c2c2e] border-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {['all', ...accountConfigs.map(a => a.ig_account_id)].map(id => {
              const cfg = accountConfigs.find(a => a.ig_account_id === id);
              return (
                <button key={id} onClick={() => setAccountFilter(id)}
                  className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${
                    accountFilter === id
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
                  }`}>
                  {id === 'all' ? 'All' : `@${cfg?.username || id}`}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400 dark:text-gray-500">
              <MessageSquare className="w-7 h-7" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-center px-6">DMs to your accounts will appear here in real time</p>
            </div>
          ) : filtered.map(conv => (
            <button key={conv.key} onClick={() => setSelected(conv)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors ${
                selected?.key === conv.key ? 'bg-pink-50 dark:bg-pink-900/10 border-l-2 border-l-pink-500' : ''
              }`}>
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {(conv.sender_username || conv.sender_id || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {conv.sender_username ? `@${conv.sender_username}` : conv.sender_id}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(conv.latest_at)}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${accountColor(conv.our_username)}`}>
                    @{conv.our_username || conv.our_account_id}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{conv.latest_message || '(no text)'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — thread */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-[#141414]">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-[#1c1c1e]">
            <button onClick={() => setSelected(null)} className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {(selected.sender_username || selected.sender_id)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selected.sender_username ? `@${selected.sender_username}` : selected.sender_id}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${accountColor(selected.our_username)}`}>
                  to @{selected.our_username || selected.our_account_id}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{selected.message_count} messages · ID: {selected.sender_id}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selected.messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm'
                      : 'bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm'
                  }`}>{msg.content || '(no text)'}</div>
                  <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1 ${msg.direction === 'outbound' ? 'text-right' : ''}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-[#1c1c1e]">
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Replies sent via Instagram. Read-only view.</p>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-4 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#141414]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 flex items-center justify-center">
            <Instagram className="w-7 h-7 text-pink-400" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Select a conversation</p>
        </div>
      )}
    </div>
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
    <div className={`flex gap-4 ${selectedId ? 'items-start' : ''}`}>
      {/* List */}
      <div className={`card p-0 overflow-hidden ${selectedId ? 'hidden md:block w-full md:w-[420px] md:flex-shrink-0' : 'flex-1'}`}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700/60">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or handle…"
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
          </div>
          <div className="flex gap-1">
            {['all', 'active', 'booked', 'closed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterStatus === s ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8'
                }`}>
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-white/3">
              <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Lead</th>
              {!selectedId && <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Last Message</th>}
              <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Msgs</th>
              <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Last</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400"><RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />Loading…</td></tr>
            ) : conversations.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400 dark:text-gray-500">
                <Instagram className="w-7 h-7 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No cold outreach threads</p>
              </td></tr>
            ) : conversations.map(conv => (
              <tr key={conv.id} onClick={() => openThread(conv)}
                className={`border-b border-gray-50 dark:border-gray-700/30 cursor-pointer transition-colors ${
                  selectedId === conv.id ? 'bg-purple-50/60 dark:bg-purple-900/10' : 'hover:bg-gray-50/60 dark:hover:bg-white/3'
                }`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-[13px] text-gray-900 dark:text-gray-100">{leadName(conv.lead)}</p>
                  {conv.lead?.instagram_handle && (
                    <p className="text-xs text-purple-500 dark:text-purple-400">@{conv.lead.instagram_handle.replace(/^@/, '')}</p>
                  )}
                </td>
                {!selectedId && (
                  <td className="px-4 py-3 max-w-[280px]">
                    {conv.latest_message ? (
                      <div className="flex items-start gap-1.5">
                        {conv.latest_message.direction === 'outbound' && <Send className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />}
                        <p className="text-gray-600 dark:text-gray-400 text-xs truncate">{conv.latest_message.content.slice(0, 100)}</p>
                      </div>
                    ) : <span className="text-gray-300 dark:text-gray-500 text-xs italic">No messages</span>}
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[conv.status] || ''}`}>
                    {STATUS_LABELS[conv.status] || conv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <MessageSquare className="w-3 h-3" />{conv.message_count}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />{timeAgo(conv.last_message_at)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/60">
            <span className="text-xs text-gray-500 dark:text-gray-400">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 px-2">{currentPage} / {totalPages}</span>
              <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thread panel */}
      {selectedId && selectedConv && (
        <div className="flex-1 card p-0 overflow-hidden flex flex-col" style={{ maxHeight: '75vh' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
            <button onClick={() => { setSelectedId(null); setThread([]); }} className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{leadName(selectedConv.lead)}</p>
              {selectedConv.lead?.instagram_handle && (
                <p className="text-xs text-purple-500 dark:text-purple-400">@{selectedConv.lead.instagram_handle}</p>
              )}
            </div>
            <div className="ml-auto">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedConv.status]}`}>
                {STATUS_LABELS[selectedConv.status]}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadLoading ? (
              <div className="flex justify-center py-8 text-gray-400"><RefreshCw className="w-4 h-4 animate-spin" /></div>
            ) : thread.length === 0 ? (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">No messages in this thread yet</p>
            ) : thread.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-900 dark:text-gray-100 rounded-bl-sm'
                  }`}>{msg.content}</div>
                  <p className={`text-xs text-gray-400 mt-1 ${msg.direction === 'outbound' ? 'text-right' : ''}`}>
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500/20 to-purple-500/20 dark:from-pink-500/30 dark:to-purple-500/30 rounded-xl">
            <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Instagram</h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/8 p-1 rounded-xl">
          <button onClick={() => setTab('inbox')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'inbox' ? 'bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            Inbox
          </button>
          <button onClick={() => setTab('cold-outreach')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === 'cold-outreach' ? 'bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            Cold Outreach
          </button>
        </div>
      </div>

      {tab === 'inbox' ? <InboxTab /> : <ColdOutreachTab />}
    </div>
  );
}
