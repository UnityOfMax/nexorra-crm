'use client';

import { useState, useEffect } from 'react';
import { Loader, ArrowLeft, CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { LandingPageContent } from '@/lib/landing-page-templates';

type CalendarSettings = LandingPageContent['calendarSettings'];

interface CalendarBookingProps {
  accountId: string;
  contactId: string | null;
  contactName: string;
  agentName: string;
  agentPhoto?: string;
  accentColor: string;
  formAnswers: Record<string, string>;
  onBooked: () => void;
  calendarSettings?: CalendarSettings;
}

interface TimeSlot {
  utc: string;
  display: string;
  dateLabel: string;
}

interface DayGroup {
  dateLabel: string;
  slots: TimeSlot[];
}

const SLOT_DURATION_MIN = 15;
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getDatePartsInTz(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get('year')), month: parseInt(get('month')),
    day: parseInt(get('day')), dow: dowMap[get('weekday')] ?? -1,
  };
}

function agentLocalToUTC(year: number, month: number, day: number, hour: number, minute: number, agentTz: string): Date {
  const probe = new Date(Date.UTC(year, month - 1, day, hour % 24, minute, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: agentTz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(probe);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0');
  const tzH = get('hour') % 24;
  const tzLocal = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), tzH, get('minute'), 0));
  const offsetMs = probe.getTime() - tzLocal.getTime();
  return new Date(probe.getTime() + offsetMs);
}

function getIsoDate(utcDate: Date, agentTz: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: agentTz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(utcDate);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function getAgentToday(agentTz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: agentTz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

function generateSlots(settings?: CalendarSettings): TimeSlot[] {
  const agentTz = settings?.timezone || 'America/New_York';
  const availDays = settings?.availableDays ?? [1, 2, 3, 4, 5];
  const startH = settings?.startHour ?? 9;
  const endH = settings?.endHour ?? 17;
  const slots: TimeSlot[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset <= 28 && slots.length < 400; dayOffset++) {
    const candidate = new Date(now.getTime() + dayOffset * 86400_000);
    const { year, month, day, dow } = getDatePartsInTz(candidate, agentTz);
    if (!availDays.includes(dow)) continue;

    for (let h = startH; h < endH; h++) {
      for (const m of [0, 15, 30, 45]) {
        const slotUtc = agentLocalToUTC(year, month, day, h, m, agentTz);
        if (slotUtc.getTime() < Date.now() + 30 * 60_000) continue;
        const display = slotUtc.toLocaleTimeString(undefined, {
          hour: 'numeric', minute: '2-digit', hour12: true, timeZone: agentTz,
        });
        const dateLabel = slotUtc.toLocaleDateString(undefined, {
          weekday: 'short', month: 'short', day: 'numeric', timeZone: agentTz,
        });
        slots.push({ utc: slotUtc.toISOString(), display, dateLabel });
      }
    }
  }
  return slots;
}

function groupByIso(slots: TimeSlot[], agentTz: string): Record<string, DayGroup> {
  const groups: Record<string, DayGroup> = {};
  for (const slot of slots) {
    const iso = getIsoDate(new Date(slot.utc), agentTz);
    if (!groups[iso]) groups[iso] = { dateLabel: slot.dateLabel, slots: [] };
    groups[iso].slots.push(slot);
  }
  return groups;
}

function daysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate(); }
function firstDowOfMonth(year: number, month: number) { return new Date(year, month - 1, 1).getDay(); }
function isoStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb',
  borderRadius: '10px', fontSize: '0.95rem', boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff',
};

