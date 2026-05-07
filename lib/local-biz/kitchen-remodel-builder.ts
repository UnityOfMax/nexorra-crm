/**
 * Kitchen Remodel demo website builder
 * Design: Cormorant Garamond (headings) + Inter (body/UI)
 * Palette: #d97706 amber/gold on #1a0f05 espresso dark
 * Pattern: Hugo Builders LLC layout adapted for kitchen remodeling
 * 6 pages: home, about, contact, team, gallery, testimonials
 */

import { BizPageData } from './multi-page-builder';

// ── Helpers ───────────────────────────────────────────────────────────────────

function ph(biz: BizPageData): string {
  return biz.phone || '(720) 555-0100';
}

function telHref(biz: BizPageData): string {
  return `tel:${(biz.phone || '').replace(/[^0-9+]/g, '')}`;
}

function pad<T>(arr: T[], len: number, fill: T): T[] {
  const out = [...arr];
  while (out.length < len) out.push(fill);
  return out.slice(0, len);
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const CSS_VARS = `
<style>
:root{
  --color-primary:#d97706;
  --color-primary-hover:#b45309;
  --color-dark:#1a0f05;
  --color-dark-2:#231508;
  --color-gray-bg:#f5f5f5;
  --color-gray-100:#e5e5e5;
  --color-white:#ffffff;
  --color-text:#1a1a1a;
  --color-text-muted:#6b7280;
  --section-pad:clamp(4rem,8vw,7rem);
  --card-radius:12px;
  --transition-base:.35s cubic-bezier(.4,0,.2,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--color-dark);color:#fff;font-family:'Inter',sans-serif;font-weight:300;-webkit-font-smoothing:antialiased}

/* ── Scroll reveal ── */
[data-reveal]{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease}
[data-reveal].revealed{opacity:1;transform:none}
[data-reveal="left"]{transform:translateX(-32px)}
[data-reveal="left"].revealed{transform:none}
[data-reveal="right"]{transform:translateX(32px)}
[data-reveal="right"].revealed{transform:none}
[data-reveal="scale"]{transform:scale(.95)}
[data-reveal="scale"].revealed{transform:none}

/* ── Nav ── */
#site-nav{position:fixed;top:0;left:0;right:0;z-index:900;padding:0 clamp(1.25rem,4vw,3.5rem);display:flex;align-items:center;justify-content:space-between;height:72px;transition:background var(--transition-base),box-shadow var(--transition-base)}
#site-nav.scrolled{background:var(--color-dark);box-shadow:0 1px 0 rgba(217,119,6,.15)}
.nav-brand{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:700;color:var(--color-primary);text-decoration:none;letter-spacing:.03em;flex:1}
.nav-center{display:flex;align-items:center;gap:2.5rem;flex:2;justify-content:center}
.nav-right{display:flex;align-items:center;gap:1.5rem;flex:1;justify-content:flex-end}
.nav-link{font-size:.75rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.65);text-decoration:none;transition:color var(--transition-base)}
.nav-link:hover,.nav-link.active{color:var(--color-primary)}
.btn-primary{display:inline-flex;align-items:center;gap:.5rem;background:var(--color-primary);color:#fff;font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:.65rem 1.5rem;border-radius:4px;text-decoration:none;transition:background var(--transition-base)}
.btn-primary:hover{background:var(--color-primary-hover)}
.btn-ghost{display:inline-flex;align-items:center;gap:.5rem;border:1.5px solid var(--color-primary);color:var(--color-primary);font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:.65rem 1.5rem;border-radius:4px;text-decoration:none;transition:all var(--transition-base)}
.btn-ghost:hover{background:var(--color-primary);color:#fff}

/* ── Hamburger ── */
#nav-toggle{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:6px}
#nav-toggle span{display:block;width:22px;height:2px;background:#fff;transition:var(--transition-base)}
#mobile-nav{display:none;flex-direction:column;background:var(--color-dark-2);border-top:1px solid rgba(217,119,6,.15);padding:1.5rem clamp(1.25rem,4vw,3.5rem) 2rem}
#mobile-nav .nav-link{font-size:.9rem;padding:.85rem 0;border-bottom:1px solid rgba(255,255,255,.06)}
#mobile-nav .btn-primary{margin-top:1.25rem;justify-content:center}

/* ── Trust bar ── */
.trust-bar{background:var(--color-gray-bg);padding:1.25rem clamp(1.25rem,4vw,3.5rem);border-top:3px solid var(--color-primary)}
.trust-list{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:clamp(1.25rem,3vw,3rem)}
.trust-item{display:flex;align-items:center;gap:.6rem;font-size:.8rem;font-weight:500;color:var(--color-text-muted);letter-spacing:.03em}
.trust-item svg{color:var(--color-primary);flex-shrink:0}

/* ── Cards ── */
.service-card{background:#fff;border-radius:var(--card-radius);overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.07);transition:transform var(--transition-base),box-shadow var(--transition-base)}
.service-card:hover{transform:translateY(-6px);box-shadow:0 12px 40px rgba(217,119,6,.18)}
.service-card img{width:100%;height:220px;object-fit:cover;display:block}
.service-card-body{padding:1.5rem}
.service-card-body h3{font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:700;color:var(--color-text);margin-bottom:.5rem}
.service-card-body p{font-size:.875rem;color:var(--color-text-muted);line-height:1.7}

/* ── Why-us (sticky left) ── */
.why-wrap{display:grid;grid-template-columns:1fr 1fr;min-height:600px}
.why-sticky{position:sticky;top:72px;height:calc(100vh - 72px);display:flex;flex-direction:column;justify-content:center;padding:clamp(2rem,6vw,5rem);background:var(--color-dark-2)}
.why-cards{padding:clamp(2rem,6vw,5rem);display:flex;flex-direction:column;gap:1.5rem;background:var(--color-dark)}
.why-card{background:rgba(255,255,255,.04);border:1px solid rgba(217,119,6,.15);border-radius:var(--card-radius);padding:1.75rem 1.5rem;display:flex;align-items:flex-start;gap:1.25rem;transition:border-color var(--transition-base),background var(--transition-base)}
.why-card:hover{border-color:var(--color-primary);background:rgba(217,119,6,.06)}
.why-num{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:800;color:var(--color-primary);line-height:1;min-width:2.5rem}
.why-card h3{font-size:.95rem;font-weight:600;color:#fff;margin-bottom:.4rem;letter-spacing:.01em}
.why-card p{font-size:.85rem;color:rgba(255,255,255,.55);line-height:1.65}

/* ── Gallery grid ── */
.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.gallery-thumb{aspect-ratio:4/3;overflow:hidden;border-radius:var(--card-radius)}
.gallery-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.gallery-thumb:hover img{transform:scale(1.07)}

/* ── Marquee testimonials ── */
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.testimonials-wrap{overflow:hidden;mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent)}
.testimonials-track{display:flex;gap:1.5rem;width:max-content;animation:marquee 45s linear infinite}
.testimonials-track:hover{animation-play-state:paused}
.testi-card{background:rgba(255,255,255,.05);border:1px solid rgba(217,119,6,.12);border-radius:var(--card-radius);padding:1.75rem 1.5rem;width:340px;flex-shrink:0}
.testi-stars{color:var(--color-primary);font-size:1rem;letter-spacing:.15em;margin-bottom:.85rem}
.testi-card p{font-size:.875rem;color:rgba(255,255,255,.75);line-height:1.7;margin-bottom:1rem}
.testi-name{font-size:.8rem;font-weight:600;color:rgba(255,255,255,.5);letter-spacing:.05em;text-transform:uppercase}

/* ── FAQ ── */
.faq-item{border-bottom:1px solid rgba(255,255,255,.08)}
.faq-item summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.35rem 0;cursor:pointer;font-size:.95rem;font-weight:500;color:rgba(255,255,255,.85);transition:color var(--transition-base)}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary:hover{color:var(--color-primary)}
.faq-item[open] summary{color:var(--color-primary)}
.faq-icon{width:20px;height:20px;flex-shrink:0;transition:transform var(--transition-base);color:var(--color-primary)}
.faq-item[open] .faq-icon{transform:rotate(45deg)}
.faq-body{padding:.25rem 0 1.25rem;font-size:.875rem;color:rgba(255,255,255,.5);line-height:1.8}

/* ── Before/after slider ── */
.ba-wrap{position:relative;overflow:hidden;border-radius:var(--card-radius);aspect-ratio:4/3;cursor:ew-resize;user-select:none}
.ba-after{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ba-before{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.ba-before img{width:100%;height:100%;object-fit:cover}
.ba-handle{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--color-primary);touch-action:none}
.ba-handle-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(217,119,6,.25),0 4px 20px rgba(0,0,0,.4)}
.ba-label{position:absolute;top:12px;font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:3px 10px;border-radius:2px}
.ba-label-before{left:12px;background:rgba(26,15,5,.85);color:rgba(255,255,255,.7)}
.ba-label-after{right:12px;background:var(--color-primary);color:#fff}

/* ── Forms ── */
.form-label{display:block;font-size:.75rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:.5rem}
.form-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#fff;font-family:'Inter',sans-serif;font-size:.9rem;padding:.75rem 1rem;outline:none;transition:border-color var(--transition-base)}
.form-input:focus{border-color:var(--color-primary)}
.form-input option{background:#1a0f05;color:#fff}

/* ── Kicker label ── */
.kicker{font-size:.7rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--color-primary)}

/* ── Section headings ── */
.section-title{font-family:'Cormorant Garamond',serif;font-weight:800;line-height:1.05;color:#fff}
.section-title--dark{color:var(--color-text)}
.section-title--gold{color:var(--color-primary)}

/* ── Info block ── */
.info-block{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:var(--card-radius);padding:1.5rem}
.info-block h3{font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:700;color:#fff;margin-bottom:.75rem}
.info-block p,.info-block div{font-size:.875rem;color:rgba(255,255,255,.5);line-height:1.8}

/* ── Team cards ── */
.team-card{background:rgba(255,255,255,.04);border:1px solid rgba(217,119,6,.12);border-radius:var(--card-radius);padding:2rem 1.75rem;text-align:center;transition:border-color var(--transition-base),transform var(--transition-base)}
.team-card:hover{border-color:var(--color-primary);transform:translateY(-4px)}
.team-avatar{width:72px;height:72px;border-radius:50%;background:rgba(217,119,6,.12);border:2px solid rgba(217,119,6,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;color:var(--color-primary)}
.team-name{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:.25rem}
.team-role{font-size:.7rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.5rem}
.team-cert{font-size:.8rem;color:rgba(255,255,255,.45);margin-bottom:1rem}
.team-bio{font-size:.85rem;color:rgba(255,255,255,.5);line-height:1.75}

/* ── Responsive ── */
@media(max-width:900px){
  .nav-center{display:none}
  .nav-right .nav-link{display:none}
  #nav-toggle{display:flex}
  .why-wrap{grid-template-columns:1fr}
  .why-sticky{position:static;height:auto}
  .gallery-grid{grid-template-columns:repeat(2,1fr)}
  .three-col{grid-template-columns:1fr 1fr!important}
}
@media(max-width:640px){
  .gallery-grid{grid-template-columns:1fr}
  .two-col{grid-template-columns:1fr!important}
  .three-col{grid-template-columns:1fr!important}
  .ba-grid{grid-template-columns:1fr!important}
}
</style>`;

// ── Before/after slider JS ─────────────────────────────────────────────────────

const BA_SLIDER_JS = `
<script>
document.querySelectorAll('.ba-wrap').forEach(function(c){
  var b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle'),dragging=false;
  function move(x){var r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}
  h.addEventListener('mousedown',function(){dragging=true;});
  window.addEventListener('mouseup',function(){dragging=false;});
  window.addEventListener('mousemove',function(e){if(dragging)move(e.clientX);});
  h.addEventListener('touchstart',function(e){dragging=true;e.preventDefault();},{passive:false});
  window.addEventListener('touchend',function(){dragging=false;});
  window.addEventListener('touchmove',function(e){if(dragging)move(e.touches[0].clientX);},{passive:true});
});
</script>`;

// ── Scroll-reveal JS ──────────────────────────────────────────────────────────

const REVEAL_JS = `
<script>
(function(){
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('revealed');obs.unobserve(e.target);}});
  },{threshold:.12});
  document.querySelectorAll('[data-reveal]').forEach(function(el){obs.observe(el);});
})();
</script>`;

// ── Nav scroll JS ─────────────────────────────────────────────────────────────

const NAV_SCROLL_JS = `
<script>
window.addEventListener('scroll',function(){
  document.getElementById('site-nav').classList.toggle('scrolled',window.scrollY>40);
});
document.getElementById('nav-toggle').addEventListener('click',function(){
  var m=document.getElementById('mobile-nav');
  m.style.display=m.style.display==='flex'?'none':'flex';
});
</script>`;

// ── Head ──────────────────────────────────────────────────────────────────────

function baseHead(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{}}}</script>
${CSS_VARS}
</head>
<body>`;
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string, active: string): string {
  const links = [
    { href: baseUrl,                    label: 'Home' },
    { href: `${baseUrl}/about`,         label: 'About' },
    { href: `${baseUrl}/gallery`,       label: 'Gallery' },
    { href: `${baseUrl}/team`,          label: 'Team' },
    { href: `${baseUrl}/testimonials`,  label: 'Reviews' },
    { href: `${baseUrl}/contact`,       label: 'Contact' },
  ];

  const leftLinks  = links.slice(0, 3);
  const rightLinks = links.slice(3);

  return `
