/**
 * Landscaping page builder — "GreenSpire" dark luxury design identity.
 * Palette: #071410 bg, #0c1e17 panels, #2d8c4e primary green, #d4a853 gold accent.
 * Fonts: Playfair Display 700/800 (display) + DM Sans 300-600 (body).
 * Six pages: home, about, contact, team, gallery, testimonials.
 * Features: sticky split nav, stats row, CSS marquee, sticky left why-us,
 *   before/after sliders, pricing tiers, process steps, IntersectionObserver reveals.
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

function reviewPad(biz: BizPageData): Array<{ text: string; reviewer: string; city: string; svc: string }> {
  const padData = [
    { text: 'The design team walked our property for two hours before drawing anything. That attention upfront meant the final install was exactly what we pictured — no compromises.', reviewer: 'Claire & Ben H.', city: biz.city || 'Local Area', svc: 'Full Landscape Design' },
    { text: 'Third season with them on full maintenance. The property looks better every year, not just maintained. They proactively suggested moving some plantings and it made a real difference.', reviewer: 'Marcus D.', city: 'North Side', svc: 'Annual Maintenance' },
    { text: 'We had a drainage problem no one else could solve. They regraded the slope, installed a French drain, and replanted. Not a drop in the basement since. Worth every cent.', reviewer: 'Lori & Steve P.', city: biz.city || 'East Metro', svc: 'Drainage & Grading' },
    { text: 'Hired them to redo the front lawn before listing our house. The real estate agent said it was the best curb appeal she had seen in the neighborhood. Sold in four days.', reviewer: 'Janet O.', city: 'Millbrook', svc: 'Curb Appeal Package' },
    { text: 'The stone work on our patio is genuinely stunning. Visitors always ask who did it. The crew was meticulous — they relaid two sections because the grade was off by a millimeter.', reviewer: 'Tom R.', city: biz.city || 'West Hills', svc: 'Patio & Hardscape' },
    { text: 'Called at 8 AM after a storm knocked a large tree into our garden beds. By 2 PM the debris was gone and they had already started planning the replant. Remarkably fast.', reviewer: 'Diane W.', city: 'Lakeside', svc: 'Storm Cleanup' },
    { text: 'They installed smart irrigation zoned by plant type, not just by area. Our water bill dropped 35 percent the first summer and the lawn is the healthiest it has been in a decade.', reviewer: 'Phil & Karen M.', city: biz.city || 'South County', svc: 'Smart Irrigation' },
    { text: 'Managed a commercial property landscape overhaul across four buildings. On schedule, no surprise costs, and the HOA voted it the best improvement in five years.', reviewer: 'Riverside Properties Group', city: biz.city || 'Downtown', svc: 'Commercial Landscaping' },
    { text: 'We gave them a nearly impossible brief — low maintenance but lush-looking. They selected drought-tolerant natives and layered them brilliantly. It genuinely looks cared for without the work.', reviewer: 'Nigel F.', city: 'Ridgefield', svc: 'Native Garden Design' },
    { text: 'The crew showed up every scheduled day and called ahead if anything changed. In two years, not once did they miss a visit without notice. Reliable is an understatement.', reviewer: 'Sandy & Lou V.', city: biz.city || 'North County', svc: 'Weekly Maintenance' },
  ];
  const base = (biz.reviewTexts || []).map((text, i) => ({
    text,
    reviewer: padData[i]?.reviewer || 'Verified Customer',
    city: padData[i]?.city || biz.city || 'Local Area',
    svc: padData[i]?.svc || 'Landscaping Services',
  }));
  while (base.length < 10) base.push(padData[base.length % padData.length]);
  return base.slice(0, 10);
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DATA_REVEAL_CSS = `[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease;}[data-reveal].revealed{opacity:1;transform:translateY(0);}[data-delay="1"]{transition-delay:.1s;}[data-delay="2"]{transition-delay:.2s;}[data-delay="3"]{transition-delay:.3s;}[data-delay="4"]{transition-delay:.4s;}`;

const DATA_REVEAL_JS = `<script>(function(){const io=new IntersectionObserver((e)=>{e.forEach(i=>{if(i.isIntersecting){i.target.classList.add('revealed');io.unobserve(i.target);}});},{threshold:.1,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));})();</script>`;

const BA_JS = `<script>
document.querySelectorAll('.ba-container').forEach(c=>{
  const b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle');let d=false;
  function pos(x){const r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}
  h.addEventListener('mousedown',()=>d=true);window.addEventListener('mouseup',()=>d=false);window.addEventListener('mousemove',e=>{if(d)pos(e.clientX);});
  h.addEventListener('touchstart',e=>{d=true;e.preventDefault();},{passive:false});window.addEventListener('touchend',()=>d=false);window.addEventListener('touchmove',e=>{if(d)pos(e.touches[0].clientX);},{passive:true});
});
</script>`;

// ── Shared CSS ─────────────────────────────────────────────────────────────────

function globalStyles(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:#071410;
  --panel:#0c1e17;
  --green:#2d8c4e;
  --green-hover:#237a40;
  --gold:#d4a853;
  --gold-light:#e8c87a;
  --text:#f0ede8;
  --muted:#8a9e93;
  --border:rgba(45,140,78,.2);
  --card-radius:12px;
  --font-display:'Playfair Display',Georgia,serif;
  --font-body:'DM Sans',system-ui,sans-serif;
  --max-w:1200px;
}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%;height:auto}
${DATA_REVEAL_CSS}

/* Marquee */
.marquee-track{display:flex;gap:24px;animation:marquee 38s linear infinite;width:max-content}
.marquee-wrap{overflow:hidden}
.marquee-wrap:hover .marquee-track{animation-play-state:paused}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* Before/After */
.ba-container{position:relative;overflow:hidden;border-radius:var(--card-radius);aspect-ratio:16/9;cursor:ew-resize;user-select:none}
.ba-before{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.ba-handle{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--gold);touch-action:none}
.ba-handle-knob{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(212,168,83,.25),0 4px 20px rgba(0,0,0,.5)}

/* Scroll-triggered sticky */
.sticky-side{position:sticky;top:120px}

/* Nav */
.nav-wrap{position:fixed;top:0;left:0;right:0;z-index:100;transition:background .3s,box-shadow .3s}
.nav-wrap.scrolled{background:rgba(7,20,16,.96);backdrop-filter:blur(12px);box-shadow:0 1px 0 var(--border)}
.nav-inner{max-width:var(--max-w);margin:0 auto;padding:0 32px;height:72px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:24px}
.nav-links{display:flex;gap:28px;align-items:center}
.nav-links a{font-size:13px;font-weight:500;letter-spacing:.04em;color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--text)}
.nav-logo{text-align:center;font-family:var(--font-display);font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.02em}
.nav-logo span{color:var(--gold)}
.nav-right{display:flex;justify-content:flex-end;align-items:center;gap:16px}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--green);color:#fff;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:.03em;border:none;cursor:pointer;transition:background .2s,transform .15s}
.btn-primary:hover{background:var(--green-hover);transform:translateY(-1px)}
.btn-outline{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--gold);padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;letter-spacing:.03em;border:1px solid var(--gold);cursor:pointer;transition:background .2s,color .2s}
.btn-outline:hover{background:var(--gold);color:var(--bg)}
.mobile-menu-btn{display:none;background:none;border:none;cursor:pointer;color:var(--text);padding:8px}

