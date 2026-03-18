/**
 * Instagram Graph API client for DM management.
 *
 * Uses the page access token from facebook_integrations table.
 * Requires Facebook App ID 1841645373066611 with instagram_manage_messages scope.
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

interface IGConversation {
  id: string;
  participants: { data: Array<{ id: string; username?: string }> };
  updated_time: string;
}

interface IGMessage {
  id: string;
  message?: string;
  from: { id: string; username?: string };
  created_time: string;
}

async function graphFetch(endpoint: string, accessToken: string, options?: RequestInit) {
  const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_API_BASE}${endpoint}`;
  const separator = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${separator}access_token=${accessToken}`, options);
  const data = await res.json();
  if (data.error) {
    throw new Error(`Instagram API error: ${data.error.message} (code: ${data.error.code})`);
  }
  return data;
}

/**
 * Get Instagram conversations for a business account.
 */
export async function getConversations(
  igAccountId: string,
  accessToken: string,
  limit = 20
): Promise<IGConversation[]> {
  const data = await graphFetch(
    `/${igAccountId}/conversations?fields=participants,updated_time&limit=${limit}`,
    accessToken
  );
  return data.data || [];
}

/**
 * Get messages in a conversation thread.
 */
export async function getMessages(
  conversationId: string,
  accessToken: string,
  limit = 50
): Promise<IGMessage[]> {
  const data = await graphFetch(
    `/${conversationId}/messages?fields=message,from,created_time&limit=${limit}`,
    accessToken
  );
  return data.data || [];
}

/**
 * Send a message to a user via Instagram DM.
 * Requires instagram_manage_messages permission.
 */
export async function sendMessage(
  igAccountId: string,
  recipientId: string,
  message: string,
  accessToken: string
): Promise<{ messageId: string }> {
  const data = await graphFetch(`/${igAccountId}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });
  return { messageId: data.message_id || data.id };
}

/**
 * Look up an Instagram user by username using business discovery.
 */
export async function getInstagramUserId(
  igAccountId: string,
  username: string,
  accessToken: string
): Promise<{ id: string; name: string; username: string } | null> {
  try {
    const data = await graphFetch(
      `/${igAccountId}?fields=business_discovery.fields(id,name,username){username=${username}}`,
      accessToken
    );
    return data.business_discovery || null;
  } catch {
    return null;
  }
}

// ── Unibox account token helpers (uses instagram_account_configs) ─────────────

import { supabaseAdmin } from '@/lib/supabase';

/**
 * Get the access token for one of our 5 Instagram accounts by ig_account_id.
 */
export async function getTokenForOurAccount(
  igAccountId: string
): Promise<{ token: string; username: string } | null> {
  const { data } = await supabaseAdmin
    .from('instagram_account_configs')
    .select('access_token, username')
    .eq('ig_account_id', igAccountId)
    .eq('active', true)
    .maybeSingle();
  if (!data?.access_token) return null;
  return { token: data.access_token, username: data.username };
}

/**
 * Send an Instagram DM from one of our accounts to a recipient PSID.
 * Stores the outbound message in instagram_unibox_messages.
 */
export async function sendUniboxDM(
  igAccountId: string,
  recipientId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const account = await getTokenForOurAccount(igAccountId);
  if (!account) {
    return { success: false, error: `No access token for account ${igAccountId}` };
  }

  const res = await fetch(`${GRAPH_API_BASE.replace('facebook', 'instagram')}/me/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${account.token}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[instagram] sendUniboxDM error:', data);
    return { success: false, error: data.error?.message || 'Send failed' };
  }

  void supabaseAdmin.from('instagram_unibox_messages').insert({
    our_account_id: igAccountId,
    our_username: account.username,
    sender_id: recipientId,
    direction: 'outbound',
    content: text,
    meta_message_id: data.message_id,
  });

  return { success: true, messageId: data.message_id };
}

/**
 * Subscribe one of our Instagram accounts to webhook event fields.
 * Call this once per account from /api/instagram/subscribe.
 */
export async function subscribeAccountToWebhooks(
  igAccountId: string,
  fields = 'messages,message_reactions'
): Promise<{ success: boolean; error?: string }> {
  const account = await getTokenForOurAccount(igAccountId);
  if (!account) return { success: false, error: `No token for ${igAccountId}` };

  const url = `https://graph.instagram.com/v21.0/me/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}&access_token=${account.token}`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();

  if (!res.ok || !data.success) {
    return { success: false, error: data.error?.message || JSON.stringify(data) };
  }
  return { success: true };
}

/**
 * Get the Instagram account ID and page access token from facebook_integrations.
 */
export async function getInstagramCredentials(supabaseAdmin: any): Promise<{
  igAccountId: string;
  accessToken: string;
  pageId: string;
} | null> {
  // Get the first facebook integration with Instagram connected
  const { data } = await supabaseAdmin
    .from('facebook_integrations')
    .select('access_token, instagram_account_id, facebook_pages')
    .not('instagram_account_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!data?.instagram_account_id || !data?.access_token) {
    return null;
  }

  // Find the page that has Instagram connected
  const pages = data.facebook_pages || [];
  const pageWithIG = pages.find((p: any) => p.instagram_business_account);
  const pageAccessToken = pageWithIG?.access_token || data.access_token;

  return {
    igAccountId: data.instagram_account_id,
    accessToken: pageAccessToken,
    pageId: pageWithIG?.id || '',
  };
}
