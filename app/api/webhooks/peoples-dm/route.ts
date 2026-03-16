import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPushToUser } from '@/lib/push/send-notification';

export const dynamic = 'force-dynamic';

// POST /api/webhooks/peoples-dm
// Receives inbound DM reply notifications from Peoples DM Instagram app.
// TODO: Update payload parsing once webhook format is confirmed.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Expected fields (adjust based on actual Peoples DM webhook payload):
    const { instagram_handle, message, sender_name, timestamp } = body;

    if (!instagram_handle) {
      return NextResponse.json({ error: 'instagram_handle required' }, { status: 400 });
    }

    const handle = instagram_handle.replace('@', '').toLowerCase();

    // Find the lead by Instagram handle
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, full_name, instagram_status')
      .eq('instagram_handle', handle)
      .eq('lead_category', 'instagram')
      .maybeSingle();

    if (!lead) {
      console.warn('[peoples-dm] No lead found for handle:', handle);
      return NextResponse.json({ received: true, matched: false });
    }

    // Update lead status to replied
    if (lead.instagram_status !== 'booked') {
      await supabaseAdmin
        .from('leads')
        .update({ instagram_status: 'replied' })
        .eq('id', lead.id);
    }

    // Save the inbound message
    // Find or create conversation
    let { data: conversation } = await supabaseAdmin
      .from('instagram_conversations')
      .select('id')
      .eq('lead_id', lead.id)
      .maybeSingle();

    if (!conversation) {
      const { data: newConvo } = await supabaseAdmin
        .from('instagram_conversations')
        .insert({
          lead_id: lead.id,
          status: 'active',
          last_message_at: new Date().toISOString(),
          message_count: 1,
        })
        .select('id')
        .single();
      conversation = newConvo;
    } else {
      await supabaseAdmin
        .from('instagram_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (conversation as any).message_count + 1,
        })
        .eq('id', conversation!.id);
    }

    if (conversation) {
      await supabaseAdmin
        .from('instagram_messages')
        .insert({
          conversation_id: conversation.id,
          lead_id: lead.id,
          direction: 'inbound',
          content: message || '(no text)',
          sent_via: 'api',
        });
    }

    // Notify agency owner of the reply
    // Agency owner user ID from memory
    const agencyUserId = '54ae626a-4291-4a7e-beb4-26f7814c2491';
    sendPushToUser(agencyUserId, {
      title: '💬 Instagram Reply',
      body: `${lead.full_name || handle} replied to your DM`,
      tag: 'instagram-reply',
      url: '/instagram-conversations',
    }).catch(() => {});

    return NextResponse.json({ received: true, matched: true, leadId: lead.id });
  } catch (error: any) {
    console.error('[peoples-dm] Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
