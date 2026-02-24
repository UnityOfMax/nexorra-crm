import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAndSendAI } from '@/lib/ai/generate-and-send';

function authOk(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev
  return auth === `Bearer ${secret}`;
}

// GET + POST /api/cron/process-ai-batches
// Runs every minute. Processes:
// 1. SMS debounce batches where process_after <= now
// 2. AI follow-up queue entries that are due
export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }

async function handler(req: NextRequest) {
  if (!authOk(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = { smsBatches: 0, followUps: 0, errors: 0 };

  // ── 1. Process due SMS batches ─────────────────────────────────────────────
  const { data: batches } = await supabaseAdmin
    .from('ai_sms_batches')
    .select('id, account_id, contact_id, messages')
    .eq('status', 'pending')
    .lte('process_after', new Date().toISOString())
    .limit(20);

  for (const batch of batches ?? []) {
    // Mark as processing immediately to avoid duplicate sends
    await supabaseAdmin
      .from('ai_sms_batches')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', batch.id);

    try {
      // Check AI config + contact ai_enabled
      const [{ data: aiConfig }, { data: contact }] = await Promise.all([
        supabaseAdmin
          .from('ai_agent_configs')
          .select('enabled, mode, channels')
          .eq('account_id', batch.account_id)
          .single(),
        supabaseAdmin
          .from('contacts')
          .select('ai_enabled')
          .eq('id', batch.contact_id)
          .single(),
      ]);

      if (!aiConfig?.enabled || aiConfig?.mode !== 'auto' || !aiConfig?.channels?.sms) {
        await supabaseAdmin
          .from('ai_sms_batches')
          .update({ status: 'done' })
          .eq('id', batch.id);
        continue;
      }

      if (contact?.ai_enabled === false) {
        await supabaseAdmin
          .from('ai_sms_batches')
          .update({ status: 'done' })
          .eq('id', batch.id);
        continue;
      }

      // Call generateAndSendAI directly — no HTTP round-trip
      await generateAndSendAI({
        accountId: batch.account_id,
        contactId: batch.contact_id,
        channel: 'sms',
      });
      results.smsBatches++;

      await supabaseAdmin
        .from('ai_sms_batches')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', batch.id);
    } catch (err) {
      console.error('[process-ai-batches] Batch error:', err);
      results.errors++;
      await supabaseAdmin
        .from('ai_sms_batches')
        .update({ status: 'done' })
        .eq('id', batch.id);
    }
  }

  // ── 2. Process due follow-up queue entries ─────────────────────────────────
  const { data: followUps } = await supabaseAdmin
    .from('ai_follow_up_queue')
    .select('id, account_id, contact_id, channel, follow_up_count')
    .eq('status', 'pending')
    .lte('next_follow_up_at', new Date().toISOString())
    .limit(20);

  for (const entry of followUps ?? []) {
    // Max 3 total follow-ups (follow_up_count is 0-indexed: 0, 1, 2)
    if (entry.follow_up_count >= 3) {
      await supabaseAdmin
        .from('ai_follow_up_queue')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', entry.id);
      continue;
    }

    // Check contact ai_enabled
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('ai_enabled')
      .eq('id', entry.contact_id)
      .single();

    if (contact?.ai_enabled === false) {
      await supabaseAdmin
        .from('ai_follow_up_queue')
        .update({ status: 'cancelled' })
        .eq('id', entry.id);
      continue;
    }

    // Mark this entry as sent (the ai/send will create the next follow-up entry)
    await supabaseAdmin
      .from('ai_follow_up_queue')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', entry.id);

    try {
      await generateAndSendAI({
        accountId: entry.account_id,
        contactId: entry.contact_id,
        channel: entry.channel,
        isFollowUp: true,
        followUpCount: entry.follow_up_count,
      });
      results.followUps++;
    } catch (err) {
      console.error('[process-ai-batches] Follow-up error:', err);
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
