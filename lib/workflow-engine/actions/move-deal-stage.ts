import { supabaseAdmin } from '@/lib/supabase';
import { WorkflowContext, ExecutionResult } from '../types';

export async function moveDealStageAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { pipelineId, stageId, createIfMissing } = config;

    const { data: ownerMember } = await supabaseAdmin
      .from('account_members')
      .select('user_id')
      .eq('account_id', context.accountId)
      .eq('role', 'owner')
      .single();
    const createdBy = ownerMember?.user_id;

    if (!stageId) {
      return {
        success: false,
        error: 'Stage ID is required',
      };
    }

    let dealId = context.dealId;

    // If no deal exists and createIfMissing is true, create one
    if (!dealId && createIfMissing && context.contactId) {
      // Find the stage
      const { data: stage } = await supabaseAdmin
        .from('pipeline_stages')
        .select('*, pipelines(*)')
        .or(`id.eq.${stageId},name.ilike.${stageId}`)
        .single();

      if (!stage) {
        return {
          success: false,
          error: 'Pipeline stage not found',
        };
      }

      // Create deal
      const { data: newDeal, error: createError } = await supabaseAdmin
        .from('deals')
        .insert({
          account_id: context.accountId,
          contact_id: context.contactId,
          title: `Deal for ${context.variables.contact?.first_name || 'Contact'}`,
          pipeline_id: pipelineId || stage.pipeline_id,
          pipeline_stage_id: stage.id,
          value: 0,
          status: 'open',
        })
        .select()
        .single();

      if (createError || !newDeal) {
        return {
          success: false,
          error: 'Failed to create deal',
        };
      }

      dealId = newDeal.id;

      // Log activity
      if (createdBy) {
        await supabaseAdmin.from('activities').insert({
          account_id: context.accountId,
          contact_id: context.contactId,
          deal_id: dealId,
          type: 'note',
          subject: 'Deal Created',
          description: `Deal created via workflow and moved to ${stage.name}`,
          completed: true,
          created_by: createdBy,
        });
      }

      return {
        success: true,
        data: {
          dealId,
          created: true,
          stageId: stage.id,
          stageName: stage.name,
        },
      };
    }

    if (!dealId) {
      return {
        success: false,
        error: 'No deal ID available and createIfMissing is false',
      };
    }

    // Find the stage (by ID or name)
    const { data: stage } = await supabaseAdmin
      .from('pipeline_stages')
      .select('*')
      .or(`id.eq.${stageId},name.ilike.${stageId}`)
      .single();

    if (!stage) {
      return {
        success: false,
        error: 'Pipeline stage not found',
      };
    }

    // Update deal stage
    const updateData: any = {
      pipeline_stage_id: stage.id,
    };

    // If pipeline is specified, update it too
    if (pipelineId) {
      updateData.pipeline_id = pipelineId;
    }

    // Handle won/lost status
    if (stage.is_closed) {
      updateData.status = stage.is_won ? 'won' : 'lost';
      if (stage.is_won) {
        updateData.won_at = new Date().toISOString();
      }
    }

    const { error } = await supabaseAdmin
      .from('deals')
      .update(updateData)
      .eq('id', dealId);

    if (error) {
      return {
        success: false,
        error: 'Failed to move deal',
      };
    }

    // Log activity
    if (createdBy) {
      await supabaseAdmin.from('activities').insert({
        account_id: context.accountId,
        contact_id: context.contactId,
        deal_id: dealId,
        type: 'note',
        subject: 'Deal Moved',
        description: `Deal moved to ${stage.name} via workflow`,
        completed: true,
        created_by: createdBy,
      });
    }

    return {
      success: true,
      data: {
        dealId,
        stageId: stage.id,
        stageName: stage.name,
      },
    };
  } catch (error) {
    console.error('Error in moveDealStageAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error moving deal',
    };
  }
}
