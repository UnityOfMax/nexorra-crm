/**
 * One-time setup: creates Resend audience, event schemas, email templates,
 * and automations for the discovery call email sequence.
 *
 * Run once:  npx tsx scripts/setup-resend-discovery.ts
 *
 * Architecture:
 *  - Email 1 (immediate): booking.confirmed event → automation sends template
 *  - Email 2 (24h before call): scheduled via Resend scheduledAt at booking time
 *  - Email 3 (1h before call):  scheduled via Resend scheduledAt at booking time
 *
 * Saves IDs to: agents/state/resend-discovery-config.json
 */

import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY!);
const CONFIG_FILE = path.join(__dirname, '../agents/state/resend-discovery-config.json');

const PRECALL_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nexorra.io'}/call-booked`;
const BASE_IMG = 'https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-page-assets/email-results';

// ── Template HTML ─────────────────────────────────────────────────────────────
// Variables: {{{firstName}}}, {{{callDate}}}, etc (Resend Handlebars syntax)

const TEMPLATE_1_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi {{{firstName}}},</p>
<p>You're booked in for <strong>{{{callDate}}}</strong>.</p>
<p>Before the call, go through the page below. It covers exactly how we work and what to expect so our time together is actually useful.</p>
<p style="text-align:center;margin:28px 0">
  <a href="${PRECALL_URL}" style="background:#1d6bf3;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block">
    View the system →
  </a>
