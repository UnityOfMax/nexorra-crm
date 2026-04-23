const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9240', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('quo.com')) || pages[0];

  const result = await page.evaluate(() => {
    const out = [];

    // All buttons with aria-label or title
    document.querySelectorAll('button').forEach(el => {
      const label = el.getAttribute('aria-label') || el.title || el.textContent?.trim().slice(0, 40);
      const dt    = el.dataset?.testid || '';
      const cls   = el.className?.toString().slice(0, 60) || '';
      if (label || dt) out.push(`BUTTON  label="${label}" testid="${dt}" cls="${cls}"`);
    });

    // All inputs
    document.querySelectorAll('input, textarea').forEach(el => {
      out.push(`INPUT   tag=${el.tagName} type=${el.type} placeholder="${el.placeholder}" name="${el.name}" testid="${el.dataset?.testid||''}"`);
    });

    // All contenteditable
    document.querySelectorAll('[contenteditable]').forEach(el => {
      const ph = el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '';
      out.push(`EDITABLE  placeholder="${ph}" cls="${el.className?.toString().slice(0,60)}"`);
    });

    // All [data-testid] elements
    document.querySelectorAll('[data-testid]').forEach(el => {
      out.push(`TESTID  ${el.dataset.testid}  tag=${el.tagName}  text="${el.textContent?.trim().slice(0,40)}"`);
    });

    // All links/nav items
    document.querySelectorAll('a[href], [role="tab"], [role="menuitem"], [role="option"]').forEach(el => {
      out.push(`NAV     href="${el.href||''}" role="${el.getAttribute('role')||''}" text="${el.textContent?.trim().slice(0,40)}"`);
    });

    // Left sidebar / nav elements with phone-like text
    document.querySelectorAll('nav *, aside *, [class*="sidebar"] *, [class*="Sidebar"] *').forEach(el => {
      const text = el.textContent?.trim();
      if (text && /\d{10}|\(\d{3}\)|\+1/.test(text) && el.children.length === 0) {
        out.push(`PHONE   tag=${el.tagName} cls="${el.className?.toString().slice(0,50)}" text="${text.slice(0,60)}"`);
      }
    });

    return out;
  });

  result.forEach(l => console.log(l));
  browser.disconnect();
})();
