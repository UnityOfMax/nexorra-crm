import { supabaseAdmin } from '@/lib/supabase';
import { WorkflowContext, ExecutionResult } from './types';
import { getActionHandler } from './actions';
import { evaluateConditions } from './conditions';
import { scheduleDelayedExecution } from './scheduler';

export async function executeWorkflow(
  workflowId: string,
  accountId: string,
  triggerType: string,
  triggerData: Record<string, any>
): Promise<string> {
  try {
    // Get workflow
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found or inactive');
    }

    // Validate trigger type matches
    if (workflow.trigger_type !== triggerType && workflow.trigger_type !== 'manual') {
      console.log(`Workflow ${workflowId} trigger mismatch: ${workflow.trigger_type} !== ${triggerType}`);
      return '';
    }

    // Create execution record
    const { data: execution, error: execError } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        account_id: accountId,
        trigger_type: triggerType,
        trigger_data: triggerData,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execError || !execution) {
      throw new Error('Failed to create execution record');
    }

    // Build context
    const context: WorkflowContext = {
      accountId,
      contactId: triggerData.contactId,
      dealId: triggerData.dealId,
      userId: triggerData.userId,
      triggerType,
      triggerData,
      variables: await loadContextVariables(triggerData),
    };

    // Start execution
    try {
      await executeWorkflowNodes(
        execution.id,
        workflow.id,
        workflow.workflow_definition,
        context
      );

      // Mark as completed
      await supabaseAdmin
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      // Update workflow stats (best-effort — RPC may not exist yet)
      void (async () => {
        try {
          await supabaseAdmin.rpc('increment_workflow_execution', { workflow_id: workflowId, success: true });
        } catch (err: any) {
          console.warn('[workflow] increment_workflow_execution:', err?.message);
        }
      })();

      console.log(`Workflow ${workflowId} execution ${execution.id} completed successfully`);
      return execution.id;
    } catch (error) {
      // Mark as failed
      await supabaseAdmin
        .from('workflow_executions')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      // Update workflow stats (best-effort — RPC may not exist yet)
      void (async () => {
        try {
          await supabaseAdmin.rpc('increment_workflow_execution', { workflow_id: workflowId, success: false });
        } catch (err: any) {
          console.warn('[workflow] increment_workflow_execution:', err?.message);
        }
      })();

      throw error;
    }
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}

