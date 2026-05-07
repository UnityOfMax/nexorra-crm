/**
 * Landscaping page builder — "GreenForm" design identity.
 * Deep forest green + lime accent: Barlow Condensed display + Inter body.
 * Palette: #0a1a12 bg, #0d2018 panels, #73cf11 lime, #f5f5f5 light bg.
 * Six pages: home, about, contact, team, gallery, testimonials.
 * Features: data-reveal scroll animations, before/after sliders, CSS marquee, OpenStreetMap.
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ph(idx: number, biz: BizPageData): string {
  const FALLBACKS = [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
    'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&crop=entropy',
    'https://images.unsplash.com/photo-1561406636-b80293969660?w=800&q=80',
    'https://images.unsplash.com/photo-1574879948818-0b6e87b79099?w=800&q=80',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80',
  ];
  return biz.photos[idx] || FALLBACKS[idx % FALLBACKS.length];
}

function telLink(phone: string | null): string {
  return (phone ?? '').replace(/[^0-9+]/g, '');
}

function reviewPad(biz: BizPageData, count: number): Array<{ text: string; reviewer: string; city: string; svc: string }> {
  const padData = [
    { text: 'They completely transformed our backyard into something we actually use every day. The crew was on time, communicated throughout, and left the site cleaner than they found it. Already referred three neighbors.', reviewer: 'Sandra K.', city: biz.city || 'Local Area', svc: 'Landscape Design' },
    { text: 'Best investment we made in our home. The design consultation took about an hour and they understood exactly what we wanted. The result exceeded every expectation we had going in.', reviewer: 'Mike and Dana O.', city: 'North Side', svc: 'Full Yard Installation' },
    { text: 'Our lawn has never looked this consistent in fifteen years. They come every two weeks and the quality is exactly the same every time. We stopped worrying about the yard entirely.', reviewer: 'James R.', city: biz.city || 'South District', svc: 'Lawn Maintenance' },
    { text: 'Exceptionally knowledgeable about native plants and regional soil. The garden they designed is thriving through a full seasonal cycle with almost zero intervention from us.', reviewer: 'Patricia N.', city: 'East Metro', svc: 'Garden Installation' },
    { text: 'Called them for an emergency cleanup before a large outdoor event. They showed up within the day, assessed the situation, and had everything in perfect condition by the following morning.', reviewer: 'Tom & Lucy B.', city: 'Lakeside', svc: 'Seasonal Cleanup' },
    { text: 'The stone patio and retaining wall changed how we think about our property. The work is solid, the drainage is correct, and it looks better than the reference photos we gave them.', reviewer: 'Robert M.', city: 'Millbrook', svc: 'Hardscaping' },
    { text: 'We had a challenging slope that other companies refused to touch. They walked the site, proposed a terraced solution, and executed it over four days. Exceptional craftsmanship.', reviewer: 'Angela F.', city: biz.city || 'West Hills', svc: 'Retaining Walls' },
    { text: 'Year three of a full maintenance contract and the property looks better every season. They adjust plantings proactively, not just when we ask. That level of initiative is rare.', reviewer: 'Dave L.', city: 'Ridgefield', svc: 'Annual Maintenance' },
    { text: 'The irrigation system they installed cut our water bill by nearly 30 percent. Smarter zones, better coverage, and the lawn has never been healthier. Paid for itself in two seasons.', reviewer: 'Sheila P.', city: biz.city || 'North County', svc: 'Irrigation' },
    { text: 'Our commercial property needed a full overhaul to meet HOA standards. The team handled the full scope without issues and finished two days ahead of schedule. Reliable all the way through.', reviewer: 'Corporate Properties LLC', city: biz.city || 'Downtown', svc: 'Commercial Landscaping' },
  ];
  const base = (biz.reviewTexts || []).map((text, i) => ({
    text,
    reviewer: padData[i]?.reviewer || 'Verified Customer',
    city: padData[i]?.city || biz.city || 'Local Area',
    svc: padData[i]?.svc || 'Landscaping Services',
  }));
  while (base.length < count) {
    base.push(padData[base.length % padData.length]);
  }
  return base.slice(0, count);
}

// ── Before/After Slider ────────────────────────────────────────────────────────

function baSlider(beforeUrl: string, afterUrl: string, label?: string): string {
  return `<div class="ba-container" style="position:relative;overflow:hidden;border-radius:var(--card-radius);aspect-ratio:16/9;cursor:ew-resize;user-select:none">
  <img src="${esc(afterUrl)}" alt="${label ? esc(label) + ' after' : 'After landscaping'}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div class="ba-before" style="position:absolute;inset:0;clip-path:inset(0 50% 0 0)">
    <img src="${esc(beforeUrl)}" alt="${label ? esc(label) + ' before' : 'Before landscaping'}" style="width:100%;height:100%;object-fit:cover">
  </div>
  <div style="position:absolute;top:14px;left:14px;background:rgba(10,26,18,0.85);color:#e5e5e5;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;font-family:var(--font-body);border-radius:4px">Before</div>
  <div style="position:absolute;top:14px;right:14px;background:var(--lime);color:#0a1a12;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;font-family:var(--font-body);border-radius:4px">After</div>
  <div class="ba-handle" style="position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--lime);touch-action:none">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;background:var(--lime);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(115,207,17,.25),0 4px 20px rgba(0,0,0,.5)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a1a12" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
}

const BA_JS = `<script>
document.querySelectorAll('.ba-container').forEach(c=>{
  const b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle');let d=false;
  function pos(x){const r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}
  h.addEventListener('mousedown',()=>d=true);window.addEventListener('mouseup',()=>d=false);window.addEventListener('mousemove',e=>{if(d)pos(e.clientX);});
  h.addEventListener('touchstart',e=>{d=true;e.preventDefault();},{passive:false});window.addEventListener('touchend',()=>d=false);window.addEventListener('touchmove',e=>{if(d)pos(e.touches[0].clientX);},{passive:true});
});
</script>`;

const DATA_REVEAL_CSS = `[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease;}[data-reveal].revealed{opacity:1;transform:translateY(0);}[data-delay="1"]{transition-delay:.1s;}[data-delay="2"]{transition-delay:.2s;}[data-delay="3"]{transition-delay:.3s;}[data-delay="4"]{transition-delay:.4s;}`;

const DATA_REVEAL_JS = `<script>(function(){const io=new IntersectionObserver((e)=>{e.forEach(i=>{if(i.isIntersecting){i.target.classList.add('revealed');io.unobserve(i.target);}});},{threshold:.1,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));})();</script>`;

// ── Shared CSS ─────────────────────────────────────────────────────────────────

function globalStyles(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --lime:#73cf11;
  --lime-hover:#5aaa0d;
  --dark:#0a1a12;
  --dark-2:#0d2018;
  --gray-bg:#f5f5f5;
  --gray-100:#e5e5e5;
  --white:#ffffff;
  --text:#1a1a1a;
  --text-muted:#6b7280;
  --section-pad:clamp(4rem,8vw,7rem);
  --card-radius:12px;
  --transition-base:.35s cubic-bezier(.4,0,.2,1);
  --font-display:'Barlow Condensed',Impact,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
}
body{font-family:var(--font-body);background:var(--dark);color:var(--white);font-weight:300;-webkit-font-smoothing:antialiased}
a{text-decoration:none;color:inherit}
img{display:block;width:100%;height:100%;object-fit:cover}
.btn-lime{display:inline-block;background:var(--lime);color:#0a1a12;font-family:var(--font-body);font-weight:600;font-size:.88rem;letter-spacing:.12em;text-transform:uppercase;padding:.9rem 2.4rem;border-radius:6px;transition:background var(--transition-base);cursor:pointer}
.btn-lime:hover{background:var(--lime-hover)}
.btn-ghost{display:inline-block;border:2px solid rgba(255,255,255,.5);color:var(--white);font-family:var(--font-body);font-weight:500;font-size:.88rem;letter-spacing:.12em;text-transform:uppercase;padding:.85rem 2.2rem;border-radius:6px;transition:all var(--transition-base);cursor:pointer}
.btn-ghost:hover{border-color:var(--lime);color:var(--lime)}
.section-eye{font-family:var(--font-body);font-size:.7rem;letter-spacing:.35em;text-transform:uppercase;color:var(--lime);margin-bottom:.85rem}
input,select,textarea{background:rgba(255,255,255,.06);border:1px solid rgba(115,207,17,.2);color:var(--white);font-family:var(--font-body);font-size:.92rem;padding:.85rem 1rem;width:100%;outline:none;transition:border-color var(--transition-base);border-radius:8px}
input:focus,select:focus,textarea:focus{border-color:var(--lime)}
select option{background:#0d2018;color:var(--white)}
label{display:block;font-size:.68rem;letter-spacing:.22em;text-transform:uppercase;color:var(--text-muted);margin-bottom:.45rem}
.form-group{margin-bottom:1.25rem}
#ls-mobile-menu{display:none}
#ls-mobile-menu.open{display:flex}
@media(max-width:768px){.ls-desktop-links{display:none!important}.two-col{grid-template-columns:1fr!important}.three-col{grid-template-columns:1fr!important}}
@media(min-width:769px){#ls-hamburger{display:none!important}}
${DATA_REVEAL_CSS}
/* Marquee */
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.testimonials__track{display:flex;gap:1.5rem;width:max-content;animation:marquee 42s linear infinite}
.testimonials__track:hover{animation-play-state:paused}
.testimonials__wrap{overflow:hidden;mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent)}
/* Sticky Why-Us */
.why-sticky{position:sticky;top:80px;align-self:flex-start}
/* Nav transparent on scroll */
.ls-nav{transition:background var(--transition-base),border-bottom-color var(--transition-base)}
.ls-nav.scrolled{background:rgba(10,26,18,.97)!important;border-bottom-color:var(--lime)!important;backdrop-filter:blur(12px)}
/* Gallery hover */
.gal-img-wrap{overflow:hidden;border-radius:var(--card-radius)}
.gal-img-wrap img{transition:transform .5s ease}
.gal-img-wrap:hover img{transform:scale(1.05)}
/* Service cards */
.svc-card-img{overflow:hidden;border-radius:var(--card-radius) var(--card-radius) 0 0;aspect-ratio:4/3}
.svc-card-img img{transition:transform .5s ease}
.svc-card:hover .svc-card-img img{transform:scale(1.05)}
</style>`;
}

const NAV_SCROLL_JS = `<script>
(function(){
  const nav=document.querySelector('.ls-nav');
  if(!nav)return;
  function tick(){nav.classList.toggle('scrolled',window.scrollY>60);}
  window.addEventListener('scroll',tick,{passive:true});tick();
})();
</script>`;

// ── Nav ────────────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string): string {
  const links = [
    { href: baseUrl, label: 'Home' },
    { href: `${baseUrl}/about`, label: 'About' },
    { href: `${baseUrl}/gallery`, label: 'Gallery' },
    { href: `${baseUrl}/team`, label: 'Team' },
    { href: `${baseUrl}/testimonials`, label: 'Reviews' },
    { href: `${baseUrl}/contact`, label: 'Contact' },
  ];
  const leftLinks = links.slice(1, 3);
  const rightLinks = links.slice(3, 5);
  return `<nav class="ls-nav" style="position:fixed;top:0;left:0;right:0;z-index:50;background:transparent;border-bottom:1px solid transparent">
  <div style="max-width:1200px;margin:0 auto;padding:0 1.5rem;height:68px;display:flex;align-items:center;justify-content:space-between">
    <div class="ls-desktop-links" style="display:flex;align-items:center;gap:2.25rem">
      ${leftLinks.map(l => `<a href="${l.href}" style="font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.65);transition:color var(--transition-base)" onmouseover="this.style.color='var(--lime)'" onmouseout="this.style.color='rgba(255,255,255,.65)'">${l.label}</a>`).join('')}
    </div>
    <a href="${baseUrl}" style="position:absolute;left:50%;transform:translateX(-50%);text-align:center">
      <span style="font-family:var(--font-display);font-size:1.5rem;font-weight:800;color:var(--white);letter-spacing:.1em;line-height:1;text-transform:uppercase">${esc(biz.name)}</span>
    </a>
    <div class="ls-desktop-links" style="display:flex;align-items:center;gap:2.25rem">
      ${rightLinks.map(l => `<a href="${l.href}" style="font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.65);transition:color var(--transition-base)" onmouseover="this.style.color='var(--lime)'" onmouseout="this.style.color='rgba(255,255,255,.65)'">${l.label}</a>`).join('')}
      <a href="${baseUrl}/contact" class="btn-lime" style="padding:.55rem 1.4rem;font-size:.75rem">Free Quote</a>
    </div>
    <button id="ls-hamburger" aria-label="Menu" onclick="document.getElementById('ls-mobile-menu').classList.toggle('open')" style="background:none;border:none;cursor:pointer;padding:.25rem">
      <svg width="24" height="24" fill="none" stroke="var(--white)" stroke-width="2.5" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
  </div>
  <div id="ls-mobile-menu" style="flex-direction:column;gap:0;background:#0a1a12;border-top:1px solid rgba(115,207,17,.2);padding:.5rem 0">
    ${links.map(l => `<a href="${l.href}" style="display:block;padding:.85rem 1.5rem;font-size:.82rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.65);border-bottom:1px solid rgba(115,207,17,.08)">${l.label}</a>`).join('')}
    ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" style="display:block;padding:.9rem 1.5rem;font-family:var(--font-display);font-size:1.4rem;font-weight:700;color:var(--lime);letter-spacing:.06em">${esc(biz.phone)}</a>` : ''}
  </div>
