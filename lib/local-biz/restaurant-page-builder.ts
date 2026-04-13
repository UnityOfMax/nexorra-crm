/**
 * Restaurant website demo builder.
 * Completely independent from the salon dark-luxury builder.
 *
 * Design language:
 *   - Fonts: Oswald (condensed bold display) + Lora (serif body)
 *   - Palette: deep smoke #14100A, hot amber #E8920A, parchment #F2E4C8, ash #9A876C
 *   - Layout: full-bleed moody hero, traditional menu format, editorial split, pull-quote, inline reservation
 *   - No card grids, no Tailwind — pure CSS, completely different from salon builder
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function p(idx: number, biz: BizPageData, fallback = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80'): string {
  return biz.photos[idx] || fallback;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function htmlHead(title: string, desc: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --smoke:#14100A;
  --smoke2:#1E1810;
  --smoke3:#2A2218;
  --ember:#E8920A;
  --ember2:#C47A06;
  --parch:#F2E4C8;
  --parch2:#E8D5B0;
  --ash:#9A876C;
  --cream:#FAF6EE;
  --on-dark:#F2E4C8;
  --on-light:#2A1F12;
}
body{background:var(--smoke);color:var(--on-dark);font-family:'Lora',Georgia,serif;line-height:1.7;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%;height:auto}
a{color:inherit;text-decoration:none}
button{cursor:pointer;font-family:inherit;border:none;outline:none}

/* ── Nav ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 2.5rem;height:72px;background:rgba(20,16,10,0.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(232,146,10,0.2)}
.nav-brand{font-family:'Oswald',sans-serif;font-weight:700;font-size:1.25rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--on-dark)}
.nav-links{display:flex;align-items:center;gap:2rem}
.nav-links a{font-family:'Oswald',sans-serif;font-size:0.85rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--ash);transition:color .2s}
.nav-links a:hover{color:var(--on-dark)}
.nav-cta{background:var(--ember);color:var(--smoke)!important;padding:0.55rem 1.35rem;font-weight:600;letter-spacing:0.08em;transition:background .2s!important}
.nav-cta:hover{background:var(--ember2)!important}
.nav-toggle{display:none;flex-direction:column;gap:5px;cursor:pointer}
.nav-toggle span{width:24px;height:2px;background:var(--on-dark);display:block}
@media(max-width:768px){
  .nav{padding:0 1.25rem}
  .nav-links{display:none;position:fixed;top:72px;left:0;right:0;background:var(--smoke2);flex-direction:column;padding:1.5rem;gap:1.25rem;border-bottom:1px solid rgba(232,146,10,0.2)}
  .nav-links.open{display:flex}
  .nav-toggle{display:flex}
}

/* ── Amber stat bar ── */
.stat-bar{background:var(--ember);display:flex;align-items:center;justify-content:center;gap:0;padding:0}
.stat-bar-inner{display:flex;align-items:center;justify-content:center;width:100%;max-width:900px}
.stat-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.1rem 1rem;font-family:'Oswald',sans-serif;color:var(--smoke);text-transform:uppercase;letter-spacing:0.08em}
.stat-item + .stat-item{border-left:1px solid rgba(20,16,10,0.2)}
.stat-num{font-size:1.4rem;font-weight:700;line-height:1}
.stat-lbl{font-size:0.65rem;font-weight:400;margin-top:3px;opacity:0.75;letter-spacing:0.15em}
@media(max-width:600px){.stat-bar-inner{flex-wrap:wrap}.stat-item{flex:50%;border:none;border-top:1px solid rgba(20,16,10,0.1)}}

/* ── Section headers ── */
.section-tag{text-align:center;font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:0.25em;text-transform:uppercase;color:var(--ember);margin-bottom:0.6rem}
.section-title{text-align:center;font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2rem,4vw,3rem);text-transform:uppercase;letter-spacing:0.06em}
.section-rule{display:flex;align-items:center;gap:1rem;margin:1.5rem auto;max-width:120px}
.section-rule::before,.section-rule::after{content:'';flex:1;height:1px;background:var(--ash)}
.section-rule-dot{width:6px;height:6px;border-radius:50%;background:var(--ember);flex-shrink:0}

