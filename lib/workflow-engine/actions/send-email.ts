import { WorkflowContext, ExecutionResult } from '../types';
import { replaceVariables } from '../conditions';
import { fetchWithRetry } from '@/lib/utils/retry';

export async function sendEmailAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { subject, body, fromName } = config;

    if (!subject || !body) {
      return {
        success: false,
        error: 'Email subject and body are required',
      };
    }

    // Get contact email from context
    const contactEmail = context.variables.contact?.email;
    if (!contactEmail) {
      return {
        success: false,
        error: 'No contact email available',
      };
    }

    // Replace variables in subject and body
    const processedSubject = replaceVariables(subject, context);
    const processedBody = replaceVariables(body, context);

    // Call the email API (with retry + 15s timeout)
    const response = await fetchWithRetry(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: context.accountId,
          to: contactEmail,
          subject: processedSubject,
          htmlContent: processedBody,
          fromName: fromName || undefined,
          contactId: context.contactId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to send email',
      };
    }

    const result = await response.json();

    return {
      success: true,
      data: {
        emailId: result.id,
        to: contactEmail,
        subject: processedSubject,
      },
    };
  } catch (error) {
    console.error('Error in sendEmailAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    };
  }
}
