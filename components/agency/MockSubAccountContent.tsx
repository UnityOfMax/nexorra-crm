'use client';

import { useState, useMemo } from 'react';
import { CLIENT_STATS } from '@/lib/data/client-stats';
import {
  FEATURED_SLUGS,
  generateMockContacts,
  generateMockMessages,
  generateMockCalendarEvents,
  generateMockPipeline,
  computeFunnelFromStats,
  PIPELINE_STAGES,
  STAGE_COLORS,
  MockContactItem,
} from '@/lib/data/mock-subaccounts';
import FunnelDiagram from './FunnelDiagram';
import {
  Users, TrendingUp, Mail, MessageSquare, CalendarCheck, Award, DollarSign,
  ChevronLeft, Send, Phone, Clock, CheckCircle2, AlertCircle, Inbox,
} from 'lucide-react';

interface Props {
  slug: string;
  activeView: string;
}

// ── Helper: day label ────────────────────────────────────────────────────────
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}
function fmtTime(h: number, m: number) {
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// ── Stage badge ──────────────────────────────────────────────────────────────
function StageBadge({ stage }: { stage: MockContactItem['stage'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    new_lead:      { label: 'New Lead',      cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    scheduling:    { label: 'Scheduling',    cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
    offer:         { label: 'Offer',         cls: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
    under_contract:{ label: 'Contracted',    cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
    post_close:    { label: 'Closed',        cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
    inactive:      { label: 'Inactive',      cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
  };
  const { label, cls } = map[stage] || map.inactive;
  return <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${cls}`}>{label}</span>;
}

// ── Dashboard view ───────────────────────────────────────────────────────────
function MockDashboard({ slug }: { slug: string }) {
  const stat = useMemo(() => CLIENT_STATS.find(s => s.slug === slug), [slug]);
  if (!stat) return <div className="p-8 text-center text-gray-400">No data</div>;

  const totalContacts = Math.round(stat.apptsPerMonth * 3.8);
  const activeLeads   = Math.round(stat.apptsPerMonth * 1.8);
  const customers     = Math.round(stat.dealsPerMonth * 5.5);
  const activeDeals   = Math.round(stat.dealsPerMonth * 2.8);
  const emailsSent    = Math.round(stat.emailsTotal / 4);
  const textsSent     = Math.round(stat.textsTotal / 4);
  const bookings      = stat.apptsPerMonth;
  const closings      = stat.dealsPerMonth;
  const revenue       = stat.dealsPerMonth * stat.avgGCI;

  const funnelData = computeFunnelFromStats(stat.dealsPerMonth, stat.apptsPerMonth);

  const topStats = [
    { label: 'Total Contacts', value: totalContacts.toLocaleString(), color: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600 dark:text-primary-400', Icon: Users },
    { label: 'Active Leads',   value: activeLeads.toLocaleString(),   color: 'bg-green-100 dark:bg-green-900/30',   iconColor: 'text-green-600 dark:text-green-400',   Icon: TrendingUp },
    { label: 'Customers',      value: customers.toLocaleString(),      color: 'bg-blue-100 dark:bg-blue-900/30',     iconColor: 'text-blue-600 dark:text-blue-400',     Icon: Mail },
    { label: 'Active Deals',   value: activeDeals.toLocaleString(),    color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', Icon: Phone },
  ];
  const extStats = [
    { label: 'Emails Sent', value: emailsSent.toLocaleString(),    color: 'bg-blue-100 dark:bg-blue-900/30',     iconColor: 'text-blue-600 dark:text-blue-400',     Icon: Mail },
    { label: 'Texts Sent',  value: textsSent.toLocaleString(),     color: 'bg-green-100 dark:bg-green-900/30',   iconColor: 'text-green-600 dark:text-green-400',   Icon: MessageSquare },
    { label: 'Bookings',    value: bookings.toLocaleString(),       color: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400', Icon: CalendarCheck },
    { label: 'Closings',    value: closings.toLocaleString(),       color: 'bg-amber-100 dark:bg-amber-900/30',   iconColor: 'text-amber-600 dark:text-amber-400',   Icon: Award },
    { label: 'Revenue',     value: `$${revenue.toLocaleString()}`,  color: 'bg-emerald-100 dark:bg-emerald-900/30',iconColor: 'text-emerald-600 dark:text-emerald-400',Icon: DollarSign },
  ];

  return (
    <div>
      {/* Top 4 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {topStats.map(s => (
          <div key={s.label} className="card min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{s.label}</p>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{s.value}</p>
              </div>
              <div className={`p-2 md:p-3 ${s.color} rounded-xl flex-shrink-0`}>
                <s.Icon className={`w-5 h-5 md:w-6 md:h-6 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Extended stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {extStats.map(s => (
          <div key={s.label} className="card min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{s.label}</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{s.value}</p>
              </div>
              <div className={`p-2 md:p-3 ${s.color} rounded-xl flex-shrink-0`}>
                <s.Icon className={`w-4 h-4 md:w-5 md:h-5 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Funnel diagram */}
      <FunnelDiagram data={funnelData} />
    </div>
  );
}

// ── Calendar view ─────────────────────────────────────────────────────────────
function MockCalendar({ slug }: { slug: string }) {
  const events = useMemo(() => generateMockCalendarEvents(slug), [slug]);
  const [selectedDate, setSelectedDate] = useState('2026-04-07');

  const byDate = useMemo(() => {
    const m: Record<string, typeof events> = {};
    for (const e of events) {
      if (!m[e.date]) m[e.date] = [];
      m[e.date].push(e);
    }
    return m;
  }, [events]);

  const WEEK = ['2026-04-07','2026-04-08','2026-04-09','2026-04-10','2026-04-11','2026-04-12','2026-04-13'];
  const dayEvts = byDate[selectedDate] || [];

  const typeStyles = {
    crm:      'border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    personal: 'border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-900/20',
    blocked:  'border-l-4 border-gray-400 bg-gray-100 dark:bg-gray-800/50',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">April 2026</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> CRM</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" /> Personal</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" /> Blocked</span>
        </div>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1">
        {WEEK.map((date, i) => {
          const d = new Date(date + 'T00:00:00');
          const count = (byDate[date] || []).length;
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${isSelected ? 'bg-primary-600 text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'}`}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{DAY_LABELS[i]}</span>
              <span className="text-lg font-bold mt-0.5">{d.getDate()}</span>
              {count > 0 && (
                <span className={`mt-1 w-5 h-1.5 rounded-full ${isSelected ? 'bg-white/50' : 'bg-primary-400 dark:bg-primary-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Events for selected day */}
      <div className="space-y-2">
        {dayEvts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">No events — free day!</div>
        ) : (
          dayEvts.map(evt => (
            <div key={evt.id} className={`rounded-xl p-3 ${typeStyles[evt.type]}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{evt.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {fmtTime(evt.startHour, evt.startMin)}
                    {' '}–{' '}
                    {(() => { const end = evt.startHour * 60 + evt.startMin + evt.durationMins; return fmtTime(Math.floor(end/60), end%60); })()}
                    {' '}·{' '}{evt.durationMins >= 60 ? `${evt.durationMins/60}h` : `${evt.durationMins}m`}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  evt.type === 'crm' ? 'bg-blue-200/60 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300' :
                  evt.type === 'personal' ? 'bg-purple-200/60 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300' :
                  'bg-gray-200/60 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>{evt.type === 'blocked' ? 'Blocked' : evt.type === 'crm' ? 'CRM' : 'Personal'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Conversations view ────────────────────────────────────────────────────────
function MockConversations({ slug }: { slug: string }) {
  const contacts = useMemo(() => generateMockContacts(slug, 18), [slug]);
  const [selectedId, setSelectedId] = useState<string | null>(contacts[0]?.id || null);

  const selected = contacts.find(c => c.id === selectedId);
  const messages = useMemo(
    () => selected ? generateMockMessages(slug, selected.id, selected.stage) : [],
    [slug, selected]
  );

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111113]">
      {/* Contact list sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 dark:border-white/8 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Conversations</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{contacts.length} contacts</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-white/5 transition-colors hover:bg-gray-50 dark:hover:bg-white/3 ${selectedId === c.id ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-l-primary-500' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center flex-shrink-0 relative">
                  <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                    {c.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </span>
                  {c.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{c.lastTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StageBadge stage={c.stage} />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.lastText}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Message thread */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                {selected.name.split(' ').map(n => n[0]).join('').slice(0,2)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.name}</p>
              <StageBadge stage={selected.stage} />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((msg, i) => {
              const isAgent = msg.from === 'agent';
              return (
                <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isAgent ? 'order-2' : 'order-1'}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isAgent
                        ? 'bg-primary-600 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-white/8 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                    }`}>
                      {msg.text}
                    </div>
                    <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${isAgent ? 'text-right' : 'text-left'}`}>
                      {msg.daysAgo === 0 ? `Today ${msg.time}` : msg.daysAgo === 1 ? `Yesterday ${msg.time}` : `${msg.daysAgo}d ago ${msg.time}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compose bar (display only) */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-white/8">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-100 dark:bg-white/6 rounded-xl">
              <p className="flex-1 text-sm text-gray-400 dark:text-gray-500">Message {selected.name.split(' ')[0]}…</p>
              <button className="p-1.5 bg-primary-600 rounded-lg opacity-50 cursor-default">
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          Select a conversation
        </div>
      )}
    </div>
  );
}

// ── Pipeline / Opportunities view ─────────────────────────────────────────────
function MockPipeline({ slug }: { slug: string }) {
  const stat = useMemo(() => CLIENT_STATS.find(s => s.slug === slug), [slug]);
  const pipeline = useMemo(
    () => stat ? generateMockPipeline(slug, stat.dealsPerMonth, stat.avgGCI) : {},
    [slug, stat]
  );

  const totalValue = useMemo(() =>
    Object.values(pipeline).flat().reduce((sum, d) => sum + d.value, 0), [pipeline]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pipeline</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total value: <span className="font-semibold text-gray-900 dark:text-gray-100">${totalValue.toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Kanban columns — scrollable horizontally */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => {
          const deals = pipeline[stage] || [];
          const stageTotal = deals.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage} className="flex-shrink-0 w-60 flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${STAGE_COLORS[stage]}`}>
                    {stage}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{deals.length}</span>
                </div>
                {stageTotal > 0 && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">${(stageTotal/1000).toFixed(0)}k</span>
                )}
              </div>

              <div className="flex flex-col gap-2 min-h-[80px]">
                {deals.map(deal => (
                  <div
                    key={deal.id}
                    className="bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/8 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <p className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">
                      {deal.contact}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{deal.address}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                        ${deal.value.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{deal.daysInStage}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stub for non-featured mock accounts on complex views ─────────────────────
function StubView({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Inbox className="w-7 h-7 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label} — No data yet</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This account is in view-only demo mode</p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function MockSubAccountContent({ slug, activeView }: Props) {
  const isFeatured = FEATURED_SLUGS.has(slug);

  switch (activeView) {
    case 'conversations':
      return isFeatured ? <MockConversations slug={slug} /> : <StubView label="Conversations" />;
    case 'calendar':
      return isFeatured ? <MockCalendar slug={slug} /> : <StubView label="Calendar" />;
    case 'pipelines':
      return isFeatured ? <MockPipeline slug={slug} /> : <StubView label="Pipeline" />;
    default:
      return <MockDashboard slug={slug} />;
  }
}
