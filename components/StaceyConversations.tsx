'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, Filter, ChevronLeft, ChevronRight, Check, Clock, X, BookOpen, Ghost, AlertCircle } from 'lucide-react';

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
  // enriched
  latest_message: ConversationMessage | null;
  lead: {
    full_name: string;
    source_brokerage: string;
    city: string;
    state_province: string;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  needs_reply: 'Needs Reply',
  replied: 'Replied',
  booked: 'Booked',
  ghosted: 'Ghosted',
  rejected: 'Rejected',
  active: 'Active',
};

const STATUS_COLORS: Record<string, string> = {
  needs_reply: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  replied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  booked: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  ghosted: 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  active: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const TZ_COLORS: Record<string, string> = {
  EST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  MST: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PST: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
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

export default function StaceyConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ConversationMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('needs_reply');
  const [filterTimezone, setFilterTimezone] = useState('');

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
      const res = await fetch(
        `/api/conversations/${conv.id}/messages`
      );
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

  // Stats bar
  const needsReplyCount = filterStatus === 'all'
    ? conversations.filter(c => c.status === 'needs_reply').length
    : filterStatus === 'needs_reply' ? total : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Email Campaigns</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total.toLocaleString()} conversations · Stacey's Instantly threads
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Filter className="w-4 h-4 text-gray-400" />

        <div className="flex gap-1.5 flex-wrap">
          {['needs_reply', 'replied', 'booked', 'ghosted', 'rejected', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterStatus === s
                  ? 'bg-primary-500/15 text-primary-700 dark:text-primary-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <select
          value={filterTimezone}
          onChange={e => setFilterTimezone(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 ml-auto"
        >
          <option value="">All Timezones</option>
          {['EST', 'CST', 'MST', 'PST'].map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className={`flex gap-4 ${selectedId ? 'items-start' : ''}`}>
        {/* Conversation list */}
        <div className={`card p-0 overflow-hidden ${selectedId ? 'w-[420px] flex-shrink-0' : 'flex-1'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/80 dark:bg-white/3">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Lead</th>
                  {!selectedId && (
                    <>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Preview</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">TZ</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last reply</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={selectedId ? 3 : 5} className="py-12 text-center text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading…
                    </td>
                  </tr>
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={selectedId ? 3 : 5} className="py-12 text-center text-gray-400 dark:text-gray-500">
                      <Mail className="w-7 h-7 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">No conversations</p>
                      <p className="text-xs mt-1">Replies from Instantly will appear here</p>
                    </td>
                  </tr>
                ) : (
                  conversations.map(conv => (
                    <tr
                      key={conv.id}
                      onClick={() => openThread(conv)}
                      className={`border-b border-gray-50 dark:border-gray-700/30 cursor-pointer transition-colors ${
                        selectedId === conv.id
                          ? 'bg-primary-50/60 dark:bg-primary-900/10'
                          : 'hover:bg-gray-50/60 dark:hover:bg-white/3'
                      }`}
                    >
                      {/* Lead */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {conv.lead?.full_name || conv.lead_email.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">{conv.lead_email}</p>
                        {conv.lead?.city && (
                          <p className="text-xs text-gray-400">{conv.lead.city}, {conv.lead.state_province}</p>
                        )}
                      </td>

                      {/* Preview + TZ — hide in split view */}
                      {!selectedId && (
                        <>
                          <td className="px-4 py-3 max-w-[280px]">
                            {conv.latest_message ? (
                              <p className="text-gray-600 dark:text-gray-400 text-xs truncate">
                                {conv.latest_message.content.slice(0, 120)}
                              </p>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-500 text-xs italic">No messages yet</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {conv.timezone ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TZ_COLORS[conv.timezone] || ''}`}>
                                {conv.timezone}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </>
                      )}

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[conv.status] || ''}`}>
                          {STATUS_LABELS[conv.status] || conv.status}
                        </span>
                        {conv.calendly_booked && (
                          <span className="ml-1.5 text-xs text-green-600 dark:text-green-400 font-medium">✓ cal</span>
                        )}
                      </td>

                      {/* Last reply */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {timeAgo(conv.last_reply_at)}
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
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
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
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {selectedConv.lead?.full_name || selectedConv.lead_email}
                </p>
                <p className="text-xs text-gray-400 truncate">{selectedConv.lead_email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedConv.status]}`}>
                  {STATUS_LABELS[selectedConv.status]}
                </span>
                {selectedConv.timezone && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TZ_COLORS[selectedConv.timezone] || ''}`}>
                    {selectedConv.timezone}
                  </span>
                )}
                {selectedConv.calendly_booked && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Booked
                  </span>
                )}
                <button
                  onClick={() => { setSelectedId(null); setThread([]); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadLoading ? (
                <div className="py-8 text-center text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading thread…
                </div>
              ) : thread.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  No messages in this thread yet
                </div>
              ) : (
                thread.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 ${
                        msg.direction === 'outbound'
                          ? 'bg-primary-500/10 dark:bg-primary-500/20 text-gray-800 dark:text-gray-100'
                          : 'bg-gray-100 dark:bg-white/8 text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {msg.direction === 'outbound'
                            ? (msg.sender_name || selectedConv.sender_name || 'Stacey')
                            : (selectedConv.lead?.full_name || msg.sender_email || selectedConv.lead_email)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.sent_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Thread footer — context info */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/60 flex-shrink-0 bg-gray-50/50 dark:bg-white/2">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>Campaign: {selectedConv.campaign_name || selectedConv.campaign_id}</span>
                {selectedConv.instantly_email_acct && (
                  <span>From: {selectedConv.instantly_email_acct}</span>
                )}
                {selectedConv.booking_link_sent && (
                  <span className="text-primary-500 dark:text-primary-400">Calendly link sent</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