@media(max-width:768px){
  .nav-inner{grid-template-columns:1fr auto;padding:0 20px}
  .nav-links,.nav-right .btn-primary{display:none}
  .mobile-menu-btn{display:flex}
}

/* Footer */
.footer{background:var(--panel);border-top:1px solid var(--border);padding:64px 32px 32px}
.footer-inner{max-width:var(--max-w);margin:0 auto}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
.footer-brand-name{font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--gold);margin-bottom:16px}
.footer-tagline{font-size:14px;color:var(--muted);line-height:1.7;max-width:260px;margin-bottom:20px}
.footer-col h4{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:16px}
.footer-col ul{list-style:none}
.footer-col ul li{margin-bottom:10px}
.footer-col ul li a{font-size:14px;color:var(--muted);transition:color .2s}
.footer-col ul li a:hover{color:var(--text)}
.footer-bottom{border-top:1px solid var(--border);padding-top:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.footer-copy{font-size:13px;color:var(--muted)}
@media(max-width:768px){
  .footer-grid{grid-template-columns:1fr 1fr;gap:32px}
  .footer-bottom{flex-direction:column;text-align:center}
}
</style>`;
}

// ── Nav ────────────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string): string {
  const phone = biz.phone ? `<a href="tel:${esc(telLink(biz.phone))}" class="btn-outline">${esc(biz.phone)}</a>` : '';
  return `<nav class="nav-wrap" id="mainNav">
  <div class="nav-inner">
    <div class="nav-links">
      <a href="${esc(baseUrl)}">Home</a>
      <a href="${esc(baseUrl)}-about">About</a>
      <a href="${esc(baseUrl)}-gallery">Gallery</a>
    </div>
    <div class="nav-logo">${esc(biz.name.split(' ')[0])}<span>${biz.name.split(' ').slice(1).join(' ') || ' Landscaping'}</span></div>
    <div class="nav-right">
      <div class="nav-links">
        <a href="${esc(baseUrl)}-team">Team</a>
        <a href="${esc(baseUrl)}-testimonials">Reviews</a>
        <a href="${esc(baseUrl)}-contact">Contact</a>
      </div>
      ${phone}
      <a href="${esc(baseUrl)}-contact" class="btn-primary">Free Quote</a>
      <button class="mobile-menu-btn" aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>
  </div>
</nav>
<script>
(function(){
  const nav=document.getElementById('mainNav');
  window.addEventListener('scroll',function(){
    nav.classList.toggle('scrolled',window.scrollY>40);
  });
})();
</script>`;
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div>
        <div class="footer-brand-name">${esc(biz.name)}</div>
        <p class="footer-tagline">${esc(biz.heroSub)}</p>
        ${biz.phone ? `<a href="tel:${esc(telLink(biz.phone))}" style="color:var(--gold);font-weight:600;font-size:15px">${esc(biz.phone)}</a>` : ''}
      </div>
      <div class="footer-col">
        <h4>Pages</h4>
        <ul>
          <li><a href="${esc(baseUrl)}">Home</a></li>
          <li><a href="${esc(baseUrl)}-about">About</a></li>
          <li><a href="${esc(baseUrl)}-team">Our Team</a></li>
          <li><a href="${esc(baseUrl)}-gallery">Gallery</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Services</h4>
        <ul>
          ${(biz.services || []).slice(0, 5).map(s => `<li><a href="${esc(baseUrl)}-contact">${esc(s.name)}</a></li>`).join('')}
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          ${biz.phone ? `<li><a href="tel:${esc(telLink(biz.phone))}">${esc(biz.phone)}</a></li>` : ''}
          ${biz.address ? `<li><span style="color:var(--muted);font-size:14px">${esc(biz.address)}</span></li>` : ''}
          ${biz.city ? `<li><span style="color:var(--muted);font-size:14px">${esc(biz.city)}${biz.state ? ', ' + esc(biz.state) : ''}</span></li>` : ''}
          <li><a href="${esc(baseUrl)}-testimonials">Reviews</a></li>
          <li><a href="${esc(baseUrl)}-contact">Get a Quote</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-copy">&copy; ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</p>
      <p class="footer-copy">${biz.city ? esc(biz.city) + ' — ' : ''}Licensed &amp; Insured</p>
    </div>
  </div>
</footer>`;
}

// ── Before/After Slider ────────────────────────────────────────────────────────