</nav>`;
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  const foundedYear = biz.yearsInBiz ? (new Date().getFullYear() - parseInt(biz.yearsInBiz)) : 2011;
  return `<footer style="background:#060e09;border-top:2px solid var(--lime);padding:4.5rem 1.5rem 2.5rem">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:3rem">
    <div>
      <div style="font-family:var(--font-display);font-size:1.9rem;font-weight:800;color:var(--white);letter-spacing:.08em;text-transform:uppercase;margin-bottom:.35rem">${esc(biz.name)}</div>
      <div style="font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;color:var(--text-muted);margin-bottom:1.25rem">Licensed &amp; Insured${foundedYear ? ' · Est. ' + foundedYear : ''}</div>
      ${biz.address ? `<div style="font-size:.87rem;color:var(--text-muted);line-height:1.7;margin-bottom:.75rem">${esc(biz.address)}</div>` : ''}
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" style="font-family:var(--font-display);font-size:1.4rem;font-weight:700;color:var(--lime);letter-spacing:.06em;transition:opacity var(--transition-base)" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">${esc(biz.phone)}</a>` : ''}
    </div>
    <div>
      <div style="font-size:.68rem;letter-spacing:.3em;text-transform:uppercase;color:var(--lime);margin-bottom:1.25rem">Navigation</div>
      ${[['About', `${baseUrl}/about`], ['Gallery', `${baseUrl}/gallery`], ['Team', `${baseUrl}/team`], ['Reviews', `${baseUrl}/testimonials`], ['Contact', `${baseUrl}/contact`]]
        .map(([l, h]) => `<div style="margin-bottom:.5rem"><a href="${h}" style="font-size:.87rem;color:var(--text-muted);transition:color var(--transition-base)" onmouseover="this.style.color='var(--lime)'" onmouseout="this.style.color='var(--text-muted)'">${l}</a></div>`).join('')}
    </div>
    <div>
      <div style="font-size:.68rem;letter-spacing:.3em;text-transform:uppercase;color:var(--lime);margin-bottom:1.25rem">Hours</div>
      <div style="font-size:.87rem;color:var(--text-muted);line-height:2">${esc(biz.hours || 'Mon–Fri: 7am–6pm')}<br>Sat: 8am–2pm<br>Sun: Estimates Only</div>
    </div>
    <div>
      <div style="font-size:.68rem;letter-spacing:.3em;text-transform:uppercase;color:var(--lime);margin-bottom:1.25rem">Certifications</div>
      <div style="font-size:.8rem;color:var(--text-muted);line-height:2">NALP Certified<br>ISA Certified Arborists<br>BBB Accredited A+<br>Licensed &amp; Insured</div>
    </div>
  </div>
  <div style="max-width:1100px;margin:2.5rem auto 0;padding-top:1.5rem;border-top:1px solid rgba(115,207,17,.12);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
    <span style="font-size:.75rem;color:rgba(107,114,128,.5)">© ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</span>
    <span style="font-size:.75rem;color:rgba(107,114,128,.5)">Licensed &amp; Insured · Serving ${esc(biz.city || 'your area')}</span>
  </div>
</footer>`;
}