/* ── Menu row (traditional format) ── */
.menu-row{display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.15rem}
.menu-row-name{font-family:'Oswald',sans-serif;font-weight:500;font-size:1.05rem;letter-spacing:0.03em;white-space:nowrap}
.menu-row-dots{flex:1;border-bottom:1px dotted var(--ash);margin-bottom:4px;min-width:20px}
.menu-row-price{font-family:'Oswald',sans-serif;font-weight:700;color:var(--ember);white-space:nowrap}
.menu-item-desc{font-size:0.88rem;color:var(--ash);line-height:1.5;margin-bottom:1.5rem}

/* ── Gallery ── */
.gallery-masonry{columns:3;column-gap:4px;padding:4px}
.gallery-masonry img{width:100%;margin-bottom:4px;display:block;break-inside:avoid}
@media(max-width:640px){.gallery-masonry{columns:2}}

/* ── Forms ── */
.form-input{background:rgba(255,255,255,0.06);border:1px solid rgba(242,228,200,0.2);color:var(--on-dark);padding:0.75rem 1rem;font-family:'Lora',serif;font-size:0.95rem;width:100%;transition:border-color .2s}
.form-input:focus{outline:none;border-color:var(--ember);background:rgba(255,255,255,0.09)}
.form-input::placeholder{color:var(--ash)}
.form-label{font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--ash);display:block;margin-bottom:0.4rem}
select.form-input option{background:var(--smoke2)}

/* ── Booking steps ── */
.party-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-top:1rem}
@media(max-width:400px){.party-grid{grid-template-columns:repeat(4,1fr)}}
.party-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(242,228,200,0.15);color:var(--on-dark);padding:0.85rem 0.5rem;font-family:'Oswald',sans-serif;font-size:1rem;letter-spacing:0.05em;transition:all .15s}
.party-btn:hover,.party-btn.active{background:var(--ember);border-color:var(--ember);color:var(--smoke)}
.time-grid{display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem}
.time-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(242,228,200,0.15);color:var(--on-dark);padding:0.6rem 1rem;font-family:'Oswald',sans-serif;font-size:0.85rem;letter-spacing:0.05em;transition:all .15s}
.time-btn:hover,.time-btn.active{background:var(--ember);border-color:var(--ember);color:var(--smoke)}
.time-section-label{font-family:'Oswald',sans-serif;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ash);margin-top:1.2rem;margin-bottom:0.4rem}

/* ── CTA Button ── */
.btn-primary{display:inline-flex;align-items:center;justify-content:center;background:var(--ember);color:var(--smoke);font-family:'Oswald',sans-serif;font-weight:700;font-size:0.9rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.9rem 2.2rem;transition:background .2s,transform .15s;border:none;cursor:pointer}
.btn-primary:hover{background:var(--ember2);transform:translateY(-1px)}
.btn-outline{display:inline-flex;align-items:center;justify-content:center;border:2px solid var(--on-dark);color:var(--on-dark);font-family:'Oswald',sans-serif;font-weight:600;font-size:0.9rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.85rem 2rem;transition:all .2s;background:transparent}
.btn-outline:hover{background:var(--on-dark);color:var(--smoke)}

/* ── Footer ── */
.footer{background:var(--smoke);border-top:1px solid rgba(232,146,10,0.2);padding:4rem 2.5rem 2rem}
.footer-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3rem;max-width:960px;margin:0 auto}
.footer-brand{font-family:'Oswald',sans-serif;font-weight:700;font-size:1.5rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--on-dark);margin-bottom:0.75rem}
.footer-tagline{font-size:0.9rem;color:var(--ash);line-height:1.6}
.footer-heading{font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ember);margin-bottom:1rem}
.footer-text{font-size:0.88rem;color:var(--ash);line-height:1.8}
.footer-text a{color:var(--on-dark);transition:color .2s}
.footer-text a:hover{color:var(--ember)}
.footer-bottom{text-align:center;font-size:0.75rem;color:rgba(154,135,108,0.5);margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(242,228,200,0.06)}
@media(max-width:640px){.footer-grid{grid-template-columns:1fr}.footer{padding:3rem 1.25rem 1.5rem}}
</style>
</head>
<body>`;
}

function nav(baseUrl: string, biz: BizPageData): string {
  return `
<nav class="nav">
  <a href="${baseUrl}" class="nav-brand">${esc(biz.name)}</a>
  <button class="nav-toggle" onclick="this.nextElementSibling.classList.toggle('open')" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
  <div class="nav-links">
    <a href="${baseUrl}/services">Menu</a>
    <a href="${baseUrl}/gallery">Gallery</a>
    <a href="${baseUrl}/about">Our Story</a>
    <a href="${baseUrl}/booking" class="nav-cta">Reserve a Table</a>
  </div>