<nav id="site-nav">
  <div class="nav-brand">${biz.name}</div>
  <div class="nav-center">
    ${leftLinks.map(l => `<a href="${l.href}" class="nav-link${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
  </div>
  <div class="nav-right">
    ${rightLinks.map(l => `<a href="${l.href}" class="nav-link${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
    <a href="${telHref(biz)}" class="btn-primary">Free Consultation</a>
  </div>
  <button id="nav-toggle" aria-label="Toggle menu">
    <span></span><span></span><span></span>
  </button>
</nav>
<div id="mobile-nav">
  ${links.map(l => `<a href="${l.href}" class="nav-link${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
  <a href="${telHref(biz)}" class="btn-primary">Free Consultation</a>
</div>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `
<footer style="background:#0d0804;border-top:1px solid rgba(217,119,6,.1);padding:4rem clamp(1.25rem,4vw,3.5rem) 2rem">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:3rem;margin-bottom:3rem">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.65rem;font-weight:800;color:var(--color-primary);margin-bottom:.75rem">${biz.name}</div>
      <p style="font-size:.875rem;color:rgba(255,255,255,.4);line-height:1.75">Premium kitchen remodeling in ${biz.city || 'your area'}, ${biz.state || 'CO'} and surrounding communities.</p>
      <div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap">
        ${['NKBA', 'NARI', 'BBB A+'].map(b => `<span style="font-size:.65rem;font-weight:700;letter-spacing:.1em;color:var(--color-primary);border:1px solid rgba(217,119,6,.3);border-radius:3px;padding:2px 8px">${b}</span>`).join('')}
      </div>
    </div>
    <div>
      <div style="font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:1.1rem">Navigation</div>
      ${[['Home', baseUrl], ['About', `${baseUrl}/about`], ['Gallery', `${baseUrl}/gallery`], ['Team', `${baseUrl}/team`], ['Reviews', `${baseUrl}/testimonials`], ['Contact', `${baseUrl}/contact`]].map(([label, href]) => `<a href="${href}" style="display:block;font-size:.875rem;color:rgba(255,255,255,.45);text-decoration:none;margin-bottom:.6rem;transition:color var(--transition-base)" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='rgba(255,255,255,.45)'">${label}</a>`).join('')}
    </div>
    <div>
      <div style="font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:1.1rem">Contact</div>
      <a href="${telHref(biz)}" style="display:block;font-family:'Cormorant Garamond',serif;font-size:1.65rem;font-weight:700;color:var(--color-primary);text-decoration:none;margin-bottom:.75rem">${ph(biz)}</a>
      ${biz.address ? `<p style="font-size:.875rem;color:rgba(255,255,255,.4);line-height:1.75;margin-bottom:.5rem">${biz.address}</p>` : ''}
      <p style="font-size:.875rem;color:rgba(255,255,255,.4);line-height:1.75">${biz.hours || 'Mon – Fri 8am – 6pm'}</p>
    </div>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,.06);padding-top:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
    <div style="font-size:.8rem;color:rgba(255,255,255,.25)">© ${new Date().getFullYear()} ${biz.name}. All rights reserved.</div>
    <div style="font-size:.8rem;color:rgba(255,255,255,.25)">Licensed &amp; Insured · NKBA Certified</div>
  </div>
</footer>`;
}

// ── Trust bar ─────────────────────────────────────────────────────────────────

function trustBar(): string {
  const items = [
    'Free Design Consultation',
    'Licensed Contractor',
    'NKBA Certified',
    '9+ Years Experience',
    '100% Satisfaction Guaranteed',
  ];
  return `
<div class="trust-bar">
  <div class="trust-list">
    ${items.map(item => `
    <div class="trust-item">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      ${item}
    </div>`).join('')}
  </div>
</div>`;
}

// ── BA Slider ─────────────────────────────────────────────────────────────────

function baSlider(beforeUrl: string, afterUrl: string): string {
  return `
<div class="ba-wrap">
  <img class="ba-after" src="${afterUrl}" alt="After renovation">
  <div class="ba-before"><img src="${beforeUrl}" alt="Before renovation"></div>
  <div class="ba-label ba-label-before">Before</div>
  <div class="ba-label ba-label-after">After</div>
  <div class="ba-handle">
    <div class="ba-handle-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {

  const imgBefore = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1920&q=80';
  const imgHero   = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1920&q=80';

  const serviceImgs = [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800',
  ];

  const galleryImgs = [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1556909195-b4194f6d049c?w=800&q=80',
    'https://images.unsplash.com/photo-1556909172-8c2f041fca1e?w=800&q=80',
    'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800&q=80',
  ];

  const services = [
    { img: serviceImgs[0], name: 'Full Kitchen Renovation',          desc: 'Complete strip-to-stud rebuilds designed around how you live.' },
    { img: serviceImgs[1], name: 'Cabinet Installation & Refacing',   desc: 'Custom, semi-custom, and refaced cabinetry with precise tolerances.' },
    { img: serviceImgs[2], name: 'Countertop Replacement',            desc: 'Quartz, granite, marble, and quartzite templated and installed right.' },
  ];

  const moreServices = [
    'Kitchen Island Design',
    'Appliance Integration',
    'Tile & Backsplash',
  ];

  const whyCards = [
    { num: '01', title: 'Custom Design Process',          desc: 'We start with how you cook, move, and live — not a catalog.' },
    { num: '02', title: 'NKBA Certified Designers',       desc: 'Every project is led by a nationally certified kitchen designer.' },
    { num: '03', title: 'Premium Material Sourcing',      desc: 'Stone yards, cabinet factories, and hardware showrooms — sourced by us.' },
    { num: '04', title: 'On-Time & On-Budget Guarantee',  desc: 'Written schedule, written estimate. No surprises at punch-list.' },
    { num: '05', title: '5-Year Workmanship Warranty',    desc: 'We stand behind every install for five years. One call, handled.' },
  ];

  const faqs = [
    ['How long does a kitchen remodel take?', 'A full gut renovation runs 6 to 10 weeks from demolition to final walkthrough. Cabinet-only or countertop-only scopes can close in 2 to 3 weeks. You receive a written schedule before a single tool touches your kitchen.'],
    ['What does a kitchen remodel cost?', 'Cabinet and countertop refreshes start around $15,000. Full gut renovations in our market range from $40,000 to $120,000 or more, depending on size and materials. We provide detailed, itemized estimates — no vague ranges.'],
    ['Can we live at home during the remodel?', 'Yes, most clients do. We use containment barriers, clean up at day-end, and maintain utility access where possible. Daily disruption is real, but manageable — we plan phasing around your routine.'],
    ['Do you pull permits?', 'Always. Every project that requires a permit gets one. We handle the application and inspection scheduling. Working without permits creates resale problems and voids warranties.'],
    ['Do you offer a warranty?', 'Yes — a five-year written warranty on all labor and installation. Manufacturer warranties on cabinets, countertops, and fixtures are separate, and we help you register them at close.'],
  ];

  const reviews = pad(biz.reviewTexts || [], 8, '');
  const reviewDefaults = [
    { text: 'From first consultation to final walkthrough, the process was completely transparent. The kitchen is extraordinary.', name: 'Margaret T.' },
    { text: 'They caught a clearance issue that would have made the dishwasher unusable before anything was built. That is the attention you pay for.', name: 'David R.' },
    { text: 'Three contractors said removing the wall was impossible. This team did it in six weeks and gave us an open kitchen that changed the whole home.', name: 'Priya K.' },
    { text: 'The tile work alone is worth every dollar. Moroccan zellige backsplash — perfect grout lines, not a single crack. Extraordinary.', name: 'James L.' },
    { text: 'Same footprint, completely different kitchen. 1990s oak to magazine-shoot in four weeks. The transformation is real.', name: 'Sandra M.' },
    { text: 'Sophia showed me the 3D render and I changed my mind about the cabinet color. The render saved me from a decision I would have regretted.', name: 'Clara B.' },
    { text: 'Carlos texted me a daily update every afternoon without me asking. In seven years of renovations I have never had that.', name: 'Thomas W.' },
    { text: 'The leathered quartzite countertop alone makes the whole kitchen feel ten years newer. Two weeks, total transformation.', name: 'Helen A.' },
  ];

  // Duplicate for infinite scroll
  const marqueePairs = [...reviewDefaults, ...reviewDefaults];

  return `${baseHead(`${biz.name} — Kitchen Remodeling in ${biz.city || 'Denver'}, ${biz.state || 'CO'}`)}
${nav(biz, baseUrl, 'Home')}

<!-- ── 1. HERO ── -->
<section style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden">
  <img src="${imgHero}" alt="Modern kitchen renovation" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(26,15,5,.55) 0%,rgba(26,15,5,.82) 100%);z-index:1"></div>
  <div style="position:relative;z-index:2;padding:clamp(6rem,12vw,9rem) clamp(1.25rem,4vw,3.5rem) clamp(4rem,8vw,7rem);max-width:900px;margin:0 auto">
    <div class="kicker" data-reveal style="margin-bottom:1.5rem">Kitchen Remodeling Specialists</div>
    <h1 data-reveal style="font-family:'Cormorant Garamond',serif;font-size:clamp(3rem,8vw,6rem);font-weight:700;line-height:1.02;color:#fff;margin-bottom:2rem">${biz.name}</h1>
    <p data-reveal style="font-size:clamp(.9rem,2vw,1.1rem);color:rgba(255,255,255,.65);max-width:560px;margin:0 auto 2.5rem;line-height:1.75">${biz.heroSub || `Premium kitchen renovations in ${biz.city || 'Denver'} built on craft, transparency, and work that holds.`}</p>
    <div data-reveal style="display:flex;align-items:center;justify-content:center;gap:1rem;flex-wrap:wrap">
      <a href="${baseUrl}/contact" class="btn-primary" style="padding:.85rem 2.25rem;font-size:.85rem">Schedule a Free Consultation</a>
      <a href="${baseUrl}/gallery" class="btn-ghost" style="padding:.85rem 2.25rem;font-size:.85rem">View Our Work</a>
    </div>
  </div>
  <!-- Scroll indicator -->
  <div style="position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;align-items:center;gap:.5rem;opacity:.5">
    <div style="font-size:.65rem;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#fff">Scroll</div>
    <div style="width:1px;height:40px;background:linear-gradient(to bottom,rgba(255,255,255,.6),transparent)"></div>
  </div>
</section>

<!-- ── 2. TRUST BAR ── -->
${trustBar()}

<!-- ── 3. SERVICES ── -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:#fff">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="kicker" style="color:var(--color-primary);margin-bottom:.75rem">What We Do</div>
      <h2 class="section-title--dark" style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,5vw,3.25rem);font-weight:800">Our Services</h2>
    </div>
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:2.5rem">
      ${services.map((s, i) => `
      <div class="service-card" data-reveal style="transition-delay:${i * .08}s">
        <img src="${s.img}" alt="${s.name}" loading="lazy">
        <div class="service-card-body">
          <h3>${s.name}</h3>
          <p>${s.desc}</p>
        </div>
      </div>`).join('')}
    </div>
    <div data-reveal style="display:flex;align-items:center;justify-content:center;gap:2rem;flex-wrap:wrap;margin-bottom:3rem">
      ${moreServices.map(s => `<div style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;color:var(--color-text-muted)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${s}</div>`).join('')}
    </div>
    <div data-reveal style="text-align:center">
      <a href="${telHref(biz)}" class="btn-primary" style="padding:.85rem 2.25rem">Get a Free Quote</a>
    </div>
  </div>
</section>

<!-- ── 4. SHOWREEL ── -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center" class="two-col">
    <div data-reveal="left">
      <img src="${biz.photos?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80'}" alt="Kitchen renovation" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--card-radius)">
    </div>
    <div data-reveal="right">
      <div class="kicker" style="margin-bottom:1rem">Our Work</div>
      <h2 class="section-title" style="font-size:clamp(1.75rem,4vw,2.75rem);margin-bottom:1.5rem">Every Kitchen Tells a Story. We Help Write Yours.</h2>
      <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:1rem">The kitchen is where your household starts every morning and where guests stay longest after dinner. An outdated kitchen is a daily friction that compounds over years.</p>
      <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:2rem">A well-executed renovation consistently returns 60 to 80 percent at resale. But the return you feel every morning when the space works the way your life does — that is what drives every decision we make.</p>
      <a href="${baseUrl}/gallery" class="btn-primary">See Our Projects</a>
    </div>
  </div>
</section>

<!-- ── 5. WHY US (sticky left) ── -->
<section class="why-wrap">
  <div class="why-sticky">
    <div>
      <div class="kicker" style="margin-bottom:1rem">Why Choose Us</div>
      <h2 class="section-title" style="font-size:clamp(1.75rem,3.5vw,2.5rem);margin-bottom:1.5rem">Built Different. Delivered Right.</h2>
      <p style="font-size:.875rem;color:rgba(255,255,255,.45);line-height:1.8;margin-bottom:2rem">Nine years of kitchen renovations in ${biz.city || 'the Front Range'}. NKBA-certified. Full in-house crew. One point of contact from permits to punch-list.</p>
      <a href="${baseUrl}/about" class="btn-ghost">Our Story</a>
    </div>
  </div>
  <div class="why-cards">
    ${whyCards.map((w, i) => `
    <div class="why-card" data-reveal style="transition-delay:${i * .07}s">
      <div class="why-num">${w.num}</div>
      <div>
        <h3>${w.title}</h3>
        <p>${w.desc}</p>
      </div>
    </div>`).join('')}
  </div>
</section>

<!-- ── 6. GALLERY ── -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:#fff">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="kicker" style="color:var(--color-primary);margin-bottom:.75rem">Our Work</div>
      <h2 class="section-title--dark" style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,5vw,3.25rem);font-weight:800">Recent Projects</h2>
    </div>
    <div class="gallery-grid">
      ${galleryImgs.map((src, i) => `
      <div class="gallery-thumb" data-reveal style="transition-delay:${(i % 3) * .06}s">
        <img src="${src}" alt="Kitchen renovation project ${i + 1}" loading="lazy">
      </div>`).join('')}
    </div>
    <div data-reveal style="text-align:center;margin-top:2.5rem">
      <a href="${baseUrl}/gallery" class="btn-primary">View Full Gallery</a>
    </div>
  </div>
</section>

<!-- ── 7. TESTIMONIALS (marquee) ── -->
<section style="padding:var(--section-pad) 0;background:var(--color-dark);overflow:hidden">
  <div data-reveal style="text-align:center;padding:0 clamp(1.25rem,4vw,3.5rem);margin-bottom:3rem">
    <div class="kicker" style="margin-bottom:.75rem">Client Reviews</div>
    <h2 class="section-title" style="font-size:clamp(2rem,5vw,3.25rem)">What Homeowners Say</h2>
  </div>
  <div class="testimonials-wrap">
    <div class="testimonials-track">
      ${marqueePairs.map((r, i) => `
      <div class="testi-card">
        <div class="testi-stars">★★★★★</div>
        <p>"${reviews[i % 8] || r.text}"</p>
        <div class="testi-name">${r.name} &mdash; ${biz.city || 'Denver'}</div>
      </div>`).join('')}
    </div>
  </div>
  <div data-reveal style="text-align:center;padding:2.5rem clamp(1.25rem,4vw,3.5rem) 0">
    <a href="${baseUrl}/testimonials" class="btn-ghost">Read All Reviews</a>
  </div>
</section>

<!-- ── 8. FAQ ── -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark-2)">
  <div style="max-width:760px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="kicker" style="margin-bottom:.75rem">Common Questions</div>
      <h2 class="section-title" style="font-size:clamp(2rem,5vw,3rem)">Before You Call</h2>
    </div>
    <div>
      ${faqs.map((faq, i) => `
      <details class="faq-item" data-reveal style="transition-delay:${i * .06}s">
        <summary>${faq[0]}<svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></summary>
        <div class="faq-body">${faq[1]}</div>
      </details>`).join('')}
    </div>
  </div>
</section>

<!-- ── 9. CONTACT CTA ── -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start" class="two-col">
    <div data-reveal="left">
      <div class="kicker" style="margin-bottom:1rem">Get Started</div>
      <h2 class="section-title" style="font-size:clamp(1.75rem,4vw,2.75rem);margin-bottom:1.25rem">Ready to Transform Your Kitchen?</h2>
      <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:1.5rem">Call for a free in-home consultation. We serve ${biz.city || 'Denver'} and the surrounding area — honest, itemized estimates, no pressure.</p>
      <a href="${telHref(biz)}" style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;color:var(--color-primary);text-decoration:none;display:block;margin-bottom:2rem;transition:color var(--transition-base)" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--color-primary)'">${ph(biz)}</a>
      <a href="${baseUrl}/contact" class="btn-primary" style="padding:.85rem 2.25rem">Request Consultation Online</a>
    </div>
    <div data-reveal="right">
      <form onsubmit="event.preventDefault();this.innerHTML='<div style=\\'padding:2rem 0;font-family:Cormorant Garamond,serif;font-size:1.35rem;font-weight:600;color:var(--color-primary);line-height:1.5\\'>Thank you. We will be in touch within one business day.</div>';" style="display:flex;flex-direction:column;gap:1rem">
        <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div><label class="form-label">Name</label><input type="text" required class="form-input" placeholder="Jane Smith"></div>
          <div><label class="form-label">Phone</label><input type="tel" required class="form-input" placeholder="${ph(biz)}"></div>
        </div>
        <div><label class="form-label">Service</label>
          <select class="form-input">
            <option value="">Select a service</option>
            <option>Full Kitchen Renovation</option>
            <option>Cabinet Installation or Refacing</option>
            <option>Countertop Replacement</option>
            <option>Kitchen Island Design</option>
            <option>Appliance Integration</option>
            <option>Tile &amp; Backsplash</option>
            <option>Not sure yet</option>
          </select>
        </div>
        <div><label class="form-label">Message</label><textarea rows="4" class="form-input" placeholder="Tell us about your kitchen..." style="resize:vertical;line-height:1.65"></textarea></div>
        <button type="submit" class="btn-primary" style="padding:.85rem;font-size:.875rem;justify-content:center;border:none;cursor:pointer;width:100%">Send Request</button>
      </form>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${BA_SLIDER_JS}
${REVEAL_JS}
${NAV_SCROLL_JS}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildAbout(biz: BizPageData, baseUrl: string): string {

  const philosophy = [
    { title: 'Function Before Aesthetics',  desc: 'The most beautiful kitchen fails if the workflow is poor. We design around how you cook, move, and live before we pick a single finish.' },
    { title: 'Material Integrity',           desc: 'We only specify materials we would put in our own homes. No bait-and-switch substitutions, no cutting corners on substrate or installation method.' },
    { title: 'One Team, One Warranty',       desc: 'Our in-house crew handles everything. No subcontractor handoffs, no finger-pointing. When something needs attention after close, one call gets it handled.' },
  ];

  const certs = [
    'NKBA Certified Member',
    'NARI Certified Remodeler',
    'EPA Lead-Safe Certified',
    'BBB Accredited — A+ Rating',
    'Licensed General Contractor',
  ];

  return `${baseHead(`About — ${biz.name}`)}
${nav(biz, baseUrl, 'About')}

<!-- ABOUT HERO -->
<section style="padding:clamp(7rem,14vw,10rem) clamp(1.25rem,4vw,3.5rem) var(--section-pad);background:var(--color-dark-2);text-align:center">
  <div style="max-width:800px;margin:0 auto">
    <div class="kicker" data-reveal style="margin-bottom:1.25rem">Our Studio</div>
    <h1 class="section-title" data-reveal style="font-size:clamp(2.5rem,7vw,5rem);margin-bottom:1.75rem">Crafted With Purpose</h1>
    <div style="width:48px;height:2px;background:var(--color-primary);margin:0 auto 2rem"></div>
    <p data-reveal style="font-size:1rem;color:rgba(255,255,255,.5);line-height:1.85;max-width:640px;margin:0 auto">${biz.aboutText2 || `${biz.name} has spent ${biz.yearsInBiz || '9'} years transforming kitchens in ${biz.city || 'Denver'} and the surrounding area. We believe a kitchen renovation is one of the most personal investments a homeowner makes — and we treat every project with exactly that weight.`}</p>
  </div>
</section>

<!-- STORY -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center" class="two-col">
    <div data-reveal="left" style="position:relative">
      <img src="${biz.photos?.[0] || 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80'}" alt="Our work" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--card-radius)">
      <div style="position:absolute;bottom:-1.25rem;right:-1.25rem;background:var(--color-primary);border-radius:var(--card-radius);padding:1.25rem 1.5rem;text-align:center">
        <div style="font-family:'Cormorant Garamond',serif;font-size:2.75rem;font-weight:800;color:#fff;line-height:1">${biz.yearsInBiz || '9'}</div>
        <div style="font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-top:.25rem">Years</div>
      </div>
    </div>
    <div data-reveal="right">
      <div class="kicker" style="margin-bottom:1rem">Who We Are</div>
      <h2 class="section-title" style="font-size:clamp(1.75rem,4vw,2.75rem);margin-bottom:1.5rem">Built on Craft, Trust, and Honest Work</h2>
      <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.85;margin-bottom:1rem">We started in ${biz.city || 'Denver'} with a single principle: do the work the way it should be done, and let the finished kitchen speak. No inflated estimates, no buried change orders, no subs who have never seen your home.</p>
      <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.85;margin-bottom:1rem">Our team includes NKBA-certified designers, project managers, master carpenters, and tile installers who have all been with us for three years or more. The same crew that draws your plans builds your kitchen.</p>
      <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.85;margin-bottom:2rem">We handle everything in-house: design, demolition, framing, rough-ins, cabinetry, countertops, tile, and final trim. One point of contact from permit application to final walkthrough.</p>
      <a href="${baseUrl}/contact" class="btn-primary">Start a Conversation</a>
    </div>
  </div>
</section>

<!-- PHILOSOPHY -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark-2)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="kicker" style="margin-bottom:.75rem">Our Design Philosophy</div>
      <h2 class="section-title" style="font-size:clamp(2rem,5vw,3rem)">Three Principles Behind Every Project</h2>
    </div>
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      ${philosophy.map((p, i) => `
      <div data-reveal style="transition-delay:${i * .08}s;background:rgba(255,255,255,.04);border:1px solid rgba(217,119,6,.15);border-top:3px solid var(--color-primary);border-radius:var(--card-radius);padding:2rem 1.75rem">
        <div style="font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:800;color:rgba(217,119,6,.2);line-height:1;margin-bottom:1rem">0${i + 1}</div>
        <h3 style="font-size:.95rem;font-weight:600;color:#fff;margin-bottom:.6rem">${p.title}</h3>
        <p style="font-size:.875rem;color:rgba(255,255,255,.45);line-height:1.75">${p.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CERTIFICATIONS -->
<section style="padding:3rem clamp(1.25rem,4vw,3.5rem);background:#0d0804;border-top:1px solid rgba(217,119,6,.1)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="display:flex;align-items:center;justify-content:center;gap:2.5rem;flex-wrap:wrap">
      ${certs.map(c => `
      <div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;font-weight:500;color:rgba(255,255,255,.4)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--color-primary)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${c}
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- TEAM PREVIEW -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <div data-reveal>
      <div class="kicker" style="margin-bottom:1rem">The People</div>
      <h2 class="section-title" style="font-size:clamp(2rem,5vw,3rem);margin-bottom:1rem">The Team Behind the Work</h2>
      <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:2rem">Designers, project managers, carpenters, and tile specialists. Every person takes personal ownership of the projects they touch.</p>
      <a href="${baseUrl}/team" class="btn-primary">Meet the Team</a>
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark-2);text-align:center">
  <div data-reveal style="max-width:600px;margin:0 auto">
    <h2 class="section-title" style="font-size:clamp(1.75rem,4.5vw,2.75rem);margin-bottom:1rem">Let's Build Something Remarkable</h2>
    <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:1.75rem">Free in-home consultation. Written, itemized estimates. No pressure.</p>
    <a href="${telHref(biz)}" style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.65rem,4vw,2.5rem);font-weight:700;color:var(--color-primary);text-decoration:none;display:block;margin-bottom:1.5rem">${ph(biz)}</a>
    <a href="${baseUrl}/contact" class="btn-primary" style="padding:.85rem 2.25rem">Get Started</a>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