async function executeWorkflowNodes(
  executionId: string,
  workflowId: string,
  workflowDefinition: any,
  context: WorkflowContext,
  startNodeId?: string
): Promise<void> {
  const { nodes, edges } = workflowDefinition;

  if (!nodes || !edges) {
    throw new Error('Invalid workflow definition');
  }

  // Find starting node (trigger or specified start node)
  let currentNode = startNodeId
    ? nodes.find((n: any) => n.id === startNodeId)
    : nodes.find((n: any) => n.type === 'trigger');

  if (!currentNode) {
    throw new Error('No starting node found');
  }

  // Execute nodes sequentially following edges
  while (currentNode) {
    const { id: nodeId, type: nodeType, data } = currentNode;
    const { stepType, config } = data;

    console.log(`Executing node ${nodeId} (${stepType})`);

    // Create step execution record
    const { data: stepExecution } = await supabaseAdmin
      .from('workflow_step_executions')
      .insert({
        workflow_execution_id: executionId,
        step_id: nodeId,
        step_type: stepType,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      let result: ExecutionResult = { success: true };

      // Execute based on node type
      if (nodeType === 'action') {
        const handler = getActionHandler(stepType);
        if (!handler) {
          throw new Error(`No handler found for action: ${stepType}`);
        }
        result = await handler(context, config || {});
      } else if (nodeType === 'condition') {
        const conditionResult = await evaluateConditions(context, config || {});
        result = {
          success: true,
          data: { conditionResult },
        };

        // Find next node based on condition result
        const nextEdge = edges.find(
          (e: any) =>
            e.source === nodeId &&
            (conditionResult ? e.sourceHandle === 'true' : e.sourceHandle === 'false')
        );

        if (nextEdge) {
          currentNode = nodes.find((n: any) => n.id === nextEdge.target);

          // Mark step as completed
          await supabaseAdmin
            .from('workflow_step_executions')
            .update({
              status: 'completed',
              output: result.data,
              completed_at: new Date().toISOString(),
            })
            .eq('id', stepExecution?.id);

          continue; // Skip to next iteration
        } else {
          // No matching path, end workflow
          currentNode = null;
          break;
        }
      } else if (nodeType === 'delay') {
        // Schedule delayed execution
        await scheduleDelayedExecution(
          executionId,
          workflowId,
          context.accountId,
          nodeId,
          config || {},
          context
        );

        // Mark step as completed and pause execution
        await supabaseAdmin
          .from('workflow_step_executions')
          .update({
            status: 'completed',
            output: { scheduled: true },
            completed_at: new Date().toISOString(),
          })
          .eq('id', stepExecution?.id);

        // Mark execution as paused
        await supabaseAdmin
          .from('workflow_executions')
          .update({ status: 'paused' })
          .eq('id', executionId);

        console.log(`Workflow paused at delay node ${nodeId}`);
        return; // Exit execution, will resume later
      } else if (nodeType === 'trigger') {
        // Trigger nodes just pass through
        result = { success: true };
      }

      // Check if action failed
      if (!result.success) {
        await supabaseAdmin
          .from('workflow_step_executions')
          .update({
            status: 'failed',
            error: result.error,
            completed_at: new Date().toISOString(),
          })
          .eq('id', stepExecution?.id);

        throw new Error(result.error || 'Step execution failed');
      }

      // Mark step as completed
      await supabaseAdmin
        .from('workflow_step_executions')
        .update({
          status: 'completed',
          output: result.data,
          completed_at: new Date().toISOString(),
        })
        .eq('id', stepExecution?.id);

      // Find next node
      const nextEdge = edges.find((e: any) => e.source === nodeId);
      if (nextEdge) {
        currentNode = nodes.find((n: any) => n.id === nextEdge.target);
      } else {
        // No more nodes, workflow complete
        currentNode = null;
      }
    } catch (error) {
      // Mark step as failed
      await supabaseAdmin
        .from('workflow_step_executions')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', stepExecution?.id);

      throw error;
    }
  }
}

export async function resumeWorkflowExecution(
  executionId: string,
  workflowId: string,
  resumeNodeId: string,
  context: WorkflowContext
): Promise<void> {
  try {
    console.log(`Resuming workflow ${workflowId} execution ${executionId} from node ${resumeNodeId}`);

    // Get workflow
    const { data: workflow } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Update execution status
    await supabaseAdmin
      .from('workflow_executions')
      .update({ status: 'running' })
      .eq('id', executionId);

    // Find next node after the delay node
    const { nodes, edges } = workflow.workflow_definition;
    const nextEdge = edges.find((e: any) => e.source === resumeNodeId);

    if (!nextEdge) {
      // No next node, complete execution
      await supabaseAdmin
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);
      return;
    }

    const nextNode = nodes.find((n: any) => n.id === nextEdge.target);
    if (!nextNode) {
      throw new Error('Next node not found');
    }

    // Continue execution from next node
    await executeWorkflowNodes(
      executionId,
      workflowId,
      workflow.workflow_definition,
      context,
      nextNode.id
    );
  } catch (error) {
    console.error('Error resuming workflow execution:', error);
    await supabaseAdmin
      .from('workflow_executions')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);

    throw error;
  }
}

async function loadContextVariables(triggerData: Record<string, any>): Promise<Record<string, any>> {
  const variables: Record<string, any> = { ...triggerData };

  // Load contact if available
  if (triggerData.contactId) {
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', triggerData.contactId)
      .single();

    if (contact) {
      variables.contact = contact;
    }
  }

  // Load deal if available
  if (triggerData.dealId) {
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('*')
      .eq('id', triggerData.dealId)
      .single();

    if (deal) {
      variables.deal = deal;
    }
  }

  return variables;
}
