/**
 * Kitchen Remodel V2 demo website builder — "Velina" Luxury Marble
 * Design: Cormorant Garamond (display) + DM Sans (body)
 * Palette: #faf8f5 warm off-white bg, #b08750 gold, #1c1410 espresso text
 * 6 pages: home, about, contact, team, gallery, testimonials
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ph(idx: number, biz: BizPageData): string {
  const FALLBACKS = [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=80',
    'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&sat=-20',
    'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80&fit=crop',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=80&fit=crop',
  ];
  return biz.photos[idx] || FALLBACKS[idx % FALLBACKS.length];
}

function telLink(phone: string | null): string {
  return (phone ?? '').replace(/[^0-9+]/g, '');
}

function phoneDisplay(biz: BizPageData): string {
  return biz.phone || '(720) 555-0190';
}

function cityState(biz: BizPageData): string {
  if (biz.city && biz.state) return `${biz.city}, ${biz.state}`;
  if (biz.city) return biz.city;
  return 'Denver, CO';
}

function reviewPad(biz: BizPageData, count: number): Array<{ text: string; name: string; svc: string; city: string }> {
  const defaults = [
    { text: 'The quartz countertops they sourced are unlike anything I saw in showrooms. Three years later and the kitchen still looks like the day it was finished.', name: 'Patricia H.', svc: 'Full Kitchen Renovation', city: 'Denver, CO' },
    { text: 'Custom cabinets built to the exact ceiling height. No filler strips, no awkward gaps. That level of precision is what separates good from exceptional.', name: 'Robert M.', svc: 'Cabinet Installation', city: 'Boulder, CO' },
    { text: 'They redesigned the entire layout to add a proper island without touching load-bearing walls. The plan they drew up was better than anything we had imagined.', name: 'Jennifer L.', svc: 'Kitchen Redesign', city: 'Aurora, CO' },
    { text: 'The marble backsplash installation took twice as long as the tile would have. They never rushed it. The result is perfect.', name: 'David K.', svc: 'Backsplash & Tile', city: 'Lakewood, CO' },
    { text: 'Every subcontractor they brought in was as professional as the lead team. No surprises, no rework, no mess left overnight.', name: 'Caroline T.', svc: 'Full Kitchen Renovation', city: 'Arvada, CO' },
    { text: 'The 3D render they produced before demolition started saved us from a cabinet color choice we would have regretted. That service alone was worth the premium.', name: 'Michael B.', svc: 'Design Consultation', city: 'Centennial, CO' },
    { text: 'We had been quoted by four contractors. This was the only estimate that explained every line item. That transparency made the decision easy.', name: 'Susan R.', svc: 'Kitchen Renovation', city: 'Westminster, CO' },
    { text: 'Six weeks from demolition to final walkthrough. Exactly what they told us. I did not believe it until it happened.', name: 'Thomas W.', svc: 'Full Gut Renovation', city: 'Thornton, CO' },
    { text: 'The leathered granite island countertop is the centerpiece of our entire home now. Guests comment on it before anything else.', name: 'Angela S.', svc: 'Countertop Replacement', city: 'Parker, CO' },
    { text: 'They flagged a ventilation issue in the original plan before work started. That kind of expertise is exactly what you are paying for.', name: 'James O.', svc: 'Full Kitchen Renovation', city: 'Highlands Ranch, CO' },
  ];
  const source = biz.reviewTexts?.length
    ? biz.reviewTexts.map((t, i) => ({ text: t, name: defaults[i % defaults.length].name, svc: defaults[i % defaults.length].svc, city: defaults[i % defaults.length].city }))
    : defaults;
  while (source.length < count) source.push(...defaults);
  return source.slice(0, count);
}

// ── Design constants ──────────────────────────────────────────────────────────

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">`;

const BASE_CSS = `<style>
:root{
  --gold:#b08750;
  --gold-hover:#956e3e;
  --espresso:#1c1410;
  --bg:#faf8f5;
  --bg-alt:#f2ede6;
  --card:#ffffff;
  --border:#e8e2d8;
  --muted:#7a6f63;
  --sp:clamp(4rem,8vw,7rem);
  --radius:10px;
  --ease:.35s cubic-bezier(.4,0,.2,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--espresso);font-family:'DM Sans',sans-serif;font-weight:400;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}

/* reveal */
[data-reveal]{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease}
[data-reveal].revealed{opacity:1;transform:none}
[data-delay="1"]{transition-delay:.1s}[data-delay="2"]{transition-delay:.2s}
[data-delay="3"]{transition-delay:.3s}[data-delay="4"]{transition-delay:.4s}

