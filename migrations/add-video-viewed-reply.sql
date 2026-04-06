-- Add video_viewed_reply_sent flag for conditional Step 1 email
-- (maintenance agent checks video views and sends "viewed" version before default Step 1 fires)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_viewed_reply_sent BOOLEAN DEFAULT NULL;