</nav>`;
}

function statBar(biz: BizPageData): string {
  const yr = biz.yearsInBiz ? (new Date().getFullYear() - parseInt(biz.yearsInBiz)).toString() : '2015';
  const rating = biz.rating ? biz.rating.toFixed(1) : '4.8';
  const reviews = biz.reviews ? biz.reviews.toLocaleString() : '100+';
  const city = biz.city && biz.state ? `${biz.city}, ${biz.state}` : biz.city || 'Local Favourite';
  return `
<div class="stat-bar">
  <div class="stat-bar-inner">
    <div class="stat-item"><span class="stat-num">Est. ${yr}</span><span class="stat-lbl">Year Founded</span></div>
    <div class="stat-item"><span class="stat-num">${rating}★</span><span class="stat-lbl">Google Rating</span></div>
    <div class="stat-item"><span class="stat-num">${reviews}</span><span class="stat-lbl">Happy Guests</span></div>
    <div class="stat-item"><span class="stat-num">${esc(city)}</span><span class="stat-lbl">Family Owned</span></div>
  </div>
</div>`;
}

function footerHtml(biz: BizPageData): string {
  const hoursLines = biz.hours.split('\n').map(l => `<div>${esc(l)}</div>`).join('');
  return `
<footer class="footer">
  <div class="footer-grid">
    <div>
      <div class="footer-brand">${esc(biz.name)}</div>
      <p class="footer-tagline">Good food, good people. ${biz.city || ''}, ${biz.state || ''}.</p>
    </div>
    <div>
      <div class="footer-heading">Hours</div>
      <div class="footer-text">${hoursLines}</div>
    </div>
    <div>
      <div class="footer-heading">Find Us</div>
      <div class="footer-text">
        ${biz.address ? `<div>${esc(biz.address)}</div>` : ''}
        ${biz.phone ? `<div style="margin-top:0.5rem"><a href="tel:${biz.phone.replace(/\D/g,'')}">${esc(biz.phone)}</a></div>` : ''}
      </div>
    </div>
  </div>
  <div class="footer-bottom">&copy; ${new Date().getFullYear()} ${esc(biz.name)} &mdash; All rights reserved.</div>
</footer>
<script>
// close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>{
  document.querySelector('.nav-links').classList.remove('open');
}));
</script>`;
}

// ── HOME PAGE ────────────────────────────────────────────────────────────────

function buildRestaurantHome(biz: BizPageData, baseUrl: string): string {
  const services = biz.services || [];
  const review = biz.reviewTexts?.[0] || '';
  const review2 = biz.reviewTexts?.[1] || '';

  // Menu preview items (up to 4 on home)
  const menuItems = services.slice(0, 4).map(s => `
    <div style="margin-bottom:1.75rem">
      <div class="menu-row">
        <span class="menu-row-name">${esc(s.name)}</span>
        <span class="menu-row-dots"></span>
        <span class="menu-row-price">${esc(s.price || '')}</span>
      </div>
      <p class="menu-item-desc">${esc(s.desc)}</p>
    </div>`).join('');

  // Pull-quote review
  const pullQuote = review ? `
  <section style="background:var(--smoke2);padding:5rem 2rem">
    <div style="max-width:700px;margin:0 auto;text-align:center;position:relative">
      <div style="font-family:'Oswald',sans-serif;font-size:6rem;line-height:0.5;color:var(--ember);opacity:0.4;margin-bottom:1.5rem">&ldquo;</div>
      <blockquote style="font-size:clamp(1.1rem,2.5vw,1.4rem);font-style:italic;line-height:1.7;color:var(--on-dark)">${esc(review)}</blockquote>
      ${biz.reviewTexts?.[0] ? `<p style="font-family:'Oswald',sans-serif;font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ember);margin-top:1.5rem">— Verified Google Review</p>` : ''}
    </div>
  </section>` : '';

  return `${htmlHead(`${biz.name} | ${biz.city}, ${biz.state}`, biz.heroSub)}
${nav(baseUrl, biz)}

