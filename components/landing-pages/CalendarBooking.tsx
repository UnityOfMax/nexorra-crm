'use client';

import { useState, useEffect } from 'react';
import { Loader, ArrowLeft, CheckCircle } from 'lucide-react';
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
  utc: string;       // ISO string in UTC
  display: string;   // formatted in lead's local TZ
  dateLabel: string; // e.g. "Mon, Jan 20"
}

const SLOT_DURATION_MIN = 15;

function getLeadTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}

// Get date components (year, month, day, day-of-week) in a given timezone
function getDatePartsInTz(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    dow: dowMap[get('weekday')] ?? -1,
  };
}

// Convert a local time in `agentTz` to a UTC Date.
// Example: 9:00 AM Eastern → 14:00 UTC (in winter, UTC-5)
function agentLocalToUTC(year: number, month: number, day: number, hour: number, minute: number, agentTz: string): Date {
  // Create a probe using these components treated as UTC
  const probe = new Date(Date.UTC(year, month - 1, day, hour % 24, minute, 0));
  // Find what the probe looks like when interpreted in agentTz
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: agentTz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(probe);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0');
  const tzH = get('hour') % 24; // some impls return 24 for midnight
  const tzLocal = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), tzH, get('minute'), 0));
  // offsetMs = how far probe (UTC) is from the tz-local interpretation of probe
  const offsetMs = probe.getTime() - tzLocal.getTime();
  // Actual UTC for the desired local time = probe + offset
  return new Date(probe.getTime() + offsetMs);
}

function generateSlots(settings?: CalendarSettings): TimeSlot[] {
  const agentTz = settings?.timezone || 'America/New_York';
  const availDays = settings?.availableDays ?? [1, 2, 3, 4, 5];
  const startH = settings?.startHour ?? 9;
  const endH = settings?.endHour ?? 17;

  const slots: TimeSlot[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset <= 14 && slots.length < 200; dayOffset++) {
    const candidate = new Date(now.getTime() + dayOffset * 86400_000);
    const { year, month, day, dow } = getDatePartsInTz(candidate, agentTz);
    if (!availDays.includes(dow)) continue;

    for (let h = startH; h < endH; h++) {
      for (const m of [0, 15, 30, 45]) {
        const slotUtc = agentLocalToUTC(year, month, day, h, m, agentTz);
        // Skip slots in the past or within 30 min of now
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

function groupByDate(slots: TimeSlot[]): Record<string, TimeSlot[]> {
  const groups: Record<string, TimeSlot[]> = {};
  for (const slot of slots) {
    if (!groups[slot.dateLabel]) groups[slot.dateLabel] = [];
    groups[slot.dateLabel].push(slot);
  }
  return groups;
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb',
  borderRadius: '10px', fontSize: '0.95rem', boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff',
};

export default function CalendarBooking({
  accountId, contactId, contactName, agentName, agentPhoto,
  accentColor, formAnswers, onBooked, calendarSettings,
}: CalendarBookingProps) {
  const [slots] = useState<TimeSlot[]>(() => generateSlots(calendarSettings));
  const [grouped] = useState(() => groupByDate(generateSlots(calendarSettings)));
  const [dateKeys] = useState(() => Object.keys(groupByDate(generateSlots(calendarSettings))));
  const [selectedDate, setSelectedDate] = useState<string>(() => Object.keys(groupByDate(generateSlots(calendarSettings)))[0] || '');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [leadTz] = useState(() => getLeadTimezone());
  const [agentTzLabel] = useState(() => {
    const tz = calendarSettings?.timezone || 'America/New_York';
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date())
        .find(p => p.type === 'timeZoneName')?.value || tz;
    } catch { return tz; }
  });
  const [bookedUtcs, setBookedUtcs] = useState<Set<string>>(new Set());

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
            if (Math.abs(new Date(busyTs).getTime() - slotMs) < SLOT_DURATION_MIN * 60_000) {
              booked.add(slot.utc);
            }
          }
        }
        setBookedUtcs(booked);
      })
      .catch(() => {});
  }, [accountId, slots]);

  const handleConfirmSlot = () => { if (!selectedSlot) return; setBookingError(''); setConfirmStep(true); };

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
  const currentSlots = grouped[selectedDate] || [];

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
            style={{ width: '100%', padding: '15px', background: confirmInfo.first_name.trim() ? accent : '#e5e7eb', color: confirmInfo.first_name.trim() ? '#111827' : '#9ca3af', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: confirmInfo.first_name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s', opacity: booking ? 0.7 : 1 }}
          >
            {booking ? <><Loader style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Booking your call...</> : `Confirm Booking — ${selectedSlot.dateLabel} at ${selectedSlot.display}`}
          </button>
          <p style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>No spam. Your information is kept private.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        {agentPhoto ? (
          <img src={agentPhoto} alt={agentName} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}` }} />
        ) : (
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: `${accent}22`, border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>👤</div>
        )}
        <div>
          <p style={{ fontWeight: '700', color: '#111827', fontSize: '1rem' }}>{agentName}</p>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Book a time for a call so I can go through a list of homes I'll have ready just for you{contactName ? `, ${contactName}` : ''}.
          </p>
        </div>
      </div>

      <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '6px', marginBottom: '16px', fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
        📍 All times in <strong>{agentTzLabel}</strong> &nbsp;·&nbsp; 15-minute phone call
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
        {dateKeys.map(dk => (
          <button
            key={dk}
            onClick={() => { setSelectedDate(dk); setSelectedSlot(null); }}
            style={{ padding: '8px 14px', borderRadius: '10px', border: `2px solid ${selectedDate === dk ? accent : '#e5e7eb'}`, background: selectedDate === dk ? `${accent}18` : '#fff', cursor: 'pointer', fontWeight: selectedDate === dk ? '700' : '500', fontSize: '0.8rem', color: selectedDate === dk ? '#111827' : '#4b5563', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}
          >{dk}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginBottom: '20px', maxHeight: '240px', overflowY: 'auto' }}>
        {currentSlots.map(slot => {
          const isBooked = bookedUtcs.has(slot.utc);
          const isSelected = selectedSlot?.utc === slot.utc;
          return (
            <button
              key={slot.utc}
              onClick={() => !isBooked && setSelectedSlot(slot)}
              disabled={isBooked}
              style={{ padding: '10px 6px', borderRadius: '10px', border: isBooked ? '2px solid #e5e7eb' : `2px solid ${isSelected ? accent : '#e5e7eb'}`, background: isBooked ? '#f3f4f6' : isSelected ? `${accent}18` : '#fff', cursor: isBooked ? 'not-allowed' : 'pointer', fontWeight: isSelected ? '700' : '500', fontSize: '0.82rem', color: isBooked ? '#9ca3af' : '#111827', transition: 'all 0.12s' }}
            >
              {isBooked ? <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Booked</span> : slot.display}
            </button>
          );
        })}
        {currentSlots.length === 0 && (
          <p style={{ gridColumn: '1/-1', color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No available slots for this day.</p>
        )}
      </div>

      {bookingError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#dc2626', fontSize: '0.85rem' }}>{bookingError}</div>
      )}

      <button
        onClick={handleConfirmSlot}
        disabled={!selectedSlot}
        style={{ width: '100%', padding: '15px', background: selectedSlot ? accent : '#e5e7eb', color: selectedSlot ? '#111827' : '#9ca3af', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '1rem', cursor: selectedSlot ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}
      >
        {selectedSlot ? `Next — ${selectedSlot.dateLabel} at ${selectedSlot.display} →` : 'Select a time above'}
      </button>
    </div>
  );
}
