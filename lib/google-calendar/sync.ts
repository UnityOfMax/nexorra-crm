import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '@/lib/supabase';
import { GoogleCalendarSettings } from './types';

/**
 * Get an authenticated Google Calendar client for an account
 */
export async function getGoogleCalendarClient(accountId: string) {
  try {
    // Get tokens from database
    const { data: account, error } = await supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      console.error('Failed to get account:', error);
      return null;
    }

    const gcal = account.settings?.google_calendar as GoogleCalendarSettings | undefined;
    if (!gcal?.enabled) {
      console.log('Google Calendar not enabled for account:', accountId);
      return null;
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: gcal.access_token,
      refresh_token: gcal.refresh_token,
      expiry_date: new Date(gcal.token_expiry).getTime()
    });

    // Auto-refresh tokens when they expire
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        console.log('Refreshing Google Calendar tokens for account:', accountId);
        await supabaseAdmin
          .from('accounts')
          .update({
            settings: {
              ...account.settings,
              google_calendar: {
                ...gcal,
                access_token: tokens.access_token,
                token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : gcal.token_expiry
              }
            }
          })
          .eq('id', accountId);
      }
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Error creating Google Calendar client:', error);
    return null;
  }
}

/**
 * Sync a CRM activity to Google Calendar
 */
export async function syncActivityToGoogle(activityId: string, accountId: string, durationMinutes?: number) {
  try {
    const calendar = await getGoogleCalendarClient(accountId);
    if (!calendar) return;

    // Get activity details
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (activityError || !activity) {
      console.error('Failed to get activity:', activityError);
      return;
    }

    // Only sync meetings with due dates
    if (activity.type !== 'meeting' || !activity.due_date) {
      return;
    }

    // Check if already synced
    const { data: existing } = await supabaseAdmin
      .from('google_calendar_sync')
      .select('*')
      .eq('activity_id', activityId)
      .single();

    // Calculate end time using provided duration, or default to 1 hour
    const startTime = new Date(activity.due_date);
    const durationMs = (durationMinutes ?? 60) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    const eventData = {
      summary: activity.subject || 'CRM Meeting',
      description: activity.description || '',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC'
      }
    };

    if (existing) {
      // Update existing event
      console.log('Updating Google Calendar event:', existing.google_event_id);
      await calendar.events.update({
        calendarId: 'primary',
        eventId: existing.google_event_id,
        requestBody: eventData
      });

      // Update sync timestamp
      await supabaseAdmin
        .from('google_calendar_sync')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Create new event
      console.log('Creating new Google Calendar event for activity:', activityId);
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData
      });

      if (response.data.id) {
        // Store mapping
        await supabaseAdmin
          .from('google_calendar_sync')
          .insert({
            account_id: accountId,
            activity_id: activityId,
            google_event_id: response.data.id,
            sync_direction: 'crm_to_google'
          });
      }
    }
  } catch (error) {
    console.error('Error syncing activity to Google Calendar:', error);
  }
}

/**
 * Sync a Google Calendar event to CRM activity
 */
export async function syncGoogleEventToActivity(accountId: string, event: any) {
  try {
    // Check if event already mapped
    const { data: existing } = await supabaseAdmin
      .from('google_calendar_sync')
      .select('*, activities(*)')
      .eq('google_event_id', event.id)
      .eq('account_id', accountId)
      .single();

    if (event.status === 'cancelled') {
      // Delete activity if event was deleted
      if (existing) {
        console.log('Deleting CRM activity for cancelled Google event:', event.id);
        await supabaseAdmin
          .from('activities')
          .delete()
          .eq('id', existing.activity_id);

        await supabaseAdmin
          .from('google_calendar_sync')
          .delete()
          .eq('id', existing.id);
      }
      return;
    }

    // Resolve a user ID to attribute this activity to.
    // Sub-accounts managed by an agency often have NO rows in account_members —
    // the agency owner manages them but is not directly added as a member.
    // Strategy (in order):
    //   1. connected_user_id stored in google_calendar settings (set during OAuth)
    //   2. Any direct member of this account
    //   3. Any owner/admin of the parent agency account
    let createdByUserId: string | null = null;

    // Pull account settings + parent_account_id in one query
    const { data: accountRow } = await supabaseAdmin
      .from('accounts')
      .select('settings, parent_account_id')
      .eq('id', accountId)
      .maybeSingle();

    // Strategy 1: connected_user_id stored when Google Calendar was first connected
    const connectedUserId = (accountRow?.settings?.google_calendar as any)?.connected_user_id;
    if (connectedUserId) createdByUserId = connectedUserId;

    // Strategy 2: any direct member of this account
    if (!createdByUserId) {
      const { data: directMember } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (directMember) createdByUserId = directMember.user_id;
    }

    // Strategy 3: fall back to the parent agency's owner/admin
    if (!createdByUserId && accountRow?.parent_account_id) {
      const { data: agencyMember } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountRow.parent_account_id)
        .in('role', ['agency_owner', 'agency_admin', 'owner'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (agencyMember) createdByUserId = agencyMember.user_id;
    }

    if (!createdByUserId) {
      console.error('Could not resolve a user ID for account:', accountId, '— skipping event:', event.id);
      return;
    }

    const activityData = {
      account_id: accountId,
      type: 'meeting' as const,
      subject: event.summary || 'Calendar Event',
      description: event.description || '',
      due_date: event.start?.dateTime || event.start?.date,
      created_by: createdByUserId,
      completed: false
    };

    if (existing) {
      // Update existing activity
      console.log('Updating CRM activity from Google event:', event.id);
      await supabaseAdmin
        .from('activities')
        .update(activityData)
        .eq('id', existing.activity_id);

      // Update sync timestamp
      await supabaseAdmin
        .from('google_calendar_sync')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Create new activity
      console.log('Creating new CRM activity from Google event:', event.id);
      const { data: activity } = await supabaseAdmin
        .from('activities')
        .insert(activityData)
        .select()
        .single();

      if (activity) {
        // Create mapping
        await supabaseAdmin
          .from('google_calendar_sync')
          .insert({
            account_id: accountId,
            activity_id: activity.id,
            google_event_id: event.id,
            sync_direction: 'google_to_crm'
          });
      }
    }
  } catch (error) {
    console.error('Error syncing Google event to CRM:', error);
  }
}
