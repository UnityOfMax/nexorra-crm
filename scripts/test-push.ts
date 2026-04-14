#!/usr/bin/env npx tsx
/**
 * Push Notification Test
 *
 * Sends a test push notification to Max's account.
 * Pre-req: open the CRM in a browser on the target device first
 * so PushNotificationSetup registers the subscription.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/test-push.ts
 */

import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL  = process.env.VAPID_EMAIL || 'mailto:maxfawcett@ainexorra.com';

// Max's user ID (agency owner)
const MAX_USER_ID = '54ae626a-4291-4a7e-beb4-26f7814c2491';

if (!SUPABASE_URL || !SERVICE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('Missing env vars — need SUPABASE, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY');
  process.exit(1);
}

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Looking for push subscriptions for user ${MAX_USER_ID}...`);

  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', MAX_USER_ID);

  if (error) {
    console.error('DB error:', error.message);
    process.exit(1);
  }

  if (!subs || subs.length === 0) {
    console.log('\n⚠️  No subscriptions found for your user.');
    console.log('To register one:');
    console.log('  1. Open the CRM in Chrome on your target device');
    console.log('  2. Allow notifications when prompted');
    console.log('  3. Re-run this script\n');
    process.exit(0);
  }

  console.log(`Found ${subs.length} subscription(s). Sending both test notifications...\n`);

  const notifications = [
    {
      title: '🔥 New Lead',
      body: 'Sarah Johnson just submitted a form',
      tag: 'new-lead',
      url: '/contacts',
    },
    {
      title: '📅 Call Booked',
      body: 'Sarah Johnson booked a call for Thu May 1 at 2:00 PM',
      tag: 'booking',
      url: '/calendar',
    },
  ];

  let sent = 0;
  let failed = 0;

  for (const notif of notifications) {
    const payload = JSON.stringify(notif);
    console.log(`Sending: "${notif.title}"`);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        console.log(`  ✓ ${sub.endpoint.slice(0, 60)}...`);
        sent++;
      } catch (err: any) {
        console.error(`  ✗ Failed (${err.statusCode ?? err.message})`);
        failed++;
      }
    }
    // Small gap so they arrive as separate notifications
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\nDone — ${sent} sent, ${failed} failed.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
