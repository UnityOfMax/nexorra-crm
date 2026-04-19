import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// POST /api/integrations/google/disconnect - Disconnect Google Calendar
export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    // Get existing account settings
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Remove Google Calendar from settings
    const updatedSettings = { ...account.settings };
    delete updatedSettings.google_calendar;

    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({ settings: updatedSettings })
      .eq('id', accountId);

    if (updateError) {
      console.error('Error updating account settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect calendar' },
        { status: 500 }
      );
    }

    // Delete all sync mappings for this account
    const { error: deleteError } = await supabaseAdmin
      .from('google_calendar_sync')
      .delete()
      .eq('account_id', accountId);

    if (deleteError) {
      console.error('Error deleting sync mappings:', deleteError);
    }

    console.log('Google Calendar disconnected for account:', accountId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}
