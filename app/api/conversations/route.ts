import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

/**
 * GET /api/conversations
 *
 * Returns lead_conversations (Stacey's email threads from Instantly).
 * Each row includes the latest inbound message preview and lead details.
 *
 * Query params:
 *   status     - 'needs_reply' | 'replied' | 'booked' | 'ghosted' | 'rejected' | 'all'
 *   timezone   - 'EST' | 'CST' | 'MST' | 'PST'
 *   limit      - max 100 (default 50)
 *   offset     - pagination offset
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const timezone = searchParams.get('timezone');
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const offset = Number(searchParams.get('offset') ?? 0);

  let query = supabaseAdmin
    .from('lead_conversations')
    .select('*', { count: 'exact' })
    .order('last_reply_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') query = query.eq('status', status);
  if (timezone) query = query.eq('timezone', timezone);

  const { data: conversations, error, count } = await query;

  if (error) {
    console.error('Conversations fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({ conversations: [], total: 0, limit, offset });
  }

  // Fetch the latest inbound message for each conversation (preview)
  const conversationIds = conversations.map((c: any) => c.id);
  const { data: latestMessages } = await supabaseAdmin
    .from('conversation_messages')
    .select('conversation_id, content, direction, sender_name, sent_at')
    .in('conversation_id', conversationIds)
    .eq('direction', 'inbound')
    .order('sent_at', { ascending: false });

  // Build a map: conversation_id → latest inbound message
  const latestByConv: Record<string, any> = {};
  for (const msg of latestMessages ?? []) {
    if (!latestByConv[msg.conversation_id]) {
      latestByConv[msg.conversation_id] = msg;
    }
  }

  // Fetch lead details for matching emails
  const emails = Array.from(new Set(conversations.map((c: any) => c.lead_email)));
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, email, full_name, source_brokerage, city, state_province')
    .in('email', emails);

  const leadByEmail: Record<string, any> = {};
  for (const lead of leads ?? []) {
    leadByEmail[lead.email] = lead;
  }

  const enriched = conversations.map((conv: any) => ({
    ...conv,
    latest_message: latestByConv[conv.id] ?? null,
    lead: leadByEmail[conv.lead_email] ?? null,
  }));

  return NextResponse.json({ conversations: enriched, total: count ?? 0, limit, offset });
}
