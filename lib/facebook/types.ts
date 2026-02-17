// Facebook integration types

export interface FacebookIntegration {
  id: string;
  account_id: string;
  user_id: string;
  access_token: string;
  token_expires_at?: string;
  facebook_user_id?: string;
  facebook_user_name?: string;
  ad_account_id?: string;
  page_id?: string;
  page_name?: string;
  instagram_account_id?: string;
  instagram_username?: string;
  sync_ads: boolean;
  sync_page_messages: boolean;
  sync_instagram_comments: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FacebookAdLead {
  id: string;
  account_id: string;
  contact_id?: string;
  facebook_lead_id: string;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  lead_data: Record<string, any>;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  created_time?: string;
  synced_at: string;
  created_at: string;
}

export interface FacebookPageMessage {
  id: string;
  account_id: string;
  contact_id?: string;
  message_id: string;
  conversation_id?: string;
  from_id?: string;
  from_name?: string;
  to_id?: string;
  message?: string;
  attachments?: any;
  created_time?: string;
  synced_at: string;
  created_at: string;
}

export interface FacebookAdCampaign {
  id: string;
  account_id: string;
  campaign_id: string;
  campaign_name: string;
  status?: string;
  objective?: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  last_updated: string;
  created_at: string;
}

export interface FacebookAdInsights {
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpp: number;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
}
