/**
 * One-time setup: 2-email sequence for Home Consulting AI website bookings.
 *
 * Email 1 — immediate on booking:
 *   "I've set your booking up. Watch this video first before our call."
 *
 * Email 2 — 4 hours before the call:
 *   Reminder to watch the video if they haven't yet.
 *
 * Run once:  npx tsx scripts/setup-resend-hcai-booking.ts
 *
 * Saves IDs to: agents/state/resend-hcai-booking-config.json
 *
 * ── Before running ────────────────────────────────────────────────────────────
 * You need a verified sending address in Resend. Two options:
 *
 * Option A — Verify homeconsultingai.com domain (recommended):
 *   1. resend.com → Domains → Add Domain → homeconsultingai.com
 *   2. Add the 3 DNS records they show you (SPF, DKIM, DMARC) in your DNS provider
 *   3. Wait for verification (usually < 5 min)
 *   4. Change FROM below to: 'Max <max@homeconsultingai.com>'
 *
 * Option B — Verify maxfwcett@gmail.com as a sender (Resend paid plan only):
 *   1. resend.com → Settings → Verified Email Addresses → Add
 *   2. Enter maxfwcett@gmail.com and click the verification link in Gmail
 *   3. Change FROM below to: 'Max <maxfwcett@gmail.com>'
 *   Note: Gmail's strict DMARC policy means this may land in spam for some recipients.
 *         Option A is more reliable for delivery.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY!);
const CONFIG_FILE = path.join(__dirname, '../agents/state/resend-hcai-booking-config.json');

const PRECALL_URL = process.env.HCAI_PRECALL_URL || 'https://booking.ainexorra.com';

// ── Change this to your verified FROM address before running ──────────────────
const FROM = process.env.BOOKING_FROM_EMAIL || 'Max <maxfawcett@ainexorra.com>';
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_1_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.7">
<p>Hi {{{firstName}}},</p>
<p>I've set your booking up for <strong>{{{callDate}}}</strong>.</p>
<p>Before we speak, watch the short video on the page below. It covers the website we've built for your business and what we'll go through on the call.</p>
<p style="text-align:center;margin:32px 0">
  <a href="${PRECALL_URL}" style="background:#1354e8;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px;display:inline-block">
    Watch the video &rarr;
  </a>
</p>
<p>See you then.</p>
<p style="margin-top:28px">Max</p>
</body></html>`;

const EMAIL_2_HTML = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.7">
<p>Hi {{{firstName}}},</p>
<p>Your call is in 4 hours at <strong>{{{callTime}}}</strong>.</p>
<p>If you haven't watched the video yet, worth doing before we speak. It's a few minutes and covers exactly what we'll be going through.</p>
<p style="text-align:center;margin:32px 0">
  <a href="${PRECALL_URL}" style="background:#1354e8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
    Watch the video &rarr;
  </a>
</p>
<p>Talk soon.</p>
<p style="margin-top:28px">Max</p>
</body></html>`;

async function setup() {
  let existing: any = {};
  try { existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}

  console.log('Setting up Home Consulting AI booking emails...\n');
  console.log(`FROM: ${FROM}`);
  console.log(`PRECALL URL: ${PRECALL_URL}\n`);

  // 1. Events
  const eventNames = ['hcai.booking.confirmed', 'hcai.call.reminder_4h'] as const;
  const eventIds: Record<string, string> = existing.events || {};

  for (const name of eventNames) {
    if (eventIds[name]) { console.log(`Event ${name} already set: ${eventIds[name]}`); continue; }
    const res = await resend.events.create({
      name,
      schema: { firstName: 'string', callDate: 'string', callTime: 'string' } as any,
    });
    if (res.error) {
      console.log(`Event ${name} error (may exist): ${res.error.message}`);
      eventIds[name] = name;
    } else {
      eventIds[name] = (res.data as any)?.id || name;
      console.log(`Event ${name}: ${eventIds[name]}`);
    }
  }

  // 2. Templates
  const templateDefs = [
    {
      key: 'email1',
      name: 'HCAI — Email 1: Booking Confirmed',
      subject: "Here's everything before our call",
      html: EMAIL_1_HTML,
      variables: [
        { key: 'firstName', name: 'First Name', type: 'string', fallback: 'there' },
        { key: 'callDate',  name: 'Call Date',  type: 'string', fallback: 'your scheduled time' },
      ],
    },
    {
      key: 'email2',
      name: 'HCAI — Email 2: 4-Hour Reminder',
      subject: 'Your call is in 4 hours',
      html: EMAIL_2_HTML,
      variables: [
        { key: 'firstName', name: 'First Name', type: 'string', fallback: 'there' },
        { key: 'callTime',  name: 'Call Time',  type: 'string', fallback: 'your scheduled time' },
      ],
    },
  ];

  const templateIds: Record<string, string> = existing.templates || {};

  for (const def of templateDefs) {
    if (templateIds[def.key]) { console.log(`Template ${def.key} already set: ${templateIds[def.key]}`); continue; }
    console.log(`Creating template ${def.key}...`);
    const res = await (resend.templates.create({ name: def.name, html: def.html, variables: def.variables } as any).publish() as any);
    if (res.error) throw new Error(`Template ${def.key}: ${res.error.message}`);
    const id = res.data?.id || res.id;
    if (!id) throw new Error(`Template ${def.key} — no ID returned: ${JSON.stringify(res)}`);
    templateIds[def.key] = id;
    console.log(`  Created: ${id}`);
  }

  // 3. Automations
  const automationDefs = [
    { key: 'email1', name: 'HCAI Booking — Email 1 (Immediate)', eventName: 'hcai.booking.confirmed', templateKey: 'email1' },
    { key: 'email2', name: 'HCAI Booking — Email 2 (4hr Reminder)', eventName: 'hcai.call.reminder_4h', templateKey: 'email2' },
  ];

  const automationIds: Record<string, string> = existing.automations || {};

  for (const def of automationDefs) {
    if (automationIds[def.key]) { console.log(`Automation ${def.key} already set: ${automationIds[def.key]}`); continue; }
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

  // 4. Save
  const config = { from: FROM, events: eventIds, templates: templateIds, automations: automationIds };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log('\nDone. Config saved to:', CONFIG_FILE);
  console.log('\nNext step: update google-calendar-poll.js to fire these events:');
  console.log('  hcai.booking.confirmed → fire immediately on new booking');
  console.log('  hcai.call.reminder_4h  → fire at callTime - 4 hours');
}

setup().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