// ── Lime service icons ─────────────────────────────────────────────────────────

const LS_ICONS = [
  `<svg width="28" height="28" fill="none" stroke="var(--lime)" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z"/></svg>`,
  `<svg width="28" height="28" fill="none" stroke="var(--lime)" stroke-width="1.6" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  `<svg width="28" height="28" fill="none" stroke="var(--lime)" stroke-width="1.6" viewBox="0 0 24 24"><rect x="2" y="14" width="20" height="6" rx="2"/><path d="M6 14V8a6 6 0 0112 0v6"/></svg>`,
  `<svg width="28" height="28" fill="none" stroke="var(--lime)" stroke-width="1.6" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="4"/></svg>`,
  `<svg width="28" height="28" fill="none" stroke="var(--lime)" stroke-width="1.6" viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 22"/><path d="M9.5 9.5c1 2.5 3.5 3.5 6.5 3s5-2.5 4.5-6.5c-2.5.5-5.5 1.5-11 3.5z"/></svg>`,
  `<svg width="28" height="28" fill="none" stroke="var(--lime)" stroke-width="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
];

// ── HOME PAGE ──────────────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {
  const foundedYear = biz.yearsInBiz ? (new Date().getFullYear() - parseInt(biz.yearsInBiz)) : 2011;

  const defaultSvcs = [
    { name: 'Landscape Design & Installation', desc: 'Custom outdoor design matched to your soil, climate, and usage patterns. We plan it, plant it, and hand over a property that looks intentional — not just maintained.', price: 'Free Consultation', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80' },
    { name: 'Lawn Maintenance', desc: 'Regular mowing, edging, aeration, and fertilization on a schedule that actually fits your yard\'s growth cycle. Consistent results, every visit.', price: 'Starting $75/visit', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    { name: 'Hardscaping & Patios', desc: 'Patios, walkways, retaining walls, and fire pit surrounds. We build structures that hold up to freeze-thaw cycles and look good doing it.', price: 'Free Estimate', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80' },
    { name: 'Irrigation Systems', desc: 'Smart zone irrigation designed around your specific planting layout. Reduces water usage, eliminates dry spots, and connects to your phone.', price: 'Free Assessment', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&crop=entropy' },
    { name: 'Tree & Shrub Care', desc: 'Pruning, shaping, disease treatment, and removal by ISA-certified arborists. We work on the canopy so your landscape stays healthy at every layer.', price: 'Starting $120', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80' },
    { name: 'Seasonal Cleanup & Planting', desc: 'Spring and fall cleanups, annual color rotations, and mulch installation. We keep the property sharp through every transition in the growing calendar.', price: 'Seasonal Pricing', image: 'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800&q=80' },
  ];

  const svcs = [...(biz.services || [])];
  while (svcs.length < 6) svcs.push(defaultSvcs[svcs.length % defaultSvcs.length]);
  const svcImages = defaultSvcs.map(s => s.image);

  const reviews = reviewPad(biz, 8);
  const marqueeItems = [...reviews, ...reviews];

  const galleryPhotos = [ph(0, biz), ph(1, biz), ph(2, biz), ph(3, biz), ph(4, biz), ph(5, biz)];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(biz.name)}${biz.city ? ' — Landscaping in ' + esc(biz.city) : ' — Professional Landscaping'}</title>
<meta name="description" content="Licensed landscaping contractor${biz.city ? ' in ' + esc(biz.city) : ''}. ${esc(biz.heroSub || 'Landscape design, lawn maintenance, hardscaping, and irrigation. Free consultations.')}">
${globalStyles()}
</head>
<body>
${nav(biz, baseUrl)}

<!-- 1. HERO -->
<section style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden">
  <div style="position:absolute;inset:0">
    <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1920&q=80" alt="Lush garden landscape" style="width:100%;height:100%;object-fit:cover;object-position:center">
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,26,18,.55) 0%,rgba(10,26,18,.75) 60%,rgba(10,26,18,.92) 100%)"></div>
  </div>
  <div style="position:relative;z-index:2;padding:10rem 1.5rem 5rem;max-width:980px;text-align:center;width:100%">
    <div style="font-family:var(--font-body);font-size:.72rem;letter-spacing:.45em;text-transform:uppercase;color:var(--lime);margin-bottom:1.5rem;opacity:.9">Licensed &amp; Insured · ${esc(biz.city || 'Serving Your Area')}</div>
    <h1 style="font-family:var(--font-display);font-size:clamp(3.5rem,10vw,8rem);font-weight:800;color:var(--white);letter-spacing:.06em;line-height:.92;text-transform:uppercase;margin-bottom:1.75rem">${esc(biz.name || 'GREENFORM LANDSCAPING')}</h1>
    <p style="font-size:1.05rem;color:rgba(255,255,255,.75);max-width:520px;margin:0 auto 2.75rem;line-height:1.75;font-weight:300">${esc(biz.heroSub || 'Custom landscape design, expert installation, and year-round maintenance for properties that reflect the care put into them.')}</p>
    <div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center;align-items:center">
      <a href="${baseUrl}/contact" class="btn-ghost" style="font-size:.92rem;padding:1rem 2.75rem">Get a Free Quote</a>
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" style="font-size:.88rem;color:rgba(255,255,255,.7);letter-spacing:.08em;font-weight:500;transition:color var(--transition-base)" onmouseover="this.style.color='var(--lime)'" onmouseout="this.style.color='rgba(255,255,255,.7)'">${esc(biz.phone)}</a>` : ''}
    </div>
  </div>
  <div style="position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.5rem;opacity:.5">
    <span style="font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;color:var(--white)">Scroll</span>
    <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke="var(--white)" stroke-width="1.5"><rect x="1" y="1" width="14" height="22" rx="7"/><path d="M8 5v6"/></svg>
  </div>
