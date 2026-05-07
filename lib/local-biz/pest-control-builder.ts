/**
 * Pest Control demo website builder — Hugo-pattern design.
 * Generates 6 HTML pages: home, about, contact, team, gallery, testimonials.
 *
 * Design: Barlow Condensed 700/800 + Inter 300-600, #0a1a0a bg, #22c55e bright-green accent.
 * Transparent-to-white sticky header, infinite marquee testimonials, sticky-left Why Us,
 * Before/After slider, data-reveal IntersectionObserver animations.
 * Zero emojis anywhere.
 */

import { BizPageData } from './multi-page-builder';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PEST_PHOTOS = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
  'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=800&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  'https://images.unsplash.com/photo-1617369120004-4042c1eec504?w=800&q=80',
  'https://images.unsplash.com/photo-1599597143701-7a0e57dfc9dd?w=800&q=80',
];

function pestPhoto(idx: number, biz: BizPageData): string {
  return biz.photos[idx] || PEST_PHOTOS[idx % PEST_PHOTOS.length];
}

function phoneClean(biz: BizPageData): string {
  return biz.phone?.replace(/[^0-9+]/g, '') || '';
}

// ── Shared CSS snippets ───────────────────────────────────────────────────────

const SHARED_VARS = `
:root {
  --color-primary: #22c55e;
  --color-primary-hover: #16a34a;
  --color-dark: #0a1a0a;
  --color-dark-2: #0d1f0d;
  --color-gray-bg: #f5f5f5;
  --color-gray-100: #e5e5e5;
  --color-white: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --section-pad: clamp(4rem, 8vw, 7rem);
  --card-radius: 12px;
  --transition-base: .35s cubic-bezier(.4, 0, .2, 1);
}`;

const SHARED_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;color:var(--color-text);background:var(--color-white);overflow-x:hidden}
img{max-width:100%;display:block}
a{text-decoration:none;color:inherit}
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
[data-reveal].revealed{opacity:1;transform:translateY(0)}
[data-delay="1"]{transition-delay:.1s}
[data-delay="2"]{transition-delay:.2s}
[data-delay="3"]{transition-delay:.3s}
[data-delay="4"]{transition-delay:.4s}
.barlow{font-family:'Barlow Condensed',sans-serif}
.section-kicker{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.75rem}
.section-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2.2rem,5vw,3.5rem);line-height:1.05;text-transform:uppercase}
.btn-primary{display:inline-block;background:var(--color-primary);color:#fff;font-family:'Inter',sans-serif;font-weight:600;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:.85rem 2rem;border-radius:6px;border:none;cursor:pointer;transition:background var(--transition-base),transform var(--transition-base)}
.btn-primary:hover{background:var(--color-primary-hover);transform:translateY(-2px)}
.btn-ghost{display:inline-block;border:1.5px solid rgba(255,255,255,.45);color:#fff;font-family:'Inter',sans-serif;font-weight:600;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:.85rem 2rem;border-radius:6px;cursor:pointer;backdrop-filter:blur(4px);transition:background var(--transition-base),border-color var(--transition-base)}
.btn-ghost:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.7)}
details summary{cursor:pointer;list-style:none}
details summary::-webkit-details-marker{display:none}
details[open] .faq-chevron{transform:rotate(180deg)}
.faq-chevron{transition:transform .25s ease}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes bounce-y{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
.scroll-bounce{animation:bounce-y 1.8s ease-in-out infinite}
/* nav transparent→white */
.site-nav{position:fixed;top:0;left:0;right:0;z-index:100;transition:background var(--transition-base),border-color var(--transition-base),box-shadow var(--transition-base)}
.site-nav.scrolled{background:#fff;border-bottom:1px solid var(--color-gray-100);box-shadow:0 2px 20px rgba(0,0,0,.06)}
/* service card hover */
.service-card{transition:transform var(--transition-base),box-shadow var(--transition-base)}
.service-card:hover{transform:translateY(-6px);box-shadow:0 16px 40px rgba(0,0,0,.1)}
/* gallery hover */
.gallery-item img{transition:transform .6s ease}
.gallery-item:hover img{transform:scale(1.08)}
.gallery-overlay{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;display:flex;align-items:center;justify-content:center;transition:opacity .35s ease;border-radius:var(--card-radius)}
.gallery-item:hover .gallery-overlay{opacity:1}
/* why cards */
.why-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:var(--card-radius);padding:1.75rem;transition:background var(--transition-base),border-color var(--transition-base)}
.why-card:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15)}
/* faq */
.faq-item{border-bottom:1px solid var(--color-gray-100)}
.faq-item summary{padding:1.25rem 0;display:flex;align-items:center;justify-content:space-between;gap:1rem;font-family:'Inter',sans-serif;font-weight:600;font-size:1rem;color:var(--color-text)}
.faq-item .faq-answer{padding-bottom:1.25rem;color:var(--color-text-muted);font-size:.95rem;line-height:1.7}
/* responsive hamburger */
@media(max-width:1023px){
  .nav-desktop{display:none!important}
  .hamburger-btn{display:flex!important}
}
@media(min-width:1024px){
  .hamburger-btn{display:none!important}
  .mobile-menu{display:none!important}
}
/* sticky layout for Why section */
@media(min-width:768px){
  .why-layout{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start}
  .why-left{position:sticky;top:6rem}
}`;

const REVEAL_JS = `<script>
(function(){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target);}
    });
  },{threshold:.1,rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('[data-reveal]').forEach(function(el){io.observe(el);});
})();
</script>`;

const SCROLL_NAV_JS = `<script>
(function(){
  var nav=document.querySelector('.site-nav');
  if(!nav) return;
  window.addEventListener('scroll',function(){
    if(window.scrollY>40){nav.classList.add('scrolled');}else{nav.classList.remove('scrolled');}
  },{passive:true});
})();
</script>`;

const HAMBURGER_JS = `<script>
(function(){
  var btn=document.getElementById('hamburger-btn');
  var menu=document.getElementById('mobile-menu');
  if(!btn||!menu) return;
  btn.addEventListener('click',function(){menu.classList.toggle('hidden');});
})();
</script>`;

const BA_SLIDER_JS = `<script>
document.querySelectorAll('.ba-container').forEach(function(c){
  var b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle');
  var d=false;
  function pos(x){var r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}
  h.addEventListener('mousedown',function(){d=true;});
  window.addEventListener('mouseup',function(){d=false;});
  window.addEventListener('mousemove',function(e){if(d)pos(e.clientX);});
  h.addEventListener('touchstart',function(e){d=true;e.preventDefault();},{passive:false});
  window.addEventListener('touchend',function(){d=false;});
  window.addEventListener('touchmove',function(e){if(d)pos(e.touches[0].clientX);},{passive:true});
});
</script>`;

// ── Before/After slider ───────────────────────────────────────────────────────

function baSlider(beforeUrl: string, afterUrl: string): string {
  return `<div class="ba-container" style="position:relative;overflow:hidden;border-radius:12px;aspect-ratio:16/9;cursor:ew-resize;user-select:none">
  <img src="${afterUrl}" alt="After treatment" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div class="ba-before" style="position:absolute;inset:0;clip-path:inset(0 50% 0 0)"><img src="${beforeUrl}" alt="Before treatment" style="width:100%;height:100%;object-fit:cover"></div>
  <div style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,.7);color:#fff;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-radius:3px">Before</div>
  <div style="position:absolute;top:12px;right:12px;background:#22c55e;color:#000;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-radius:3px">After</div>
  <div class="ba-handle" style="position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:#22c55e;touch-action:none">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:42px;height:42px;background:#22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(34,197,94,.3),0 4px 20px rgba(0,0,0,.5)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
}

