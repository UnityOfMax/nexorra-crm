/**
 * One-time setup: creates the Resend audience + event schemas for the
 * discovery call email sequence. Run once:
 *   npx tsx scripts/setup-resend-discovery.ts
 *
 * Saves config to agents/state/resend-discovery-config.json
 */

import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY!);
const CONFIG_FILE = path.join(__dirname, '../agents/state/resend-discovery-config.json');

async function setup() {
  console.log('Setting up Resend for discovery call sequence...\n');

  // 1. Create audience
  console.log('Creating audience...');
  const audience = await resend.audiences.create({ name: 'Discovery Calls' });
  if (audience.error) throw new Error(`Audience error: ${audience.error.message}`);
  const audienceId = audience.data!.id;
  console.log(`  Audience created: ${audienceId}`);

  // 2. Create event schemas
  const events = [
    { name: 'booking.confirmed', schema: { firstName: 'string', callTime: 'string', callDateDisplay: 'string' } },
    { name: 'call.reminder',     schema: { firstName: 'string', callTime: 'string', callDayDisplay: 'string' } },
    { name: 'call.same_day',     schema: { firstName: 'string' } },
  ];

  const eventIds: Record<string, string> = {};
  for (const ev of events) {
    console.log(`Creating event: ${ev.name}...`);
    const res = await resend.events.create({ name: ev.name, schema: ev.schema as any });
    if (res.error) {
      // Event may already exist — that's fine
      console.log(`  Already exists or error: ${res.error.message}`);
      eventIds[ev.name] = ev.name; // use name as key
    } else {
      eventIds[ev.name] = (res.data as any)?.id || ev.name;
      console.log(`  Created: ${eventIds[ev.name]}`);
    }
  }

  // 3. Save config
  const config = { audienceId, events: eventIds };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`\nConfig saved to ${CONFIG_FILE}`);
  console.log(JSON.stringify(config, null, 2));

  console.log('\nDone. Next: set RESEND_AUDIENCE_ID=' + audienceId + ' in .env.local');
  console.log('\nNote: to use full Resend automations, create email templates in the');
  console.log('Resend dashboard and create automations triggered by these events.');
  console.log('Until then, the poll script schedules emails directly via Resend scheduledAt.');
}

setup().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