// ---- Time panel (shared between desktop sidebar + mobile sheet) ----
function TimePanel({
  group, bookedUtcs, selectedSlot, onSelect, onConfirm, accent,
}: {
  group: DayGroup | null | undefined;
  bookedUtcs: Set<string>;
  selectedSlot: TimeSlot | null;
  onSelect: (s: TimeSlot) => void;
  onConfirm: () => void;
  accent: string;
}) {
  const available = (group?.slots || []).filter(s => !bookedUtcs.has(s.utc));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <p style={{ fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {group?.dateLabel || ''}
      </p>
      {available.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '12px 0' }}>No available times for this day.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
          {available.map(slot => {
            const isSel = selectedSlot?.utc === slot.utc;
            return (
              <button
                key={slot.utc}
                onClick={() => onSelect(slot)}
                style={{
                  padding: '11px 16px', borderRadius: '9px', border: `2px solid ${isSel ? accent : '#e2e8f0'}`,
                  background: isSel ? `${accent}18` : '#fff', color: '#111827',
                  fontWeight: isSel ? '700' : '500', fontSize: '0.9rem', cursor: 'pointer',
                  textAlign: 'center', transition: 'all 0.12s', flexShrink: 0,
                }}
              >{slot.display}</button>
            );
          })}
        </div>
      )}
      {selectedSlot && (
        <button
          onClick={onConfirm}
          style={{
            marginTop: '12px', width: '100%', padding: '13px', background: accent,
            color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700',
            fontSize: '0.95rem', cursor: 'pointer', flexShrink: 0,
          }}
        >
          Confirm time →
        </button>
      )}
    </div>
  );
}