<!-- Hero -->
<section style="position:relative;height:100vh;min-height:560px;display:flex;align-items:center;justify-content:center;overflow:hidden">
  <img src="${p(0, biz)}" alt="${esc(biz.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center">
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(20,16,10,0.55) 0%,rgba(20,16,10,0.72) 100%)"></div>
  <div style="position:relative;text-align:center;padding:0 1.5rem;max-width:800px">
    <p style="font-family:'Oswald',sans-serif;font-size:0.75rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--ember);margin-bottom:1.2rem">${esc(biz.city || '')}, ${esc(biz.state || '')}</p>
    <h1 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2.8rem,7vw,5.5rem);text-transform:uppercase;letter-spacing:0.04em;line-height:1;color:var(--on-dark);margin-bottom:0.3rem">${esc(biz.heroHeadline)}</h1>
    <h1 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2.8rem,7vw,5.5rem);text-transform:uppercase;letter-spacing:0.04em;line-height:1;color:var(--ember);margin-bottom:1.5rem">${esc(biz.heroHeadlineEm)}</h1>
    <p style="font-size:1.05rem;color:rgba(242,228,200,0.8);margin-bottom:2.5rem;max-width:520px;margin-left:auto;margin-right:auto">${esc(biz.heroSub)}</p>
    <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
      <a href="${baseUrl}/services" class="btn-primary">View The Menu</a>
      <a href="${baseUrl}/booking" class="btn-outline">Reserve a Table</a>
    </div>
  </div>
</section>

${statBar(biz)}

<!-- Menu Preview -->
<section style="background:var(--smoke);padding:5.5rem 2rem">
  <p class="section-tag">What We Serve</p>
  <h2 class="section-title" style="color:var(--on-dark)">The Menu</h2>
  <div class="section-rule"><span class="section-rule-dot"></span></div>
  <div style="max-width:680px;margin:2.5rem auto 0">
    ${menuItems}
    <div style="text-align:center;margin-top:2rem">
      <a href="${baseUrl}/services" style="font-family:'Oswald',sans-serif;font-size:0.8rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ember);border-bottom:1px solid var(--ember);padding-bottom:2px">View Full Menu &rarr;</a>
    </div>
  </div>
</section>

<!-- Story Split -->
<section style="display:grid;grid-template-columns:1fr 1fr;min-height:560px">
  <div style="overflow:hidden">
    <img src="${p(2, biz)}" alt="The pit" style="width:100%;height:100%;object-fit:cover">
  </div>
  <div style="background:var(--parch);display:flex;align-items:center;padding:4rem 3rem">
    <div style="max-width:440px">
      <p style="font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:0.25em;text-transform:uppercase;color:var(--ember);margin-bottom:0.8rem">Our Story</p>
      <h2 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.4rem);text-transform:uppercase;letter-spacing:0.05em;color:var(--on-light);line-height:1.15;margin-bottom:1.25rem">${esc(biz.aboutText)}</h2>
      <p style="color:rgba(42,31,18,0.8);line-height:1.8;margin-bottom:2rem">${esc(biz.aboutText2)}</p>
      <a href="${baseUrl}/about" class="btn-primary" style="color:var(--smoke)">Our Full Story</a>
    </div>
  </div>
</section>
<style>@media(max-width:640px){section[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr}}</style>

${pullQuote}

