#!/usr/bin/env npx tsx
/**
 * Petra Phase 3a — Email Outreach
 * Uploads qualified local biz leads (with demos + emails) to Instantly.
 * Hard cap: 428/day = 3,000/week.
 *
 * Usage: npx tsx scripts/local-biz/email-outreach.ts [--dry-run]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { InstantlyClient } from '../../lib/instantly/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DAILY_EMAIL_CAP = 428; // 3,000/week ÷ 7 days
const INSTANTLY_CAMPAIGN = process.env.INSTANTLY_LOCAL_BIZ_CAMPAIGN || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!INSTANTLY_CAMPAIGN) {
    console.error('[email-outreach] INSTANTLY_LOCAL_BIZ_CAMPAIGN env var not set.');
    console.error('[email-outreach] Create the campaign in Instantly UI first, then set the UUID.');
    process.exit(1);
  }

  // Count today's sends
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { count: todayCount } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id', { count: 'exact', head: true })
    .eq('email_sent', true)
    .gte('email_sent_at', `${today}T00:00:00Z`);

  const remaining = DAILY_EMAIL_CAP - (todayCount || 0);
  if (remaining <= 0) {
    console.log(`[email-outreach] Daily cap reached (${DAILY_EMAIL_CAP}). Nothing to send.`);
    return;
  }

  console.log(`[email-outreach] ${todayCount || 0} sent today. ${remaining} remaining (cap ${DAILY_EMAIL_CAP}).`);

  // Fetch pending leads
  const { data: leads, error } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id, business_name, business_type, city, state_province, email, demo_page_id, phone')
    .eq('email_sent', false)
    .eq('outreach_channel', 'email')
    .not('demo_page_id', 'is', null)
    .not('email', 'is', null)
    .order('scraped_at', { ascending: true })
    .limit(remaining);

  if (error) {
    console.error('[email-outreach] DB fetch error:', error.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('[email-outreach] No pending leads with email + demo ready.');
    return;
  }

  console.log(`[email-outreach] Uploading ${leads.length} leads to Instantly...`);

  const instantly = new InstantlyClient();
  let uploaded = 0;
  let failed = 0;

  // Batch upload to Instantly (max 100 per call)
  const BATCH_SIZE = 100;
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);

    const instantlyLeads = batch.map(lead => {
      const demoLink = `${APP_URL}/website-demo/${lead.demo_page_id}`;
      // Extract first name from email or use business name
      const firstName = extractFirstName(lead.email || lead.business_name);

      return {
        email: lead.email!,
        first_name: firstName,
        last_name: '',
        custom_variables: {
          business_name: lead.business_name,
          business_type: lead.business_type,
          city: lead.city || '',
          demo_link: demoLink,
        },
      };
    });

    if (isDryRun) {
      console.log(`[email-outreach] [DRY RUN] Would upload ${instantlyLeads.length} leads`);
      instantlyLeads.forEach(l => console.log(`  ${l.email} → ${l.custom_variables.demo_link}`));
      uploaded += instantlyLeads.length;
      continue;
    }

    try {
      await instantly.addLeads(INSTANTLY_CAMPAIGN, instantlyLeads);

      // Mark as sent
      const ids = batch.map(l => l.id);
      await supabaseAdmin
        .from('local_biz_leads')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .in('id', ids);

      uploaded += batch.length;
      console.log(`[email-outreach] Batch ${Math.floor(i / BATCH_SIZE) + 1}: uploaded ${batch.length}`);
    } catch (err) {
      console.error(`[email-outreach] Batch upload failed: ${(err as Error).message}`);
      failed += batch.length;
    }

    await new Promise(r => setTimeout(r, 5000)); // rate limit
  }

  console.log(`\n[email-outreach] Phase 3a Complete: ${uploaded} uploaded, ${failed} failed`);
}

function extractFirstName(emailOrName: string): string {
  // From email: john.smith@... → John
  const emailMatch = emailOrName.match(/^([a-zA-Z]+)[._+-]/);
  if (emailMatch) return capitalize(emailMatch[1]);
  // From business name: take first word
  const firstWord = emailOrName.split(/\s+/)[0];
  return capitalize(firstWord);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

main().catch(err => {
  console.error('[email-outreach] FATAL:', err.message);
  process.exit(1);
});
