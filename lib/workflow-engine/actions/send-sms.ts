import { WorkflowContext, ExecutionResult } from '../types';
import { replaceVariables } from '../conditions';
import { fetchWithRetry } from '@/lib/utils/retry';

export async function sendSMSAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { message } = config;

    if (!message) {
      return {
        success: false,
        error: 'SMS message is required',
      };
    }

    // Get contact phone from context
    const contactPhone = context.variables.contact?.phone;
    if (!contactPhone) {
      return {
        success: false,
        error: 'No contact phone available',
      };
    }

    // Replace variables in message
    const processedMessage = replaceVariables(message, context);

    // Call the SMS API (with retry + 15s timeout)
    const response = await fetchWithRetry(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sms/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: context.accountId,
          to: contactPhone,
          message: processedMessage,
          contactId: context.contactId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to send SMS',
      };
    }

    const result = await response.json();

    return {
      success: true,
      data: {
        smsId: result.sid,
        to: contactPhone,
        message: processedMessage,
      },
    };
  } catch (error) {
    console.error('Error in sendSMSAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending SMS',
    };
  }
}
