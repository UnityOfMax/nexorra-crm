/**
 * One-time setup: Resend templates + automations for the WEBSITE leads
 * discovery call email sequence (separate from real estate discovery calls).
 *
 * Run once:  npx tsx scripts/setup-resend-website-discovery.ts
 *
 * Architecture (mirrors setup-resend-discovery.ts):
 *  - Email 1 (immediate): website.booking.confirmed → fires on booking
 *  - Email 2 (24h before): website.call.reminder   → fired by google-calendar-poll at callTime - 24h
 *  - Email 3 (1h before):  website.call.same_day   → fired by google-calendar-poll at callTime - 1h
 *
 * Saves IDs to: agents/state/resend-website-discovery-config.json
 */

import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY!);
const CONFIG_FILE = path.join(__dirname, '../agents/state/resend-website-discovery-config.json');

const PRECALL_URL = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nexorra.io'}/website-call-booked`;

// ── Template HTML ──────────────────────────────────────────────────────────────

const TEMPLATE_1_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi {{{firstName}}},</p>
<p>You're booked in for <strong>{{{callDate}}}</strong>.</p>
<p>Before the call, go through the page below. It covers how we build websites for businesses like yours and what to expect from our conversation.</p>
<p style="text-align:center;margin:28px 0">
  <a href="${PRECALL_URL}" style="background:#1354e8;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block">
    See the demos &amp; overview &rarr;
  </a>
</p>
<p>Three quick things on there:</p>
<p style="padding-left:16px">1. Watch the short video (covers exactly what we build)<br>2. Accept the calendar invite (check spam if you haven't seen it)<br>3. Browse the demo websites we've built for other businesses</p>
<p>See you then.</p>
<p style="margin-top:28px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;

const TEMPLATE_2_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi {{{firstName}}},</p>
<p>Just a reminder we're speaking <strong>{{{callDay}}}</strong>.</p>
<p>A few of our clients before we talk.</p>
<br>
<p>Sarah runs a hair salon. Three new clients called her within the first week of the site going live saying they found her online and loved how professional it looked.</p>
<br>
<p>Dave runs a roofing company. He was skeptical. He'd been burned by web designers before and had nothing to show for it. His site was done in days and it was the best he'd ever seen. He refers everyone he knows.</p>
<br>
<p>Tyler runs a landscaping company. He got his first quote request through the website within 48 hours of it going live. That alone paid for the whole thing.</p>
<br>
<p>See you tomorrow.</p>
<p style="margin-top:4px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;

const TEMPLATE_3_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi {{{firstName}}},</p>
<p>We're speaking today. Looking forward to it.</p>
<p>If you haven't been through the pre-call page yet, worth doing before we speak:</p>
<p style="text-align:center;margin:24px 0">
  <a href="${PRECALL_URL}" style="background:#1354e8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
    View the demos &amp; overview &rarr;
  </a>
</p>
<p>Talk soon.</p>
<p style="margin-top:28px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;

// ── Setup ──────────────────────────────────────────────────────────────────────

async function setup() {
  let existing: any = {};
  try { existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}

  console.log('Setting up Resend for website discovery call sequence...\n');

  // 1. Audience
  let audienceId = existing.audienceId;
  if (audienceId) {
    console.log(`Audience already set: ${audienceId}`);
  } else {
    const res = await resend.audiences.create({ name: 'Website Discovery Calls' });
    if (res.error) throw new Error(`Audience: ${res.error.message}`);
    audienceId = res.data!.id;
    console.log(`Audience created: ${audienceId}`);
  }

  // 2. Events (prefixed with website. to avoid collision with real estate events)
  const eventNames = ['website.booking.confirmed', 'website.call.reminder', 'website.call.same_day'] as const;
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
      key: 'email1', name: 'Website Discovery — Email 1 (Confirmation)',
      html: TEMPLATE_1_HTML,
      variables: [
        { key: 'firstName', name: 'First Name', type: 'string', fallback: 'there' },
        { key: 'callDate',  name: 'Call Date',  type: 'string', fallback: 'your scheduled time' },
      ],
    },
    {
      key: 'email2', name: 'Website Discovery — Email 2 (Day Before)',
      html: TEMPLATE_2_HTML,
      variables: [
        { key: 'firstName', name: 'First Name', type: 'string', fallback: 'there' },
        { key: 'callDay',   name: 'Call Day',   type: 'string', fallback: 'soon' },
      ],
    },
    {
      key: 'email3', name: 'Website Discovery — Email 3 (Same Day)',
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

  // 4. Automations
  const automationDefs = [
    { key: 'email1', name: 'Website Discovery — Email 1 (Booking Confirmation)', eventName: 'website.booking.confirmed', templateKey: 'email1' },
    { key: 'email2', name: 'Website Discovery — Email 2 (Day Before Reminder)',  eventName: 'website.call.reminder',      templateKey: 'email2' },
    { key: 'email3', name: 'Website Discovery — Email 3 (Same Day)',             eventName: 'website.call.same_day',      templateKey: 'email3' },
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
        { key: 'send',  type: 'send_email', config: { from: FROM, template: { id: templateIds[def.templateKey] } } },
      ] as any,
      connections: [{ from: 'start', to: 'send' }],
    } as any);
    if (res.error) throw new Error(`Automation ${def.key}: ${res.error.message}`);
    automationIds[def.key] = (res.data as any)?.id;
    console.log(`  Created: ${automationIds[def.key]}`);
  }

  // 5. Save config
  const config = { audienceId, events: eventIds, templates: templateIds, automations: automationIds };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log('\nConfig saved to:', CONFIG_FILE);
  console.log(JSON.stringify(config, null, 2));
  console.log('\nAll done. 3 automations created:');
  console.log('  1. website.booking.confirmed → Email 1 (immediate, on booking)');
  console.log('  2. website.call.reminder     → Email 2 (fired at callTime - 24h)');
  console.log('  3. website.call.same_day     → Email 3 (fired at callTime - 1h)');
  console.log('\nNOTE: Update google-calendar-poll.js to fire website.* events for');
  console.log('website discovery bookings (separate Calendly event type or detect by title).');
}

setup().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