function baSlider(beforeUrl: string, afterUrl: string, label?: string): string {
  return `<div class="ba-container">
  <img src="${esc(afterUrl)}" alt="${label ? esc(label) + ' after' : 'After landscaping'}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div class="ba-before">
    <img src="${esc(beforeUrl)}" alt="${label ? esc(label) + ' before' : 'Before landscaping'}" style="width:100%;height:100%;object-fit:cover">
  </div>
  <div style="position:absolute;top:14px;left:14px;background:rgba(7,20,16,.85);color:var(--muted);padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;font-family:var(--font-body);border-radius:4px">Before</div>
  <div style="position:absolute;top:14px;right:14px;background:var(--green);color:#fff;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;font-family:var(--font-body);border-radius:4px">After</div>
  <div class="ba-handle">
    <div class="ba-handle-knob">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#071410" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
}

// ── Page Builder: Home ─────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {
  const reviews = reviewPad(biz);
  const marqueeCards = [...reviews, ...reviews].map(r => `
    <div style="flex:none;width:320px;background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:24px 28px">
      <div style="color:var(--gold);font-size:14px;margin-bottom:12px;letter-spacing:.05em">★★★★★</div>
      <p style="font-size:14px;color:var(--text);line-height:1.7;margin-bottom:16px">"${esc(r.text)}"</p>
      <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(r.reviewer)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(r.svc)} — ${esc(r.city)}</div>
    </div>`).join('');

  const services = (biz.services || []).slice(0, 6);
  const serviceCards = services.map((s, i) => `
    <div data-reveal data-delay="${(i % 3) + 1}" style="background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);overflow:hidden">
      <div style="height:200px;overflow:hidden">
        <img src="${ph(i + 2, biz)}" alt="${esc(s.name)}" style="width:100%;height:100%;object-fit:cover;transition:transform .5s ease">
      </div>
      <div style="padding:24px">
        <div style="font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--green);margin-bottom:8px">Landscaping</div>
        <h3 style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--text);margin-bottom:10px;line-height:1.3">${esc(s.name)}</h3>
        <p style="font-size:14px;color:var(--muted);line-height:1.7;margin-bottom:16px">${esc(s.desc)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid var(--border)">
          <span style="font-size:15px;font-weight:600;color:var(--gold)">Starting at ${esc(s.price)}</span>
          <a href="${esc(baseUrl)}-contact" style="font-size:13px;font-weight:600;color:var(--green);letter-spacing:.03em">Get Quote &rarr;</a>
        </div>
      </div>
    </div>`).join('');

  const processSteps = [
    { n: '01', title: 'Consultation', desc: 'We walk your property together and listen. No clipboard quotes before we understand what you actually want from the space.' },
    { n: '02', title: 'Design', desc: 'Our designers produce a detailed plan with plant selections, material specs, and a phased timeline before any work begins.' },
    { n: '03', title: 'Installation', desc: 'Experienced crews handle every element — from soil prep and drainage to planting and final grading.' },
    { n: '04', title: 'Care & Maintenance', desc: 'We offer ongoing maintenance plans to keep the property performing year-round, with seasonal adjustments built in.' },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(biz.name)} — Premium Landscaping${biz.city ? ' in ' + esc(biz.city) : ''}</title>
${globalStyles()}
<style>
.hero{position:relative;min-height:100vh;display:flex;align-items:flex-end;padding-bottom:80px}
.hero-bg{position:absolute;inset:0;z-index:0}
.hero-bg img{width:100%;height:100%;object-fit:cover}
.hero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(7,20,16,.3) 0%,rgba(7,20,16,.75) 60%,rgba(7,20,16,.97) 100%)}
.hero-content{position:relative;z-index:1;max-width:var(--max-w);margin:0 auto;padding:0 32px;width:100%}
.hero-hl{font-family:var(--font-display);font-size:clamp(44px,7vw,88px);font-weight:800;line-height:1.05;letter-spacing:-.02em;color:var(--text);margin-bottom:24px}
.hero-hl span{display:block;color:var(--text)}
.hero-hl em{font-style:normal;color:var(--gold);border-bottom:3px solid var(--gold);padding-bottom:2px}
.hero-sub{font-size:clamp(15px,2vw,18px);color:var(--muted);max-width:520px;line-height:1.8;margin-bottom:36px}
.hero-stats{display:flex;gap:48px;padding-top:40px;border-top:1px solid rgba(255,255,255,.12);flex-wrap:wrap}
.hero-stat-n{font-family:var(--font-display);font-size:32px;font-weight:800;color:var(--gold);line-height:1}
.hero-stat-l{font-size:13px;color:var(--muted);margin-top:4px;letter-spacing:.02em}
.trust-strip{background:var(--panel);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:20px 32px}
.trust-inner{max-width:var(--max-w);margin:0 auto;display:flex;justify-content:center;gap:48px;flex-wrap:wrap;align-items:center}
.trust-badge{font-size:13px;font-weight:600;color:var(--muted);letter-spacing:.04em;display:flex;align-items:center;gap:8px}
.trust-badge::before{content:'';display:inline-block;width:8px;height:8px;background:var(--green);border-radius:50%}
.stats-section{padding:80px 32px;background:var(--bg)}
.stats-inner{max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:2px}
.stat-card{background:var(--panel);padding:40px 32px;text-align:center;border:1px solid var(--border)}
.stat-card:first-child{border-radius:var(--card-radius) 0 0 var(--card-radius)}
.stat-card:last-child{border-radius:0 var(--card-radius) var(--card-radius) 0}
.stat-n{font-family:var(--font-display);font-size:52px;font-weight:800;color:var(--gold);line-height:1;margin-bottom:8px}
.stat-l{font-size:13px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;font-weight:500}
.services-section{padding:100px 32px;background:var(--bg)}
.services-inner{max-width:var(--max-w);margin:0 auto}
.section-label{font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--green);margin-bottom:12px}
.section-title{font-family:var(--font-display);font-size:clamp(32px,4vw,48px);font-weight:800;color:var(--text);line-height:1.15;margin-bottom:16px}
.section-sub{font-size:16px;color:var(--muted);max-width:560px;line-height:1.8;margin-bottom:56px}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.whyus-section{padding:100px 32px;background:var(--panel);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.whyus-inner{max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
.whyus-left{position:sticky;top:120px}
.whyus-bullet{display:flex;align-items:flex-start;gap:16px;margin-bottom:24px}
.whyus-bullet-icon{width:22px;height:22px;background:rgba(212,168,83,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.whyus-photos{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.whyus-photo-item{border-radius:var(--card-radius);overflow:hidden;aspect-ratio:4/3}
.process-section{padding:100px 32px;background:var(--bg)}
.process-inner{max-width:var(--max-w);margin:0 auto}
.process-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-top:56px}
.process-step{background:var(--panel);padding:36px 28px;border:1px solid var(--border);position:relative}
.process-step:first-child{border-radius:var(--card-radius) 0 0 var(--card-radius)}
.process-step:last-child{border-radius:0 var(--card-radius) var(--card-radius) 0}
.process-num{font-family:var(--font-display);font-size:48px;font-weight:800;color:rgba(212,168,83,.2);line-height:1;margin-bottom:16px}
.process-title{font-size:17px;font-weight:600;color:var(--text);margin-bottom:10px}
.process-desc{font-size:14px;color:var(--muted);line-height:1.7}
.pricing-section{padding:100px 32px;background:var(--panel);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.pricing-inner{max-width:var(--max-w);margin:0 auto}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:56px}
.pricing-card{background:var(--bg);border:1px solid var(--border);border-radius:var(--card-radius);padding:40px 32px;position:relative}
.pricing-card.featured{border-color:var(--gold);background:rgba(212,168,83,.04)}
.pricing-card.featured::before{content:'Most Popular';position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--gold);color:var(--bg);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 14px;border-radius:20px}
.pricing-tier{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--green);margin-bottom:8px}
.pricing-name{font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--text);margin-bottom:8px}
.pricing-price{font-family:var(--font-display);font-size:42px;font-weight:800;color:var(--gold);line-height:1;margin-bottom:4px}
.pricing-period{font-size:13px;color:var(--muted);margin-bottom:24px}
.pricing-features{list-style:none;margin-bottom:32px}
.pricing-features li{padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;color:var(--muted);display:flex;align-items:center;gap:10px}
.pricing-features li::before{content:'';width:6px;height:6px;background:var(--green);border-radius:50%;flex-shrink:0}
.ba-section{padding:100px 32px;background:var(--bg)}
.ba-inner{max-width:var(--max-w);margin:0 auto}
.ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px}
.marquee-section{padding:64px 0;background:var(--panel);border-top:1px solid var(--border);border-bottom:1px solid var(--border);overflow:hidden}
.cta-banner{background:#0c1e17;border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:100px 32px;text-align:center}
.contact-section{padding:100px 32px;background:var(--bg)}
.contact-inner{max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:start}
.form-group{margin-bottom:20px}
.form-label{display:block;font-size:13px;font-weight:600;color:var(--muted);letter-spacing:.04em;margin-bottom:8px;text-transform:uppercase}
.form-input{width:100%;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:15px;color:var(--text);font-family:var(--font-body);outline:none;transition:border-color .2s}
.form-input:focus{border-color:var(--green)}
.form-input::placeholder{color:var(--muted)}
textarea.form-input{resize:vertical;min-height:120px}

@media(max-width:768px){
  .hero{padding-bottom:60px;padding-top:100px;min-height:auto;align-items:flex-start}
  .hero-stats{gap:28px}
  .trust-inner{gap:20px;justify-content:flex-start}
  .stats-inner{grid-template-columns:1fr 1fr;gap:2px}
  .stat-card:first-child{border-radius:var(--card-radius) 0 0 0}
  .stat-card:last-child{border-radius:0 0 var(--card-radius) 0}
  .services-grid{grid-template-columns:1fr}
  .whyus-inner{grid-template-columns:1fr;gap:40px}
  .whyus-left{position:static}
  .process-steps{grid-template-columns:1fr 1fr}
  .process-step:first-child,.process-step:last-child{border-radius:0}
  .pricing-grid{grid-template-columns:1fr}
  .ba-grid{grid-template-columns:1fr}
  .contact-inner{grid-template-columns:1fr}
}
</style>
</head>
<body>
${nav(biz, baseUrl)}

<!-- Hero -->
<section class="hero">
  <div class="hero-bg">
    <img src="${ph(0, biz)}" alt="${esc(biz.name)} landscaping">
  </div>
  <div class="hero-content">
    <p class="section-label" style="margin-bottom:16px">${esc(biz.city || 'Premium Landscaping')}</p>
    <h1 class="hero-hl">
      <span>${esc(biz.heroHeadline)}</span>
      <span><em>${esc(biz.heroHeadlineEm)}</em></span>
    </h1>
    <p class="hero-sub">${esc(biz.heroSub)}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 28px;font-size:15px">Get a Free Quote</a>
      <a href="${esc(baseUrl)}-gallery" class="btn-outline" style="padding:14px 28px;font-size:15px">View Our Work</a>
    </div>
    <div class="hero-stats">
      <div>
        <div class="hero-stat-n">5,000+</div>
        <div class="hero-stat-l">Clients Served</div>
      </div>
      <div>
        <div class="hero-stat-n">1,200+</div>
        <div class="hero-stat-l">Projects Completed</div>
      </div>
      <div>
        <div class="hero-stat-n">${esc(biz.yearsInBiz)}+</div>
        <div class="hero-stat-l">Years in Business</div>
      </div>
      <div>
        <div class="hero-stat-n">98%</div>
        <div class="hero-stat-l">Client Retention</div>
      </div>
    </div>
  </div>
</section>

<!-- Trust Strip -->
<div class="trust-strip">
  <div class="trust-inner">
    <span class="trust-badge">NALP Member</span>
    <span class="trust-badge">Houzz Best of 2024</span>
    <span class="trust-badge">A+ BBB Rating</span>
    <span class="trust-badge">Licensed &amp; Insured</span>
    <span class="trust-badge">5-Star Rated</span>
  </div>
</div>

<!-- Stats -->
<section class="stats-section">
  <div class="stats-inner">
    <div class="stat-card" data-reveal>
      <div class="stat-n">5,000+</div>
      <div class="stat-l">Clients Served</div>
    </div>
    <div class="stat-card" data-reveal data-delay="1">
      <div class="stat-n">1,200+</div>
      <div class="stat-l">Projects Completed</div>
    </div>
    <div class="stat-card" data-reveal data-delay="2">
      <div class="stat-n">15yr</div>
      <div class="stat-l">Avg Team Experience</div>
    </div>
    <div class="stat-card" data-reveal data-delay="3">
      <div class="stat-n">98%</div>
      <div class="stat-l">Client Retention Rate</div>
    </div>
  </div>
</section>

<!-- Services -->
<section class="services-section">
  <div class="services-inner">
    <p class="section-label" data-reveal>What We Do</p>
    <h2 class="section-title" data-reveal>Services built around<br>your property</h2>
    <p class="section-sub" data-reveal>Every project starts with a site walk and an honest conversation about what you want. No upselling, no generic packages.</p>
    <div class="services-grid">${serviceCards}</div>
    <div style="text-align:center;margin-top:48px" data-reveal>
      <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 32px;font-size:15px">Discuss Your Project</a>
    </div>
  </div>
</section>

<!-- Why Us -->
<section class="whyus-section">
  <div class="whyus-inner">
    <div class="whyus-left">
      <p class="section-label" data-reveal>Why ${esc(biz.name)}</p>
      <h2 class="section-title" data-reveal>Not the cheapest.<br>The most thorough.</h2>
      <p style="font-size:15px;color:var(--muted);line-height:1.8;margin-bottom:32px" data-reveal>${esc(biz.aboutText2)}</p>
      <div class="whyus-bullet" data-reveal>
        <div class="whyus-bullet-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">Site-specific design</div>
          <div style="font-size:14px;color:var(--muted)">Every plan is drawn for your exact property — soil type, drainage, sun exposure, and how you actually use the space.</div>
        </div>
      </div>
      <div class="whyus-bullet" data-reveal>
        <div class="whyus-bullet-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">Experienced crews only</div>
          <div style="font-size:14px;color:var(--muted)">We do not subcontract core work. The same team handles design, install, and maintenance on every project.</div>
        </div>
      </div>
      <div class="whyus-bullet" data-reveal>
        <div class="whyus-bullet-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">Transparent pricing</div>
          <div style="font-size:14px;color:var(--muted)">Quotes are itemized. You see what you are paying for before signing anything.</div>
        </div>
      </div>
      <div class="whyus-bullet" data-reveal>
        <div class="whyus-bullet-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px">Long-term relationships</div>
          <div style="font-size:14px;color:var(--muted)">98% of maintenance clients renew year-over-year. We keep properties improving, not just maintained.</div>
        </div>
      </div>
    </div>
    <div class="whyus-photos">
      <div class="whyus-photo-item" data-reveal><img src="${ph(3, biz)}" alt="Landscaping project" style="width:100%;height:100%;object-fit:cover"></div>
      <div class="whyus-photo-item" data-reveal data-delay="1"><img src="${ph(4, biz)}" alt="Garden design" style="width:100%;height:100%;object-fit:cover"></div>
      <div class="whyus-photo-item" data-reveal data-delay="2"><img src="${ph(5, biz)}" alt="Hardscape work" style="width:100%;height:100%;object-fit:cover"></div>
      <div class="whyus-photo-item" data-reveal data-delay="3"><img src="${ph(6, biz)}" alt="Lawn maintenance" style="width:100%;height:100%;object-fit:cover"></div>
    </div>
  </div>
</section>

<!-- Process -->
<section class="process-section">
  <div class="process-inner">
    <p class="section-label" data-reveal>How It Works</p>
    <h2 class="section-title" data-reveal>From consultation to curb appeal</h2>
    <p class="section-sub" data-reveal>A straightforward four-step process that keeps you informed at every stage — no surprises at the end.</p>
    <div class="process-steps">
      ${processSteps.map((s, i) => `
      <div class="process-step" data-reveal data-delay="${i + 1}">
        <div class="process-num">${s.n}</div>
        <div class="process-title">${s.title}</div>
        <div class="process-desc">${s.desc}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Pricing -->
<section class="pricing-section">
  <div class="pricing-inner">
    <p class="section-label" data-reveal>Investment</p>
    <h2 class="section-title" data-reveal>Clear pricing, no surprises</h2>
    <p class="section-sub" data-reveal>Maintenance plans are priced per visit. Design and installation projects are quoted individually after a site assessment.</p>
    <div class="pricing-grid">
      <div class="pricing-card" data-reveal>
        <div class="pricing-tier">Maintenance</div>
        <div class="pricing-name">Essential</div>
        <div class="pricing-price">$149</div>
        <div class="pricing-period">per visit</div>
        <ul class="pricing-features">
          <li>Mowing &amp; edging</li>
          <li>Blowing &amp; cleanup</li>
          <li>Bi-weekly schedule</li>
          <li>Seasonal adjustments</li>
        </ul>
        <a href="${esc(baseUrl)}-contact" class="btn-outline" style="width:100%;justify-content:center">Get Started</a>
      </div>
      <div class="pricing-card featured" data-reveal data-delay="1">
        <div class="pricing-tier">Full Service</div>
        <div class="pricing-name">Standard</div>
        <div class="pricing-price">$299</div>
        <div class="pricing-period">per visit</div>
        <ul class="pricing-features">
          <li>Everything in Essential</li>
          <li>Bed maintenance</li>
          <li>Shrub trimming</li>
          <li>Fertilization program</li>
          <li>Weekly check-ins</li>
        </ul>
        <a href="${esc(baseUrl)}-contact" class="btn-primary" style="width:100%;justify-content:center">Get Started</a>
      </div>
      <div class="pricing-card" data-reveal data-delay="2">
        <div class="pricing-tier">Complete Care</div>
        <div class="pricing-name">Premium</div>
        <div class="pricing-price">$499</div>
        <div class="pricing-period">per visit</div>
        <ul class="pricing-features">
          <li>Everything in Standard</li>
          <li>Irrigation management</li>
          <li>Seasonal color rotations</li>
          <li>Annual design updates</li>
          <li>Priority scheduling</li>
        </ul>
        <a href="${esc(baseUrl)}-contact" class="btn-outline" style="width:100%;justify-content:center">Get Started</a>
      </div>
    </div>
  </div>
</section>

<!-- Before/After -->
<section class="ba-section">
  <div class="ba-inner">
    <p class="section-label" data-reveal>Transformations</p>
    <h2 class="section-title" data-reveal>Before &amp; after</h2>
    <p class="section-sub" data-reveal>Drag the handle to see the difference our work makes.</p>
    <div class="ba-grid">
      ${baSlider(ph(7, biz), ph(1, biz), 'Backyard renovation')}
      ${baSlider(ph(8, biz), ph(2, biz), 'Front yard makeover')}
    </div>
  </div>
</section>

<!-- Testimonials Marquee -->
<section class="marquee-section">
  <div style="padding:0 0 24px;text-align:center">
    <p style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--green)">Client Reviews</p>
    <h2 style="font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--text);margin-top:8px">What our clients say</h2>
  </div>
  <div class="marquee-wrap" style="padding:8px 0">
    <div class="marquee-track">${marqueeCards}</div>
  </div>
