export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleCalendarClient, syncGoogleEventToActivity } from '@/lib/google-calendar/sync';
import { supabaseAdmin } from '@/lib/supabase';
import { GoogleCalendarSettings } from '@/lib/google-calendar/types';

// GET /api/integrations/google/sync?accountId=X&start=ISO&end=ISO
// On-demand sync: fetches ALL Google Calendar events for the given date range
// and upserts them into the CRM activities table. Called on calendar page load.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Check if Google Calendar is connected for this account
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', accountId)
      .single();

    const gcal = account?.settings?.google_calendar as GoogleCalendarSettings | undefined;
    if (!gcal?.enabled) {
      return NextResponse.json({ synced: 0, reason: 'not_connected' });
    }

    const calendar = await getGoogleCalendarClient(accountId);
    if (!calendar) {
      return NextResponse.json({ synced: 0, reason: 'client_error' });
    }

    // Use provided date range, or default to ±60 days from today
    const timeMin = startParam
      ? new Date(startParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const timeMax = endParam
      ? new Date(endParam)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Fetch ALL events in the range (not just updated-since, so nothing is missed)
    const { data: response } = await calendar.events.list({
      calendarId: gcal.calendar_id || 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500,
    });

    const events = response.items || [];
    let synced = 0;

    for (const event of events) {
      // Skip events that were created by the CRM itself (avoid creating duplicates)
      const { data: existing } = await supabaseAdmin
        .from('google_calendar_sync')
        .select('sync_direction')
        .eq('google_event_id', event.id!)
        .eq('account_id', accountId)
        .maybeSingle();

      // Only sync events that originated in Google (or haven't been seen yet)
      if (existing?.sync_direction === 'crm_to_google') {
        // This event was created by the CRM — don't create a duplicate activity
        continue;
      }

      await syncGoogleEventToActivity(accountId, event);
      synced++;
    }

    return NextResponse.json({ synced, total: events.length });
  } catch (error: any) {
    console.error('Error in on-demand Google Calendar sync:', error);
    // Return success with 0 count so the calendar still loads
    return NextResponse.json({ synced: 0, error: error.message });
  }
}
