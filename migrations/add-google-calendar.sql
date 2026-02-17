-- Add Google Calendar integration support

-- Create google_calendar_sync table to map CRM activities to Google Calendar events
CREATE TABLE IF NOT EXISTS public.google_calendar_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  google_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_direction TEXT CHECK (sync_direction IN ('crm_to_google', 'google_to_crm')),

  UNIQUE(account_id, activity_id),
  UNIQUE(account_id, google_event_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_account ON public.google_calendar_sync(account_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_activity ON public.google_calendar_sync(activity_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_event ON public.google_calendar_sync(google_event_id);

-- Enable Row Level Security
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view calendar sync for their account
CREATE POLICY "Users can view calendar sync for their account"
  ON public.google_calendar_sync
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can manage calendar sync for their account
CREATE POLICY "Users can manage calendar sync for their account"
  ON public.google_calendar_sync
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

-- Add comment to table
COMMENT ON TABLE public.google_calendar_sync IS 'Maps CRM activities to Google Calendar events for 2-way synchronization';
