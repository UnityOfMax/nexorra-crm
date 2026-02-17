import { NextRequest, NextResponse } from 'next/server';
import { triggerWorkflows } from '@/lib/workflow-engine/triggers';

// POST /api/workflows/trigger - Manually trigger workflows
export async function POST(request: NextRequest) {
  try {
    const { accountId, triggerType, triggerData } = await request.json();

    if (!accountId || !triggerType) {
      return NextResponse.json(
        { error: 'accountId and triggerType are required' },
        { status: 400 }
      );
    }

    // Trigger workflows
    await triggerWorkflows(accountId, triggerType, triggerData || {});

    return NextResponse.json({
      success: true,
      message: 'Workflows triggered',
    });
  } catch (error: any) {
    console.error('Workflow trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger workflows' },
      { status: 500 }
    );
  }
}
