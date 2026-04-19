import { supabaseAdmin } from '@/lib/supabase';
import { executeWorkflow } from './executor';

export async function triggerWorkflows(
  accountId: string,
  triggerType: string,
  triggerData: Record<string, any>
): Promise<void> {
  try {
    console.log(`Checking for workflows triggered by: ${triggerType}`);

    // Find all active workflows with this trigger type
    const { data: workflows, error } = await supabaseAdmin
      .from('workflows')
      .select('id, name, trigger_type, trigger_config')
      .eq('account_id', accountId)
      .eq('trigger_type', triggerType)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching workflows:', error);
      return;
    }

    if (!workflows || workflows.length === 0) {
      console.log(`No active workflows found for trigger: ${triggerType}`);
      return;
    }

    // Filter by trigger_config constraints (stage_id, contact_source)
    const matchingWorkflows = workflows.filter(w => {
      const cfg = (w.trigger_config as any) || {};
      if (cfg.stage_id && triggerData.newStageId !== cfg.stage_id) return false;
      if (cfg.contact_source && triggerData.contactSource !== cfg.contact_source) return false;
      return true;
    });

    if (matchingWorkflows.length === 0) {
      console.log(`No workflows matched trigger_config for: ${triggerType}`);
      return;
    }

    console.log(`Found ${matchingWorkflows.length} workflows to trigger`);

    // Execute each workflow (in parallel for better performance)
    const executions = matchingWorkflows.map((workflow) =>
      executeWorkflow(workflow.id, accountId, triggerType, triggerData).catch((error) => {
        console.error(`Error executing workflow ${workflow.id}:`, error);
        return null;
      })
    );

    await Promise.all(executions);
  } catch (error) {
    console.error('Error in triggerWorkflows:', error);
  }
}

// Helper functions for specific triggers
export async function triggerContactCreated(accountId: string, contactId: string): Promise<void> {
  await triggerWorkflows(accountId, 'contact_created', { contactId });
}

export async function triggerContactUpdated(accountId: string, contactId: string, changes: Record<string, any>): Promise<void> {
  await triggerWorkflows(accountId, 'contact_updated', { contactId, changes });
}

export async function triggerDealCreated(accountId: string, dealId: string, contactId?: string): Promise<void> {
  await triggerWorkflows(accountId, 'deal_created', { dealId, contactId });
}

export async function triggerDealStageChanged(
  accountId: string,
  dealId: string,
  contactId: string | null,
  oldStageId: string,
  newStageId: string
): Promise<void> {
  await triggerWorkflows(accountId, 'deal_stage_changed', {
    dealId,
    contactId,
    oldStageId,
    newStageId,
  });
}

export async function triggerDealWon(accountId: string, dealId: string, contactId?: string): Promise<void> {
  await triggerWorkflows(accountId, 'deal_won', { dealId, contactId });
}

export async function triggerDealLost(accountId: string, dealId: string, contactId?: string): Promise<void> {
  await triggerWorkflows(accountId, 'deal_lost', { dealId, contactId });
}

export async function triggerBookingCreated(
  accountId: string,
  contactId: string,
  activityId: string,
  slotUtc: string,
  slotDisplay: string,
): Promise<void> {
  await triggerWorkflows(accountId, 'booking_created', { contactId, activityId, slotUtc, slotDisplay });
}

export async function triggerInboundMessage(
  accountId: string,
  contactId: string,
  intent: string,
  channel: 'sms' | 'email',
  messageId: string,
): Promise<void> {
  await triggerWorkflows(accountId, 'inbound_message', { contactId, intent, channel, messageId });
}
