/**
 * Bathroom Remodel V2 demo website builder — "Plinth" Minimal Precision
 * Design: Plus Jakarta Sans throughout (700/800 display, 300/400/500 body)
 * Palette: #f9f9f7 near-white bg, #92704a bronze, #1f1e1c charcoal, #7a9e7e sage
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
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
    'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80',
    'https://images.unsplash.com/photo-1620626011761-996317702149?w=800&q=80',
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80&fit=crop',
  ];
  return biz.photos[idx] || FALLBACKS[idx % FALLBACKS.length];
}

function telLink(phone: string | null): string {
  return (phone ?? '').replace(/[^0-9+]/g, '');
}

function phoneDisplay(biz: BizPageData): string {
  return biz.phone || '(503) 555-0180';
}

function cityState(biz: BizPageData): string {
  if (biz.city && biz.state) return `${biz.city}, ${biz.state}`;
  if (biz.city) return biz.city;
  return 'Portland, OR';
}

function reviewPad(biz: BizPageData, count: number): Array<{ text: string; name: string; svc: string; city: string }> {
  const defaults = [
    { text: 'The frameless shower they built is the best thing in this house. The glass is perfectly plumb, the floor drain is exactly centered. That level of precision is rare.', name: 'Karen H.', svc: 'Walk-In Shower Renovation', city: 'Portland, OR' },
    { text: 'They found a hidden leak in the subfloor before laying our new tile. Saved us from a much bigger problem down the road. Thorough from the start.', name: 'Brian T.', svc: 'Full Bathroom Remodel', city: 'Beaverton, OR' },
    { text: 'The floating vanity they installed looks like it was built with the house. Clean wall anchoring, no visible hardware, perfect level. I check it with a level myself.', name: 'Michelle W.', svc: 'Vanity Installation', city: 'Lake Oswego, OR' },
    { text: 'Three weeks, as promised. No extra visits, no surprise invoices. The bathroom looks like a boutique hotel. We have not stopped talking about it.', name: 'James S.', svc: 'Master Bath Remodel', city: 'Tigard, OR' },
    { text: 'The tile pattern on the floor is a chevron with a border detail I thought would be too ambitious. They delivered it without a single cut-line error.', name: 'Priya L.', svc: 'Tile & Flooring', city: 'Hillsboro, OR' },
    { text: 'They found an issue with the vent stack during demolition, fixed it, and did not charge extra. That is the kind of contractor you keep forever.', name: 'Daniel R.', svc: 'Full Bathroom Remodel', city: 'Gresham, OR' },
    { text: 'The soaking tub placement required rerouting a supply line. They diagrammed it for me before any work started. I knew exactly what I was paying for.', name: 'Susan F.', svc: 'Soaking Tub Addition', city: 'West Linn, OR' },
    { text: 'We had three estimates. This was the most detailed by far. Every line item explained. That transparency is what made us choose them — and they delivered.', name: 'Tom A.', svc: 'Bathroom Addition', city: 'Sherwood, OR' },
    { text: 'The hexagonal mosaic floor in the guest bath is a conversation piece every time someone visits. Installed perfectly, grout lines consistent to the millimeter.', name: 'Clara B.', svc: 'Tile Work', city: 'Milwaukie, OR' },
    { text: 'They set up dust barriers that actually worked. Our bedroom adjacent to the bath stayed clean throughout a two-week remodel. That respect for your home is rare.', name: 'Henry M.', svc: 'Master Bath Remodel', city: 'Lake Oswego, OR' },
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
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">`;

const BASE_CSS = `<style>
:root{
  --bronze:#92704a;
  --bronze-hover:#7a5c3a;
  --sage:#7a9e7e;
  --charcoal:#1f1e1c;
  --bg:#f9f9f7;
  --bg-alt:#f0ede8;
  --card:#ffffff;
  --border:#ddd8d0;
  --muted:#8a857d;
  --sp:clamp(4rem,8vw,7rem);
  --radius:8px;
  --ease:.3s cubic-bezier(.4,0,.2,1);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--charcoal);font-family:'Plus Jakarta Sans',sans-serif;font-weight:400;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}

/* reveal */
[data-reveal]{opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
[data-reveal].revealed{opacity:1;transform:none}
[data-delay="1"]{transition-delay:.1s}[data-delay="2"]{transition-delay:.2s}
[data-delay="3"]{transition-delay:.3s}[data-delay="4"]{transition-delay:.4s}

/* nav */
#pNav{position:fixed;top:0;left:0;right:0;z-index:900;height:68px;display:flex;align-items:center;padding:0 clamp(1.25rem,4vw,3rem);background:#fff;border-bottom:1px solid var(--border);transition:box-shadow var(--ease)}
#pNav.elevated{box-shadow:0 2px 12px rgba(31,30,28,.07)}
.pNavBrand{font-size:1rem;font-weight:700;color:var(--charcoal);flex:1;letter-spacing:.01em}
.pNavCenter{display:flex;align-items:center;gap:2.5rem;flex:2;justify-content:center}
.pNavRight{display:flex;align-items:center;gap:1rem;flex:1;justify-content:flex-end}
.pNavLink{font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);transition:color var(--ease)}
.pNavLink:hover,.pNavLink.active{color:var(--charcoal)}
.pBtnBronze{display:inline-flex;align-items:center;background:var(--bronze);color:#fff;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.55rem 1.3rem;border-radius:4px;transition:background var(--ease)}
.pBtnBronze:hover{background:var(--bronze-hover)}
.pBtnOut{display:inline-flex;align-items:center;border:1.5px solid var(--charcoal);color:var(--charcoal);font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.55rem 1.3rem;border-radius:4px;transition:all var(--ease)}
.pBtnOut:hover{background:var(--charcoal);color:#fff}

/* hamburger */
#pToggle{display:none;flex-direction:column;gap:4px;background:none;border:none;cursor:pointer;padding:6px}
#pToggle span{display:block;width:20px;height:1.5px;background:var(--charcoal);transition:var(--ease)}
#pMobile{display:none;flex-direction:column;background:#fff;border-top:1px solid var(--border);padding:1.25rem clamp(1.25rem,4vw,3rem) 1.75rem}
#pMobile .pNavLink{font-size:.8rem;padding:.7rem 0;border-bottom:1px solid var(--border)}
#pMobile .pBtnBronze{margin-top:1rem;justify-content:center}

/* section labels */
.pLabel{font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--bronze)}

/* headings */
.pH{font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;line-height:1.05;color:var(--charcoal)}
.pH--light{color:#fff}

/* primary button */
.pBtn{display:inline-flex;align-items:center;background:var(--charcoal);color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.8rem 2rem;border-radius:4px;border:none;cursor:pointer;transition:background var(--ease)}
.pBtn:hover{background:#3a3835}
.pBtnBronzeLg{display:inline-flex;align-items:center;background:var(--bronze);color:#fff;font-family:'Plus Jakarta Sans',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.8rem 2rem;border-radius:4px;border:none;cursor:pointer;transition:background var(--ease)}
.pBtnBronzeLg:hover{background:var(--bronze-hover)}

/* services list */
.pSvcRow{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:2rem;padding:1.5rem 0;border-bottom:1px solid var(--border)}
.pSvcName{font-size:1.1rem;font-weight:700;color:var(--charcoal)}
.pSvcDesc{font-size:.825rem;font-weight:400;color:var(--muted);line-height:1.65;margin-top:.35rem;max-width:520px}
.pSvcPrice{font-size:.875rem;font-weight:600;color:var(--bronze);white-space:nowrap}

/* gallery strip */
.pStrip{overflow-x:auto;overflow-y:hidden;white-space:nowrap;-ms-overflow-style:none;scrollbar-width:none;-webkit-mask-image:linear-gradient(to right,transparent,black 4%,black 96%,transparent);mask-image:linear-gradient(to right,transparent,black 4%,black 96%,transparent)}
.pStrip::-webkit-scrollbar{display:none}
.pStripInner{display:inline-flex;gap:14px;padding:0 clamp(1.25rem,4vw,3rem)}
.pStripImg{flex:0 0 260px;border-radius:var(--radius);overflow:hidden;aspect-ratio:3/4}
.pStripImg img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.pStripImg:hover img{transform:scale(1.04)}

/* icon cards */
.pIconCard{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem 1.75rem}
.pIconCard svg{color:var(--bronze);margin-bottom:1.1rem}
.pIconCard h3{font-size:.95rem;font-weight:700;color:var(--charcoal);margin-bottom:.6rem}
.pIconCard p{font-size:.8rem;font-weight:400;color:var(--muted);line-height:1.7}

/* project showcase alternating */
.pProject{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch}
.pProject--rev{direction:rtl}
.pProject--rev>*{direction:ltr}
.pProjectImg{overflow:hidden}
.pProjectImg img{width:100%;height:100%;min-height:380px;object-fit:cover;transition:transform .6s ease}
.pProjectImg:hover img{transform:scale(1.04)}
.pProjectBody{padding:clamp(2rem,5vw,4rem);display:flex;flex-direction:column;justify-content:center;background:var(--card);border:1px solid var(--border)}

/* stats */
.pStatGrid{display:grid;grid-template-columns:repeat(4,1fr)}
.pStatCell{padding:2.5rem 1.5rem;text-align:center;border-right:1px solid var(--border)}
.pStatCell:last-child{border-right:none}
.pStatNum{font-size:clamp(2rem,4vw,3rem);font-weight:800;color:var(--charcoal);line-height:1}
.pStatLbl{font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.5rem}

/* process list */
.pProcItem{display:grid;grid-template-columns:28px 1fr;gap:1.25rem;padding:1.5rem 0;border-bottom:1px solid var(--border)}
.pProcNum{font-size:.7rem;font-weight:800;color:var(--bronze);letter-spacing:.05em;padding-top:.15rem}
.pProcTitle{font-size:.95rem;font-weight:700;color:var(--charcoal);margin-bottom:.4rem}
.pProcDesc{font-size:.8rem;font-weight:400;color:var(--muted);line-height:1.7}

/* testimonial carousel */
.pTestiBox{background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:2.5rem;text-align:center;max-width:680px;margin:0 auto}
.pTestiText{font-size:1rem;font-weight:400;color:var(--charcoal);line-height:1.75;margin-bottom:1.5rem}
.pTestiName{font-size:.85rem;font-weight:700;color:var(--charcoal)}
.pTestiSvc{font-size:.75rem;font-weight:400;color:var(--muted);margin-top:.25rem}
.pTestiDots{display:flex;gap:.5rem;justify-content:center;margin-top:2rem}
.pTestiDot{width:7px;height:7px;border-radius:50%;background:var(--border);cursor:pointer;transition:background var(--ease)}
.pTestiDot.active{background:var(--bronze)}

/* FAQ accordion */
.pFaq{border-bottom:1px solid var(--border)}
.pFaq summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.25rem 0;cursor:pointer;font-size:.9rem;font-weight:600;color:var(--charcoal);transition:color var(--ease)}
.pFaq summary::-webkit-details-marker{display:none}
.pFaq summary:hover{color:var(--bronze)}
.pFaq[open] summary{color:var(--bronze)}
.pFaqIcon{width:18px;height:18px;flex-shrink:0;transition:transform var(--ease);color:var(--bronze)}
.pFaq[open] .pFaqIcon{transform:rotate(45deg)}
.pFaqBody{font-size:.85rem;font-weight:400;color:var(--muted);line-height:1.8;padding:0 0 1.25rem}

/* ba slider */
.pBa{position:relative;overflow:hidden;border-radius:var(--radius);aspect-ratio:4/3;cursor:ew-resize;user-select:none;max-width:620px;margin:0 auto}
.pBa-after{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pBa-before{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.pBa-before img{width:100%;height:100%;object-fit:cover}
.pBa-handle{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--bronze);touch-action:none}
.pBa-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;border-radius:50%;background:var(--bronze);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.2)}
.pBa-lbl{position:absolute;top:11px;font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:2px}
.pBa-lbl-b{left:11px;background:rgba(31,30,28,.8);color:rgba(255,255,255,.85)}
.pBa-lbl-a{right:11px;background:var(--bronze);color:#fff}

/* form */
.pInput{width:100%;background:#fff;border:1.5px solid var(--border);border-radius:5px;color:var(--charcoal);font-family:'Plus Jakarta Sans',sans-serif;font-size:.875rem;font-weight:400;padding:.75rem 1rem;outline:none;transition:border-color var(--ease)}
.pInput:focus{border-color:var(--bronze)}
.pLabel{display:block;font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem}

/* team card */
.pTeamCard{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:box-shadow var(--ease)}
.pTeamCard:hover{box-shadow:0 6px 24px rgba(146,112,74,.1)}
.pTeamCard img{width:100%;aspect-ratio:4/3;object-fit:cover}
.pTeamBody{padding:1.35rem 1.25rem}
.pTeamName{font-size:1rem;font-weight:700;color:var(--charcoal)}
.pTeamRole{font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--bronze);margin:.25rem 0 .6rem}
.pTeamBio{font-size:.8rem;font-weight:400;color:var(--muted);line-height:1.65}

/* gallery thumb */
.pThumb{overflow:hidden;border-radius:var(--radius)}
.pThumb img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.pThumb:hover img{transform:scale(1.05)}

/* responsive */
@media(max-width:900px){
  .pNavCenter,.pNavRight .pNavLink{display:none}
  #pToggle{display:flex}
  .pTwoCol{grid-template-columns:1fr!important}
  .pThreeCol{grid-template-columns:1fr 1fr!important}
  .pStatGrid{grid-template-columns:1fr 1fr!important}
  .pStatCell{border-right:none;border-bottom:1px solid var(--border)}
  .pProject{grid-template-columns:1fr!important}
  .pProject--rev{direction:ltr}
  .pSvcRow{grid-template-columns:1fr;gap:.5rem}
}
@media(max-width:600px){
  .pThreeCol{grid-template-columns:1fr!important}
  .pFourCol{grid-template-columns:1fr 1fr!important}
}
</style>`;

const REVEAL_JS = `<script>(function(){var o=new IntersectionObserver(function(e){e.forEach(function(i){if(i.isIntersecting){i.target.classList.add('revealed');o.unobserve(i.target);}});},{threshold:.08,rootMargin:'0px 0px -40px 0px'});document.querySelectorAll('[data-reveal]').forEach(function(el){o.observe(el);});})();</script>`;

const BA_JS = `<script>document.querySelectorAll('.pBa').forEach(function(c){var b=c.querySelector('.pBa-before'),h=c.querySelector('.pBa-handle'),d=false;function pos(x){var r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}h.addEventListener('mousedown',function(){d=true;});window.addEventListener('mouseup',function(){d=false;});window.addEventListener('mousemove',function(e){if(d)pos(e.clientX);});h.addEventListener('touchstart',function(e){d=true;e.preventDefault();},{passive:false});window.addEventListener('touchend',function(){d=false;});window.addEventListener('touchmove',function(e){if(d)pos(e.touches[0].clientX);},{passive:true});});</script>`;

const NAV_JS = `<script>window.addEventListener('scroll',function(){document.getElementById('pNav').classList.toggle('elevated',window.scrollY>20);});document.getElementById('pToggle').addEventListener('click',function(){var m=document.getElementById('pMobile');m.style.display=m.style.display==='flex'?'none':'flex';});</script>`;

const TESTI_JS = `<script>(function(){var cards=document.querySelectorAll('.pTestiSlide'),dots=document.querySelectorAll('.pTestiDot'),cur=0;function show(n){cards.forEach(function(c,i){c.style.display=i===n?'block':'none';});dots.forEach(function(d,i){d.classList.toggle('active',i===n);});cur=n;}show(0);dots.forEach(function(d,i){d.addEventListener('click',function(){show(i);});});setInterval(function(){show((cur+1)%cards.length);},5500);})();</script>`;

// ── Shell ─────────────────────────────────────────────────────────────────────

function shell(title: string, bodyContent: string, extraJs = ''): string {
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
${extraJs}
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
  const center = links.slice(1, 4);
  return `
<nav id="pNav">
  <div class="pNavBrand">${esc(biz.name)}</div>
  <div class="pNavCenter">
    ${center.map(l => `<a href="${l.href}" class="pNavLink${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
  </div>
  <div class="pNavRight">
    <a href="${baseUrl}/testimonials" class="pNavLink${active === 'Reviews' ? ' active' : ''}">Reviews</a>
    <a href="tel:${telLink(biz.phone)}" class="pBtnBronze">Free Quote</a>
  </div>
  <button id="pToggle" aria-label="Menu"><span></span><span></span><span></span></button>
</nav>
<div id="pMobile">
  ${links.map(l => `<a href="${l.href}" class="pNavLink${l.label === active ? ' active' : ''}">${l.label}</a>`).join('')}
  <a href="tel:${telLink(biz.phone)}" class="pBtnBronze">Free Quote</a>
</div>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `
<footer style="background:var(--charcoal);color:rgba(255,255,255,.45);padding:3.5rem clamp(1.25rem,4vw,3rem) 2rem">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:3rem;margin-bottom:2.5rem" class="pTwoCol">
    <div>
      <div style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:.6rem">${esc(biz.name)}</div>
      <p style="font-size:.85rem;font-weight:300;line-height:1.75;margin-bottom:1.25rem;max-width:320px">Precision bathroom remodeling in ${esc(cityState(biz))}. Licensed, insured, NKBA certified.</p>
      <a href="tel:${telLink(biz.phone)}" style="font-size:1.25rem;font-weight:700;color:var(--bronze)">${esc(phoneDisplay(biz))}</a>
      <div style="margin-top:.4rem;font-size:.8rem;font-weight:300">${esc(biz.hours || 'Mon-Fri 8am-6pm')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem">
      <div>
        <div style="font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:.9rem">Pages</div>
        ${[['Home', baseUrl], ['About', `${baseUrl}/about`], ['Gallery', `${baseUrl}/gallery`], ['Team', `${baseUrl}/team`], ['Reviews', `${baseUrl}/testimonials`], ['Contact', `${baseUrl}/contact`]].map(([l, h]) => `<a href="${h}" style="display:block;font-size:.825rem;font-weight:400;color:rgba(255,255,255,.35);margin-bottom:.5rem;transition:color var(--ease)" onmouseover="this.style.color='var(--bronze)'" onmouseout="this.style.color='rgba(255,255,255,.35)'">${l}</a>`).join('')}
      </div>
      <div>
        <div style="font-size:.65rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:.9rem">Contact</div>
        ${biz.address ? `<p style="font-size:.825rem;font-weight:300;line-height:1.75;margin-bottom:.5rem">${esc(biz.address)}</p>` : ''}
        <div style="font-size:.825rem;font-weight:300">${esc(biz.hours || 'Mon-Fri 8am-6pm')}</div>
      </div>
    </div>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
    <div style="font-size:.75rem;color:rgba(255,255,255,.2)">© ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.2)">Licensed &amp; Insured · NKBA Certified · BBB A+</div>
  </div>
</footer>`;
}

// ── BA Slider ─────────────────────────────────────────────────────────────────

function baSlider(before: string, after: string): string {
  return `<div class="pBa">
  <img class="pBa-after" src="${esc(after)}" alt="Bathroom after renovation">
  <div class="pBa-before"><img src="${esc(before)}" alt="Bathroom before renovation"></div>
  <div class="pBa-lbl pBa-lbl-b">Before</div>
  <div class="pBa-lbl pBa-lbl-a">After</div>
  <div class="pBa-handle"><div class="pBa-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg></div></div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {

  const services = biz.services?.length ? biz.services : [
    { name: 'Walk-In Shower Renovation',  desc: 'Frameless glass enclosures, custom bench seating, and precision tile work. Designed around your morning routine.', price: 'From $8,500' },
    { name: 'Vanity & Sink Installation', desc: 'Floating vanities, vessel sinks, and storage solutions built to fit your space.', price: 'From $3,200' },
    { name: 'Full Master Bath Remodel',   desc: 'One crew, one schedule, one point of contact from demolition to final fixture.', price: 'From $22,000' },
    { name: 'Tile Work & Flooring',       desc: 'Porcelain, natural stone, and mosaic tile installed with consistent grout lines and full waterproofing.', price: 'From $4,000' },
    { name: 'Soaking Tub Addition',       desc: 'Freestanding tubs and alcove installations with full plumbing, surrounds, and lighting.', price: 'From $6,500' },
    { name: 'Bathroom Addition',          desc: 'Permit-to-finish additions for growing households. We handle the full scope.', price: 'From $28,000' },
  ];

  const projects = [
    { title: 'Master Suite Renovation', city: `${esc(biz.city || 'Portland')}, OR`, detail: 'Frameless shower, freestanding tub, heated floors, floating dual vanity.', img: ph(0, biz), dur: '3 weeks' },
    { title: 'Guest Bath Transformation', city: `${esc(biz.city || 'Beaverton')}, OR`, detail: 'Full tile refresh, new vanity, walk-in shower conversion from tub.', img: ph(1, biz), dur: '8 days' },
    { title: 'Hall Bathroom Addition', city: `${esc(biz.city || 'Lake Oswego')}, OR`, detail: 'New half bath added to unused closet space. Full permit and plumbing scope.', img: ph(2, biz), dur: '2 weeks' },
  ];

  const reviews6 = reviewPad(biz, 6);
  const faqs = [
    { q: 'How long does a full bathroom remodel take?', a: 'Most full remodels run 2 to 4 weeks depending on scope. Shower-only projects can close in 3 to 5 days. You get a written timeline before a tool enters your bathroom.' },
    { q: 'Do you handle permits and inspections?', a: 'Yes. We pull all required permits, schedule inspections, and ensure every installation meets local code. You do not have to deal with the permit office.' },
    { q: 'Can I stay in my home during the remodel?', a: 'Yes, in most cases. We use dust barriers, clean up each evening, and restore water access where possible. For full gut remodels we plan phasing around your schedule.' },
    { q: 'Is there a fee for the consultation?', a: 'None. The first consultation is free, takes about 45 minutes, and comes with a written ballpark estimate at no charge.' },
    { q: 'What certifications does your team hold?', a: 'Our project leads hold NKBA certification, the only credential that specifically verifies bathroom design expertise. We are also licensed general contractors and EPA Lead-Safe certified.' },
  ];

  return shell(
    `${esc(biz.name)} — Bathroom Remodeling in ${esc(cityState(biz))}`,
    `
${nav(biz, baseUrl, 'Home')}

<!-- 1. HERO — centered minimal -->
<section style="padding-top:68px;background:var(--bg);min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-left:clamp(1.25rem,4vw,3rem);padding-right:clamp(1.25rem,4vw,3rem)">
  <div style="max-width:800px;padding:clamp(3rem,6vw,5rem) 0">
    <div class="pLabel" data-reveal style="margin-bottom:1.25rem">Bathroom Renovation Specialists</div>
    <h1 class="pH" data-reveal style="font-size:clamp(2.5rem,7vw,5rem);margin-bottom:1.5rem;line-height:1.0">${esc(biz.heroHeadline || 'Bathrooms designed')} <span style="color:var(--bronze)">${esc(biz.heroHeadlineEm || 'with precision.')}</span></h1>
    <p data-reveal style="font-size:clamp(.9rem,1.8vw,1.05rem);font-weight:400;color:var(--muted);max-width:520px;margin:0 auto 2rem;line-height:1.85">${esc(biz.heroSub || `Precision bathroom remodeling in ${cityState(biz)}. Licensed, insured, and backed by a five-year warranty.`)}</p>
    <div data-reveal style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-bottom:3rem">
      <a href="${baseUrl}/contact" class="pBtn">Get a Free Quote</a>
      <a href="${baseUrl}/gallery" class="pBtnOut" style="display:inline-flex;align-items:center;border:1.5px solid var(--charcoal);color:var(--charcoal);font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.8rem 2rem;border-radius:4px;transition:all var(--ease)">View Projects</a>
    </div>
    <div data-reveal style="display:flex;align-items:center;justify-content:center;gap:2rem;flex-wrap:wrap;padding-top:2rem;border-top:1px solid var(--border)">
      ${['500+ Bathrooms Renovated', 'Licensed &amp; Insured', 'Satisfaction Guaranteed'].map(f => `<div style="font-size:.8rem;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:.5rem"><span style="width:4px;height:4px;border-radius:50%;background:var(--bronze);flex-shrink:0"></span>${f}</div>`).join('')}
    </div>
  </div>
  <!-- hero image — full width below -->
  <div data-reveal style="width:100%;max-width:1280px;border-radius:var(--radius);overflow:hidden;aspect-ratio:21/9;margin:0 auto;position:relative">
    <img src="${ph(0, biz)}" alt="Bathroom renovation by ${esc(biz.name)}" style="width:100%;height:100%;object-fit:cover">
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 60%,rgba(249,249,247,.6));pointer-events:none"></div>
  </div>
</section>

<!-- 2. INTRO PULL QUOTE -->
<section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:820px;margin:0 auto;text-align:center" data-reveal>
    <p style="font-size:clamp(1.1rem,2.5vw,1.6rem);font-weight:700;color:var(--charcoal);line-height:1.4;margin-bottom:1.25rem">"A bathroom remodel is the most precise trade work in residential construction. Every surface matters. Every joint shows."</p>
    <div style="font-size:.8rem;font-weight:600;color:var(--bronze)">${esc(biz.teamName || 'The team at')} ${esc(biz.name)}</div>
  </div>
</section>

<!-- 3. SERVICES — refined list -->
<section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="margin-bottom:2.5rem;border-bottom:2px solid var(--charcoal);padding-bottom:1.25rem;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Services</h2>
      <div class="pLabel">What we build</div>
    </div>
    <div style="display:flex;flex-direction:column">
      ${services.slice(0, 6).map((s, i) => `
      <div class="pSvcRow" data-reveal>
        <div>
          <div class="pSvcName">${esc(s.name)}</div>
          <div class="pSvcDesc">${esc(s.desc)}</div>
        </div>
        <div class="pSvcPrice">${esc(s.price)}</div>
        <a href="${baseUrl}/contact" style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--bronze);border-bottom:1px solid rgba(146,112,74,.4);white-space:nowrap;padding-bottom:1px;flex-shrink:0">Get Quote</a>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- 4. GALLERY STRIP — horizontal scroll -->
<section style="background:var(--bg-alt);padding:var(--sp) 0;overflow:hidden">
  <div style="max-width:1280px;margin:0 auto;padding:0 clamp(1.25rem,4vw,3rem);margin-bottom:1.75rem" data-reveal>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <h2 class="pH" style="font-size:clamp(1.25rem,3vw,2rem)">Recent Work</h2>
      <a href="${baseUrl}/gallery" style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--bronze);border-bottom:1px solid rgba(146,112,74,.4);padding-bottom:1px">View All Projects</a>
    </div>
  </div>
  <div class="pStrip">
    <div class="pStripInner">
      ${Array.from({ length: 8 }, (_, i) => `<div class="pStripImg"><img src="${ph(i, biz)}" alt="Bathroom project ${i + 1}" loading="lazy"></div>`).join('')}
    </div>
  </div>
</section>

<!-- 5. WHY CHOOSE — 3 icon cards -->
<section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="pLabel" style="margin-bottom:.75rem">Why Choose Us</div>
      <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Three things we do differently.</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem" class="pThreeCol">
      ${[
        { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`, title: 'Written timelines, kept.', desc: 'You receive a written project schedule before work starts. If anything changes, you hear about it the same day — not after the fact.' },
        { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, title: 'One point of contact.', desc: 'Your project lead holds their NKBA certification personally. They draw the plans, select the materials, and manage the crew from start to finish.' },
        { icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>`, title: 'Five-year warranty on all labor.', desc: 'Every project we complete is backed by a written five-year warranty on all labor and installation. One call, handled.' },
      ].map((c, i) => `<div class="pIconCard" data-reveal data-delay="${i + 1 as unknown as string}">${c.icon}<h3>${c.title}</h3><p>${c.desc}</p></div>`).join('')}
    </div>
  </div>
</section>

<!-- 6. PROJECT SHOWCASE — alternating -->
<section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1280px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:3rem">
      <div class="pLabel" style="margin-bottom:.75rem">Project Spotlight</div>
      <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Recent Projects</h2>
    </div>
    ${projects.map((p, i) => `
    <div class="pProject${i % 2 === 1 ? ' pProject--rev' : ''}" data-reveal style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1.5rem">
      <div class="pProjectImg"><img src="${p.img}" alt="${esc(p.title)}" loading="lazy"></div>
      <div class="pProjectBody">
        <div class="pLabel" style="margin-bottom:.75rem">${esc(p.city)}</div>
        <h3 style="font-size:clamp(1.15rem,2vw,1.5rem);font-weight:800;color:var(--charcoal);margin-bottom:.75rem">${esc(p.title)}</h3>
        <p style="font-size:.875rem;font-weight:400;color:var(--muted);line-height:1.75;margin-bottom:1.25rem">${esc(p.detail)}</p>
        <div style="font-size:.75rem;font-weight:700;color:var(--bronze);letter-spacing:.06em;text-transform:uppercase;margin-bottom:1.5rem">Completed in ${esc(p.dur)}</div>
        <a href="${baseUrl}/gallery" style="font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--charcoal);border-bottom:1px solid var(--charcoal);padding-bottom:1px">View Gallery</a>
      </div>
    </div>`).join('')}
  </div>
</section>

<!-- 7. TESTIMONIALS — carousel -->
<section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:1100px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:2.5rem">
      <div class="pLabel" style="margin-bottom:.75rem">Client Reviews</div>
      <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">What our clients say.</h2>
    </div>
    <div data-reveal>
      <div class="pTestiBox">
        ${reviews6.slice(0, 4).map((r, i) => `
        <div class="pTestiSlide" style="display:${i === 0 ? 'block' : 'none'}">
          <div style="color:var(--bronze);font-size:1.1rem;letter-spacing:.1em;margin-bottom:1.25rem">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <p class="pTestiText">"${esc(r.text)}"</p>
          <div class="pTestiName">${esc(r.name)}</div>
          <div class="pTestiSvc">${esc(r.svc)} &mdash; ${esc(r.city)}</div>
        </div>`).join('')}
        <div class="pTestiDots">
          ${reviews6.slice(0, 4).map((_, i) => `<div class="pTestiDot${i === 0 ? ' active' : ''}"></div>`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 8. FAQ -->
<section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:760px;margin:0 auto">
    <div data-reveal style="text-align:center;margin-bottom:2.5rem">
      <div class="pLabel" style="margin-bottom:.75rem">FAQ</div>
      <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Common questions.</h2>
    </div>
    <div data-reveal>
      <div style="border-top:1px solid var(--border)">
        ${faqs.map(f => `<details class="pFaq">
          <summary>${esc(f.q)}<svg class="pFaqIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></summary>
          <p class="pFaqBody">${esc(f.a)}</p>
        </details>`).join('')}
      </div>
    </div>
  </div>
</section>

<!-- 9. STATS -->
<section style="background:var(--bg);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:1280px;margin:0 auto">
    <div class="pStatGrid">
      ${[
        { num: '500+', lbl: 'Bathrooms Renovated' },
        { num: `${esc(biz.yearsInBiz || '12')}+`, lbl: 'Years in Business' },
        { num: '100%', lbl: 'Licensed &amp; Insured' },
        { num: esc(String(biz.rating || '4.9')), lbl: 'Google Rating' },
      ].map((s, i) => `<div class="pStatCell" data-reveal data-delay="${i + 1 as unknown as string}"><div class="pStatNum">${s.num}</div><div class="pStatLbl">${s.lbl}</div></div>`).join('')}
    </div>
  </div>
</section>

<!-- 10. PROCESS -->
<section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
  <div style="max-width:760px;margin:0 auto">
    <div data-reveal style="margin-bottom:2.5rem">
      <div class="pLabel" style="margin-bottom:.75rem">How It Works</div>
      <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Our process.</h2>
    </div>
    <div style="border-top:1px solid var(--border)">
      ${[
        { step: '01', title: 'Free Consultation', desc: 'We walk your bathroom, discuss your goals, and give you a written ballpark estimate with no obligation.' },
        { step: '02', title: 'Design & Material Selection', desc: 'We propose a layout and material palette. You approve every selection before we order anything.' },
        { step: '03', title: 'Build', desc: 'One crew lead manages the entire project. Daily updates, clean worksite, no subcontractor confusion.' },
        { step: '04', title: 'Final Walkthrough & Warranty', desc: 'We walk every detail together at completion. Your five-year labor warranty starts the day you sign off.' },
      ].map((s, i) => `<div class="pProcItem" data-reveal>
        <div class="pProcNum">${s.step}</div>
        <div><div class="pProcTitle">${esc(s.title)}</div><div class="pProcDesc">${esc(s.desc)}</div></div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- 11. CTA — stone section -->
<section style="background:var(--charcoal);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
  <div style="max-width:640px;margin:0 auto" data-reveal>
    <div class="pLabel" style="color:rgba(146,112,74,.7);margin-bottom:1rem">Get Started</div>
    <h2 class="pH pH--light" style="font-size:clamp(1.75rem,4vw,3rem);margin-bottom:1.1rem">Your bathroom could look entirely different in three weeks.</h2>
    <p style="font-size:.9rem;font-weight:400;color:rgba(255,255,255,.45);line-height:1.85;margin-bottom:2.25rem">Free consultation. Written estimate. No obligation. Most clients are surprised how straightforward the process is.</p>
    <a href="${baseUrl}/contact" class="pBtnBronzeLg" style="font-size:.9rem;padding:1rem 2.5rem">Book a Free Consultation</a>
    <div style="margin-top:1.5rem"><a href="tel:${telLink(biz.phone)}" style="font-size:1.35rem;font-weight:700;color:var(--bronze)">${esc(phoneDisplay(biz))}</a></div>
    <div style="margin-top:.4rem;font-size:.8rem;color:rgba(255,255,255,.3);font-weight:300">${esc(biz.hours || 'Mon-Fri 8am-6pm')}</div>
  </div>
</section>

${footer(biz, baseUrl)}
`,
    TESTI_JS
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
<main style="padding-top:68px">

  <!-- HERO -->
  <section style="background:var(--bg-alt);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:820px;margin:0 auto;text-align:center" data-reveal>
      <div class="pLabel" style="margin-bottom:1rem">About Us</div>
      <h1 class="pH" style="font-size:clamp(2rem,5vw,3.5rem);margin-bottom:1.25rem">${esc(biz.aboutText || 'Precision work. Real results.')}</h1>
      <p style="font-size:.95rem;font-weight:400;color:var(--muted);line-height:1.85;max-width:580px;margin:0 auto">${esc(biz.aboutText2 || 'We built this company on a belief that bathroom remodeling should be done with the same precision a fine cabinetmaker brings to a kitchen.')}</p>
    </div>
  </section>

  <!-- STORY -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4.5rem;align-items:center" class="pTwoCol">
      <div data-reveal>
        <div class="pLabel" style="margin-bottom:1rem">Our Story</div>
        <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem);margin-bottom:1.25rem">Founded by tradespeople who got tired of work that did not hold.</h2>
        <p style="font-size:.875rem;font-weight:400;color:var(--muted);line-height:1.85;margin-bottom:1rem">Most remodeling companies hand your project to different crews for different phases. We build differently. Your project lead handles the design, coordinates the materials, and manages every step.</p>
        <p style="font-size:.875rem;font-weight:400;color:var(--muted);line-height:1.85;margin-bottom:2rem">That continuity shows in the work. Grout lines that match across tile changes. Fixtures that align perfectly. Tolerances that hold for years.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;border-top:1px solid var(--border);padding-top:1.75rem">
          ${[
            { num: `${esc(biz.yearsInBiz || '12')}+`, lbl: 'Years Operating' },
            { num: '500+', lbl: 'Bathrooms Completed' },
            { num: esc(String(biz.rating || '4.9')), lbl: 'Google Rating' },
          ].map(s => `<div><div style="font-size:2rem;font-weight:800;color:var(--charcoal);line-height:1">${s.num}</div><div style="font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:.4rem">${s.lbl}</div></div>`).join('')}
        </div>
      </div>
      <div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:3/4" data-reveal data-delay="2">
        <img src="${ph(2, biz)}" alt="Our work" style="width:100%;height:100%;object-fit:cover">
      </div>
    </div>
  </section>

  <!-- APPROACH -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1100px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:3rem">
        <div class="pLabel" style="margin-bottom:.75rem">How We Think</div>
        <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Our approach to every project.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem" class="pThreeCol">
        ${[
          { num: '01', title: 'Measure twice.', desc: 'Every tile layout, every fixture placement, every supply line run is measured and confirmed before ordering. Rework is not part of our schedule.' },
          { num: '02', title: 'Material selection as a conversation.', desc: 'We source options and present them to you with pros, cons, and honest pricing. You approve every selection before we commit.' },
          { num: '03', title: 'Clean hands-off.', desc: 'Final walkthrough means we walk every grout line, every caulk joint, every door clearance with you before we consider the project complete.' },
        ].map((p, i) => `<div data-reveal data-delay="${i + 1 as unknown as string}" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:2rem">
          <div style="font-size:.65rem;font-weight:800;letter-spacing:.12em;color:var(--bronze);margin-bottom:1rem">${p.num}</div>
          <h3 style="font-size:.95rem;font-weight:700;color:var(--charcoal);margin-bottom:.6rem">${esc(p.title)}</h3>
          <p style="font-size:.825rem;font-weight:400;color:var(--muted);line-height:1.75">${esc(p.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CERTIFICATIONS -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1100px;margin:0 auto">
      <div data-reveal style="margin-bottom:2.5rem">
        <div class="pLabel" style="margin-bottom:.75rem">Credentials</div>
        <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">What backs our work.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem">
        ${[
          { cert: 'NKBA Certified', body: 'National Kitchen & Bath Association', desc: 'The industry\'s only certification that tests bathroom design specifically. Every project lead on our team holds it.' },
          { cert: 'NARI Certified Remodeler', body: 'National Association of the Remodeling Industry', desc: 'Verifies business ethics, financial stability, and technical competence.' },
          { cert: 'EPA Lead-Safe Certified', body: 'Environmental Protection Agency', desc: 'Required by law for homes built before 1978. We carry it as a standard credential.' },
          { cert: 'Licensed General Contractor', body: `State of ${esc(biz.state || 'OR')}`, desc: 'Full GC license covering structural, plumbing, and electrical scope.' },
        ].map((c, i) => `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem" data-reveal data-delay="${i + 1 as unknown as string}">
          <div style="font-size:.95rem;font-weight:700;color:var(--charcoal);margin-bottom:.25rem">${esc(c.cert)}</div>
          <div style="font-size:.65rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--bronze);margin-bottom:.85rem">${esc(c.body)}</div>
          <p style="font-size:.8rem;font-weight:400;color:var(--muted);line-height:1.65">${esc(c.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--charcoal);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:580px;margin:0 auto" data-reveal>
      <h2 class="pH pH--light" style="font-size:clamp(1.5rem,3vw,2.25rem);margin-bottom:1rem">Ready to get a quote?</h2>
      <p style="font-size:.875rem;font-weight:400;color:rgba(255,255,255,.45);line-height:1.8;margin-bottom:2rem">Free consultation. Written estimate. No obligation.</p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
        <a href="${baseUrl}/contact" class="pBtnBronzeLg">Book a Consultation</a>
        <a href="${baseUrl}/gallery" style="display:inline-flex;align-items:center;border:1.5px solid rgba(255,255,255,.2);color:rgba(255,255,255,.7);font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.8rem 2rem;border-radius:4px;transition:border-color var(--ease)" onmouseover="this.style.borderColor='rgba(255,255,255,.5)'" onmouseout="this.style.borderColor='rgba(255,255,255,.2)'">View Gallery</a>
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
  return shell(
    `Contact — ${esc(biz.name)}`,
    `
${nav(biz, baseUrl, 'Contact')}
<main style="padding-top:68px">

  <!-- HERO -->
  <section style="background:var(--charcoal);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:700px;margin:0 auto" data-reveal>
      <div class="pLabel" style="color:rgba(146,112,74,.7);margin-bottom:1.25rem">Free Consultation</div>
      <a href="tel:${telLink(biz.phone)}" style="display:block;font-size:clamp(2.5rem,8vw,5rem);font-weight:800;color:#fff;line-height:1;margin-bottom:.75rem;transition:color .2s" onmouseover="this.style.color='var(--bronze)'" onmouseout="this.style.color='#fff'">${esc(phoneDisplay(biz))}</a>
      <p style="font-size:.875rem;font-weight:400;color:rgba(255,255,255,.45)">${esc(biz.hours || 'Mon-Fri 8am-6pm')} &mdash; No-pressure consultations, written estimates</p>
    </div>
  </section>

  <!-- FORM + INFO -->
  <section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start" class="pTwoCol">
      <div data-reveal>
        <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2rem);margin-bottom:1rem">Tell us about your bathroom.</h2>
        <p style="font-size:.875rem;font-weight:400;color:var(--muted);line-height:1.8;margin-bottom:2rem">Fill in the form and we will follow up within one business day to schedule your free consultation.</p>
        <form style="display:flex;flex-direction:column;gap:1.1rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.1rem">
            <div><label class="pLabel">First Name</label><input class="pInput" type="text" placeholder="Karen"></div>
            <div><label class="pLabel">Last Name</label><input class="pInput" type="text" placeholder="Henderson"></div>
          </div>
          <div><label class="pLabel">Phone</label><input class="pInput" type="tel" placeholder="(503) 555-0100"></div>
          <div><label class="pLabel">Email</label><input class="pInput" type="email" placeholder="you@example.com"></div>
          <div><label class="pLabel">Project Type</label>
            <select class="pInput"><option value="">Select...</option><option>Full Bathroom Remodel</option><option>Walk-In Shower Renovation</option><option>Vanity Installation</option><option>Soaking Tub Addition</option><option>Tile Work</option><option>Bathroom Addition</option><option>Other</option></select>
          </div>
          <div><label class="pLabel">Message (optional)</label><textarea class="pInput" rows="4" placeholder="Bathroom size, current state, timeline, rough budget..."></textarea></div>
          <button type="submit" class="pBtn" style="align-self:flex-start">Send Message</button>
        </form>
      </div>
      <div data-reveal data-delay="2">
        <h3 style="font-size:1rem;font-weight:700;color:var(--charcoal);margin-bottom:1.5rem">Our Office &amp; Service Area</h3>
        <div style="display:flex;flex-direction:column;gap:.9rem;margin-bottom:2rem">
          ${[
            ['Address', biz.address || cityState(biz)],
            ['Phone', `<a href="tel:${telLink(biz.phone)}" style="color:var(--bronze)">${esc(phoneDisplay(biz))}</a>`],
            ['Hours', biz.hours || 'Mon-Fri 8am-6pm'],
            ['Service Area', `${esc(cityState(biz))} and surrounding communities`],
          ].map(([k, v]) => `<div style="display:flex;gap:.75rem;font-size:.875rem;font-weight:400"><span style="font-weight:600;color:var(--charcoal);min-width:85px">${k}</span><span style="color:var(--muted)">${v}</span></div>`).join('')}
        </div>
        <div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">
          <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent('-122.8,45.4,-122.5,45.6')}&layer=mapnik" style="width:100%;height:260px;border:none" title="Service area map" loading="lazy"></iframe>
        </div>
        <div style="margin-top:1.5rem;background:var(--bg-alt);border-radius:var(--radius);padding:1.5rem">
          <h4 style="font-size:.875rem;font-weight:700;color:var(--charcoal);margin-bottom:.85rem">What the free consultation includes</h4>
          ${['Walkthrough of your bathroom', 'Discussion of your goals and timeline', 'Preliminary layout ideas', 'Written ballpark estimate, no charge'].map(item => `<div style="display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.5rem;font-size:.8rem;font-weight:400;color:var(--muted)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bronze)" stroke-width="2.5" style="flex-shrink:0;margin-top:2px"><polyline points="20 6 9 17 4 12"/></svg>${item}</div>`).join('')}
        </div>
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
    { name: biz.teamName || 'Alex Rivera', role: 'Lead Designer & Founder', photo: ph(0, biz) },
    { name: 'Jamie Park', role: 'Project Manager', photo: ph(1, biz) },
    { name: 'Morgan Chen', role: 'NKBA Certified Designer', photo: ph(2, biz) },
    { name: 'Taylor Brooks', role: 'Master Tile Installer', photo: ph(3, biz) },
  ];

  return shell(
    `Our Team — ${esc(biz.name)}`,
    `
${nav(biz, baseUrl, 'Team')}
<main style="padding-top:68px">

  <!-- HERO -->
  <section style="background:var(--bg-alt);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:680px;margin:0 auto" data-reveal>
      <div class="pLabel" style="margin-bottom:1rem">Our Team</div>
      <h1 class="pH" style="font-size:clamp(2rem,5vw,3.25rem);margin-bottom:1rem">The people who build the work.</h1>
      <p style="font-size:.9rem;font-weight:400;color:var(--muted);line-height:1.8">Every project is led by a certified designer who also manages the crew. No handoffs to a different team halfway through.</p>
    </div>
  </section>

  <!-- TEAM GRID -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.5rem">
      ${team.map((m, i) => `
      <div class="pTeamCard" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as unknown as string}">
        ${m.photo
          ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}">`
          : `<div style="width:100%;aspect-ratio:4/3;background:var(--bg-alt);display:flex;align-items:center;justify-content:center"><span style="font-size:2.5rem;font-weight:800;color:var(--bronze)">${esc(m.name[0] || 'T')}</span></div>`}
        <div class="pTeamBody">
          <div class="pTeamName">${esc(m.name)}</div>
          <div class="pTeamRole">${esc(m.role)}</div>
        </div>
      </div>`).join('')}
    </div>
  </section>

  <!-- VALUES -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1100px;margin:0 auto">
      <div data-reveal style="margin-bottom:2.5rem">
        <div class="pLabel" style="margin-bottom:.75rem">How We Work</div>
        <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Three things we expect from every person on the team.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden" class="pThreeCol">
        ${[
          { title: 'Own the result.', desc: 'Every person on a project is responsible for the final outcome, not just their phase. If something is wrong, they fix it.' },
          { title: 'Say what you see.', desc: 'If there is a problem under the tile or behind the wall, we tell the client before we proceed. No surprises at punch-list.' },
          { title: 'Leave it cleaner.', desc: 'Every evening, the site is cleaned, tools are staged, and the bathroom is left in a usable state where possible.' },
        ].map((v, i) => `<div style="padding:2rem;border-right:${i < 2 ? '1px solid var(--border)' : 'none'}" data-reveal data-delay="${i + 1 as unknown as string}">
          <div style="font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--bronze);margin-bottom:.85rem">0${i + 1}</div>
          <h3 style="font-size:.95rem;font-weight:700;color:var(--charcoal);margin-bottom:.6rem">${esc(v.title)}</h3>
          <p style="font-size:.8rem;font-weight:400;color:var(--muted);line-height:1.75">${esc(v.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--charcoal);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:540px;margin:0 auto" data-reveal>
      <h2 class="pH pH--light" style="font-size:clamp(1.5rem,3vw,2.25rem);margin-bottom:1rem">Talk to the team.</h2>
      <p style="font-size:.875rem;font-weight:400;color:rgba(255,255,255,.4);line-height:1.8;margin-bottom:2rem">Free consultation, in your bathroom. One hour and you will have a clear picture of what the project will cost.</p>
      <a href="${baseUrl}/contact" class="pBtnBronzeLg">Book a Consultation</a>
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
<main style="padding-top:68px">

  <!-- HERO -->
  <section style="background:var(--charcoal);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:700px;margin:0 auto" data-reveal>
      <div class="pLabel" style="color:rgba(146,112,74,.7);margin-bottom:1rem">Portfolio</div>
      <h1 class="pH pH--light" style="font-size:clamp(2rem,5vw,3.5rem)">Every project we have built.</h1>
      <p style="font-size:.875rem;font-weight:400;color:rgba(255,255,255,.4);margin-top:1rem;line-height:1.75">Photographed at handoff, not styled for a shoot.</p>
    </div>
  </section>

  <!-- GALLERY GRID -->
  <section style="background:var(--bg);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem" class="pThreeCol">
      ${imgs.map((img, i) => `<div class="pThumb" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as unknown as string}" style="aspect-ratio:${i % 4 === 0 ? '4/3' : '1/1'}"><img src="${img}" alt="Bathroom project ${i + 1}" loading="lazy"></div>`).join('')}
    </div>
  </section>

  <!-- BEFORE/AFTER -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto">
      <div data-reveal style="text-align:center;margin-bottom:2.5rem">
        <div class="pLabel" style="margin-bottom:.75rem">Transformations</div>
        <h2 class="pH" style="font-size:clamp(1.5rem,3vw,2.25rem)">Before &amp; After</h2>
        <p style="font-size:.8rem;font-weight:400;color:var(--muted);margin-top:.65rem">Drag the slider to compare</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem" class="pTwoCol">
        ${baSlider('https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80', ph(0, biz))}
        ${baSlider('https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80', ph(1, biz))}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--charcoal);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:560px;margin:0 auto" data-reveal>
      <h2 class="pH pH--light" style="font-size:clamp(1.5rem,3vw,2.25rem);margin-bottom:1rem">Want results like these?</h2>
      <p style="font-size:.875rem;font-weight:400;color:rgba(255,255,255,.4);margin-bottom:2rem;line-height:1.8">Free consultation. Written estimate. No pressure.</p>
      <a href="${baseUrl}/contact" class="pBtnBronzeLg">Get a Free Quote</a>
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
<main style="padding-top:68px">

  <!-- HERO -->
  <section style="background:var(--bg-alt);padding:clamp(4rem,8vw,6rem) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:700px;margin:0 auto" data-reveal>
      <div class="pLabel" style="margin-bottom:1rem">Client Reviews</div>
      <h1 class="pH" style="font-size:clamp(2rem,5vw,3.25rem);margin-bottom:.75rem">What our clients say.</h1>
      ${biz.rating ? `<div style="display:flex;align-items:center;justify-content:center;gap:.75rem"><span style="color:var(--bronze);font-size:1.05rem;letter-spacing:.06em">${'★'.repeat(Math.round(biz.rating))}</span><span style="font-size:1.75rem;font-weight:800;color:var(--charcoal)">${esc(String(biz.rating))}</span><span style="font-size:.85rem;font-weight:400;color:var(--muted)">${esc(String(biz.reviews || ''))} Google reviews</span></div>` : ''}
    </div>
  </section>

  <!-- REVIEWS GRID -->
  <section style="background:#fff;padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:1.5rem">
      ${reviews.map((r, i) => `
      <div style="border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as unknown as string}">
        <div style="color:var(--bronze);font-size:1rem;letter-spacing:.08em;margin-bottom:.85rem">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p style="font-size:.875rem;font-weight:400;color:var(--charcoal);line-height:1.75;margin-bottom:1.1rem">"${esc(r.text)}"</p>
        <div style="font-size:.8rem;font-weight:700;color:var(--charcoal)">${esc(r.name)}</div>
        <div style="font-size:.75rem;font-weight:400;color:var(--muted);margin-top:.2rem">${esc(r.svc)} &mdash; ${esc(r.city)}</div>
      </div>`).join('')}
    </div>
  </section>

  <!-- RATING BOX -->
  <section style="background:var(--bg-alt);padding:var(--sp) clamp(1.25rem,4vw,3rem)">
    <div style="max-width:560px;margin:0 auto;text-align:center" data-reveal>
      <div style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);padding:3rem 2rem">
        <div style="font-size:4.5rem;font-weight:800;color:var(--charcoal);line-height:1">${esc(String(biz.rating || '4.9'))}</div>
        <div style="color:var(--bronze);font-size:1.3rem;letter-spacing:.1em;margin:.5rem 0">${'★'.repeat(5)}</div>
        <div style="font-size:.875rem;font-weight:400;color:var(--muted);margin-bottom:1.5rem">Based on ${esc(String(biz.reviews || '200'))}+ Google reviews</div>
        <div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--charcoal)">NKBA Certified &middot; BBB A+ &middot; Licensed &amp; Insured</div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:var(--charcoal);padding:var(--sp) clamp(1.25rem,4vw,3rem);text-align:center">
    <div style="max-width:560px;margin:0 auto" data-reveal>
      <h2 class="pH pH--light" style="font-size:clamp(1.5rem,3vw,2.25rem);margin-bottom:1rem">Ready to be next?</h2>
      <p style="font-size:.875rem;font-weight:400;color:rgba(255,255,255,.4);line-height:1.8;margin-bottom:2rem">Free consultation, written estimate, no pressure. Most projects start within 3 to 6 weeks.</p>
      <a href="${baseUrl}/contact" class="pBtnBronzeLg">Book a Free Consultation</a>
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

export function buildBathroomRemodelV2AllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:         buildHome(biz, baseUrl),
    about:        buildAbout(biz, baseUrl),
    contact:      buildContact(biz, baseUrl),
    team:         buildTeam(biz, baseUrl),
    gallery:      buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