<!-- Inline Reservation -->
<section style="background:var(--smoke3);padding:5rem 2rem" id="reserve">
  <p class="section-tag">Make a Reservation</p>
  <h2 class="section-title" style="color:var(--on-dark);margin-bottom:2.5rem">Reserve Your Table</h2>
  <div style="max-width:680px;margin:0 auto">
    <div id="res-form">
      <div style="margin-bottom:1.5rem">
        <label class="form-label">Party Size</label>
        <div class="party-grid" id="party-grid">
          ${['1','2','3','4','5','6','7','8+'].map((n,i) => `<button class="party-btn" onclick="selectParty(this,'${n}')">${n}</button>`).join('')}
        </div>
        <input type="hidden" id="party-val" value="">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
        <div>
          <label class="form-label">Date</label>
          <input type="date" id="res-date" class="form-input" min="${new Date().toISOString().split('T')[0]}">
        </div>
        <div>
          <label class="form-label">Time</label>
          <select id="res-time" class="form-input">
            <option value="">Select a time</option>
            <optgroup label="Lunch">
              <option>12:00 PM</option><option>12:30 PM</option><option>1:00 PM</option><option>1:30 PM</option>
            </optgroup>
            <optgroup label="Dinner">
              <option>5:30 PM</option><option>6:00 PM</option><option>6:30 PM</option><option>7:00 PM</option><option>7:30 PM</option><option>8:00 PM</option>
            </optgroup>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:2rem">
        <div>
          <label class="form-label">Your Name</label>
          <input type="text" id="res-name" class="form-input" placeholder="First &amp; last name">
        </div>
        <div>
          <label class="form-label">Phone Number</label>
          <input type="tel" id="res-phone" class="form-input" placeholder="${biz.phone ? 'e.g. ' + esc(biz.phone) : 'Your phone number'}">
        </div>
      </div>
      <div style="margin-bottom:2rem">
        <label class="form-label">Special Requests (optional)</label>
        <textarea id="res-notes" class="form-input" rows="2" placeholder="Allergies, celebrations, seating preferences..."></textarea>
      </div>
      <button class="btn-primary" style="width:100%;font-size:1rem;padding:1.1rem" onclick="submitRes()">Request Reservation</button>
    </div>
    <div id="res-success" style="display:none;text-align:center;padding:3rem 0">
      <div style="font-size:2.5rem;margin-bottom:1rem">🍖</div>
      <h3 style="font-family:'Oswald',sans-serif;font-size:1.8rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--ember);margin-bottom:0.75rem">Table Requested!</h3>
      <p style="color:var(--on-dark);margin-bottom:0.5rem">We'll call you to confirm your reservation.</p>
      ${biz.phone ? `<p style="font-family:'Oswald',sans-serif;font-size:1.1rem;color:var(--ember);margin-top:1rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:inherit">${esc(biz.phone)}</a></p>` : ''}
    </div>
  </div>
</section>

${review2 ? `
<!-- Second review -->
<section style="background:var(--parch);padding:4rem 2rem;text-align:center">
  <p style="font-size:1rem;font-style:italic;color:var(--on-light);max-width:600px;margin:0 auto 1rem">"${esc(review2)}"</p>
  <p style="font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ember)">— Google Review</p>
</section>
` : ''}

${footerHtml(biz)}
<script>
function selectParty(el, val) {
  document.querySelectorAll('.party-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('party-val').value = val;
}
function submitRes() {
  const party = document.getElementById('party-val').value;
  const date  = document.getElementById('res-date').value;
  const time  = document.getElementById('res-time').value;
  const name  = document.getElementById('res-name').value.trim();
  const phone = document.getElementById('res-phone').value.trim();
  if (!party || !date || !time || !name || !phone) {
    alert('Please fill in all required fields and select a party size.');
    return;
  }
  document.getElementById('res-form').style.display = 'none';
  document.getElementById('res-success').style.display = 'block';
}
</script>
</body></html>`;
}

// ── MENU PAGE ────────────────────────────────────────────────────────────────

function buildRestaurantMenu(biz: BizPageData, baseUrl: string): string {
  const services = biz.services || [];

  // Group into Mains + Desserts heuristically
  const desserts = services.filter(s =>
    /cobbler|dessert|cake|pie|ice cream|pudding|sweet|brownie|sundae/i.test(s.name + ' ' + s.desc)
  );
  const mains = services.filter(s => !desserts.includes(s));

  function menuSection(title: string, items: typeof services): string {
    if (!items.length) return '';
    return `
    <div style="margin-bottom:3.5rem">
      <h3 style="font-family:'Oswald',sans-serif;font-weight:600;font-size:0.7rem;letter-spacing:0.3em;text-transform:uppercase;color:var(--ember);border-bottom:1px solid rgba(232,146,10,0.25);padding-bottom:0.75rem;margin-bottom:1.75rem">${esc(title)}</h3>
      ${items.map(s => `
        <div style="margin-bottom:1.75rem">
          <div class="menu-row">
            <span class="menu-row-name">${esc(s.name)}</span>
            <span class="menu-row-dots"></span>
            <span class="menu-row-price">${esc(s.price || '')}</span>
          </div>
          <p class="menu-item-desc">${esc(s.desc)}</p>
        </div>`).join('')}
    </div>`;
  }

  return `${htmlHead(`Menu — ${biz.name}`, `Full menu at ${biz.name}, ${biz.city}`)}
${nav(baseUrl, biz)}

<!-- Menu Header -->
<section style="position:relative;padding:10rem 2rem 5rem;text-align:center;overflow:hidden">
  <img src="${p(1, biz)}" alt="Menu" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div style="position:absolute;inset:0;background:rgba(20,16,10,0.82)"></div>
  <div style="position:relative">
    <p class="section-tag">What We Serve</p>
    <h1 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2.5rem,6vw,4.5rem);text-transform:uppercase;letter-spacing:0.06em;color:var(--on-dark)">The Menu</h1>
    <p style="color:var(--ash);margin-top:1rem;font-size:0.95rem">${esc(biz.heroSub)}</p>
  </div>
