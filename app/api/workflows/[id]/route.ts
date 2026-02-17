import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/workflows/[id] - Get a single workflow
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: workflow, error } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error('Workflow GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/[id] - Update a workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      workflowDefinition,
      isActive,
    } = await request.json();

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (triggerType !== undefined) updates.trigger_type = triggerType;
    if (triggerConfig !== undefined) updates.trigger_config = triggerConfig;
    if (workflowDefinition !== undefined) {
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

      updates.workflow_definition = workflowDefinition;

      // Increment version when workflow definition changes
      updates.version = await supabaseAdmin
        .from('workflows')
        .select('version')
        .eq('id', id)
        .single()
        .then(({ data }) => (data?.version || 0) + 1);
    }
    if (isActive !== undefined) updates.is_active = isActive;

    const { data: updatedWorkflow, error } = await supabaseAdmin
      .from('workflows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedWorkflow) {
      console.error('Error updating workflow:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow: updatedWorkflow });
  } catch (error: any) {
    console.error('Workflow PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[id] - Delete a workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workflow:', error);
      return NextResponse.json(
        { error: 'Failed to delete workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Workflow DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
