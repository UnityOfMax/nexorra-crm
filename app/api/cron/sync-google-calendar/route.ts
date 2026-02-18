export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getGoogleCalendarClient, syncGoogleEventToActivity } from '@/lib/google-calendar/sync';
import { GoogleCalendarSettings } from '@/lib/google-calendar/types';

// GET /api/cron/sync-google-calendar - Sync Google Calendar events to CRM
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Syncing Google Calendars...');

    // Get all accounts with Google Calendar enabled
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id, settings');

    if (accountsError) {
      console.error('[CRON] Error fetching accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const account of accounts || []) {
      const gcal = account.settings?.google_calendar as GoogleCalendarSettings | undefined;
      if (!gcal?.enabled) continue;

      try {
        await syncGoogleToAccount(account.id);
        syncedCount++;
      } catch (err) {
        console.error(`[CRON] Failed to sync calendar for account ${account.id}:`, err);
        errorCount++;
      }
    }

    console.log(`[CRON] Sync complete. Success: ${syncedCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      errors: errorCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CRON] Error syncing calendars:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync calendars' },
      { status: 500 }
    );
  }
}

async function syncGoogleToAccount(accountId: string) {
  const calendar = await getGoogleCalendarClient(accountId);
  if (!calendar) return;

  // Get last sync time
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('settings')
    .eq('id', accountId)
    .single();

  if (!account) return;

  const gcal = account.settings?.google_calendar as GoogleCalendarSettings | undefined;
  if (!gcal) return;

  const lastSync = gcal.last_sync_at;
  const syncFrom = lastSync
    ? new Date(lastSync)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

  console.log(`[CRON] Syncing account ${accountId} from ${syncFrom.toISOString()}`);

  // Fetch events updated since last sync
  const { data: response } = await calendar.events.list({
    calendarId: gcal.calendar_id || 'primary',
    updatedMin: syncFrom.toISOString(),
    singleEvents: true,
    orderBy: 'updated',
    maxResults: 250
  });

  console.log(`[CRON] Found ${response.items?.length || 0} events for account ${accountId}`);

  for (const event of response.items || []) {
    await syncGoogleEventToActivity(accountId, event);
  }

  // Update last sync timestamp
  await supabaseAdmin
    .from('accounts')
    .update({
      settings: {
        ...account.settings,
        google_calendar: {
          ...gcal,
          last_sync_at: new Date().toISOString()
        }
      }
    })
    .eq('id', accountId);
}
