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
  computeAllTimeStats,
  PIPELINE_STAGES,
  STAGE_COLORS,
  MockContactItem,
} from '@/lib/data/mock-subaccounts';
import FunnelDiagram from './FunnelDiagram';
import {
  Users, TrendingUp, Mail, MessageSquare, CalendarCheck, Award, DollarSign,
  Send, Inbox, Play, Phone, CheckCircle,
} from 'lucide-react';

type Timeframe = '7d' | '30d' | 'all';

// ── Stephanie Collins: hardcoded featured conversation for sabrina-delisle ──
type SpecialMsgType = 'text' | 'call' | 'booking';
interface SpecialMessage {
  id: string;
  from: 'agent' | 'contact';
  type: SpecialMsgType;
  text?: string;
  time: string;
  // call recording fields
  callDuration?: string;
  // booking fields
  bookingName?: string;
  bookingDate?: string;
  bookingTime?: string;
}

const STEPHANIE_MESSAGES: SpecialMessage[] = [
  {
    id: 'sc-1', from: 'contact', type: 'text',
    text: "Hi there, I saw your ad on Instagram. My husband and I have been talking about buying for a while now.",
    time: '10:14 AM',
  },
  {
    id: 'sc-2', from: 'agent', type: 'text',
    text: "Hey Stephanie! Really glad you reached out. A lot of people are at that same spot right now. What area are you two thinking?",
    time: '10:14 AM',
  },
  {
    id: 'sc-3', from: 'contact', type: 'text',
    text: "Probably somewhere in the Westlake area. We have two kids so schools matter a lot to us.",
    time: '10:17 AM',
  },
  {
    id: 'sc-4', from: 'agent', type: 'text',
    text: "Westlake is a solid choice, especially for schools. Quick question though, are you pre-approved yet or still working out the budget side of things?",
    time: '10:18 AM',
  },
  {
    id: 'sc-5', from: 'contact', type: 'text',
    text: "Not yet. We're not sure where to even start with that honestly.",
    time: '10:21 AM',
  },
  {
    id: 'sc-6', from: 'agent', type: 'text',
    text: "No worries at all, you don't need it before we talk. Happy to walk you through the whole process on a quick call. 20 minutes and you'll know exactly where to start.",
    time: '10:21 AM',
  },
  {
    id: 'sc-7', from: 'contact', type: 'text',
    text: "That sounds good actually. When works for you?",
    time: '10:24 AM',
  },
  {
    id: 'sc-8', from: 'agent', type: 'text',
    text: "I have Thursday at 11am or Friday at 2pm open. Which one fits better?",
    time: '10:24 AM',
  },
  {
    id: 'sc-9', from: 'contact', type: 'text',
    text: "Friday at 2 works perfectly.",
    time: '10:26 AM',
  },
  {
    id: 'sc-10', from: 'agent', type: 'call',
    callDuration: '4:51',
    time: '2:01 PM',
  },
  {
    id: 'sc-11', from: 'agent', type: 'text',
    text: "Really enjoyed talking with you both. So you're looking in the $520-580k range, Westlake or Bee Cave, and ideally in before the school year. I'll pull some listings tonight that fit and send them over.",
    time: '2:21 PM',
  },
  {
    id: 'sc-12', from: 'contact', type: 'text',
    text: "Yes that's exactly right. Thank you so much, this was so helpful.",
    time: '2:34 PM',
  },
  {
    id: 'sc-13', from: 'agent', type: 'text',
    text: "One more thing before we hang up. Want to lock in a proper sit down so we can go through those listings together? I can get you in Tuesday at 10am.",
    time: '2:35 PM',
  },
  {
    id: 'sc-14', from: 'contact', type: 'text',
    text: "Tuesday at 10 works great for us.",
    time: '2:38 PM',
  },
  {
    id: 'sc-15', from: 'agent', type: 'booking',
    bookingName: 'Stephanie Collins',
    bookingDate: 'Tuesday, April 8, 2026',
    bookingTime: '10:00 AM',
    time: '2:38 PM',
  },
];

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

