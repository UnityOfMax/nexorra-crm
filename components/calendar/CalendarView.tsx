'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, Check, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase-browser';
import { Activity } from '@/types';
import CreateEventModal from './CreateEventModal';

// Use the API route (supabaseAdmin) so agency users can see sub-account calendars
// despite not being in account_members for sub-accounts (RLS bypass).
async function fetchCalendarData(accountId: string, start: Date, end: Date) {
  const res = await fetch(
    `/api/calendar?accountId=${accountId}&start=${start.toISOString()}&end=${end.toISOString()}`
  );
  if (!res.ok) throw new Error('Failed to fetch calendar data');
  return res.json() as Promise<{ activities: Activity[]; googleIds: string[] }>;
}

interface CalendarViewProps {
  accountId: string;
  userId: string;
  defaultTimezone?: string;
}

type ViewMode = 'month' | 'week' | 'day';

// Full 24-hour grid (midnight to midnight)
const HOUR_START = 0;
const HOUR_END = 24;
const HOUR_HEIGHT = 56;
const TOTAL_HOURS = HOUR_END - HOUR_START;

const COMMON_TIMEZONES = [
  { label: 'Browser default', value: '' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Eastern (ET)', value: 'America/New_York' },
  { label: 'Central (CT)', value: 'America/Chicago' },
  { label: 'Mountain (MT)', value: 'America/Denver' },
  { label: 'Pacific (PT)', value: 'America/Los_Angeles' },
  { label: 'Alaska', value: 'America/Anchorage' },
  { label: 'Hawaii', value: 'Pacific/Honolulu' },
  { label: 'Atlantic (AT)', value: 'America/Halifax' },
  { label: 'Vancouver (PT)', value: 'America/Vancouver' },
  { label: 'Toronto (ET)', value: 'America/Toronto' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Mumbai (IST)', value: 'Asia/Kolkata' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'Auckland (NZST)', value: 'Pacific/Auckland' },
];

// ─── Timezone-aware helpers ──────────────────────────────────────────────────

function getEffectiveTz(tz: string): string {
  return tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getDateParts(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: getEffectiveTz(tz),
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: false,
  });
  const obj: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) obj[p.type] = p.value;
  const hour = parseInt(obj.hour) === 24 ? 0 : parseInt(obj.hour);
  return {
    year: parseInt(obj.year),
    month: parseInt(obj.month), // 1-based
    day: parseInt(obj.day),
    hour,
    minute: parseInt(obj.minute),
  };
}

function isSameDayTz(a: Date, b: Date, tz: string): boolean {
  const pa = getDateParts(a, tz);
  const pb = getDateParts(b, tz);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

function getEventTopPctTz(dateStr: string, tz: string): number {
  const parts = getDateParts(new Date(dateStr), tz);
  const minutes = parts.hour * 60 + parts.minute;
  return Math.max(0, ((minutes - HOUR_START * 60) / (TOTAL_HOURS * 60)) * 100);
}

function formatTimeTz(dateStr: string, tz: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: getEffectiveTz(tz),
  });
}

function getCurrentMinutesInTz(tz: string): number {
  const parts = getDateParts(new Date(), tz);
  return parts.hour * 60 + parts.minute;
}

// ─── Unchanged pure helpers ──────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function getEventHeightPct(durationMin: number): number {
  return Math.max((durationMin / (TOTAL_HOURS * 60)) * 100, 1.5);
}