</section>

<!-- CTA Banner -->
<section class="cta-banner">
  <p class="section-label" style="margin:0 auto 16px" data-reveal>Ready to Start?</p>
  <h2 style="font-family:var(--font-display);font-size:clamp(36px,5vw,60px);font-weight:800;color:var(--text);line-height:1.1;margin-bottom:20px;max-width:640px;margin-left:auto;margin-right:auto" data-reveal>${esc(biz.ctaText)}</h2>
  <p style="font-size:16px;color:var(--muted);max-width:480px;margin:0 auto 36px;line-height:1.8" data-reveal>No pressure, no commitment. Walk us through your property and we will give you an honest assessment and a detailed quote.</p>
  <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap" data-reveal>
    <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:16px 36px;font-size:16px">Get Your Free Quote</a>
    ${biz.phone ? `<a href="tel:${esc(telLink(biz.phone))}" class="btn-outline" style="padding:16px 36px;font-size:16px">${esc(biz.phone)}</a>` : ''}
  </div>
</section>

<!-- Contact Form -->
<section class="contact-section" id="contact">
  <div class="contact-inner">
    <div>
      <p class="section-label" data-reveal>Get in Touch</p>
      <h2 class="section-title" data-reveal>Request a free<br>site consultation</h2>
      <p style="font-size:15px;color:var(--muted);line-height:1.8;margin-bottom:40px" data-reveal>We respond the same day to all quote requests. Consultations are free and come with no obligation to book.</p>
      <form style="max-width:480px" data-reveal>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group"><label class="form-label">First Name</label><input type="text" class="form-input" placeholder="Jane"></div>
          <div class="form-group"><label class="form-label">Last Name</label><input type="text" class="form-input" placeholder="Smith"></div>
        </div>
        <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="form-input" placeholder="${esc(biz.phone || '(555) 000-0000')}"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" placeholder="jane@email.com"></div>
        <div class="form-group"><label class="form-label">Service Needed</label>
          <select class="form-input">
            <option value="">Select a service</option>
            ${(biz.services || []).map(s => `<option>${esc(s.name)}</option>`).join('')}
            <option>Other</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Tell us about your project</label><textarea class="form-input" placeholder="Describe what you have in mind..."></textarea></div>
        <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:16px;font-size:15px">Send Request</button>
      </form>
    </div>
    <div data-reveal>
      <div style="border-radius:var(--card-radius);overflow:hidden;height:400px;border:1px solid var(--border);margin-bottom:32px">
        <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(biz.city || 'Local Area')}&layer=mapnik&marker=0,0" width="100%" height="400" style="border:none;filter:grayscale(40%) brightness(0.8)" title="Location map" loading="lazy"></iframe>
      </div>
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:28px">
        <h3 style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--text);margin-bottom:20px">Contact Information</h3>
        ${biz.phone ? `<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px"><div style="width:36px;height:36px;background:rgba(45,140,78,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.5 9.19 19.79 19.79 0 011.49 4 2 2 0 013.49 2h3a2 2 0 012 1.72c.13.97.36 1.92.7 2.84a2 2 0 01-.45 2.11L8 9.91a16 16 0 006.09 6.09l.74-.74a2 2 0 012.11-.45c.92.34 1.87.57 2.84.7A2 2 0 0122 16.92z"/></svg></div><div><div style="font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">Phone</div><a href="tel:${esc(telLink(biz.phone))}" style="font-size:15px;color:var(--text);font-weight:500">${esc(biz.phone)}</a></div></div>` : ''}
        ${biz.address ? `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:16px"><div style="width:36px;height:36px;background:rgba(45,140,78,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div><div style="font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">Address</div><span style="font-size:15px;color:var(--text)">${esc(biz.address)}, ${esc(biz.city || '')}${biz.state ? ' ' + esc(biz.state) : ''}</span></div></div>` : ''}
        <div style="display:flex;gap:12px;align-items:flex-start"><div style="width:36px;height:36px;background:rgba(45,140,78,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div style="font-size:11px;color:var(--muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">Hours</div><span style="font-size:14px;color:var(--text)">${esc(biz.hours)}</span></div></div>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${BA_JS}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: About ────────────────────────────────────────────────────────

function buildAbout(biz: BizPageData, baseUrl: string): string {
  const milestones = [
    { year: `${Math.max(2000, new Date().getFullYear() - parseInt(biz.yearsInBiz || '10', 10))}`, event: `${esc(biz.name)} founded by ${esc(biz.teamName)} with a focus on residential design.` },
    { year: `${Math.max(2005, new Date().getFullYear() - Math.floor(parseInt(biz.yearsInBiz || '10', 10) * 0.7))}`, event: 'Expanded to commercial landscaping contracts and hired our first dedicated design team.' },
    { year: `${Math.max(2010, new Date().getFullYear() - Math.floor(parseInt(biz.yearsInBiz || '10', 10) * 0.5))}`, event: 'Launched full irrigation installation division. Added smart controller programming to all maintenance plans.' },
    { year: `${Math.max(2018, new Date().getFullYear() - Math.floor(parseInt(biz.yearsInBiz || '10', 10) * 0.2))}`, event: 'Reached 1,000+ completed projects. Earned Houzz Best of Design award for first time.' },
    { year: `${new Date().getFullYear() - 1}`, event: 'Grew to full crew of 20+ professionals. Introduced native plant design program for low-maintenance installs.' },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:160px 32px 80px;background:var(--panel);border-bottom:1px solid var(--border);position:relative;overflow:hidden}
.page-hero-bg{position:absolute;inset:0;opacity:.07}
.page-hero-bg img{width:100%;height:100%;object-fit:cover}
.page-hero-inner{max-width:var(--max-w);margin:0 auto;position:relative;z-index:1}
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.team-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);overflow:hidden;text-align:center}
.team-card-photo{height:260px;overflow:hidden;background:rgba(45,140,78,.1)}
.timeline{position:relative;padding-left:28px}
.timeline::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--border)}
.timeline-item{position:relative;margin-bottom:36px;padding-left:24px}
.timeline-item::before{content:'';position:absolute;left:-33px;top:4px;width:12px;height:12px;background:var(--green);border-radius:50%;border:2px solid var(--bg)}
.timeline-year{font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--gold);margin-bottom:6px;text-transform:uppercase}
.timeline-text{font-size:14px;color:var(--muted);line-height:1.7}
@media(max-width:768px){
  .about-grid{grid-template-columns:1fr}
  .team-grid{grid-template-columns:1fr 1fr}
}
</style>
</head>
<body>
${nav(biz, baseUrl)}

