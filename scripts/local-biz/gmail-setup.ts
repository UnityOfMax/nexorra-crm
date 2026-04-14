#!/usr/bin/env npx tsx
/**
 * Gmail OAuth2 setup wizard — configure accounts 0–4.
 * Uses copy-paste code flow (urn:ietf:wg:oauth:2.0:oob redirect).
 *
 * Usage: npx tsx scripts/local-biz/gmail-setup.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

import * as fs from 'fs';
import * as readline from 'readline';
import * as os from 'os';
import * as path from 'path';
import { getAuthUrl, exchangeCode, loadTokens } from '../../lib/gmail/client';
import type { GmailAccount } from '../../lib/gmail/client';

const ACCOUNTS_FILE = resolve(__dirname, '../../.gmail-accounts.json');
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const MAX_ACCOUNTS = 5;

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function loadAccountsFile(): Array<{ index: number; email: string }> {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveAccountsFile(accounts: Array<{ index: number; email: string }>): void {
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

async function main() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Error: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env.local');
    console.error('Create an OAuth2 app at https://console.cloud.google.com/ with Gmail send scope.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log('\n=== Gmail Account Setup ===\n');

    // Show current status
    const accountsMap = loadAccountsFile();
    console.log('Current status (accounts 0–4):');
    for (let i = 0; i < MAX_ACCOUNTS; i++) {
      const saved = accountsMap.find(a => a.index === i);
      const tokens = await loadTokens(i);
      const email = saved?.email ?? '(not configured)';
      const tokenStatus = tokens ? '✓ tokens saved' : '✗ no tokens';
      console.log(`  [${i}] ${email} — ${tokenStatus}`);
    }

    console.log('');
    const indexStr = await prompt(rl, 'Which account index to set up (0–4)? ');
    const index = parseInt(indexStr.trim(), 10);

    if (isNaN(index) || index < 0 || index >= MAX_ACCOUNTS) {
      console.error('Invalid index. Must be 0–4.');
      process.exit(1);
    }

    const emailInput = await prompt(rl, `Gmail address for account ${index}: `);
    const email = emailInput.trim().toLowerCase();

    if (!email.includes('@')) {
      console.error('Invalid email address.');
      process.exit(1);
    }

    const account: GmailAccount = {
      index,
      email,
      clientId: clientId!,
      clientSecret: clientSecret!,
    };

    const authUrl = await getAuthUrl(account, REDIRECT_URI);

    console.log('\n---');
    console.log(`Open this URL in Chrome while logged in as ${email}:`);
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('After authorising, Google will show a code. Copy it and paste it below.');
    console.log('---\n');

    const code = await prompt(rl, 'Paste the authorisation code: ');

    if (!code.trim()) {
      console.error('No code entered. Aborting.');
      process.exit(1);
    }

    console.log('\nExchanging code for tokens...');
    await exchangeCode(account, code.trim(), REDIRECT_URI);

    // Update accounts mapping
    const accounts = loadAccountsFile();
    const existing = accounts.findIndex(a => a.index === index);
    if (existing >= 0) {
      accounts[existing].email = email;
    } else {
      accounts.push({ index, email });
    }
    accounts.sort((a, b) => a.index - b.index);
    saveAccountsFile(accounts);

    console.log(`\nSuccess! Account ${index} (${email}) configured.`);
    console.log(`Tokens saved to ~/.gmail-tokens/account-${index}.json`);
    console.log(`Accounts map saved to .gmail-accounts.json`);

    // Show updated status
    console.log('\nUpdated status:');
    for (let i = 0; i < MAX_ACCOUNTS; i++) {
      const saved = accounts.find(a => a.index === i);
      const tokens = await loadTokens(i);
      const acctEmail = saved?.email ?? '(not configured)';
      const tokenStatus = tokens ? '✓ ready' : '✗ not set up';
      console.log(`  [${i}] ${acctEmail} — ${tokenStatus}`);
    }
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
