#!/usr/bin/env node
/**
 * Google OAuth — Home Consulting AI calendar access.
 * Saves tokens to agents/state/hcai-google-tokens.json (separate from Nexorra).
 *
 * Usage: node scripts/hcai-google-oauth.js
 */
'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
require('dotenv').config({ path: '.env.local' });

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = 'http://localhost:3333/callback';
const TOKENS_FILE   = path.join(__dirname, '../agents/state/hcai-google-tokens.json');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ');

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code',
  scope: SCOPES, access_type: 'offline', prompt: 'consent',
})}`;

console.log('\nHCAI Google Calendar OAuth');
console.log('─'.repeat(50));
console.log('\nOpen this URL in your browser and log in as maxfwcett@gmail.com:\n');
console.log(authUrl);
console.log('\nWaiting for callback on http://localhost:3333/callback ...\n');

const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://localhost:3333');
  const code = url.searchParams.get('code');
  const err  = url.searchParams.get('error');

  if (err) {
    res.end(`<h2>Error: ${err}</h2>`);
    console.error('OAuth error:', err);
    server.close();
    process.exit(1);
  }

  if (!code) { res.end('Waiting...'); return; }

  res.end('<h2>Done — you can close this tab.</h2>');

  // Exchange code for tokens
  const body = new URLSearchParams({
    code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
  }).toString();

  const tokReq = https.request({
    hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
  }, (tokRes) => {
    let d = ''; tokRes.on('data', c => d += c);
    tokRes.on('end', async () => {
      const tokens = JSON.parse(d);
      if (!tokens.access_token) { console.error('Token exchange failed:', d); server.close(); process.exit(1); }

      // List calendars so we can find "Extra"
      const calRes = await new Promise(r => {
        const cr = https.request({
          hostname: 'www.googleapis.com', path: '/calendar/v3/users/me/calendarList',
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d))); });
        cr.on('error', () => r({}));
        cr.end();
      });

      const calendars = calRes.items || [];
      console.log('\nCalendars found:');
      calendars.forEach(c => console.log(` - "${c.summary}" | ${c.id}`));

      const extra = calendars.find(c => c.summary?.toLowerCase() === 'extra');
      if (extra) {
        console.log(`\n✓ Found "Extra" calendar: ${extra.id}`);
      } else {
        console.log('\n"Extra" calendar not found in list above — check the name matches exactly.');
      }

      // Save tokens
      const save = {
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry:  new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        extra_calendar_id: extra?.id || null,
        saved_at: new Date().toISOString(),
      };
      fs.mkdirSync(path.dirname(TOKENS_FILE), { recursive: true });
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(save, null, 2));
      console.log('\nTokens saved to:', TOKENS_FILE);
      server.close();
    });
  });
  tokReq.on('error', e => { console.error(e); server.close(); });
  tokReq.write(body);
  tokReq.end();
});

server.listen(3333);