</section>

<!-- Menu Content -->
<section style="background:var(--smoke);padding:4rem 2rem 6rem">
  <div style="max-width:640px;margin:0 auto">
    ${menuSection('Mains', mains)}
    ${menuSection('Desserts', desserts)}
    <div style="border-top:1px solid rgba(232,146,10,0.2);padding-top:2rem;text-align:center">
      <p style="font-size:0.85rem;color:var(--ash);font-style:italic;margin-bottom:1.5rem">Prices and availability may vary. Ask your server about today's specials.</p>
      <a href="${baseUrl}/booking" class="btn-primary">Reserve a Table</a>
    </div>
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── GALLERY PAGE ─────────────────────────────────────────────────────────────

function buildRestaurantGallery(biz: BizPageData, baseUrl: string): string {
  const photos = biz.photos.filter(Boolean);

  const galleryItems = photos.map((url, i) =>
    `<img src="${url}" alt="${esc(biz.name)} photo ${i + 1}" loading="${i < 4 ? 'eager' : 'lazy'}" style="width:100%;display:block">`
  ).join('\n');

  return `${htmlHead(`Gallery — ${biz.name}`, `Photos of ${biz.name} in ${biz.city}`)}
${nav(baseUrl, biz)}

<!-- Gallery Header -->
<section style="padding:9rem 2rem 4rem;text-align:center;background:var(--smoke2)">
  <p class="section-tag">Behind The Smoke</p>
  <h1 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2.2rem,5vw,3.8rem);text-transform:uppercase;letter-spacing:0.06em;color:var(--on-dark)">The Gallery</h1>
</section>

<!-- Masonry Grid -->
<section style="background:var(--smoke2);padding:0 0 2rem">
  <div class="gallery-masonry">
    ${galleryItems}
  </div>
</section>

<section style="background:var(--smoke3);padding:3rem 2rem;text-align:center">
  <a href="${baseUrl}/booking" class="btn-primary">Reserve Your Table</a>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── ABOUT PAGE ───────────────────────────────────────────────────────────────

function buildRestaurantAbout(biz: BizPageData, baseUrl: string): string {
  const reviews = biz.reviewTexts || [];

  return `${htmlHead(`Our Story — ${biz.name}`, `About ${biz.name}, ${biz.city}`)}
${nav(baseUrl, biz)}

<!-- About Hero -->
<section style="position:relative;height:55vh;min-height:400px;display:flex;align-items:flex-end;overflow:hidden">
  <img src="${p(3, biz)}" alt="${esc(biz.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(20,16,10,0.95) 0%,rgba(20,16,10,0.3) 60%)"></div>
  <div style="position:relative;padding:3rem 3rem">
    <p style="font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:0.25em;text-transform:uppercase;color:var(--ember);margin-bottom:0.5rem">Our Story</p>
    <h1 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2rem,5vw,3.5rem);text-transform:uppercase;letter-spacing:0.05em;color:var(--on-dark)">${esc(biz.aboutText)}</h1>
  </div>
</section>

<!-- Story Body -->
<section style="background:var(--parch);padding:5rem 2rem">
  <div style="max-width:680px;margin:0 auto">
    <p style="font-size:1.08rem;line-height:1.85;color:var(--on-light);margin-bottom:2rem">${esc(biz.aboutText2)}</p>
    <p style="font-size:1rem;line-height:1.8;color:rgba(42,31,18,0.75)">Every dish that leaves our kitchen carries years of practice and genuine care. No shortcuts, no compromises — just real ingredients and real recipes made with the kind of love that turns a good meal into something people come back for.</p>
  </div>
</section>

