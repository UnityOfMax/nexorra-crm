#!/usr/bin/env node
/**
 * Google Calendar polling — detects new discovery call bookings and triggers email sequence.
 *
 * Runs every 5 min via cron. On each run:
 *  1. Refreshes Google access token using stored refresh_token
 *  2. Uses syncToken to fetch only NEW/changed calendar events since last run
 *  3. For each new discovery call event: sends Email 1 immediately
 *  4. Checks queue for Email 2 (24h before call) and Email 3 (3h before call)
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

const STATE_FILE = path.join(__dirname, '../agents/state/calendar-poll-state.json');

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

// ── Google OAuth ──────────────────────────────────────────────────────────────

async function getGoogleTokens() {
  // Load refresh_token from Supabase account settings
  const res = await httpsRequest({
    hostname: new URL(SUPABASE_URL).hostname,
    path: `/rest/v1/accounts?id=eq.${ACCOUNT_ID}&select=settings`,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });

  const settings = res.body?.[0]?.settings;
  const gcal = settings?.google_calendar;
  if (!gcal?.refresh_token) throw new Error('No Google Calendar refresh_token in Supabase. Run google-oauth.js first.');

  // Check if current access token is still valid (5 min buffer)
  if (gcal.access_token && gcal.token_expiry) {
    const expiry = new Date(gcal.token_expiry).getTime();
    if (Date.now() < expiry - 5 * 60 * 1000) {
      return gcal.access_token; // still valid
    }
  }

  // Refresh the access token
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

  // Update stored tokens in Supabase
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

  console.log('✅ Google access token refreshed');
  return tokenRes.body.access_token;
}

// ── Calendar API ──────────────────────────────────────────────────────────────

async function fetchCalendarChanges(accessToken, syncToken) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'updated',
    maxResults: '50',
  });

  if (syncToken) {
    params.set('syncToken', syncToken);
  } else {
    // First run: only look at events from now onwards
    params.set('timeMin', new Date().toISOString());
    params.set('timeMax', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()); // next 60 days
  }

  const res = await httpsRequest({
    hostname: 'www.googleapis.com',
    path: `/calendar/v3/calendars/primary/events?${params}`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 410) {
    // Sync token expired — reset
    console.log('⚠️  Sync token expired, resetting...');
    return fetchCalendarChanges(accessToken, null);
  }

  if (res.status !== 200) throw new Error(`Calendar API error ${res.status}: ${JSON.stringify(res.body)}`);

  return {
    items: res.body.items || [],
    nextSyncToken: res.body.nextSyncToken,
  };
}

// ── Discovery call detection ──────────────────────────────────────────────────

function isDiscoveryCall(event) {
  if (event.status === 'cancelled') return false;
  if (!event.start) return false;

  const title = (event.summary || '').toLowerCase();
  const desc  = (event.description || '').toLowerCase();

  // Calendly events typically have attendees and mention "discovery" or "nexorra" or have Zoom/Meet links
  const hasDiscoveryKeyword = title.includes('discovery') || title.includes('nexorra') ||
    desc.includes('calendly') || desc.includes('discovery call');
  const hasAttendees = event.attendees && event.attendees.length > 0;
  const hasMeetingLink = desc.includes('zoom.us') || desc.includes('meet.google') || desc.includes('teams.microsoft');

  return hasDiscoveryKeyword || (hasAttendees && hasMeetingLink);
}

function extractLeadInfo(event) {
  // Find the non-organizer attendee (the lead)
  const attendees = event.attendees || [];
  const lead = attendees.find(a => !a.self && !a.organizer) || attendees[0];

  const email = lead?.email || null;
  const displayName = lead?.displayName || '';

  // Parse first name from display name
  const firstName = displayName.split(' ')[0] || 'there';

  const callTime = event.start?.dateTime || event.start?.date;

  return { email, firstName, displayName, callTime, eventId: event.id, eventTitle: event.summary };
}

// ── Resend email ──────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  const body = JSON.stringify({
    from: `Nexorra <${FROM_EMAIL}>`,
    to: [to],
    subject,
    html,
  });

  const res = await httpsRequest({
    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Resend error ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
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
    View Your Pre-Call Page →
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

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi ${firstName},</p>
<p>Just a reminder we're speaking <strong>${callDate}</strong>.</p>
<p>A few of our clients' results below so you can see what's possible before we talk.</p>
<p>{{EMAIL2_IMAGES_PLACEHOLDER}}</p>
<p>See you then.</p>
<p style="margin-top:28px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;
}

function email3Html(firstName) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0a0f1e;line-height:1.6">
<p>Hi ${firstName},</p>
<p>We're speaking today. Looking forward to it.</p>
<p>If you haven't been through the pre-call page yet, worth doing before we speak:</p>
<p style="text-align:center;margin:24px 0">
  <a href="${PRECALL_URL}" style="background:#1d6bf3;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">
    Pre-Call Page →
  </a>
</p>
<p>Talk soon.</p>
<p style="margin-top:28px">Max<br><span style="color:#64748b;font-size:13px">Nexorra</span></p>
</body></html>`;
}

// ── Email queue processor ─────────────────────────────────────────────────────

async function processEmailQueue(queue) {
  const now = Date.now();
  let changed = false;

  for (const item of queue) {
    if (!item.email) continue;

    const callMs = item.callTime ? new Date(item.callTime).getTime() : null;

    // Email 2: 24h before call
    if (!item.email2Sent && callMs && now >= callMs - 24 * 60 * 60 * 1000) {
      try {
        if (DRY_RUN) {
          console.log(`[DRY RUN] Would send Email 2 to ${item.email}`);
        } else {
          await sendEmail({
            to: item.email,
            subject: `Reminder: we're speaking ${new Date(item.callTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
            html: email2Html(item.firstName, item.callTime),
          });
          console.log(`📧 Email 2 sent to ${item.email}`);
        }
        item.email2Sent = true;
        changed = true;
      } catch (err) {
        console.error(`❌ Email 2 failed for ${item.email}:`, err.message);
      }
    }

    // Email 3: 3h before call
    if (!item.email3Sent && callMs && now >= callMs - 3 * 60 * 60 * 1000) {
      try {
        if (DRY_RUN) {
          console.log(`[DRY RUN] Would send Email 3 to ${item.email}`);
        } else {
          await sendEmail({
            to: item.email,
            subject: 'Speaking today',
            html: email3Html(item.firstName),
          });
          console.log(`📧 Email 3 sent to ${item.email}`);
        }
        item.email3Sent = true;
        changed = true;
      } catch (err) {
        console.error(`❌ Email 3 failed for ${item.email}:`, err.message);
      }
    }
  }

  return changed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');
  if (DRY_RUN) console.log('🔍 DRY RUN — no emails will be sent');
  console.log(`\n📅 Google Calendar Poll — ${new Date().toLocaleTimeString()}`);

  if (!RESEND_KEY) { console.error('❌ Missing RESEND_API_KEY'); process.exit(1); }

  const state = loadState();
  let changed = false;

  // 1. Get access token
  const accessToken = await getGoogleTokens();

  // 2. Fetch calendar changes since last run
  const { items, nextSyncToken } = await fetchCalendarChanges(accessToken, state.syncToken);
  console.log(`   ${items.length} calendar change(s)`);

  // 3. Process new events
  for (const event of items) {
    if (!isDiscoveryCall(event)) continue;

    const lead = extractLeadInfo(event);
    if (!lead.email) {
      console.log(`⚠️  Skipping event "${event.summary}" — no attendee email found`);
      continue;
    }

    // Check if already in queue
    const alreadyQueued = state.queue.some(q => q.eventId === lead.eventId);
    if (alreadyQueued) continue;

    console.log(`\n🎯 New booking: ${lead.displayName || lead.email} — ${lead.eventTitle}`);
    console.log(`   Call time: ${lead.callTime}`);
    console.log(`   Email: ${lead.email}`);

    // Send Email 1 immediately
    try {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would send Email 1 to ${lead.email}`);
      } else {
        await sendEmail({
          to: lead.email,
          subject: "Here's everything before our call",
          html: email1Html(lead.firstName, lead.callTime),
        });
        console.log(`📧 Email 1 sent to ${lead.email}`);
      }

      state.queue.push({
        eventId:    lead.eventId,
        email:      lead.email,
        firstName:  lead.firstName,
        callTime:   lead.callTime,
        email1Sent: true,
        email2Sent: false,
        email3Sent: false,
        addedAt:    new Date().toISOString(),
      });
      changed = true;
    } catch (err) {
      console.error(`❌ Email 1 failed for ${lead.email}:`, err.message);
    }
  }

  // 4. Process Email 2 / 3 queue
  const queueChanged = await processEmailQueue(state.queue);
  if (queueChanged) changed = true;

  // 5. Prune queue entries older than 14 days past call time
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  state.queue = state.queue.filter(q => {
    if (!q.callTime) return true;
    return new Date(q.callTime).getTime() > cutoff;
  });

  // 6. Save state
  if (nextSyncToken) state.syncToken = nextSyncToken;
  saveState(state);

  console.log(`\n✅ Done. Queue: ${state.queue.length} active booking(s)\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
