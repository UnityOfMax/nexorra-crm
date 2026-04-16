#!/usr/bin/env node
/**
 * Google Calendar polling — detects new discovery call bookings and triggers email sequence.
 *
 * Runs every 5 min via cron. On each run:
 *  1. Refreshes Google access token using stored refresh_token
 *  2. Uses syncToken to fetch only NEW/changed calendar events since last run
 *  3. For each new booking:
 *     a. Creates a Resend contact
 *     b. Schedules all 3 emails via Resend scheduledAt (device-independent)
 *     c. Fires Resend events (for future automation)
 *
 * Emails are queued in Resend — device does NOT need to stay on after booking.
 *
 * Flags:
 *   --test      Override recipient to TEST_EMAIL env var (111macifawcett@gmail.com)
 *   --dry-run   Log everything, send nothing
 *
 * State stored in: agents/state/calendar-poll-state.json
 * Usage: node scripts/google-calendar-poll.js
 */

'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY    = process.env.RESEND_API_KEY;
const FROM_EMAIL    = process.env.FROM_EMAIL || 'noreply@noreply.ainexorralinks.com';
const ACCOUNT_ID    = process.env.NEXORRA_AGENCY_ACCOUNT_ID || 'da99b768-79dd-48f8-af86-abf95e61a69f';
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ainexorra.com';
const PRECALL_URL   = `${APP_URL}/call-booked`;
const TEST_EMAIL    = process.env.TEST_EMAIL || '111macifawcett@gmail.com';

const STATE_FILE   = path.join(__dirname, '../agents/state/calendar-poll-state.json');
const CONFIG_FILE  = path.join(__dirname, '../agents/state/resend-discovery-config.json');

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// ── State ─────────────────────────────────────────────────────────────────────

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { syncToken: null, queue: [] };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadResendConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

async function getGoogleTokens() {
  const res = await httpsRequest({
    hostname: new URL(SUPABASE_URL).hostname,
    path: `/rest/v1/accounts?id=eq.${ACCOUNT_ID}&select=settings`,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });

  const settings = res.body?.[0]?.settings;
  const gcal = settings?.google_calendar;
  if (!gcal?.refresh_token) throw new Error('No Google Calendar refresh_token in Supabase. Run google-oauth.js first.');

  if (gcal.access_token && gcal.token_expiry) {
    const expiry = new Date(gcal.token_expiry).getTime();
    if (Date.now() < expiry - 5 * 60 * 1000) {
      return gcal.access_token;
    }
  }

  const body = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: gcal.refresh_token,
    grant_type:    'refresh_token',
  }).toString();

  const tokenRes = await httpsRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, body);

  if (!tokenRes.body.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(tokenRes.body));

  const updated = {
    ...settings,
    google_calendar: {
      ...gcal,
      access_token: tokenRes.body.access_token,
      token_expiry: new Date(Date.now() + (tokenRes.body.expires_in || 3600) * 1000).toISOString(),
    }
  };

  await httpsRequest({
    hostname: new URL(SUPABASE_URL).hostname,
    path: `/rest/v1/accounts?id=eq.${ACCOUNT_ID}`,
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
      'Content-Length': Buffer.byteLength(JSON.stringify({ settings: updated })),
    },
  }, JSON.stringify({ settings: updated }));

  console.log('Access token refreshed');
  return tokenRes.body.access_token;
}

// ── Calendar API ──────────────────────────────────────────────────────────────

