-- Create messages table for two-way conversations
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type TEXT NOT NULL CHECK (type IN ('sms', 'email', 'call', 'voicemail')),
  content TEXT NOT NULL,
  from_address TEXT NOT NULL, -- Phone number or email
  to_address TEXT NOT NULL,   -- Phone number or email
  status TEXT DEFAULT 'sent',
  external_id TEXT, -- Twilio SID, email message ID, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_account ON public.messages(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(type);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their accounts" 
ON public.messages
FOR SELECT 
USING (
  account_id IN (
    SELECT account_id 
    FROM public.account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages in their accounts" 
ON public.messages
FOR INSERT 
WITH CHECK (
  account_id IN (
    SELECT account_id 
    FROM public.account_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages in their accounts" 
ON public.messages
FOR UPDATE 
USING (
  account_id IN (
    SELECT account_id 
    FROM public.account_members 
    WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_messages_updated_at 
BEFORE UPDATE ON public.messages
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