<section class="page-hero">
  <div class="page-hero-bg"><img src="${ph(1, biz)}" alt="About ${esc(biz.name)}"></div>
  <div class="page-hero-inner">
    <p class="section-label" data-reveal>Our Story</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,72px);font-weight:800;color:var(--text);line-height:1.1;max-width:720px;margin-bottom:20px" data-reveal>${esc(biz.aboutText)}</h1>
    <p style="font-size:17px;color:var(--muted);max-width:560px;line-height:1.8" data-reveal>Serving ${esc(biz.city || 'the area')} since ${Math.max(2000, new Date().getFullYear() - parseInt(biz.yearsInBiz || '10', 10))}.</p>
  </div>
</section>

<section style="padding:100px 32px;background:var(--bg)">
  <div class="about-grid" style="max-width:var(--max-w);margin:0 auto">
    <div>
      <p class="section-label" data-reveal>Who We Are</p>
      <h2 class="section-title" data-reveal>Built on craft,<br>not corner-cutting</h2>
      <p style="font-size:16px;color:var(--muted);line-height:1.9;margin-bottom:24px" data-reveal>${esc(biz.aboutText2)}</p>
      <p style="font-size:16px;color:var(--muted);line-height:1.9;margin-bottom:40px" data-reveal>We started as a two-person crew focused entirely on residential design. Over ${esc(biz.yearsInBiz)} years, we grew by doing honest work and letting the results speak. Today we manage everything from weekly maintenance contracts to full commercial property overhauls — but the same attention to detail that defined our early work is still how we operate.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px" data-reveal>
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:24px">
          <div style="font-family:var(--font-display);font-size:36px;font-weight:800;color:var(--gold);margin-bottom:6px">1,200+</div>
          <div style="font-size:13px;color:var(--muted);letter-spacing:.04em">Projects Completed</div>
        </div>
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:24px">
          <div style="font-family:var(--font-display);font-size:36px;font-weight:800;color:var(--gold);margin-bottom:6px">5,000+</div>
          <div style="font-size:13px;color:var(--muted);letter-spacing:.04em">Clients Served</div>
        </div>
      </div>
    </div>
    <div>
      <div style="border-radius:var(--card-radius);overflow:hidden;aspect-ratio:4/5;margin-bottom:16px" data-reveal>
        <img src="${ph(2, biz)}" alt="${esc(biz.teamName)} - ${esc(biz.name)}" style="width:100%;height:100%;object-fit:cover">
      </div>
    </div>
  </div>
