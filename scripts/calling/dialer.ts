#!/usr/bin/env npx tsx
/**
 * dialer.ts — Controls OpenPhone desktop app via Claude computer use + xdotool.
 *
 * Flow:
 *   1. Claude takes a screenshot and identifies the OpenPhone window
 *   2. xdotool focuses the window, opens new call, types the number, dials
 *   3. Claude monitors for ringing → answered → ended states
 *   4. Returns call status to caller
 *
 * Usage: npx tsx scripts/calling/dialer.ts --phone +1XXXXXXXXXX --name "Jane Smith"
 *        npx tsx scripts/calling/dialer.ts --test-dial +1XXXXXXXXXX
 */

import { execSync, execFileSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';

// ─── Config ─────────────────────────────────────────────────────────────────

const DISPLAY = process.env.DISPLAY || ':0';
const MAX_RING_WAIT_MS = 45_000;   // 45s to answer before declaring no-answer
const CALL_CHECK_INTERVAL_MS = 8_000;  // check call state every 8s via screenshot

// ─── Types ───────────────────────────────────────────────────────────────────

export type DialResult =
  | { status: 'ringing' }
  | { status: 'answered'; confirmedAt: number }
  | { status: 'no_answer' }
  | { status: 'busy' }
  | { status: 'failed'; reason: string }
  | { status: 'ended'; outcome: 'completed' | 'no_answer' | 'busy' };

// ─── Anthropic client ────────────────────────────────────────────────────────

function getClient(): Anthropic {
  const now = Date.now();

  // OAuth first (subscription auth — no API credits)
  try {
    const credsPath = join(process.env.HOME!, '.claude', '.credentials.json');
    const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));
    const oauth = creds?.claudeAiOauth;
    if (oauth?.accessToken && oauth.expiresAt > now) {
      return new Anthropic({ apiKey: oauth.accessToken });
    }
  } catch (_) {}

  // Fallback: API key
  if (process.env.ANTHROPIC_API_KEY) return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  throw new Error('No Anthropic credentials found');
}

// ─── Screenshot ──────────────────────────────────────────────────────────────

function takeScreenshot(): string {
  const path = '/tmp/openphone-screenshot.png';
  execSync(`DISPLAY=${DISPLAY} scrot -o ${path} 2>/dev/null || import -window root ${path}`, {
    timeout: 5000,
  });
  const data = readFileSync(path);
  return data.toString('base64');
}

// ─── xdotool helpers ─────────────────────────────────────────────────────────

function xdo(args: string[]): string {
  try {
    return execFileSync('xdotool', args, {
      env: { ...process.env, DISPLAY },
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
  } catch (_) {
    return '';
  }
}

function findOpenPhoneWindow(): string | null {
  const wid = xdo(['search', '--name', 'OpenPhone']) ||
              xdo(['search', '--name', 'Quo']);
  return wid || null;
}

function focusWindow(wid: string) {
  xdo(['windowfocus', '--sync', wid]);
  sleep(300);
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ─── Claude computer use ─────────────────────────────────────────────────────

async function askClaude(client: Anthropic, screenshot: string, question: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: screenshot },
        },
        { type: 'text', text: question },
      ],
    }],
  });

  return (msg.content[0] as any).text ?? '';
}

// ─── Dial ────────────────────────────────────────────────────────────────────

export async function dialNumber(
  phone: string,
  lead: { first_name?: string; source_brokerage?: string } = {},
): Promise<DialResult> {
  const client = getClient();

  console.log(`[dialer] Dialing ${phone}...`);

  // Step 1: Find OpenPhone window
  let wid = findOpenPhoneWindow();
  if (!wid) {
    console.log('[dialer] OpenPhone window not found — trying to launch...');
    execSync('quo &', { detached: true, stdio: 'ignore' } as any);
    sleep(3000);
    wid = findOpenPhoneWindow();
    if (!wid) {
      return { status: 'failed', reason: 'OpenPhone/Quo not running or window not found' };
    }
  }

  focusWindow(wid);

  // Step 2: Take screenshot, ask Claude to identify the dial/compose button
  const screenshot1 = takeScreenshot();
  const analysis = await askClaude(
    client,
    screenshot1,
    `This is the OpenPhone (Quo) desktop app. I need to make an outbound call to ${phone}.
     Look at the screen and tell me:
     1. Is there a "New Call", "Dial", or keypad icon visible? Where approximately (left/center/right, top/middle/bottom)?
     2. What keyboard shortcut or action should I use to open the dial pad?
     Answer in 2 short sentences only.`,
  );
  console.log(`[dialer] Claude analysis: ${analysis}`);

  // Step 3: Open new call — try keyboard shortcut first, then xdotool click
  // OpenPhone common shortcut: Ctrl+D or Ctrl+N for new call
  xdo(['key', '--clearmodifiers', 'ctrl+d']);
  sleep(800);

  // Re-screenshot to check if dial pad opened
  const screenshot2 = takeScreenshot();
  const dialPadOpen = await askClaude(
    client,
    screenshot2,
    'Is there a dial pad or phone number input field visible? Answer YES or NO only.',
  );

  if (!dialPadOpen.toUpperCase().includes('YES')) {
    // Try alternative: click the new call button based on Claude's earlier analysis
    xdo(['key', '--clearmodifiers', 'ctrl+shift+d']);
    sleep(800);
  }

  // Step 4: Type the phone number and dial
  xdo(['type', '--clearmodifiers', phone]);
  sleep(400);
  xdo(['key', 'Return']);
  sleep(1000);

  // Step 5: Confirm call is ringing
  const screenshot3 = takeScreenshot();
  const callState = await askClaude(
    client,
    screenshot3,
    `What is the current call state? Look for indicators like "Calling...", "Ringing", active call timer, etc.
     Answer with one of: RINGING, CONNECTED, IDLE, BUSY`,
  );
  console.log(`[dialer] Call state: ${callState}`);

  if (callState.includes('IDLE') || callState.includes('ERROR')) {
    return { status: 'failed', reason: `Unexpected state after dialing: ${callState}` };
  }

  if (callState.includes('BUSY')) {
    return { status: 'busy' };
  }

  return { status: 'ringing' };
}