</section>

<!-- 2. TRUST BAR -->
<section style="background:var(--gray-bg);padding:2rem 1.5rem">
  <div style="max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:0">
    ${[
      ['Free Consultations', `<svg width="18" height="18" fill="none" stroke="var(--lime-hover)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`],
      ['Licensed & Insured', `<svg width="18" height="18" fill="none" stroke="var(--lime-hover)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`],
      ['500+ Projects Completed', `<svg width="18" height="18" fill="none" stroke="var(--lime-hover)" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`],
      ['NALP Certified', `<svg width="18" height="18" fill="none" stroke="var(--lime-hover)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`],
      ['100% Satisfaction Guarantee', `<svg width="18" height="18" fill="none" stroke="var(--lime-hover)" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`],
    ].map(([label, icon], i) => `
    <div style="display:flex;align-items:center;gap:.6rem;padding:.75rem 1.75rem;${i < 4 ? 'border-right:1px solid var(--gray-100)' : ''}">
      ${icon}
      <span style="font-size:.78rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text);white-space:nowrap">${label}</span>
    </div>`).join('')}
  </div>
</section>

<!-- 3. SERVICES -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--white)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="section-eye" style="color:#5aaa0d">What We Do</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2.5rem,5vw,4rem);font-weight:800;color:var(--text);letter-spacing:.05em;text-transform:uppercase;line-height:.95;margin-bottom:1rem">Our Services</h2>
      <div style="width:52px;height:3px;background:var(--lime);margin:0 auto"></div>
    </div>
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem">
      ${svcs.slice(0, 6).map((s, i) => `
      <div class="svc-card" data-reveal data-delay="${Math.min(i + 1, 4)}" style="background:var(--gray-bg);border-radius:var(--card-radius);overflow:hidden;transition:box-shadow var(--transition-base)" onmouseover="this.style.boxShadow='0 12px 40px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='none'">
        <div class="svc-card-img">
          <img src="${svcImages[i] || ph(i, biz)}" alt="${esc(s.name)}" loading="lazy">
        </div>
        <div style="padding:1.5rem">
          <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.65rem">
            ${LS_ICONS[i % LS_ICONS.length]}
            <h3 style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--text);letter-spacing:.04em;text-transform:uppercase;line-height:1.1">${esc(s.name)}</h3>
          </div>
          <p style="font-size:.875rem;color:var(--text-muted);line-height:1.7;margin-bottom:.85rem">${esc(s.desc || defaultSvcs[i % defaultSvcs.length].desc)}</p>
          <span style="font-size:.75rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--lime-hover)">${esc(s.price || defaultSvcs[i % defaultSvcs.length].price)}</span>
        </div>
      </div>`).join('')}
    </div>
    <div data-reveal style="text-align:center;margin-top:2.75rem">
      <a href="${baseUrl}/contact" class="btn-lime" style="font-size:.95rem">Request a Free Quote</a>
    </div>
  </div>
</section>

<!-- 4. SHOWREEL -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark)">
  <div style="max-width:1100px;margin:0 auto">
    <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center">
      <div data-reveal style="border-radius:var(--card-radius);overflow:hidden;aspect-ratio:4/5;position:relative">
        <img src="${ph(1, biz)}" alt="Landscape transformation" style="width:100%;height:100%;object-fit:cover">
        <div style="position:absolute;bottom:1.75rem;left:1.75rem;background:var(--lime);padding:1.25rem 1.5rem;border-radius:8px">
          <div style="font-family:var(--font-display);font-size:2.4rem;font-weight:800;color:#0a1a12;line-height:1">${biz.yearsInBiz || '15'}+</div>
          <div style="font-size:.65rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(10,26,18,.7)">Years of Experience</div>
        </div>
      </div>
      <div data-reveal data-delay="2">
        <div class="section-eye">Our Work</div>
        <h2 style="font-family:var(--font-display);font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;color:var(--white);letter-spacing:.04em;text-transform:uppercase;line-height:1;margin-bottom:1.5rem">Transforming Outdoor Spaces Since ${foundedYear}.</h2>
        <p style="font-size:.98rem;color:rgba(255,255,255,.6);line-height:1.85;margin-bottom:1.2rem">${esc(biz.aboutText || `Every project we take on gets the same attention: a site assessment, a real design conversation, and a crew that treats your property like their own. We do not do cookie-cutter installs.`)}</p>
        <p style="font-size:.98rem;color:rgba(255,255,255,.6);line-height:1.85;margin-bottom:2rem">${esc(biz.aboutText2 || `From single-family residential to commercial grounds, our team handles full landscape design, installation, and ongoing maintenance under one roof. No subcontractors. Direct accountability.`)}</p>
        <a href="${baseUrl}/gallery" class="btn-lime">See Our Work</a>
      </div>
    </div>
  </div>
</section>

