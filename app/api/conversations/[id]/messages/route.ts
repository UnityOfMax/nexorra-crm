import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/conversations/[id]/messages — full thread for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = params;

  const { data, error } = await supabaseAdmin
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', id)
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('Thread fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch thread' }, { status: 500 });
  }

  return NextResponse.json({ messages: data || [] });
}