// ─── Event Block (week/day grid) ─────────────────────────────────────────────
function EventBlock({
  activity, isGoogle, timezone, onClick,
}: {
  activity: Activity;
  isGoogle: boolean;
  timezone: string;
  onClick: () => void;
}) {
  if (!activity.due_date) return null;
  const topPct = getEventTopPctTz(activity.due_date, timezone);
  const heightPct = getEventHeightPct(60);

  if (isGoogle) {
    return (
      <div style={{
        position: 'absolute', top: `${topPct}%`, height: `${heightPct}%`,
        left: 2, right: 2, background: 'var(--cal-google-bg)', border: '1.5px dashed var(--cal-google-border)',
        borderRadius: 6, padding: '2px 6px', overflow: 'hidden', pointerEvents: 'none', zIndex: 1,
      }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--cal-text-faint)', fontWeight: 500 }}>Busy</span>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute', top: `${topPct}%`, height: `${heightPct}%`,
        left: 2, right: 2, background: 'var(--cal-event-bg)', borderRadius: 6,
        padding: '3px 7px', overflow: 'hidden', cursor: 'pointer', zIndex: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}
    >
      <p style={{ fontSize: '0.72rem', color: 'var(--cal-event-text)', fontWeight: 600, lineHeight: 1.3, margin: 0 }}>
        {formatTimeTz(activity.due_date, timezone)}
      </p>
      <p style={{ fontSize: '0.72rem', color: 'var(--cal-event-sub)', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {activity.subject || 'Meeting'}
      </p>
    </div>
  );
}

// ─── Event Detail Popover ────────────────────────────────────────────────────
function EventPopover({
  activity, timezone, onClose, onMarkComplete,
}: {
  activity: Activity;
  timezone: string;
  onClose: () => void;
  onMarkComplete: (id: string, completed: boolean) => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', padding: 16 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cal-popover-bg)', borderRadius: 12, boxShadow: 'var(--cal-popover-shadow)', width: '100%', maxWidth: 340, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cal-text)', margin: 0, paddingRight: 8 }}>
            {activity.subject || 'Meeting'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--cal-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {activity.due_date && (
          <p style={{ fontSize: '0.85rem', color: 'var(--cal-text-muted)', marginBottom: 8 }}>
            🕐 {new Date(activity.due_date).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              timeZone: getEffectiveTz(timezone),
            })} at {formatTimeTz(activity.due_date, timezone)}
            {timezone && <span style={{ fontSize: '0.75rem', color: 'var(--cal-text-faint)', marginLeft: 4 }}>({timezone})</span>}
          </p>
        )}

        {activity.description && (
          <p style={{ fontSize: '0.82rem', color: 'var(--cal-text-muted)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {activity.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: activity.completed ? 'var(--cal-badge-bg)' : '#dcfce7', color: activity.completed ? 'var(--cal-text-muted)' : '#15803d' }}>
            {activity.completed ? 'Completed' : 'Confirmed'}
          </span>
          {!activity.completed && (
            <button
              onClick={() => onMarkComplete(activity.id, true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer', fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}
            >
              <Check size={14} /> Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Time Grid (shared between week & day) ───────────────────────────────────
function TimeGrid({
  days, activities, googleIds, today, timezone, onCellClick, onEventClick,
}: {
  days: Date[];
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
  timezone: string;
  onCellClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);
  const currentMinFromStart = getCurrentMinutesInTz(timezone) - HOUR_START * 60;
  const currentTimePct = (currentMinFromStart / (TOTAL_HOURS * 60)) * 100;

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTarget = (currentMinFromStart / (TOTAL_HOURS * 60)) * scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop = Math.max(0, scrollTarget - 100);
    }
  }, []);

  return (
    <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, position: 'relative', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
      <div style={{ display: 'flex', minHeight: TOTAL_HOURS * HOUR_HEIGHT }}>
        {/* Time labels */}
        <div style={{ width: 52, flexShrink: 0 }}>
          {hours.map((h, i) => (
            <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}>
              {i > 0 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--cal-text-faint)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {formatHour(h)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const dayActivities = activities.filter(a => a.due_date && isSameDayTz(new Date(a.due_date), day, timezone));
          const isToday = isSameDayTz(day, today, timezone);

          return (
            <div key={di} style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--cal-border-light)' }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onCellClick(d);
                  }}
                  style={{ height: HOUR_HEIGHT, borderTop: i === 0 ? 'none' : '1px solid var(--cal-border-light)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cal-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                />
              ))}

              {/* Current time indicator */}
              {isToday && currentTimePct >= 0 && currentTimePct <= 100 && (
                <div style={{ position: 'absolute', top: `${currentTimePct}%`, left: 0, right: 0, height: 2, background: '#ef4444', zIndex: 3, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                </div>
              )}

              {dayActivities.map(a => (
                <EventBlock
                  key={a.id}
                  activity={a}
                  isGoogle={googleIds.has(a.id)}
                  timezone={timezone}
                  onClick={() => onEventClick(a)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────
const WeekView = memo(function WeekView({
  weekStart, activities, googleIds, today, timezone, onCellClick, onEventClick,
}: {
  weekStart: Date;
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
  timezone: string;
  onCellClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 200px)', minHeight: 500 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--cal-border)', flexShrink: 0 }}>
        <div style={{ width: 52, flexShrink: 0 }} />
        {days.map((day, i) => {
          const isToday = isSameDayTz(day, today, timezone);
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderLeft: '1px solid var(--cal-border-light)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--cal-text-faint)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {dayNames[day.getDay()]}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: isToday ? 'var(--cal-event-bg)' : 'transparent', color: isToday ? '#fff' : 'var(--cal-text)', fontWeight: isToday ? 700 : 600, fontSize: '0.85rem', marginTop: 2 }}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <TimeGrid days={days} activities={activities} googleIds={googleIds} today={today} timezone={timezone} onCellClick={onCellClick} onEventClick={onEventClick} />
    </div>
  );
});

// ─── Day View ────────────────────────────────────────────────────────────────
const DayView = memo(function DayView({
  date, activities, googleIds, today, timezone, onCellClick, onEventClick,
}: {
  date: Date;
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
  timezone: string;
  onCellClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const isToday = isSameDayTz(date, today, timezone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 200px)', minHeight: 500 }}>
      <div style={{ borderBottom: '1px solid var(--cal-border)', padding: '8px 0 8px 52px', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isToday ? 'var(--cal-event-bg)' : 'var(--cal-text)' }}>
          {dayNames[date.getDay()]}, {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </span>
        {isToday && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--cal-event-bg)', fontWeight: 600 }}>Today</span>}
      </div>
      <TimeGrid days={[date]} activities={activities} googleIds={googleIds} today={today} timezone={timezone} onCellClick={onCellClick} onEventClick={onEventClick} />
    </div>
  );
});

// ─── Month View ──────────────────────────────────────────────────────────────
const MonthView = memo(function MonthView({
  currentDate, activities, googleIds, today, timezone, onDayClick, onEventClick,
}: {
  currentDate: Date;
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
  timezone: string;
  onDayClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getForDay = (day: number) =>
    activities.filter(a => {
      if (!a.due_date) return false;
      const parts = getDateParts(new Date(a.due_date), timezone);
      // month in getDateParts is 1-based; JS month is 0-based
      return parts.day === day && parts.month === month + 1 && parts.year === year;
    });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--cal-border)', marginBottom: 4 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.72rem', fontWeight: 600, color: 'var(--cal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--cal-border)' }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} style={{ background: 'var(--cal-bg-alt)', minHeight: 90 }} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayActivities = getForDay(day);
          const date = new Date(year, month, day);
          const isToday = isSameDayTz(date, today, timezone);

          return (
            <div
              key={day}
              onClick={() => onDayClick(date)}
              style={{ background: 'var(--cal-bg)', minHeight: 90, padding: '6px 4px', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--cal-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--cal-bg)')}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: isToday ? 'var(--cal-event-bg)' : 'transparent', color: isToday ? '#fff' : 'var(--cal-text)', fontWeight: isToday ? 700 : 500, fontSize: '0.8rem', marginBottom: 4 }}>
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayActivities.slice(0, 3).map(a => {
                  const isGoogle = googleIds.has(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={e => { e.stopPropagation(); if (!isGoogle) onEventClick(a); }}
                      style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: isGoogle ? 'var(--cal-google-bg)' : 'var(--cal-event-sub)', color: isGoogle ? 'var(--cal-text-faint)' : '#1d4ed8', border: isGoogle ? '1px dashed var(--cal-google-border)' : 'none', fontWeight: 500, cursor: isGoogle ? 'default' : 'pointer' }}
                    >
                      {isGoogle ? 'Busy' : (a.subject || 'Meeting')}
                    </div>
                  );
                })}
                {dayActivities.length > 3 && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--cal-text-muted)', paddingLeft: 5 }}>
                    +{dayActivities.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── Main CalendarView ───────────────────────────────────────────────────────
export default function CalendarView({ accountId, userId, defaultTimezone }: CalendarViewProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [googleIds, setGoogleIds] = useState<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>(undefined);
  const [timezone, setTimezone] = useState<string>(defaultTimezone || '');
  const [showTzSelect, setShowTzSelect] = useState(false);
  const today = new Date();

  // Update timezone when defaultTimezone prop changes
  useEffect(() => {
    if (defaultTimezone) setTimezone(defaultTimezone);
  }, [defaultTimezone]);

  // Default to day view on mobile
  useEffect(() => {
    if (window.innerWidth < 768) setView('day');
  }, []);

  const getDateRange = useCallback(() => {
    if (view === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      return { start, end };
    }
    if (view === 'week') {
      const start = startOfWeek(currentDate);
      const end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [view, currentDate]);

  const fetchFromDb = useCallback(async (start: Date, end: Date) => {
    try {
      const { activities: acts, googleIds: gIds } = await fetchCalendarData(accountId, start, end);
      setGoogleIds(new Set(gIds));
      setActivities(acts);
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
      setActivities([]);
      setGoogleIds(new Set());
    }
  }, [accountId]);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    await fetchFromDb(start, end);
    setLoading(false);

    try {
      const syncStart = new Date();
      syncStart.setDate(syncStart.getDate() - syncStart.getDay());
      syncStart.setHours(0, 0, 0, 0);
      const syncEnd = new Date();
      syncEnd.setFullYear(syncEnd.getFullYear() + 2);

      const res = await fetch(
        `/api/integrations/google/sync?accountId=${accountId}&start=${syncStart.toISOString()}&end=${syncEnd.toISOString()}`
      );
      if (res.ok) {
        const { synced } = await res.json();
        if (synced > 0) await fetchFromDb(start, end);
      }
    } catch {
      // Non-fatal
    }
  }, [accountId, getDateRange, fetchFromDb]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  useEffect(() => {
    const interval = setInterval(() => {
      const { start, end } = getDateRange();
      fetchFromDb(start, end);
    }, 30_000);
    return () => clearInterval(interval);
  }, [getDateRange, fetchFromDb]);

  useEffect(() => {
    const channel = supabase
      .channel(`calendar-activities-${accountId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, (payload: any) => {
        const rowAccountId = payload.new?.account_id || payload.old?.account_id;
        if (rowAccountId === accountId) loadActivities();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accountId, loadActivities]);

  const handleMarkComplete = async (id: string, completed: boolean) => {
    await supabase.from('activities').update({ completed }).eq('id', id);
    setActivities(prev => prev.map(a => a.id === id ? { ...a, completed } : a));
    setSelectedActivity(prev => prev?.id === id ? { ...prev, completed } : prev);
  };

  const navigate = (dir: -1 | 1) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === 'month') d.setMonth(d.getMonth() + dir);
      else if (view === 'week') d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  const handleCellClick = (date: Date) => {
    setPreselectedDate(date);
    setShowCreateModal(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const getDateLabel = () => {
    if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth()) {
        return `${ws.toLocaleString('default', { month: 'long' })} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      }
      return `${ws.toLocaleString('default', { month: 'short' })} ${ws.getDate()} – ${we.toLocaleString('default', { month: 'short' })} ${we.getDate()}, ${we.getFullYear()}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const tzLabel = timezone
    ? (COMMON_TIMEZONES.find(t => t.value === timezone)?.label || timezone)
    : 'Browser TZ';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: '1px solid var(--cal-border)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--cal-text-secondary)' }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => navigate(1)} style={{ background: 'none', border: '1px solid var(--cal-border)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--cal-text-secondary)' }}>
            <ChevronRight size={16} />
          </button>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cal-text)', margin: 0 }}>{getDateLabel()}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Timezone selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTzSelect(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--cal-border)', background: 'var(--cal-bg)', fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', color: 'var(--cal-text-secondary)' }}
            >
              <Globe size={13} />
              {tzLabel}
            </button>
            {showTzSelect && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--cal-popover-bg)', border: '1px solid var(--cal-border)', borderRadius: 10, boxShadow: 'var(--cal-popover-shadow)', zIndex: 100, minWidth: 220, maxHeight: 280, overflowY: 'auto' }}>
                {COMMON_TIMEZONES.map(tz => (
                  <button
                    key={tz.value}
                    onClick={() => { setTimezone(tz.value); setShowTzSelect(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', background: timezone === tz.value ? '#eff6ff' : 'transparent', color: timezone === tz.value ? '#1d4ed8' : 'var(--cal-text-secondary)', fontSize: '0.82rem', border: 'none', cursor: 'pointer', fontWeight: timezone === tz.value ? 600 : 400 }}
                    onMouseEnter={e => (e.currentTarget.style.background = timezone === tz.value ? '#eff6ff' : 'var(--cal-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = timezone === tz.value ? '#eff6ff' : 'transparent')}
                  >
                    {tz.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={goToToday} style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid var(--cal-border)', background: 'var(--cal-bg)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--cal-text-secondary)' }}>
            Today
          </button>

          {/* View switcher */}
          <div style={{ display: 'flex', border: '1px solid var(--cal-border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{ padding: '5px 12px', background: view === v ? 'var(--cal-event-bg)' : 'var(--cal-bg)', color: view === v ? '#fff' : 'var(--cal-text-secondary)', border: 'none', borderLeft: v !== 'day' ? '1px solid var(--cal-border)' : 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s' }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setPreselectedDate(undefined); setShowCreateModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--cal-event-bg)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={14} /> New Event
          </button>
        </div>
      </div>

      {/* Close timezone dropdown when clicking outside */}
      {showTzSelect && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowTzSelect(false)} />
      )}

      {/* ── Calendar Body ── */}
      <div style={{ background: 'var(--cal-bg)', borderRadius: 12, border: '1px solid var(--cal-border)', overflow: 'hidden', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--cal-text-faint)', fontSize: '0.9rem' }}>
            Loading calendar…
          </div>
        ) : view === 'month' ? (
          <MonthView currentDate={currentDate} activities={activities} googleIds={googleIds} today={today} timezone={timezone} onDayClick={handleDayClick} onEventClick={setSelectedActivity} />
        ) : view === 'week' ? (
          <WeekView weekStart={startOfWeek(currentDate)} activities={activities} googleIds={googleIds} today={today} timezone={timezone} onCellClick={handleCellClick} onEventClick={setSelectedActivity} />
        ) : (
          <DayView date={currentDate} activities={activities} googleIds={googleIds} today={today} timezone={timezone} onCellClick={handleCellClick} onEventClick={setSelectedActivity} />
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--cal-event-bg)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--cal-text-muted)' }}>Your meetings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--cal-google-bg)', border: '1.5px dashed var(--cal-google-border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--cal-text-muted)' }}>Google Calendar (busy)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--cal-text-muted)' }}>Current time</span>
        </div>
        {timezone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={12} style={{ color: 'var(--cal-text-muted)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--cal-text-muted)' }}>{timezone}</span>
          </div>
        )}
      </div>

      {/* ── Event Popover ── */}
      {selectedActivity && !googleIds.has(selectedActivity.id) && (
        <EventPopover
          activity={selectedActivity}
          timezone={timezone}
          onClose={() => setSelectedActivity(null)}
          onMarkComplete={handleMarkComplete}
        />
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <CreateEventModal
          accountId={accountId}
          userId={userId}
          preselectedDate={preselectedDate}
          onClose={() => { setShowCreateModal(false); setPreselectedDate(undefined); }}
          onEventCreated={loadActivities}
        />
      )}
    </div>
  );
}
