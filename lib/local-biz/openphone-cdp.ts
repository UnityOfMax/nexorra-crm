/**
 * OpenPhone CDP SMS Sender
 * Controls app.openphone.com via Chrome remote debugging (port 9240).
 * Chrome must be running with a logged-in OpenPhone session on port 9240.
 *
 * Usage:
 *   import { sendSMSviaOpenPhone } from './openphone-cdp';
 *   const result = await sendSMSviaOpenPhone('+14785551234', 'Your message here');
 */

import puppeteer, { Browser, Page } from 'puppeteer';

const OPENPHONE_URL = 'https://app.openphone.com';
const CDP_PORT = process.env.OPENPHONE_CDP_PORT
  ? parseInt(process.env.OPENPHONE_CDP_PORT)
  : 9240;

export type SMSResult =
  | { status: 'sent' }
  | { status: 'failed'; reason: string };

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function connectToChrome(): Promise<Browser> {
  return puppeteer.connect({ browserURL: `http://localhost:${CDP_PORT}` });
}

async function getOpenPhonePage(browser: Browser): Promise<Page> {
  const pages = await browser.pages();
  for (const p of pages) {
    const url = p.url();
    if (url.includes('openphone.com')) return p;
  }
  // No existing OpenPhone tab — open one
  const page = pages[0] || await browser.newPage();
  await page.goto(OPENPHONE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2000);
  return page;
}

async function isLoggedIn(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // OpenPhone shows a sidebar when logged in
    return !!(
      document.querySelector('[data-testid="sidebar"]') ||
      document.querySelector('nav') ||
      document.querySelector('[class*="sidebar"]') ||
      document.querySelector('[class*="Sidebar"]') ||
      // Auth pages have email/password inputs
      !document.querySelector('input[type="email"]')
    );
  });
}

async function clickNewMessage(page: Page): Promise<boolean> {
  // OpenPhone: top-left "New conversation" compose button (pencil/edit icon)
  const selectors = [
    'button[data-testid="new-conversation-button"]',
    'button[aria-label*="New conversation"]',
    'button[aria-label*="Compose"]',
    'button[aria-label*="new message"]',
    '[data-testid="compose-button"]',
    'button[title*="New"]',
    '[class*="compose"]',
    '[class*="newConversation"]',
    '[class*="new-conversation"]',
  ];

  for (const sel of selectors) {
    const found = await page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement | null;
      if (el) { el.click(); return true; }
      return false;
    }, sel);
    if (found) return true;
  }

  // Fallback: look for pencil/edit SVG buttons in the sidebar area
  const found = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    // "New" or "Compose" text, or a button with a pencil-like aria label
    const btn = buttons.find(b => {
      const label = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase();
      return label.includes('new') || label.includes('compose') || label.includes('write');
    });
    if (btn) { btn.click(); return true; }
    return false;
  });

  return found;
}

async function enterRecipient(page: Page, phone: string): Promise<boolean> {
  await sleep(800);

  const selectors = [
    'input[placeholder*="Name or number"]',
    'input[placeholder*="name or number"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="phone"]',
    'input[placeholder*="Phone"]',
    'input[aria-label*="recipient"]',
    'input[aria-label*="To"]',
    'input[data-testid*="recipient"]',
    'input[data-testid*="to"]',
  ];

  let inputSel: string | null = null;
  for (const sel of selectors) {
    const exists = await page.$(sel);
    if (exists) { inputSel = sel; break; }
  }

  // Fallback: any visible input that appeared after clicking compose
  if (!inputSel) {
    inputSel = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      const visible = inputs.find((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return visible ? '#' + (visible as HTMLElement).id || null : null;
    });
  }

  if (!inputSel) return false;

  await page.click(inputSel);
  await sleep(300);
  await page.type(inputSel, phone, { delay: 60 });
  await sleep(800);

  // Press Enter or click the matching suggestion
  const selected = await page.evaluate((ph) => {
    // Look for a dropdown suggestion containing this phone number
    const items = Array.from(document.querySelectorAll('[role="option"], [role="listitem"], [data-testid*="result"]'));
    const match = items.find(el => el.textContent?.includes(ph.slice(-7)));
    if (match) { (match as HTMLElement).click(); return true; }
    return false;
  }, phone);

  if (!selected) {
    await page.keyboard.press('Enter');
  }

  await sleep(600);
  return true;
}

async function typeAndSendMessage(page: Page, message: string): Promise<boolean> {
  await sleep(500);

  const selectors = [
    '[data-testid="message-input"]',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="Message"]',
    'div[contenteditable="true"][data-testid*="message"]',
    'div[contenteditable="true"][aria-label*="message"]',
    'div[contenteditable="true"][aria-label*="Message"]',
    'div[contenteditable="true"][placeholder*="message"]',
    'div[contenteditable="true"]',
    'textarea',
  ];

  let composeSel: string | null = null;
  for (const sel of selectors) {
    const exists = await page.$(sel);
    if (exists) { composeSel = sel; break; }
  }

  if (!composeSel) return false;

  const el = await page.$(composeSel);
  if (!el) return false;

  await el.click();
  await sleep(300);

  // Use keyboard.type for natural feel
  await page.keyboard.type(message, { delay: 25 });
  await sleep(500);

  // Try send button first, fall back to Enter
  const sentViaButton = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const sendBtn = buttons.find(b => {
      const label = (b.getAttribute('aria-label') || b.textContent || '').toLowerCase();
      return label.includes('send') || b.getAttribute('type') === 'submit';
    });
    if (sendBtn && !(sendBtn as HTMLButtonElement).disabled) {
      sendBtn.click();
      return true;
    }
    return false;
  });

  if (!sentViaButton) {
    await page.keyboard.press('Enter');
  }

  await sleep(1000);
  return true;
}

async function verifySent(page: Page, phone: string): Promise<boolean> {
  // Check the conversation list or last message confirms send
  return page.evaluate(() => {
    // Look for a sent message indicator (check mark, "Delivered", or message in thread)
    const indicators = Array.from(document.querySelectorAll('[class*="sent"], [class*="delivered"], [data-testid*="sent"]'));
    return indicators.length > 0;
  });
}

export async function sendSMSviaOpenPhone(
  phone: string,
  message: string,
): Promise<SMSResult> {
  let browser: Browser | null = null;

  try {
    browser = await connectToChrome();
    const page = await getOpenPhonePage(browser);

    // Verify we're logged in
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      return { status: 'failed', reason: 'OpenPhone not logged in — manual login required on port 9240' };
    }

    // Open new message compose
    const opened = await clickNewMessage(page);
    if (!opened) {
      return { status: 'failed', reason: 'Could not find compose/new message button in OpenPhone UI' };
    }

    // Enter recipient phone number
    const recipientEntered = await enterRecipient(page, phone);
    if (!recipientEntered) {
      return { status: 'failed', reason: 'Could not enter recipient phone number' };
    }

    // Type and send the message
    const messageSent = await typeAndSendMessage(page, message);
    if (!messageSent) {
      return { status: 'failed', reason: 'Could not find message compose area' };
    }

    return { status: 'sent' };

  } catch (err: any) {
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
      return { status: 'failed', reason: `Chrome not running on port ${CDP_PORT} — run scripts/chrome-launch-openphone.sh` };
    }
    return { status: 'failed', reason: err.message };
  } finally {
    if (browser) {
      try { browser.disconnect(); } catch (_) {}
    }
  }
}
