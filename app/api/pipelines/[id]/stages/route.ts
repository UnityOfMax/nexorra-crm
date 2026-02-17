import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/pipelines/[id]/stages - Get all stages for a pipeline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: stages, error } = await supabaseAdmin
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching stages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ stages: stages || [] });
  } catch (error: any) {
    console.error('Stages GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stages' },
      { status: 500 }
    );
  }
}

// POST /api/pipelines/[id]/stages - Add a stage to a pipeline
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: pipelineId } = params;
    const { name, description, color, position, probability, isClosed, isWon } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // If position is not provided, add to the end
    let stagePosition = position;
    if (stagePosition === undefined) {
      const { data: existingStages } = await supabaseAdmin
        .from('pipeline_stages')
        .select('position')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: false })
        .limit(1);

      stagePosition = existingStages && existingStages.length > 0
        ? existingStages[0].position + 1
        : 0;
    }

    const { data: stage, error } = await supabaseAdmin
      .from('pipeline_stages')
      .insert({
        pipeline_id: pipelineId,
        name,
        description,
        color: color || '#3B82F6',
        position: stagePosition,
        probability: probability !== undefined ? probability : 50,
        is_closed: isClosed || false,
        is_won: isWon || false,
      })
      .select()
      .single();

    if (error || !stage) {
      console.error('Error creating stage:', error);
      return NextResponse.json(
        { error: 'Failed to create stage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ stage });
  } catch (error: any) {
    console.error('Stages POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create stage' },
      { status: 500 }
    );
  }
}

// PUT /api/pipelines/[id]/stages - Update multiple stages (for reordering)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: pipelineId } = params;
    const { stages } = await request.json();

    if (!Array.isArray(stages)) {
      return NextResponse.json(
        { error: 'stages must be an array' },
        { status: 400 }
      );
    }

    // Update each stage
    const updates = stages.map(stage =>
      supabaseAdmin
        .from('pipeline_stages')
        .update({
          name: stage.name,
          description: stage.description,
          color: stage.color,
          position: stage.position,
          probability: stage.probability,
          is_closed: stage.is_closed,
          is_won: stage.is_won,
        })
        .eq('id', stage.id)
        .eq('pipeline_id', pipelineId)
    );

    const results = await Promise.all(updates);

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Error updating stages:', errors);
      return NextResponse.json(
        { error: 'Failed to update some stages' },
        { status: 500 }
      );
    }

    // Fetch updated stages
    const { data: updatedStages } = await supabaseAdmin
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('position', { ascending: true });

    return NextResponse.json({ stages: updatedStages || [] });
  } catch (error: any) {
    console.error('Stages PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update stages' },
      { status: 500 }
    );
  }
}
