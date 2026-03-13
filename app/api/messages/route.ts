import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/messages?accountId=...&contactId=...
// Returns messages from both the `messages` table AND sent `automation_messages`,
// merged and sorted chronologically so automation sends appear in Conversations.
export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    const contactId = request.nextUrl.searchParams.get('contactId');

    if (!accountId || !contactId) {
      return NextResponse.json({ error: 'Missing accountId or contactId' }, { status: 400 });
    }

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    // Fetch from messages table
    const { data: messagesData, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    // Fetch sent automation_messages for this contact (historical sends)
    const { data: autoMsgs } = await supabaseAdmin
      .from('automation_messages')
      .select('id, account_id, contact_id, type, subject, body, status, sent_at')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('status', 'sent')
      .order('sent_at', { ascending: true })
      .limit(200);

    // Build a set of timestamps already in the messages table (to avoid duplicates
    // since the fixed cron now also inserts into messages)
    const existingTimes = new Set(
      (messagesData || [])
        .filter((m) => m.direction === 'outbound' && m.created_at)
        .map((m) => new Date(m.created_at).getTime())
    );

    // Convert automation_messages to the same shape as messages rows
    const autoNormalised = (autoMsgs || [])
      .filter((am) => {
        if (!am.sent_at) return false;
        const t = new Date(am.sent_at).getTime();
        // Skip if a message with the same timestamp already exists (created by the fixed cron)
        return !existingTimes.has(t);
      })
      .map((am) => ({
        id: `auto_${am.id}`,
        account_id: am.account_id,
        contact_id: am.contact_id,
        direction: 'outbound' as const,
        type: am.type as 'sms' | 'email',
        content: am.body,
        from_address: null,
        to_address: null,
        status: 'sent',
        is_ai_generated: false,
        metadata: am.subject ? { subject: am.subject } : {},
        created_at: am.sent_at,
      }));

    // Merge and sort by created_at
    const allMessages = [...(messagesData || []), ...autoNormalised].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return NextResponse.json({ messages: allMessages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch messages' }, { status: 500 });
  }
}
