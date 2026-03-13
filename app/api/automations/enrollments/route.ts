import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';
import { stopAutomation } from '@/lib/automations/enrollment';

// GET /api/automations/enrollments?accountId=X&automationId=Y
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const automationId = searchParams.get('automationId');

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  if (!accountId || !automationId) {
    return NextResponse.json({ error: 'accountId and automationId required' }, { status: 400 });
  }

  try {
    // Fetch active enrollments for this automation
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('automation_enrollments')
      .select('id, contact_id, status, created_at, metadata')
      .eq('account_id', accountId)
      .eq('automation_id', automationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    if (enrollError) {
      return NextResponse.json({ error: enrollError.message }, { status: 500 });
    }

    // Fetch contact details for enrolled contacts
    const contactIds = Array.from(new Set((enrollments || []).map((e) => e.contact_id)));
    let contactMap: Record<string, { first_name: string; last_name: string; phone: string; email: string }> = {};

    if (contactIds.length > 0) {
      const { data: contacts } = await supabaseAdmin
        .from('contacts')
        .select('id, first_name, last_name, phone, email')
        .in('id', contactIds);

      for (const c of contacts || []) {
        contactMap[c.id] = c;
      }
    }

    // Fetch next pending message per enrollment
    const enrollmentIds = (enrollments || []).map((e) => e.id);
    let nextMsgMap: Record<string, string | null> = {};

    if (enrollmentIds.length > 0) {
      const { data: nextMsgs } = await supabaseAdmin
        .from('automation_messages')
        .select('enrollment_id, send_at')
        .in('enrollment_id', enrollmentIds)
        .eq('status', 'pending')
        .order('send_at', { ascending: true });

      for (const m of nextMsgs || []) {
        if (!nextMsgMap[m.enrollment_id]) {
          nextMsgMap[m.enrollment_id] = m.send_at;
        }
      }
    }

    const enrollmentList = (enrollments || []).map((e) => {
      const contact = contactMap[e.contact_id] || {};
      return {
        id: e.id,
        contact_id: e.contact_id,
        contact_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
        contact_phone: contact.phone || '',
        contact_email: contact.email || '',
        enrolled_at: e.created_at,
        status: e.status,
        next_message_at: nextMsgMap[e.id] ?? null,
      };
    });

    // Fetch recent messages for this automation (last 50, all statuses)
    const { data: recentMsgs, error: msgError } = await supabaseAdmin
      .from('automation_messages')
      .select('id, contact_id, enrollment_id, type, subject, body, status, sent_at, send_at')
      .eq('account_id', accountId)
      .in('enrollment_id', enrollmentIds.length > 0 ? enrollmentIds : ['00000000-0000-0000-0000-000000000000'])
      .order('send_at', { ascending: false })
      .limit(50);

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    const recentMessages = (recentMsgs || []).map((m) => {
      const contact = contactMap[m.contact_id] || {};
      return {
        id: m.id,
        contact_id: m.contact_id,
        contact_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
        type: m.type,
        subject: m.subject,
        body: m.body,
        status: m.status,
        sent_at: m.sent_at,
        send_at: m.send_at,
      };
    });

    return NextResponse.json({ enrollments: enrollmentList, recentMessages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

// DELETE /api/automations/enrollments?accountId=X&contactId=Y
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const contactId = searchParams.get('contactId');

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  if (!accountId || !contactId) {
    return NextResponse.json({ error: 'accountId and contactId required' }, { status: 400 });
  }

  try {
    await stopAutomation(accountId, contactId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
