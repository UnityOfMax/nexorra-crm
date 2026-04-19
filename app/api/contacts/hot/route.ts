import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/contacts/hot?accountId=X&limit=5
// Returns contacts with lead_score >= 70 or a recent high-intent inbound message (last 48h).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountId = searchParams.get('accountId');
  const limit = Math.min(Number(searchParams.get('limit') ?? 5), 20);

  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Fetch high-score contacts
  const { data: highScore } = await supabaseAdmin
    .from('contacts')
    .select('id, first_name, last_name, phone, email, lead_score, funnel_stage')
    .eq('account_id', accountId)
    .gte('lead_score', 70)
    .order('lead_score', { ascending: false })
    .limit(limit);

  // Fetch contacts with recent high-intent inbound messages
  const { data: recentIntentMsgs } = await supabaseAdmin
    .from('messages')
    .select('contact_id, content, metadata, created_at')
    .eq('account_id', accountId)
    .eq('direction', 'inbound')
    .in('metadata->>intent', ['booking_signal', 'interested'])
    .gte('created_at', fortyEightHoursAgo)
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  // Collect unique contact IDs from intent messages not already in highScore
  const highScoreIds = new Set((highScore ?? []).map(c => c.id));
  const intentContactIds = Array.from(new Set(
    (recentIntentMsgs ?? [])
      .map(m => m.contact_id)
      .filter(id => id && !highScoreIds.has(id))
  )).slice(0, limit);

  let intentContacts: typeof highScore = [];
  if (intentContactIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, phone, email, lead_score, funnel_stage')
      .eq('account_id', accountId)
      .in('id', intentContactIds);
    intentContacts = data ?? [];
  }

  // Merge, deduplicate, and build enriched list
  const allContacts = [...(highScore ?? []), ...intentContacts];
  const seen = new Set<string>();
  const unique = allContacts.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  }).slice(0, limit);

  // Attach last inbound message intent + preview for each contact
  const enriched = await Promise.all(unique.map(async (contact) => {
    const { data: lastMsg } = await supabaseAdmin
      .from('messages')
      .select('content, metadata, created_at')
      .eq('account_id', accountId)
      .eq('contact_id', contact.id)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      ...contact,
      last_intent: (lastMsg?.metadata as Record<string, string> | null)?.intent ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      last_message_preview: lastMsg?.content ? lastMsg.content.substring(0, 60) : null,
    };
  }));

  // Sort by lead_score desc, then by last_message_at desc
  enriched.sort((a, b) => {
    const scoreDiff = (b.lead_score ?? 0) - (a.lead_score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.last_message_at && b.last_message_at) {
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    }
    return 0;
  });

  return NextResponse.json({ contacts: enriched });
}
