import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleCalendarClient } from '@/lib/google-calendar/sync';

export const dynamic = 'force-dynamic';

/**
 * GET /api/landing-pages/busy-slots?accountId=XXX
 *
 * Returns a flat array of UTC ISO timestamps that are busy in the next 14 days.
 * Sources:
 *   1. CRM meeting activities (includes bookings already made via the landing page)
 *   2. Google Calendar FreeBusy query across ALL calendars the account has access to
 *
 * CalendarBooking blocks any 30-min slot whose start time is within 30 min of
 * any returned timestamp, so we emit one timestamp per 30-min chunk of each
 * busy interval from Google.
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const now = new Date();
  const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // ── 1. CRM meeting activities ──────────────────────────────────────────────
  const { data: activities } = await supabaseAdmin
    .from('activities')
    .select('due_date')
    .eq('account_id', accountId)
    .eq('type', 'meeting')
    .gte('due_date', now.toISOString())
    .lte('due_date', end.toISOString());

  const busyMs = new Set<number>();

  for (const a of activities || []) {
    if (a.due_date) {
      const start = new Date(a.due_date).getTime();
      // Cover full 60-min meeting duration in 30-min intervals
      for (let t = start; t < start + 60 * 60 * 1000; t += 30 * 60 * 1000) {
        busyMs.add(t);
      }
    }
  }

  // ── 2. Google Calendar FreeBusy across ALL connected calendars ─────────────
  try {
    const calendar = await getGoogleCalendarClient(accountId);
    if (calendar) {
      // Get all calendars the user has at minimum free/busy visibility on
      const { data: calList } = await calendar.calendarList.list({
        minAccessRole: 'freeBusyReader',
      });

      const calendarItems = (calList.items || [])
        .filter((c) => c.id)
        .map((c) => ({ id: c.id as string }));

      if (calendarItems.length > 0) {
        const { data: freeBusy } = await calendar.freebusy.query({
          requestBody: {
            timeMin: now.toISOString(),
            timeMax: end.toISOString(),
            items: calendarItems,
          },
        });

        // Convert each busy range to 30-min interval timestamps so the
        // CalendarBooking collision logic (within 30 min) blocks them correctly.
        for (const calId of Object.keys(freeBusy.calendars || {})) {
          for (const range of freeBusy.calendars![calId]?.busy || []) {
            if (!range.start || !range.end) continue;
            let t = new Date(range.start).getTime();
            const rangeEnd = new Date(range.end).getTime();
            while (t < rangeEnd) {
              busyMs.add(t);
              t += 30 * 60 * 1000; // advance by 30 min
            }
          }
        }
      }
    }
  } catch (err) {
    // Non-fatal — calendar may not be connected for this account
    console.warn('[busy-slots] Google Calendar error:', err);
  }

  const busySlots = Array.from(busyMs).map((ms) => new Date(ms).toISOString());

  return NextResponse.json(
    { busySlots },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
