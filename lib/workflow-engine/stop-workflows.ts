import { supabaseAdmin } from '@/lib/supabase';

/**
 * Cancel all pending delayed jobs and paused executions for a contact.
 * Called on:
 *   - Inbound SMS reply (twilio-inbound)
 *   - Inbound email reply (resend-inbound)
 *   - Deal stage advancement (form-submit, book-call) — stops lower-stage workflows
 */
export async function stopContactWorkflows(
  accountId: string,
  contactId: string,
): Promise<void> {
  try {
    // Find all paused/running executions for this contact
    const { data: executions } = await supabaseAdmin
      .from('workflow_executions')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .in('status', ['paused', 'running']);

    if (!executions || executions.length === 0) return;

    const executionIds = executions.map(e => e.id);

    // Cancel all pending delayed jobs for these executions
    // 'failed' is used since the constraint doesn't include 'cancelled'
    await supabaseAdmin
      .from('workflow_delayed_jobs')
      .update({ status: 'failed', error_message: 'Stopped by contact reply or stage advancement' })
      .in('execution_id', executionIds)
      .eq('status', 'pending');

    // Mark executions as completed (stopped by reply/advancement)
    await supabaseAdmin
      .from('workflow_executions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .in('id', executionIds);

    console.log(`[stop-workflows] Stopped ${executionIds.length} workflow execution(s) for contact ${contactId}`);
  } catch (err) {
    console.error('[stop-workflows] Error stopping workflows:', err);
  }
}
