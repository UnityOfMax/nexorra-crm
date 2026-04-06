-- Migration: add-calling-tables.sql
-- AI Calling Outreach System (Marcus)
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/nhflmisklsanfiiywrfo/sql

-- Call sessions — one row per call attempt
CREATE TABLE IF NOT EXISTS call_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid REFERENCES leads(id) ON DELETE SET NULL,
  phone_to            text NOT NULL,          -- prospect E.164 phone
  phone_from          text NOT NULL,          -- our OpenPhone number
  call_ref            text UNIQUE,            -- internal reference ID
  status              text DEFAULT 'queued',  -- queued|ringing|in_progress|completed|no_answer|busy|failed
  outcome             text,                   -- booked|callback_requested|not_interested|no_answer|voicemail|failed
  duration_seconds    int,
  transcript          text,                   -- full assembled transcript text
  summary             text,                   -- 1-sentence AI summary
  calendly_booked     bool DEFAULT false,
  calendly_event_uri  text,
  attempt_number      int DEFAULT 1,
  called_at           timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Granular transcript lines — one row per utterance
CREATE TABLE IF NOT EXISTS call_transcript_lines (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id     uuid REFERENCES call_sessions(id) ON DELETE CASCADE,
  speaker             text NOT NULL CHECK (speaker IN ('agent', 'prospect')),
  text                text NOT NULL,
  timestamp_ms        int,                    -- ms from call start
  classification      text,                   -- complex_question|booking_intent|objection|positive|hangup|small_talk
  created_at          timestamptz DEFAULT now()
);

-- Add calling fields to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS call_status       text,                  -- null|queued|called|booked|not_interested|no_answer
  ADD COLUMN IF NOT EXISTS call_attempts     int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_called_at    timestamptz;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_lead_id   ON call_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status    ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_called_at ON call_sessions(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_transcript_session ON call_transcript_lines(call_session_id);
CREATE INDEX IF NOT EXISTS idx_leads_call_status       ON leads(call_status) WHERE lead_category = 'calling';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_sessions_updated_at
  BEFORE UPDATE ON call_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
