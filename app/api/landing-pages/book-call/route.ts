import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncActivityToGoogle } from '@/lib/google-calendar/sync';
import { enrollBookingReminders } from '@/lib/automations/enrollment';

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

    // ── Resolve a real user ID for `created_by` (FK to public.users) ──────────
    // The booking comes from an anonymous public form, so we look up a real
    // user associated with this account using the same fallback strategy
    // as syncGoogleEventToActivity.
    let createdByUserId: string | null = null;

    const { data: accountRow } = await supabaseAdmin
      .from('accounts')
      .select('settings, parent_account_id')
      .eq('id', accountId)
      .maybeSingle();

    // Strategy 1: user who connected Google Calendar (stored during OAuth)
    const connectedUserId = (accountRow?.settings?.google_calendar as any)?.connected_user_id;
    if (connectedUserId) createdByUserId = connectedUserId;

    // Strategy 2: any direct member of this account
    if (!createdByUserId) {
      const { data: directMember } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (directMember) createdByUserId = directMember.user_id;
    }

    // Strategy 3: any owner/admin of the parent agency account
    if (!createdByUserId && accountRow?.parent_account_id) {
      const { data: agencyMember } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountRow.parent_account_id)
        .in('role', ['agency_owner', 'agency_admin', 'owner'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (agencyMember) createdByUserId = agencyMember.user_id;
    }

    // Strategy 4: any member of the parent agency (no role filter)
    if (!createdByUserId && accountRow?.parent_account_id) {
      const { data: anyMember } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountRow.parent_account_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (anyMember) createdByUserId = anyMember.user_id;
    }

    // Strategy 5: any member of THIS account (no role filter, catches admin accounts)
    if (!createdByUserId) {
      const { data: anyDirectMember } = await supabaseAdmin
        .from('account_members')
        .select('user_id')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (anyDirectMember) createdByUserId = anyDirectMember.user_id;
    }

    if (!createdByUserId) {
      console.error('[book-call] Could not resolve a user ID for account:', accountId);
      return NextResponse.json(
        { error: 'Unable to book — account configuration issue. Please contact support.' },
        { status: 500 }
      );
    }

    // ── Build description with all form answers ───────────────────────────────
    const answerSummary = Object.entries(formAnswers || {})
      .filter(([k]) => !['first_name', 'last_name', 'phone', 'email'].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const description = `Booked via landing page
Time: ${slotDisplay}
Agent: ${agentName}

--- Lead Answers ---
${answerSummary}`;

    // ── Create activity so it appears on the CRM calendar ─────────────────────
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activities')
      .insert({
        account_id: accountId,
        contact_id: contactId || null,
        type: 'meeting',
        subject: `Call with ${contactName || 'Lead'} — Booked via Landing Page`,
        description,
        completed: false,
        due_date: slotUtc,
        created_by: createdByUserId,
      })
      .select()
      .single();

    if (activityError) {
      console.error('[book-call] Activity creation error:', activityError);
      return NextResponse.json(
        { error: 'Failed to save booking. Please try again.' },
        { status: 500 }
      );
    }

    // ── Sync to Google Calendar if connected (non-blocking) ───────────────────
    syncActivityToGoogle(activity.id, accountId).catch(err => {
      console.error('[book-call] Failed to sync to Google Calendar:', err);
    });

    // ── Trigger booking reminders automation (non-blocking) ───────────────────
    enrollBookingReminders({
      accountId,
      contactId: contactId || '',
      contactName: contactName || 'there',
      agentName: agentName || 'Your Agent',
      callTimeUtc: slotUtc,
      callTimeDisplay: slotDisplay,
    }).catch(err => {
      console.error('[book-call] automation enrollment error:', err);
    });

    return NextResponse.json({ success: true, activityId: activity.id });
  } catch (error: any) {
    console.error('[book-call] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Booking failed' }, { status: 500 });
  }
}
