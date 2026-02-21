'use client';

import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

interface CalendarBookingProps {
  accountId: string;
  contactId: string | null;
  contactName: string;
  agentName: string;
  agentPhoto?: string;
  accentColor: string;
  formAnswers: Record<string, string>;
  onBooked: () => void;
}

interface TimeSlot {
  utc: string;       // ISO string in UTC
  display: string;   // formatted in lead's local TZ
  dateLabel: string; // e.g. "Mon, Jan 20"
}

const SLOT_DURATION_MIN = 30;
const AVAILABLE_START_H = 9;  // 9am UTC
const AVAILABLE_END_H = 17;   // 5pm UTC

function getLeadTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}

function generateSlots(): TimeSlot[] {
  const tz = getLeadTimezone();
  const slots: TimeSlot[] = [];
  const now = new Date();

  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + dayOffset);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let h = AVAILABLE_START_H; h < AVAILABLE_END_H; h++) {
      for (const m of [0, 30]) {
        const slotDate = new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          h, m, 0
        ));

        const display = slotDate.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: tz,
        });

        const dateLabel = slotDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: tz,
        });

        slots.push({ utc: slotDate.toISOString(), display, dateLabel });
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

export default function CalendarBooking({
  accountId, contactId, contactName, agentName, agentPhoto,
  accentColor, formAnswers, onBooked,
}: CalendarBookingProps) {
  const [slots] = useState<TimeSlot[]>(() => generateSlots());
  const [grouped] = useState(() => groupByDate(generateSlots()));
  const [dateKeys] = useState(() => Object.keys(grouped));
  const [selectedDate, setSelectedDate] = useState<string>(Object.keys(groupByDate(generateSlots()))[0] || '');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [tz] = useState(() => getLeadTimezone());
  const [bookedUtcs, setBookedUtcs] = useState<Set<string>>(new Set());

  // Fetch busy slots: CRM meetings + Google Calendar FreeBusy across all calendars.
  // Uses the dedicated busy-slots endpoint which queries both sources server-side.
  useEffect(() => {
    fetch(`/api/landing-pages/busy-slots?accountId=${accountId}`)
      .then(r => r.json())
      .then(({ busySlots }) => {
        if (!busySlots?.length) return;
        const booked = new Set<string>();
        for (const slot of slots) {
          const slotMs = new Date(slot.utc).getTime();
          for (const busyTs of busySlots as string[]) {
            const diff = Math.abs(new Date(busyTs).getTime() - slotMs);
            if (diff < SLOT_DURATION_MIN * 60 * 1000) {
              booked.add(slot.utc);
            }
          }
        }
        setBookedUtcs(booked);
      })
      .catch(() => {/* non-fatal */});
  }, [accountId, slots]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    setBookingError('');
    try {
      const res = await fetch('/api/landing-pages/book-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          contactId,
          contactName,
          slotUtc: selectedSlot.utc,
          slotDisplay: `${selectedSlot.dateLabel} at ${selectedSlot.display} (${tz})`,
          agentName,
          formAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setBookingError(data.error || 'Booking failed. Please try again.');
      } else {
        onBooked();
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError('Network error. Please check your connection and try again.');
    } finally {
      setBooking(false);
    }
  };

  const accent = accentColor;
  const currentSlots = grouped[selectedDate] || [];

  return (
    <div>
      {/* Agent header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        {agentPhoto ? (
          <img src={agentPhoto} alt={agentName} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}` }} />
        ) : (
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: `${accent}22`, border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>👤</div>
        )}
        <div>
          <p style={{ fontWeight: '700', color: '#111827', fontSize: '1rem' }}>{agentName}</p>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Book a time for a call so I can go through a list of homes I'll have ready just for you
            {contactName ? `, ${contactName}` : ''}.
          </p>
        </div>
      </div>

      <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '6px', marginBottom: '16px', fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
        📍 Times shown in your timezone: <strong>{tz}</strong> &nbsp;·&nbsp; 10-minute phone call
      </div>

      {/* Date picker row */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
        {dateKeys.map(dk => (
          <button
            key={dk}
            onClick={() => { setSelectedDate(dk); setSelectedSlot(null); }}
            style={{
              padding: '8px 14px', borderRadius: '10px', border: `2px solid ${selectedDate === dk ? accent : '#e5e7eb'}`,
              background: selectedDate === dk ? `${accent}18` : '#fff', cursor: 'pointer',
              fontWeight: selectedDate === dk ? '700' : '500', fontSize: '0.8rem',
              color: selectedDate === dk ? '#111827' : '#4b5563', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {dk}
          </button>
        ))}
      </div>

      {/* Time slots grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', marginBottom: '20px', maxHeight: '220px', overflowY: 'auto' }}>
        {currentSlots.map(slot => {
          const isBooked = bookedUtcs.has(slot.utc);
          const isSelected = selectedSlot?.utc === slot.utc;
          return (
            <button
              key={slot.utc}
              onClick={() => !isBooked && setSelectedSlot(slot)}
              disabled={isBooked}
              style={{
                padding: '10px 6px', borderRadius: '10px',
                border: isBooked
                  ? '2px solid #e5e7eb'
                  : `2px solid ${isSelected ? accent : '#e5e7eb'}`,
                background: isBooked
                  ? '#f3f4f6'
                  : isSelected ? `${accent}18` : '#fff',
                cursor: isBooked ? 'not-allowed' : 'pointer',
                fontWeight: isSelected ? '700' : '500',
                fontSize: '0.85rem',
                color: isBooked ? '#9ca3af' : '#111827',
                transition: 'all 0.12s',
              }}
            >
              {isBooked ? (
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Booked</span>
              ) : slot.display}
            </button>
          );
        })}
      </div>

      {/* Booking error */}
      {bookingError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', color: '#dc2626', fontSize: '0.85rem' }}>
          {bookingError}
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={handleBook}
        disabled={!selectedSlot || booking}
        style={{
          width: '100%', padding: '15px', background: selectedSlot ? accent : '#e5e7eb',
          color: selectedSlot ? '#111827' : '#9ca3af', border: 'none', borderRadius: '12px',
          fontWeight: '700', fontSize: '1rem', cursor: selectedSlot ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s',
        }}
      >
        {booking
          ? <><Loader style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Booking...</>
          : selectedSlot
          ? `Confirm — ${selectedSlot.dateLabel} at ${selectedSlot.display}`
          : 'Select a time above'}
      </button>
    </div>
  );
}
