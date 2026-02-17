import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncActivityToGoogle } from '@/lib/google-calendar/sync';

// PUT /api/activities/[id] - Update activity
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;
    const { subject, description, dueDate, completed } = await request.json();

    // Get existing activity
    const { data: existingActivity, error: fetchError } = await supabaseAdmin
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (fetchError || !existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Update activity
    const updates: any = {};
    if (subject !== undefined) updates.subject = subject;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.due_date = dueDate;
    if (completed !== undefined) updates.completed = completed;

    const { data: activity, error: updateError } = await supabaseAdmin
      .from('activities')
      .update(updates)
      .eq('id', activityId)
      .select()
      .single();

    if (updateError || !activity) {
      console.error('Error updating activity:', updateError);
      return NextResponse.json(
        { error: 'Failed to update activity' },
        { status: 500 }
      );
    }

    // Re-sync if meeting type
    if (activity.type === 'meeting' && activity.due_date) {
      syncActivityToGoogle(activity.id, activity.account_id).catch(err => {
        console.error('Failed to sync to Google Calendar:', err);
      });
    }

    return NextResponse.json({ activity });
  } catch (error: any) {
    console.error('Activity update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update activity' },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id] - Delete activity
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: activityId } = params;

    // Delete activity (cascade will handle google_calendar_sync)
    const { error } = await supabaseAdmin
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
      return NextResponse.json(
        { error: 'Failed to delete activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Activity deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
