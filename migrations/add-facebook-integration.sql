-- Add Facebook integration support for Ads and Pages

-- Create facebook_integrations table to store OAuth tokens and connected accounts
CREATE TABLE IF NOT EXISTS public.facebook_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Auth tokens
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Connected accounts
  facebook_user_id TEXT,
  facebook_user_name TEXT,
  ad_account_id TEXT,
  page_id TEXT,
  page_name TEXT,
  instagram_account_id TEXT,
  instagram_username TEXT,

  -- Settings
  sync_ads BOOLEAN DEFAULT true,
  sync_page_messages BOOLEAN DEFAULT true,
  sync_instagram_comments BOOLEAN DEFAULT true,

  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(account_id)
);

-- Create facebook_ad_leads table to store leads from Facebook Lead Ads
CREATE TABLE IF NOT EXISTS public.facebook_ad_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  facebook_lead_id TEXT UNIQUE NOT NULL,
  ad_id TEXT,
  ad_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  form_id TEXT,

  -- Lead data from form responses
  lead_data JSONB NOT NULL,

  -- Extracted fields for easy querying
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,

  created_time TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create facebook_page_messages table to store messages from Facebook Pages
CREATE TABLE IF NOT EXISTS public.facebook_page_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  message_id TEXT UNIQUE NOT NULL,
  conversation_id TEXT,
  from_id TEXT,
  from_name TEXT,
  to_id TEXT,
  message TEXT,
  attachments JSONB,

  created_time TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create facebook_ad_campaigns table to track ad campaign performance
CREATE TABLE IF NOT EXISTS public.facebook_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,

  campaign_id TEXT UNIQUE NOT NULL,
  campaign_name TEXT NOT NULL,
  status TEXT,
  objective TEXT,

  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10, 2) DEFAULT 0,
  leads INTEGER DEFAULT 0,

  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facebook_integrations_account ON public.facebook_integrations(account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_leads_account ON public.facebook_ad_leads(account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_leads_contact ON public.facebook_ad_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_leads_facebook_id ON public.facebook_ad_leads(facebook_lead_id);
CREATE INDEX IF NOT EXISTS idx_facebook_page_messages_account ON public.facebook_page_messages(account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_page_messages_contact ON public.facebook_page_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_campaigns_account ON public.facebook_ad_campaigns(account_id);

-- Enable Row Level Security
ALTER TABLE public.facebook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_page_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_integrations
CREATE POLICY "Users can view Facebook integration for their account"
  ON public.facebook_integrations
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage Facebook integration for their account"
  ON public.facebook_integrations
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for facebook_ad_leads
CREATE POLICY "Users can view Facebook leads for their account"
  ON public.facebook_ad_leads
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage Facebook leads for their account"
  ON public.facebook_ad_leads
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for facebook_page_messages
CREATE POLICY "Users can view Facebook messages for their account"
  ON public.facebook_page_messages
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage Facebook messages for their account"
  ON public.facebook_page_messages
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for facebook_ad_campaigns
CREATE POLICY "Users can view Facebook campaigns for their account"
  ON public.facebook_ad_campaigns
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage Facebook campaigns for their account"
  ON public.facebook_ad_campaigns
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id
      FROM public.account_members
      WHERE user_id = auth.uid()
    )
  );

-- Add comments to tables
COMMENT ON TABLE public.facebook_integrations IS 'Stores Facebook OAuth tokens and connected account information';
COMMENT ON TABLE public.facebook_ad_leads IS 'Stores leads captured from Facebook Lead Ads';
COMMENT ON TABLE public.facebook_page_messages IS 'Stores messages from Facebook Pages and Instagram';
COMMENT ON TABLE public.facebook_ad_campaigns IS 'Tracks Facebook ad campaign performance metrics';
