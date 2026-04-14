#!/usr/bin/env npx tsx
/**
 * Petra Phase 3a — Gmail Direct-Send Outreach
 * Replaces Instantly upload with direct Gmail API sends.
 * Round-robin across 5 accounts with ramp schedule.
 *
 * Usage: npx tsx scripts/local-biz/gmail-outreach.ts [--dry-run] [--reset-day]
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { sendGmail, loadTokens } from '../../lib/gmail/client';
import { getDailyLimitPerAccount, getTotalDailyLimit, pickAccount } from '../../lib/gmail/rotation';
import type { GmailAccount } from '../../lib/gmail/client';

const RAMP_FILE = resolve(__dirname, '../../.gmail-ramp.json');
const ACCOUNTS_FILE = resolve(__dirname, '../../.gmail-accounts.json');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── Ramp config ──────────────────────────────────────────────────────────────

interface RampConfig {
  startDate: string;  // YYYY-MM-DD
  dayNumber: number;
}

function loadRampConfig(): RampConfig {
  if (process.argv.includes('--reset-day')) {
    const cfg: RampConfig = { startDate: todayStr(), dayNumber: 1 };
    fs.writeFileSync(RAMP_FILE, JSON.stringify(cfg, null, 2));
    console.log('[gmail-outreach] Ramp reset to day 1.');
    return cfg;
  }

  if (!fs.existsSync(RAMP_FILE)) {
    const cfg: RampConfig = { startDate: todayStr(), dayNumber: 1 };
    fs.writeFileSync(RAMP_FILE, JSON.stringify(cfg, null, 2));
    console.log('[gmail-outreach] No ramp file found. Created at day 1.');
    return cfg;
  }

  const raw = JSON.parse(fs.readFileSync(RAMP_FILE, 'utf-8')) as RampConfig;
  // Auto-calculate dayNumber from elapsed days since startDate
  const start = new Date(raw.startDate);
  const now = new Date(todayStr());
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const dayNumber = Math.max(1, elapsed + 1);

  if (dayNumber !== raw.dayNumber) {
    raw.dayNumber = dayNumber;
    fs.writeFileSync(RAMP_FILE, JSON.stringify(raw, null, 2));
  }

  return raw;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Account loading ──────────────────────────────────────────────────────────

function loadAccounts(): GmailAccount[] {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[gmail-outreach] GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET missing in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error(`[gmail-outreach] ${ACCOUNTS_FILE} not found. Run gmail-setup.ts first.`);
    process.exit(1);
  }

  const raw: Array<{ index: number; email: string }> = JSON.parse(
    fs.readFileSync(ACCOUNTS_FILE, 'utf-8'),
  );

  return raw.map(a => ({
    index: a.index,
    email: a.email,
    clientId: clientId!,
    clientSecret: clientSecret!,
  }));
}

// ── Subject line variants ────────────────────────────────────────────────────

const SUBJECTS = [
  (firstName: string, _bizName: string) => `I made you a free website, ${firstName}`,
  (_firstName: string, bizName: string) => `Quick website for ${bizName}`,
  (_firstName: string, bizName: string) => `Free site for ${bizName} — no strings`,
  (_firstName: string, bizName: string) => `Built something for ${bizName}`,
];

function buildSubject(leadIndex: number, firstName: string, bizName: string): string {
  const fn = SUBJECTS[leadIndex % SUBJECTS.length];
  return fn(firstName, bizName);
}

// ── Name extraction ──────────────────────────────────────────────────────────

function extractFirstName(email: string, businessName: string): string {
  const emailMatch = email.match(/^([a-zA-Z]+)[._+\-]/);
  if (emailMatch) return capitalize(emailMatch[1]);
  const firstWord = businessName.split(/\s+/)[0];
  return capitalize(firstWord);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── Random delay ─────────────────────────────────────────────────────────────

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  console.log(`[gmail-outreach] Waiting ${Math.round(ms / 1000)}s before next send...`);
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) console.log('[gmail-outreach] DRY RUN — no emails will be sent.');

  const ramp = loadRampConfig();
  const allAccounts = loadAccounts();

  // Filter to accounts that have tokens configured
  const configuredAccounts: GmailAccount[] = [];
  for (const acct of allAccounts) {
    const tokens = await loadTokens(acct.index);
    if (tokens) {
      configuredAccounts.push(acct);
    } else {
      console.log(`[gmail-outreach] Account ${acct.index} (${acct.email}) — no tokens, skipping.`);
    }
  }

  if (configuredAccounts.length === 0) {
    console.error('[gmail-outreach] No configured Gmail accounts. Run gmail-setup.ts first.');
    process.exit(1);
  }

  const perAccountCap = getDailyLimitPerAccount(ramp.dayNumber);
  const totalCap = getTotalDailyLimit(ramp.dayNumber, configuredAccounts.length);

  console.log(`[gmail-outreach] Day ${ramp.dayNumber} (start: ${ramp.startDate})`);
  console.log(`[gmail-outreach] ${configuredAccounts.length} accounts × ${perAccountCap}/account = ${totalCap} cap today`);

  // Count today's sends across all accounts
  const today = todayStr();
  const { count: todayCount } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id', { count: 'exact', head: true })
    .eq('email_sent', true)
    .not('gmail_account', 'is', null)
    .gte('email_sent_at', `${today}T00:00:00Z`);

  const sentToday = todayCount ?? 0;
  const remaining = totalCap - sentToday;

  if (remaining <= 0) {
    console.log(`[gmail-outreach] Daily cap reached (${sentToday}/${totalCap}). Nothing to send.`);
    return;
  }

  console.log(`[gmail-outreach] ${sentToday} sent today. ${remaining} remaining.`);

  // Fetch pending leads
  const { data: leads, error } = await supabaseAdmin
    .from('local_biz_leads')
    .select('id, business_name, business_type, city, state_province, email, demo_page_id, outreach_body_email')
    .eq('email_sent', false)
    .eq('outreach_channel', 'email')
    .not('demo_page_id', 'is', null)
    .not('email', 'is', null)
    .order('scraped_at', { ascending: true })
    .limit(remaining);

  if (error) {
    console.error('[gmail-outreach] DB fetch error:', error.message);
    process.exit(1);
  }

  if (!leads || leads.length === 0) {
    console.log('[gmail-outreach] No pending leads with email + demo ready.');
    return;
  }

  console.log(`[gmail-outreach] Sending to ${leads.length} leads...`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    // Pick next account via rotation
    const account = await pickAccount(supabaseAdmin, configuredAccounts, ramp.dayNumber);
    if (!account) {
      console.log('[gmail-outreach] All accounts at daily cap. Stopping.');
      break;
    }

    const firstName = extractFirstName(lead.email!, lead.business_name);
    const subject = buildSubject(i, firstName, lead.business_name);

    const fallbackBody = `I noticed ${lead.business_name} could have a stronger online presence — it's likely costing a few enquiries a week.\n\nI went ahead and built you a site already — it's done and free.\n\n${APP_URL}/website-demo/${lead.demo_page_id}\n\nNo strings. If you like it, happy to get on a quick call and set it all up.`;
    const outreachBody = lead.outreach_body_email || fallbackBody;

    // Prepend greeting
    const body = `Hi ${firstName},\n\n${outreachBody}`;

    if (isDryRun) {
      console.log(`[gmail-outreach] [DRY RUN] ${account.email} → ${lead.email}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Business: ${lead.business_name} (${lead.city})`);
      sent++;
      continue;
    }

    try {
      const messageId = await sendGmail(account, {
        from: account.email,
        to: lead.email!,
        subject,
        body,
      });

      // Mark as sent in DB
      const { error: updateErr } = await supabaseAdmin
        .from('local_biz_leads')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          gmail_account: account.email,
          gmail_message_id: messageId,
        })
        .eq('id', lead.id);

      if (updateErr) {
        console.error(`[gmail-outreach] DB update failed for ${lead.id}: ${updateErr.message}`);
      }

      sent++;
      console.log(`[gmail-outreach] [${sent}] ${account.email} → ${lead.email} (${lead.business_name}) — ${messageId}`);

      // Random delay 45–90s between sends (critical for deliverability)
      if (i < leads.length - 1) {
        await randomDelay(45_000, 90_000);
      }
    } catch (err) {
      console.error(`[gmail-outreach] Failed to send to ${lead.email}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n[gmail-outreach] Done: ${sent} sent, ${failed} failed, ${skipped} skipped`);
  console.log(`[gmail-outreach] Total today: ${sentToday + sent}/${totalCap}`);
}

main().catch(err => {
  console.error('[gmail-outreach] FATAL:', err.message);
  process.exit(1);
});
