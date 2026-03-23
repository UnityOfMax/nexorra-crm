-- Add cold email landing page support to landing_pages table
-- Run in Supabase SQL editor

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'client';
