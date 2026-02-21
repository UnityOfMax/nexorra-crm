// DB-first template loaders for built-in automations.
// Returns per-account custom templates if saved, otherwise falls back to hardcoded defaults.

import { supabaseAdmin } from '@/lib/supabase';
import {
  NEW_LEAD_TEMPLATES,
  BOOKING_TEMPLATES,
  BOOKING_SWITCH_SMS,
  NURTURING_TEMPLATES,
  MessageTemplate,
  BookingTemplate,
  NurturingTemplate,
} from './templates';

async function loadConfig(accountId: string, automationId: string): Promise<any[] | null> {
  const { data } = await supabaseAdmin
    .from('automation_configs')
    .select('templates')
    .eq('account_id', accountId)
    .eq('automation_id', automationId)
    .maybeSingle();

  if (data?.templates && Array.isArray(data.templates) && data.templates.length > 0) {
    return data.templates;
  }
  return null;
}

export async function getNewLeadTemplates(accountId: string): Promise<MessageTemplate[]> {
  const custom = await loadConfig(accountId, 'new_lead');
  return (custom as MessageTemplate[]) ?? NEW_LEAD_TEMPLATES;
}

export async function getBookingTemplates(accountId: string): Promise<BookingTemplate[]> {
  const custom = await loadConfig(accountId, 'booking_reminders');
  return (custom as BookingTemplate[]) ?? BOOKING_TEMPLATES;
}

export async function getBookingSwitchSms(accountId: string): Promise<string> {
  const custom = await loadConfig(accountId, 'booking_switch');
  if (custom && custom[0]?.body) return custom[0].body as string;
  return BOOKING_SWITCH_SMS;
}

export async function getNurturingTemplates(accountId: string): Promise<NurturingTemplate[]> {
  const custom = await loadConfig(accountId, 'nurturing');
  return (custom as NurturingTemplate[]) ?? NURTURING_TEMPLATES;
}