<!-- 5. WHY US — STICKY LEFT -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2)">
  <div style="max-width:1100px;margin:0 auto">
    <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start">
      <div class="why-sticky" data-reveal>
        <div class="section-eye">Why Choose Us</div>
        <h2 style="font-family:var(--font-display);font-size:clamp(2.4rem,4.5vw,3.8rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;line-height:.95;margin-bottom:1.5rem">What Sets Our Work Apart</h2>
        <p style="font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.85;margin-bottom:2rem">We have been doing this long enough to know what separates a good install from a great one. Five things we hold to on every single project.</p>
        <a href="${baseUrl}/contact" class="btn-lime">Start Your Project</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        ${[
          ['01', 'Custom Design Process', 'Every design starts with a full site assessment. We study drainage, sun exposure, and how you actually use your outdoor space before a single plant is selected.'],
          ['02', 'Master-Certified Crew', 'Our lead designers hold NALP and ISA certifications. The installation crew trains directly under them — no temp labor, no corners cut.'],
          ['03', '10-Year Workmanship Warranty', 'We back every installation with a decade of coverage. If hardscaping shifts, drainage fails, or plant material dies within the warranty period, we fix it at no cost.'],
          ['04', 'Drought-Resistant Expertise', 'We design around your climate, not against it. Native and adaptive planting reduces water needs by up to 50% while maintaining a full, healthy appearance year-round.'],
          ['05', 'Year-Round Maintenance Plans', 'One company handles your property from spring cleanup through winter dormancy. Consistent crew, consistent standards, no re-explaining your preferences each season.'],
        ].map(([num, title, desc], i) => `
        <div data-reveal data-delay="${Math.min(i + 1, 4)}" style="background:rgba(255,255,255,.04);border-radius:10px;padding:1.75rem;border-left:3px solid var(--lime);transition:background var(--transition-base)" onmouseover="this.style.background='rgba(115,207,17,.07)'" onmouseout="this.style.background='rgba(255,255,255,.04)'">
          <div style="font-family:var(--font-display);font-size:2.4rem;font-weight:800;color:var(--lime);line-height:1;margin-bottom:.6rem;opacity:.8">${num}</div>
          <h3 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;color:var(--white);letter-spacing:.06em;text-transform:uppercase;margin-bottom:.55rem">${esc(title)}</h3>
          <p style="font-size:.875rem;color:rgba(255,255,255,.5);line-height:1.75">${esc(desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>

<!-- 6. GALLERY PREVIEW -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--white)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="section-eye" style="color:#5aaa0d">Our Portfolio</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2.4rem,5vw,3.8rem);font-weight:800;color:var(--text);letter-spacing:.05em;text-transform:uppercase;line-height:.95;margin-bottom:1rem">Recent Projects</h2>
      <div style="width:52px;height:3px;background:var(--lime);margin:0 auto"></div>
    </div>
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
      ${galleryPhotos.map((url, i) => `
      <div class="gal-img-wrap" data-reveal data-delay="${Math.min((i % 3) + 1, 4)}" style="aspect-ratio:${i === 0 || i === 5 ? '1/1' : '4/3'}">
        <img src="${url}" alt="Landscaping project ${i + 1}" loading="lazy">
      </div>`).join('')}
    </div>
    <div data-reveal style="text-align:center;margin-top:2.5rem">
      <a href="${baseUrl}/gallery" class="btn-lime">View Full Gallery</a>
    </div>
  </div>
</section>

<!-- 7. TESTIMONIALS MARQUEE -->
<section style="padding:var(--section-pad) 0;background:var(--dark);overflow:hidden">
  <div data-reveal style="text-align:center;padding:0 1.5rem;margin-bottom:3rem">
    <div class="section-eye">Client Reviews</div>
    <h2 style="font-family:var(--font-display);font-size:clamp(2.4rem,5vw,3.8rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;line-height:.95">What Clients Say</h2>
  </div>
  <div class="testimonials__wrap">
    <div class="testimonials__track">
      ${marqueeItems.map((r, i) => `
      <div style="min-width:360px;max-width:360px;background:var(--dark-2);border-radius:var(--card-radius);padding:2rem;border:1px solid rgba(115,207,17,.12);flex-shrink:0" key="${i}">
        <div style="font-size:1rem;color:var(--lime);letter-spacing:.1em;margin-bottom:1rem">★★★★★</div>
        <p style="font-size:.92rem;color:rgba(255,255,255,.8);line-height:1.7;margin-bottom:1.25rem">"${esc(r.text)}"</p>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:.78rem;font-weight:600;color:rgba(255,255,255,.6)">${esc(r.reviewer)}</div>
          <div style="font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(115,207,17,.6)">${esc(r.svc)}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div data-reveal style="text-align:center;margin-top:3rem;padding:0 1.5rem">
    <a href="${baseUrl}/testimonials" class="btn-ghost">Read All Reviews</a>
  </div>
</section>

<!-- 8. FAQ -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--gray-bg)">
  <div style="max-width:780px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="section-eye" style="color:#5aaa0d">Common Questions</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2.2rem,4vw,3.2rem);font-weight:800;color:var(--text);letter-spacing:.05em;text-transform:uppercase;line-height:.95">Frequently Asked</h2>
    </div>
    <div style="display:flex;flex-direction:column;gap:1px">
      ${[
        ['How long does a typical landscape installation take?', `Most residential projects run between three and ten days depending on scope. Hardscaping elements like patios and retaining walls take longer than planting-only installs. After the initial design meeting we provide a specific timeline with milestones before any work begins.`],
        ['Do you handle the permit process for hardscaping projects?', `Yes. We manage permit applications for any work that requires them, including retaining walls over a certain height and drainage modifications. We include permit costs in the project quote so there are no surprises.`],
        ['What is included in a year-round maintenance plan?', `Plans include regularly scheduled mowing and edging, seasonal fertilization, spring and fall cleanups, mulch replenishment, and an annual irrigation system check. Plans are customized to your property size and planting inventory.`],
        ['Do you offer drought-resistant or native planting options?', `Drought-resistant and native plantings are a core part of what we recommend for most properties. Native species reduce maintenance needs significantly, require less water, and support local ecosystems. We walk you through specific options for your region during the design consultation.`],
        ['What does the free consultation involve?', `We schedule a site visit, walk the property together, discuss your goals and budget, and take measurements. Within five to seven business days you receive a written proposal with a design concept, plant list or hardscape materials, and a full cost breakdown.`],
      ].map(([q, a], i) => `
      <details data-reveal style="background:var(--white);border-radius:${i === 0 ? '10px 10px 0 0' : i === 4 ? '0 0 10px 10px' : '0'};overflow:hidden">
        <summary style="padding:1.4rem 1.75rem;cursor:pointer;font-family:var(--font-body);font-size:.95rem;font-weight:600;color:var(--text);list-style:none;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--gray-100);user-select:none">
          ${esc(q)}
          <svg width="18" height="18" fill="none" stroke="var(--lime-hover)" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;margin-left:1rem;transition:transform .3s ease"><path d="M6 9l6 6 6-6"/></svg>
        </summary>
        <div style="padding:1.4rem 1.75rem 1.6rem;font-size:.9rem;color:var(--text-muted);line-height:1.8;border-bottom:1px solid var(--gray-100)">${esc(a)}</div>
      </details>`).join('')}
    </div>
  </div>
</section>

<!-- 9. CONTACT CTA -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark);text-align:center">
  <div data-reveal style="max-width:680px;margin:0 auto">
    <div class="section-eye">Get Started</div>
    <h2 style="font-family:var(--font-display);font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;line-height:.95;margin-bottom:1.25rem">Ready to Transform Your Property?</h2>
    <p style="font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.8;margin-bottom:2.5rem">Free consultation. No pressure. We walk your property and come back with a real plan, not a brochure.</p>
    <div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center">
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn-lime" style="font-size:1.1rem;padding:1.1rem 3rem">${esc(biz.phone)}</a>` : ''}
      <a href="${baseUrl}/contact" class="btn-ghost" style="font-size:.92rem;padding:1rem 2.4rem">Send a Message</a>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${BA_JS}