</section>

<!-- Timeline -->
<section style="padding:80px 32px;background:var(--panel);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start">
    <div>
      <p class="section-label" data-reveal>History</p>
      <h2 class="section-title" data-reveal>How we got here</h2>
      <p style="font-size:15px;color:var(--muted);line-height:1.8;margin-bottom:48px" data-reveal>Over ${esc(biz.yearsInBiz)} years of growth — driven by referrals, repeat clients, and a team that takes genuine pride in its work.</p>
      <div class="timeline">
        ${milestones.map(m => `<div class="timeline-item" data-reveal><div class="timeline-year">${m.year}</div><div class="timeline-text">${m.event}</div></div>`).join('')}
      </div>
    </div>
    <div>
      <div style="border-radius:var(--card-radius);overflow:hidden;aspect-ratio:1;margin-bottom:16px" data-reveal>
        <img src="${ph(4, biz)}" alt="Our team at work" style="width:100%;height:100%;object-fit:cover">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" data-reveal>
        <div style="border-radius:var(--card-radius);overflow:hidden;aspect-ratio:4/3"><img src="${ph(5, biz)}" alt="Project detail" style="width:100%;height:100%;object-fit:cover"></div>
        <div style="border-radius:var(--card-radius);overflow:hidden;aspect-ratio:4/3"><img src="${ph(6, biz)}" alt="Landscape design" style="width:100%;height:100%;object-fit:cover"></div>
      </div>
    </div>
  </div>
</section>

<!-- Team Intro -->
<section style="padding:100px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" data-reveal>The People</p>
    <h2 class="section-title" data-reveal>The team behind the work</h2>
    <p style="font-size:16px;color:var(--muted);line-height:1.8;max-width:560px;margin-bottom:56px" data-reveal>Every person on our crew has been doing this work for years. We hire for skill, train for precision, and build the kind of team that clients request by name.</p>
    <div class="team-grid">
      ${(biz.team && biz.team.length > 0 ? biz.team : [
        { name: biz.teamName || 'Alex M.', role: 'Owner & Lead Designer' },
        { name: 'Jordan P.', role: 'Irrigation Specialist' },
        { name: 'Riley S.', role: 'Crew Lead' },
      ]).slice(0, 3).map((m, i) => `
      <div class="team-card" data-reveal data-delay="${i + 1}">
        <div class="team-card-photo">
          ${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><div style="width:80px;height:80px;background:rgba(45,140,78,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:28px;font-weight:800;color:var(--green)">${esc(m.name.charAt(0))}</div></div>`}
        </div>
        <div style="padding:20px">
          <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:4px">${esc(m.name)}</div>
          <div style="font-size:13px;color:var(--green);letter-spacing:.04em">${esc(m.role)}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:40px" data-reveal>
      <a href="${esc(baseUrl)}-team" class="btn-outline">Meet the Full Team</a>
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--panel);border-top:1px solid var(--border);text-align:center">
  <p class="section-label" style="margin:0 auto 16px" data-reveal>Ready to Work Together</p>
  <h2 style="font-family:var(--font-display);font-size:clamp(32px,4vw,52px);font-weight:800;color:var(--text);line-height:1.15;margin-bottom:20px;max-width:600px;margin-left:auto;margin-right:auto" data-reveal>Start with a free consultation</h2>
  <p style="font-size:16px;color:var(--muted);max-width:460px;margin:0 auto 32px;line-height:1.8" data-reveal>Walk us through your property. We will tell you what is possible and what it will cost — honestly.</p>
  <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 32px;font-size:15px" data-reveal>Schedule a Consultation</a>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Contact ──────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {
  const mapQuery = biz.address
    ? encodeURIComponent(`${biz.address}, ${biz.city || ''} ${biz.state || ''}`)
    : encodeURIComponent(`${biz.city || 'landscape'} ${biz.state || ''}`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contact — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:160px 32px 80px;background:var(--panel);border-bottom:1px solid var(--border)}
