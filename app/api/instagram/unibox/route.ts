import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/instagram/unibox
// Returns conversations grouped by (our_account_id, sender_id), sorted by most recent message.
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const accountFilter = searchParams.get('account'); // filter by our_account_id

  let query = supabaseAdmin
    .from('instagram_unibox_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (accountFilter) {
    query = query.eq('our_account_id', accountFilter);
  }

  const { data: messages, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group into conversations: key = our_account_id + ':' + sender_id
  const convMap = new Map<string, {
    key: string;
    our_account_id: string;
    our_username: string | null;
    sender_id: string;
    sender_username: string | null;
    latest_message: string | null;
    latest_at: string;
    message_count: number;
    messages: typeof messages;
  }>();

  for (const msg of (messages || [])) {
    const key = `${msg.our_account_id}:${msg.sender_id}`;
    if (!convMap.has(key)) {
      convMap.set(key, {
        key,
        our_account_id: msg.our_account_id,
        our_username: msg.our_username,
        sender_id: msg.sender_id,
        sender_username: msg.sender_username,
        latest_message: msg.content,
        latest_at: msg.created_at,
        message_count: 0,
        messages: [],
      });
    }
    const conv = convMap.get(key)!;
    conv.message_count++;
    conv.messages.push(msg);
    if (msg.created_at > conv.latest_at) {
      conv.latest_at = msg.created_at;
      conv.latest_message = msg.content;
    }
  }

  const conversations = Array.from(convMap.values())
    .sort((a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime());

  // Also fetch account configs for sidebar display
  const { data: accountConfigs } = await supabaseAdmin
    .from('instagram_account_configs')
    .select('ig_account_id, username, display_name, active')
    .eq('active', true)
    .order('username');

  return NextResponse.json({ conversations, accountConfigs: accountConfigs || [] });
}