/* nav */
#vNav{position:fixed;top:0;left:0;right:0;z-index:900;height:74px;display:flex;align-items:center;padding:0 clamp(1.25rem,4vw,3rem);transition:background var(--ease),box-shadow var(--ease);background:transparent}
#vNav.solid{background:var(--bg);box-shadow:0 1px 0 var(--border)}
.vNavBrand{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;color:var(--espresso);flex:1}
.vNavCenter{display:flex;align-items:center;gap:2.5rem;flex:2;justify-content:center}
.vNavRight{display:flex;align-items:center;gap:1.5rem;flex:1;justify-content:flex-end}
.vNavLink{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);transition:color var(--ease)}
.vNavLink:hover,.vNavLink.active{color:var(--espresso)}
.vBtnGold{display:inline-flex;align-items:center;background:var(--gold);color:#fff;font-size:.7rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;padding:.6rem 1.4rem;border-radius:3px;transition:background var(--ease)}
.vBtnGold:hover{background:var(--gold-hover)}
.vBtnGhost{display:inline-flex;align-items:center;border:1.5px solid var(--espresso);color:var(--espresso);font-size:.7rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;padding:.6rem 1.4rem;border-radius:3px;transition:all var(--ease)}
.vBtnGhost:hover{background:var(--espresso);color:#fff}

/* hamburger */
#vToggle{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:6px}
#vToggle span{display:block;width:22px;height:2px;background:var(--espresso);transition:var(--ease)}
#vMobile{display:none;flex-direction:column;background:var(--bg);border-top:1px solid var(--border);padding:1.5rem clamp(1.25rem,4vw,3rem) 2rem}
#vMobile .vNavLink{font-size:.85rem;padding:.75rem 0;border-bottom:1px solid var(--border)}
#vMobile .vBtnGold{margin-top:1.25rem;justify-content:center}

/* kicker */
.vKicker{font-size:.65rem;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}

/* section headings */
.vH{font-family:'Cormorant Garamond',serif;font-weight:700;line-height:1.05;color:var(--espresso)}
.vH--light{color:#fff}
.vH--gold{color:var(--gold)}

/* buttons */
.vBtn{display:inline-flex;align-items:center;background:var(--gold);color:#fff;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:.8rem 2rem;border-radius:3px;border:none;cursor:pointer;transition:background var(--ease)}
.vBtn:hover{background:var(--gold-hover)}
.vBtnOut{display:inline-flex;align-items:center;border:1.5px solid var(--espresso);color:var(--espresso);font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:.8rem 2rem;border-radius:3px;cursor:pointer;transition:all var(--ease)}
.vBtnOut:hover{background:var(--espresso);color:#fff}

/* form */
.vInput{width:100%;background:#fff;border:1.5px solid var(--border);border-radius:5px;color:var(--espresso);font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:300;padding:.8rem 1rem;outline:none;transition:border-color var(--ease)}
.vInput:focus{border-color:var(--gold)}
.vLabel{display:block;font-size:.65rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:.45rem}

/* ba slider */
.vBa{position:relative;overflow:hidden;border-radius:var(--radius);aspect-ratio:4/3;cursor:ew-resize;user-select:none;max-width:620px;margin:0 auto}
.vBa-after{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vBa-before{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.vBa-before img{width:100%;height:100%;object-fit:cover}
.vBa-handle{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--gold);touch-action:none}
.vBa-handle-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(176,135,80,.2),0 4px 20px rgba(0,0,0,.2)}
.vBa-lbl{position:absolute;top:12px;font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:2px}
.vBa-lbl-b{left:12px;background:rgba(28,20,16,.8);color:rgba(255,255,255,.8)}
.vBa-lbl-a{right:12px;background:var(--gold);color:#fff}

/* gallery thumb */
.vThumb{overflow:hidden;border-radius:var(--radius)}
.vThumb img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.vThumb:hover img{transform:scale(1.06)}

/* testi card */
.vTCard{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem 1.75rem}
.vTStars{color:var(--gold);font-size:1rem;letter-spacing:.1em;margin-bottom:.75rem}
.vTText{font-size:.9rem;font-weight:300;color:var(--muted);line-height:1.75;margin-bottom:1.1rem}
.vTName{font-size:.8rem;font-weight:500;color:var(--espresso)}
.vTSvc{font-size:.75rem;color:var(--muted);margin-top:.2rem}

/* service row */
.vSvcRow{border-bottom:1px solid var(--border);padding:1.75rem 0;display:flex;align-items:flex-start;gap:2rem}
.vSvcNum{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:400;color:var(--gold);line-height:1;min-width:2.5rem}
.vSvcImg{width:120px;height:90px;object-fit:cover;border-radius:6px;flex-shrink:0}
.vSvcBody h3{font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:700;color:var(--espresso);margin-bottom:.35rem}
.vSvcBody p{font-size:.875rem;font-weight:300;color:var(--muted);line-height:1.7}
.vSvcPrice{font-size:.8rem;font-weight:500;color:var(--gold);margin-top:.5rem}

/* stats */
.vStat{text-align:center;padding:2rem 1rem}
.vStatNum{font-family:'Cormorant Garamond',serif;font-size:clamp(2.5rem,5vw,3.5rem);font-weight:700;color:var(--espresso);line-height:1}
.vStatLbl{font-size:.75rem;font-weight:400;color:var(--muted);margin-top:.5rem;letter-spacing:.04em}

/* process */
.vProc{display:flex;align-items:flex-start;gap:1.5rem;position:relative}
.vProcDot{width:14px;height:14px;border-radius:50%;background:var(--gold);flex-shrink:0;margin-top:.35rem;position:relative;z-index:1}
.vProcLine{position:absolute;left:6px;top:20px;bottom:-28px;width:2px;background:var(--border)}

/* materials */
.vMat{border-radius:var(--radius);overflow:hidden;position:relative}
.vMat img{width:100%;aspect-ratio:3/2;object-fit:cover;transition:transform .5s ease}
.vMat:hover img{transform:scale(1.05)}
.vMatLbl{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(28,20,16,.85),transparent);padding:.75rem 1rem .85rem;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:500;color:#fff;letter-spacing:.04em}

/* team */
.vTeamCard{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:box-shadow var(--ease)}
.vTeamCard:hover{box-shadow:0 8px 32px rgba(176,135,80,.12)}
.vTeamCard img{width:100%;aspect-ratio:4/3;object-fit:cover}
.vTeamBody{padding:1.5rem 1.25rem}
.vTeamName{font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:var(--espresso)}
.vTeamRole{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:.3rem 0 .75rem}
.vTeamBio{font-size:.875rem;font-weight:300;color:var(--muted);line-height:1.7}

/* why us quote */
.vQuote{font-family:'Cormorant Garamond',serif;font-size:clamp(1.5rem,3vw,2rem);font-weight:400;font-style:italic;line-height:1.45;color:var(--espresso)}

/* marquee */
@keyframes vMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.vMarqWrap{overflow:hidden;-webkit-mask-image:linear-gradient(to right,transparent,black 6%,black 94%,transparent);mask-image:linear-gradient(to right,transparent,black 6%,black 94%,transparent)}
.vMarqTrack{display:flex;gap:1.5rem;width:max-content;animation:vMarquee 50s linear infinite}
.vMarqTrack:hover{animation-play-state:paused}

/* responsive */
@media(max-width:900px){
  .vNavCenter,.vNavRight .vNavLink{display:none}
  #vToggle{display:flex}
  .vTwoCol{grid-template-columns:1fr!important}
  .vThreeCol{grid-template-columns:1fr 1fr!important}
  .vSvcRow{flex-direction:column;gap:1rem}
  .vSvcImg{width:100%;height:160px}
}
@media(max-width:600px){
  .vThreeCol{grid-template-columns:1fr!important}
  .vSixCol{grid-template-columns:1fr 1fr!important}
  .vFourCol{grid-template-columns:1fr 1fr!important}
}
</style>`;

const REVEAL_JS = `<script>(function(){var o=new IntersectionObserver(function(e){e.forEach(function(i){if(i.isIntersecting){i.target.classList.add('revealed');o.unobserve(i.target);}});},{threshold:.1,rootMargin:'0px 0px -40px 0px'});document.querySelectorAll('[data-reveal]').forEach(function(el){o.observe(el);});})();</script>`;

const BA_JS = `<script>document.querySelectorAll('.vBa').forEach(function(c){var b=c.querySelector('.vBa-before'),h=c.querySelector('.vBa-handle'),d=false;function pos(x){var r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}h.addEventListener('mousedown',function(){d=true;});window.addEventListener('mouseup',function(){d=false;});window.addEventListener('mousemove',function(e){if(d)pos(e.clientX);});h.addEventListener('touchstart',function(e){d=true;e.preventDefault();},{passive:false});window.addEventListener('touchend',function(){d=false;});window.addEventListener('touchmove',function(e){if(d)pos(e.touches[0].clientX);},{passive:true});});</script>`;

const NAV_JS = `<script>window.addEventListener('scroll',function(){document.getElementById('vNav').classList.toggle('solid',window.scrollY>40);});document.getElementById('vToggle').addEventListener('click',function(){var m=document.getElementById('vMobile');m.style.display=m.style.display==='flex'?'none':'flex';});</script>`;

// ── Shell ─────────────────────────────────────────────────────────────────────

function shell(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
${FONTS}
${BASE_CSS}
</head>
<body>
${bodyContent}
${REVEAL_JS}
${BA_JS}
${NAV_JS}
</body>
</html>`;
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string, active: string): string {
  const links = [
    { label: 'Home',         href: baseUrl },
    { label: 'About',        href: `${baseUrl}/about` },
    { label: 'Gallery',      href: `${baseUrl}/gallery` },
    { label: 'Team',         href: `${baseUrl}/team` },
    { label: 'Reviews',      href: `${baseUrl}/testimonials` },
    { label: 'Contact',      href: `${baseUrl}/contact` },
  ];
  const left  = links.slice(0, 3);
  const right = links.slice(3, 5);
  return `
<nav id="vNav">
  <div class="vNavBrand">${esc(biz.name)}</div>
  <div class="vNavCenter">
    ${left.map(l => `<a href="${l.href}" class="vNavLink${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
  </div>
  <div class="vNavRight">
    ${right.map(l => `<a href="${l.href}" class="vNavLink${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
    <a href="tel:${telLink(biz.phone)}" class="vBtnGold">Free Consultation</a>
  </div>
  <button id="vToggle" aria-label="Menu"><span></span><span></span><span></span></button>
</nav>
<div id="vMobile">
  ${links.map(l => `<a href="${l.href}" class="vNavLink${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
  <a href="tel:${telLink(biz.phone)}" class="vBtnGold">Free Consultation</a>
</div>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `
<footer style="background:var(--espresso);color:rgba(255,255,255,.5);padding:4rem clamp(1.25rem,4vw,3rem) 2rem">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:3rem;margin-bottom:2.5rem">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:700;color:var(--gold);margin-bottom:.65rem">${esc(biz.name)}</div>
      <p style="font-size:.875rem;font-weight:300;line-height:1.75;margin-bottom:1rem">Premium kitchen remodeling in ${esc(cityState(biz))} and surrounding communities.</p>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">${['NKBA', 'NARI', 'BBB A+'].map(b => `<span style="font-size:.6rem;font-weight:500;letter-spacing:.1em;color:var(--gold);border:1px solid rgba(176,135,80,.3);border-radius:2px;padding:2px 7px">${b}</span>`).join('')}</div>
    </div>
    <div>
      <div style="font-size:.65rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:1rem">Pages</div>
      ${[['Home', baseUrl], ['About', `${baseUrl}/about`], ['Gallery', `${baseUrl}/gallery`], ['Team', `${baseUrl}/team`], ['Reviews', `${baseUrl}/testimonials`], ['Contact', `${baseUrl}/contact`]].map(([l, h]) => `<a href="${h}" style="display:block;font-size:.875rem;font-weight:300;color:rgba(255,255,255,.4);margin-bottom:.55rem;transition:color var(--ease)" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='rgba(255,255,255,.4)'">${l}</a>`).join('')}
    </div>
    <div>
      <div style="font-size:.65rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:1rem">Contact</div>
      <a href="tel:${telLink(biz.phone)}" style="display:block;font-family:'Cormorant Garamond',serif;font-size:1.55rem;font-weight:700;color:var(--gold);margin-bottom:.75rem">${esc(phoneDisplay(biz))}</a>
      ${biz.address ? `<p style="font-size:.875rem;font-weight:300;line-height:1.75;margin-bottom:.4rem">${esc(biz.address)}</p>` : ''}
      <p style="font-size:.875rem;font-weight:300;line-height:1.75">${esc(biz.hours || 'Mon-Fri 8am-6pm')}</p>
    </div>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
    <div style="font-size:.75rem;color:rgba(255,255,255,.2)">© ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.2)">Licensed &amp; Insured · NKBA Certified</div>
  </div>
</footer>`;
}

// ── BA Slider ─────────────────────────────────────────────────────────────────

function baSlider(before: string, after: string): string {
  return `<div class="vBa">
  <img class="vBa-after" src="${esc(after)}" alt="Kitchen after renovation">
  <div class="vBa-before"><img src="${esc(before)}" alt="Kitchen before renovation"></div>
  <div class="vBa-lbl vBa-lbl-b">Before</div>
  <div class="vBa-lbl vBa-lbl-a">After</div>
  <div class="vBa-handle"><div class="vBa-handle-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg></div></div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {

  const services = (biz.services?.length ? biz.services : [
    { name: 'Full Kitchen Renovation',       desc: 'Complete strip-to-stud rebuilds designed around how your household actually cooks and moves.', price: 'From $40,000' },
    { name: 'Custom Cabinetry & Refacing',   desc: 'Custom, semi-custom, and refaced cabinetry built to exact ceiling height. No filler strips.', price: 'From $12,000' },
    { name: 'Stone Countertop Installation', desc: 'Quartz, marble, quartzite, and granite templated on-site and installed to exact tolerances.', price: 'From $4,500' },
    { name: 'Kitchen Island Design & Build', desc: 'Freestanding and built-in island designs sized correctly for your floor plan and workflow.', price: 'From $8,000' },
  ]);

  const featuredProjects = [
    { num: '01', type: 'Open-Plan Renovation', dur: '7 weeks', img: ph(0, biz), desc: 'Removed partition wall, added quartzite waterfall island, custom shaker cabinets to ceiling.' },
    { num: '02', type: 'Galley Kitchen Transformation', dur: '4 weeks', img: ph(1, biz), desc: 'Complete gut with Italian tile, brass hardware, and semi-custom white oak cabinetry.' },
    { num: '03', type: 'Chef Kitchen Build-Out', dur: '9 weeks', img: ph(2, biz), desc: 'Commercial-grade appliance integration, marble slab backsplash, full electrical upgrade.' },
  ];

  const materials = [
    { name: 'Calacatta Quartz', img: ph(3, biz) },
    { name: 'Carrara Marble',   img: ph(4, biz) },
    { name: 'Solid White Oak',  img: ph(5, biz) },
    { name: 'Custom Cabinetry', img: ph(6, biz) },
    { name: 'Porcelain Tile',   img: ph(7, biz) },
    { name: 'Aged Brass Fixtures', img: ph(8, biz) },
  ];

  const processSteps = [
    { title: 'Design Consultation', desc: 'Walk us through your kitchen, your habits, and your wishlist. We take notes — no sales pitch.' },
    { title: 'Space Planning & 3D Rendering', desc: 'Full 3D model of your new kitchen before any demolition. Change your mind without consequence.' },
    { title: 'Material Selection & Ordering', desc: 'We visit stone yards and cabinet manufacturers together, or you approve our sourced selections.' },
    { title: 'Build & Installation', desc: 'One crew lead, daily progress updates, and a written schedule you can hold us to.' },
  ];

  const reviews8 = reviewPad(biz, 8);

  return shell(
    `${esc(biz.name)} — Kitchen Remodeling in ${esc(cityState(biz))}`,
    `
${nav(biz, baseUrl, 'Home')}

<!-- 1. HERO — split layout -->
<section style="padding-top:74px;background:var(--bg);min-height:100svh;display:grid;grid-template-columns:1fr 1fr;align-items:center" class="vTwoCol">
  <div style="padding:clamp(4rem,8vw,7rem) clamp(1.25rem,4vw,3rem) clamp(4rem,8vw,7rem) clamp(1.5rem,6vw,5rem)">
    <div class="vKicker" data-reveal style="margin-bottom:1.25rem">Kitchen Remodeling Specialists</div>
    <h1 data-reveal class="vH" style="font-size:clamp(2.5rem,6vw,4.5rem);margin-bottom:1.25rem;font-style:italic">
      ${esc(biz.heroHeadline || 'Kitchens designed')} <em style="font-style:normal;color:var(--gold)">${esc(biz.heroHeadlineEm || 'to last.')}</em>
    </h1>
    <p data-reveal style="font-size:clamp(.9rem,1.5vw,1.05rem);font-weight:300;color:var(--muted);max-width:440px;line-height:1.8;margin-bottom:2rem">${esc(biz.heroSub || `Premium kitchen renovations in ${cityState(biz)} built on craftsmanship, transparency, and work that holds.`)}</p>
    <div data-reveal style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <a href="${baseUrl}/contact" class="vBtn">Schedule a Consultation</a>
      <a href="${baseUrl}/gallery" class="vBtnOut">View Our Work</a>
    </div>
    <div data-reveal style="margin-top:2.5rem;padding-top:2rem;border-top:1px solid var(--border);display:flex;gap:2.5rem;flex-wrap:wrap">
      ${['200+ Kitchens Transformed', 'NKBA Certified', '5-Year Warranty'].map(t => `<div style="font-size:.75rem;font-weight:400;color:var(--muted);display:flex;align-items:center;gap:.5rem"><span style="width:5px;height:5px;border-radius:50%;background:var(--gold);flex-shrink:0"></span>${t}</div>`).join('')}
    </div>
  </div>
  <div data-reveal style="height:100%;min-height:520px;position:relative;overflow:hidden">
    <img src="${ph(0, biz)}" alt="Luxury kitchen renovation" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    <div style="position:absolute;inset:8px;border:1px solid rgba(176,135,80,.3);pointer-events:none;z-index:1"></div>
  </div>
</section>

<!-- 2. FEATURED PROJECTS -->
<section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="margin-bottom:3rem">
      <div class="vKicker" style="margin-bottom:.75rem">Our Work</div>
      <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">Featured Projects</h2>
    </div>
    <div style="display:flex;flex-direction:column;gap:0">
      ${featuredProjects.map((p, i) => `
      <div data-reveal style="display:grid;grid-template-columns:80px 1fr 280px;gap:2.5rem;align-items:center;padding:2.5rem 0;border-bottom:1px solid var(--border)${i === 0 ? ';border-top:1px solid var(--border)' : ''}" class="vTwoCol">
        <div style="font-family:'Cormorant Garamond',serif;font-size:3.5rem;font-weight:400;color:var(--border);line-height:1">${p.num}</div>
        <div>
          <div class="vKicker" style="margin-bottom:.5rem">${esc(p.type)}</div>
          <p style="font-size:.9rem;font-weight:300;color:var(--muted);line-height:1.75;max-width:480px">${esc(p.desc)}</p>
          <div style="margin-top:.75rem;font-size:.75rem;color:var(--gold);font-weight:500">Duration: ${esc(p.dur)}</div>
        </div>
        <div style="border-radius:8px;overflow:hidden;aspect-ratio:4/3"><img src="${p.img}" alt="${esc(p.type)}" style="width:100%;height:100%;object-fit:cover"></div>
      </div>`).join('')}
    </div>
    <div data-reveal style="margin-top:2.5rem;text-align:right">
      <a href="${baseUrl}/gallery" style="font-size:.8rem;font-weight:500;color:var(--gold);border-bottom:1px solid var(--gold);padding-bottom:2px">View full portfolio</a>
    </div>
  </div>
</section>

<!-- 3. STATS ROW -->
<section style="background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr)" class="vFourCol">
    ${[
      { num: '200+', lbl: 'Kitchens Transformed' },
      { num: `${esc(biz.yearsInBiz || '15')} Yrs`, lbl: 'Of Expertise' },
      { num: '98%', lbl: 'Client Satisfaction' },
      { num: 'Award-Winning', lbl: 'Craftsmanship' },
    ].map((s, i) => `<div class="vStat" data-reveal data-delay="${i + 1 as unknown as string}" style="border-right:${i < 3 ? '1px solid var(--border)' : 'none'}"><div class="vStatNum">${s.num}</div><div class="vStatLbl">${s.lbl}</div></div>`).join('')}
  </div>
</section>

<!-- 4. SERVICES — numbered -->
<section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="vKicker" style="margin-bottom:.75rem">What We Do</div>
      <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">Our Services</h2>
    </div>
    <div style="display:flex;flex-direction:column">
      ${services.slice(0, 4).map((s, i) => `
      <div class="vSvcRow" data-reveal>
        <div class="vSvcNum">0${i + 1}</div>
        <img class="vSvcImg" src="${ph(i, biz)}" alt="${esc(s.name)}" loading="lazy">
        <div class="vSvcBody" style="flex:1">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.desc)}</p>
          <div class="vSvcPrice">${esc(s.price)}</div>
        </div>
        <a href="${baseUrl}/contact" style="font-size:.7rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);border-bottom:1px solid rgba(176,135,80,.4);white-space:nowrap;align-self:center;flex-shrink:0">Get Quote</a>
      </div>`).join('')}
    </div>
    <div data-reveal style="text-align:center;margin-top:2.5rem">
      <a href="tel:${telLink(biz.phone)}" class="vBtn">Discuss Your Project</a>
    </div>
  </div>
</section>

<!-- 5. PROCESS — horizontal timeline -->
<section style="background:var(--espresso);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3.5rem">
      <div class="vKicker" style="color:rgba(176,135,80,.8);margin-bottom:.75rem">How It Works</div>
      <h2 class="vH vH--light" style="font-size:clamp(1.75rem,4vw,2.75rem)">Our Process</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;position:relative" class="vFourCol">
      <div style="position:absolute;top:7px;left:calc(12.5% + 14px);right:calc(12.5% + 14px);height:2px;background:linear-gradient(to right,var(--gold),rgba(176,135,80,.3));pointer-events:none"></div>
      ${processSteps.map((s, i) => `
      <div data-reveal data-delay="${i + 1 as unknown as string}" style="display:flex;flex-direction:column;gap:1.25rem">
        <div style="display:flex;align-items:center;gap:.75rem">
          <div class="vProcDot"></div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:.8rem;font-weight:400;color:var(--gold);letter-spacing:.1em">Step 0${i + 1}</div>
        </div>
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:700;color:#fff">${esc(s.title)}</h3>
        <p style="font-size:.85rem;font-weight:300;color:rgba(255,255,255,.5);line-height:1.75">${esc(s.desc)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- 6. MATERIALS SHOWCASE -->
<section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="vKicker" style="margin-bottom:.75rem">Materials</div>
      <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">Premium Materials We Work With</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem" class="vThreeCol">
      ${materials.map((m, i) => `<div class="vMat" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as unknown as string}"><img src="${m.img}" alt="${esc(m.name)}"><div class="vMatLbl">${esc(m.name)}</div></div>`).join('')}
    </div>
  </div>
</section>

<!-- 7. WHY US — 2-col -->
<section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start" class="vTwoCol">
    <div data-reveal>
      <div class="vKicker" style="margin-bottom:1rem">Why Choose Us</div>
      <div class="vQuote" style="margin-bottom:1.75rem">"We build kitchens for the way you live in them — not for the photo."</div>
      <p style="font-size:.9rem;font-weight:300;color:var(--muted);line-height:1.85;margin-bottom:1rem">Most kitchen contractors work from a catalog. We start with your floor plan, your routines, and your taste. The catalog is a reference, not a limitation.</p>
      <p style="font-size:.9rem;font-weight:300;color:var(--muted);line-height:1.85;margin-bottom:2rem">Every project has one lead — a single NKBA-certified designer who draws the plans, sources the materials, and manages the build from day one to final walkthrough.</p>
      <a href="${baseUrl}/about" style="font-size:.8rem;font-weight:500;color:var(--gold);border-bottom:1px solid rgba(176,135,80,.4);padding-bottom:2px">Our story</a>
    </div>
    <div data-reveal data-delay="2">
      ${[['NKBA Certified', 'National Kitchen & Bath Association — the only certification that specifically tests kitchen design knowledge.'],
         ['NARI Certified Remodeler', 'Verifies business ethics, technical competence, and financial stability.'],
         ['EPA Lead-Safe Certified', 'Required by law for homes built before 1978. We hold this as standard.'],
         ['5-Year Workmanship Warranty', 'Written warranty on all labor. One call, handled.']].map(([title, desc]) => `
      <div style="display:flex;gap:1.25rem;align-items:flex-start;padding:1.25rem 0;border-bottom:1px solid var(--border)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" style="flex-shrink:0;margin-top:3px"><polyline points="20 6 9 17 4 12"/></svg>
        <div>
          <div style="font-size:.9rem;font-weight:500;color:var(--espresso);margin-bottom:.35rem">${title}</div>
          <div style="font-size:.8rem;font-weight:300;color:var(--muted);line-height:1.65">${desc}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- 8. TESTIMONIALS — marquee -->
<section style="background:var(--bg-alt);padding:var(--sp) 0;overflow:hidden">
  <div style="max-width:1280px;margin:0 auto 2.5rem;padding:0 clamp(1.25rem,4vw,3rem);text-align:center" data-reveal>
    <div class="vKicker" style="margin-bottom:.75rem">Client Reviews</div>
    <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">What our clients say.</h2>
    ${biz.rating ? `<div style="margin-top:.75rem;color:var(--gold);font-size:.9rem;letter-spacing:.08em">${'★'.repeat(Math.round(biz.rating))} <span style="color:var(--muted);font-size:.8rem">${esc(String(biz.rating))} (${esc(String(biz.reviews || ''))} reviews)</span></div>` : ''}
  </div>
  <div class="vMarqWrap">
    <div class="vMarqTrack">
      ${[...reviews8, ...reviews8].map(r => `
      <div class="vTCard" style="flex:0 0 340px">
        <div class="vTStars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="vTText">"${esc(r.text)}"</p>
        <div class="vTName">${esc(r.name)}</div>
        <div class="vTSvc">${esc(r.svc)} &mdash; ${esc(r.city)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- 9. BEFORE/AFTER -->
<section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="vKicker" style="margin-bottom:.75rem">Transformations</div>
      <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">Before &amp; After</h2>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem" class="vTwoCol">
      ${baSlider('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', ph(0, biz))}
      ${baSlider('https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80', ph(1, biz))}
    </div>
    <p data-reveal style="text-align:center;margin-top:1.5rem;font-size:.8rem;font-weight:300;color:var(--muted)">Drag the handle to compare before and after</p>
  </div>
</section>

<!-- 10. CTA — espresso -->
<section style="background:var(--espresso);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
  <div style="max-width:680px;margin:0 auto" data-reveal>
    <div class="vKicker" style="color:rgba(176,135,80,.7);margin-bottom:1rem">Ready to Begin</div>
    <h2 class="vH vH--light" style="font-size:clamp(2rem,5vw,3.25rem);margin-bottom:1.25rem;font-style:italic">Your kitchen deserves better.</h2>
    <p style="font-size:.95rem;font-weight:300;color:rgba(255,255,255,.55);line-height:1.8;margin-bottom:2.5rem">The consultation is free, takes about an hour, and ends with a clear picture of what your project will cost. No pressure, no vague estimates.</p>
    <a href="${baseUrl}/contact" class="vBtn" style="font-size:.9rem;padding:1rem 2.5rem">Book a Free Design Consultation</a>
    <div style="margin-top:1.5rem"><a href="tel:${telLink(biz.phone)}" style="font-family:'Cormorant Garamond',serif;font-size:1.65rem;font-weight:700;color:var(--gold)">${esc(phoneDisplay(biz))}</a></div>
    <div style="margin-top:.5rem;font-size:.8rem;font-weight:300;color:rgba(255,255,255,.35)">${esc(biz.hours || 'Mon-Fri 8am-6pm')}</div>
  </div>
</section>

<!-- 11. CONTACT FORM -->
<section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:680px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:2.5rem">
      <div class="vKicker" style="margin-bottom:.75rem">Get in Touch</div>
      <h2 class="vH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Tell us about your project.</h2>
    </div>
    <form data-reveal style="display:flex;flex-direction:column;gap:1.25rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem" class="vTwoCol">
        <div><label class="vLabel">First Name</label><input class="vInput" type="text" placeholder="Margaret"></div>
        <div><label class="vLabel">Last Name</label><input class="vInput" type="text" placeholder="Thompson"></div>
      </div>
      <div><label class="vLabel">Phone Number</label><input class="vInput" type="tel" placeholder="(720) 555-0100"></div>
      <div><label class="vLabel">Email</label><input class="vInput" type="email" placeholder="you@example.com"></div>
      <div><label class="vLabel">Project Type</label>
        <select class="vInput"><option value="">Select a service...</option><option>Full Kitchen Renovation</option><option>Cabinet Installation</option><option>Countertop Replacement</option><option>Kitchen Island</option><option>Other</option></select>
      </div>
      <div><label class="vLabel">Tell us more (optional)</label><textarea class="vInput" rows="4" placeholder="Size of kitchen, current state, timeline, budget range..."></textarea></div>
      <button type="submit" class="vBtn" style="align-self:flex-start;font-size:.85rem;padding:.9rem 2.25rem">Send Message</button>
    </form>
  </div>
</section>

${footer(biz, baseUrl)}
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildAbout(biz: BizPageData, baseUrl: string): string {
  return shell(
    `About — ${esc(biz.name)}`,
    `
${nav(biz, baseUrl, 'About')}
<main style="padding-top:74px">

  <!-- HERO -->
  <section style="background:var(--bg-alt);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:820px;margin:0 auto;text-align:center" data-reveal>
      <div class="vKicker" style="margin-bottom:1rem">About Us</div>
      <h1 class="vH" style="font-size:clamp(2rem,5vw,3.5rem);font-style:italic;margin-bottom:1.25rem">${esc(biz.aboutText || 'Built on craft. Guided by design.')}</h1>
      <p style="font-size:1rem;font-weight:300;color:var(--muted);line-height:1.85;max-width:600px;margin:0 auto">${esc(biz.aboutText2 || 'We started this company because we believed homeowners deserved a contractor who treated their kitchen renovation the way a hotel designer treats a suite.')}</p>
    </div>
  </section>

  <!-- STORY -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center" class="vTwoCol">
      <div data-reveal>
        <div class="vKicker" style="margin-bottom:1rem">Our Story</div>
        <h2 class="vH" style="font-size:clamp(1.75rem,3vw,2.5rem);margin-bottom:1.5rem">Founded on the belief that kitchens deserve more than a contractor.</h2>
        <p style="font-size:.9rem;font-weight:300;color:var(--muted);line-height:1.85;margin-bottom:1rem">Most remodeling companies treat kitchens as a line item. We founded ${esc(biz.name)} around a different idea: the kitchen is where your household starts every day, and it should feel that way.</p>
        <p style="font-size:.9rem;font-weight:300;color:var(--muted);line-height:1.85;margin-bottom:2rem">Every material we specify, every cabinet joint we build, every tile we lay is chosen with long-term quality in mind. We do not cut corners because we will be back for warranty work — and we would rather not need to come back.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;border-top:1px solid var(--border);padding-top:2rem">
          ${[
            { num: `${esc(biz.yearsInBiz || '15')}+`, lbl: 'Years in Business' },
            { num: `${esc(String(biz.reviews || '200'))}+`, lbl: 'Projects Completed' },
            { num: `${esc(String(biz.rating || '5.0'))}`, lbl: 'Average Rating' },
          ].map(s => `<div><div style="font-family:'Cormorant Garamond',serif;font-size:2.25rem;font-weight:700;color:var(--gold);line-height:1">${s.num}</div><div style="font-size:.7rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.4rem">${s.lbl}</div></div>`).join('')}
        </div>
      </div>
      <div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:3/4" data-reveal data-delay="2">
        <img src="${ph(2, biz)}" alt="Our studio" style="width:100%;height:100%;object-fit:cover">
      </div>
    </div>
  </section>

  <!-- PHILOSOPHY -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:3rem">
        <div class="vKicker" style="margin-bottom:.75rem">How We Think</div>
        <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">Design philosophy.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem" class="vThreeCol">
        ${[
          { title: 'Function first, beauty always.', desc: 'We start with how you move through your kitchen — where you set bags down, where you fill the kettle, where you need counter space. Aesthetics follow from that.' },
          { title: 'Materials that age honestly.', desc: 'We do not recommend materials that look good in a brochure and fail in five years. Every stone, wood, and finish we specify performs as well at year ten as it does on day one.' },
          { title: 'One point of contact.', desc: 'Your project lead is a certified designer and a builder. They draw the plan and manage the crew. You never have to translate between two different people.' },
        ].map((p, i) => `<div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:2rem" data-reveal data-delay="${i + 1 as unknown as string}">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:700;color:var(--espresso);margin-bottom:.85rem">${esc(p.title)}</h3>
          <p style="font-size:.875rem;font-weight:300;color:var(--muted);line-height:1.75">${esc(p.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- TIMELINE -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:820px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:3rem">
        <div class="vKicker" style="margin-bottom:.75rem">Our History</div>
        <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.5rem)">How we got here.</h2>
      </div>
      <div style="display:flex;flex-direction:column;gap:0">
        ${[
          { year: '2010', title: 'Company Founded', desc: `${esc(biz.teamName || 'Our founder')} left a production remodeling company to start a design-led practice focused entirely on kitchens.` },
          { year: '2013', title: 'NKBA Certification', desc: 'The entire design team achieved NKBA certification, the first firm in the region to require it of all project leads.' },
          { year: '2017', title: '100th Kitchen Completed', desc: 'Reached 100 completed projects with a 98% client satisfaction score across all Google and Houzz reviews.' },
          { year: '2021', title: 'Award-Winning Project', desc: 'Recognised by the local NARI chapter for excellence in kitchen remodeling — full open-plan renovation in Cherry Creek.' },
          { year: 'Today', title: `${esc(String(biz.reviews || '200'))}+ Projects Completed`, desc: 'Still the same approach. One lead per project, one warranty, one point of contact from first call to final walkthrough.' },
        ].map((t, i) => `<div data-reveal style="display:grid;grid-template-columns:80px 1fr;gap:2rem;padding:1.75rem 0;border-bottom:1px solid var(--border)${i === 0 ? ';border-top:1px solid var(--border)' : ''}">
          <div style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:600;color:var(--gold)">${esc(t.year)}</div>
          <div>
            <div style="font-size:.95rem;font-weight:500;color:var(--espresso);margin-bottom:.4rem">${esc(t.title)}</div>
            <div style="font-size:.875rem;font-weight:300;color:var(--muted);line-height:1.7">${esc(t.desc)}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CERTIFICATIONS -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:3rem">
        <div class="vKicker" style="margin-bottom:.75rem">Credentials</div>
        <h2 class="vH" style="font-size:clamp(1.75rem,3vw,2.5rem)">Certifications that matter.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem">
        ${[
          { cert: 'NKBA Certified', body: 'National Kitchen & Bath Association', desc: 'The only certification that specifically tests kitchen design expertise.' },
          { cert: 'NARI Certified Remodeler', body: 'National Association of the Remodeling Industry', desc: 'Verifies business ethics, technical competence, and financial stability.' },
          { cert: 'EPA Lead-Safe', body: 'Environmental Protection Agency', desc: 'Required for any home built before 1978. We carry it as standard.' },
          { cert: 'Licensed General Contractor', body: `State of ${esc(biz.state || 'CO')}`, desc: 'Full GC license for structural, plumbing, and electrical scope.' },
        ].map((c, i) => `<div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem" data-reveal data-delay="${i + 1 as unknown as string}">
          <div style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:700;color:var(--espresso);margin-bottom:.3rem">${esc(c.cert)}</div>
          <div style="font-size:.7rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);margin-bottom:.85rem">${esc(c.body)}</div>
          <p style="font-size:.85rem;font-weight:300;color:var(--muted);line-height:1.65">${esc(c.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--espresso);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:600px;margin:0 auto" data-reveal>
      <h2 class="vH vH--light" style="font-size:clamp(1.75rem,4vw,2.75rem);margin-bottom:1rem;font-style:italic">See our work before you decide.</h2>
      <p style="font-size:.9rem;font-weight:300;color:rgba(255,255,255,.5);line-height:1.8;margin-bottom:2rem">Browse the project gallery, then call when you are ready to talk.</p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
        <a href="${baseUrl}/gallery" class="vBtn">View Gallery</a>
        <a href="tel:${telLink(biz.phone)}" style="display:inline-flex;align-items:center;border:1.5px solid rgba(176,135,80,.4);color:var(--gold);font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:.8rem 2rem;border-radius:3px;transition:border-color var(--ease)" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='rgba(176,135,80,.4)'">${esc(phoneDisplay(biz))}</a>
      </div>
    </div>
  </section>

</main>
${footer(biz, baseUrl)}
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {
  const mapQ = encodeURIComponent(biz.address || `${biz.city || 'Denver'}, ${biz.state || 'CO'}`);
  return shell(
    `Contact — ${esc(biz.name)}`,
    `
${nav(biz, baseUrl, 'Contact')}
<main style="padding-top:74px">

  <!-- HERO -->
  <section style="background:var(--espresso);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:700px;margin:0 auto" data-reveal>
      <div class="vKicker" style="color:rgba(176,135,80,.7);margin-bottom:1.25rem">Get in Touch</div>
      <a href="tel:${telLink(biz.phone)}" style="display:block;font-family:'Cormorant Garamond',serif;font-size:clamp(2.5rem,8vw,5.5rem);font-weight:700;color:var(--gold);line-height:1;margin-bottom:1rem;transition:opacity .2s" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">${esc(phoneDisplay(biz))}</a>
      <p style="font-size:.9rem;font-weight:300;color:rgba(255,255,255,.5)">${esc(biz.hours || 'Mon-Fri 8am-6pm')} &mdash; Free consultations available</p>
    </div>
  </section>

  <!-- FORM + DETAILS -->
  <section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start" class="vTwoCol">
      <div data-reveal>
        <h2 class="vH" style="font-size:clamp(1.75rem,3vw,2.25rem);margin-bottom:1rem">Tell us about your kitchen project.</h2>
        <p style="font-size:.875rem;font-weight:300;color:var(--muted);line-height:1.8;margin-bottom:2rem">Fill in the form and we will reach out within one business day to schedule your free consultation.</p>
        <form style="display:flex;flex-direction:column;gap:1.25rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem">
            <div><label class="vLabel">First Name</label><input class="vInput" type="text" placeholder="Margaret"></div>
            <div><label class="vLabel">Last Name</label><input class="vInput" type="text" placeholder="Thompson"></div>
          </div>
          <div><label class="vLabel">Phone</label><input class="vInput" type="tel" placeholder="(720) 555-0100"></div>
          <div><label class="vLabel">Email</label><input class="vInput" type="email" placeholder="you@example.com"></div>
          <div><label class="vLabel">Project Type</label>
            <select class="vInput"><option value="">Select...</option><option>Full Kitchen Renovation</option><option>Cabinet Installation</option><option>Countertop Replacement</option><option>Kitchen Island</option><option>Design Consultation</option><option>Other</option></select>
          </div>
          <div><label class="vLabel">Message (optional)</label><textarea class="vInput" rows="4" placeholder="Kitchen size, current state, timeline, rough budget..."></textarea></div>
          <button type="submit" class="vBtn" style="align-self:flex-start">Send Message</button>
        </form>
      </div>
      <div data-reveal data-delay="2">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:700;color:var(--espresso);margin-bottom:1.5rem">Office &amp; Service Area</h3>
        <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem">
          ${[
            ['Address', biz.address || cityState(biz)],
            ['Phone', `<a href="tel:${telLink(biz.phone)}" style="color:var(--gold)">${esc(phoneDisplay(biz))}</a>`],
            ['Hours', biz.hours || 'Mon-Fri 8am-6pm'],
            ['Service Area', `${esc(cityState(biz))} and surrounding communities`],
          ].map(([k, v]) => `<div style="display:flex;gap:1rem;font-size:.875rem"><span style="font-weight:500;color:var(--espresso);min-width:90px">${k}</span><span style="font-weight:300;color:var(--muted)">${v}</span></div>`).join('')}
        </div>
        <div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">
          <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent('-105.2,39.6,-104.8,39.9')}&layer=mapnik&marker=${encodeURIComponent('39.73,-105.0')}" style="width:100%;height:280px;border:none" title="Map" loading="lazy"></iframe>
        </div>
        <div style="margin-top:1.5rem;padding:1.5rem;background:var(--bg-alt);border-radius:var(--radius)">
          <h4 style="font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:700;color:var(--espresso);margin-bottom:.75rem">Free Consultation Includes</h4>
          ${['In-home walkthrough of your kitchen', 'Discussion of your goals and budget', 'Preliminary layout ideas', 'Written ballpark estimate — no charge'].map(item => `<div style="display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.55rem;font-size:.8rem;font-weight:300;color:var(--muted)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" style="flex-shrink:0;margin-top:2px"><polyline points="20 6 9 17 4 12"/></svg>${item}</div>`).join('')}
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:760px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:2.5rem">
        <div class="vKicker" style="margin-bottom:.75rem">FAQ</div>
        <h2 class="vH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Questions we hear most often.</h2>
      </div>
      <div data-reveal>
        ${[
          ['Do I need a design ready before calling?', 'No. Most clients come with nothing more than a vague idea and a rough budget. We help figure out the rest.'],
          ['How soon can you start?', 'Current lead time is 3 to 6 weeks from signed contract to project start, depending on scope and material availability.'],
          ['Do you work in my area?', `We serve ${esc(cityState(biz))} and surrounding communities. Call us to confirm availability for your address.`],
          ['Is the consultation really free?', 'Yes. It takes about an hour, includes a written ballpark estimate, and comes with no obligation to proceed.'],
        ].map(([q, a]) => `<details style="border-bottom:1px solid var(--border);overflow:hidden">
          <summary style="font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:500;color:var(--espresso);padding:1.25rem 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center">
            ${q}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" style="flex-shrink:0;transition:transform .3s"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <p style="font-size:.875rem;font-weight:300;color:var(--muted);line-height:1.8;padding:0 0 1.25rem">${a}</p>
        </details>`).join('')}
      </div>
    </div>
  </section>

</main>
${footer(biz, baseUrl)}
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildTeam(biz: BizPageData, baseUrl: string): string {
  const team = biz.team?.length >= 3 ? biz.team : [
    { name: biz.teamName || 'Sarah Collins', role: 'Lead Designer & Founder', photo: ph(0, biz) },
    { name: 'David Moreira', role: 'Project Manager', photo: ph(1, biz) },
    { name: 'Elena Vasquez', role: 'NKBA Certified Designer', photo: ph(2, biz) },
    { name: 'Marcus Webb', role: 'Master Installer', photo: ph(3, biz) },
  ];

  return shell(
    `Our Team — ${esc(biz.name)}`,
    `
${nav(biz, baseUrl, 'Team')}
<main style="padding-top:74px">

  <!-- HERO -->
  <section style="background:var(--bg-alt);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:700px;margin:0 auto" data-reveal>
      <div class="vKicker" style="margin-bottom:1rem">Our Team</div>
      <h1 class="vH" style="font-size:clamp(2rem,5vw,3.25rem);font-style:italic;margin-bottom:1rem">The people behind every project.</h1>
      <p style="font-size:.95rem;font-weight:300;color:var(--muted);line-height:1.8">One NKBA-certified project lead per kitchen. Not a crew of strangers managed by a scheduler.</p>
    </div>
  </section>

  <!-- TEAM GRID -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.5rem">
      ${team.map((m, i) => `
      <div class="vTeamCard" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as unknown as string}">
        ${m.photo
          ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}">`
          : `<div style="width:100%;aspect-ratio:4/3;background:var(--bg-alt);display:flex;align-items:center;justify-content:center"><span style="font-family:'Cormorant Garamond',serif;font-size:3rem;font-weight:700;color:var(--gold)">${esc(m.name[0] || 'T')}</span></div>`}
        <div class="vTeamBody">
          <div class="vTeamName">${esc(m.name)}</div>
          <div class="vTeamRole">${esc(m.role)}</div>
        </div>
      </div>`).join('')}
    </div>
  </section>

  <!-- VALUES -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:3rem">
        <div class="vKicker" style="margin-bottom:.75rem">What We Stand For</div>
        <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">How we work.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2rem" class="vThreeCol">
        ${[
          { title: 'Ownership over delegation.', desc: 'Every project lead owns their project from consultation to punch-list. Nothing gets handed off to a different crew halfway through.' },
          { title: 'Honest timelines.', desc: 'We give you a written schedule before work starts. If something changes, you hear from us first — not when you ask.' },
          { title: 'Craft over speed.', desc: 'We do not take shortcuts that cost you money later. The tile pattern, the grout line, the cabinet reveal — all of it gets done right the first time.' },
        ].map((v, i) => `<div data-reveal data-delay="${i + 1 as unknown as string}" style="border-top:2px solid var(--gold);padding-top:1.5rem">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:700;color:var(--espresso);margin-bottom:.75rem">${esc(v.title)}</h3>
          <p style="font-size:.875rem;font-weight:300;color:var(--muted);line-height:1.75">${esc(v.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- AWARDS -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center" class="vTwoCol">
      <div data-reveal>
        <div class="vKicker" style="margin-bottom:1rem">Recognition</div>
        <h2 class="vH" style="font-size:clamp(1.5rem,3vw,2.25rem);margin-bottom:1.5rem">Industry recognition for work that earns it.</h2>
        <div style="display:flex;flex-direction:column;gap:1rem">
          ${[
            'NARI Regional Excellence Award — Kitchen Remodeling',
            'Houzz Best of Design — 3 consecutive years',
            'Better Business Bureau A+ Accredited',
            'Google 4.9 Stars — ${esc(String(biz.reviews || "200"))}+ verified reviews',
          ].map(a => `<div style="display:flex;gap:1rem;align-items:flex-start;font-size:.875rem;font-weight:300;color:var(--muted)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" style="flex-shrink:0;margin-top:2px"><polyline points="20 6 9 17 4 12"/></svg>${a}</div>`).join('')}
        </div>
      </div>
      <div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:4/3" data-reveal data-delay="2">
        <img src="${ph(3, biz)}" alt="Award-winning kitchen project" style="width:100%;height:100%;object-fit:cover">
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:600px;margin:0 auto" data-reveal>
      <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.5rem);margin-bottom:1rem;font-style:italic">Ready to meet your project lead?</h2>
      <p style="font-size:.9rem;font-weight:300;color:var(--muted);line-height:1.8;margin-bottom:2rem">The free consultation is where we start. One hour, your kitchen, your goals.</p>
      <a href="${baseUrl}/contact" class="vBtn">Book a Free Consultation</a>
    </div>
  </section>

</main>
${footer(biz, baseUrl)}
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildGallery(biz: BizPageData, baseUrl: string): string {
  const imgs = Array.from({ length: 9 }, (_, i) => ph(i, biz));

  return shell(
    `Gallery — ${esc(biz.name)}`,
    `
${nav(biz, baseUrl, 'Gallery')}
<main style="padding-top:74px">

  <!-- HERO -->
  <section style="background:var(--espresso);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:700px;margin:0 auto" data-reveal>
      <div class="vKicker" style="color:rgba(176,135,80,.7);margin-bottom:1rem">Portfolio</div>
      <h1 class="vH vH--light" style="font-size:clamp(2rem,5vw,3.5rem);font-style:italic">Our work, for itself.</h1>
      <p style="font-size:.9rem;font-weight:300;color:rgba(255,255,255,.4);margin-top:1rem">Every project shown here was built by our team, start to finish.</p>
    </div>
  </section>

  <!-- GALLERY GRID -->
  <section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem" class="vThreeCol">
      ${imgs.map((img, i) => `<div class="vThumb" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as unknown as string}" style="aspect-ratio:${i % 5 === 0 ? '4/3' : '1/1'}"><img src="${img}" alt="Kitchen renovation project ${i + 1}" loading="lazy"></div>`).join('')}
    </div>
  </section>

  <!-- BEFORE/AFTER SECTION -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:3rem">
        <div class="vKicker" style="margin-bottom:.75rem">Transformations</div>
        <h2 class="vH" style="font-size:clamp(1.75rem,4vw,2.75rem)">Before &amp; After</h2>
        <p style="font-size:.875rem;font-weight:300;color:var(--muted);margin-top:.75rem">Drag the slider to see the full transformation.</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem" class="vTwoCol">
        ${baSlider('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', ph(0, biz))}
        ${baSlider('https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80', ph(1, biz))}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--espresso);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:600px;margin:0 auto" data-reveal>
      <h2 class="vH vH--light" style="font-size:clamp(1.75rem,4vw,2.5rem);margin-bottom:1rem;font-style:italic">Like what you see?</h2>
      <p style="font-size:.9rem;font-weight:300;color:rgba(255,255,255,.5);margin-bottom:2rem;line-height:1.8">Your kitchen could be next. Free consultation, written estimate, no obligation.</p>
      <a href="${baseUrl}/contact" class="vBtn">Get a Free Quote</a>
    </div>
  </section>

</main>
${footer(biz, baseUrl)}
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTIMONIALS PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildTestimonials(biz: BizPageData, baseUrl: string): string {
  const reviews = reviewPad(biz, 10);

  return shell(
    `Reviews — ${esc(biz.name)}`,
    `
${nav(biz, baseUrl, 'Reviews')}
<main style="padding-top:74px">

  <!-- HERO -->
  <section style="background:var(--bg-alt);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:700px;margin:0 auto" data-reveal>
      <div class="vKicker" style="margin-bottom:1rem">Client Reviews</div>
      <h1 class="vH" style="font-size:clamp(2rem,5vw,3.5rem);font-style:italic;margin-bottom:1rem">What our clients say.</h1>
      ${biz.rating ? `<div style="display:flex;align-items:center;justify-content:center;gap:.75rem"><span style="color:var(--gold);font-size:1.1rem;letter-spacing:.06em">${'★'.repeat(Math.round(biz.rating))}</span><span style="font-family:'Cormorant Garamond',serif;font-size:1.75rem;font-weight:700;color:var(--espresso)">${esc(String(biz.rating))}</span><span style="font-size:.875rem;font-weight:300;color:var(--muted)">${esc(String(biz.reviews || ''))} reviews on Google</span></div>` : ''}
    </div>
  </section>

  <!-- REVIEWS GRID -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.5rem">
      ${reviews.map((r, i) => `
      <div class="vTCard" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as unknown as string}">
        <div class="vTStars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="vTText">"${esc(r.text)}"</p>
        <div class="vTName">${esc(r.name)}</div>
        <div class="vTSvc">${esc(r.svc)} &mdash; ${esc(r.city)}</div>
      </div>`).join('')}
    </div>
  </section>

  <!-- GOOGLE RATING BOX -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:640px;margin:0 auto;text-align:center" data-reveal>
      <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:3rem 2.5rem">
        <div style="font-family:'Cormorant Garamond',serif;font-size:5rem;font-weight:700;color:var(--espresso);line-height:1">${esc(String(biz.rating || '4.9'))}</div>
        <div style="color:var(--gold);font-size:1.5rem;letter-spacing:.1em;margin:.5rem 0">${'★'.repeat(5)}</div>
        <div style="font-size:.875rem;font-weight:300;color:var(--muted);margin-bottom:1.5rem">Based on ${esc(String(biz.reviews || '200'))}+ Google reviews</div>
        <div style="font-size:.75rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--espresso)">NKBA Certified &middot; BBB A+ &middot; Houzz Best of Design</div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--espresso);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:600px;margin:0 auto" data-reveal>
      <h2 class="vH vH--light" style="font-size:clamp(1.75rem,4vw,2.5rem);margin-bottom:1rem;font-style:italic">Ready to add your name to that list?</h2>
      <p style="font-size:.9rem;font-weight:300;color:rgba(255,255,255,.5);margin-bottom:2rem;line-height:1.8">Book a free consultation. We will walk your kitchen together, talk through your goals, and give you a written estimate with no obligation.</p>
      <a href="${baseUrl}/contact" class="vBtn">Book a Free Consultation</a>
    </div>
  </section>

</main>
${footer(biz, baseUrl)}
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function buildKitchenRemodelV2AllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:         buildHome(biz, baseUrl),
    about:        buildAbout(biz, baseUrl),
    contact:      buildContact(biz, baseUrl),
    team:         buildTeam(biz, baseUrl),
    gallery:      buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
