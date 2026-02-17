import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/integrations/facebook/disconnect - Disconnect Facebook integration
export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Delete Facebook integration
    const { error: deleteError } = await supabaseAdmin
      .from('facebook_integrations')
      .delete()
      .eq('account_id', accountId);

    if (deleteError) {
      console.error('Error deleting Facebook integration:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect Facebook' },
        { status: 500 }
      );
    }

    console.log('Facebook disconnected for account:', accountId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting Facebook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Facebook' },
      { status: 500 }
    );
  }
}
