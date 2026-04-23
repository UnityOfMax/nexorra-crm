import { WorkflowContext, ExecutionResult } from '../types';
import { replaceVariables } from '../conditions';
import { twilioClient } from '@/lib/twilio/client';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePhone } from '@/lib/utils/phone';

export async function sendSMSAction(
  context: WorkflowContext,
  config: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const { message } = config;

    if (!message) {
      return { success: false, error: 'SMS message is required' };
    }

    const contactPhone = context.variables.contact?.phone;
    if (!contactPhone) {
      return { success: false, error: 'No contact phone available' };
    }

    if (!twilioClient) {
      return { success: false, error: 'Twilio not configured' };
    }

    const processedMessage = replaceVariables(message, context);

    // Get account's Twilio phone number
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('settings')
      .eq('id', context.accountId)
      .single();

    const fromPhone = account?.settings?.twilio_phone_number;
    if (!fromPhone) {
      return { success: false, error: 'No Twilio phone number configured for this account' };
    }

    const normalizedTo = normalizePhone(contactPhone);

    const twilioMessage = await twilioClient.messages.create({
      body: processedMessage,
      from: fromPhone,
      to: normalizedTo,
    });

    // Log to messages table — must await so Vercel doesn't kill the promise before insert
    await supabaseAdmin.from('messages').insert({
      account_id: context.accountId,
      contact_id: context.contactId || null,
      direction: 'outbound',
      type: 'sms',
      content: processedMessage,
      from_address: fromPhone,
      to_address: normalizedTo,
      status: twilioMessage.status,
      external_id: twilioMessage.sid,
    });

    return {
      success: true,
      data: { smsId: twilioMessage.sid, to: normalizedTo, message: processedMessage },
    };
  } catch (error) {
    console.error('[workflow/send-sms] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending SMS',
    };
  }
}