async function fetchCalendarChanges(accessToken, syncToken) {
  // orderBy cannot be used with syncToken — only set it on full (non-incremental) fetches
  const params = new URLSearchParams({
    singleEvents: 'true',
    maxResults: '50',
  });

  if (syncToken) {
    params.set('syncToken', syncToken);
  } else {
    params.set('orderBy', 'updated');
    params.set('timeMin', new Date().toISOString());
    params.set('timeMax', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString());
  }

  const res = await httpsRequest({
    hostname: 'www.googleapis.com',
    path: `/calendar/v3/calendars/primary/events?${params}`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 410) {
    console.log('Sync token expired, resetting...');
    return fetchCalendarChanges(accessToken, null);
  }

  if (res.status !== 200) throw new Error(`Calendar API error ${res.status}: ${JSON.stringify(res.body)}`);

  return { items: res.body.items || [], nextSyncToken: res.body.nextSyncToken };
}

// ── Discovery call detection ──────────────────────────────────────────────────

function isDiscoveryCall(event) {
  if (event.status === 'cancelled') return false;
  if (!event.start) return false;

  const title = (event.summary || '').toLowerCase();
  const desc  = (event.description || '').toLowerCase();

  const hasDiscoveryKeyword = title.includes('discovery') || title.includes('nexorra') ||
    desc.includes('calendly') || desc.includes('discovery call');
  const hasAttendees = event.attendees && event.attendees.length > 0;
  const hasMeetingLink = desc.includes('zoom.us') || desc.includes('meet.google') || desc.includes('teams.microsoft');

  return hasDiscoveryKeyword || (hasAttendees && hasMeetingLink);
}

function extractLeadInfo(event) {
  const attendees = event.attendees || [];
  const lead = attendees.find(a => !a.self && !a.organizer) || attendees[0];

  const email = lead?.email || null;
  const displayName = lead?.displayName || '';
  // Fallback: capitalise first part of email local-part (e.g. jane.smith@ → Jane)
  let firstName = displayName.split(' ')[0];
  if (!firstName && email) {
    const local = email.split('@')[0].split(/[._-]/)[0];
    firstName = local.charAt(0).toUpperCase() + local.slice(1);
  }
  firstName = firstName || 'there';
  const callTime = event.start?.dateTime || event.start?.date;

  return { email, firstName, displayName, callTime, eventId: event.id, eventTitle: event.summary };
}

// ── Resend helpers ────────────────────────────────────────────────────────────

async function resendRequest(path, method, body) {
  const bodyStr = JSON.stringify(body);
  const res = await httpsRequest({
    hostname: 'api.resend.com',
    path,
    method,
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
  }, bodyStr);
  return res;
}

async function createResendContact(audienceId, email, firstName, lastName) {
  if (!audienceId) return null;
  const res = await resendRequest(`/audiences/${audienceId}/contacts`, 'POST', {
    email,
    first_name: firstName,
    last_name: lastName || '',
    unsubscribed: false,
  });
  if (res.status === 200 || res.status === 201) {
    return res.body?.id || null;
  }
  // 409 = already exists, that's fine
  if (res.status === 409) return null;
  console.error(`Contact create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return null;
}

async function fireResendEvent(eventName, email, payload) {
  const res = await resendRequest('/events/send', 'POST', { event: eventName, email, payload });
  if (res.status !== 200 && res.status !== 201) {
    console.error(`Event ${eventName} fire failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res;
}

async function sendEmail({ to, subject, html, scheduledAt }) {
  const body = {
    from: `Max at Nexorra <${FROM_EMAIL}>`,
    to: [to],
    subject,
    html,
  };
  if (scheduledAt) body.scheduled_at = scheduledAt;

  const res = await resendRequest('/emails', 'POST', body);
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Resend email error ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body?.id || null;
}

// ── Email templates ───────────────────────────────────────────────────────────

function email1Html(firstName, callTime) {
  const callDate = callTime ? new Date(callTime).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }) : 'your scheduled time';

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi ${firstName},</p>
<p>You're booked in for <strong>${callDate}</strong>.</p>
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
}

function email2Html(firstName, callTime) {
  const callDate = callTime ? new Date(callTime).toLocaleString('en-US', {
    weekday: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }) : 'tomorrow';

  const BASE = 'https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-page-assets/email-results';

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi ${firstName},</p>
<p>Just a reminder we're speaking <strong>${callDate}</strong>.</p>
<p>A few of our clients before we talk.</p>

<br>

<p>One of our clients, Mary, over the last 2.5 years we've helped her close 61 deals, around $270,000 per year.</p>
<img src="${BASE}/mary.png" alt="Mary's results" style="width:100%;max-width:560px;border-radius:8px;margin:4px 0 0" />

<br><br>

<p>Or David, who started working with us 3 months ago and has already made nearly $30k in GCI.</p>
<img src="${BASE}/david.png" alt="David's results" style="width:100%;max-width:560px;border-radius:8px;margin:4px 0 0" />

<br><br>

<p>And Susan who started around a year ago and has done an extra 2 deals per month every month since then.</p>
<img src="${BASE}/susan.png" alt="Susan's results" style="width:100%;max-width:560px;border-radius:8px;margin:4px 0 0" />

<br>

<p>See you soon,</p>
<p style="margin-top:4px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;
}

