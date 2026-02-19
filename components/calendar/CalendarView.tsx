'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Activity } from '@/types';
import CreateEventModal from './CreateEventModal';

interface CalendarViewProps {
  accountId: string;
  userId: string;
}

type ViewMode = 'month' | 'week' | 'day';

// Hours visible in week/day grid (7am – 10pm)
const HOUR_START = 7;
const HOUR_END = 22;
const HOUR_HEIGHT = 64; // px per hour
const TOTAL_HOURS = HOUR_END - HOUR_START;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getEventTopPct(dateStr: string): number {
  const d = new Date(dateStr);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const startMin = HOUR_START * 60;
  return Math.max(0, ((minutes - startMin) / (TOTAL_HOURS * 60)) * 100);
}

function getEventHeightPct(durationMin: number): number {
  return Math.max((durationMin / (TOTAL_HOURS * 60)) * 100, 1.5);
}

// ─── Event Block (week/day grid) ────────────────────────────────────────────
function EventBlock({
  activity,
  isGoogle,
  columnWidth,
  onClick,
}: {
  activity: Activity;
  isGoogle: boolean;
  columnWidth: number;
  onClick: () => void;
}) {
  if (!activity.due_date) return null;
  const topPct = getEventTopPct(activity.due_date);
  const heightPct = getEventHeightPct(60); // default 1 hour duration

  if (isGoogle) {
    return (
      <div
        style={{
          position: 'absolute',
          top: `${topPct}%`,
          height: `${heightPct}%`,
          left: 2,
          right: 2,
          background: '#f3f4f6',
          border: '1.5px dashed #9ca3af',
          borderRadius: 6,
          padding: '2px 6px',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500 }}>Busy</span>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute',
        top: `${topPct}%`,
        height: `${heightPct}%`,
        left: 2,
        right: 2,
        background: '#3b82f6',
        borderRadius: 6,
        padding: '3px 7px',
        overflow: 'hidden',
        cursor: 'pointer',
        zIndex: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}
    >
      <p style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 600, lineHeight: 1.3, margin: 0 }}>
        {formatTime(activity.due_date)}
      </p>
      <p style={{ fontSize: '0.72rem', color: '#dbeafe', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {activity.subject || 'Meeting'}
      </p>
    </div>
  );
}

