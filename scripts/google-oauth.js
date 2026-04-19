#!/usr/bin/env node
/**
 * Google OAuth token generator for Nexorra calendar polling.
 * Gets a refresh token and saves it to the Nexorra agency account in Supabase.
 *
 * Usage: node scripts/google-oauth.js
 *
 * FIRST TIME SETUP: Add http://localhost:3333/callback to your Google Cloud Console
 * at console.cloud.google.com → APIs & Services → Credentials → your OAuth 2.0 Client
 */

'use strict';

const http = require('http');
const { exec } = require('child_process');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3333/callback';
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCOUNT_ID    = process.env.NEXORRA_AGENCY_ACCOUNT_ID || 'da99b768-79dd-48f8-af86-abf95e61a69f';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ');

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function exchangeCode(code) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON from token endpoint: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getCalendarEmail(accessToken) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: '/calendar/v3/users/me/calendarList?maxResults=1',
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const primary = parsed.items?.find(c => c.primary) || parsed.items?.[0];
          resolve(primary?.id || primary?.summary || 'unknown');
        } catch { resolve('unknown'); }
      });
    });
    req.on('error', () => resolve('unknown'));
    req.end();
  });
}

async function saveToSupabase(tokens, calendarEmail) {
  return new Promise((resolve, reject) => {
    // First get existing settings
    const getReq = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path: `/rest/v1/accounts?id=eq.${ACCOUNT_ID}&select=settings`,
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const existing = JSON.parse(data)?.[0]?.settings || {};
        const updated = {
          ...existing,
          google_calendar: {
            enabled: true,
            user_email: calendarEmail,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
            calendar_id: calendarEmail,
            last_sync_at: new Date().toISOString(),
          }
        };

        const body = JSON.stringify({ settings: updated });
        const patchReq = https.request({
          hostname: new URL(SUPABASE_URL).hostname,
          path: `/rest/v1/accounts?id=eq.${ACCOUNT_ID}`,
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
        }, (pRes) => {
          let d = '';
          pRes.on('data', x => d += x);
          pRes.on('end', () => {
            if (pRes.statusCode < 300) resolve();
            else reject(new Error(`Supabase update failed: ${pRes.statusCode} ${d}`));
          });
        });
        patchReq.on('error', reject);
        patchReq.write(body);
        patchReq.end();
      });
    });
    getReq.on('error', reject);
    getReq.end();
  });
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
    process.exit(1);
  }

  const authUrl = buildAuthUrl();
  console.log('\n🔑 Google OAuth — Nexorra Calendar Setup');
  console.log('─'.repeat(50));
  console.log('\n⚡ IMPORTANT: Make sure http://localhost:3333/callback');
  console.log('   is added to your Google Cloud Console redirect URIs.');
  console.log('   (console.cloud.google.com → Credentials → your OAuth client → Authorized redirect URIs)\n');
  console.log('📂 Opening Chrome...\n');

  // Open Chrome with the auth URL
  exec(`google-chrome "${authUrl}" 2>/dev/null || xdg-open "${authUrl}" 2>/dev/null`, (err) => {
    if (err) console.log('Could not open browser automatically. Copy this URL:\n' + authUrl);
  });

  // Local server to catch the callback
  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:3333');
      if (url.pathname !== '/callback') return;

      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h2>❌ OAuth error: ${error}</h2><p>You can close this tab.</p>`);
        server.close();
        reject(new Error('OAuth error: ' + error));
        return;
      }

      if (!code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>❌ No code received</h2>');
        server.close();
        reject(new Error('No code in callback'));
        return;
      }

      try {
        console.log('✅ Got auth code — exchanging for tokens...');
        const tokens = await exchangeCode(code);

        if (tokens.error) throw new Error(tokens.error_description || tokens.error);
        if (!tokens.refresh_token) throw new Error('No refresh_token returned. Try revoking access at myaccount.google.com/permissions and re-running.');

        console.log('✅ Got tokens. Fetching calendar info...');
        const calendarEmail = await getCalendarEmail(tokens.access_token);
        console.log(`📅 Calendar: ${calendarEmail}`);

        console.log('💾 Saving to Supabase...');
        await saveToSupabase(tokens, calendarEmail);

        console.log('\n✅ Done! Google Calendar connected for Nexorra account.');
        console.log(`   Calendar: ${calendarEmail}`);
        console.log('   Refresh token saved — polling script can now run without re-auth.\n');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#09080f;color:#f0eeff">
            <h2 style="color:#8b7cf8">✅ Google Calendar Connected!</h2>
            <p style="color:#aaa">Calendar: <strong style="color:#fff">${calendarEmail}</strong></p>
            <p style="color:#aaa">You can close this tab.</p>
          </body></html>
        `);
        server.close();
        resolve();
      } catch (err) {
        console.error('❌ Error:', err.message);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h2>❌ Error: ${err.message}</h2><p>Check your terminal.</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(3333, () => {
      console.log('⏳ Waiting for Google to redirect back... (listening on port 3333)');
    });
    server.on('error', reject);
  });
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