<!-- Facts strip -->
<section style="background:var(--smoke2);padding:3.5rem 2rem">
  <div style="max-width:800px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;text-align:center">
    <div>
      <div style="font-family:'Oswald',sans-serif;font-size:3rem;font-weight:700;color:var(--ember)">${biz.yearsInBiz || '9'}</div>
      <div style="font-family:'Oswald',sans-serif;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ash);margin-top:0.3rem">Years Smoking</div>
    </div>
    <div>
      <div style="font-family:'Oswald',sans-serif;font-size:3rem;font-weight:700;color:var(--ember)">${biz.rating ? biz.rating.toFixed(1) : '4.7'}★</div>
      <div style="font-family:'Oswald',sans-serif;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ash);margin-top:0.3rem">Google Rating</div>
    </div>
    <div>
      <div style="font-family:'Oswald',sans-serif;font-size:3rem;font-weight:700;color:var(--ember)">14h</div>
      <div style="font-family:'Oswald',sans-serif;font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ash);margin-top:0.3rem">Brisket Smoke Time</div>
    </div>
  </div>
  <style>@media(max-width:480px){section div[style*="grid-template-columns:repeat(3,1fr)"]{grid-template-columns:1fr}}</style>
</section>

<!-- Reviews -->
${reviews.length ? `
<section style="background:var(--smoke);padding:5rem 2rem">
  <p class="section-tag">What Guests Say</p>
  <h2 class="section-title" style="color:var(--on-dark);margin-bottom:3rem">Reviews</h2>
  <div style="max-width:800px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:2rem">
    ${reviews.slice(0, 2).map(r => `
    <div style="background:var(--smoke2);padding:2rem;border-left:3px solid var(--ember)">
      <p style="font-style:italic;font-size:0.95rem;line-height:1.7;color:var(--on-dark)">"${esc(r)}"</p>
    </div>`).join('')}
  </div>
  <style>@media(max-width:600px){section div[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr}}</style>
</section>` : ''}

<section style="background:var(--smoke3);padding:3rem 2rem;text-align:center">
  <a href="${baseUrl}/booking" class="btn-primary">Reserve Your Table</a>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── BOOKING PAGE ─────────────────────────────────────────────────────────────

