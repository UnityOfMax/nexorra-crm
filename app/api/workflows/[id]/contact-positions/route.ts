import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

export const dynamic = 'force-dynamic';

// GET /api/workflows/[id]/contact-positions
// Returns the current workflow step for every running execution,
// along with the contact's name so the tracking view can show
// stick figures at the right step.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  const workflowId = params.id;

  const authCheck = await requireAccountAccess(request, accountId);
  if (authCheck instanceof NextResponse) return authCheck;

  try {
    // 1. Fetch all running executions with their step executions
    const { data: executions, error } = await supabaseAdmin
      .from('workflow_executions')
      .select(`
        id,
        trigger_data,
        workflow_step_executions (
          step_id,
          step_type,
          status,
          started_at
        )
      `)
      .eq('workflow_id', workflowId)
      .eq('account_id', accountId)
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const rows = executions || [];

    // 2. Collect contact IDs from trigger_data
    const contactIds = rows
      .map((ex: any) => ex.trigger_data?.contactId)
      .filter(Boolean) as string[];

    // 3. Batch-fetch contact names
    const contactMap: Record<string, string> = {};
    if (contactIds.length > 0) {
      const { data: contacts } = await supabaseAdmin
        .from('contacts')
        .select('id, first_name, last_name, email')
        .in('id', contactIds);

      for (const c of contacts || []) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unknown';
        contactMap[c.id] = name;
      }
    }

    // 4. Build positions array — one entry per running execution
    const positions = rows.map((ex: any) => {
      const steps = (ex.workflow_step_executions || []) as any[];

      // Find the active step: prefer one with status='running', else the most recent by started_at
      const sorted = [...steps].sort(
        (a, b) =>
          new Date(a.started_at || 0).getTime() - new Date(b.started_at || 0).getTime()
      );
      const runningStep = sorted.find((s) => s.status === 'running');
      const currentStep = runningStep ?? sorted[sorted.length - 1] ?? null;

      const contactId = ex.trigger_data?.contactId as string | undefined;
      const contactName = contactId ? (contactMap[contactId] ?? 'Unknown Contact') : 'Unknown Contact';

      return {
        executionId: ex.id,
        contactId,
        contactName,
        stepId: currentStep?.step_id ?? null,
      };
    });

    return NextResponse.json({ positions });
  } catch (err: any) {
    console.error('[contact-positions] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
