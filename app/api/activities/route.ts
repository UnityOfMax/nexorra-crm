import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncActivityToGoogle } from '@/lib/google-calendar/sync';

// POST /api/activities - Create activity
export async function POST(request: NextRequest) {
  try {
    const {
      accountId,
      contactId,
      dealId,
      type,
      subject,
      description,
      dueDate,
      createdBy
    } = await request.json();

    if (!accountId || !type || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: activity, error } = await supabaseAdmin
      .from('activities')
      .insert({
        account_id: accountId,
        contact_id: contactId,
        deal_id: dealId,
        type,
        subject,
        description,
        due_date: dueDate,
        created_by: createdBy,
        completed: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      );
    }

    // If meeting with due date, sync to Google Calendar immediately
    if (type === 'meeting' && dueDate) {
      try {
        await syncActivityToGoogle(activity.id, accountId);
      } catch (err) {
        console.error('Failed to sync to Google Calendar:', err);
        // Non-fatal — activity is already saved
      }
    }

    return NextResponse.json({ activity });
  } catch (error: any) {
    console.error('Activity creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create activity' },
      { status: 500 }
    );
  }
}

// GET /api/activities - List activities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const contactId = searchParams.get('contactId');
    const dealId = searchParams.get('dealId');
    const type = searchParams.get('type');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('activities')
      .select('*')
      .eq('account_id', accountId);

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    if (dealId) {
      query = query.eq('deal_id', dealId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: activities, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Activity fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