${NAV_SCROLL_JS}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {

  const faqs = [
    ['How long does a kitchen remodel take?', 'A full gut renovation runs 6 to 10 weeks from demolition to final walkthrough. Cabinet-only or countertop-only scopes close in 2 to 3 weeks. You receive a written schedule before we start.'],
    ['What does a kitchen remodel cost?', 'Cabinet and countertop refreshes start around $15,000. Full gut renovations range from $40,000 to $120,000 or more depending on size and material selection. We provide detailed, itemized estimates.'],
    ['Can we live at home during the remodel?', 'Yes. We use containment barriers, clean up at day-end, and maintain utility access where possible. We plan phasing around your routine to minimize daily disruption.'],
    ['Do you pull permits?', 'Always. We handle the permit application and inspection scheduling. Working without permits creates problems at resale and voids warranties — we never cut that corner.'],
    ['What does your warranty cover?', 'A five-year written warranty on all labor and installation. Manufacturer warranties on cabinets, countertops, and fixtures are separate, and we help you register them at project close.'],
  ];

  return `${baseHead(`Contact — ${biz.name}`)}
${nav(biz, baseUrl, 'Contact')}

<!-- HERO -->
<section style="padding:clamp(7rem,14vw,10rem) clamp(1.25rem,4vw,3.5rem) var(--section-pad);background:var(--color-dark-2);text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <div class="kicker" data-reveal style="margin-bottom:1.25rem">Start Your Project</div>
    <h1 class="section-title" data-reveal style="font-size:clamp(2.5rem,7vw,5rem);margin-bottom:1.5rem">Book a Free Design Consultation</h1>
    <a href="${telHref(biz)}" data-reveal style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,7vw,4.5rem);font-weight:700;color:var(--color-primary);text-decoration:none;display:block;line-height:1.1;transition:color var(--transition-base)" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--color-primary)'">${ph(biz)}</a>
    <p data-reveal style="font-size:.9rem;color:rgba(255,255,255,.4);margin-top:1rem">Call or text — we respond same day</p>
  </div>
</section>

<!-- FORM + SIDEBAR -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem)">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:3fr 2fr;gap:4rem;align-items:start" class="two-col">
    <div data-reveal="left">
      <h2 class="section-title" style="font-size:clamp(1.5rem,3.5vw,2.25rem);margin-bottom:2rem">Tell Us About Your Project</h2>
      <form onsubmit="event.preventDefault();this.innerHTML='<div style=\\'padding:2.5rem 0;font-family:Cormorant Garamond,serif;font-size:1.35rem;font-weight:600;color:var(--color-primary);line-height:1.5\\'>Thank you. We will be in touch within one business day.</div>';" style="display:flex;flex-direction:column;gap:1rem">
        <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div><label class="form-label">Full Name</label><input type="text" required class="form-input" placeholder="Jane Smith"></div>
          <div><label class="form-label">Phone</label><input type="tel" required class="form-input" placeholder="${ph(biz)}"></div>
        </div>
        <div><label class="form-label">Email</label><input type="email" class="form-input" placeholder="jane@email.com"></div>
        <div><label class="form-label">Project Type</label>
          <select class="form-input">
            <option value="">Select a service</option>
            <option>Full Kitchen Renovation</option>
            <option>Cabinet Installation or Refacing</option>
            <option>Countertop Replacement</option>
            <option>Kitchen Island Design</option>
            <option>Appliance Integration</option>
            <option>Tile &amp; Backsplash</option>
            <option>Not sure yet</option>
          </select>
        </div>
        <div class="two-col" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div><label class="form-label">Timeline</label>
            <select class="form-input">
              <option value="">When to start?</option>
              <option>As soon as possible</option>
              <option>1 to 3 months</option>
              <option>3 to 6 months</option>
              <option>6+ months</option>
            </select>
          </div>
          <div><label class="form-label">Budget Range</label>
            <select class="form-input">
              <option value="">Select range</option>
              <option>Under $15,000</option>
              <option>$15,000 to $30,000</option>
              <option>$30,000 to $60,000</option>
              <option>$60,000 to $100,000</option>
              <option>$100,000+</option>
            </select>
          </div>
        </div>
        <div><label class="form-label">Message</label><textarea rows="5" class="form-input" placeholder="Tell us about your kitchen — what you love, what you want to change, any specific ideas you have in mind..." style="resize:vertical;line-height:1.65"></textarea></div>
        <button type="submit" class="btn-primary" style="padding:.9rem;border:none;cursor:pointer;font-size:.875rem;justify-content:center;width:100%">Send Request</button>
      </form>
    </div>
    <div data-reveal="right" style="display:flex;flex-direction:column;gap:1rem">
      <div class="info-block">
        <h3>Business Hours</h3>
        <div>Mon to Fri: 8:00 AM to 6:00 PM<br>Saturday: By appointment<br>Sunday: Closed</div>
      </div>
      <div class="info-block">
        <h3>Service Area</h3>
        <p>${biz.city || 'Denver'}, ${biz.state || 'CO'} and all communities within 45 miles. Select full gut renovations taken statewide.</p>
      </div>
      ${biz.address ? `
      <div class="info-block">
        <h3>Visit Our Showroom</h3>
        <p>${biz.address}</p>
        <p style="margin-top:.5rem;font-size:.8rem">Cabinet doors, countertop slabs, hardware samples, and 3 full kitchen vignettes on display.</p>
      </div>` : ''}
      <div class="info-block" style="border-top:2px solid var(--color-primary)">
        <h3>Certifications</h3>
        <div style="display:flex;flex-direction:column;gap:.5rem">
          ${['NKBA Member', 'NARI Certified Remodeler', 'BBB Accredited — A+', 'EPA Lead-Safe Certified', 'Licensed General Contractor'].map(c => `<div style="display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:rgba(255,255,255,.45)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${c}</div>`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- MAP -->
<section style="padding:0 clamp(1.25rem,4vw,3.5rem) var(--section-pad)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="border-radius:var(--card-radius);overflow:hidden;border:1px solid rgba(217,119,6,.15)">
      <iframe title="Service area" src="https://www.openstreetmap.org/export/embed.html?bbox=-105.1,39.65,-104.8,39.85&layer=mapnik" width="100%" height="360" style="border:0;display:block;filter:invert(1) hue-rotate(180deg) saturate(.7) brightness(.9)" loading="lazy"></iframe>
    </div>
  </div>
</section>

<!-- FAQ -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark-2)">
  <div style="max-width:760px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="kicker" style="margin-bottom:.75rem">Common Questions</div>
      <h2 class="section-title" style="font-size:clamp(2rem,5vw,3rem)">Before You Call</h2>
    </div>
    <div>
      ${faqs.map((faq, i) => `
      <details class="faq-item" data-reveal style="transition-delay:${i * .06}s">
        <summary>${faq[0]}<svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></summary>
        <div class="faq-body">${faq[1]}</div>
      </details>`).join('')}
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
${NAV_SCROLL_JS}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildTeam(biz: BizPageData, baseUrl: string): string {

  const members = [
    {
      initial: 'SD',
      name: 'Sophia Delacroix',
      role: 'Principal Designer',
      years: '9 years with studio',
      cert: 'NKBA Certified Kitchen Designer',
      bio: 'Sophia founded the studio after nearly a decade in residential architecture, where she developed an obsession with how spatial planning shapes daily life. She leads every initial consultation and creates the design documents that guide each project from demolition to reveal.',
    },
    {
      initial: 'CV',
      name: 'Carlos Vega',
      role: 'Project Manager',
      years: '7 years with studio',
      cert: 'NARI Certified Remodeler',
      bio: 'Carlos is the operational spine of every project. He writes the schedule, manages permit applications, coordinates material deliveries, and is the client\'s first call for anything mid-project. In seven years, he has never delivered a project more than three days off the original schedule.',
    },
    {
      initial: 'ML',
      name: 'Mei Lin',
      role: 'Cabinet Specialist',
      years: '5 years with studio',
      cert: 'AWI Certified Cabinet Installer',
      bio: 'Mei joined after running cabinet installation for a regional millwork shop. She reads drawings in three dimensions before a single cabinet leaves the warehouse, catching fit issues before they become field problems. Her tolerances are measured in fractions of a millimeter.',
    },
    {
      initial: 'OF',
      name: 'Omar Farouk',
      role: 'Lead Installer',
      years: '8 years with studio',
      cert: 'EPA Lead-Safe Certified, Licensed GC',
      bio: 'Omar oversees demolition, framing, tile, and final trim on every project. He has an instinct for reading a house — load paths, plumbing chases, quirky framing from four different decades — and he finds solutions that do not create new problems downstream.',
    },
  ];

  return `${baseHead(`Our Team — ${biz.name}`)}
${nav(biz, baseUrl, 'Team')}

<!-- TEAM HERO -->
<section style="padding:clamp(7rem,14vw,10rem) clamp(1.25rem,4vw,3.5rem) var(--section-pad);background:var(--color-dark-2);text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <div class="kicker" data-reveal style="margin-bottom:1.25rem">The Craftspeople</div>
    <h1 class="section-title" data-reveal style="font-size:clamp(2.5rem,7vw,5rem);margin-bottom:1.25rem">Meet the Team</h1>
    <p data-reveal style="font-size:.95rem;color:rgba(255,255,255,.5);line-height:1.8;max-width:560px;margin:0 auto">Every designer, project manager, and installer at ${biz.name} owns the projects they touch — personally and professionally.</p>
  </div>
</section>

<!-- TEAM MEMBERS -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem">
    ${members.map((m, i) => `
    <div class="team-card" data-reveal style="transition-delay:${i * .09}s">
      <div class="team-avatar">${m.initial}</div>
      <div class="team-name">${m.name}</div>
      <div class="team-role">${m.role}</div>
      <div class="team-cert">${m.years}</div>
      <div style="width:28px;height:1px;background:rgba(217,119,6,.3);margin:.75rem auto"></div>
      <div style="font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.85rem">${m.cert}</div>
      <p class="team-bio">${m.bio}</p>
    </div>`).join('')}
  </div>
</section>

<!-- DESIGN APPROACH -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark-2)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="kicker" style="margin-bottom:.75rem">How We Work</div>
      <h2 class="section-title" style="font-size:clamp(2rem,5vw,3rem)">Our Design Approach</h2>
    </div>
    <div class="three-col" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      ${[
        ['Listen Before Designing',  'Every project begins with an hour at your kitchen table — talking about how you cook, who uses the space, what frustrates you. That conversation shapes everything.'],
        ['Render Before Building',   'We produce photorealistic 3D renderings before any work begins. You see your kitchen before we demolish the old one — and we revise until you are fully confident.'],
        ['Build Once, Build Right',  'We do not rush installs to hit an earlier end date. When something is out of plumb by a fraction, we reset it. The extra hour on-site saves five callbacks post-project.'],
      ].map(([title, desc], i) => `
      <div data-reveal style="transition-delay:${i * .08}s;background:rgba(255,255,255,.04);border:1px solid rgba(217,119,6,.15);border-radius:var(--card-radius);padding:2rem 1.75rem">
        <div style="font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:800;color:rgba(217,119,6,.2);line-height:1;margin-bottom:1rem">0${i + 1}</div>
        <h3 style="font-size:.95rem;font-weight:600;color:#fff;margin-bottom:.6rem">${title}</h3>
        <p style="font-size:.875rem;color:rgba(255,255,255,.45);line-height:1.75">${desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CAREERS CTA -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);text-align:center">
  <div data-reveal style="max-width:600px;margin:0 auto">
    <h2 class="section-title" style="font-size:clamp(1.75rem,4.5vw,2.75rem);margin-bottom:1rem">Want to Join the Studio?</h2>
    <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:2rem">We are always looking for skilled carpenters, tile installers, and designers who take personal pride in their work. Reach out directly.</p>
    <a href="${telHref(biz)}" style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.65rem,4vw,2.5rem);font-weight:700;color:var(--color-primary);text-decoration:none;display:block;margin-bottom:1.5rem">${ph(biz)}</a>
    <a href="${baseUrl}/contact" class="btn-primary" style="padding:.85rem 2.25rem">Send a Message</a>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
