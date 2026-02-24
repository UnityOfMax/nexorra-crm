import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/workflows/[id]/stats
// Returns enrollment counts grouped by status for a workflow.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch workflow to get its account_id for authorization
    const { data: workflow } = await supabaseAdmin
      .from('workflows')
      .select('account_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const auth = await requireAccountAccess(request, workflow.account_id);
    if (auth instanceof NextResponse) return auth;

    const { data, error } = await supabaseAdmin
      .from('workflow_executions')
      .select('status')
      .eq('workflow_id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }

    return NextResponse.json({
      in_progress: counts['running'] || 0,
      completed: counts['completed'] || 0,
      failed: counts['failed'] || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