// ─── Event Detail Popover ────────────────────────────────────────────────────
function EventPopover({
  activity,
  onClose,
  onMarkComplete,
}: {
  activity: Activity;
  onClose: () => void;
  onMarkComplete: (id: string, completed: boolean) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.25)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          width: '100%',
          maxWidth: 340,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', margin: 0, paddingRight: 8 }}>
            {activity.subject || 'Meeting'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6b7280' }}>
            <X size={16} />
          </button>
        </div>

        {activity.due_date && (
          <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: 8 }}>
            🕐 {new Date(activity.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(activity.due_date)}
          </p>
        )}

        {activity.description && (
          <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {activity.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: '0.75rem',
            fontWeight: 600,
            background: activity.completed ? '#f3f4f6' : '#dcfce7',
            color: activity.completed ? '#6b7280' : '#15803d',
          }}>
            {activity.completed ? 'Completed' : 'Confirmed'}
          </span>

          {!activity.completed && (
            <button
              onClick={() => onMarkComplete(activity.id, true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 8,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: '#15803d',
                fontWeight: 600,
              }}
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
  days,
  activities,
  googleIds,
  today,
  onCellClick,
  onEventClick,
}: {
  days: Date[];
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
  onCellClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);
  const now = new Date();
  const currentMinFromStart = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
  const currentTimePct = (currentMinFromStart / (TOTAL_HOURS * 60)) * 100;

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTarget = (currentMinFromStart / (TOTAL_HOURS * 60)) * scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop = Math.max(0, scrollTarget - 100);
    }
  }, []);

  return (
    <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, position: 'relative' }}>
      <div style={{ display: 'flex', minHeight: TOTAL_HOURS * HOUR_HEIGHT }}>
        {/* Time labels */}
        <div style={{ width: 52, flexShrink: 0 }}>
          {hours.map((h, i) => (
            <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}>
              {i > 0 && (
                <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {formatHour(h)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const dayActivities = activities.filter(a => a.due_date && isSameDay(new Date(a.due_date), day));
          const isToday = isSameDay(day, today);

          return (
            <div key={di} style={{ flex: 1, position: 'relative', borderLeft: '1px solid #f0f0f0' }}>
              {/* Hour lines */}
              {hours.map((h, i) => (
                <div
                  key={h}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onCellClick(d);
                  }}
                  style={{
                    height: HOUR_HEIGHT,
                    borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                />
              ))}

              {/* Current time indicator */}
              {isToday && currentTimePct >= 0 && currentTimePct <= 100 && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${currentTimePct}%`,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: '#ef4444',
                    zIndex: 3,
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: -4,
                    top: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#ef4444',
                  }} />
                </div>
              )}

              {/* Events */}
              {dayActivities.map(a => (
                <EventBlock
                  key={a.id}
                  activity={a}
                  isGoogle={googleIds.has(a.id)}
                  columnWidth={0}
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
function WeekView({
  weekStart,
  activities,
  googleIds,
  today,
  onCellClick,
  onEventClick,
}: {
  weekStart: Date;
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
  onCellClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Day header */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ width: 52, flexShrink: 0 }} />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderLeft: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {dayNames[day.getDay()]}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isToday ? '#3b82f6' : 'transparent',
                color: isToday ? '#fff' : '#111827',
                fontWeight: isToday ? 700 : 600,
                fontSize: '0.85rem',
                marginTop: 2,
              }}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <TimeGrid
        days={days}
        activities={activities}
        googleIds={googleIds}
        today={today}
        onCellClick={onCellClick}
        onEventClick={onEventClick}
      />
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────
function DayView({
  date,
  activities,
  googleIds,
  today,
  onCellClick,
  onEventClick,
}: {
  date: Date;
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
  onCellClick: (date: Date) => void;
  onEventClick: (a: Activity) => void;
}) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const isToday = isSameDay(date, today);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Day header */}
      <div style={{ borderBottom: '1px solid #e5e7eb', padding: '8px 0 8px 52px', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isToday ? '#3b82f6' : '#111827' }}>
          {dayNames[date.getDay()]}, {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </span>
        {isToday && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>Today</span>}
      </div>

      <TimeGrid
        days={[date]}
        activities={activities}
        googleIds={googleIds}
        today={today}
        onCellClick={onCellClick}
        onEventClick={onEventClick}
      />
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────
function MonthView({
  currentDate,
  activities,
  googleIds,
  today,
  onDayClick,
  onEventClick,
}: {
  currentDate: Date;
  activities: Activity[];
  googleIds: Set<string>;
  today: Date;
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
      const d = new Date(a.due_date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

  return (
    <div>
      {/* Day name headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb', marginBottom: 4 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: '#e5e7eb' }}>
        {/* Empty cells */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} style={{ background: '#fafafa', minHeight: 90 }} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayActivities = getForDay(day);
          const date = new Date(year, month, day);
          const isToday = isSameDay(date, today);

          return (
            <div
              key={day}
              onClick={() => onDayClick(date)}
              style={{
                background: '#fff',
                minHeight: 90,
                padding: '6px 4px',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isToday ? '#3b82f6' : 'transparent',
                color: isToday ? '#fff' : '#111827',
                fontWeight: isToday ? 700 : 500,
                fontSize: '0.8rem',
                marginBottom: 4,
              }}>
                {day}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayActivities.slice(0, 3).map(a => {
                  const isGoogle = googleIds.has(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={e => { e.stopPropagation(); if (!isGoogle) onEventClick(a); }}
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 5px',
                        borderRadius: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        background: isGoogle ? '#f3f4f6' : '#dbeafe',
                        color: isGoogle ? '#9ca3af' : '#1d4ed8',
                        border: isGoogle ? '1px dashed #9ca3af' : 'none',
                        fontWeight: 500,
                        cursor: isGoogle ? 'default' : 'pointer',
                      }}
                    >
                      {isGoogle ? 'Busy' : (a.subject || 'Meeting')}
                    </div>
                  );
                })}
                {dayActivities.length > 3 && (
                  <div style={{ fontSize: '0.65rem', color: '#6b7280', paddingLeft: 5 }}>
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
}

// ─── Main CalendarView ───────────────────────────────────────────────────────
export default function CalendarView({ accountId, userId }: CalendarViewProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [googleIds, setGoogleIds] = useState<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<Date | undefined>(undefined);
  const today = new Date();

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
      end.setHours(23, 59, 59);
      return { start, end };
    }
    // day
    const start = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(23, 59, 59);
    return { start, end };
  }, [view, currentDate]);

  const fetchFromDb = useCallback(async (start: Date, end: Date) => {
    const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .eq('account_id', accountId)
      .eq('type', 'meeting')
      .gte('due_date', start.toISOString())
      .lte('due_date', end.toISOString())
      .order('due_date', { ascending: true });

    if (acts && acts.length > 0) {
      const { data: syncs } = await supabase
        .from('google_calendar_sync')
        .select('activity_id')
        .in('activity_id', acts.map((a: Activity) => a.id))
        .eq('sync_direction', 'google_to_crm');

      setGoogleIds(new Set((syncs || []).map((s: any) => s.activity_id)));
      setActivities(acts);
    } else {
      setGoogleIds(new Set());
      setActivities(acts || []);
    }
  }, [accountId]);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    // Phase 1: show cached DB data immediately
    await fetchFromDb(start, end);
    setLoading(false);

    // Phase 2: pull fresh events from Google Calendar for this date range,
    // then refresh the DB read so newly synced events appear
    try {
      const res = await fetch(
        `/api/integrations/google/sync?accountId=${accountId}&start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (res.ok) {
        const { synced } = await res.json();
        // If any new events were synced, refresh from DB
        if (synced > 0) {
          await fetchFromDb(start, end);
        }
      }
    } catch {
      // Non-fatal — calendar works without Google sync
    }
  }, [accountId, getDateRange, fetchFromDb]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('calendar-activities')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `account_id=eq.${accountId}`,
      }, () => loadActivities())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accountId, loadActivities]);

  const handleMarkComplete = async (id: string, completed: boolean) => {
    await supabase.from('activities').update({ completed }).eq('id', id);
    setActivities(prev => prev.map(a => a.id === id ? { ...a, completed } : a));
    setSelectedActivity(prev => prev?.id === id ? { ...prev, completed } : prev);
  };

  // Navigation
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

  // Header date label
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#374151' }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigate(1)}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#374151' }}
          >
            <ChevronRight size={16} />
          </button>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827', margin: 0 }}>{getDateLabel()}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={goToToday}
            style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#374151' }}
          >
            Today
          </button>

          {/* View switcher */}
          <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '5px 12px',
                  background: view === v ? '#3b82f6' : '#fff',
                  color: view === v ? '#fff' : '#374151',
                  border: 'none',
                  borderLeft: v !== 'day' ? '1px solid #e5e7eb' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setPreselectedDate(undefined); setShowCreateModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: '0.82rem',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> New Event
          </button>
        </div>
      </div>

      {/* ── Calendar Body ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9ca3af', fontSize: '0.9rem' }}>
            Loading calendar…
          </div>
        ) : view === 'month' ? (
          <MonthView
            currentDate={currentDate}
            activities={activities}
            googleIds={googleIds}
            today={today}
            onDayClick={handleDayClick}
            onEventClick={setSelectedActivity}
          />
        ) : view === 'week' ? (
          <WeekView
            weekStart={startOfWeek(currentDate)}
            activities={activities}
            googleIds={googleIds}
            today={today}
            onCellClick={handleCellClick}
            onEventClick={setSelectedActivity}
          />
        ) : (
          <DayView
            date={currentDate}
            activities={activities}
            googleIds={googleIds}
            today={today}
            onCellClick={handleCellClick}
            onEventClick={setSelectedActivity}
          />
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#3b82f6' }} />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Your meetings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f3f4f6', border: '1.5px dashed #9ca3af' }} />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Google Calendar (busy)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Current time</span>
        </div>
      </div>

      {/* ── Event Popover ── */}
      {selectedActivity && !googleIds.has(selectedActivity.id) && (
        <EventPopover
          activity={selectedActivity}
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
