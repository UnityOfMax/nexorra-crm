import { WorkflowContext, ExecutionResult } from '../types';

export async function aiRespondAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { channel } = config;

    if (!channel) {
      return {
        success: false,
        error: 'Channel (sms or email) is required for AI respond action',
      };
    }

    if (!context.contactId) {
      return {
        success: false,
        error: 'No contact associated with this workflow execution',
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/ai/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: context.accountId,
        contactId: context.contactId,
        channel,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to send AI response',
      };
    }

    const result = await response.json();

    return {
      success: true,
      data: {
        message: result.message,
        subject: result.subject,
        channel: result.channel,
      },
    };
  } catch (error) {
    console.error('Error in aiRespondAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in AI respond',
    };
  }
}
