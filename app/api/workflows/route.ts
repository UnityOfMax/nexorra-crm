import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/workflows?accountId=xxx - List all workflows for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const { data: workflows, error } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflows: workflows || [] });
  } catch (error: any) {
    console.error('Workflow GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const {
      accountId,
      name,
      description,
      triggerType,
      triggerConfig,
      workflowDefinition,
      isActive,
      createdBy,
    } = await request.json();

    if (!accountId || !name || !triggerType || !workflowDefinition || !createdBy) {
      return NextResponse.json(
        { error: 'accountId, name, triggerType, workflowDefinition, and createdBy are required' },
        { status: 400 }
      );
    }

    // Validate workflow definition structure
    if (!workflowDefinition.nodes || !Array.isArray(workflowDefinition.nodes)) {
      return NextResponse.json(
        { error: 'workflowDefinition must have a nodes array' },
        { status: 400 }
      );
    }

    if (!workflowDefinition.edges || !Array.isArray(workflowDefinition.edges)) {
      return NextResponse.json(
        { error: 'workflowDefinition must have an edges array' },
        { status: 400 }
      );
    }

    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('workflows')
      .insert({
        account_id: accountId,
        name,
        description,
        trigger_type: triggerType,
        trigger_config: triggerConfig || {},
        workflow_definition: workflowDefinition,
        is_active: isActive !== undefined ? isActive : true,
        created_by: createdBy,
        version: 1,
      })
      .select()
      .single();

    if (workflowError || !workflow) {
      console.error('Error creating workflow:', workflowError);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Workflow POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workflow' },
      { status: 500 }
    );
  }
}