// ─── Monitor call end ────────────────────────────────────────────────────────

export async function monitorCallEnd(): Promise<'completed' | 'no_answer' | 'busy'> {
  const client = getClient();
  const startTime = Date.now();

  while (true) {
    await new Promise(r => setTimeout(r, CALL_CHECK_INTERVAL_MS));

    const screenshot = takeScreenshot();
    const state = await askClaude(
      client,
      screenshot,
      `Look at the OpenPhone/Quo app. What is the call state?
       ACTIVE = call timer running, microphone visible
       ENDED = "Call ended", call summary shown, back to contact view
       RINGING = still ringing / waiting for answer
       Answer with one word: ACTIVE, ENDED, RINGING`,
    );

    console.log(`[dialer] Monitor state: ${state.trim()}`);

    if (state.includes('ENDED')) {
      return 'completed';
    }

    if (state.includes('RINGING') && Date.now() - startTime > MAX_RING_WAIT_MS) {
      console.log('[dialer] No answer after 45s');
      // End the call
      xdo(['key', 'Escape']);
      return 'no_answer';
    }
  }
}

// ─── SMS via OpenPhone computer use ─────────────────────────────────────────

export type SMSResult =
  | { status: 'sent' }
  | { status: 'failed'; reason: string };

/**
 * Send an SMS via OpenPhone (Quo) desktop app using Claude computer use.
 * Used by Petra's SMS outreach for local biz leads without email.
 * Must only be called during SMS window (10AM–1PM BST), not calling hours.
 */
export async function sendSMS(
  phone: string,
  message: string,
): Promise<SMSResult> {
  const client = getClient();

  console.log(`[dialer] Sending SMS to ${phone}...`);

  let wid = findOpenPhoneWindow();
  if (!wid) {
    execSync('quo &', { detached: true, stdio: 'ignore' } as any);
    sleep(3000);
    wid = findOpenPhoneWindow();
    if (!wid) {
      return { status: 'failed', reason: 'OpenPhone/Quo not running' };
    }
  }

  focusWindow(wid);

  // Ask Claude to identify how to open a new message
  const screenshot1 = takeScreenshot();
  const analysis = await askClaude(
    client,
    screenshot1,
    `This is the OpenPhone (Quo) desktop app. I need to send a text/SMS to ${phone}.
     Is there a "New Message", "Compose", or chat icon visible? Where is it?
     Answer in 1 short sentence.`,
  );
  console.log(`[dialer] SMS Claude analysis: ${analysis}`);

  // Try Ctrl+N (common new message shortcut in OpenPhone)
  xdo(['key', '--clearmodifiers', 'ctrl+shift+m']);
  sleep(800);

  const screenshot2 = takeScreenshot();
  const composerOpen = await askClaude(
    client,
    screenshot2,
    'Is there a text input or phone number field for composing a new message? Answer YES or NO.',
  );

  if (!composerOpen.toUpperCase().includes('YES')) {
    xdo(['key', '--clearmodifiers', 'ctrl+n']);
    sleep(800);
  }

  // Type the phone number
  xdo(['type', '--clearmodifiers', phone]);
  sleep(400);
  xdo(['key', 'Return']);
  sleep(600);

  // Type the message
  xdo(['type', '--clearmodifiers', message]);
  sleep(400);
  xdo(['key', 'Return']); // send
  sleep(1000);

  // Verify send
  const screenshot3 = takeScreenshot();
  const sent = await askClaude(
    client,
    screenshot3,
    `Did the SMS message get sent? Look for the message appearing in the conversation thread.
     Answer YES (message visible in thread) or NO.`,
  );

  if (sent.toUpperCase().includes('YES')) {
    console.log(`[dialer] SMS sent to ${phone}`);
    return { status: 'sent' };
  }

  return { status: 'failed', reason: 'Could not confirm SMS delivery in UI' };
}

// ─── CLI entry point ─────────────────────────────────────────────────────────

if (process.argv[1].includes('dialer')) {
  const args = process.argv.slice(2);
  const phoneIdx = args.indexOf('--phone');
  const testIdx = args.indexOf('--test-dial');

  const phone = phoneIdx >= 0 ? args[phoneIdx + 1] : args[testIdx + 1];

  if (!phone) {
    console.error('Usage: npx tsx scripts/calling/dialer.ts --phone +1XXXXXXXXXX');
    process.exit(1);
  }

  (async () => {
    const result = await dialNumber(phone);
    console.log('Dial result:', result);

    if (result.status === 'ringing') {
      console.log('Monitoring for call end...');
      const outcome = await monitorCallEnd();
      console.log('Call outcome:', outcome);
    }
  })().catch(console.error);
}