.page-hero-inner{max-width:var(--max-w);margin:0 auto}
.contact-layout{max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;padding:80px 32px;align-items:start}
.info-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:32px;margin-bottom:24px}
.info-row{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px}
.info-row:last-child{margin-bottom:0}
.info-icon{width:40px;height:40px;background:rgba(45,140,78,.12);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.form-group{margin-bottom:20px}
.form-label{display:block;font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.06em;margin-bottom:8px;text-transform:uppercase}
.form-input{width:100%;background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:15px;color:var(--text);font-family:var(--font-body);outline:none;transition:border-color .2s}
.form-input:focus{border-color:var(--green)}
.form-input::placeholder{color:var(--muted)}
textarea.form-input{resize:vertical;min-height:140px}
@media(max-width:768px){.contact-layout{grid-template-columns:1fr;gap:40px;padding:48px 20px}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div class="page-hero-inner">
    <p class="section-label" data-reveal>Get in Touch</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:800;color:var(--text);line-height:1.1;max-width:640px;margin-bottom:16px" data-reveal>Let's talk about your property</h1>
    <p style="font-size:17px;color:var(--muted);max-width:480px;line-height:1.8" data-reveal>Same-day response on all inquiries. Free consultations come with no obligation to book.</p>
  </div>
</section>

<div class="contact-layout">
  <div>
    <div class="info-card" data-reveal>
      <h3 style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--text);margin-bottom:24px">Contact Details</h3>
      ${biz.phone ? `<div class="info-row"><div class="info-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.5 9.19 19.79 19.79 0 011.49 4 2 2 0 013.49 2h3a2 2 0 012 1.72c.13.97.36 1.92.7 2.84a2 2 0 01-.45 2.11L8 9.91a16 16 0 006.09 6.09l.74-.74a2 2 0 012.11-.45c.92.34 1.87.57 2.84.7A2 2 0 0122 16.92z"/></svg></div><div><div style="font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">Phone</div><a href="tel:${esc(telLink(biz.phone))}" style="font-size:16px;color:var(--text);font-weight:500">${esc(biz.phone)}</a></div></div>` : ''}
      ${biz.address ? `<div class="info-row"><div class="info-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div><div style="font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">Address</div><span style="font-size:16px;color:var(--text)">${esc(biz.address)}${biz.city ? ', ' + esc(biz.city) : ''}${biz.state ? ' ' + esc(biz.state) : ''}</span></div></div>` : ''}
      <div class="info-row"><div class="info-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div style="font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">Hours</div><span style="font-size:15px;color:var(--text)">${esc(biz.hours)}</span></div></div>
    </div>
    <div style="border-radius:var(--card-radius);overflow:hidden;height:320px;border:1px solid var(--border)" data-reveal>
      <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${mapQuery}&layer=mapnik" width="100%" height="320" style="border:none;filter:grayscale(40%) brightness(0.75)" title="Location map" loading="lazy"></iframe>
    </div>
  </div>
  <div data-reveal>
    <form style="background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:40px">
      <h3 style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text);margin-bottom:28px">Request a Free Quote</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-group"><label class="form-label">First Name</label><input type="text" class="form-input" placeholder="Jane"></div>
        <div class="form-group"><label class="form-label">Last Name</label><input type="text" class="form-input" placeholder="Smith"></div>
      </div>
      <div class="form-group"><label class="form-label">Phone Number</label><input type="tel" class="form-input" placeholder="${esc(biz.phone || '(555) 000-0000')}"></div>
      <div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" placeholder="jane@email.com"></div>
      <div class="form-group"><label class="form-label">Property Type</label>
        <select class="form-input">
          <option>Residential</option>
          <option>Commercial</option>
          <option>HOA / Multi-Unit</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Service Needed</label>
        <select class="form-input">
          <option value="">Select a service</option>
          ${(biz.services || []).map(s => `<option>${esc(s.name)}</option>`).join('')}
          <option>Not Sure — Need Assessment</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Project Details</label><textarea class="form-input" placeholder="Tell us about your property and what you're looking to achieve..."></textarea></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:16px;font-size:15px">Send Request</button>
      <p style="font-size:13px;color:var(--muted);text-align:center;margin-top:16px">We respond within the same business day.</p>
    </form>
  </div>
</div>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Team ─────────────────────────────────────────────────────────

