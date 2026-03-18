import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/push/send-notification';
import { triggerAgentRun } from '@/lib/agents/trigger-run';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.PEOPLES_DM_WEBHOOK_SECRET || '';

// GET — Meta-style webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || searchParams.get('verify_token') || searchParams.get('hub.verify_token');
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge');
  const mode = searchParams.get('hub.mode');

  if (mode === 'subscribe') {
    if (secret === WEBHOOK_SECRET) {
      console.log('[peoples-dm] Meta verification OK');
      return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }

  if (secret === WEBHOOK_SECRET) {
    return new NextResponse(challenge || 'ok', { status: 200 });
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — receives inbound DM notifications
// Handles two formats:
//   1. Meta native webhook: { object: "instagram", entry: [{ id, messaging: [{ sender, recipient, message }] }] }
//   2. Peoples DM legacy: { instagram_handle, message, sender_name, timestamp }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Allow unsigned Meta webhooks (Meta doesn't send our secret) but still accept secret-bearing ones
    const secret = body.secret || request.headers.get('x-peoples-dm-secret');
    if (WEBHOOK_SECRET && secret && secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Meta native Instagram webhook format ──────────────────────────────
    if (body.object === 'instagram' && Array.isArray(body.entry)) {
      let processed = 0;
      for (const entry of body.entry) {
        const ourAccountId: string = entry.id; // Our IG account ID

        // Auto-register unknown account IDs so we can see them in the unibox
        // (username will be filled in manually or via first-hit lookup)
        const { data: accountConfig } = await supabaseAdmin
          .from('instagram_account_configs')
          .select('username')
          .eq('ig_account_id', ourAccountId)
          .maybeSingle();

        const ourUsername = accountConfig?.username || null;

        const messaging: any[] = entry.messaging || [];
        for (const event of messaging) {
          const senderId: string = event.sender?.id;
          const msg = event.message;
          if (!senderId || !msg) continue;

          // Skip echo messages (our own outbound reflected back)
          if (msg.is_echo) continue;

          const messageId: string = msg.mid;
          const text: string = msg.text || '';
          const attachments = msg.attachments || null;

          // Dedup by meta_message_id
          const { error: insertError } = await supabaseAdmin
            .from('instagram_unibox_messages')
            .insert({
              our_account_id: ourAccountId,
              our_username: ourUsername,
              sender_id: senderId,
              direction: 'inbound',
              content: text,
              attachments: attachments,
              meta_message_id: messageId,
              meta_raw: event,
            });

          if (insertError?.code === '23505') continue; // Duplicate — skip
          processed++;

          // Also handle leads-based flow if this sender is a known lead
          if (ourUsername) {
            const { data: lead } = await supabaseAdmin
              .from('leads')
              .select('id, full_name, instagram_status')
              .eq('instagram_handle', senderId)
              .maybeSingle();

            if (lead && lead.instagram_status !== 'booked') {
              void supabaseAdmin
                .from('leads')
                .update({ instagram_status: 'replied', instagram_reply_channel: 'meta_webhook' })
                .eq('id', lead.id);
            }
          }
        }
      }

      // Notify agency owner
      const agencyUserId = '54ae626a-4291-4a7e-beb4-26f7814c2491';
      if (processed > 0) {
        sendPushToUser(agencyUserId, {
          title: '💬 Instagram DM',
          body: `${processed} new message${processed > 1 ? 's' : ''} received`,
          tag: 'instagram-dms',
          url: '/?view=instagram-dms',
        }).catch(() => {});
        triggerAgentRun('instagram-replies').catch(() => {});
      }

      return NextResponse.json({ received: true, processed });
    }

    // ── Peoples DM legacy format ──────────────────────────────────────────
    const { instagram_handle, message, sender_name } = body;
    if (!instagram_handle) {
      return NextResponse.json({ error: 'instagram_handle required' }, { status: 400 });
    }

    const handle = instagram_handle.replace('@', '').toLowerCase();

    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, full_name, instagram_status, instagram_reply_channel')
      .eq('instagram_handle', handle)
      .eq('lead_category', 'instagram')
      .maybeSingle();

    if (!lead) {
      // Save to unibox anyway
      void supabaseAdmin.from('instagram_unibox_messages').insert({
        our_account_id: 'peoples_dm',
        our_username: null,
        sender_id: handle,
        sender_username: handle,
        direction: 'inbound',
        content: message || '(no text)',
        meta_raw: body,
      });
      return NextResponse.json({ received: true, matched: false });
    }

    if (lead.instagram_status !== 'booked') {
      void supabaseAdmin
        .from('leads')
        .update({ instagram_status: 'replied', instagram_reply_channel: 'peoples_dm' })
        .eq('id', lead.id);
    }

    let { data: conversation } = await supabaseAdmin
      .from('instagram_conversations')
      .select('id, message_count')
      .eq('lead_id', lead.id)
      .maybeSingle();

    if (!conversation) {
      const { data: newConvo } = await supabaseAdmin
        .from('instagram_conversations')
        .insert({
          lead_id: lead.id,
          status: 'active',
          reply_channel: 'peoples_dm',
          last_message_at: new Date().toISOString(),
          message_count: 1,
        })
        .select('id, message_count')
        .single();
      conversation = newConvo;
    } else {
      void supabaseAdmin
        .from('instagram_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: ((conversation as any).message_count || 0) + 1,
        })
        .eq('id', conversation.id);
    }

    if (conversation) {
      void supabaseAdmin.from('instagram_messages').insert({
        conversation_id: conversation.id,
        lead_id: lead.id,
        direction: 'inbound',
        content: message || '(no text)',
        sent_via: 'api',
      });
    }

    // Also store in unibox
    void supabaseAdmin.from('instagram_unibox_messages').insert({
      our_account_id: 'peoples_dm',
      sender_id: handle,
      sender_username: handle,
      direction: 'inbound',
      content: message || '(no text)',
      meta_raw: body,
    });

    const agencyUserId = '54ae626a-4291-4a7e-beb4-26f7814c2491';
    sendPushToUser(agencyUserId, {
      title: '💬 Instagram Reply',
      body: `${lead.full_name || handle} replied`,
      tag: 'instagram-reply',
      url: '/?view=instagram-dms',
    }).catch(() => {});
    triggerAgentRun('instagram-replies').catch(() => {});

    return NextResponse.json({ received: true, matched: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[peoples-dm] Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