// ── Timeframe toggle shared component ────────────────────────────────────────
function TimeframeToggle({ value, onChange }: { value: Timeframe; onChange: (tf: Timeframe) => void }) {
  const options: { key: Timeframe; label: string }[] = [
    { key: '30d', label: 'Last 30d' },
    { key: '7d',  label: 'Last 7d' },
    { key: 'all', label: 'All Time' },
  ];
  return (
    <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-white/5 rounded-lg">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
            value === o.key
              ? 'bg-white dark:bg-white/12 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Dashboard view ───────────────────────────────────────────────────────────
function MockDashboard({ slug }: { slug: string }) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const stat = useMemo(() => CLIENT_STATS.find(s => s.slug === slug), [slug]);

  const allTime = useMemo(() => stat ? computeAllTimeStats(
    stat.slug, stat.startDate, stat.dealsPerMonth, stat.apptsPerMonth,
    stat.textsTotal, stat.emailsTotal, stat.avgGCI
  ) : null, [stat]);

  if (!stat) return <div className="p-8 text-center text-gray-400">No data</div>;

  const factor7d = 7 / 30;

  // Monthly rates derived from all-time totals (guarantees period <= all-time)
  const months = allTime!.months;
  const emailsPerMonth = allTime!.totalEmails / months;
  const textsPerMonth  = allTime!.totalTexts  / months;

  // Derived stats by timeframe
  const totalContacts = timeframe === 'all'
    ? allTime!.totalContacts
    : Math.round(stat.apptsPerMonth * (timeframe === '7d' ? factor7d : 1) * 3.8);
  const activeLeads = timeframe === 'all'
    ? Math.round(allTime!.totalBookings * 1.8)
    : Math.round(stat.apptsPerMonth * (timeframe === '7d' ? factor7d : 1) * 1.8);
  // Customers: cumulative — all-time is the ceiling; 30d/7d derive proportionally
  const customersAllTime = Math.round(allTime!.totalDeals * 1.6);
  const customers   = timeframe === 'all'
    ? customersAllTime
    : Math.min(customersAllTime, Math.round(stat.dealsPerMonth * (timeframe === '7d' ? factor7d : 1) * 2.8));
  const activeDeals = Math.round(stat.dealsPerMonth * 2.8); // always current
  const emailsSent  = timeframe === 'all'
    ? allTime!.totalEmails
    : Math.round(emailsPerMonth * (timeframe === '7d' ? factor7d : 1));
  const textsSent   = timeframe === 'all'
    ? allTime!.totalTexts
    : Math.round(textsPerMonth * (timeframe === '7d' ? factor7d : 1));
  const bookings    = timeframe === 'all'
    ? allTime!.totalBookings
    : Math.floor(stat.apptsPerMonth * (timeframe === '7d' ? factor7d : 1));
  const closings    = timeframe === 'all'
    ? allTime!.totalClosings
    : Math.floor(stat.dealsPerMonth * (timeframe === '7d' ? factor7d : 1));
  const revenue     = timeframe === 'all'
    ? allTime!.totalRevenue
    : Math.floor(stat.dealsPerMonth * (timeframe === '7d' ? factor7d : 1)) * stat.avgGCI;

  const funnelMultiplier = timeframe === 'all' ? allTime!.months : (timeframe === '7d' ? factor7d : 1);
  const funnelData = computeFunnelFromStats(stat.dealsPerMonth, stat.apptsPerMonth, funnelMultiplier);

  const topStats = [
    { label: 'Total Contacts', value: totalContacts.toLocaleString(), color: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600 dark:text-primary-400', Icon: Users },
    { label: 'Active Leads',   value: activeLeads.toLocaleString(),   color: 'bg-green-100 dark:bg-green-900/30',   iconColor: 'text-green-600 dark:text-green-400',   Icon: TrendingUp },
    { label: 'Customers',      value: customers.toLocaleString(),      color: 'bg-blue-100 dark:bg-blue-900/30',     iconColor: 'text-blue-600 dark:text-blue-400',     Icon: Mail },
    { label: 'Active Deals',   value: activeDeals.toLocaleString(),    color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400', Icon: CalendarCheck },
  ];
  const extStats = [
    { label: 'Emails Sent', value: emailsSent.toLocaleString(),   color: 'bg-blue-100 dark:bg-blue-900/30',      iconColor: 'text-blue-600 dark:text-blue-400',      Icon: Mail },
    { label: 'Texts Sent',  value: textsSent.toLocaleString(),    color: 'bg-green-100 dark:bg-green-900/30',    iconColor: 'text-green-600 dark:text-green-400',    Icon: MessageSquare },
    { label: 'Bookings',    value: bookings.toLocaleString(),      color: 'bg-indigo-100 dark:bg-indigo-900/30',  iconColor: 'text-indigo-600 dark:text-indigo-400',  Icon: CalendarCheck },
    { label: 'Closings',    value: closings.toLocaleString(),      color: 'bg-amber-100 dark:bg-amber-900/30',    iconColor: 'text-amber-600 dark:text-amber-400',    Icon: Award },
    { label: 'Revenue',     value: `$${revenue.toLocaleString()}`, color: 'bg-emerald-100 dark:bg-emerald-900/30',iconColor: 'text-emerald-600 dark:text-emerald-400',Icon: DollarSign },
  ];

  return (
    <div>
      {/* Timeframe toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard Overview</h2>
        <TimeframeToggle value={timeframe} onChange={setTimeframe} />
      </div>

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
// ── Call recording bubble ────────────────────────────────────────────────────
function CallRecordingBubble({ duration, isAgent }: { duration: string; isAgent: boolean }) {
  const bars = [3, 5, 8, 6, 10, 7, 4, 9, 6, 5, 8, 4, 7, 10, 6, 3, 8, 5, 9, 4, 7, 6, 10, 5, 3, 8, 6, 4, 9, 5];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
      isAgent
        ? 'bg-primary-600 text-white rounded-br-sm'
        : 'bg-gray-100 dark:bg-white/8 text-gray-900 dark:text-gray-100 rounded-bl-sm'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAgent ? 'bg-white/20' : 'bg-primary-100 dark:bg-primary-900/40'
      }`}>
        <Phone className={`w-3.5 h-3.5 ${isAgent ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
      </div>
      <button className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAgent ? 'bg-white/20 hover:bg-white/30' : 'bg-primary-600 hover:bg-primary-700'
      } transition-colors`}>
        <Play className={`w-3 h-3 ${isAgent ? 'text-white' : 'text-white'} ml-0.5`} />
      </button>
      {/* Waveform */}
      <div className="flex items-center gap-[2px] flex-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`rounded-full flex-shrink-0 ${isAgent ? 'bg-white/50' : 'bg-primary-400 dark:bg-primary-500'}`}
            style={{ width: 2, height: `${h}px` }}
          />
        ))}
      </div>
      <span className={`text-[11px] font-mono flex-shrink-0 ${isAgent ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
        {duration}
      </span>
    </div>
  );
}

// ── Booking confirmation box ─────────────────────────────────────────────────
function BookingConfirmedBubble({ name, date, time }: { name: string; date: string; time: string }) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20 my-2">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 dark:bg-emerald-500/15 border-b border-emerald-200 dark:border-emerald-500/20">
        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Lead Booking Confirmed</p>
        <span className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-500">Today 2:38 PM</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-500 uppercase tracking-wide mb-0.5">Client</p>
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{name}</p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-500 uppercase tracking-wide mb-0.5">Type</p>
          <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Buyer Consultation</p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-500 uppercase tracking-wide mb-0.5">Date</p>
          <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{date}</p>
        </div>
        <div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-500 uppercase tracking-wide mb-0.5">Time</p>
          <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{time}</p>
        </div>
      </div>
      <div className="px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/10 border-t border-emerald-200 dark:border-emerald-500/20">
        <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Booked by AI assistant. Calendar invite sent.</p>
      </div>
    </div>
  );
}

function MockConversations({ slug }: { slug: string }) {
  const isStephanie = slug === 'sabrina-delisle';

  const stephanieMockContact: MockContactItem = {
    id: 'stephanie-collins-fixed',
    name: 'Stephanie Collins',
    stage: 'scheduling',
    lastText: 'Tuesday at 10 works great for us.',
    lastTime: '2:38 PM',
    unread: 0,
  };

  const contacts = useMemo(() => {
    const generated = generateMockContacts(slug, 70);
    if (!isStephanie) return generated;
    // Put Stephanie at the top, filter out any random Stephanie collision
    const rest = generated.filter(c => c.name !== 'Stephanie Collins');
    return [stephanieMockContact, ...rest];
  }, [slug, isStephanie]);

  const [selectedId, setSelectedId] = useState<string | null>(
    isStephanie ? 'stephanie-collins-fixed' : (contacts[0]?.id || null)
  );

  const selected = contacts.find(c => c.id === selectedId);
  const isSpecial = selectedId === 'stephanie-collins-fixed';

  const messages = useMemo(
    () => (!isSpecial && selected) ? generateMockMessages(slug, selected.id, selected.stage) : [],
    [slug, selected, isSpecial]
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
            {isSpecial ? (
              <>
                {STEPHANIE_MESSAGES.map(msg => {
                  const isAgent = msg.from === 'agent';

                  if (msg.type === 'booking') {
                    return (
                      <div key={msg.id}>
                        <BookingConfirmedBubble
                          name={msg.bookingName!}
                          date={msg.bookingDate!}
                          time={msg.bookingTime!}
                        />
                      </div>
                    );
                  }

                  if (msg.type === 'call') {
                    return (
                      <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[75%]">
                          <CallRecordingBubble duration={msg.callDuration!} isAgent={isAgent} />
                          <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${isAgent ? 'text-right' : 'text-left'}`}>
                            Today {msg.time}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%]`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isAgent
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 dark:bg-white/8 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                        }`}>
                          {msg.text}
                        </div>
                        <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${isAgent ? 'text-right' : 'text-left'}`}>
                          Today {msg.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              messages.map((msg) => {
                const isAgent = msg.from === 'agent';
                return (
                  <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%]`}>
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
              })
            )}
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
    () => stat ? generateMockPipeline(slug, stat.dealsPerMonth, stat.avgGCI, stat.apptsPerMonth) : {},
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