</p>
<p>Three quick steps on there:</p>
<p style="padding-left:16px">1. Watch the video<br>2. Accept the calendar invite (check spam if you haven't seen it)<br>3. Read through the FAQs and testimonials</p>
<p>See you then.</p>
<p style="margin-top:28px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;

const TEMPLATE_2_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi {{{firstName}}},</p>
<p>Just a reminder we're speaking <strong>{{{callDay}}}</strong>.</p>
<p>A few of our clients before we talk.</p>
<br>
<p>One of our clients, Mary, over the last 2.5 years we've helped her close 61 deals, around $270,000 per year.</p>
<img src="${BASE_IMG}/mary.png" alt="Mary's results" style="width:100%;max-width:560px;border-radius:8px;margin:4px 0 0" />
<br><br>
<p>Or David, who started working with us 3 months ago and has already made nearly $30k in GCI.</p>
<img src="${BASE_IMG}/david.png" alt="David's results" style="width:100%;max-width:560px;border-radius:8px;margin:4px 0 0" />
<br><br>
<p>And Susan who started around a year ago and has done an extra 2 deals per month every month since then.</p>
<img src="${BASE_IMG}/susan.png" alt="Susan's results" style="width:100%;max-width:560px;border-radius:8px;margin:4px 0 0" />
<br>
<p>See you soon,</p>
<p style="margin-top:4px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;

const TEMPLATE_3_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi {{{firstName}}},</p>
<p>We're speaking today. Looking forward to it.</p>
<p>If you haven't been through the pre-call page yet, worth doing before we speak:</p>
<p style="text-align:center;margin:24px 0">
  <a href="${PRECALL_URL}" style="background:#1d6bf3;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
    View the system →
  </a>
</p>
<p>Talk soon.</p>
<p style="margin-top:28px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;

// ── Setup ─────────────────────────────────────────────────────────────────────

async function setup() {
  // Load existing config if any (to avoid re-creating things)
  let existing: any = {};
  try { existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}

  console.log('Setting up Resend for discovery call sequence...\n');

  // 1. Audience — reuse if already created
  let audienceId = existing.audienceId;
  if (audienceId) {
    console.log(`Audience already set: ${audienceId}`);
  } else {
    const res = await resend.audiences.create({ name: 'Discovery Calls' });
    if (res.error) throw new Error(`Audience: ${res.error.message}`);
    audienceId = res.data!.id;
    console.log(`Audience created: ${audienceId}`);
  }

  // 2. Events
  const eventNames = ['booking.confirmed', 'call.reminder', 'call.same_day'] as const;
  const eventIds: Record<string, string> = existing.events || {};

  for (const name of eventNames) {
    if (eventIds[name]) {
      console.log(`Event ${name} already set: ${eventIds[name]}`);
      continue;
    }
    const res = await resend.events.create({ name, schema: { firstName: 'string', callDate: 'string', callDay: 'string' } as any });
    if (res.error) {
      console.log(`Event ${name} error (may already exist): ${res.error.message}`);
      eventIds[name] = name;
    } else {
      eventIds[name] = (res.data as any)?.id || name;
      console.log(`Event ${name} created: ${eventIds[name]}`);
    }
  }

  // 3. Templates
  const templateDefs = [
    {
      key: 'email1', name: 'Discovery Call — Email 1 (Confirmation)',
      html: TEMPLATE_1_HTML,
      variables: [
        { key: 'firstName', name: 'First Name', type: 'string', fallback: 'there' },
        { key: 'callDate',  name: 'Call Date',  type: 'string', fallback: 'your scheduled time' },
      ],
    },
    {
      key: 'email2', name: 'Discovery Call — Email 2 (Reminder)',
      html: TEMPLATE_2_HTML,
      variables: [
        { key: 'firstName', name: 'First Name', type: 'string', fallback: 'there' },
        { key: 'callDay',   name: 'Call Day',   type: 'string', fallback: 'soon' },
      ],
    },
    {
      key: 'email3', name: 'Discovery Call — Email 3 (Same Day)',
      html: TEMPLATE_3_HTML,
      variables: [
        { key: 'firstName', name: 'First Name', type: 'string', fallback: 'there' },
      ],
    },
  ];

  const templateIds: Record<string, string> = existing.templates || {};

  for (const def of templateDefs) {
    if (templateIds[def.key]) {
      console.log(`Template ${def.key} already set: ${templateIds[def.key]}`);
      continue;
    }
    console.log(`Creating template ${def.key}...`);
    const res = await (resend.templates.create({ name: def.name, html: def.html, variables: def.variables } as any).publish() as any);
    if (res.error) throw new Error(`Template ${def.key}: ${res.error.message}`);
    const id = res.data?.id || res.id;
    if (!id) throw new Error(`Template ${def.key} created but no ID returned: ${JSON.stringify(res)}`);
    templateIds[def.key] = id;
    console.log(`  Template ${def.key} created: ${id}`);
  }

  const FROM = 'Max at Nexorra <noreply@noreply.ainexorralinks.com>';

  // 4. Automations — one per event, each fires immediately when event is received
  //    Timing is controlled by WHEN the poll script fires each event:
  //      booking.confirmed → immediate (on booking detection)
  //      call.reminder     → fired by script at callTime - 24h
  //      call.same_day     → fired by script at callTime - 1h
  const automationDefs = [
    {
      key: 'email1',
      name: 'Discovery Call — Email 1 (Booking Confirmation)',
      eventName: 'booking.confirmed',
      templateKey: 'email1',
    },
    {
      key: 'email2',
      name: 'Discovery Call — Email 2 (Day Before Reminder)',
      eventName: 'call.reminder',
      templateKey: 'email2',
    },
    {
      key: 'email3',
      name: 'Discovery Call — Email 3 (Same Day)',
      eventName: 'call.same_day',
      templateKey: 'email3',
    },
  ];

  const automationIds: Record<string, string> = existing.automations || {};

  for (const def of automationDefs) {
    if (automationIds[def.key]) {
      console.log(`Automation ${def.key} already set: ${automationIds[def.key]}`);
      continue;
    }
    console.log(`Creating automation ${def.key}...`);
    const res = await resend.automations.create({
      name: def.name,
      status: 'enabled',
      steps: [
        { key: 'start', type: 'trigger',    config: { eventName: def.eventName } },
        { key: 'send',  type: 'send_email', config: {
          from: FROM,
          template: { id: templateIds[def.templateKey] },
        }},
      ] as any,
      connections: [{ from: 'start', to: 'send' }],
    } as any);
    if (res.error) throw new Error(`Automation ${def.key}: ${res.error.message}`);
    automationIds[def.key] = (res.data as any)?.id;
    console.log(`  Created: ${automationIds[def.key]}`);
  }

  // 5. Save full config
  const config = { audienceId, events: eventIds, templates: templateIds, automations: automationIds };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log('\nConfig saved:');
  console.log(JSON.stringify(config, null, 2));
  console.log('\nAll done. 3 automations created:');
  console.log('  1. booking.confirmed  → Email 1 (fired immediately on booking)');
  console.log('  2. call.reminder      → Email 2 (fired by cron at callTime - 24h)');
  console.log('  3. call.same_day      → Email 3 (fired by cron at callTime - 1h)');
}

setup().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
