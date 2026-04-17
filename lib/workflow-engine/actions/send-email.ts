import { WorkflowContext, ExecutionResult } from '../types';
import { replaceVariables } from '../conditions';
import { resendClient } from '@/lib/resend/client';
import { supabaseAdmin } from '@/lib/supabase';

export async function sendEmailAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { subject, body, fromName } = config;

    if (!subject || !body) {
      return { success: false, error: 'Email subject and body are required' };
    }

    const contactEmail = context.variables.contact?.email;
    if (!contactEmail) {
      return { success: false, error: 'No contact email available' };
    }

    if (!resendClient) {
      return { success: false, error: 'Resend not configured' };
    }

    const processedSubject = replaceVariables(subject, context);
    const processedBody = replaceVariables(body, context);

    // Get account from_email / from_name
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', context.accountId)
      .single();

    const fromEmail = account?.settings?.from_email
      || account?.settings?.email_config?.from_email
      || 'noreply@contact.ourlimitedoffer.com';
    const senderName = fromName || account?.settings?.email_config?.from_name
      || account?.settings?.from_name
      || 'Charlie';

    const { data, error } = await resendClient.emails.send({
      from: `${senderName} <${fromEmail}>`,
      to: [contactEmail],
      subject: processedSubject,
      html: processedBody.replace(/\n/g, '<br>'),
      text: processedBody,
    });

    if (error) {
      console.error('[workflow/send-email] Resend error:', error);
      return { success: false, error: (error as any).message || 'Failed to send email' };
    }

    // Log to messages table
    void supabaseAdmin.from('messages').insert({
      account_id: context.accountId,
      contact_id: context.contactId || null,
      direction: 'outbound',
      type: 'email',
      content: processedBody,
      from_address: fromEmail,
      to_address: contactEmail,
      status: 'sent',
      external_id: data?.id,
      metadata: { subject: processedSubject },
    });

    return {
      success: true,
      data: { emailId: data?.id, to: contactEmail, subject: processedSubject },
    };
  } catch (error) {
    console.error('[workflow/send-email] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    };
  }
}
