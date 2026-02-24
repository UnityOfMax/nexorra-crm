import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/pipelines/[id] - Get a single pipeline with its stages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: pipeline, error } = await supabaseAdmin
      .from('pipelines')
      .select(`
        *,
        pipeline_stages (*)
      `)
      .eq('id', id)
      .single();

    if (error || !pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    const auth = await requireAccountAccess(request, pipeline.account_id);
    if (auth instanceof NextResponse) return auth;

    return NextResponse.json({ pipeline });
  } catch (error: any) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pipeline' },
      { status: 500 }
    );
  }
}

// PUT /api/pipelines/[id] - Update a pipeline
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: existing } = await supabaseAdmin
      .from('pipelines')
      .select('account_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const auth = await requireAccountAccess(request, existing.account_id);
    if (auth instanceof NextResponse) return auth;

    const { name, description, type, isDefault } = await request.json();

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (isDefault !== undefined) {
      updates.is_default = isDefault;

      // If setting as default, unset any existing default
      if (isDefault) {
        await supabaseAdmin
          .from('pipelines')
          .update({ is_default: false })
          .eq('account_id', existing.account_id)
          .eq('is_default', true)
          .neq('id', id);
      }
    }

    const { data: updatedPipeline, error } = await supabaseAdmin
      .from('pipelines')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        pipeline_stages (*)
      `)
      .single();

    if (error || !updatedPipeline) {
      console.error('Error updating pipeline:', error);
      return NextResponse.json(
        { error: 'Failed to update pipeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pipeline: updatedPipeline });
  } catch (error: any) {
    console.error('Pipeline PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pipeline' },
      { status: 500 }
    );
  }
}

// DELETE /api/pipelines/[id] - Delete a pipeline
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: existing } = await supabaseAdmin
      .from('pipelines')
      .select('account_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const auth = await requireAccountAccess(request, existing.account_id);
    if (auth instanceof NextResponse) return auth;

    // Check if there are any deals in this pipeline
    const { data: deals, error: dealsError } = await supabaseAdmin
      .from('deals')
      .select('id')
      .eq('pipeline_id', id)
      .limit(1);

    if (dealsError) {
      console.error('Error checking deals:', dealsError);
      return NextResponse.json(
        { error: 'Failed to check for existing deals' },
        { status: 500 }
      );
    }

    if (deals && deals.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete pipeline with existing deals. Move or delete deals first.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('pipelines')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pipeline:', error);
      return NextResponse.json(
        { error: 'Failed to delete pipeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pipeline DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete pipeline' },
      { status: 500 }
    );
  }
}
