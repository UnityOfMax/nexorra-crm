const puppeteer = require('puppeteer');

async function dmUser(handle, firstName, brokerage, landingUrl) {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9225', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  
  async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
  function randDelay(min, max) { return delay(Math.floor(Math.random() * (max - min)) + min); }
  async function sendMsg(text) {
    const inp = await page.$('[aria-label="Message"]') || await page.$('[placeholder="Message..."]') || await page.$('div[contenteditable="true"]');
    if (!inp) { return false; }
    await inp.click(); await randDelay(300, 500);
    for (const c of text) { await page.keyboard.type(c, { delay: Math.random() * 80 + 50 }); }
    await randDelay(400, 700); await page.keyboard.press('Enter'); await randDelay(900, 1400);
    return true;
  }
  
  // Open compose
  await page.click('svg[aria-label="New message"]');
  await delay(2000);
  const si = await page.$('input[placeholder="Search..."]');
  if (!si) { console.log('NO_INPUT'); await browser.disconnect(); return 'error'; }
  await si.type(handle, { delay: 75 });
  await delay(2500);
  
  // Find exact handle match
  const res = await page.evaluateHandle((h) => {
    const spans = document.querySelectorAll('span');
    for (const s of spans) {
      if (s.textContent.trim().toLowerCase() === h.toLowerCase()) {
        let el = s.parentElement;
        for (let i = 0; i < 6; i++) {
          if (el && (el.getAttribute('role') === 'option' || el.tagName === 'LI')) break;
          if (el) el = el.parentElement;
        }
        return el || s.parentElement;
      }
    }
    return null;
  }, handle);
  
  const resEl = res.asElement ? res.asElement() : null;
  if (!resEl) {
    await page.click('svg[aria-label="Close"]').catch(() => {});
    await delay(1000);
    console.log('NOT_FOUND:' + handle);
    await browser.disconnect();
    return 'not_found';
  }
  
  await resEl.click(); await delay(1000);
  const chatBtn = await page.evaluateHandle(() => {
    const bs = document.querySelectorAll('div[role="button"], button');
    for (const b of bs) { if (b.textContent.trim() === 'Chat') return b; }
    return null;
  });
  const chatEl = chatBtn.asElement ? chatBtn.asElement() : null;
  if (!chatEl) { console.log('NO_CHAT'); await browser.disconnect(); return 'error'; }
  await chatEl.click(); await delay(2000);
  console.log('CHAT:' + page.url());
  
  const msg1 = `Hey ${firstName}, I'm Max. I just wanted to break the ice. We've helped over 100 other realestate agents close on average 3 extra deals per month`;
  const msg2 = `I found you on ${brokerage}'s website and I thought you'd be a great fit for this, I recorded a video for you explaining everything if you're interested:`;
  const msg3 = landingUrl;
  
  const r1 = await sendMsg(msg1); console.log('Msg1:' + (r1 ? 'sent' : 'fail'));
  if (r1) {
    await randDelay(9000, 13000);
    const r2 = await sendMsg(msg2); console.log('Msg2:' + (r2 ? 'sent' : 'fail'));
    if (r2) {
      await randDelay(8000, 11000);
      const r3 = await sendMsg(msg3); console.log('Msg3:' + (r3 ? 'sent' : 'fail'));
    }
  }
  
  await browser.disconnect();
  return r1 ? 'sent' : 'error';
}

const [handle, firstName, brokerage, landingUrl] = process.argv.slice(2);
dmUser(handle, firstName, brokerage, landingUrl).then(r => { console.log('RESULT:' + r); process.exit(0); }).catch(e => { console.log('ERROR:' + e.message); process.exit(1); });
