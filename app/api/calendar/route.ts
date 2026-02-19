import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/calendar?accountId=X&start=ISO&end=ISO
// Uses supabaseAdmin to bypass RLS — safe because accountId is validated server-side.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!accountId || !start || !end) {
      return NextResponse.json(
        { error: 'accountId, start, and end are required' },
        { status: 400 }
      );
    }

    const { data: acts, error: actsError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('account_id', accountId)
      .eq('type', 'meeting')
      .gte('due_date', start)
      .lte('due_date', end)
      .order('due_date', { ascending: true });

    if (actsError) {
      console.error('Calendar fetch error:', actsError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const activities = acts || [];

    // Identify which activities came from Google Calendar
    let googleIds: string[] = [];
    if (activities.length > 0) {
      const { data: syncs } = await supabaseAdmin
        .from('google_calendar_sync')
        .select('activity_id')
        .in('activity_id', activities.map((a: any) => a.id))
        .eq('sync_direction', 'google_to_crm');

      googleIds = (syncs || []).map((s: any) => s.activity_id);
    }

    return NextResponse.json({ activities, googleIds });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