${NAV_SCROLL_JS}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildGallery(biz: BizPageData, baseUrl: string): string {

  const fallbackBefore = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80';
  const fallbackAfter  = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80';

  const projects = [
    { name: 'Riverside Contemporary',   city: biz.city || 'Denver',  scope: 'Full gut renovation',               cat: 'Full Renovation', style: 'Handleless slab cabinets, Calacatta quartz waterfall island, integrated appliances, herringbone white oak flooring.' },
    { name: 'Hillcrest Transitional',   city: biz.city || 'Denver',  scope: 'Cabinet installation + countertops', cat: 'Cabinets',         style: 'Inset shaker in sage green with unlacquered brass hardware, honed Carrara marble, butcher block island prep surface.' },
    { name: 'Garden District Classic',  city: biz.city || 'Denver',  scope: 'Full gut + wall removal',            cat: 'Full Renovation', style: 'Open-plan layout via load-bearing wall removal. Warm white shaker, leathered granite, custom hood surround.' },
    { name: 'Midtown Minimalist',       city: biz.city || 'Denver',  scope: 'Countertop + backsplash',            cat: 'Countertops',      style: 'Arabescato Corchia marble slab backsplash, Calacatta Nuvo quartz countertops, matte black fixtures.' },
    { name: 'Westwood Island Addition', city: biz.city || 'Denver',  scope: 'Island + tile work',                 cat: 'Islands',          style: '10-foot bespoke island in deep navy with Calacatta Gold top, prep sink, wine fridge, seating for four.' },
    { name: 'Northside Farmhouse',      city: biz.city || 'Denver',  scope: 'Full renovation',                    cat: 'Full Renovation', style: 'Reclaimed wood shelves, cream subway tile, seeded glass cabinet doors, fireclay farmhouse sink, concrete-look floor tile.' },
  ];

  const filters = ['All', 'Full Renovation', 'Cabinets', 'Countertops', 'Islands'];

  return `${baseHead(`Project Gallery — ${biz.name}`)}
${nav(biz, baseUrl, 'Gallery')}

<!-- GALLERY HERO -->
<section style="padding:clamp(7rem,14vw,10rem) clamp(1.25rem,4vw,3.5rem) var(--section-pad);background:var(--color-dark-2);text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <div class="kicker" data-reveal style="margin-bottom:1.25rem">Our Work</div>
    <h1 class="section-title" data-reveal style="font-size:clamp(2.5rem,7vw,5rem);margin-bottom:1.25rem">Project Gallery</h1>
    <p data-reveal style="font-size:.9rem;color:rgba(255,255,255,.5);max-width:500px;margin:0 auto;line-height:1.8">Drag the slider to compare before and after on every project in ${biz.city || 'Denver'}.</p>
  </div>
</section>

<!-- FILTER TABS -->
<div style="background:var(--color-dark);border-bottom:1px solid rgba(217,119,6,.1);padding:0 clamp(1.25rem,4vw,3.5rem)">
  <div style="max-width:1280px;margin:0 auto;display:flex;gap:0;flex-wrap:wrap">
    ${filters.map((f, i) => `<button onclick="filterGallery('${f}')" id="gf-${i}" style="font-size:.72rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:.9rem 1.5rem;border:none;cursor:pointer;transition:all var(--transition-base);background:${i === 0 ? 'var(--color-primary)' : 'transparent'};color:${i === 0 ? '#fff' : 'rgba(255,255,255,.4)'}">${f}</button>`).join('')}
  </div>
</div>

<!-- PROJECTS GRID -->
<section style="padding:3.5rem clamp(1.25rem,4vw,3.5rem) var(--section-pad)">
  <div style="max-width:1280px;margin:0 auto">
    <div id="gallery-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:2rem">
      ${projects.map((proj, i) => {
        const beforeUrl = biz.photos?.[i * 2] || fallbackBefore;
        const afterUrl  = biz.photos?.[i * 2 + 1] || fallbackAfter;
        return `
      <div class="gallery-item" data-cat="${proj.cat}" data-reveal style="transition-delay:${(i % 3) * .07}s">
        ${baSlider(beforeUrl, afterUrl)}
        <div style="padding:1.25rem 0">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;margin-bottom:.4rem">
            <div style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:700;color:#fff">${proj.name}</div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary);border:1px solid rgba(217,119,6,.3);border-radius:3px;padding:2px 8px;white-space:nowrap;margin-top:3px">${proj.cat}</span>
          </div>
          <div style="font-size:.8rem;color:rgba(255,255,255,.35);margin-bottom:.5rem">${proj.city} — ${proj.scope}</div>
          <p style="font-size:.82rem;color:rgba(255,255,255,.4);line-height:1.7">${proj.style}</p>
        </div>
      </div>`;
      }).join('')}
    </div>
  </div>
</section>

<!-- GALLERY CTA -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark-2);text-align:center">
  <div data-reveal style="max-width:600px;margin:0 auto">
    <h2 class="section-title" style="font-size:clamp(1.75rem,4.5vw,2.75rem);margin-bottom:1rem">Inspired by What You See?</h2>
    <p style="font-size:.9rem;color:rgba(255,255,255,.5);margin-bottom:2rem;line-height:1.8">Call for a free in-home consultation and we will show you how we would approach your space.</p>
    <a href="${telHref(biz)}" style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.65rem,4vw,2.5rem);font-weight:700;color:var(--color-primary);text-decoration:none;display:block;margin-bottom:1.5rem">${ph(biz)}</a>
    <a href="${baseUrl}/contact" class="btn-primary" style="padding:.85rem 2.25rem">Book a Consultation</a>
  </div>
</section>

<script>
function filterGallery(cat){
  document.querySelectorAll('.gallery-item').forEach(function(el){
    el.style.display=(cat==='All'||el.dataset.cat===cat)?'block':'none';
  });
  document.querySelectorAll('[id^="gf-"]').forEach(function(b){
    var active=b.textContent.trim()===cat;
    b.style.background=active?'var(--color-primary)':'transparent';
    b.style.color=active?'#fff':'rgba(255,255,255,.4)';
  });
}
</script>

${footer(biz, baseUrl)}
${BA_SLIDER_JS}
${REVEAL_JS}
${NAV_SCROLL_JS}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIALS PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildTestimonials(biz: BizPageData, baseUrl: string): string {

  const defaults = [
    { text: 'From first consultation to final walkthrough, the process was completely transparent. The kitchen is extraordinary — not a single callback in eight months.', name: 'Margaret T.',  neighborhood: `${biz.city || 'North'} Side`, type: 'Full Kitchen Renovation', date: 'February 2025' },
    { text: 'Carlos texted me a daily update every afternoon without me asking. The cabinets were within half a millimeter of plan. I have never had that from a contractor before.', name: 'David R.',     neighborhood: `${biz.city || 'Hillcrest'} District`, type: 'Cabinet Installation & Countertops', date: 'January 2025' },
    { text: 'Three contractors said removing the wall was impossible. These guys walked in and said they could do it. Six weeks later we have the open kitchen that completely changed the home.', name: 'Priya K.',    neighborhood: `${biz.city || 'Westwood'} Commons`, type: 'Full Gut Renovation', date: 'December 2024' },
    { text: 'The tile work alone is worth every dollar. Omar did a Moroccan zellige backsplash that other installers refused to touch. Not a single cracked tile, perfect grout lines.', name: 'James L.',    neighborhood: `${biz.city || 'Riverside'} Heights`, type: 'Backsplash & Tile Work', date: 'November 2024' },
    { text: 'Same footprint, completely different kitchen. 1990s oak cabinets and stained laminate to a magazine shoot in four weeks. The transformation is real.', name: 'Sandra M.',   neighborhood: `${biz.city || 'Garden'} District`, type: 'Cabinet Refacing & Countertops', date: 'October 2024' },
    { text: 'Mei caught a clearance issue that would have made the dishwasher unusable before it was ever built. That attention saved us two weeks of rework.', name: 'Thomas W.',   neighborhood: `${biz.city || 'Northside'} Estates`, type: 'Kitchen Island Design', date: 'September 2024' },
    { text: 'On day one there were four people on-site. They did not leave the house unattended without containment barriers protecting every adjacent room. The respect was immediate.', name: 'Clara B.',    neighborhood: `${biz.city || 'Midtown'}`, type: 'Full Kitchen Renovation', date: 'August 2024' },
    { text: 'Sophia showed me the 3D render and it was clear the navy I wanted was wrong for the proportions. We went with warm greige and it is perfect. I never would have seen that.', name: 'Roberto F.',  neighborhood: `${biz.city || 'East'} Village`, type: 'Custom Cabinet Design', date: 'July 2024' },
    { text: 'Thirteen thousand to replace the countertops. I was skeptical. Standing in my kitchen now I would pay double. Two weeks, and the whole kitchen feels a decade younger.', name: 'Helen A.',    neighborhood: `${biz.city || 'West'} End`, type: 'Countertop Replacement', date: 'June 2024' },
  ];

  const raw = pad(biz.reviewTexts || [], 9, '');
  const reviews = raw.map((r, i) => ({
    text: r || defaults[i].text,
    name: defaults[i].name,
    neighborhood: defaults[i].neighborhood,
    type: defaults[i].type,
    date: defaults[i].date,
  }));

  const featured = reviews[0];
  const grid     = reviews.slice(1);

  return `${baseHead(`Client Reviews — ${biz.name}`)}
${nav(biz, baseUrl, 'Reviews')}

<!-- HERO -->
<section style="padding:clamp(7rem,14vw,10rem) clamp(1.25rem,4vw,3.5rem) var(--section-pad);background:var(--color-dark-2);text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <div data-reveal style="display:inline-flex;align-items:center;gap:.6rem;background:rgba(217,119,6,.08);border:1px solid rgba(217,119,6,.2);border-radius:4px;padding:.4rem 1rem;margin-bottom:1.5rem">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-primary)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <span style="font-size:.7rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--color-primary)">Houzz Award Winner</span>
    </div>
    <h1 class="section-title" data-reveal style="font-size:clamp(2.5rem,7vw,5rem);margin-bottom:1.25rem">What Our Clients Say</h1>
    <div data-reveal style="color:var(--color-primary);font-size:1.4rem;letter-spacing:.25em;margin-bottom:.75rem">★★★★★</div>
    <p data-reveal style="font-size:.875rem;color:rgba(255,255,255,.35)">${biz.rating || '5.0'} stars &middot; ${biz.reviews || '200'}+ verified reviews</p>
  </div>
