// Google Calendar integration types

export interface GoogleCalendarSettings {
  enabled: boolean;
  user_email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  calendar_id: string;
  last_sync_at?: string;
}

export interface GoogleCalendarSyncMapping {
  id: string;
  account_id: string;
  activity_id: string;
  google_event_id: string;
  last_synced_at: string;
  sync_direction: 'crm_to_google' | 'google_to_crm';
}

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  updated?: string;
}
