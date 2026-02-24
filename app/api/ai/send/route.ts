import { NextRequest, NextResponse } from 'next/server';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { generateAndSendAI } from '@/lib/ai/generate-and-send';

// POST /api/ai/send
// Generates an AI response and sends it via the appropriate channel.
// Also manages the follow-up queue: cancels any pending follow-up, schedules a new one.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, contactId, channel, isFollowUp, followUpCount } = body;

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    if (!accountId || !contactId || !channel) {
      return NextResponse.json({ error: 'accountId, contactId, and channel required' }, { status: 400 });
    }

    const result = await generateAndSendAI({
      accountId,
      contactId,
      channel,
      isFollowUp,
      followUpCount,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('AI send error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send AI message' }, { status: 500 });
  }
}