// ── Shared head ───────────────────────────────────────────────────────────────

function head(title: string, biz: BizPageData, extraCss = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title} — ${biz.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
${SHARED_VARS}
${SHARED_CSS}
${extraCss}
</style>
</head>`;
}

// ── Shared nav ────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string, darkMode = false): string {
  const pc = phoneClean(biz);
  const links = [
    { href: `${baseUrl}/about`, label: 'About' },
    { href: `${baseUrl}/gallery`, label: 'Gallery' },
    { href: `${baseUrl}/contact`, label: 'Contact' },
    { href: `${baseUrl}/team`, label: 'Team' },
    { href: `${baseUrl}/testimonials`, label: 'Reviews' },
  ];

  const linkColor = darkMode ? 'color:#9ca3af' : 'color:#6b7280';
  const linkHoverClass = 'nav-link';
  const logoColor = darkMode ? '#fff' : '#111827';
  const logoSubColor = darkMode ? '#6b7280' : '#9ca3af';
  const hamburgerColor = darkMode ? '#fff' : '#111827';

  const desktopLinks = links.map(l =>
    `<a href="${l.href}" class="${linkHoverClass}" style="${linkColor};font-family:'Inter',sans-serif;font-size:13px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;transition:color .2s">${l.label}</a>`
  ).join('');

  const mobileLinks = links.map(l =>
    `<a href="${l.href}" style="display:block;padding:.75rem 1.5rem;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;color:#374151;border-bottom:1px solid #f3f4f6;text-transform:uppercase;letter-spacing:.06em">${l.label}</a>`
  ).join('');

  return `<nav class="site-nav${darkMode ? ' dark-nav' : ''}">
  <style>
  .nav-link:hover{color:var(--color-primary)!important}
  ${darkMode ? '.site-nav:not(.scrolled){background:transparent}.site-nav:not(.scrolled) .nav-logo-name{color:#fff!important}.site-nav:not(.scrolled) .nav-logo-sub{color:rgba(255,255,255,.5)!important}.site-nav:not(.scrolled) .nav-link{color:rgba(255,255,255,.75)!important}.site-nav:not(.scrolled) .nav-phone-btn{background:var(--color-primary);color:#fff}.site-nav:not(.scrolled) .hamburger-icon{stroke:#fff}' : ''}
  </style>
  <div style="max-width:1280px;margin:0 auto;padding:.9rem 1.5rem;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:1.5rem">
    <a href="${baseUrl}" style="display:flex;flex-direction:column;text-decoration:none">
      <span class="nav-logo-name barlow" style="font-weight:800;font-size:1.35rem;line-height:1;text-transform:uppercase;color:${logoColor};transition:color .2s">${biz.name}</span>
      <span class="nav-logo-sub" style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${logoSubColor};margin-top:2px;transition:color .2s">${biz.city || ''}${biz.city && biz.state ? ', ' : ''}${biz.state || ''}</span>
    </a>
    <div class="nav-desktop" style="display:flex;align-items:center;justify-content:center;gap:2rem">
      ${desktopLinks}
    </div>
    <div style="display:flex;align-items:center;gap:1rem">
      ${pc ? `<a href="tel:${pc}" class="nav-phone-btn" style="background:var(--color-primary);color:#fff;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;letter-spacing:.04em;padding:.5rem 1.25rem;border-radius:6px;white-space:nowrap;transition:background .2s;display:none" class="nav-desktop">Free Inspection</a>` : ''}
      <button id="hamburger-btn" class="hamburger-btn" style="background:none;border:none;cursor:pointer;padding:4px;display:none">
        <svg class="hamburger-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${hamburgerColor}" stroke-width="2" stroke-linecap="round" style="transition:stroke .2s"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
  </div>
  <div id="mobile-menu" class="mobile-menu hidden" style="background:#fff;border-top:1px solid #f3f4f6;padding:.5rem 0">
    ${mobileLinks}
    ${pc ? `<div style="padding:.75rem 1.5rem"><a href="tel:${pc}" class="btn-primary" style="display:block;text-align:center">${biz.phone}</a></div>` : ''}
  </div>
</nav>
${HAMBURGER_JS}
${SCROLL_NAV_JS}`;
}

// ── Shared footer ─────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);
  return `<footer style="background:var(--color-dark);color:#d1fae5;padding:4rem 1.5rem 2rem">
  <div style="max-width:1280px;margin:0 auto">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:3rem;margin-bottom:3rem">
      <div style="grid-column:span 2 / span 2">
        <div class="barlow" style="font-size:1.75rem;font-weight:800;text-transform:uppercase;color:#fff;margin-bottom:.5rem">${biz.name}</div>
        <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280;margin-bottom:1rem">${biz.city || ''}${biz.city && biz.state ? ', ' : ''}${biz.state || ''} — Licensed and Insured</div>
        ${biz.address ? `<p style="color:#6b7280;font-size:.9rem;margin-bottom:.75rem">${biz.address}</p>` : ''}
        ${pc ? `<a href="tel:${pc}" style="font-size:1.15rem;font-weight:600;color:var(--color-primary)">${biz.phone}</a>` : ''}
      </div>
      <div>
        <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#22c55e;margin-bottom:1rem;font-weight:600">Quick Links</div>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          ${[['About', `${baseUrl}/about`], ['Gallery', `${baseUrl}/gallery`], ['Our Team', `${baseUrl}/team`], ['Reviews', `${baseUrl}/testimonials`], ['Contact', `${baseUrl}/contact`]].map(([l, h]) => `<a href="${h}" style="color:#6b7280;font-size:.875rem;transition:color .2s" onmouseover="this.style.color='#22c55e'" onmouseout="this.style.color='#6b7280'">${l}</a>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#22c55e;margin-bottom:1rem;font-weight:600">Hours</div>
        <div style="color:#6b7280;font-size:.875rem;line-height:1.8;white-space:pre-line">${biz.hours || 'Mon–Fri: 7am–7pm\nSat: 8am–5pm\nSunday: Emergency Only'}</div>
      </div>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:1.5rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem">
      <span style="font-size:.8rem;color:#4b5563">© ${new Date().getFullYear()} ${biz.name}. All rights reserved.</span>
      <span style="font-size:.8rem;color:#4b5563">Licensed, Bonded and Insured</span>
    </div>
  </div>
</footer>`;
}

// ── Trust bar ─────────────────────────────────────────────────────────────────

function trustBar(): string {
  const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg>`;
  const shieldSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  const clockSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
  const homeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`;
  const awardSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`;

  const items = [
    { icon: checkSvg, label: 'Free Inspections' },
    { icon: shieldSvg, label: 'Licensed and Insured' },
    { icon: clockSvg, label: 'Same-Day Service' },
    { icon: homeSvg, label: '15,000+ Homes Protected' },
    { icon: awardSvg, label: 'NPMA Certified' },
  ];

  const itemsHtml = items.map((item, i) =>
    `${i > 0 ? '<span style="color:#d1d5db;font-size:1.2rem;margin:0 .25rem">|</span>' : ''}
    <div style="display:flex;align-items:center;gap:7px;white-space:nowrap">
      ${item.icon}
      <span style="font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;color:#374151">${item.label}</span>
    </div>`
  ).join('');

  return `<div style="background:var(--color-gray-bg);border-bottom:1px solid var(--color-gray-100);padding:.8rem 1.5rem;overflow-x:auto">
  <div style="max-width:1280px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:.75rem;flex-wrap:wrap">
    ${itemsHtml}
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: HOME  (11 sections)
// ══════════════════════════════════════════════════════════════════════════════

function buildHomePage(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);

  const reviewPad = [
    { name: 'Sarah M.', city: biz.city || 'Local', text: 'Called them after noticing ants in the kitchen. They came the next morning, found the colony entry point, and treated inside and out. Not a single ant since. Fast and completely professional.' },
    { name: 'Robert T.', city: biz.city || 'Local', text: 'Quarterly plan is worth every dollar. They do the perimeter, check the attic and crawl space, and leave a written report each visit. Real peace of mind.' },
    { name: 'Jennifer K.', city: biz.city || 'Local', text: 'Had a massive wasp nest in the garage eave. They handled it within 90 minutes of my call. Professional, thorough, and no drama whatsoever.' },
    { name: 'Marcus D.', city: biz.city || 'Local', text: 'Switched from a national chain and the difference is immediate. These guys explain what they found and what they are treating with. Trust level is completely different.' },
    { name: 'Linda P.', city: biz.city || 'Local', text: 'Termite inspection before we bought our house. Report was detailed and clear. They flagged an issue in the crawl space that saved us from a major problem down the line.' },
    { name: 'Chris W.', city: biz.city || 'Local', text: 'Bed bug treatment worked on the first visit. They prepped us on what to expect, what to do before and after, and followed up two weeks later to confirm. Total success.' },
    { name: 'Amanda R.', city: biz.city || 'Local', text: 'Mosquito control in the backyard has made summer evenings usable again. Three treatments in and we can actually sit outside. Kids love it.' },
    { name: 'Tom H.', city: biz.city || 'Local', text: 'Rodent issue in the attic. They sealed every entry point and trapped what was inside. No recurrence in six months. They genuinely solve the problem, not just treat it.' },
  ];

  const reviews = [...(biz.reviewTexts || []).map((t, i) => ({ name: `Satisfied Customer`, city: biz.city || 'Local', text: t })), ...reviewPad].slice(0, 8);
  const marqueeReviews = [...reviews, ...reviews];

  const serviceCards = [
    { name: 'Residential Pest Control', desc: 'Year-round protection for your home. Ants, roaches, spiders, and seasonal pests handled on a schedule that works for you.', img: PEST_PHOTOS[0] },
    { name: 'Commercial Pest Management', desc: 'Discreet, scheduled treatments for restaurants, offices, warehouses, and retail. We keep you compliant and your reputation intact.', img: PEST_PHOTOS[0] },
    { name: 'Termite Treatment', desc: 'Liquid barrier, baiting systems, and fumigation tailored to severity and species. Backed by a multi-year warranty.', img: PEST_PHOTOS[1] },
    { name: 'Rodent Control', desc: 'We seal, trap, and eliminate. Every entry point is located and blocked so the problem cannot return the following season.', img: PEST_PHOTOS[2] },
    { name: 'Bed Bug Elimination', desc: 'Heat treatment and targeted chemical protocols that eliminate bed bugs at every life stage including eggs. 96%+ single-treatment success rate.', img: PEST_PHOTOS[0] },
    { name: 'Mosquito and Tick Control', desc: 'Barrier treatments for your yard and outdoor spaces. Take back your evenings and protect your family from vector-borne illness.', img: PEST_PHOTOS[1] },
  ];

  const whyCards = [
    { num: '01', title: 'Guaranteed Elimination', desc: 'If targeted pests return between scheduled visits, we come back at no charge. No fine print. No exceptions.' },
    { num: '02', title: 'EPA-Approved Methods', desc: 'Every product we use is EPA-registered and applied by state-licensed technicians who complete annual re-certification.' },
    { num: '03', title: 'Same-Day Response', desc: 'Same-day and next-morning slots available six days a week. Emergency callouts within 2 hours, any day of the year.' },
    { num: '04', title: 'Family and Pet Safe', desc: 'We brief you on re-entry times and factor in children and pets on every job. Your household is never an afterthought.' },
    { num: '05', title: 'No-Pest-Return Warranty', desc: 'Our annual maintenance plan includes unlimited re-treatment visits. One flat rate, no surprises.' },
  ];

  const galleryPhotos = Array.from({ length: 6 }, (_, i) => pestPhoto(i, biz));

  const faqItems = [
    { q: 'How soon can you come out?', a: `We offer same-day service for most situations and next-morning slots for standard appointments. Emergency callouts are available 24/7 with a typical response window of under 2 hours.` },
    { q: 'Are your treatments safe for children and pets?', a: 'Yes. All products we use are EPA-registered and approved for residential use. We will give you specific re-entry guidance before we start and factor in any pets during our treatment plan.' },
    { q: 'Do I need to leave my home during treatment?', a: 'For most standard treatments, no. You may need to vacate for 1-2 hours for more intensive protocols such as bed bug heat treatment or full fumigation. We walk you through exactly what to expect.' },
    { q: 'How long does a treatment last?', a: 'Exterior barrier treatments typically last 60-90 days depending on weather. Interior treatments last longer in most cases. Our quarterly maintenance plan is designed to keep protection continuous without gaps.' },
    { q: 'What is covered under your warranty?', a: 'Our service warranty covers re-treatment at no additional cost if the originally targeted pests return between your scheduled visits. Annual plan holders receive unlimited re-treatment for all covered pests.' },
  ];

  return `${head('Home', biz)}
<body>
${nav(biz, baseUrl, true)}

<!-- HERO -->
<section style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden">
  <div style="position:absolute;inset:0">
    <video autoplay muted loop playsinline poster="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80" style="width:100%;height:100%;object-fit:cover;display:block">
    </video>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.1),rgba(0,0,0,.4) 70%,rgba(0,0,0,.7))"></div>
  </div>
  <div style="position:relative;z-index:2;text-align:center;padding:2rem 1.5rem;max-width:900px;margin:0 auto">
    <h1 class="barlow" style="font-weight:800;font-size:clamp(3.5rem,10vw,8rem);text-transform:uppercase;color:#fff;line-height:1;letter-spacing:.02em;margin-bottom:1.25rem" data-reveal>${biz.name}</h1>
    <p style="font-family:'Inter',sans-serif;font-size:clamp(1rem,2.5vw,1.35rem);color:rgba(255,255,255,.85);font-weight:300;max-width:560px;margin:0 auto 2.5rem;line-height:1.6" data-reveal data-delay="1">${biz.heroSub || 'Professional pest control you can count on. Licensed technicians. Guaranteed results.'}</p>
    <a href="${baseUrl}/contact" class="btn-ghost" data-reveal data-delay="2">Get a Free Inspection</a>
  </div>
  <div style="position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);text-align:center;z-index:2">
    <div class="scroll-bounce">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
    </div>
    <div style="font-family:'Inter',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:.4rem">Scroll</div>
  </div>
