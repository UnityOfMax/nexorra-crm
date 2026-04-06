-- Add thumbnail_url column to leads table for video email preview images
ALTER TABLE leads ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Index for quick lookup of leads needing thumbnail backfill
CREATE INDEX IF NOT EXISTS idx_leads_video_no_thumb 
  ON leads (id) 
  WHERE video_url IS NOT NULL AND thumbnail_url IS NULL AND lead_category IN ('email', 'instagram');
