-- AI Agent Configuration table
CREATE TABLE IF NOT EXISTS public.ai_agent_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'suggest',  -- 'suggest' or 'auto'
  system_prompt TEXT,
  tone TEXT DEFAULT 'professional',
  max_tokens INTEGER DEFAULT 500,
  channels JSONB DEFAULT '{"sms": true, "email": true}',
  business_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

-- Add AI columns to contacts (per-contact AI toggle)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;

-- Add AI columns to messages (track AI-generated messages)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- RLS policies for ai_agent_configs
ALTER TABLE public.ai_agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI configs for their accounts" ON public.ai_agent_configs
  FOR SELECT USING (
    account_id IN (
      SELECT account_id FROM public.account_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can manage AI configs for their accounts" ON public.ai_agent_configs
  FOR ALL USING (
    account_id IN (
      SELECT account_id FROM public.account_members
      WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('agency_owner', 'agency_admin', 'client_owner', 'client_admin')
    )
  );