${DATA_REVEAL_JS}
${NAV_SCROLL_JS}
</body>
</html>`;
}

// ── ABOUT PAGE ─────────────────────────────────────────────────────────────────

function buildAbout(biz: BizPageData, baseUrl: string): string {
  const foundedYear = biz.yearsInBiz ? (new Date().getFullYear() - parseInt(biz.yearsInBiz)) : 2011;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>About — ${esc(biz.name)}</title>
${globalStyles()}
</head>
<body>
${nav(biz, baseUrl)}

<!-- HEADER -->
<section style="padding:9rem 1.5rem 5rem;background:var(--dark);border-bottom:1px solid rgba(115,207,17,.15);text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,rgba(115,207,17,.07) 0%,transparent 65%);pointer-events:none"></div>
  <div data-reveal class="section-eye">Our Story</div>
  <h1 data-reveal data-delay="1" style="font-family:var(--font-display);font-size:clamp(3.5rem,8vw,7rem);font-weight:800;color:var(--white);letter-spacing:.06em;line-height:.92;text-transform:uppercase;margin-bottom:1.5rem">Built on<br>Honest Work</h1>
  <div data-reveal data-delay="2" style="width:52px;height:3px;background:var(--lime);margin:0 auto"></div>
</section>

<!-- STORY -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2)">
  <div style="max-width:1050px;margin:0 auto">
    <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start">
      <div data-reveal>
        <div class="section-eye">How We Started</div>
        <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;line-height:.95;margin-bottom:1.75rem">A Business Built on Referrals</h2>
        <p style="font-size:.98rem;color:rgba(255,255,255,.6);line-height:1.9;margin-bottom:1.4rem">${esc(biz.aboutText || `${biz.name} started in ${foundedYear} with ${biz.teamName || 'a small team'} who believed that good landscaping should outlast the first hard season. We grew entirely through referrals from homeowners who noticed the difference.`)}</p>
        <p style="font-size:.98rem;color:rgba(255,255,255,.6);line-height:1.9;margin-bottom:1.4rem">${esc(biz.aboutText2 || `We work in ${biz.city || 'this area'} because we live and garden here. We know the soil composition, the native plant palette, and what holds up through local winters. That familiarity is not something you can fake.`)}</p>
        <p style="font-size:.98rem;color:rgba(255,255,255,.6);line-height:1.9">Today the team is larger but the approach has not changed. Every project is assessed in person, designed for its specific site, and installed by direct employees who have been with us long enough to care about the outcome.</p>
      </div>
      <div data-reveal data-delay="2" style="position:relative">
        <div style="aspect-ratio:4/5;overflow:hidden;border-radius:var(--card-radius)">
          <img src="${ph(0, biz)}" alt="${esc(biz.name)} team at work" style="width:100%;height:100%;object-fit:cover">
        </div>
        <div style="position:absolute;bottom:-1.5rem;right:-1.5rem;background:var(--lime);padding:1.5rem;width:145px;text-align:center;border-radius:8px">
          <div style="font-family:var(--font-display);font-size:2.8rem;font-weight:800;color:#0a1a12;line-height:1">${biz.yearsInBiz || '15'}+</div>
          <div style="font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(10,26,18,.65);font-weight:600">Years in Business</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- VALUES -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="section-eye">Our Values</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2.4rem,5vw,3.8rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;line-height:.95">How We Work</h2>
      <div style="width:52px;height:3px;background:var(--lime);margin:1rem auto 0"></div>
    </div>
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem">
      ${[
        ['Site-First Design', 'Every design begins with the land. Drainage patterns, sun exposure, existing vegetation, and how the space is actually used all shape the final plan. Templates do not work in landscaping.', LS_ICONS[0]],
        ['Certified Team Only', 'No subcontractors. Every person who touches your property is a direct employee trained under NALP and ISA guidelines. We know who is on your site and what they are doing.', LS_ICONS[4]],
        ['Decade-Long Warranty', 'We back our work with a 10-year workmanship warranty. If it moves, fails, or dies prematurely, we return and correct it. That commitment reflects how we build, not just how we sell.', LS_ICONS[2]],
      ].map(([title, desc, icon], i) => `
      <div data-reveal data-delay="${i + 1}" style="background:var(--dark-2);padding:2.5rem;border-radius:var(--card-radius);border-top:3px solid var(--lime)">
        <div style="margin-bottom:1.25rem">${icon}</div>
        <h3 style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--white);letter-spacing:.06em;text-transform:uppercase;margin-bottom:.75rem">${esc(title)}</h3>
        <p style="font-size:.875rem;color:rgba(255,255,255,.5);line-height:1.8">${esc(desc)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CERTIFICATIONS -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2);border-top:1px solid rgba(115,207,17,.1)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="section-eye">Credentials</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase">Certifications & Memberships</h2>
    </div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1rem">
      ${['NALP Certified Landscape Professional', 'ISA Certified Arborist', 'BBB Accredited A+ Rating', 'Licensed & Insured', 'State Contractor License', 'EPA WaterSense Partner'].map((cert, i) => `
      <div data-reveal data-delay="${Math.min(i + 1, 4)}" style="background:rgba(115,207,17,.08);border:1px solid rgba(115,207,17,.2);padding:.8rem 1.75rem;border-radius:40px">
        <span style="font-size:.8rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.8)">${esc(cert)}</span>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- TEAM PREVIEW -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="section-eye">The Team</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase">People Behind the Work</h2>
    </div>
    <div data-reveal style="text-align:center">
      <a href="${baseUrl}/team" class="btn-lime">Meet the Team</a>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
${NAV_SCROLL_JS}
</body>
</html>`;
}

// ── CONTACT PAGE ───────────────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {
  const bbox = '-97.85,30.15,-97.55,30.45';
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact — ${esc(biz.name)}</title>
${globalStyles()}
</head>
<body>
${nav(biz, baseUrl)}

<!-- HEADER -->
<section style="padding:9rem 1.5rem 5rem;background:var(--dark);border-bottom:1px solid rgba(115,207,17,.15);text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,rgba(115,207,17,.06) 0%,transparent 65%);pointer-events:none"></div>
  <div data-reveal class="section-eye">Get In Touch</div>
  <h1 data-reveal data-delay="1" style="font-family:var(--font-display);font-size:clamp(3.5rem,8vw,6.5rem);font-weight:800;color:var(--white);letter-spacing:.06em;line-height:.92;text-transform:uppercase">Request a<br>Free Consultation</h1>
  ${biz.phone ? `<div data-reveal data-delay="2" style="margin-top:2rem"><a href="tel:${telLink(biz.phone)}" style="font-family:var(--font-display);font-size:clamp(2.2rem,5vw,3.5rem);font-weight:800;color:var(--lime);letter-spacing:.04em;transition:opacity var(--transition-base)" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">${esc(biz.phone)}</a></div>` : ''}
</section>

<!-- CONTACT SPLIT -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2)">
  <div style="max-width:1100px;margin:0 auto">
    <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start">

      <!-- FORM -->
      <div data-reveal>
        <h2 style="font-family:var(--font-display);font-size:1.8rem;font-weight:800;color:var(--white);letter-spacing:.06em;text-transform:uppercase;margin-bottom:2rem">Send a Message</h2>
        <form>
          <div class="form-group"><label>Full Name</label><input type="text" placeholder="John Smith"></div>
          <div class="form-group"><label>Phone</label><input type="tel" placeholder="${biz.phone ? esc(biz.phone) : '(555) 000-0000'}"></div>
          <div class="form-group"><label>Email</label><input type="email" placeholder="you@example.com"></div>
          <div class="form-group"><label>Service Needed</label>
            <select>
              <option value="">Select a service</option>
              <option>Landscape Design & Installation</option>
              <option>Lawn Maintenance</option>
              <option>Hardscaping & Patios</option>
              <option>Irrigation Systems</option>
              <option>Tree & Shrub Care</option>
              <option>Seasonal Cleanup & Planting</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group"><label>Message (optional)</label><textarea rows="4" placeholder="Describe your project or questions..."></textarea></div>
          <button type="submit" class="btn-lime" style="width:100%;font-size:.92rem;padding:1rem">Request Free Consultation</button>
        </form>
      </div>

      <!-- INFO -->
      <div data-reveal data-delay="2" style="display:flex;flex-direction:column;gap:2rem">
        ${biz.phone ? `<div>
          <div class="section-eye">Call or Text</div>
          <a href="tel:${telLink(biz.phone)}" style="font-family:var(--font-display);font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:800;color:var(--lime);letter-spacing:.04em;transition:opacity var(--transition-base)" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">${esc(biz.phone)}</a>
          <p style="font-size:.82rem;color:rgba(255,255,255,.4);margin-top:.4rem">Mon–Fri 7am–6pm, Sat 8am–2pm</p>
        </div>` : ''}
        ${biz.address ? `<div>
          <div class="section-eye">Location</div>
          <p style="font-size:.95rem;color:rgba(255,255,255,.7);line-height:1.7">${esc(biz.address)}</p>
        </div>` : ''}
        <div>
          <div class="section-eye">Service Area</div>
          <p style="font-size:.95rem;color:rgba(255,255,255,.7);line-height:1.7">We serve ${esc(biz.city || 'the greater metro area')} and surrounding communities within 40 miles.</p>
        </div>
        <div>
          <div class="section-eye">Hours</div>
          <p style="font-size:.95rem;color:rgba(255,255,255,.7);line-height:1.9">${esc(biz.hours || 'Mon–Fri: 7am–6pm')}<br>Sat: 8am–2pm<br>Sun: Estimates by appointment</p>
        </div>
        <div style="border-radius:var(--card-radius);overflow:hidden;height:240px">
          <iframe src="${mapSrc}" width="100%" height="240" style="border:0;display:block" loading="lazy" title="Service area map"></iframe>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- FAQ -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark)">
  <div style="max-width:780px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="section-eye">Before You Call</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase">Quick Answers</h2>
    </div>
    <div style="display:flex;flex-direction:column;gap:1px">
      ${[
        ['Do you provide free estimates?', 'Yes. We schedule a free site visit, walk the property with you, and provide a written proposal within five to seven business days at no charge.'],
        ['How soon can you start?', 'Scheduling depends on current project load and season. Maintenance plans typically start within a week. Design-build projects are scheduled out two to four weeks from signed contract.'],
        ['Do you work on commercial properties?', 'Yes. We handle commercial grounds maintenance, commercial landscape installation, and HOA common area management. Pricing is based on site size and scope.'],
        ['What areas do you serve?', `We serve ${esc(biz.city || 'the local area')} and communities within 40 miles. Contact us to confirm coverage for your specific address.`],
        ['Is a deposit required?', 'Design-build projects require a 30% deposit to hold your scheduled start date. Maintenance plans are invoiced monthly after service.'],
      ].map(([q, a], i) => `
      <details data-reveal style="background:var(--dark-2);border-radius:${i === 0 ? '10px 10px 0 0' : i === 4 ? '0 0 10px 10px' : '0'};overflow:hidden">
        <summary style="padding:1.4rem 1.75rem;cursor:pointer;font-family:var(--font-body);font-size:.95rem;font-weight:600;color:var(--white);list-style:none;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(115,207,17,.08);user-select:none">
          ${esc(q)}
          <svg width="18" height="18" fill="none" stroke="var(--lime)" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;margin-left:1rem"><path d="M6 9l6 6 6-6"/></svg>
        </summary>
        <div style="padding:1.4rem 1.75rem 1.6rem;font-size:.9rem;color:rgba(255,255,255,.55);line-height:1.8;border-bottom:1px solid rgba(115,207,17,.06)">${esc(a)}</div>
      </details>`).join('')}
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
${NAV_SCROLL_JS}
</body>
</html>`;
}

// ── TEAM PAGE ──────────────────────────────────────────────────────────────────

function buildTeam(biz: BizPageData, baseUrl: string): string {
  const defaultTeam: import('./multi-page-builder').TeamMember[] = [
    { name: biz.teamName || 'Marcus Webb', role: 'Owner & Lead Designer', bio: `Founded ${esc(biz.name)} after a decade running projects for regional design firms. NALP certified, Austin-based, with a focus on native planting and sustainable hardscaping.` },
    { name: 'Rachel Torres', role: 'Senior Landscape Designer', bio: 'ISA Certified Arborist and horticulturalist specializing in drought-resistant plant palettes. Has managed over 200 residential installs across central Texas.' },
    { name: 'Derek Shaw', role: 'Hardscape Project Lead', bio: 'Fifteen years building patios, retaining walls, and irrigation systems. Manages all permit coordination and specialty subsoil drainage work.' },
    { name: 'Priya Nair', role: 'Maintenance Operations Manager', bio: 'Oversees all recurring maintenance contracts, scheduling, and seasonal transitions. Holds a turf science certification and manages a crew of twelve.' },
  ];
  const teamMembers: import('./multi-page-builder').TeamMember[] = biz.team && biz.team.length ? biz.team : defaultTeam;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Team — ${esc(biz.name)}</title>
${globalStyles()}
</head>
<body>
${nav(biz, baseUrl)}

<!-- HEADER -->
<section style="padding:9rem 1.5rem 5rem;background:var(--dark);border-bottom:1px solid rgba(115,207,17,.15);text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,rgba(115,207,17,.06) 0%,transparent 65%);pointer-events:none"></div>
  <div data-reveal class="section-eye">The People</div>
  <h1 data-reveal data-delay="1" style="font-family:var(--font-display);font-size:clamp(3.5rem,8vw,7rem);font-weight:800;color:var(--white);letter-spacing:.06em;line-height:.92;text-transform:uppercase">Meet the Team</h1>
  <div data-reveal data-delay="2" style="width:52px;height:3px;background:var(--lime);margin:1.5rem auto 0"></div>
</section>

<!-- TEAM GRID -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2)">
  <div style="max-width:1100px;margin:0 auto">
    <div class="two-col" style="display:grid;grid-template-columns:repeat(2,1fr);gap:2rem">
      ${teamMembers.map((member, i) => {
        const initials = (member.name || 'TM').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        return `
      <div data-reveal data-delay="${Math.min(i + 1, 4)}" style="background:var(--dark);border-radius:var(--card-radius);padding:2.5rem;border:1px solid rgba(115,207,17,.1);display:flex;gap:1.5rem;align-items:flex-start;transition:border-color var(--transition-base)" onmouseover="this.style.borderColor='rgba(115,207,17,.35)'" onmouseout="this.style.borderColor='rgba(115,207,17,.1)'">
        ${member.photo
          ? `<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="${esc(member.photo)}" alt="${esc(member.name)}" style="width:100%;height:100%;object-fit:cover"></div>`
          : `<div style="width:72px;height:72px;border-radius:50%;background:var(--lime);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-family:var(--font-display);font-size:1.6rem;font-weight:800;color:#0a1a12">${initials}</span></div>`
        }
        <div style="flex:1">
          <h3 style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--white);letter-spacing:.06em;text-transform:uppercase;margin-bottom:.2rem">${esc(member.name)}</h3>
          <div style="font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--lime);margin-bottom:.85rem">${esc(member.role)}</div>
          <p style="font-size:.875rem;color:rgba(255,255,255,.5);line-height:1.75">${esc(member.bio || `${member.name} is a key member of the ${biz.name} team, bringing expertise and dedication to every project.`)}</p>
        </div>
      </div>`;
      }).join('')}
    </div>
  </div>
</section>

<!-- JOIN CTA -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark);border-top:1px solid rgba(115,207,17,.1);text-align:center">
  <div data-reveal style="max-width:600px;margin:0 auto">
    <div class="section-eye">Join the Team</div>
    <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3.2rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;margin-bottom:1.25rem">We Are Always Looking for Skilled People</h2>
    <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:2rem">If you take craftsmanship seriously and want to work with a team that does the same, get in touch. We pay above market, provide certification support, and promote from within.</p>
    <a href="${baseUrl}/contact" class="btn-lime">Get In Touch</a>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
${NAV_SCROLL_JS}
</body>
</html>`;
}

