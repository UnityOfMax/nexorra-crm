import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/workflows/[id]/executions - Get workflow execution history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const workflowId = params.id;

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    // Get executions with step details
    const { data: executions, error } = await supabaseAdmin
      .from('workflow_executions')
      .select(`
        *,
        workflow_step_executions (
          step_id,
          step_type,
          status,
          error,
          output,
          started_at,
          completed_at
        )
      `)
      .eq('workflow_id', workflowId)
      .eq('account_id', accountId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching executions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch executions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      executions: executions || [],
    });
  } catch (error: any) {
    console.error('Executions GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}
