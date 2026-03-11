import { NextRequest, NextResponse } from 'next/server';
import { generateKimiReply } from '@/lib/kimi/generate-reply';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/kimi-generate
 *
 * Generate a reply using Claude Haiku 4.5 with prompt caching.
 * Used by cron agents for cold email and client reply generation.
 * (Route path kept for backward compatibility with agent scripts.)
 *
 * Auth: CRON_SECRET bearer token or session auth.
 */
export async function POST(request: NextRequest) {
  // Auth: check CRON_SECRET or session
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Cron agent auth — OK
  } else {
    // No valid auth
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { systemPrompt, messages, contactContext, maxTokens, temperature } = body;

  if (!systemPrompt || !messages) {
    return NextResponse.json(
      { error: 'systemPrompt and messages are required' },
      { status: 400 }
    );
  }

  try {
    const result = await generateKimiReply({
      systemPrompt,
      conversationHistory: messages,
      contactContext,
      maxTokens: maxTokens || 500,
      temperature: temperature ?? 0.7,
    });

    return NextResponse.json({
      reply: result.reply,
      usage: result.tokensUsed,
    });
  } catch (err) {
    console.error('Haiku generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
