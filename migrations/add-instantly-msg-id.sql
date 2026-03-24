-- Add instantly_msg_id to conversation_messages for dedup + reply_to_uuid
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS instantly_msg_id TEXT;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sender_email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_msg_instantly_id ON conversation_messages(instantly_msg_id) WHERE instantly_msg_id IS NOT NULL;
