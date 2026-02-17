import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// PUT /api/deals/[id]/move-stage - Move a deal to a different pipeline stage
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: dealId } = params;
    const { pipelineStageId, position } = await request.json();

    if (!pipelineStageId) {
      return NextResponse.json(
        { error: 'pipelineStageId is required' },
        { status: 400 }
      );
    }

    // Get the deal to check its current state
    const { data: deal, error: dealError } = await supabaseAdmin
      .from('deals')
      .select('*, pipeline_stage_id, account_id')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    const oldStageId = deal.pipeline_stage_id;

    // Get the new stage information
    const { data: newStage, error: stageError } = await supabaseAdmin
      .from('pipeline_stages')
      .select('*, pipeline_id')
      .eq('id', pipelineStageId)
      .single();

    if (stageError || !newStage) {
      return NextResponse.json(
        { error: 'Pipeline stage not found' },
        { status: 404 }
      );
    }

    // Update the deal
    const updates: any = {
      pipeline_stage_id: pipelineStageId,
      pipeline_id: newStage.pipeline_id,
    };

    // If the stage is closed, update the deal status and timestamp
    if (newStage.is_closed) {
      updates.status = newStage.is_won ? 'won' : 'lost';
      if (newStage.is_won) {
        updates.won_at = new Date().toISOString();
      } else {
        updates.lost_at = new Date().toISOString();
      }
    } else if (deal.status !== 'open') {
      // If moving from a closed stage back to an open stage
      updates.status = 'open';
      updates.won_at = null;
      updates.lost_at = null;
    }

    const { data: updatedDeal, error: updateError } = await supabaseAdmin
      .from('deals')
      .update(updates)
      .eq('id', dealId)
      .select('*')
      .single();

    if (updateError || !updatedDeal) {
      console.error('Error updating deal:', updateError);
      return NextResponse.json(
        { error: 'Failed to update deal' },
        { status: 500 }
      );
    }

    // Log activity
    await supabaseAdmin.from('activities').insert({
      account_id: deal.account_id,
      deal_id: dealId,
      type: 'note',
      subject: 'Deal Stage Changed',
      description: `Deal moved to ${newStage.name}`,
      completed: true,
      created_by: deal.account_id, // TODO: Get actual user ID from auth
    });

    // Trigger workflows for deal stage change
    const { triggerDealStageChanged, triggerDealWon, triggerDealLost } = await import('@/lib/workflow-engine/triggers');

    triggerDealStageChanged(
      deal.account_id,
      dealId,
      deal.contact_id,
      oldStageId,
      pipelineStageId
    ).catch((err) => {
      console.error('Error triggering deal_stage_changed workflows:', err);
    });

    // Also trigger won/lost specific workflows if applicable
    if (newStage.is_closed && newStage.is_won) {
      triggerDealWon(deal.account_id, dealId, deal.contact_id).catch((err) => {
        console.error('Error triggering deal_won workflows:', err);
      });
    } else if (newStage.is_closed && !newStage.is_won) {
      triggerDealLost(deal.account_id, dealId, deal.contact_id).catch((err) => {
        console.error('Error triggering deal_lost workflows:', err);
      });
    }

    return NextResponse.json({ deal: updatedDeal });
  } catch (error: any) {
    console.error('Deal move error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to move deal' },
      { status: 500 }
    );
  }
}