function buildRestaurantBooking(biz: BizPageData, baseUrl: string): string {
  return `${htmlHead(`Reserve a Table — ${biz.name}`, `Book a table at ${biz.name} in ${biz.city}`)}
${nav(baseUrl, biz)}

<!-- Header -->
<section style="position:relative;padding:9rem 2rem 4rem;text-align:center;overflow:hidden">
  <img src="${p(4, biz)}" alt="Reserve" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 40%">
  <div style="position:absolute;inset:0;background:rgba(20,16,10,0.82)"></div>
  <div style="position:relative">
    <p class="section-tag">Secure Your Spot</p>
    <h1 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:clamp(2.2rem,5vw,3.5rem);text-transform:uppercase;letter-spacing:0.06em;color:var(--on-dark)">Reserve a Table</h1>
    <p style="color:var(--ash);margin-top:1rem">Tell us when you're coming and we'll have the pit ready.</p>
  </div>
</section>

<!-- Booking Form -->
<section style="background:var(--smoke);padding:4rem 2rem 6rem">
  <div style="max-width:580px;margin:0 auto">
    <div id="booking-form">
      <!-- Step 1: Party Size -->
      <div style="margin-bottom:2rem">
        <label class="form-label" style="font-size:0.8rem;margin-bottom:0.75rem">How Many Guests?</label>
        <div class="party-grid">
          ${['1','2','3','4','5','6','7','8+'].map(n => `<button class="party-btn" onclick="selectParty(this,'${n}')">${n}</button>`).join('')}
        </div>
        <input type="hidden" id="party-val" value="">
      </div>

      <!-- Step 2: Date -->
      <div style="margin-bottom:1.5rem">
        <label class="form-label">Preferred Date</label>
        <input type="date" id="res-date" class="form-input" min="${new Date().toISOString().split('T')[0]}">
      </div>

      <!-- Step 3: Time -->
      <div style="margin-bottom:1.5rem">
        <label class="form-label">Preferred Time</label>
        <div>
          <p class="time-section-label">Lunch Service</p>
          <div class="time-grid" id="lunch-slots">
            <button class="time-btn" onclick="selectTime(this,'12:00 PM')">12:00 PM</button>
            <button class="time-btn" onclick="selectTime(this,'12:30 PM')">12:30 PM</button>
            <button class="time-btn" onclick="selectTime(this,'1:00 PM')">1:00 PM</button>
            <button class="time-btn" onclick="selectTime(this,'1:30 PM')">1:30 PM</button>
          </div>
          <p class="time-section-label">Dinner Service</p>
          <div class="time-grid" id="dinner-slots">
            <button class="time-btn" onclick="selectTime(this,'5:30 PM')">5:30 PM</button>
            <button class="time-btn" onclick="selectTime(this,'6:00 PM')">6:00 PM</button>
            <button class="time-btn" onclick="selectTime(this,'6:30 PM')">6:30 PM</button>
            <button class="time-btn" onclick="selectTime(this,'7:00 PM')">7:00 PM</button>
            <button class="time-btn" onclick="selectTime(this,'7:30 PM')">7:30 PM</button>
            <button class="time-btn" onclick="selectTime(this,'8:00 PM')">8:00 PM</button>
          </div>
          <input type="hidden" id="time-val" value="">
        </div>
      </div>

      <!-- Step 4: Contact -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
        <div>
          <label class="form-label">Name</label>
          <input type="text" id="res-name" class="form-input" placeholder="First &amp; last name">
        </div>
        <div>
          <label class="form-label">Phone</label>
          <input type="tel" id="res-phone" class="form-input" placeholder="Your number">
        </div>
      </div>
      <div style="margin-bottom:2rem">
        <label class="form-label">Special Requests</label>
        <textarea id="res-notes" class="form-input" rows="3" placeholder="Dietary needs, celebrations, allergies, seating preferences..."></textarea>
      </div>
      <button class="btn-primary" style="width:100%;font-size:1rem;padding:1.1rem" onclick="submitBooking()">Request Reservation</button>
    </div>

    <!-- Success -->
    <div id="booking-success" style="display:none;text-align:center;padding:4rem 1rem">
      <div style="font-size:3rem;margin-bottom:1.25rem">🔥</div>
      <h2 style="font-family:'Oswald',sans-serif;font-weight:700;font-size:2.2rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--ember);margin-bottom:0.75rem">You're on the list!</h2>
      <p style="color:var(--on-dark);margin-bottom:0.5rem">We'll call you shortly to confirm your reservation at <strong>${esc(biz.name)}</strong>.</p>
      ${biz.phone ? `<p style="margin-top:1.5rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="font-family:'Oswald',sans-serif;font-size:1.2rem;color:var(--ember)">${esc(biz.phone)}</a></p>` : ''}
      ${biz.address ? `<p style="margin-top:0.5rem;font-size:0.9rem;color:var(--ash)">${esc(biz.address)}</p>` : ''}
    </div>
  </div>
</section>

<!-- Hours reminder -->
<section style="background:var(--smoke2);padding:3rem 2rem">
  <div style="max-width:480px;margin:0 auto;text-align:center">
    <p style="font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--ember);margin-bottom:0.75rem">Our Hours</p>
    <div style="font-size:0.9rem;color:var(--ash);line-height:1.9">${biz.hours.split('\n').map(l => `<div>${esc(l)}</div>`).join('')}</div>
  </div>
</section>

${footerHtml(biz)}
<script>
function selectParty(el, val) {
  document.querySelectorAll('.party-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('party-val').value = val;
}
function selectTime(el, val) {
  document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('time-val').value = val;
}
function submitBooking() {
  const party = document.getElementById('party-val').value;
  const date  = document.getElementById('res-date').value;
  const time  = document.getElementById('time-val').value;
  const name  = document.getElementById('res-name').value.trim();
  const phone = document.getElementById('res-phone').value.trim();
  if (!party) { alert('Please select a party size.'); return; }
  if (!date)  { alert('Please select a date.'); return; }
  if (!time)  { alert('Please select a time.'); return; }
  if (!name)  { alert('Please enter your name.'); return; }
  if (!phone) { alert('Please enter your phone number.'); return; }
  document.getElementById('booking-form').style.display = 'none';
  document.getElementById('booking-success').style.display = 'block';
}
</script>
</body></html>`;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export function buildRestaurantAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:     buildRestaurantHome(biz, baseUrl),
    services: buildRestaurantMenu(biz, baseUrl),
    gallery:  buildRestaurantGallery(biz, baseUrl),
    about:    buildRestaurantAbout(biz, baseUrl),
    booking:  buildRestaurantBooking(biz, baseUrl),
  };
}