function email3Html(firstName) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi ${firstName},</p>
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
}

// ── Book a new lead into the sequence ─────────────────────────────────────────
// On booking: create contact + fire booking.confirmed (→ Email 1 automation).
// Reminder times are stored in the queue; each cron run fires the right event when due.

async function onNewBooking(lead, recipientEmail, dryRun, resendConfig) {
  const callMs = lead.callTime ? new Date(lead.callTime).getTime() : null;

  const callDateDisplay = callMs ? new Date(callMs).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }) : 'your scheduled time';

  const callDayDisplay = callMs ? new Date(callMs).toLocaleString('en-US', {
    weekday: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }) : 'soon';

  if (dryRun) {
    console.log(`  [DRY RUN] contact + booking.confirmed → Email 1 → ${recipientEmail}`);
    console.log(`    firstName=${lead.firstName}, callDate=${callDateDisplay}`);
    if (callMs) {
      console.log(`  [DRY RUN] call.reminder will fire at ${new Date(callMs - 24 * 60 * 60 * 1000).toISOString()}`);
      console.log(`  [DRY RUN] call.same_day will fire at ${new Date(callMs - 60 * 60 * 1000).toISOString()}`);
    }
    return;
  }

  if (resendConfig?.audienceId) {
    const lastName = lead.displayName?.split(' ').slice(1).join(' ') || '';
    const contactId = await createResendContact(resendConfig.audienceId, recipientEmail, lead.firstName, lastName);
    console.log(contactId ? `  Contact created: ${contactId}` : '  Contact already exists');

    await fireResendEvent('booking.confirmed', recipientEmail, {
      firstName: lead.firstName,
      callDate: callDateDisplay,
      callDay: callDayDisplay,
    });
    console.log(`  booking.confirmed fired → Email 1 sent by automation`);
  } else {
    // Fallback: no Resend config — send Email 1 directly
    await sendEmail({
      to: recipientEmail,
      subject: "Here's everything before our call",
      html: email1Html(lead.firstName, lead.callTime),
    });
    console.log(`  Email 1 sent directly (no Resend config)`);
  }
}

// ── Process timed reminders from queue ───────────────────────────────────────
// Each cron run checks pending reminders and fires the event when the time comes.
// Once fired, Resend's automation delivers the email — device doesn't need to stay on.

