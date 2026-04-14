/**
 * Gmail API client — plain-text cold outreach via OAuth2.
 * Tokens stored per-account at ~/.gmail-tokens/account-{index}.json
 * Scope: https://www.googleapis.com/auth/gmail.send
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TOKEN_DIR = path.join(os.homedir(), '.gmail-tokens');
const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export interface GmailAccount {
  index: number;   // 0–4, maps to token file
  email: string;   // the gmail address
  clientId: string;
  clientSecret: string;
}

export interface SendEmailOptions {
  from: string;    // sender email address
  to: string;
  subject: string;
  body: string;    // plain text only
  replyTo?: string;
}

function tokenPath(accountIndex: number): string {
  return path.join(TOKEN_DIR, `account-${accountIndex}.json`);
}

function buildOAuth2Client(account: GmailAccount) {
  return new google.auth.OAuth2(
    account.clientId,
    account.clientSecret,
  );
}

/** Load saved tokens; returns null if not configured yet. */
export async function loadTokens(accountIndex: number): Promise<any | null> {
  const p = tokenPath(accountIndex);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function saveTokens(accountIndex: number, tokens: any): void {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  fs.writeFileSync(tokenPath(accountIndex), JSON.stringify(tokens, null, 2), 'utf-8');
}

/** Returns the OAuth consent URL for initial setup. */
export async function getAuthUrl(account: GmailAccount, redirectUri: string): Promise<string> {
  const auth = buildOAuth2Client(account);
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPE,
    redirect_uri: redirectUri,
    prompt: 'consent',
  });
}

/** Exchange auth code for tokens and persist to disk. */
export async function exchangeCode(
  account: GmailAccount,
  code: string,
  redirectUri: string,
): Promise<void> {
  const auth = buildOAuth2Client(account);
  const { tokens } = await auth.getToken({ code, redirect_uri: redirectUri });
  saveTokens(account.index, tokens);
}

/**
 * Send a plain-text email via Gmail API.
 * Returns the sent Gmail message ID.
 */
export async function sendGmail(
  account: GmailAccount,
  opts: SendEmailOptions,
): Promise<string> {
  const tokens = await loadTokens(account.index);
  if (!tokens) {
    throw new Error(`Gmail account ${account.index} (${account.email}) is not set up. Run gmail-setup.ts first.`);
  }

  const auth = buildOAuth2Client(account);
  auth.setCredentials(tokens);

  // Auto-save refreshed tokens
  auth.on('tokens', (refreshed) => {
    const merged = { ...tokens, ...refreshed };
    saveTokens(account.index, merged);
  });

  const gmail = google.gmail({ version: 'v1', auth });

  // Build RFC 2822 message
  const lines: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ];
  if (opts.replyTo) {
    lines.push(`Reply-To: ${opts.replyTo}`);
  }
  lines.push('', opts.body);

  const raw = Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return res.data.id ?? '';
}
