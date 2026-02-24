import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/pipelines?accountId=xxx - List all pipelines for an account
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    // Get all pipelines for the account with their stages
    const { data: pipelines, error } = await supabaseAdmin
      .from('pipelines')
      .select(`
        *,
        pipeline_stages (*)
      `)
      .eq('account_id', accountId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching pipelines:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pipelines' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pipelines: pipelines || [] });
  } catch (error: any) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pipelines' },
      { status: 500 }
    );
  }
}

// POST /api/pipelines - Create a new pipeline
export async function POST(request: NextRequest) {
  try {
    const { accountId, name, description, type, isDefault, stages } = await request.json();

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    if (!accountId || !name) {
      return NextResponse.json(
        { error: 'accountId and name are required' },
        { status: 400 }
      );
    }

    // If this is the default pipeline, unset any existing default
    if (isDefault) {
      await supabaseAdmin
        .from('pipelines')
        .update({ is_default: false })
        .eq('account_id', accountId)
        .eq('is_default', true);
    }

    // Get the highest position for this account
    const { data: existingPipelines } = await supabaseAdmin
      .from('pipelines')
      .select('position')
      .eq('account_id', accountId)
      .order('position', { ascending: false })
      .limit(1);

    const position = existingPipelines && existingPipelines.length > 0
      ? existingPipelines[0].position + 1
      : 0;

    // Create the pipeline
    const { data: pipeline, error: pipelineError } = await supabaseAdmin
      .from('pipelines')
      .insert({
        account_id: accountId,
        name,
        description,
        type: type || 'sales',
        is_default: isDefault || false,
        position,
      })
      .select()
      .single();

    if (pipelineError || !pipeline) {
      console.error('Error creating pipeline:', pipelineError);
      return NextResponse.json(
        { error: 'Failed to create pipeline' },
        { status: 500 }
      );
    }

    // If stages were provided, create them
    if (stages && Array.isArray(stages) && stages.length > 0) {
      const stageData = stages.map((stage, index) => ({
        pipeline_id: pipeline.id,
        name: stage.name,
        description: stage.description,
        color: stage.color || ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][index % 5],
        position: index,
        probability: stage.probability || 50,
        is_closed: stage.is_closed || false,
        is_won: stage.is_won || false,
      }));

      const { error: stagesError } = await supabaseAdmin
        .from('pipeline_stages')
        .insert(stageData);

      if (stagesError) {
        console.error('Error creating stages:', stagesError);
        // Pipeline was created, but stages failed - we'll still return success
      }
    }

    // Fetch the complete pipeline with stages
    const { data: completePipeline } = await supabaseAdmin
      .from('pipelines')
      .select(`
        *,
        pipeline_stages (*)
      `)
      .eq('id', pipeline.id)
      .single();

    return NextResponse.json({ pipeline: completePipeline || pipeline });
  } catch (error: any) {
    console.error('Pipeline POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pipeline' },
      { status: 500 }
    );
  }
}