async function processReminderQueue(queue, testMode, dryRun, resendConfig) {
  const now = Date.now();
  let changed = false;

  for (const item of queue) {
    if (!item.callTime || !item.email) continue;
    const callMs = new Date(item.callTime).getTime();
    const recipientEmail = testMode ? TEST_EMAIL : item.email;

    const callDayDisplay = new Date(callMs).toLocaleString('en-US', {
      weekday: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });

    // Email 2 — fire call.reminder event at callTime - 24h
    if (!item.reminder2Fired) {
      const fireAt = callMs - 24 * 60 * 60 * 1000;
      if (now >= fireAt) {
        if (dryRun) {
          console.log(`  [DRY RUN] call.reminder → Email 2 → ${recipientEmail} (${item.email})`);
        } else if (resendConfig?.audienceId) {
          await fireResendEvent('call.reminder', recipientEmail, {
            firstName: item.firstName,
            callDay: callDayDisplay,
          });
          console.log(`  call.reminder fired → Email 2 for ${item.email}`);
        } else {
          await sendEmail({
            to: recipientEmail,
            subject: `Reminder: we're speaking ${new Date(callMs).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
            html: email2Html(item.firstName, item.callTime),
          });
          console.log(`  Email 2 sent directly for ${item.email}`);
        }
        if (!dryRun) { item.reminder2Fired = true; changed = true; }
      }
    }

    // Email 3 — fire call.same_day event at callTime - 1h
    if (!item.reminder3Fired) {
      const fireAt = callMs - 60 * 60 * 1000;
      if (now >= fireAt) {
        if (dryRun) {
          console.log(`  [DRY RUN] call.same_day → Email 3 → ${recipientEmail} (${item.email})`);
        } else if (resendConfig?.audienceId) {
          await fireResendEvent('call.same_day', recipientEmail, {
            firstName: item.firstName,
          });
          console.log(`  call.same_day fired → Email 3 for ${item.email}`);
        } else {
          await sendEmail({
            to: recipientEmail,
            subject: 'Speaking today',
            html: email3Html(item.firstName),
          });
          console.log(`  Email 3 sent directly for ${item.email}`);
        }
        if (!dryRun) { item.reminder3Fired = true; changed = true; }
      }
    }
  }

  return changed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const DRY_RUN  = process.argv.includes('--dry-run');
  const TEST_MODE = process.argv.includes('--test');
  if (DRY_RUN)   console.log('DRY RUN — no emails will be sent');
  if (TEST_MODE) console.log(`TEST MODE — all emails redirected to ${TEST_EMAIL}`);
  console.log(`\nGoogle Calendar Poll — ${new Date().toLocaleTimeString()}`);

  if (!RESEND_KEY) { console.error('Missing RESEND_API_KEY'); process.exit(1); }

  const resendConfig = loadResendConfig();
  if (!resendConfig) {
    console.log('No Resend config found. Run: npx tsx scripts/setup-resend-discovery.ts');
    console.log('Proceeding without contact creation / event firing.\n');
  }

  const state = loadState();
  let changed = false;

  // 1. Get access token
  const accessToken = await getGoogleTokens();

  // 2. Fetch calendar changes since last run
  const { items, nextSyncToken } = await fetchCalendarChanges(accessToken, state.syncToken);
  console.log(`${items.length} calendar change(s)\n`);

  // 3. Process new discovery call bookings
  for (const event of items) {
    if (!isDiscoveryCall(event)) continue;

    const lead = extractLeadInfo(event);
    if (!lead.email) {
      console.log(`Skipping "${event.summary}" — no attendee email`);
      continue;
    }

    // Skip if already processed
    if (state.queue && state.queue.some(q => q.eventId === lead.eventId)) continue;

    console.log(`New booking: ${lead.displayName || lead.email}`);
    console.log(`  Call: ${lead.callTime}`);
    console.log(`  Email: ${lead.email}`);

    const recipientEmail = (TEST_MODE || DRY_RUN) ? TEST_EMAIL : lead.email;
    if (TEST_MODE) console.log(`  Sending to test address: ${TEST_EMAIL}`);

    try {
      await onNewBooking(lead, recipientEmail, DRY_RUN, resendConfig);

      // Save to queue (tracks reminder firing state for Email 2 + 3)
      if (!DRY_RUN) {
        if (!state.queue) state.queue = [];
        state.queue.push({
          eventId:        lead.eventId,
          email:          lead.email,
          firstName:      lead.firstName,
          callTime:       lead.callTime,
          processedAt:    new Date().toISOString(),
          reminder2Fired: false,
          reminder3Fired: false,
        });
        changed = true;
      }
    } catch (err) {
      console.error(`Failed for ${lead.email}:`, err.message);
    }
  }

  // 4. Process timed reminders (Email 2 + 3) for existing queue entries
  const reminderChanged = await processReminderQueue(state.queue || [], TEST_MODE, DRY_RUN, resendConfig);
  if (reminderChanged) changed = true;

  // 5. Prune queue entries older than 14 days past call time
  if (state.queue) {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const before = state.queue.length;
    state.queue = state.queue.filter(q => {
      if (!q.callTime) return true;
      return new Date(q.callTime).getTime() > cutoff;
    });
    if (state.queue.length < before) changed = true;
  }

  // 5. Save state
  if (nextSyncToken) state.syncToken = nextSyncToken;
  if (changed || nextSyncToken !== state.syncToken) saveState(state);

  console.log(`\nDone. Queue: ${state.queue?.length ?? 0} active booking(s)\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
