import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/ai/send
// Generates an AI response and sends it via the appropriate channel.
// Also manages the follow-up queue: cancels any pending follow-up, schedules a new one.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, contactId, channel, isFollowUp, followUpCount } = body;

    if (!accountId || !contactId || !channel) {
      return NextResponse.json({ error: 'accountId, contactId, and channel required' }, { status: 400 });
    }

    // Step 1: Generate AI response
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const generateRes = await fetch(`${baseUrl}/api/ai/generate-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, contactId, channel, isFollowUp, followUpCount }),
    });

    if (!generateRes.ok) {
      const errorData = await generateRes.json();
      return NextResponse.json({ error: errorData.error || 'Failed to generate AI response' }, { status: 500 });
    }

    const { response: aiMessage, subject } = await generateRes.json();

    // Step 2: Load contact info
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Step 3: Send via appropriate channel
    if (channel === 'sms') {
      if (!contact.phone) {
        return NextResponse.json({ error: 'Contact has no phone number' }, { status: 400 });
      }

      const smsRes = await fetch(`${baseUrl}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          to: contact.phone,
          message: aiMessage,
          contactId,
        }),
      });

      const sendResult = await smsRes.json();
      if (!smsRes.ok) {
        return NextResponse.json({ error: sendResult.error || 'Failed to send SMS' }, { status: 500 });
      }
    } else if (channel === 'email') {
      if (!contact.email) {
        return NextResponse.json({ error: 'Contact has no email' }, { status: 400 });
      }

      const emailRes = await fetch(`${baseUrl}/api/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          to: contact.email,
          subject: subject || 'Follow-up',
          textContent: aiMessage,
          htmlContent: `<p>${aiMessage.replace(/\n/g, '<br>')}</p>`,
          contactId,
        }),
      });

      const sendResult = await emailRes.json();
      if (!emailRes.ok) {
        return NextResponse.json({ error: sendResult.error || 'Failed to send email' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    // Step 4: Mark the last outbound message as AI-generated
    const { data: lastMessage } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('direction', 'outbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMessage) {
      await supabaseAdmin
        .from('messages')
        .update({
          is_ai_generated: true,
          ai_metadata: { model: 'claude-sonnet-4-6', channel },
        })
        .eq('id', lastMessage.id);
    }

    // Step 5: Manage follow-up queue
    // Cancel existing pending follow-up for this contact+channel, then schedule a new one.
    // This means every AI outbound message resets the 24h follow-up timer.
    await supabaseAdmin
      .from('ai_follow_up_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('channel', channel)
      .eq('status', 'pending');

    // Only schedule follow-up if this is not already the 3rd follow-up (no infinite loop)
    const currentFollowUpCount = followUpCount ?? 0;
    if (!isFollowUp || currentFollowUpCount < 3) {
      await supabaseAdmin.from('ai_follow_up_queue').insert({
        account_id: accountId,
        contact_id: contactId,
        channel,
        follow_up_count: isFollowUp ? currentFollowUpCount + 1 : 0,
        next_follow_up_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        status: 'pending',
      });
    }

    return NextResponse.json({
      success: true,
      message: aiMessage,
      subject,
      channel,
    });
  } catch (error: any) {
    console.error('AI send error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send AI message' }, { status: 500 });
  }
}
