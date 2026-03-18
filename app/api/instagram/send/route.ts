import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// POST /api/instagram/send
// Send a DM from one of our Instagram accounts to a recipient
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { our_account_id, recipient_id, message } = await request.json();

  if (!our_account_id || !recipient_id || !message) {
    return NextResponse.json({ error: 'our_account_id, recipient_id, and message required' }, { status: 400 });
  }

  // Look up access token
  const { data: config } = await supabaseAdmin
    .from('instagram_account_configs')
    .select('ig_account_id, username, access_token')
    .eq('ig_account_id', our_account_id)
    .maybeSingle();

  if (!config?.access_token) {
    return NextResponse.json({ error: 'No access token for this account' }, { status: 400 });
  }

  // Send via Instagram Messaging API
  const res = await fetch(`https://graph.instagram.com/v21.0/me/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipient_id },
      message: { text: message },
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    console.error('[ig-send] Meta API error:', result);
    return NextResponse.json({ error: result.error?.message || 'Send failed', meta: result }, { status: res.status });
  }

  // Store outbound message in unibox
  const { data: stored } = await supabaseAdmin
    .from('instagram_unibox_messages')
    .insert({
      our_account_id: config.ig_account_id,
      our_username: config.username,
      sender_id: recipient_id,
      direction: 'outbound',
      content: message,
      meta_message_id: result.message_id || null,
      meta_raw: result,
    })
    .select('id')
    .single();

  return NextResponse.json({ success: true, message_id: result.message_id, stored_id: stored?.id });
}