// ---- Main component ----
export default function CalendarBooking({
  accountId, contactId, contactName, agentName, agentPhoto,
  accentColor, formAnswers, onBooked, calendarSettings,
}: CalendarBookingProps) {
  const agentTz = calendarSettings?.timezone || 'America/New_York';
  const [slots] = useState<TimeSlot[]>(() => generateSlots(calendarSettings));
  const [grouped] = useState<Record<string, DayGroup>>(() => groupByIso(generateSlots(calendarSettings), agentTz));
  const todayInAgent = getAgentToday(agentTz);
  const isoToday = isoStr(todayInAgent.year, todayInAgent.month, todayInAgent.day);

  const [calYear, setCalYear] = useState(todayInAgent.year);
  const [calMonth, setCalMonth] = useState(todayInAgent.month);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookedUtcs, setBookedUtcs] = useState<Set<string>>(new Set());

  const agentTzLabel = (() => {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: agentTz, timeZoneName: 'short' })
        .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value || agentTz;
    } catch { return agentTz; }
  })();

  useEffect(() => {
    setConfirmInfo({
      first_name: formAnswers.first_name || contactName || '',
      last_name: formAnswers.last_name || '',
      email: formAnswers.email || '',
      phone: formAnswers.phone || '',
    });
  }, [formAnswers, contactName]);

  useEffect(() => {
    fetch(`/api/landing-pages/busy-slots?accountId=${accountId}`)
      .then(r => r.json())
      .then(({ busySlots }) => {
        if (!busySlots?.length) return;
        const booked = new Set<string>();
        for (const slot of slots) {
          const slotMs = new Date(slot.utc).getTime();
          for (const busyTs of busySlots as string[]) {
            if (Math.abs(new Date(busyTs).getTime() - slotMs) < SLOT_DURATION_MIN * 60_000) booked.add(slot.utc);
          }
        }
        setBookedUtcs(booked);
      })
      .catch(() => {});
  }, [accountId, slots]);

  const canGoPrev = calYear > todayInAgent.year || (calYear === todayInAgent.year && calMonth > todayInAgent.month);
  const prevMonth = () => { if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); } else setCalMonth(m => m + 1); };

  const handleDaySelect = (day: number) => {
    const iso = isoStr(calYear, calMonth, day);
    setSelectedIso(iso);
    setSelectedSlot(null);
    setSheetOpen(true);
  };

  const handleConfirmSlot = () => {
    if (!selectedSlot) return;
    setBookingError('');
    setSheetOpen(false);
    setConfirmStep(true);
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    if (!confirmInfo.first_name.trim()) { setBookingError('Please enter your first name.'); return; }
    setBooking(true); setBookingError('');
    try {
      const res = await fetch('/api/landing-pages/book-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId, contactId,
          contactName: `${confirmInfo.first_name.trim()} ${confirmInfo.last_name.trim()}`.trim() || contactName,
          slotUtc: selectedSlot.utc,
          slotDisplay: `${selectedSlot.dateLabel} at ${selectedSlot.display} (${agentTzLabel})`,
          agentName, formAnswers, contactInfo: confirmInfo,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setBookingError(data.error || 'Booking failed. Please try again.');
      else onBooked();
    } catch { setBookingError('Network error. Please check your connection and try again.'); }
    finally { setBooking(false); }
  };

  const accent = accentColor;
  const numDays = daysInMonth(calYear, calMonth);
  const firstDow = firstDowOfMonth(calYear, calMonth);
  const calCells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: numDays }, (_, i) => i + 1)];
  while (calCells.length % 7 !== 0) calCells.push(null);
  const selectedGroup = selectedIso ? grouped[selectedIso] : null;

  // ---- Confirm step ----
  if (confirmStep && selectedSlot) {
    return (
      <div>
        <button
          onClick={() => { setConfirmStep(false); setBookingError(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', padding: '0 0 16px 0', fontSize: '0.85rem' }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back to calendar
        </button>
        <div style={{ background: `${accent}18`, border: `2px solid ${accent}44`, borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle style={{ width: 20, height: 20, color: accent, flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: '700', color: '#111827', fontSize: '0.95rem' }}>{selectedSlot.dateLabel} at {selectedSlot.display}</p>
            <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '2px' }}>15-minute call · {agentTzLabel}</p>
          </div>
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>Confirm your details</h3>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '18px' }}>Make sure everything looks right before we lock in your call.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>First Name *</label>
              <input type="text" value={confirmInfo.first_name} onChange={e => setConfirmInfo(p => ({ ...p, first_name: e.target.value }))} style={inputSt} placeholder="First name" autoFocus />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Last Name</label>
              <input type="text" value={confirmInfo.last_name} onChange={e => setConfirmInfo(p => ({ ...p, last_name: e.target.value }))} style={inputSt} placeholder="Last name" />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Phone Number</label>
            <input type="tel" value={confirmInfo.phone} onChange={e => setConfirmInfo(p => ({ ...p, phone: e.target.value }))} style={inputSt} placeholder="Your phone number" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Email Address</label>
            <input type="email" value={confirmInfo.email} onChange={e => setConfirmInfo(p => ({ ...p, email: e.target.value }))} style={inputSt} placeholder="Your email" />
          </div>
          {bookingError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem' }}>{bookingError}</div>
          )}
          <button
            onClick={handleBook}
            disabled={booking || !confirmInfo.first_name.trim()}
            style={{ width: '100%', padding: '15px', background: confirmInfo.first_name.trim() ? accent : '#e5e7eb', color: confirmInfo.first_name.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: confirmInfo.first_name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s', opacity: booking ? 0.7 : 1 }}
          >
            {booking ? <><Loader style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Booking your call...</> : `Confirm Booking — ${selectedSlot.dateLabel} at ${selectedSlot.display}`}
          </button>
          <p style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>No spam. Your information is kept private.</p>
        </div>
      </div>
    );
  }

  // ---- Calendar view ----
  return (
    <div>
      {/* Agent header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        {agentPhoto ? (
          <img src={agentPhoto} alt={agentName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}`, flexShrink: 0 }} />
        ) : (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${accent}22`, border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>👤</div>
        )}
        <div>
          <p style={{ fontWeight: '700', color: '#111827', fontSize: '1rem', marginBottom: '2px' }}>{agentName}</p>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.4 }}>
            Book a time for a call{contactName ? `, ${contactName}` : ''}.
          </p>
        </div>
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '6px 12px', marginBottom: '18px', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
        📍 All times in <strong>{agentTzLabel}</strong> &nbsp;·&nbsp; 15-minute phone call
      </div>

      {/* Layout: calendar left, times right on desktop */}
      <div className="cbk-layout">
        {/* Calendar grid */}
        <div className="cbk-cal">
          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <button
              onClick={prevMonth}
              disabled={!canGoPrev}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: canGoPrev ? '#fff' : '#f8fafc', cursor: canGoPrev ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: canGoPrev ? '#374151' : '#d1d5db', transition: 'all 0.12s' }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>
              {MONTH_NAMES[calMonth - 1]} {calYear}
            </span>
            <button
              onClick={nextMonth}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', transition: 'all 0.12s' }}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {DOW_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: '600', color: '#94a3b8', padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {calCells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso = isoStr(calYear, calMonth, day);
              const hasSlots = !!grouped[iso];
              const allBooked = hasSlots && grouped[iso].slots.every(s => bookedUtcs.has(s.utc));
              const isPast = iso < isoToday;
              const isAvail = hasSlots && !allBooked && !isPast;
              const isSelected = iso === selectedIso;
              const isToday = iso === isoToday;

              return (
                <button
                  key={i}
                  onClick={() => isAvail && handleDaySelect(day)}
                  disabled={!isAvail}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: '50%',
                    border: isSelected
                      ? `2px solid ${accent}`
                      : isAvail
                      ? '2px solid #bfdbfe'
                      : '2px solid transparent',
                    background: isSelected ? accent : 'transparent',
                    color: isSelected ? '#fff' : isPast || !hasSlots || allBooked ? '#cbd5e1' : '#111827',
                    fontWeight: isToday ? '700' : '400',
                    fontSize: '0.82rem',
                    cursor: isAvail ? 'pointer' : 'default',
                    transition: 'all 0.12s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {day}
                  {isToday && !isSelected && (
                    <span style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: accent }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop time panel — slides in to the right */}
        {selectedIso && (
          <div className="cbk-times-desktop">
            <TimePanel
              group={selectedGroup}
              bookedUtcs={bookedUtcs}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              onConfirm={handleConfirmSlot}
              accent={accent}
            />
          </div>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {sheetOpen && selectedIso && (
        <>
          <div
            className="cbk-overlay"
            onClick={() => setSheetOpen(false)}
          />
          <div className="cbk-sheet">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>
                {selectedGroup?.dateLabel || ''}
              </h3>
              <button
                onClick={() => setSheetOpen(false)}
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <TimePanel
              group={selectedGroup}
              bookedUtcs={bookedUtcs}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              onConfirm={handleConfirmSlot}
              accent={accent}
            />
          </div>
        </>
      )}

      <style>{`
        .cbk-layout {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .cbk-cal {
          width: 100%;
        }
        .cbk-times-desktop {
          display: none;
        }
        .cbk-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 998;
        }
        .cbk-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-radius: 20px 20px 0 0;
          padding: 20px 20px 32px;
          box-shadow: 0 -8px 32px rgba(0,0,0,0.18);
          z-index: 999;
          max-height: 72vh;
          display: flex;
          flex-direction: column;
          animation: cbkSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes cbkSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (min-width: 600px) {
          .cbk-layout {
            flex-direction: row;
            gap: 24px;
            align-items: flex-start;
          }
          .cbk-cal {
            flex: 1;
            min-width: 0;
          }
          .cbk-times-desktop {
            display: flex;
            flex-direction: column;
            flex: 0 0 180px;
            max-height: 340px;
            border-left: 1.5px solid #f1f5f9;
            padding-left: 20px;
            animation: cbkFadeIn 0.18s ease;
          }
          @keyframes cbkFadeIn {
            from { opacity: 0; transform: translateX(8px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .cbk-overlay { display: none !important; }
          .cbk-sheet { display: none !important; }
        }
      `}</style>
    </div>
  );
}