</section>

<!-- TRUST BAR -->
${trustBar()}

<!-- SERVICES -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3.5rem" data-reveal>
      <div class="section-kicker">What We Do</div>
      <h2 class="section-title" style="color:#111827">Our Services</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.75rem">
      ${serviceCards.map((s, i) => `<div class="service-card" style="border-radius:var(--card-radius);overflow:hidden;background:#fff;border:1px solid #f3f4f6;box-shadow:0 2px 12px rgba(0,0,0,.06)" data-reveal data-delay="${(i % 4) + 1}">
        <div style="aspect-ratio:16/10;overflow:hidden">
          <img src="${s.img}" alt="${s.name}" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s ease" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'">
        </div>
        <div style="padding:1.5rem">
          <h3 class="barlow" style="font-size:1.35rem;font-weight:700;text-transform:uppercase;color:#111827;margin-bottom:.6rem">${s.name}</h3>
          <p style="font-size:.9rem;color:var(--color-text-muted);line-height:1.65;margin-bottom:1rem">${s.desc}</p>
          <a href="${baseUrl}/contact" style="font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--color-primary);letter-spacing:.04em">Learn More &rarr;</a>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- SHOWREEL / PROOF -->
<section style="background:var(--color-dark);padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:3.5rem;align-items:center">
    <div data-reveal>
      <img src="${pestPhoto(0, biz)}" alt="Pest control work" style="width:100%;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:block">
    </div>
    <div data-reveal data-delay="2">
      <div class="section-kicker">See the Difference</div>
      <h2 class="section-title" style="color:#fff;margin-bottom:1.5rem">We Eliminate Every Last One.</h2>
      <p style="font-family:'Inter',sans-serif;font-size:1rem;color:#9ca3af;line-height:1.75;margin-bottom:1rem">We do not mask the problem. Every treatment starts with a thorough inspection that identifies the species, the source, and every entry point. Then we eliminate it completely.</p>
      <p style="font-family:'Inter',sans-serif;font-size:1rem;color:#9ca3af;line-height:1.75;margin-bottom:2rem">Our technicians are state-licensed, EPA-certified, and work only with approved products. You get a written record of everything applied on your property.</p>
      <a href="${baseUrl}/contact" class="btn-primary">Book a Free Inspection</a>
    </div>
  </div>
</section>

<!-- WHY US (sticky left) -->
<section style="background:var(--color-dark-2);padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto">
    <div class="why-layout">
      <div class="why-left" data-reveal>
        <div class="section-kicker">Why Choose Us</div>
        <h2 class="section-title" style="color:#fff;margin-bottom:1.5rem">Five Reasons Homeowners Trust Us</h2>
        <p style="font-family:'Inter',sans-serif;font-size:.95rem;color:#9ca3af;line-height:1.75;margin-bottom:2rem">We have served thousands of households across ${biz.city || 'the area'} with a single standard: the pest is gone before we leave, and stays gone.</p>
        <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:var(--card-radius);padding:1.25rem">
          <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#22c55e;margin-bottom:.75rem">Certifications</div>
          <div style="display:flex;flex-direction:column;gap:.5rem">
            ${['NPMA Member', 'EPA Certified Applicator', 'State Licensed and Insured', 'BBB Accredited A+'].map(c => `<div style="display:flex;align-items:center;gap:.6rem"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg><span style="font-family:'Inter',sans-serif;font-size:.85rem;color:#d1fae5">${c}</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        ${whyCards.map((c, i) => `<div class="why-card" data-reveal data-delay="${i + 1}">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:2.5rem;font-weight:800;color:rgba(34,197,94,.25);line-height:1;margin-bottom:.5rem">${c.num}</div>
          <h3 class="barlow" style="font-size:1.25rem;font-weight:700;text-transform:uppercase;color:#fff;margin-bottom:.5rem">${c.title}</h3>
          <p style="font-family:'Inter',sans-serif;font-size:.9rem;color:#9ca3af;line-height:1.65">${c.desc}</p>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>

<!-- GALLERY -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3.5rem" data-reveal>
      <div class="section-kicker">Our Work</div>
      <h2 class="section-title" style="color:#111827">Results We Stand Behind</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">
      ${galleryPhotos.map((p, i) => `<div class="gallery-item" style="position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:var(--card-radius);cursor:pointer" data-reveal data-delay="${(i % 3) + 1}">
        <img src="${p}" alt="Pest control result ${i + 1}" style="width:100%;height:100%;object-fit:cover;display:block">
        <div class="gallery-overlay">
          <span style="font-family:'Inter',sans-serif;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;border:1.5px solid rgba(255,255,255,.7);padding:.5rem 1.25rem;border-radius:4px">View Project</span>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- TESTIMONIALS (infinite marquee) -->
<section style="background:var(--color-gray-bg);padding:var(--section-pad) 0;overflow:hidden">
  <div style="max-width:1280px;margin:0 auto;padding:0 1.5rem;text-align:center;margin-bottom:3rem" data-reveal>
    <div class="section-kicker">What People Say</div>
    <h2 class="section-title" style="color:#111827">Trusted by Homeowners Across ${biz.city || 'the Area'}</h2>
  </div>
  <div class="testimonials__wrap" style="overflow:hidden;mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent)">
    <div class="testimonials__track" style="display:flex;gap:1.5rem;width:max-content;animation:marquee 40s linear infinite">
      <style>.testimonials__track:hover{animation-play-state:paused}</style>
      ${marqueeReviews.map(r => `<div style="width:340px;flex-shrink:0;background:#fff;border-radius:var(--card-radius);padding:1.75rem;box-shadow:0 2px 12px rgba(0,0,0,.06);border:1px solid #f3f4f6">
        <div style="color:#22c55e;font-size:1rem;letter-spacing:.12em;margin-bottom:.75rem">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p style="font-family:'Inter',sans-serif;font-size:.9rem;color:#374151;line-height:1.7;margin-bottom:1rem">&ldquo;${r.text}&rdquo;</p>
        <div style="font-family:'Inter',sans-serif;font-size:.8rem;font-weight:600;color:#111827">${r.name}</div>
        <div style="font-family:'Inter',sans-serif;font-size:.75rem;color:#9ca3af">${r.city}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- FAQ -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:780px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3rem" data-reveal>
      <div class="section-kicker">FAQ</div>
      <h2 class="section-title" style="color:#111827">Common Questions</h2>
    </div>
    <div data-reveal data-delay="1">
      ${faqItems.map(f => `<details class="faq-item">
        <summary>
          <span>${f.q}</span>
          <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </summary>
        <div class="faq-answer">${f.a}</div>
      </details>`).join('')}
    </div>
  </div>
</section>

<!-- CONTACT CTA -->
<section style="background:var(--color-dark);padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:4rem">
    <div data-reveal>
      <div class="section-kicker">Get in Touch</div>
      <h2 class="section-title" style="color:#fff;margin-bottom:2rem">Request Your Free Inspection</h2>
      <form style="display:flex;flex-direction:column;gap:1rem" onsubmit="this.innerHTML='<div style=padding:1.5rem;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px;color:#22c55e;font-family:Inter,sans-serif;font-size:.95rem>Thank you. We will be in touch within 1 business hour.</div>';return false">
        <input type="text" placeholder="Your Name" required style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
        <input type="tel" placeholder="Phone Number" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
        <input type="email" placeholder="Email Address" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='rgba(255,255,255,.1)'">
        <select style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#9ca3af;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none">
          <option value="" disabled selected>Pest Type (select one)</option>
          <option style="background:#111;color:#fff">Ants / Cockroaches / Spiders</option>
          <option style="background:#111;color:#fff">Termites</option>
          <option style="background:#111;color:#fff">Rodents</option>
          <option style="background:#111;color:#fff">Bed Bugs</option>
          <option style="background:#111;color:#fff">Mosquitoes / Ticks</option>
          <option style="background:#111;color:#fff">Other</option>
        </select>
        <textarea placeholder="Describe the problem (optional)" rows="4" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;resize:vertical;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='rgba(255,255,255,.1)'"></textarea>
        <button type="submit" class="btn-primary" style="font-size:14px">Request Free Inspection</button>
      </form>
    </div>
    <div data-reveal data-delay="2">
      ${pc ? `<div style="margin-bottom:2.5rem">
        <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#22c55e;margin-bottom:.75rem">Call Us Now</div>
        <a href="tel:${pc}" class="barlow" style="font-size:clamp(2rem,5vw,3rem);font-weight:800;text-transform:uppercase;color:#fff;text-decoration:none;transition:color .2s" onmouseover="this.style.color='#22c55e'" onmouseout="this.style.color='#fff'">${biz.phone}</a>
      </div>` : ''}
      ${biz.address ? `<div style="margin-bottom:2rem">
        <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#22c55e;margin-bottom:.5rem">Address</div>
        <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:.95rem;line-height:1.6">${biz.address}</p>
      </div>` : ''}
      <div>
        <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#22c55e;margin-bottom:.5rem">Hours</div>
        <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:.9rem;line-height:1.8;white-space:pre-line">${biz.hours || 'Mon–Fri: 7am–7pm\nSat: 8am–5pm\nSunday: Emergency Only\n24/7 Emergency Line'}</p>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: ABOUT
// ══════════════════════════════════════════════════════════════════════════════

function buildAboutPage(biz: BizPageData, baseUrl: string): string {
  const values = [
    { title: 'Transparency', desc: 'We tell you exactly what we found, what we are treating with, and why. No upselling, no mystery chemicals.' },
    { title: 'Accountability', desc: 'If it comes back, we come back. Our guarantee is simple and unconditional.' },
    { title: 'Precision', desc: 'Blanket spraying belongs in the past. We treat the source, not the symptoms.' },
    { title: 'Safety', desc: 'Every product is EPA-registered. Every re-entry time is communicated before we start.' },
  ];

  const certs = ['NPMA Member', 'EPA Certified Applicator', 'State Licensed and Insured', 'BBB Accredited A+', 'QualityPro Certified'];

  return `${head('About', biz)}
<body>
${nav(biz, baseUrl)}

<!-- PAGE HERO -->
<section style="background:var(--color-dark);padding:calc(var(--section-pad) + 5rem) 1.5rem var(--section-pad)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:3rem;align-items:center">
    <div data-reveal>
      <div class="section-kicker">Our Story</div>
      <h1 class="section-title" style="color:#fff;margin-bottom:1.5rem">Built on a Simple Idea: Do It Right.</h1>
      <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:1rem;line-height:1.8;margin-bottom:1rem">${biz.aboutText || `${biz.name} was founded with one purpose: deliver pest control that actually works and treats customers with respect. No gimmicks, no contracts designed to trap you — just qualified technicians and guaranteed results.`}</p>
      <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:1rem;line-height:1.8">${biz.aboutText2 || `We serve residential and commercial customers across ${biz.city || 'the area'} with same-day availability, written treatment reports, and a re-treatment guarantee that costs you nothing.`}</p>
    </div>
    <div data-reveal data-delay="2">
      <img src="${pestPhoto(0, biz)}" alt="About ${biz.name}" style="width:100%;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.4);display:block">
    </div>
  </div>
</section>

<!-- VALUES -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3.5rem" data-reveal>
      <div class="section-kicker">What We Stand For</div>
      <h2 class="section-title" style="color:#111827">Our Core Values</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1.5rem">
      ${values.map((v, i) => `<div style="background:var(--color-gray-bg);border-radius:var(--card-radius);padding:2rem;border-left:3px solid var(--color-primary)" data-reveal data-delay="${i + 1}">
        <h3 class="barlow" style="font-size:1.4rem;font-weight:700;text-transform:uppercase;color:#111827;margin-bottom:.65rem">${v.title}</h3>
        <p style="font-family:'Inter',sans-serif;font-size:.9rem;color:var(--color-text-muted);line-height:1.7">${v.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CERTIFICATIONS -->
<section style="background:var(--color-dark);padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:4rem;align-items:center">
    <div data-reveal>
      <div class="section-kicker">Credentials</div>
      <h2 class="section-title" style="color:#fff;margin-bottom:1.75rem">Licensed, Certified, Accountable</h2>
      <div style="display:flex;flex-direction:column;gap:.85rem">
        ${certs.map((c, i) => `<div style="display:flex;align-items:center;gap:.85rem;padding:1rem 1.25rem;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.15);border-radius:8px" data-reveal data-delay="${i + 1}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" style="flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg>
          <span style="font-family:'Inter',sans-serif;font-size:.9rem;font-weight:500;color:#d1fae5">${c}</span>
        </div>`).join('')}
      </div>
    </div>
    <div data-reveal data-delay="2">
      <img src="${pestPhoto(1, biz)}" alt="Our team at work" style="width:100%;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.4);display:block">
    </div>
  </div>
</section>

<!-- TEAM PREVIEW -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto;text-align:center" data-reveal>
    <div class="section-kicker">Our People</div>
    <h2 class="section-title" style="color:#111827;margin-bottom:1rem">State-Licensed Technicians</h2>
    <p style="font-family:'Inter',sans-serif;color:var(--color-text-muted);max-width:560px;margin:0 auto 2.5rem;line-height:1.7">Every technician on our team holds a current state pest applicator license and completes annual re-certification. Your home is always in qualified hands.</p>
    <a href="${baseUrl}/team" class="btn-primary">Meet the Team</a>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: CONTACT
// ══════════════════════════════════════════════════════════════════════════════

function buildContactPage(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);
  const city = biz.city || 'Houston';
  const mapBbox = '-95.55,29.65,-95.25,29.85';

  const faqItems = [
    { q: 'Is there a charge for the initial inspection?', a: 'No. We offer free property inspections with no obligation. We assess, document, and give you a written quote before any work begins.' },
    { q: 'How quickly can you respond to an emergency?', a: 'Our typical emergency response window is under 2 hours, any day of the week. Call the number above and select the emergency option.' },
    { q: 'Do you serve commercial properties?', a: 'Yes. We work with restaurants, offices, warehouses, retail locations, and multi-family residential buildings. Commercial accounts receive a dedicated service coordinator.' },
    { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards, checks, and ACH bank transfers. Payment is collected after service is complete, not before.' },
  ];

  return `${head('Contact', biz)}
<body>
${nav(biz, baseUrl)}

<!-- PAGE HERO -->
<section style="background:var(--color-dark);padding:calc(var(--section-pad) + 5rem) 1.5rem var(--section-pad);text-align:center">
  <div style="max-width:700px;margin:0 auto" data-reveal>
    <div class="section-kicker">Contact</div>
    <h1 class="section-title" style="color:#fff;margin-bottom:1rem">Get a Free Inspection</h1>
    <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:1.05rem;line-height:1.7">Tell us about the problem and we will have a licensed technician at your property as soon as today.</p>
  </div>
</section>

<!-- CONTACT FORM + INFO -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:4rem">
    <div data-reveal>
      <h2 class="section-title" style="color:#111827;margin-bottom:2rem;font-size:2rem">Send Us a Message</h2>
      <form style="display:flex;flex-direction:column;gap:1.1rem" onsubmit="this.innerHTML='<div style=padding:1.5rem;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;color:#15803d;font-family:Inter,sans-serif;font-size:.95rem>Message received. We will follow up within 1 business hour.</div>';return false">
        <input type="text" placeholder="Full Name" required style="border:1px solid #e5e7eb;color:#111827;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='#e5e7eb'">
        <input type="tel" placeholder="Phone Number" style="border:1px solid #e5e7eb;color:#111827;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='#e5e7eb'">
        <input type="email" placeholder="Email Address" style="border:1px solid #e5e7eb;color:#111827;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='#e5e7eb'">
        <select style="border:1px solid #e5e7eb;color:#6b7280;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;background:#fff">
          <option value="" disabled selected>Pest Type</option>
          <option>Ants / Cockroaches / Spiders</option>
          <option>Termites</option>
          <option>Rodents</option>
          <option>Bed Bugs</option>
          <option>Mosquitoes / Ticks</option>
          <option>Other</option>
        </select>
        <textarea placeholder="Additional details about the issue..." rows="5" style="border:1px solid #e5e7eb;color:#111827;font-family:'Inter',sans-serif;font-size:.95rem;padding:.85rem 1rem;border-radius:6px;outline:none;resize:vertical;transition:border-color .2s" onfocus="this.style.borderColor='#22c55e'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
        <button type="submit" class="btn-primary">Submit Request</button>
      </form>
    </div>
    <div data-reveal data-delay="2">
      ${pc ? `<div style="margin-bottom:2.5rem;padding:1.75rem;background:var(--color-dark);border-radius:var(--card-radius)">
        <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#22c55e;margin-bottom:.75rem">Call Direct</div>
        <a href="tel:${pc}" class="barlow" style="font-size:clamp(1.75rem,4vw,2.5rem);font-weight:800;text-transform:uppercase;color:#fff;text-decoration:none">${biz.phone}</a>
        <div style="font-family:'Inter',sans-serif;font-size:.8rem;color:#9ca3af;margin-top:.4rem">Available Mon–Sat. Emergency line 24/7.</div>
      </div>` : ''}
      ${biz.address ? `<div style="margin-bottom:2rem">
        <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:.5rem">Address</div>
        <p style="font-family:'Inter',sans-serif;color:#374151;font-size:.95rem;line-height:1.6">${biz.address}</p>
      </div>` : ''}
      <div style="margin-bottom:2.5rem">
        <div style="font-family:'Inter',sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:.5rem">Hours</div>
        <p style="font-family:'Inter',sans-serif;color:#374151;font-size:.9rem;line-height:1.8;white-space:pre-line">${biz.hours || 'Mon–Fri: 7am–7pm\nSat: 8am–5pm\nSunday: Emergency Only'}</p>
      </div>
      <div style="border-radius:var(--card-radius);overflow:hidden;height:220px">
        <iframe title="Map" width="100%" height="220" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"
          src="https://www.openstreetmap.org/export/embed.html?bbox=${mapBbox}&amp;layer=mapnik"
          style="border:none;border-radius:var(--card-radius);display:block">
        </iframe>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section style="background:var(--color-gray-bg);padding:var(--section-pad) 1.5rem">
  <div style="max-width:780px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3rem" data-reveal>
      <div class="section-kicker">Questions</div>
      <h2 class="section-title" style="color:#111827">Before You Call</h2>
    </div>
    <div data-reveal data-delay="1">
      ${faqItems.map(f => `<details class="faq-item">
        <summary>
          <span>${f.q}</span>
          <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </summary>
        <div class="faq-answer">${f.a}</div>
      </details>`).join('')}
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: TEAM
// ══════════════════════════════════════════════════════════════════════════════

function buildTeamPage(biz: BizPageData, baseUrl: string): string {
  const defaultTeam = [
    { name: 'James Hartley', role: 'Owner and Lead Technician', bio: `${biz.yearsInBiz || '12'}+ years in structural pest control. State-licensed, NPMA member, and the person on-site for every complex inspection.` },
    { name: 'Maria Santos', role: 'Senior Field Technician', bio: 'Specializes in termite detection and treatment. EPA-certified applicator with extensive experience in commercial accounts.' },
    { name: 'Derek Collins', role: 'Rodent Exclusion Specialist', bio: 'Focuses exclusively on rodent entry sealing and trapping. Certified in building envelope exclusion techniques.' },
    { name: 'Priya Nair', role: 'Client Services Coordinator', bio: 'Manages scheduling, follow-ups, and service reports. Your first point of contact and the person who tracks your account history.' },
  ];

  const team = (biz.team && biz.team.length > 0)
    ? biz.team
    : defaultTeam.map(m => ({ name: m.name, role: m.role, bio: m.bio }));

  function initials(name: string): string {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  return `${head('Our Team', biz)}
<body>
${nav(biz, baseUrl)}

<!-- HERO -->
<section style="background:var(--color-dark);padding:calc(var(--section-pad) + 5rem) 1.5rem var(--section-pad);text-align:center">
  <div style="max-width:680px;margin:0 auto" data-reveal>
    <div class="section-kicker">Our People</div>
    <h1 class="section-title" style="color:#fff;margin-bottom:1rem">The Technicians Behind Every Job</h1>
    <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:1.05rem;line-height:1.7">State-licensed, annually re-certified, and fully accountable. When we send someone to your property, they are qualified and prepared.</p>
  </div>
</section>

<!-- TEAM GRID -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:2rem">
      ${team.map((m, i) => `<div style="text-align:center;padding:2.5rem 1.75rem;border:1px solid #f3f4f6;border-radius:var(--card-radius);background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.05);transition:transform .3s,box-shadow .3s" onmouseover="this.style.transform='translateY(-5px)';this.style.boxShadow='0 14px 40px rgba(0,0,0,.1)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 12px rgba(0,0,0,.05)'" data-reveal data-delay="${(i % 4) + 1}">
        ${(m as any).photo
          ? `<img src="${(m as any).photo}" alt="${m.name}" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin:0 auto 1.25rem;display:block;border:3px solid #f0fdf4">`
          : `<div style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:800;color:#fff">${initials(m.name)}</div>`
        }
        <div class="barlow" style="font-size:1.3rem;font-weight:700;text-transform:uppercase;color:#111827;margin-bottom:.3rem">${m.name}</div>
        <div style="font-family:'Inter',sans-serif;font-size:.8rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.85rem">${m.role}</div>
        ${(m as any).bio ? `<p style="font-family:'Inter',sans-serif;font-size:.875rem;color:var(--color-text-muted);line-height:1.65">${(m as any).bio}</p>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="background:var(--color-dark);padding:var(--section-pad) 1.5rem;text-align:center" data-reveal>
  <div style="max-width:600px;margin:0 auto">
    <div class="section-kicker">Work With Us</div>
    <h2 class="section-title" style="color:#fff;margin-bottom:1.5rem">Ready to Solve the Problem?</h2>
    <p style="font-family:'Inter',sans-serif;color:#9ca3af;margin-bottom:2rem;line-height:1.7">Our team is available for same-day inspections six days a week. No gimmicks, no long-term contracts required.</p>
    <a href="${baseUrl}/contact" class="btn-primary">Schedule an Inspection</a>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: GALLERY
// ══════════════════════════════════════════════════════════════════════════════

function buildGalleryPage(biz: BizPageData, baseUrl: string): string {
  const photos = Array.from({ length: 8 }, (_, i) => pestPhoto(i, biz));

  return `${head('Gallery', biz)}
<body>
${nav(biz, baseUrl)}

<!-- HERO -->
<section style="background:var(--color-dark);padding:calc(var(--section-pad) + 5rem) 1.5rem var(--section-pad);text-align:center">
  <div style="max-width:680px;margin:0 auto" data-reveal>
    <div class="section-kicker">Our Work</div>
    <h1 class="section-title" style="color:#fff;margin-bottom:1rem">Results We Stand Behind</h1>
    <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:1.05rem;line-height:1.7">A sample of completed residential and commercial treatments. Every job documented, every result guaranteed.</p>
  </div>
</section>

<!-- BEFORE / AFTER SLIDERS -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:1100px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3rem" data-reveal>
      <div class="section-kicker">Before and After</div>
      <h2 class="section-title" style="color:#111827">Drag to Compare</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2.5rem">
      <div data-reveal>${baSlider(photos[0], photos[2])}</div>
      <div data-reveal data-delay="2">${baSlider(photos[1], photos[3])}</div>
    </div>
  </div>
</section>

<!-- GALLERY GRID -->
<section style="background:var(--color-gray-bg);padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3rem" data-reveal>
      <div class="section-kicker">Photo Gallery</div>
      <h2 class="section-title" style="color:#111827">Documented Treatments</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">
      ${photos.map((p, i) => `<div class="gallery-item" style="position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:var(--card-radius);cursor:pointer" data-reveal data-delay="${(i % 4) + 1}">
        <img src="${p}" alt="Treatment result ${i + 1}" style="width:100%;height:100%;object-fit:cover;display:block">
        <div class="gallery-overlay">
          <span style="font-family:'Inter',sans-serif;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;border:1.5px solid rgba(255,255,255,.7);padding:.5rem 1.25rem;border-radius:4px">View Project</span>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="background:var(--color-dark);padding:var(--section-pad) 1.5rem;text-align:center" data-reveal>
  <div style="max-width:600px;margin:0 auto">
    <h2 class="section-title" style="color:#fff;margin-bottom:1.5rem">Ready for Results Like These?</h2>
    <a href="${baseUrl}/contact" class="btn-primary">Book a Free Inspection</a>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
${BA_SLIDER_JS}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: TESTIMONIALS
// ══════════════════════════════════════════════════════════════════════════════

function buildTestimonialsPage(biz: BizPageData, baseUrl: string): string {
  const reviewPad = [
    { name: 'Sarah M.', city: biz.city || 'Local', stars: 5, text: 'Called them after noticing ants in the kitchen. They came the next morning, found the colony entry point, and treated inside and out. Not a single ant since.' },
    { name: 'Robert T.', city: biz.city || 'Local', stars: 5, text: 'Quarterly plan is worth every dollar. They do the perimeter, check the attic and crawl space, and leave a written report each visit.' },
    { name: 'Jennifer K.', city: biz.city || 'Local', stars: 5, text: 'Had a massive wasp nest in the garage eave. They handled it within 90 minutes of my call. Professional and completely drama-free.' },
    { name: 'Marcus D.', city: biz.city || 'Local', stars: 5, text: 'Switched from a national chain and the difference is immediate. These guys explain everything they find and what they are treating with.' },
    { name: 'Linda P.', city: biz.city || 'Local', stars: 5, text: 'Termite inspection before we bought our house. Report was detailed and clear. They flagged a crawl space issue that saved us from a major repair.' },
    { name: 'Chris W.', city: biz.city || 'Local', stars: 5, text: 'Bed bug treatment worked on the first visit. They prepped us on what to do before and after, and followed up two weeks later to confirm.' },
    { name: 'Amanda R.', city: biz.city || 'Local', stars: 5, text: 'Mosquito control has made summer evenings usable again. Three treatments in and we can actually sit outside without getting eaten alive.' },
    { name: 'Tom H.', city: biz.city || 'Local', stars: 5, text: 'Rodent issue in the attic. They sealed every entry point and trapped what was inside. No recurrence in six months.' },
    { name: 'Diana F.', city: biz.city || 'Local', stars: 5, text: 'Called for a cockroach problem in the kitchen. They identified the infestation source behind the refrigerator, treated everything, and it has been clean for four months.' },
  ];

  const allReviews = [...(biz.reviewTexts || []).map((t, i) => ({ name: 'Customer', city: biz.city || 'Local', stars: 5, text: t })), ...reviewPad].slice(0, 10);
  const featured = allReviews[0];
  const gridReviews = allReviews.slice(1, 10);

  return `${head('Reviews', biz)}
<body>
${nav(biz, baseUrl)}

<!-- HERO -->
<section style="background:var(--color-dark);padding:calc(var(--section-pad) + 5rem) 1.5rem var(--section-pad);text-align:center">
  <div style="max-width:680px;margin:0 auto" data-reveal>
    <div class="section-kicker">Testimonials</div>
    <h1 class="section-title" style="color:#fff;margin-bottom:1rem">What Our Customers Say</h1>
    <p style="font-family:'Inter',sans-serif;color:#9ca3af;font-size:1.05rem;line-height:1.7">${biz.reviews ? `${biz.reviews}+ verified reviews` : 'Verified reviews'} from homeowners and businesses across ${biz.city || 'the area'}.</p>
  </div>
</section>

<!-- FEATURED REVIEW -->
<section style="background:#fff;padding:var(--section-pad) 1.5rem">
  <div style="max-width:860px;margin:0 auto" data-reveal>
    <div style="background:var(--color-gray-bg);border-radius:16px;padding:3rem;border-left:4px solid var(--color-primary);text-align:center">
      <div style="font-size:1.5rem;letter-spacing:.12em;color:var(--color-primary);margin-bottom:1.5rem">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <blockquote style="font-family:'Inter',sans-serif;font-size:clamp(1.05rem,2.5vw,1.35rem);color:#111827;line-height:1.7;margin-bottom:1.5rem;font-style:italic">&ldquo;${featured.text}&rdquo;</blockquote>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;text-transform:uppercase;color:#111827">${featured.name}</div>
      <div style="font-family:'Inter',sans-serif;font-size:.8rem;color:var(--color-text-muted);margin-top:.25rem">${featured.city}</div>
    </div>
  </div>
</section>

<!-- REVIEWS GRID -->
<section style="background:var(--color-gray-bg);padding:var(--section-pad) 1.5rem">
  <div style="max-width:1280px;margin:0 auto">
    <div style="text-align:center;margin-bottom:3rem" data-reveal>
      <div class="section-kicker">More Reviews</div>
      <h2 class="section-title" style="color:#111827">Hear From More Customers</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem">
      ${gridReviews.map((r, i) => `<div style="background:#fff;border-radius:var(--card-radius);padding:1.75rem;border:1px solid #f3f4f6;box-shadow:0 2px 12px rgba(0,0,0,.05)" data-reveal data-delay="${(i % 3) + 1}">
        <div style="color:var(--color-primary);font-size:.9rem;letter-spacing:.1em;margin-bottom:.75rem">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p style="font-family:'Inter',sans-serif;font-size:.9rem;color:#374151;line-height:1.7;margin-bottom:1rem">&ldquo;${r.text}&rdquo;</p>
        <div style="font-family:'Inter',sans-serif;font-size:.8rem;font-weight:600;color:#111827">${r.name}</div>
        <div style="font-family:'Inter',sans-serif;font-size:.75rem;color:#9ca3af">${r.city}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="background:var(--color-dark);padding:var(--section-pad) 1.5rem;text-align:center" data-reveal>
  <div style="max-width:600px;margin:0 auto">
    <div class="section-kicker">Add Yours</div>
    <h2 class="section-title" style="color:#fff;margin-bottom:1.5rem">Ready to Become Our Next Happy Customer?</h2>
    <a href="${baseUrl}/contact" class="btn-primary">Book a Free Inspection</a>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export function buildPestControlAllPages(
  biz: BizPageData,
  baseUrl: string
): Record<string, string> {
  return {
    home:         buildHomePage(biz, baseUrl),
    about:        buildAboutPage(biz, baseUrl),
    contact:      buildContactPage(biz, baseUrl),
    team:         buildTeamPage(biz, baseUrl),
    gallery:      buildGalleryPage(biz, baseUrl),
    testimonials: buildTestimonialsPage(biz, baseUrl),
  };
}
