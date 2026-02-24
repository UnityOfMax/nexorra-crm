import { supabaseAdmin } from '@/lib/supabase';
import { ActionHandler } from '../types';

// Config: { pipelineId, stageId, title? }
// Creates a deal for the contact in the specified pipeline stage.
export const createOpportunityAction: ActionHandler = async (context, config) => {
  try {
    const { pipelineId, stageId, title } = config as {
      pipelineId?: string;
      stageId?: string;
      title?: string;
    };

    if (!context.contactId) {
      return { success: false, error: 'No contact ID in workflow context' };
    }

    // Resolve pipeline — use provided or fall back to account default
    let resolvedPipelineId = pipelineId;
    if (!resolvedPipelineId) {
      const { data: defaultPipeline } = await supabaseAdmin
        .from('pipelines')
        .select('id')
        .eq('account_id', context.accountId)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      if (!defaultPipeline) {
        const { data: anyPipeline } = await supabaseAdmin
          .from('pipelines')
          .select('id')
          .eq('account_id', context.accountId)
          .limit(1)
          .maybeSingle();
        resolvedPipelineId = anyPipeline?.id;
      } else {
        resolvedPipelineId = defaultPipeline.id;
      }
    }

    if (!resolvedPipelineId) {
      return { success: false, error: 'No pipeline found for account' };
    }

    // Resolve stage
    let resolvedStageId = stageId;
    if (!resolvedStageId) {
      const { data: firstStage } = await supabaseAdmin
        .from('pipeline_stages')
        .select('id')
        .eq('pipeline_id', resolvedPipelineId)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedStageId = firstStage?.id;
    }

    // Fetch contact for deal title
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', context.contactId)
      .maybeSingle();

    const dealTitle = title || `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim() || 'New Opportunity';

    // Create deal
    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .insert({
        account_id: context.accountId,
        contact_id: context.contactId,
        title: dealTitle,
        pipeline_id: resolvedPipelineId,
        pipeline_stage_id: resolvedStageId || null,
        status: 'open',
        value: 0,
        probability: 50,
      })
      .select()
      .single();

    if (error || !deal) {
      console.error('[create-opportunity] error:', error);
      return { success: false, error: error?.message || 'Failed to create opportunity' };
    }

    // Log activity
    const { data: member } = await supabaseAdmin
      .from('account_members')
      .select('user_id')
      .eq('account_id', context.accountId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (member?.user_id) {
      await supabaseAdmin.from('activities').insert({
        account_id: context.accountId,
        contact_id: context.contactId,
        deal_id: deal.id,
        type: 'note',
        subject: 'Opportunity Created by Workflow',
        description: `Workflow created opportunity: ${dealTitle}`,
        completed: true,
        created_by: member.user_id,
      });
    }

    return {
      success: true,
      data: { dealId: deal.id, pipelineId: resolvedPipelineId, stageId: resolvedStageId },
    };
  } catch (err: any) {
    console.error('[create-opportunity] unexpected error:', err);
    return { success: false, error: err?.message || 'Unexpected error' };
  }
};