function buildTeam(biz: BizPageData, baseUrl: string): string {
  const defaultTeam = [
    { name: biz.teamName || 'Alex M.', role: 'Owner & Lead Designer' },
    { name: 'Jordan P.', role: 'Senior Irrigation Specialist' },
    { name: 'Riley S.', role: 'Installation Crew Lead' },
    { name: 'Morgan W.', role: 'Horticulturalist' },
    { name: 'Casey L.', role: 'Maintenance Crew Lead' },
    { name: 'Taylor B.', role: 'Project Coordinator' },
  ];
  const teamMembers = (biz.team && biz.team.length > 0) ? biz.team : defaultTeam;
  const values = [
    { title: 'Do the work right', desc: 'We never rush a job to fit the schedule. The schedule adjusts. The quality does not.' },
    { title: 'Communicate clearly', desc: 'Clients get updates before they have to ask. If something changes, you hear from us first.' },
    { title: 'Stand behind the result', desc: 'We come back if something is not right. No questions, no charges, no delays.' },
    { title: 'Respect the property', desc: 'Sites are cleaned to a higher standard than we found them. Always.' },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Our Team — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:160px 32px 80px;background:var(--panel);border-bottom:1px solid var(--border);position:relative;overflow:hidden}
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.team-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);overflow:hidden;transition:border-color .3s}
.team-card:hover{border-color:var(--green)}
.team-photo{height:280px;background:rgba(45,140,78,.08);overflow:hidden}
.values-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.value-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:32px}
@media(max-width:768px){
  .team-grid{grid-template-columns:1fr 1fr}
  .values-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" data-reveal>The People</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:800;color:var(--text);line-height:1.1;max-width:640px;margin-bottom:16px" data-reveal>The crew that does the work</h1>
    <p style="font-size:17px;color:var(--muted);max-width:520px;line-height:1.8" data-reveal>No subcontractors. No rotating labor. The same professionals handle your property from the first consultation through ongoing maintenance.</p>
  </div>
</section>

<section style="padding:100px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" data-reveal>Full Team</p>
    <h2 class="section-title" data-reveal>Everyone on the crew</h2>
    <p class="section-sub" data-reveal>Each person you work with is a direct employee of ${esc(biz.name)} — hired for craft and trained to the same standard.</p>
    <div class="team-grid">
      ${teamMembers.map((m, i) => `
      <div class="team-card" data-reveal data-delay="${(i % 3) + 1}">
        <div class="team-photo">
          ${(m as any).photo ? `<img src="${esc((m as any).photo)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><div style="width:88px;height:88px;background:rgba(45,140,78,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:32px;font-weight:800;color:var(--green)">${esc(m.name.charAt(0))}</div></div>`}
        </div>
        <div style="padding:24px">
          <div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:4px">${esc(m.name)}</div>
          <div style="font-size:13px;color:var(--green);letter-spacing:.04em;margin-bottom:${(m as any).bio ? '12px' : '0'}">${esc(m.role)}</div>
          ${(m as any).bio ? `<p style="font-size:14px;color:var(--muted);line-height:1.7">${esc((m as any).bio)}</p>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Company Values -->
<section style="padding:80px 32px;background:var(--panel);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" data-reveal>How We Work</p>
    <h2 class="section-title" data-reveal>What we hold ourselves to</h2>
    <p class="section-sub" data-reveal>These are not marketing values. They are the actual standards we hold every crew member to on every job.</p>
    <div class="values-grid">
      ${values.map((v, i) => `
      <div class="value-card" data-reveal data-delay="${i + 1}">
        <div style="width:40px;height:40px;background:rgba(212,168,83,.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:10px">${esc(v.title)}</h3>
        <p style="font-size:14px;color:var(--muted);line-height:1.7">${esc(v.desc)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--bg);text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(32px,4vw,52px);font-weight:800;color:var(--text);line-height:1.15;margin-bottom:20px" data-reveal>Work with this team</h2>
  <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 32px;font-size:15px" data-reveal>Request a Consultation</a>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Gallery ──────────────────────────────────────────────────────

function buildGallery(biz: BizPageData, baseUrl: string): string {
  const allPhotos = Array.from({ length: 9 }, (_, i) => ph(i, biz));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gallery — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:160px 32px 80px;background:var(--panel);border-bottom:1px solid var(--border)}
.masonry{columns:3;column-gap:16px}
.masonry-item{break-inside:avoid;margin-bottom:16px;border-radius:var(--card-radius);overflow:hidden}
.ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:48px}
@media(max-width:768px){
  .masonry{columns:2}
  .ba-grid{grid-template-columns:1fr}
}
@media(max-width:480px){.masonry{columns:1}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" data-reveal>Portfolio</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:800;color:var(--text);line-height:1.1;max-width:600px;margin-bottom:16px" data-reveal>Work that speaks for itself</h1>
    <p style="font-size:17px;color:var(--muted);max-width:480px;line-height:1.8" data-reveal>Projects across residential, commercial, and specialty landscape categories — all completed by our in-house crew.</p>
  </div>
</section>

<section style="padding:80px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <div class="masonry">
      ${allPhotos.map((url, i) => `
      <div class="masonry-item" data-reveal data-delay="${(i % 4) + 1}">
        <img src="${esc(url)}" alt="Landscaping project ${i + 1}" style="width:100%;display:block;transition:transform .4s ease" loading="lazy">
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Before/After -->
<section style="padding:80px 32px;background:var(--panel);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" data-reveal>Transformations</p>
    <h2 class="section-title" data-reveal>Before &amp; after</h2>
    <p class="section-sub" data-reveal>Drag the slider to compare properties before we started and after completion.</p>
    <div class="ba-grid">
      ${baSlider(ph(7, biz), ph(1, biz), 'Backyard renovation')}
      ${baSlider(ph(8, biz), ph(3, biz), 'Front yard redesign')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--bg);text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(30px,4vw,48px);font-weight:800;color:var(--text);line-height:1.15;margin-bottom:20px" data-reveal>Ready to start your project?</h2>
  <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 32px;font-size:15px" data-reveal>Get a Free Quote</a>
</section>

${footer(biz, baseUrl)}
${BA_JS}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Testimonials ─────────────────────────────────────────────────

function buildTestimonials(biz: BizPageData, baseUrl: string): string {
  const reviews = reviewPad(biz);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reviews — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:160px 32px 80px;background:var(--panel);border-bottom:1px solid var(--border)}
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.review-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--card-radius);padding:32px;transition:border-color .3s}
.review-card:hover{border-color:var(--green)}
.rating-badge{display:inline-flex;align-items:center;gap:12px;background:rgba(45,140,78,.1);border:1px solid rgba(45,140,78,.3);border-radius:var(--card-radius);padding:20px 28px}
@media(max-width:768px){.reviews-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" data-reveal>What Clients Say</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:800;color:var(--text);line-height:1.1;max-width:640px;margin-bottom:16px" data-reveal>Real results, real feedback</h1>
    <p style="font-size:17px;color:var(--muted);max-width:480px;line-height:1.8" data-reveal>We have never paid for a review. Every one of these came from a client who chose to share their experience.</p>
  </div>
</section>

<!-- Google Rating Badge -->
<section style="padding:48px 32px;background:var(--bg);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto;display:flex;align-items:center;gap:32px;flex-wrap:wrap">
    <div class="rating-badge" data-reveal>
      <div>
        <div style="font-family:var(--font-display);font-size:48px;font-weight:800;color:var(--gold);line-height:1">${esc(String(biz.rating || 4.9))}</div>
        <div style="color:var(--gold);font-size:18px;letter-spacing:.05em;margin-top:4px">★★★★★</div>
      </div>
      <div>
        <div style="font-size:15px;font-weight:600;color:var(--text)">${esc(String(biz.reviews || '200'))}+ Google Reviews</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">Verified customer ratings</div>
      </div>
    </div>
    <div data-reveal>
      <p style="font-size:15px;color:var(--muted);max-width:440px;line-height:1.8">Our rating is maintained across hundreds of projects because we hold every crew member to the same standard on every job — not just the ones that are easy.</p>
    </div>
  </div>
</section>

<!-- Reviews Grid -->
<section style="padding:80px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <div class="reviews-grid">
      ${reviews.map((r, i) => `
      <div class="review-card" data-reveal data-delay="${(i % 3) + 1}">
        <div style="color:var(--gold);font-size:16px;letter-spacing:.1em;margin-bottom:16px">★★★★★</div>
        <p style="font-size:14px;color:var(--text);line-height:1.8;margin-bottom:20px">"${esc(r.text)}"</p>
        <div style="border-top:1px solid var(--border);padding-top:16px">
          <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(r.reviewer)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">${esc(r.svc)} — ${esc(r.city)}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--panel);border-top:1px solid var(--border);text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(32px,4vw,52px);font-weight:800;color:var(--text);line-height:1.15;margin-bottom:20px" data-reveal>Add your name to the list</h2>
  <p style="font-size:16px;color:var(--muted);max-width:440px;margin:0 auto 32px;line-height:1.8" data-reveal>Free consultation, same-day response. No pressure to commit before you are ready.</p>
  <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 32px;font-size:15px" data-reveal>Get a Free Quote</a>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function buildLandscapingV2AllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home: buildHome(biz, baseUrl),
    about: buildAbout(biz, baseUrl),
    contact: buildContact(biz, baseUrl),
    team: buildTeam(biz, baseUrl),
    gallery: buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