// ── GALLERY PAGE ───────────────────────────────────────────────────────────────

function buildGallery(biz: BizPageData, baseUrl: string): string {
  const galleryPhotoCount = 9;
  const galleryPhotos = Array.from({ length: galleryPhotoCount }, (_, i) => ph(i, biz));
  const beforePhotos = [ph(0, biz), ph(2, biz), ph(4, biz)];
  const afterPhotos = [ph(1, biz), ph(3, biz), ph(5, biz)];
  const projectLabels = ['Backyard Redesign', 'Front Entry Planting', 'Patio & Retaining Wall'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gallery — ${esc(biz.name)}</title>
${globalStyles()}
</head>
<body>
${nav(biz, baseUrl)}

<!-- HEADER -->
<section style="padding:9rem 1.5rem 5rem;background:var(--dark);border-bottom:1px solid rgba(115,207,17,.15);text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,rgba(115,207,17,.06) 0%,transparent 65%);pointer-events:none"></div>
  <div data-reveal class="section-eye">Portfolio</div>
  <h1 data-reveal data-delay="1" style="font-family:var(--font-display);font-size:clamp(3.5rem,8vw,7rem);font-weight:800;color:var(--white);letter-spacing:.06em;line-height:.92;text-transform:uppercase">Our Work</h1>
  <div data-reveal data-delay="2" style="width:52px;height:3px;background:var(--lime);margin:1.5rem auto 0"></div>
</section>

<!-- GALLERY GRID -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--white)">
  <div style="max-width:1100px;margin:0 auto">
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
      ${galleryPhotos.map((url, i) => `
      <div class="gal-img-wrap" data-reveal data-delay="${Math.min((i % 3) + 1, 4)}" style="aspect-ratio:${[0, 3, 7].includes(i) ? '1/1' : '4/3'}">
        <img src="${url}" alt="Landscaping project ${i + 1}" loading="lazy">
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- BEFORE/AFTER -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="section-eye">Transformations</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2.4rem,5vw,3.8rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;line-height:.95">Before & After</h2>
      <p style="font-size:.88rem;color:rgba(255,255,255,.4);margin-top:1rem">Drag the handle to compare</p>
    </div>
    <div style="display:grid;gap:2.5rem">
      ${beforePhotos.map((before, i) => `
      <div data-reveal>
        <div style="margin-bottom:1rem;display:flex;align-items:center;gap:1rem">
          <span style="font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:var(--white);letter-spacing:.06em;text-transform:uppercase">${projectLabels[i]}</span>
          <span style="font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;background:var(--lime);color:#0a1a12;padding:.2rem .75rem;border-radius:4px;font-weight:600">Completed</span>
        </div>
        ${baSlider(before, afterPhotos[i], projectLabels[i])}
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2);text-align:center;border-top:1px solid rgba(115,207,17,.1)">
  <div data-reveal style="max-width:600px;margin:0 auto">
    <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3.2rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;margin-bottom:1.25rem">Want Results Like These?</h2>
    <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:2rem">Start with a free site consultation. We walk the property, discuss the design, and give you a written plan before any commitment is required.</p>
    <a href="${baseUrl}/contact" class="btn-lime">Request a Free Consultation</a>
  </div>
</section>

${footer(biz, baseUrl)}
${BA_JS}
${DATA_REVEAL_JS}
${NAV_SCROLL_JS}
</body>
</html>`;
}

// ── TESTIMONIALS PAGE ──────────────────────────────────────────────────────────

function buildTestimonials(biz: BizPageData, baseUrl: string): string {
  const allReviews = reviewPad(biz, 10);
  const featured = allReviews[0];
  const gridReviews = allReviews.slice(1, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reviews — ${esc(biz.name)}</title>
${globalStyles()}
</head>
<body>
${nav(biz, baseUrl)}

<!-- HEADER -->
<section style="padding:9rem 1.5rem 5rem;background:var(--dark);border-bottom:1px solid rgba(115,207,17,.15);text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,rgba(115,207,17,.06) 0%,transparent 65%);pointer-events:none"></div>
  <div data-reveal class="section-eye">Client Feedback</div>
  <h1 data-reveal data-delay="1" style="font-family:var(--font-display);font-size:clamp(3.5rem,8vw,7rem);font-weight:800;color:var(--white);letter-spacing:.06em;line-height:.92;text-transform:uppercase">What Clients Say</h1>
  <div data-reveal data-delay="2" style="width:52px;height:3px;background:var(--lime);margin:1.5rem auto 0"></div>
</section>

<!-- FEATURED REVIEW -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2)">
  <div style="max-width:860px;margin:0 auto">
    <div data-reveal style="background:var(--dark);border-radius:var(--card-radius);padding:3.5rem;border-top:4px solid var(--lime);text-align:center">
      <div style="font-size:1.3rem;color:var(--lime);letter-spacing:.15em;margin-bottom:1.75rem">★★★★★</div>
      <blockquote style="font-family:var(--font-display);font-size:clamp(1.4rem,2.5vw,2rem);font-weight:700;color:var(--white);letter-spacing:.04em;line-height:1.3;margin-bottom:2rem;font-style:italic">"${esc(featured.text)}"</blockquote>
      <div style="font-size:.88rem;font-weight:600;color:rgba(255,255,255,.7)">${esc(featured.reviewer)}</div>
      <div style="font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--lime);margin-top:.3rem">${esc(featured.svc)}</div>
    </div>
  </div>
</section>

<!-- REVIEW GRID -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="section-eye">All Reviews</div>
      <h2 style="font-family:var(--font-display);font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase">More From Our Clients</h2>
    </div>
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      ${gridReviews.map((r, i) => `
      <div data-reveal data-delay="${Math.min((i % 3) + 1, 4)}" style="background:var(--dark-2);border-radius:var(--card-radius);padding:2rem;border:1px solid rgba(115,207,17,.1);transition:border-color var(--transition-base)" onmouseover="this.style.borderColor='rgba(115,207,17,.3)'" onmouseout="this.style.borderColor='rgba(115,207,17,.1)'">
        <div style="font-size:.95rem;color:var(--lime);letter-spacing:.1em;margin-bottom:.85rem">★★★★★</div>
        <p style="font-size:.9rem;color:rgba(255,255,255,.75);line-height:1.75;margin-bottom:1.25rem">"${esc(r.text)}"</p>
        <div style="font-size:.78rem;font-weight:600;color:rgba(255,255,255,.5)">${esc(r.reviewer)}</div>
        <div style="font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(115,207,17,.5);margin-top:.25rem">${esc(r.svc)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:var(--section-pad) 1.5rem;background:var(--dark-2);border-top:1px solid rgba(115,207,17,.1);text-align:center">
  <div data-reveal style="max-width:600px;margin:0 auto">
    <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3.2rem);font-weight:800;color:var(--white);letter-spacing:.05em;text-transform:uppercase;margin-bottom:1.25rem">Join Our Satisfied Clients</h2>
    <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:2rem">Every project starts with a free, no-pressure site consultation. We walk the property with you, listen, and come back with a real plan.</p>
    <a href="${baseUrl}/contact" class="btn-lime">Get a Free Consultation</a>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
${NAV_SCROLL_JS}
</body>
</html>`;
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────

export function buildLandscapingAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home: buildHome(biz, baseUrl),
    about: buildAbout(biz, baseUrl),
    contact: buildContact(biz, baseUrl),
    team: buildTeam(biz, baseUrl),
    gallery: buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
