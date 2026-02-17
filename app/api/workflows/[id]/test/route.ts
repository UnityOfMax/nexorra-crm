import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflow } from '@/lib/workflow-engine/executor';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/workflows/[id]/test - Test workflow execution
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { accountId } = await request.json();
    const workflowId = params.id;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Get workflow to check trigger type
    const { data: workflow } = await supabaseAdmin
      .from('workflows')
      .select('trigger_type')
      .eq('id', workflowId)
      .eq('account_id', accountId)
      .single();

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get a test contact for context
    const { data: testContact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('account_id', accountId)
      .limit(1)
      .single();

    // Build test trigger data
    const testTriggerData: Record<string, any> = {};

    if (testContact) {
      testTriggerData.contactId = testContact.id;
    }

    // Get a test deal if available
    const { data: testDeal } = await supabaseAdmin
      .from('deals')
      .select('*')
      .eq('account_id', accountId)
      .limit(1)
      .single();

    if (testDeal) {
      testTriggerData.dealId = testDeal.id;
    }

    // Execute workflow in test mode
    const executionId = await executeWorkflow(
      workflowId,
      accountId,
      workflow.trigger_type,
      testTriggerData
    );

    return NextResponse.json({
      success: true,
      executionId,
      message: 'Workflow test executed',
      data: { executionId },
    });
  } catch (error: any) {
    console.error('Workflow test error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test workflow' },
      { status: 500 }
    );
  }
}
