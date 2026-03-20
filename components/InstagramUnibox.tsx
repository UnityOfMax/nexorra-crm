'use client';

import { useState, useEffect, useCallback } from 'react';
import { Instagram, Search, RefreshCw, MessageSquare, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';

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

const ACCOUNT_COLORS: Record<string, string> = {
  maximillian_fawcett:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  _mmmmmmmax:           'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  maximefawcett:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  fawcettmaximilian:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  maxwellfawctt:        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

function accountColor(username: string | null): string {
  if (!username) return 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400';
  return ACCOUNT_COLORS[username] || 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function InstagramUnibox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [accountConfigs, setAccountConfigs] = useState<AccountConfig[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const url = accountFilter && accountFilter !== 'all'
        ? `/api/instagram/unibox?account=${encodeURIComponent(accountFilter)}`
        : '/api/instagram/unibox';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setConversations(data.conversations || []);
      setAccountConfigs(data.accountConfigs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountFilter]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('instagram-unibox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'instagram_unibox_messages' }, () => {
        load(true);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.sender_username || '').toLowerCase().includes(q) ||
      (c.sender_id || '').toLowerCase().includes(q) ||
      (c.our_username || '').toLowerCase().includes(q) ||
      (c.latest_message || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
          <Instagram className="w-8 h-8 animate-pulse" />
          <span className="text-sm">Loading inbox…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-[#1c1c1e]">

      {/* Left panel — conversation list */}
      <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-[#1c1c1e] flex-shrink-0`}>

        {/* Header */}
        <div className="p-4 border-b border-gray-200/60 dark:border-gray-700/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-500" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Instagram Inbox</h2>
              {conversations.length > 0 && (
                <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              )}
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2c2c2e] border-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
            />
          </div>

          {/* Account filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setAccountFilter('all')}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                accountFilter === 'all'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
              }`}
            >
              All accounts
            </button>
            {accountConfigs.map(cfg => (
              <button
                key={cfg.ig_account_id}
                onClick={() => setAccountFilter(cfg.ig_account_id)}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                  accountFilter === cfg.ig_account_id
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
                }`}
              >
                @{cfg.username}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 dark:text-gray-500">
              <MessageSquare className="w-8 h-8" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs text-center px-8">Messages from all your Instagram accounts will appear here</p>
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.key}
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/40 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors ${
                  selected?.key === conv.key ? 'bg-pink-50 dark:bg-pink-900/10 border-l-2 border-l-pink-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {(conv.sender_username || conv.sender_id || '?')[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {conv.sender_username ? `@${conv.sender_username}` : conv.sender_id}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {timeAgo(conv.latest_at)}
                      </span>
                    </div>

                    {/* Account tag */}
                    <div className="mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${accountColor(conv.our_username)}`}>
                        @{conv.our_username || conv.our_account_id}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conv.latest_message || '(no text)'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — thread */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-[#141414]">
          {/* Thread header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-[#1c1c1e]">
            <button
              onClick={() => setSelected(null)}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/8"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>

            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {(selected.sender_username || selected.sender_id || '?')[0].toUpperCase()}
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
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {selected.message_count} message{selected.message_count !== 1 ? 's' : ''} · sender ID: {selected.sender_id}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selected.messages
              .slice()
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] ${msg.direction === 'outbound' ? 'order-2' : ''}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.direction === 'outbound'
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.content || '(no text)'}
                    </div>
                    <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1 ${msg.direction === 'outbound' ? 'text-right' : ''}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          {/* Note about replies */}
          <div className="px-4 py-3 border-t border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-[#1c1c1e]">
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Replies are sent via Instagram. This is a read-only view of incoming DMs.
            </p>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-4 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#141414]">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/20 dark:to-purple-900/20 flex items-center justify-center">
            <Instagram className="w-8 h-8 text-pink-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-600 dark:text-gray-400">Select a conversation</p>
            <p className="text-sm mt-1">Messages from all your Instagram accounts appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}
