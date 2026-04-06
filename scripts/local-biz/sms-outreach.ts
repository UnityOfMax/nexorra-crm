#!/usr/bin/env npx tsx
/**
 * Petra Phase 3b — SMS Outreach
 * Sends SMS via OpenPhone (computer use) to local biz leads with no email.
 * Runs 10AM–1PM BST only — separate from calling hours (2PM–2AM BST).
 * Target: ~200 SMS/day.
 *
 * Usage: npx tsx scripts/local-biz/sms-outreach.ts [--limit 200] [--dry-run]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '../calling/dialer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';
const SMS_WINDOW_START_BST = 10; // 10 AM BST
const SMS_WINDOW_END_BST = 13;   // 1 PM BST
const DELAY_BETWEEN_SMS_MS = 30_000; // 30s between messages

function isInSMSWindow(): boolean {
  // Convert current time to BST (UTC+1 in summer, UTC+0 in winter)
  const now = new Date();
  const bstOffset = isDaylightSavingTime(now) ? 1 : 0;
  const bstHour = (now.getUTCHours() + bstOffset) % 24;
  return bstHour >= SMS_WINDOW_START_BST && bstHour < SMS_WINDOW_END_BST;
}

function isDaylightSavingTime(date: Date): boolean {
  // UK DST: last Sunday in March to last Sunday in October
  const month = date.getUTCMonth() + 1;
  return month >= 4 && month <= 10;
}

function buildSMSMessage(lead: {
  business_name: string;
  city: string | null;
  demo_page_id: string;
  outreach_body_sms?: string | null;
}): string {
  // Use pre-generated personalised body if available
  if (lead.outreach_body_sms) return lead.outreach_body_sms;

  // Fallback
  const demoLink = `${APP_URL}/website-demo/${lead.demo_page_id}`;
  return `Hey — I noticed ${lead.business_name} doesn't have a strong site online, so I built one for you: ${demoLink}\n\nIf you like it, happy to get on a quick call and set it all up — Max Fawcett`;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 200;
  const isDryRun = args.includes('--dry-run');

  if (!isDryRun && !isInSMSWindow()) {
    const now = new Date();
    console.log(`[sms-outreach] Outside SMS window (10AM–1PM BST). Current UTC: ${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2, '0')}`);
    console.log('[sms-outreach] Exiting to avoid overlap with calling hours.');
    return;
  }

  // Count today's SMS sends
  const today = new Date().toISOString().slice(0, 10);
  const { count: todayCount } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id', { count: 'exact', head: true })
    .eq('sms_sent', true)
    .gte('sms_sent_at', `${today}T00:00:00Z`);

  const remaining = Math.min(LIMIT - (todayCount || 0), LIMIT);
  if (remaining <= 0) {
    console.log(`[sms-outreach] Daily SMS limit reached. Nothing to send.`);
    return;
  }

  // Fetch leads with phone but no email, demo built, not yet SMS'd
  const { data: leads, error } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id, business_name, business_type, city, phone, demo_page_id, outreach_body_sms')
    .eq('sms_sent', false)
    .eq('outreach_channel', 'sms')
    .not('demo_page_id', 'is', null)
    .not('phone', 'is', null)
    .order('scraped_at', { ascending: true })
    .limit(remaining);

  if (error) {
    console.error('[sms-outreach] DB fetch error:', error.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('[sms-outreach] No pending SMS leads with demos ready.');
    return;
  }

  console.log(`[sms-outreach] Sending ${leads.length} SMS messages...`);

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    // Re-check we're still in window
    if (!isDryRun && !isInSMSWindow()) {
      console.log('[sms-outreach] Left SMS window — stopping to avoid calling hours overlap.');
      break;
    }

    const message = buildSMSMessage({
      business_name: lead.business_name,
      city: lead.city,
      demo_page_id: lead.demo_page_id,
      outreach_body_sms: lead.outreach_body_sms,
    });

    if (isDryRun) {
      console.log(`[sms-outreach] [DRY RUN] To: ${lead.phone}`);
      console.log(`  ${message.slice(0, 100)}...`);
      sent++;
      continue;
    }

    const result = await sendSMS(lead.phone!, message);

    if (result.status === 'sent') {
      await supabaseAdmin
        .from('local_biz_leads')
        .update({
          sms_sent: true,
          sms_sent_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      sent++;
      console.log(`[sms-outreach] ✓ ${lead.business_name} (${lead.phone})`);
    } else {
      failed++;
      console.log(`[sms-outreach] ✗ ${lead.business_name}: ${result.reason}`);
    }

    // Wait between messages — OpenPhone needs time + human-like pacing
    await new Promise(r => setTimeout(r, DELAY_BETWEEN_SMS_MS));
  }

  console.log(`\n[sms-outreach] Phase 3b Complete: ${sent} sent, ${failed} failed`);
}

main().catch(err => {
  console.error('[sms-outreach] FATAL:', err.message);
  process.exit(1);
});
