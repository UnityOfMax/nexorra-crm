import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-account-access';
import { sendMessage } from '@/lib/telegram/client';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { chatId } = await req.json();
  if (!chatId) return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });

  try {
    await sendMessage(chatId, '✅ *Nexorra CRM* — test alert\n\nTelegram alerts are connected and working.');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
