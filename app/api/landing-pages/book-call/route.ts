import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/landing-pages/book-call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      contactId,
      contactName,
      slotUtc,
      slotDisplay,
      agentName,
      formAnswers,
    } = body;

    if (!accountId || !slotUtc) {
      return NextResponse.json({ error: 'accountId and slotUtc required' }, { status: 400 });
    }

    // Build description with all form answers
    const answerSummary = Object.entries(formAnswers || {})
      .filter(([k]) => !['first_name', 'last_name', 'phone', 'email'].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const description = `Booked via landing page
Time: ${slotDisplay}
Agent: ${agentName}

--- Lead Answers ---
${answerSummary}`;

    // Create activity (call/meeting) in CRM
    const { error: activityError } = await supabaseAdmin
      .from('activities')
      .insert({
        account_id: accountId,
        contact_id: contactId || null,
        type: 'call',
        subject: `Call with ${contactName || 'Lead'} — Booked via Landing Page`,
        description,
        completed: false,
        due_date: slotUtc,
        created_by: accountId,
      });

    if (activityError) {
      console.error('Activity creation error:', activityError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Book call error:', error);
    return NextResponse.json({ error: error.message || 'Booking failed' }, { status: 500 });
  }
}
