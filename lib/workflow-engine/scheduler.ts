import { supabaseAdmin } from '@/lib/supabase';
import { WorkflowContext } from './types';

interface DelayConfig {
  // Format A: { delayType: 'duration', days?, hours?, minutes? }    (from DelayConfig panel)
  // Format B: { unit: 'days'|'hours'|'minutes', value: number }     (from to-workflow-definition)
  // Format C: { delayType: 'until', specificDate, specificTime }     (from DelayConfig panel)
  // Format D: { delayType: 'before_event', days?, hours?, minutes? } (before trigger event)
  delayType?: 'duration' | 'until' | 'before_event';
  days?: number;
  hours?: number;
  minutes?: number;
  specificDate?: string;
  specificTime?: string;
  // Format B fields
  unit?: 'days' | 'hours' | 'minutes';
  value?: number;
}

export async function scheduleDelayedExecution(
  workflowExecutionId: string,
  workflowId: string,
  accountId: string,
  nodeId: string,
  delayConfig: DelayConfig,
  context: WorkflowContext
): Promise<void> {
  let scheduledAt: Date;

  if (delayConfig.delayType === 'before_event') {
    // Format D: before trigger event — compute event_time minus offset
    const eventTime =
      (context as any).triggerData?.eventTime ||
      (context as any).triggerData?.bookingTime ||
      (context as any).triggerData?.dueDate;

    if (eventTime) {
      const offsetMs =
        ((delayConfig.days || 0) * 24 * 60 +
         (delayConfig.hours || 0) * 60 +
         (delayConfig.minutes || 0)) * 60 * 1000;
      const eventDate = new Date(eventTime);
      scheduledAt = new Date(eventDate.getTime() - offsetMs);
      // If already past, execute immediately
      if (scheduledAt.getTime() < Date.now()) {
        scheduledAt = new Date();
      }
    } else {
      // No event time available — execute immediately
      scheduledAt = new Date();
    }
  } else if (delayConfig.unit !== undefined && delayConfig.value !== undefined) {
    // Format B: unit/value (from to-workflow-definition.ts)
    const ms =
      delayConfig.unit === 'days'  ? delayConfig.value * 24 * 60 * 60 * 1000 :
      delayConfig.unit === 'hours' ? delayConfig.value * 60 * 60 * 1000 :
                                     delayConfig.value * 60 * 1000;
    scheduledAt = new Date(Date.now() + ms);
  } else if (delayConfig.delayType === 'until') {
    // Format C: specific date/time
    const dateTimeString = `${delayConfig.specificDate}T${delayConfig.specificTime}`;
    scheduledAt = new Date(dateTimeString);
  } else {
    // Format A: duration (default)
    const totalMinutes =
      (delayConfig.days || 0) * 24 * 60 +
      (delayConfig.hours || 0) * 60 +
      (delayConfig.minutes || 0);
    scheduledAt = new Date(Date.now() + totalMinutes * 60 * 1000);
  }

  // Insert delayed job into database
  const { error } = await supabaseAdmin.from('workflow_delayed_jobs').insert({
    workflow_execution_id: workflowExecutionId,
    workflow_id: workflowId,
    account_id: accountId,
    node_id: nodeId,
    scheduled_at: scheduledAt.toISOString(),
    context: context,
    status: 'pending',
  });

  if (error) {
    console.error('Error scheduling delayed job:', error);
    throw new Error('Failed to schedule delayed action');
  }

  console.log(`Scheduled delayed job for ${scheduledAt.toISOString()}`);
}

export async function processDelayedJobs(): Promise<number> {
  try {
    // Get all pending jobs that are due
    const { data: jobs, error } = await supabaseAdmin
      .from('workflow_delayed_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (error || !jobs) {
      console.error('Error fetching delayed jobs:', error);
      return 0;
    }

    console.log(`Processing ${jobs.length} delayed jobs`);

    // Process each job
    for (const job of jobs) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('workflow_delayed_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        // Resume workflow execution from this node
        const { resumeWorkflowExecution } = await import('./executor');
        await resumeWorkflowExecution(
          job.workflow_execution_id,
          job.workflow_id,
          job.node_id,
          job.context
        );

        // Mark as completed
        await supabaseAdmin
          .from('workflow_delayed_jobs')
          .update({ status: 'completed', processed_at: new Date().toISOString() })
          .eq('id', job.id);
      } catch (error) {
        console.error(`Error processing delayed job ${job.id}:`, error);

        // Mark as failed
        await supabaseAdmin
          .from('workflow_delayed_jobs')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            processed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
      }
    }

    return jobs.length;
  } catch (error) {
    console.error('Error in processDelayedJobs:', error);
    return 0;
  }
}
