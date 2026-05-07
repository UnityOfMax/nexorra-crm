#!/usr/bin/env node
/**
 * Send DMs for a specific account
 * Usage: node /tmp/send_dms.js <account_index>
 * Account index: 0=maximillian_fawcett, 1=_mmmmmmmax, 2=maximefawcett, 3=fawcettmaximilian, 4=maxwellfawctt
 */

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rnd(min, max) { return new Promise(r => setTimeout(r, Math.random()*(max-min)+min)); }

async function updateLead(leadId, status, username, isDmSent) {
  const now = new Date().toISOString();
  const body = {
    instagram_status: status,
    instagram_dm_account: username,
  };
  if (isDmSent) {
    body.instagram_dm_sent = true;
    body.instagram_dm_sent_at = now;
  }
  
  try {
    const bodyStr = JSON.stringify(body).replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
    execSync(`curl -s -X PATCH "${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}" \
      -H "apikey: ${SUPABASE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d '${bodyStr}'`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log(`  [db] Update failed: ${e.message.substring(0,80)}`);
    return false;
  }
}

async function findAndClickMsgInput(page) {
  return await page.$('textarea[placeholder*="Message"]') ||
         await page.$('div[role="textbox"][contenteditable="true"]') ||
         await page.$('textarea') ||
         await page.$('p[data-lexical-editor="true"]') ||
         await page.$('[contenteditable="true"]');
}

async function typeMessage(page, msgInput, text) {
  await msgInput.click();
  await sleep(300);
  for (const char of text) {
    await page.keyboard.type(char, { delay: Math.random() * 60 + 30 });
  }
  await sleep(400);
  await page.keyboard.press('Enter');
}

(async () => {
  const plan = JSON.parse(fs.readFileSync('/tmp/ig_plan.json', 'utf8'));
  
  const accounts = [
    { username: 'maximillian_fawcett', password: 'fgy-3!BV' },
    { username: '_mmmmmmmax', password: 'fgy-3!BV' },
    { username: 'maximefawcett', password: 'blueBird0n!hJ' },
    { username: 'fawcettmaximilian', password: 'gErt9q12z?-' },
    { username: 'maxwellfawctt', password: 'BaJiWvS5ha:ygG3' },
  ];
  
  const accountIdx = parseInt(process.argv[2] || '4');
  const account = accounts[accountIdx];
  const leads = plan.plan[account.username] || [];
  
  console.log(`\n=== DM SESSION: ${account.username} (${leads.length} leads) ===`);
  
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9225' });
  const pages = await browser.pages();
  let page = pages[0];
  
  const results = { sent: 0, skipped: 0, details: [] };
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const handle = lead.instagram_handle;
    const firstName = lead.first_name || 'there';
    const brokerage = lead.source_brokerage || 'your brokerage';
    const landingUrl = lead.landing_page_url;
    const brokerageDisplay = brokerage === 'bhhs' ? 'BHHS' : brokerage === 'remax' ? 'RE/MAX' : brokerage.toUpperCase();
    
    console.log(`\n[${i+1}/${leads.length}] @${handle} (${firstName} ${lead.last_name || ''}) — ${brokerageDisplay}`);
    console.log(`  URL: https://app.nexorra.io/video/${lead.landing_page_id}`);
    
    try {
      // Navigate to profile
      await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(2000);
      
      const pageUrl = page.url();
      const pageTitle = await page.title().catch(() => '');
      
      // Check redirect to login
      if (pageUrl.includes('/accounts/login')) {
        console.log('  WARN: Redirected to login - session expired?');
        results.details.push({ handle, status: 'session_expired' });
        results.skipped++;
        continue;
      }
      
      // Check if profile exists
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 300) || '').catch(() => '');
      if (bodyText.includes("Sorry, this page") || bodyText.includes("Page Not Found") || bodyText.includes("isn't available")) {
        console.log(`  SKIP: Profile not found`);
        await updateLead(lead.id, 'not_found', account.username, false);
        results.details.push({ handle, status: 'not_found' });
        results.skipped++;
        await rnd(5000, 10000);
        continue;
      }
      
      // Look for Message button
      console.log('  Looking for Message button...');
      const msgBtnClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('div[role="button"], button'));
        const msgBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Message');
        if (msgBtn) { msgBtn.click(); return true; }
        return false;
      });
      
      if (!msgBtnClicked) {
        console.log(`  SKIP: No Message button (private or disabled)`);
        await updateLead(lead.id, 'private', account.username, false);
        results.details.push({ handle, status: 'private' });
        results.skipped++;
        await rnd(8000, 15000);
        continue;
      }
      
      console.log('  Message button clicked, waiting for DM thread...');
      await sleep(3000);
      
      // Dismiss any prompts
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const notNow = btns.find(b => b.textContent.trim() === 'Not Now' || b.textContent.trim() === 'Not now');
        if (notNow) { notNow.click(); }
      });
      await sleep(1000);
      
      // Find message input
      let msgInput = await findAndClickMsgInput(page);
      
      if (!msgInput) {
        console.log(`  SKIP: Message input not found`);
        results.details.push({ handle, status: 'no_input' });
        results.skipped++;
        await rnd(8000, 15000);
        continue;
      }
      
      // Send Message 2 (intro)
      const msg2 = `Hey ${firstName}, I'm Max. I just wanted to break the ice. We've helped over 100 other realestate agents close on average 3 extra deals per month`;
      console.log(`  Sending msg2: "${msg2.substring(0, 60)}..."`);
      await typeMessage(page, msgInput, msg2);
      await rnd(9000, 15000);
      
      // Re-find input for msg3
      msgInput = await findAndClickMsgInput(page);
      if (msgInput) {
        const msg3 = `I found you on ${brokerageDisplay}'s website and I thought you'd be a great fit for this, I recorded a video for you explaining everything if you're interested:`;
        console.log(`  Sending msg3: "${msg3.substring(0, 60)}..."`);
        await typeMessage(page, msgInput, msg3);
        await rnd(9000, 15000);
      }
      
      // Re-find input for msg4 (URL)
      msgInput = await findAndClickMsgInput(page);
      if (msgInput) {
        console.log(`  Sending msg4 (URL): ${landingUrl}`);
        await typeMessage(page, msgInput, landingUrl);
        await sleep(3000);
      }
      
      console.log(`  ✓ DMs SENT to @${handle}`);
      await updateLead(lead.id, 'dm_sent', account.username, true);
      results.sent++;
      results.details.push({ handle, status: 'sent', first_name: firstName });
      
      // Wait 60-90s between DMs (except last one)
      if (i < leads.length - 1) {
        const waitMs = Math.floor(Math.random() * 30000) + 60000;
        console.log(`  Waiting ${Math.floor(waitMs/1000)}s before next lead...`);
        await sleep(waitMs);
      }
      
    } catch (err) {
      console.log(`  ERROR for @${handle}: ${err.message.substring(0, 100)}`);
      results.details.push({ handle, status: 'error', error: err.message.substring(0, 100) });
      results.skipped++;
      await rnd(10000, 20000);
    }
  }
  
  await browser.disconnect();
  
  console.log(`\n=== ${account.username} COMPLETE: ${results.sent} sent, ${results.skipped} skipped ===`);
  fs.writeFileSync(`/tmp/ig_results_${account.username}.json`, JSON.stringify(results, null, 2));
  
  process.exit(0);
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