</section>

<!-- FEATURED TESTIMONIAL -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark)">
  <div style="max-width:820px;margin:0 auto;text-align:center">
    <div data-reveal>
      <div style="font-family:'Cormorant Garamond',serif;font-size:5rem;font-weight:800;color:rgba(217,119,6,.25);line-height:.6;margin-bottom:1.5rem">"</div>
      <p style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.2rem,3vw,1.75rem);font-weight:600;font-style:italic;color:#fff;line-height:1.55;margin-bottom:2rem">${featured.text}</p>
      <div style="color:var(--color-primary);font-size:1.1rem;letter-spacing:.2em;margin-bottom:.85rem">★★★★★</div>
      <div style="font-size:.875rem;font-weight:600;color:rgba(255,255,255,.65);margin-bottom:.35rem">${featured.name} — ${featured.neighborhood}</div>
      <div style="font-size:.8rem;color:rgba(255,255,255,.3)">${featured.type} &middot; ${featured.date}</div>
    </div>
  </div>
</section>

<!-- REVIEWS GRID -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark-2)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem">
    ${grid.map((r, i) => `
    <div data-reveal style="transition-delay:${(i % 3) * .07}s;background:rgba(255,255,255,.04);border:1px solid rgba(217,119,6,.12);border-radius:var(--card-radius);padding:1.75rem 1.5rem;transition:border-color var(--transition-base)" onmouseover="this.style.borderColor='var(--color-primary)'" onmouseout="this.style.borderColor='rgba(217,119,6,.12)'">
      <div style="color:var(--color-primary);font-size:.95rem;letter-spacing:.15em;margin-bottom:.85rem">★★★★★</div>
      <p style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;font-weight:600;font-style:italic;color:#fff;line-height:1.6;margin-bottom:1.25rem">"${r.text}"</p>
      <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:1rem">
        <div style="font-size:.8rem;font-weight:600;color:rgba(255,255,255,.55);margin-bottom:.25rem">${r.name} — ${r.neighborhood}</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,.3)">${r.type} &middot; ${r.date}</div>
      </div>
    </div>`).join('')}
  </div>
</section>

<!-- CTA -->
<section style="padding:var(--section-pad) clamp(1.25rem,4vw,3.5rem);background:var(--color-dark);text-align:center">
  <div data-reveal style="max-width:600px;margin:0 auto">
    <h2 class="section-title" style="font-size:clamp(1.75rem,4.5vw,2.75rem);margin-bottom:1rem">Ready for Your Own Transformation?</h2>
    <p style="font-size:.9rem;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:1.75rem">Call for a free in-home consultation. No pressure, no sales script.</p>
    <a href="${telHref(biz)}" style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.65rem,4vw,2.5rem);font-weight:700;color:var(--color-primary);text-decoration:none;display:block;margin-bottom:1.5rem">${ph(biz)}</a>
    <a href="${baseUrl}/contact" class="btn-primary" style="padding:.85rem 2.25rem">Book a Consultation</a>
  </div>
</section>

${footer(biz, baseUrl)}
${REVEAL_JS}
${NAV_SCROLL_JS}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function buildKitchenRemodelAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:         buildHome(biz, baseUrl),
    about:        buildAbout(biz, baseUrl),
    contact:      buildContact(biz, baseUrl),
    team:         buildTeam(biz, baseUrl),
    gallery:      buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
