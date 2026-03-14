export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { triggerAgentRun } from '@/lib/agents/trigger-run';

/**
 * Instagram Webhook — receives real-time message notifications from Facebook.
 *
 * Facebook App ID: 1841645373066611
 * Webhook subscription: messages field on instagram page.
 */

// GET — Webhook verification (Facebook sends this on setup)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || process.env.CRON_SECRET;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[instagram-webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — Incoming message notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Facebook sends { object: 'instagram', entry: [...] }
    if (body.object !== 'instagram') {
      return NextResponse.json({ received: true });
    }

    for (const entry of body.entry || []) {
      for (const messaging of entry.messaging || []) {
        const senderId = messaging.sender?.id;
        const recipientId = messaging.recipient?.id;
        const messageText = messaging.message?.text;
        const messageId = messaging.message?.mid;
        const timestamp = messaging.timestamp;

        if (!senderId || !messageText) continue;

        // Skip messages sent by us (outbound)
        if (senderId === recipientId) continue;

        console.log(`[instagram-webhook] Inbound from ${senderId}: ${messageText.substring(0, 50)}...`);

        // Find the lead by instagram_user_id
        const { data: lead } = await supabaseAdmin
          .from('leads')
          .select('id, full_name, instagram_handle, instagram_conversation_id')
          .eq('instagram_user_id', senderId)
          .maybeSingle();

        if (!lead) {
          // Unknown sender — might be a lead we haven't linked yet
          console.log(`[instagram-webhook] Unknown sender: ${senderId}`);
          continue;
        }

        // Find or create conversation
        let conversationId = lead.instagram_conversation_id;

        if (!conversationId) {
          const { data: newConvo } = await supabaseAdmin
            .from('instagram_conversations')
            .insert({
              lead_id: lead.id,
              status: 'active',
              last_message_at: new Date(timestamp * 1000).toISOString(),
              message_count: 1,
            })
            .select('id')
            .single();

          conversationId = newConvo?.id;

          // Link conversation to lead
          if (conversationId) {
            void supabaseAdmin
              .from('leads')
              .update({
                instagram_conversation_id: conversationId,
                instagram_status: 'replied',
              })
              .eq('id', lead.id);
          }
        } else {
          // Update existing conversation
          void supabaseAdmin
            .from('instagram_conversations')
            .update({
              last_message_at: new Date(timestamp * 1000).toISOString(),
            })
            .eq('id', conversationId);
        }

        // Save inbound message
        if (conversationId) {
          void supabaseAdmin.from('instagram_messages').insert({
            conversation_id: conversationId,
            lead_id: lead.id,
            direction: 'inbound',
            content: messageText,
            sent_via: 'api',
            instagram_message_id: messageId,
          });
        }

        // Update lead status
        void supabaseAdmin
          .from('leads')
          .update({ instagram_status: 'replied' })
          .eq('id', lead.id);
      }
    }

    // Trigger the Instagram replies agent to handle responses
    triggerAgentRun('instagram-replies').catch(() => {});

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[instagram-webhook] Error:', error.message);
    return NextResponse.json({ received: true }); // Always return 200 to Facebook
  }
}
