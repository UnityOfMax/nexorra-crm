-- Add missing fields to conversation_messages for reply handling
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sent BOOLEAN DEFAULT false;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS reply_latency_seconds INTEGER;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS scheduled_send_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Add missing fields to lead_conversations for tracking
ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS booking_link_sent BOOLEAN DEFAULT false;
ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS last_outbound_at TIMESTAMP WITH TIME ZONE;
