-- Add reach, cpm, page_views columns to meta_ad_metrics
-- Run in Supabase SQL editor

ALTER TABLE meta_ad_metrics
  ADD COLUMN IF NOT EXISTS reach        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_views   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpm          DECIMAL(10,2);
