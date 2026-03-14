'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Instagram, MessageSquare, Search, RefreshCw, ChevronLeft, ChevronRight, Clock, X, Send, User } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

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

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  booked: 'Booked',
  closed: 'Closed',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  booked: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400',
};

const PAGE_SIZE = 50;
const AUTO_REFRESH_INTERVAL = 30_000;

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function leadName(lead: Lead | null): string {
  if (!lead) return 'Unknown';
  const parts = [lead.first_name, lead.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : (lead.instagram_handle || lead.email || 'Unknown');
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
      // Build query for conversations with lead join
      let query = supabase
        .from('instagram_conversations')
        .select('*, lead:leads!lead_id(id, first_name, last_name, email, instagram_handle, instagram_status)', { count: 'exact' })
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(off, off + PAGE_SIZE - 1);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error('Failed to fetch instagram conversations:', error);
        return;
      }

      // For each conversation, fetch the latest message for preview
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

      // Fetch latest message per conversation
      if (convos.length > 0) {
        const convoIds = convos.map(c => c.id);
        const { data: messages } = await supabase
          .from('instagram_messages')
          .select('*')
          .in('conversation_id', convoIds)
          .order('created_at', { ascending: false });

        if (messages) {
          const latestByConvo = new Map<string, InstagramMessage>();
          for (const msg of messages) {
            if (!latestByConvo.has(msg.conversation_id)) {
              latestByConvo.set(msg.conversation_id, msg as InstagramMessage);
            }
          }
          for (const conv of convos) {
            conv.latest_message = latestByConvo.get(conv.id) || null;
          }
        }
      }

      // Client-side search filter
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
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  // Initial load + filter changes
  useEffect(() => {
    setOffset(0);
    setSelectedId(null);
    setThread([]);
    fetchConversations(0);
  }, [filterStatus, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offset changes (pagination)
  useEffect(() => {
    fetchConversations(offset);
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(offset);
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [offset, fetchConversations]);

  // Open thread
  const openThread = async (conv: InstagramConversation) => {
    setSelectedId(conv.id);
    setThreadLoading(true);
    try {
      const { data, error } = await supabase
        .from('instagram_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages:', error);
        return;
      }
      setThread((data as InstagramMessage[]) || []);
    } finally {
      setThreadLoading(false);
    }
  };

  // Scroll to bottom when thread loads
  useEffect(() => {
    if (thread.length > 0 && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread]);

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-500/30 dark:to-pink-500/30 rounded-xl">
            <Instagram className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Instagram DMs</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total.toLocaleString()} conversation{total !== 1 ? 's' : ''} with leads
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchConversations(offset)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or handle..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-shadow"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {['all', 'active', 'booked', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === s
                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex gap-4 ${selectedId ? 'items-start' : ''}`}>
        {/* Conversation list */}
        <div className={`card p-0 overflow-hidden ${selectedId ? 'w-[420px] flex-shrink-0' : 'flex-1'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-white/3">
                  <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Lead</th>
                  {!selectedId && (
                    <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Preview</th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Messages</th>
                  <th className="text-left px-4 py-3 font-medium text-[13px] text-gray-500 dark:text-gray-400">Last msg</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={selectedId ? 4 : 5} className="py-12 text-center text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={selectedId ? 4 : 5} className="py-12 text-center text-gray-400 dark:text-gray-500">
                      <Instagram className="w-7 h-7 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">No conversations</p>
                      <p className="text-xs mt-1">
                        {searchQuery ? 'No results match your search' : 'Instagram DM threads with leads will appear here'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  conversations.map(conv => (
                    <tr
                      key={conv.id}
                      onClick={() => openThread(conv)}
                      className={`border-b border-gray-50 dark:border-gray-700/30 cursor-pointer transition-colors ${
                        selectedId === conv.id
                          ? 'bg-purple-50/60 dark:bg-purple-900/10'
                          : 'hover:bg-gray-50/60 dark:hover:bg-white/3'
                      }`}
                    >
                      {/* Lead */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-[13px] text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {leadName(conv.lead)}
                        </p>
                        {conv.lead?.instagram_handle && (
                          <p className="text-xs text-purple-500 dark:text-purple-400 truncate max-w-[160px]">
                            @{conv.lead.instagram_handle.replace(/^@/, '')}
                          </p>
                        )}
                        {conv.lead?.email && !selectedId && (
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{conv.lead.email}</p>
                        )}
                      </td>

                      {/* Preview — hide in split view */}
                      {!selectedId && (
                        <td className="px-4 py-3 max-w-[280px]">
                          {conv.latest_message ? (
                            <div className="flex items-start gap-1.5">
                              {conv.latest_message.direction === 'outbound' && (
                                <Send className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                              )}
                              <p className="text-gray-600 dark:text-gray-400 text-xs truncate">
                                {conv.latest_message.content.slice(0, 120)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-500 text-xs italic">No messages yet</span>
                          )}
                        </td>
                      )}

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[conv.status] || ''}`}>
                          {STATUS_LABELS[conv.status] || conv.status}
                        </span>
                      </td>

                      {/* Message count */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <MessageSquare className="w-3 h-3" />
                          {conv.message_count}
                        </div>
                      </td>

                      {/* Last message time */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {timeAgo(conv.last_message_at)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/60">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {offset + 1}&ndash;{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 px-2">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Thread panel */}
        {selectedId && selectedConv && (
          <div className="flex-1 card p-0 overflow-hidden flex flex-col min-h-0" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {/* Thread header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 truncate">
                    {leadName(selectedConv.lead)}
                  </p>
                  {selectedConv.lead?.instagram_handle && (
                    <p className="text-xs text-purple-500 dark:text-purple-400 truncate">
                      @{selectedConv.lead.instagram_handle.replace(/^@/, '')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedConv.status]}`}>
                  {STATUS_LABELS[selectedConv.status]}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MessageSquare className="w-3 h-3" />
                  {selectedConv.message_count}
                </span>
                <button
                  onClick={() => { setSelectedId(null); setThread([]); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 dark:bg-[#1c1c1e]">
              {threadLoading ? (
                <div className="py-8 text-center text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading thread...
                </div>
              ) : thread.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  No messages in this thread yet
                </div>
              ) : (
                <>
                  {thread.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          msg.direction === 'outbound'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                            : 'bg-white dark:bg-[#2c2c2e] text-gray-800 dark:text-gray-100 shadow-sm'
                        }`}
                      >
                        <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1.5 mt-1 ${
                          msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className={`text-[10px] ${
                            msg.direction === 'outbound'
                              ? 'text-white/60'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {new Date(msg.created_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.sent_via && msg.direction === 'outbound' && (
                            <span className="text-[10px] text-white/40">
                              via {msg.sent_via}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={threadEndRef} />
                </>
              )}
            </div>

            {/* Thread footer */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/60 flex-shrink-0 bg-gray-50/50 dark:bg-white/2">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                {selectedConv.lead?.email && (
                  <span>Email: {selectedConv.lead.email}</span>
                )}
                {selectedConv.instagram_thread_id && (
                  <span className="truncate max-w-[180px]">Thread: {selectedConv.instagram_thread_id}</span>
                )}
                <span className="ml-auto">
                  Started {new Date(selectedConv.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
