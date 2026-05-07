/**
 * Roofing demo website builder v2 — "Rennox" dark trust style.
 * Inspired by rennox.framer.website — dark modern renovation aesthetic.
 * Palette: #0f1117 bg, #181b24 panel, #1e2130 card, #dc2626 primary red.
 * Fonts: Barlow Condensed 700/800/900 (display) + Inter 300-500 (body).
 * Six pages: home, about, contact, team, gallery, testimonials.
 * Features: numbered portfolio cards, rotating testimonials, guarantee section,
 *   before/after sliders, sticky nav, CSS marquee, data-reveal animations.
 * Zero Tailwind, all styles inline. Zero emojis.
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function telLink(phone: string | null): string {
  return (phone ?? '').replace(/[^0-9+]/g, '');
}

const ROOFING_PHOTOS = [
  'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=800&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80',
  'https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=800&q=80',
  'https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=800&q=80',
  'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80',
];

function rph(idx: number, biz: BizPageData): string {
  return biz.photos[idx] || ROOFING_PHOTOS[idx % ROOFING_PHOTOS.length];
}

function reviewPad(biz: BizPageData, count: number): Array<{ text: string; reviewer: string; city: string; svc: string; date: string }> {
  const padData = [
    { text: 'After the storm took half our roof, they had a crew out the next morning. Insurance claim handled start to finish. New roof done in two days.', reviewer: 'Greg T.', city: biz.city || 'Local Area', svc: 'Storm Damage Repair', date: 'March 2025' },
    { text: 'Got three bids. They were the only crew who actually got on the roof before quoting. No surprises on the invoice, no add-ons mid-job.', reviewer: 'Sheila & Mike O.', city: 'North County', svc: 'Roof Replacement', date: 'January 2025' },
    { text: 'Replaced our roof and gutters in a single day. Showed up at 7 AM, cleaned every nail from the yard, and were done by 4 PM.', reviewer: 'James R.', city: biz.city || 'South District', svc: 'Full Reroof', date: 'November 2024' },
    { text: 'Told us we did not need a full replacement when two other companies said we did. Fixed the actual leak for $400. We trust these people completely.', reviewer: 'Patricia N.', city: 'East Metro', svc: 'Roof Repair', date: 'October 2024' },
    { text: '25-year warranty that they actually stand behind. Small issue six months after install — crew came out next day, no charge, no questions.', reviewer: 'Dave L.', city: 'West Side', svc: 'Roof Installation', date: 'August 2024' },
    { text: 'Commercial building, 8,200 sq ft. Finished ahead of schedule, zero safety incidents, and the final invoice matched the quote to the dollar.', reviewer: 'Corporate Properties LLC', city: biz.city || 'Downtown', svc: 'Commercial Roofing', date: 'July 2024' },
    { text: 'Crew tarped the whole yard before touching a single shingle. Cleanup was better than we left it. They clearly take pride in the whole job, not just the roof.', reviewer: 'Sandra K.', city: 'Ridgefield', svc: 'Roof Replacement', date: 'June 2024' },
    { text: 'Fast, fair, and they showed up when they said they would. That alone puts them ahead of every other contractor we have hired in 12 years.', reviewer: 'Tom & Lucy B.', city: 'Lakeside', svc: 'Roof Repair', date: 'April 2024' },
    { text: 'They explained exactly what materials they would use and why each one costs what it does. No vague language, no upsell pressure. Hired them on the spot.', reviewer: 'Robert M.', city: 'Millbrook', svc: 'Roof Inspection', date: 'March 2024' },
    { text: 'Our insurance adjuster actually complimented the install quality during the inspection walkthrough. That is when you know the crew does it right.', reviewer: 'Angela F.', city: biz.city || 'North Metro', svc: 'Storm Damage Repair', date: 'February 2024' },
  ];
  const base = (biz.reviewTexts || []).map((text, i) => ({
    text,
    reviewer: padData[i]?.reviewer || 'Verified Customer',
    city: padData[i]?.city || biz.city || 'Local Area',
    svc: padData[i]?.svc || 'Roofing Services',
    date: padData[i]?.date || '2025',
  }));
  while (base.length < count) base.push(padData[base.length % padData.length]);
  return base.slice(0, count);
}

// ── Shared JS/CSS constants ────────────────────────────────────────────────────

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

// ── Global styles ──────────────────────────────────────────────────────────────

function globalStyles(biz: BizPageData): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:#0f1117;
  --panel:#181b24;
  --card:#1e2130;
  --primary:#dc2626;
  --primary-hover:#b91c1c;
  --white:#f8fafc;
  --muted:#94a3b8;
  --border:rgba(248,250,252,0.08);
  --section-pad:clamp(4rem,8vw,7rem);
  --radius:12px;
  --tr:.35s cubic-bezier(.4,0,.2,1);
}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--white);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{text-decoration:none;color:inherit}
img{display:block;max-width:100%}
${DATA_REVEAL_CSS}

/* ── Buttons ── */
.btn{display:inline-block;font-family:'Inter',sans-serif;font-weight:600;font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all var(--tr);border:none;border-radius:4px}
.btn-red{background:var(--primary);color:#fff;padding:13px 30px}
.btn-red:hover{background:var(--primary-hover);transform:translateY(-2px)}
.btn-outline{border:1.5px solid rgba(248,250,252,.25);color:var(--white);padding:12px 29px;background:transparent}
.btn-outline:hover{border-color:rgba(248,250,252,.6);background:rgba(248,250,252,.05)}
.btn-white{background:var(--white);color:#0f1117;padding:13px 30px}
.btn-white:hover{background:#e2e8f0}

/* ── Kicker ── */
.kicker{font-size:.72rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--primary)}

/* ── Site Header ── */
.site-header{position:fixed;top:0;left:0;right:0;z-index:100;transition:background .3s,box-shadow .3s}
.site-header.scrolled{background:rgba(15,17,23,.96);backdrop-filter:blur(12px);box-shadow:0 1px 0 var(--border)}
.header__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;height:72px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}
.header__nav{display:flex;align-items:center;gap:1.75rem}
.header__nav--right{justify-content:flex-end;gap:1.25rem}
.header__nav a{font-size:.78rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(248,250,252,.7);transition:color var(--tr)}
.header__nav a:hover{color:var(--white)}
.header__logo{text-align:center}
.header__logo-text{font-family:'Barlow Condensed',Impact,sans-serif;font-size:1.55rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:var(--white);line-height:1}
.header__logo-sub{font-size:.6rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,250,252,.4);margin-top:2px}
.header__burger{display:none;background:none;border:none;cursor:pointer;padding:4px;flex-direction:column;gap:5px}
.header__burger span{display:block;width:24px;height:2px;background:var(--white);transition:all .3s}
@media(max-width:900px){
  .header__nav{display:none}
  .header__inner{grid-template-columns:1fr auto}
  .header__burger{display:flex}
}

/* ── Mobile menu ── */
.mobile-menu{position:fixed;inset:0;background:var(--panel);z-index:200;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2rem;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1)}
.mobile-menu.open{transform:translateX(0)}
.mobile-menu a{font-family:'Barlow Condensed',sans-serif;font-size:2.8rem;font-weight:900;text-transform:uppercase;color:var(--white);letter-spacing:.04em}
.mobile-menu a:hover{color:var(--primary)}
.mobile-close{position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;cursor:pointer;font-size:1.8rem;color:var(--white)}

/* ── Hero ── */
.hero{position:relative;height:100vh;min-height:640px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.hero__bg{position:absolute;inset:0;background:url('${rph(0, biz).replace('w=800', 'w=1920')}') center/cover no-repeat}
.hero__overlay{position:absolute;inset:0;background:rgba(15,17,23,0.72)}
.hero__content{position:relative;z-index:2;text-align:center;padding:0 1.5rem;max-width:980px}
.hero__eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(248,250,252,.6);margin-bottom:1.2rem}
.hero__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(3.8rem,11vw,9rem);font-weight:900;text-transform:uppercase;color:var(--white);letter-spacing:-.01em;line-height:.92;margin-bottom:1.1rem}
.hero__title em{color:var(--primary);font-style:normal}
.hero__sub{font-size:clamp(1rem,2vw,1.18rem);font-weight:300;color:rgba(248,250,252,.75);margin-bottom:2.5rem;letter-spacing:.02em;max-width:540px;margin-left:auto;margin-right:auto}
.hero__ctas{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.hero__scroll{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.4rem;animation:bounce 2s ease infinite}
@keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}
.hero__scroll-text{font-size:.62rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(248,250,252,.4)}

/* ── Trust Bar ── */
.trust-bar{background:var(--primary);padding:.85rem 0;overflow-x:auto}
.trust-bar__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:nowrap;white-space:nowrap}
.trust-bar__item{display:flex;align-items:center;gap:.45rem;padding:0 1.75rem;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.92)}
.trust-bar__divider{width:1px;height:22px;background:rgba(255,255,255,.35);flex-shrink:0}
@media(max-width:700px){.trust-bar__inner{justify-content:flex-start}}

/* ── Section wrapper ── */
.section-inner{max-width:1320px;margin:0 auto;padding:0 1.5rem}
.section-header{text-align:center;margin-bottom:3.5rem}
.section-title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2.4rem,5vw,4rem);font-weight:900;text-transform:uppercase;color:var(--white);line-height:1;letter-spacing:.01em;margin-top:.5rem}
.section-title--dark{color:#0f1117}

/* ── Portfolio ── */
.portfolio{padding:var(--section-pad) 0;background:var(--panel)}
.portfolio__grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
@media(max-width:800px){.portfolio__grid{grid-template-columns:1fr}}
.project-card{background:var(--card);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);transition:border-color var(--tr),transform var(--tr)}
.project-card:hover{border-color:rgba(220,38,38,.4);transform:translateY(-4px)}
.project-card__img{aspect-ratio:16/10;overflow:hidden}
.project-card__img img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.project-card:hover .project-card__img img{transform:scale(1.05)}
.project-card__body{padding:1.5rem}
.project-card__num{font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:800;color:var(--primary);letter-spacing:.12em;margin-bottom:.5rem}
.project-card__title{font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;text-transform:uppercase;color:var(--white);letter-spacing:.04em;margin-bottom:.4rem;border-top:2px solid var(--primary);padding-top:.6rem}
.project-card__meta{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem}
.project-card__tag{font-size:.7rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.project-card__desc{font-size:.88rem;font-weight:300;line-height:1.7;color:rgba(248,250,252,.55)}

/* ── Stats ── */
.stats{padding:4rem 0;background:var(--bg)}
.stats__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
@media(max-width:800px){.stats__grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.stats__grid{grid-template-columns:1fr 1fr}}
.stat-item{text-align:center;padding:2rem 1rem;border-right:1px solid var(--border)}
.stat-item:last-child{border-right:none}
@media(max-width:800px){.stat-item:nth-child(2){border-right:none}.stat-item:nth-child(3){border-right:1px solid var(--border)}}
.stat-num{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2.5rem,6vw,4rem);font-weight:900;color:var(--primary);line-height:1;letter-spacing:.01em;margin-bottom:.35rem}
.stat-label{font-size:.73rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}

/* ── Services ── */
.services{padding:var(--section-pad) 0;background:var(--bg)}
.services__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
@media(max-width:900px){.services__grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:580px){.services__grid{grid-template-columns:1fr}}
.svc-card{background:var(--card);border-radius:var(--radius);padding:2rem;border:1px solid var(--border);transition:border-color var(--tr),transform var(--tr)}
.svc-card:hover{border-color:rgba(220,38,38,.35);transform:translateY(-4px)}
.svc-card__icon{width:44px;height:44px;background:rgba(220,38,38,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:1.1rem}
.svc-card__name{font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--white);margin-bottom:.6rem}
.svc-card__desc{font-size:.88rem;font-weight:300;line-height:1.7;color:var(--muted);margin-bottom:1.1rem}
.svc-card__price{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;color:var(--primary)}
.svc-card__duration{font-size:.75rem;font-weight:500;color:var(--muted);margin-top:.2rem}

/* ── Why Us (sticky) ── */
.why{padding:var(--section-pad) 0;background:var(--panel)}
.why__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem}
.why__layout{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:start}
@media(max-width:900px){.why__layout{grid-template-columns:1fr;gap:2.5rem}}
.why__left{position:sticky;top:6rem}
.why__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2.2rem,4vw,3.4rem);font-weight:900;text-transform:uppercase;color:var(--white);line-height:1;margin-bottom:1.5rem;margin-top:.5rem}
.why__bullets{display:flex;flex-direction:column;gap:.85rem;margin-bottom:2rem}
.why__bullet{display:flex;align-items:flex-start;gap:.9rem;font-size:.92rem;font-weight:400;line-height:1.6;color:rgba(248,250,252,.75)}
.why__check{width:20px;height:20px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.why__testimonials-box{background:var(--card);border-radius:var(--radius);padding:2rem;border:1px solid var(--border)}
.why__quote{font-size:.92rem;font-weight:300;line-height:1.75;color:rgba(248,250,252,.7);font-style:italic;margin-bottom:1rem}
.why__quote-author{font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--primary)}

/* ── Guarantee ── */
.guarantee{padding:var(--section-pad) 0;background:var(--bg)}
.guarantee__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem}
@media(max-width:800px){.guarantee__grid{grid-template-columns:1fr}}
.guarantee-card{background:var(--card);border-radius:var(--radius);padding:2.25rem;border:1px solid var(--border);text-align:center}
.guarantee-card__icon{width:56px;height:56px;background:rgba(220,38,38,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.2rem}
.guarantee-card__title{font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;text-transform:uppercase;color:var(--white);letter-spacing:.04em;margin-bottom:.75rem}
.guarantee-card__desc{font-size:.88rem;font-weight:300;line-height:1.7;color:var(--muted)}

/* ── Before/After ── */
.ba-section{padding:var(--section-pad) 0;background:var(--panel)}
.ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:3rem}
@media(max-width:800px){.ba-grid{grid-template-columns:1fr}}
.ba-container{position:relative;aspect-ratio:16/10;overflow:hidden;border-radius:var(--radius);cursor:ew-resize;user-select:none}
.ba-after,.ba-before{position:absolute;inset:0}
.ba-after img,.ba-before img{width:100%;height:100%;object-fit:cover}
.ba-before{clip-path:inset(0 50% 0 0)}
.ba-handle{position:absolute;top:0;bottom:0;left:50%;width:3px;background:var(--primary);transform:translateX(-50%);cursor:ew-resize}
.ba-handle::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;background:var(--primary);border-radius:50%;border:3px solid #fff}
.ba-label{position:absolute;bottom:.75rem;font-size:.65rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.55);padding:4px 10px;border-radius:4px}
.ba-label--before{left:.75rem}
.ba-label--after{right:.75rem}

/* ── Emergency CTA ── */
.emergency{padding:5rem 0;background:var(--primary)}
.emergency__inner{max-width:900px;margin:0 auto;padding:0 1.5rem;text-align:center}
.emergency__eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:.75rem}
.emergency__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2.8rem,8vw,5.5rem);font-weight:900;text-transform:uppercase;color:#fff;line-height:1;margin-bottom:.75rem}
.emergency__phone{font-family:'Barlow Condensed',sans-serif;font-size:clamp(2.5rem,6vw,4.5rem);font-weight:900;color:#fff;letter-spacing:.02em;margin-bottom:.5rem}
.emergency__sub{font-size:.95rem;font-weight:400;color:rgba(255,255,255,.8);margin-bottom:2rem}

/* ── Marquee testimonials ── */
.marquee-section{padding:var(--section-pad) 0;background:var(--bg);overflow:hidden}
.marquee-wrap{overflow:hidden;mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);margin-top:3rem}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.marquee-track{display:flex;gap:1.5rem;width:max-content;animation:marquee 45s linear infinite}
.marquee-track:hover{animation-play-state:paused}
.review-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;width:320px;flex-shrink:0}
.review-card__stars{color:var(--primary);font-size:1rem;letter-spacing:.1em;margin-bottom:.75rem}
.review-card__text{font-size:.88rem;font-weight:300;line-height:1.7;color:rgba(248,250,252,.7);margin-bottom:1rem}
.review-card__author{font-size:.78rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.review-card__meta{font-size:.72rem;color:var(--muted);margin-top:.2rem}

/* ── Process ── */
.process{padding:var(--section-pad) 0;background:var(--panel)}
.process__steps{display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;margin-top:3rem;position:relative}
.process__steps::before{content:'';position:absolute;top:2rem;left:calc(10% + .75rem);right:calc(10% + .75rem);height:1px;background:var(--border);z-index:0}
@media(max-width:900px){.process__steps{grid-template-columns:1fr;gap:0}.process__steps::before{display:none}}
.process-step{text-align:center;position:relative;z-index:1;padding:0 .5rem}
.process-step__num{width:48px;height:48px;background:var(--card);border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto .85rem;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:900;color:var(--primary);transition:background var(--tr),border-color var(--tr)}
.process-step:hover .process-step__num{background:var(--primary);border-color:var(--primary);color:#fff}
.process-step__title{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:800;text-transform:uppercase;color:var(--white);letter-spacing:.04em;margin-bottom:.4rem}
.process-step__desc{font-size:.8rem;font-weight:300;line-height:1.65;color:var(--muted)}

/* ── CTA ── */
.cta-section{padding:var(--section-pad) 0;background:var(--bg)}
.cta-section__inner{max-width:820px;margin:0 auto;padding:0 1.5rem;text-align:center}
.cta-section__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2.4rem,6vw,4.5rem);font-weight:900;text-transform:uppercase;color:var(--white);line-height:1;margin-bottom:1rem}
.cta-section__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-bottom:2.5rem;line-height:1.7}
.cta-section__ctas{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}

/* ── Footer ── */
.footer{background:var(--panel);border-top:1px solid var(--border);padding:4rem 0 0}
.footer__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:3rem;margin-bottom:3rem}
@media(max-width:800px){.footer__inner{grid-template-columns:1fr 1fr}}
@media(max-width:500px){.footer__inner{grid-template-columns:1fr}}
.footer__logo{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;text-transform:uppercase;color:var(--white);letter-spacing:.05em;margin-bottom:.5rem}
.footer__tagline{font-size:.85rem;font-weight:300;color:var(--muted);line-height:1.65;max-width:260px;margin-bottom:1.5rem}
.footer__col-title{font-size:.68rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(248,250,252,.3);margin-bottom:1rem}
.footer__links{display:flex;flex-direction:column;gap:.5rem}
.footer__links a{font-size:.85rem;font-weight:300;color:var(--muted);transition:color var(--tr)}
.footer__links a:hover{color:var(--white)}
.footer__bottom{border-top:1px solid var(--border);padding:1.25rem 1.5rem;max-width:1320px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem}
.footer__copy{font-size:.78rem;font-weight:300;color:rgba(248,250,252,.3)}

/* ── Inner page hero ── */
.inner-hero{padding:10rem 0 5rem;background:var(--panel);border-bottom:1px solid var(--border);text-align:center}
.inner-hero__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(3rem,8vw,6rem);font-weight:900;text-transform:uppercase;color:var(--white);line-height:1;margin-top:.5rem}
.inner-hero__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-top:1rem;max-width:540px;margin-left:auto;margin-right:auto}

/* ── Team grid ── */
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem}
@media(max-width:800px){.team-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:500px){.team-grid{grid-template-columns:1fr}}
.team-card{background:var(--card);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)}
.team-card__photo{aspect-ratio:1/1;overflow:hidden;background:var(--panel)}
.team-card__photo img{width:100%;height:100%;object-fit:cover}
.team-card__initials{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:3rem;font-weight:900;color:var(--primary)}
.team-card__body{padding:1.25rem}
.team-card__name{font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:800;text-transform:uppercase;color:var(--white);letter-spacing:.04em;margin-bottom:.25rem}
.team-card__role{font-size:.78rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--primary)}

/* ── Gallery grid ── */
.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3rem}
@media(max-width:700px){.gallery-grid{grid-template-columns:repeat(2,1fr)}}
.gallery-item{aspect-ratio:4/3;overflow:hidden;border-radius:var(--radius);position:relative}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.gallery-item:hover img{transform:scale(1.07)}
.gallery-item__overlay{position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;transition:background var(--tr)}
.gallery-item:hover .gallery-item__overlay{background:rgba(0,0,0,.45)}

/* ── Contact form ── */
.contact-layout{display:grid;grid-template-columns:1.1fr 1fr;gap:4rem;align-items:start;margin-top:3rem}
@media(max-width:900px){.contact-layout{grid-template-columns:1fr}}
.form-group{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.85rem}
.form-group label{font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(248,250,252,.4)}
.form-group input,.form-group select,.form-group textarea{background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--white);font-family:'Inter',sans-serif;font-size:.9rem;font-weight:300;padding:.85rem 1rem;width:100%;outline:none;border-radius:6px;transition:border-color var(--tr)}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--primary)}
.form-group input::placeholder,.form-group textarea::placeholder{color:rgba(248,250,252,.2)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}
@media(max-width:580px){.form-row{grid-template-columns:1fr}}
.contact-info__phone{font-family:'Barlow Condensed',sans-serif;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:900;color:var(--primary);letter-spacing:.01em;margin-bottom:.4rem}
.contact-info__label{font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:2rem}
.map-container{border-radius:var(--radius);overflow:hidden;height:260px;margin-top:1.5rem;border:1px solid var(--border)}
.map-container iframe{width:100%;height:100%;border:none}

/* ── Milestones ── */
.milestones{display:flex;flex-direction:column;gap:0;margin-top:2rem}
.milestone{display:grid;grid-template-columns:80px 1fr;gap:1.5rem;padding:1.5rem 0;border-bottom:1px solid var(--border)}
.milestone:last-child{border-bottom:none}
.milestone__year{font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:900;color:var(--primary)}
.milestone__text{font-size:.9rem;font-weight:300;line-height:1.7;color:var(--muted)}

@media(max-width:700px){.ba-grid{grid-template-columns:1fr}}
@media(max-width:580px){.hero__ctas{flex-direction:column;align-items:center}}
</style>`;
}

// ── Header ─────────────────────────────────────────────────────────────────────

function header(biz: BizPageData, baseUrl: string): string {
  return `<header class="site-header" id="site-header">
  <div class="header__inner">
    <nav class="header__nav">
      <a href="${baseUrl}">Home</a>
      <a href="${baseUrl}-about">About</a>
      <a href="${baseUrl}-gallery">Projects</a>
    </nav>
    <div class="header__logo">
      <div class="header__logo-text">${esc(biz.name)}</div>
      <div class="header__logo-sub">Licensed Roofing Contractor</div>
    </div>
    <nav class="header__nav header__nav--right">
      <a href="${baseUrl}-team">Team</a>
      <a href="${baseUrl}-testimonials">Reviews</a>
      <a href="${baseUrl}-contact" class="btn btn-red">Free Inspection</a>
    </nav>
    <button class="header__burger" id="burger" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  <button class="mobile-close" id="mobile-close">&#215;</button>
  <a href="${baseUrl}">Home</a>
  <a href="${baseUrl}-about">About</a>
  <a href="${baseUrl}-gallery">Projects</a>
  <a href="${baseUrl}-team">Team</a>
  <a href="${baseUrl}-testimonials">Reviews</a>
  <a href="${baseUrl}-contact">Contact</a>
</div>
<script>
const h=document.getElementById('site-header'),burger=document.getElementById('burger'),menu=document.getElementById('mobile-menu'),close=document.getElementById('mobile-close');
window.addEventListener('scroll',()=>h.classList.toggle('scrolled',window.scrollY>40));
burger.addEventListener('click',()=>menu.classList.add('open'));
close.addEventListener('click',()=>menu.classList.remove('open'));
</script>`;
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `<footer class="footer">
  <div class="footer__inner">
    <div>
      <div class="footer__logo">${esc(biz.name)}</div>
      <p class="footer__tagline">Licensed and insured roofing contractor serving ${esc(biz.city || 'the local area')}${biz.state ? ', ' + esc(biz.state) : ''}. Free inspections, same-week scheduling.</p>
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red" style="margin-top:1rem">${esc(biz.phone)}</a>` : ''}
    </div>
    <div>
      <div class="footer__col-title">Services</div>
      <div class="footer__links">
        <a href="${baseUrl}">Roof Replacement</a>
        <a href="${baseUrl}">Roof Repair</a>
        <a href="${baseUrl}">Storm Damage</a>
        <a href="${baseUrl}">Commercial Roofing</a>
        <a href="${baseUrl}">Gutters</a>
      </div>
    </div>
    <div>
      <div class="footer__col-title">Company</div>
      <div class="footer__links">
        <a href="${baseUrl}-about">About Us</a>
        <a href="${baseUrl}-gallery">Our Work</a>
        <a href="${baseUrl}-team">Our Team</a>
        <a href="${baseUrl}-testimonials">Reviews</a>
        <a href="${baseUrl}-contact">Contact</a>
      </div>
    </div>
  </div>
  <div class="footer__bottom">
    <span class="footer__copy">&copy; ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</span>
    <span class="footer__copy">${biz.address ? esc(biz.address) : ''}${biz.city ? ' &mdash; ' + esc(biz.city) : ''}</span>
  </div>
</footer>`;
}

// ── HOME PAGE ──────────────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {
  const reviews = reviewPad(biz, 10);
  const svcs = biz.services?.length ? biz.services : [
    { name: 'Roof Replacement', desc: 'Full reroof with premium materials and a 25-year workmanship warranty.', price: 'Starting at $6,500', duration: '1–2 days' },
    { name: 'Storm Damage Repair', desc: 'Emergency response for wind, hail, and water damage. Insurance coordination included.', price: 'Starting at $1,200', duration: '1 day' },
    { name: 'Commercial Roofing', desc: 'Flat and low-slope systems for commercial and industrial buildings.', price: 'Custom quote', duration: '2–5 days' },
  ];

  const portfolioProjects = [
    { num: '01', title: 'Residential Reroof', loc: biz.city || 'North Side', duration: '1.5 days', cost: '$9,200 – $11,500', desc: 'Full tear-off and replacement with architectural shingles. New ice-and-water shield on all valleys.' },
    { num: '02', title: 'Storm Damage Repair', loc: biz.city || 'East District', duration: '1 day', cost: '$2,800 – $4,400', desc: 'Wind damage to 14 squares. Emergency tarping followed by full shingle and deck repair.' },
    { num: '03', title: 'Commercial Low-Slope', loc: biz.city || 'Industrial Park', duration: '3 days', cost: '$22,000 – $28,000', desc: 'TPO membrane system on 6,400 sq ft warehouse. Fully adhered, 20-year manufacturer warranty.' },
    { num: '04', title: 'Historic Home Re-Roof', loc: biz.city || 'Old Quarter', duration: '2 days', cost: '$13,500 – $16,000', desc: 'Period-appropriate slate-look shingles on a 1928 craftsman. All original fascia preserved and repainted.' },
  ];

  const rotatingQuotes = [
    { text: `"${reviews[0].text}"`, author: reviews[0].reviewer },
    { text: `"${reviews[1].text}"`, author: reviews[1].reviewer },
    { text: `"${reviews[2].text}"`, author: reviews[2].reviewer },
  ];

  const marqueeReviews = [...reviews, ...reviews];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Home — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}

<!-- HERO -->
<section class="hero">
  <div class="hero__bg"></div>
  <div class="hero__overlay"></div>
  <div class="hero__content">
    <div class="hero__eyebrow">Licensed &amp; Insured &mdash; ${esc(biz.city || 'Local Area')}</div>
    <h1 class="hero__title">
      <span id="rotating-word">${esc(biz.heroHeadline || 'Roofs Built')}</span><br>
      <em>${esc(biz.heroHeadlineEm || 'To Last')}</em>
    </h1>
    <p class="hero__sub">${esc(biz.heroSub || `${biz.yearsInBiz || '15'}+ years replacing and repairing roofs across ${biz.city || 'the area'}. Free inspections. Same-week scheduling.`)}</p>
    <div class="hero__ctas">
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red">Call ${esc(biz.phone)}</a>` : ''}
      <a href="${baseUrl}-contact" class="btn btn-outline">Get Free Inspection</a>
    </div>
  </div>
  <div class="hero__scroll">
    <svg width="20" height="20" fill="none" stroke="rgba(248,250,252,.4)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
  </div>
</section>

<!-- TRUST BAR -->
<div class="trust-bar">
  <div class="trust-bar__inner">
    <span class="trust-bar__item">
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Free Roof Inspection
    </span>
    <div class="trust-bar__divider"></div>
    <span class="trust-bar__item">
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      25yr Workmanship Warranty
    </span>
    <div class="trust-bar__divider"></div>
    <span class="trust-bar__item">
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Licensed &amp; Insured
    </span>
    <div class="trust-bar__divider"></div>
    <span class="trust-bar__item">
      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      BBB A+ Rated
    </span>
  </div>
</div>

<!-- PORTFOLIO -->
<section class="portfolio">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Recent Projects</div>
      <h2 class="section-title">Our Work Speaks First</h2>
    </div>
    <div class="portfolio__grid">
      ${portfolioProjects.map((p, i) => `
      <div class="project-card" data-reveal data-delay="${i % 2 === 0 ? '1' : '2'}">
        <div class="project-card__img"><img src="${rph(i, biz)}" alt="${p.title}" loading="lazy"></div>
        <div class="project-card__body">
          <div class="project-card__num">${p.num}</div>
          <div class="project-card__title">${p.title}</div>
          <div class="project-card__meta">
            <span class="project-card__tag">${p.loc}</span>
            <span class="project-card__tag">${p.duration}</span>
            <span class="project-card__tag">${p.cost}</span>
          </div>
          <p class="project-card__desc">${p.desc}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- STATS -->
<section class="stats">
  <div class="section-inner">
    <div class="stats__grid">
      <div class="stat-item" data-reveal data-delay="1">
        <div class="stat-num">200+</div>
        <div class="stat-label">Roofs Replaced</div>
      </div>
      <div class="stat-item" data-reveal data-delay="2">
        <div class="stat-num">25yr</div>
        <div class="stat-label">Workmanship Warranty</div>
      </div>
      <div class="stat-item" data-reveal data-delay="3">
        <div class="stat-num">Same-Wk</div>
        <div class="stat-label">Scheduling</div>
      </div>
      <div class="stat-item" data-reveal data-delay="4">
        <div class="stat-num">A+</div>
        <div class="stat-label">BBB Rating</div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section class="services">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">What We Do</div>
      <h2 class="section-title">Roofing Services</h2>
    </div>
    <div class="services__grid">
      ${svcs.map((s, i) => `
      <div class="svc-card" data-reveal data-delay="${(i % 3) + 1}">
        <div class="svc-card__icon">
          <svg width="22" height="22" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div class="svc-card__name">${esc(s.name)}</div>
        <p class="svc-card__desc">${esc(s.desc)}</p>
        <div class="svc-card__price">${esc(s.price)}</div>
        ${s.duration ? `<div class="svc-card__duration">Typical timeline: ${esc(s.duration)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- WHY US (sticky left) -->
<section class="why">
  <div class="why__inner">
    <div class="why__layout">
      <div class="why__left">
        <div class="kicker">Why Choose Us</div>
        <h2 class="why__title">Built on Reputation, Not Advertising</h2>
        <div class="why__bullets">
          <div class="why__bullet">
            <div class="why__check"><svg width="10" height="10" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
            <span>We inspect before quoting — no phone bids, no guesswork, no surprises</span>
          </div>
          <div class="why__bullet">
            <div class="why__check"><svg width="10" height="10" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
            <span>25-year workmanship warranty backed by our own guarantee, not a third-party document</span>
          </div>
          <div class="why__bullet">
            <div class="why__check"><svg width="10" height="10" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
            <span>Same crew from start to finish — no subcontracting, no strangers on your roof</span>
          </div>
          <div class="why__bullet">
            <div class="why__check"><svg width="10" height="10" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
            <span>Insurance claims handled in-house — we deal with adjusters so you do not have to</span>
          </div>
          <div class="why__bullet">
            <div class="why__check"><svg width="10" height="10" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
            <span>Yard left cleaner than we found it — magnetic sweep after every job</span>
          </div>
        </div>
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red">Call ${esc(biz.phone)}</a>` : `<a href="${baseUrl}-contact" class="btn btn-red">Get a Free Inspection</a>`}
      </div>
      <div class="why__right">
        <div class="why__testimonials-box" id="why-testimonials">
          <div style="color:var(--primary);font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:1rem">What Our Customers Say</div>
          <p class="why__quote" id="why-quote">${esc(rotatingQuotes[0].text)}</p>
          <div class="why__quote-author" id="why-author">— ${esc(rotatingQuotes[0].author)}</div>
        </div>
        <div style="background:var(--card);border-radius:var(--radius);padding:2rem;border:1px solid var(--border);margin-top:1.5rem">
          <div style="font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem">Certifications &amp; Memberships</div>
          ${['GAF Master Elite Contractor', 'Owens Corning Preferred Contractor', 'CertainTeed Select ShingleMaster', 'NRCA Member', `${biz.state || 'State'} Licensed Roofing Contractor`, 'BBB Accredited A+ Business'].map(c => `
          <div style="font-size:.85rem;font-weight:400;color:rgba(248,250,252,.7);display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--primary);flex-shrink:0;display:inline-block"></span>${c}
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>
<script>
(function(){
  const quotes=${JSON.stringify(rotatingQuotes)};
  let idx=0;
  setInterval(()=>{idx=(idx+1)%quotes.length;
    const q=document.getElementById('why-quote'),a=document.getElementById('why-author');
    if(!q||!a)return;
    q.style.opacity='0';a.style.opacity='0';
    setTimeout(()=>{q.textContent=quotes[idx].text;a.textContent='— '+quotes[idx].author;q.style.opacity='1';a.style.opacity='1';},400);
  },4000);
})();
</script>

<!-- GUARANTEE -->
<section class="guarantee">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Our Promise</div>
      <h2 class="section-title">Our Triple Guarantee</h2>
    </div>
    <div class="guarantee__grid">
      <div class="guarantee-card" data-reveal data-delay="1">
        <div class="guarantee-card__icon">
          <svg width="24" height="24" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="guarantee-card__title">Workmanship Guarantee</div>
        <p class="guarantee-card__desc">Every installation is backed by a 25-year workmanship warranty. If the work causes a problem, we fix it for free — no expiration, no paperwork maze.</p>
      </div>
      <div class="guarantee-card" data-reveal data-delay="2">
        <div class="guarantee-card__icon">
          <svg width="24" height="24" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        </div>
        <div class="guarantee-card__title">Materials Guarantee</div>
        <p class="guarantee-card__desc">We only use manufacturer-certified materials eligible for the longest available product warranties. We document every material used and provide the paperwork at job completion.</p>
      </div>
      <div class="guarantee-card" data-reveal data-delay="3">
        <div class="guarantee-card__icon">
          <svg width="24" height="24" fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
        </div>
        <div class="guarantee-card__title">Clean-Up Guarantee</div>
        <p class="guarantee-card__desc">We run a magnetic sweep over your entire property after every job. If you find a nail we missed, call us and we will come back within 24 hours — no charge.</p>
      </div>
    </div>
  </div>
</section>

<!-- BEFORE/AFTER -->
<section class="ba-section">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Transformations</div>
      <h2 class="section-title">Before &amp; After</h2>
      <p style="color:var(--muted);font-size:.9rem;margin-top:.75rem">Drag the handle to compare</p>
    </div>
    <div class="ba-grid">
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${rph(1, biz)}" alt="After roof replacement" loading="lazy"></div>
          <div class="ba-before"><img src="${rph(2, biz)}" alt="Before roof replacement" loading="lazy"></div>
          <div class="ba-handle"></div>
          <span class="ba-label ba-label--before">Before</span>
          <span class="ba-label ba-label--after">After</span>
        </div>
        <p style="font-size:.8rem;color:var(--muted);text-align:center;margin-top:.75rem">Storm Damage Repair — ${biz.city || 'Local Area'}</p>
      </div>
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${rph(3, biz)}" alt="After commercial reroof" loading="lazy"></div>
          <div class="ba-before"><img src="${rph(4, biz)}" alt="Before commercial reroof" loading="lazy"></div>
          <div class="ba-handle"></div>
          <span class="ba-label ba-label--before">Before</span>
          <span class="ba-label ba-label--after">After</span>
        </div>
        <p style="font-size:.8rem;color:var(--muted);text-align:center;margin-top:.75rem">Full Residential Reroof — ${biz.city || 'Local Area'}</p>
      </div>
    </div>
  </div>
</section>
${BA_JS}

<!-- 24/7 EMERGENCY -->
<section class="emergency">
  <div class="emergency__inner">
    <div class="emergency__eyebrow">24 / 7 Emergency Line</div>
    <h2 class="emergency__title">Storm Damage? Call Now</h2>
    ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="emergency__phone">${esc(biz.phone)}</a>` : ''}
    <p class="emergency__sub">We dispatch emergency tarping crews same-day. Most insurance claims started within 24 hours of your call.</p>
    <a href="${baseUrl}-contact" class="btn btn-white">Request Free Inspection</a>
  </div>
</section>

<!-- TESTIMONIALS MARQUEE -->
<section class="marquee-section">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Customer Reviews</div>
      <h2 class="section-title">${biz.reviews ? `${biz.reviews}+` : '200+'} Jobs. Counting.</h2>
    </div>
  </div>
  <div class="marquee-wrap">
    <div class="marquee-track">
      ${marqueeReviews.map(r => `
      <div class="review-card">
        <div class="review-card__stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="review-card__text">${esc(r.text)}</p>
        <div class="review-card__author">${esc(r.reviewer)}</div>
        <div class="review-card__meta">${esc(r.svc)} &mdash; ${esc(r.date)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- PROCESS -->
<section class="process">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">How It Works</div>
      <h2 class="section-title">From Call to Completion</h2>
    </div>
    <div class="process__steps">
      ${[
        { n: '1', title: 'Free Inspection', desc: 'We get on the roof and give you an honest assessment — not a phone estimate.' },
        { n: '2', title: 'Detailed Quote', desc: 'Line-item quote with materials, timeline, and cost. No vague numbers.' },
        { n: '3', title: 'Material Selection', desc: 'Choose your shingle style, color, and warranty tier. We guide, you decide.' },
        { n: '4', title: 'Installation Day', desc: 'Same crew, punctual start, full yard protection. Most jobs done in one day.' },
        { n: '5', title: 'Final Walkthrough', desc: 'We walk the property with you, hand over paperwork, and do the magnetic sweep.' },
      ].map((s, i) => `
      <div class="process-step" data-reveal data-delay="${i + 1}">
        <div class="process-step__num">${s.n}</div>
        <div class="process-step__title">${s.title}</div>
        <p class="process-step__desc">${s.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <div class="kicker">Get Started Today</div>
      <h2 class="cta-section__title">Ready for a Roof That Lasts?</h2>
      <p class="cta-section__sub">Free inspections, honest quotes, same-week scheduling. We have been doing this for ${esc(biz.yearsInBiz || '15')} years and our reputation is the only thing we will not compromise.</p>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline">Request Free Inspection</a>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── ABOUT PAGE ─────────────────────────────────────────────────────────────────

function buildAbout(biz: BizPageData, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}
<section class="inner-hero">
  <div class="section-inner">
    <div class="kicker">Our Story</div>
    <h1 class="inner-hero__title">Built from the Ground Up</h1>
    <p class="inner-hero__sub">${esc(biz.yearsInBiz || '15')} years of roofing in ${esc(biz.city || 'the local area')} — started with one crew and a commitment to showing up on time.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center" class="two-col-responsive">
      <div data-reveal>
        <div class="kicker">Who We Are</div>
        <h2 class="section-title" style="margin-bottom:1.5rem">${esc(biz.aboutText || 'More Than a Roofing Company')}</h2>
        <p style="font-size:.95rem;font-weight:300;line-height:1.8;color:var(--muted);margin-bottom:1rem">${esc(biz.aboutText2 || `Founded in ${biz.city || 'the local area'}, ${biz.name} started as a two-person crew focused on one thing: doing the job right. No shortcuts, no upsells, no handoffs to subcontractors.`)}</p>
        <p style="font-size:.95rem;font-weight:300;line-height:1.8;color:var(--muted);margin-bottom:1.5rem">Today we run a team of ${biz.team?.length ? biz.team.length + '+' : '12+'} certified roofers and have replaced or repaired over 200 roofs across the region. Every crew member is trained in-house, background-checked, and covered under our liability policy.</p>
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red">Talk to Our Team</a>` : ''}
      </div>
      <div data-reveal data-delay="2">
        <div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:4/3"><img src="${rph(1, biz)}" alt="Roofing crew at work" style="width:100%;height:100%;object-fit:cover"></div>
      </div>
    </div>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--panel)">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Company Timeline</div>
      <h2 class="section-title">How We Got Here</h2>
    </div>
    <div class="milestones" style="max-width:760px;margin:0 auto">
      <div class="milestone" data-reveal><div class="milestone__year">${parseInt(new Date().getFullYear().toString()) - parseInt(biz.yearsInBiz || '15')}</div><div class="milestone__text">Founded in ${esc(biz.city || 'the area')}. First full year: 18 residential roofs, zero callbacks.</div></div>
      <div class="milestone" data-reveal data-delay="1"><div class="milestone__year">${parseInt(new Date().getFullYear().toString()) - 10}</div><div class="milestone__text">Expanded to commercial roofing. Completed first flat-roof project — a 4,000 sq ft retail building that is still leak-free.</div></div>
      <div class="milestone" data-reveal data-delay="2"><div class="milestone__year">${parseInt(new Date().getFullYear().toString()) - 7}</div><div class="milestone__text">Earned GAF Master Elite status. Fewer than 2% of contractors hold this certification. Extended workmanship warranties to 25 years.</div></div>
      <div class="milestone" data-reveal data-delay="3"><div class="milestone__year">${parseInt(new Date().getFullYear().toString()) - 3}</div><div class="milestone__text">Added in-house insurance claim team. Homeowners stopped fighting adjusters alone. Approval rate: 94%.</div></div>
      <div class="milestone" data-reveal data-delay="4"><div class="milestone__year">${new Date().getFullYear()}</div><div class="milestone__text">200+ roofs replaced. Same crew culture, same standards. Still answering the phone ourselves.</div></div>
    </div>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Meet the Team</div>
      <h2 class="section-title">The People on Your Roof</h2>
    </div>
    <div class="team-grid">
      ${(biz.team?.length ? biz.team.slice(0, 6) : [
        { name: biz.teamName || 'Owner', role: 'Owner & Lead Estimator' },
        { name: 'Project Foreman', role: 'Senior Crew Lead' },
        { name: 'Installation Specialist', role: 'Commercial Roofing' },
      ]).map((m, i) => `
      <div class="team-card" data-reveal data-delay="${(i % 3) + 1}">
        <div class="team-card__photo">
          ${(m as { photo?: string }).photo ? `<img src="${esc((m as { photo?: string }).photo)}" alt="${esc(m.name)}" loading="lazy">` : `<div class="team-card__initials">${esc(m.name.charAt(0))}</div>`}
        </div>
        <div class="team-card__body">
          <div class="team-card__name">${esc(m.name)}</div>
          <div class="team-card__role">${esc(m.role)}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:2.5rem"><a href="${baseUrl}-team" class="btn btn-outline">View Full Team</a></div>
  </div>
</section>

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <div class="kicker">Ready to Start?</div>
      <h2 class="cta-section__title">Get a Free Roof Inspection</h2>
      <p class="cta-section__sub">We inspect before we quote. No phone estimates. No pressure. Just an honest look at your roof and a clear picture of what needs to happen.</p>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline">Schedule Inspection</a>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
<style>@media(max-width:900px){.two-col-responsive{grid-template-columns:1fr !important}}</style>
</body>
</html>`;
}

// ── CONTACT PAGE ───────────────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {
  const q = encodeURIComponent(biz.address || `${biz.city || ''} ${biz.state || ''}`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contact — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}
<section class="inner-hero">
  <div class="section-inner">
    <div class="kicker">Get in Touch</div>
    <h1 class="inner-hero__title">Free Inspection Request</h1>
    <p class="inner-hero__sub">Fill out the form and we will call you back within 2 hours to schedule your free roof inspection.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="contact-layout">
      <div data-reveal>
        <form onsubmit="event.preventDefault();this.innerHTML='<p style=color:var(--primary);font-weight:600;font-size:1.1rem>Request received. We will call you within 2 hours.</p>'">
          <div class="form-row">
            <div class="form-group"><label>First Name</label><input type="text" placeholder="John" required></div>
            <div class="form-group"><label>Last Name</label><input type="text" placeholder="Smith" required></div>
          </div>
          <div class="form-group"><label>Phone Number</label><input type="tel" placeholder="${biz.phone || '(555) 000-0000'}" required></div>
          <div class="form-group"><label>Email Address</label><input type="email" placeholder="john@example.com"></div>
          <div class="form-group"><label>Property Address</label><input type="text" placeholder="123 Main Street"></div>
          <div class="form-group"><label>Service Needed</label>
            <select>
              <option>Free Roof Inspection</option>
              <option>Storm Damage Assessment</option>
              <option>Roof Replacement Quote</option>
              <option>Roof Repair Quote</option>
              <option>Commercial Roofing</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group"><label>Additional Details</label><textarea rows="4" placeholder="Describe any visible damage, recent storms, or specific concerns..."></textarea></div>
          <button type="submit" class="btn btn-red" style="width:100%;justify-content:center;font-size:.9rem;padding:14px 0">Request Free Inspection</button>
        </form>
      </div>
      <div data-reveal data-delay="2">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="contact-info__phone">${esc(biz.phone)}</a><div class="contact-info__label">Call Anytime — 24/7 Emergency Line</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:1.5rem;margin-bottom:2rem">
          ${biz.address ? `<div><div style="font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Office Address</div><div style="font-size:.92rem;font-weight:300;color:rgba(248,250,252,.7)">${esc(biz.address)}</div></div>` : ''}
          <div><div style="font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Business Hours</div><div style="font-size:.88rem;font-weight:300;color:rgba(248,250,252,.7);line-height:1.8">${esc(biz.hours || 'Mon–Fri 7AM–6PM | Sat 8AM–4PM | 24/7 Emergency Line')}</div></div>
          <div><div style="font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Response Time</div><div style="font-size:.88rem;font-weight:300;color:rgba(248,250,252,.7)">We return all calls within 2 hours during business hours. Emergency calls answered immediately.</div></div>
        </div>
        <div class="map-container"><iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-80,25,-65,50&amp;layer=mapnik&amp;marker=${encodeURIComponent((biz.address || '') + ' ' + (biz.city || '') + ' ' + (biz.state || ''))}" allowfullscreen loading="lazy"></iframe></div>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── TEAM PAGE ──────────────────────────────────────────────────────────────────

function buildTeam(biz: BizPageData, baseUrl: string): string {
  const team = biz.team?.length ? biz.team : [
    { name: biz.teamName || 'Owner', role: 'Owner & Lead Estimator' },
    { name: 'Project Foreman', role: 'Senior Crew Lead' },
    { name: 'Installation Specialist', role: 'Commercial Division' },
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Our Team — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}
<section class="inner-hero">
  <div class="section-inner">
    <div class="kicker">The Crew</div>
    <h1 class="inner-hero__title">People You Can Trust</h1>
    <p class="inner-hero__sub">Every member of our team is background-checked, factory-trained, and covered under our company liability policy.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="team-grid">
      ${team.map((m, i) => `
      <div class="team-card" data-reveal data-delay="${(i % 3) + 1}">
        <div class="team-card__photo">
          ${(m as { photo?: string }).photo ? `<img src="${esc((m as { photo?: string }).photo)}" alt="${esc(m.name)}" loading="lazy">` : `<div class="team-card__initials">${esc(m.name.charAt(0))}</div>`}
        </div>
        <div class="team-card__body">
          <div class="team-card__name">${esc(m.name)}</div>
          <div class="team-card__role">${esc(m.role)}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--panel)">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Our Standards</div>
      <h2 class="section-title">How We Build the Team</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:2rem" class="three-col-responsive">
      ${[
        { title: 'Background Checked', desc: 'Every hire goes through a full background check before stepping on a customer property.' },
        { title: 'Factory Trained', desc: 'All installers complete manufacturer training for the product lines we install, not just general roofing.' },
        { title: 'Fully Insured', desc: 'Every crew member is covered under our company liability and workers comp policy — no gaps, no exceptions.' },
      ].map((v, i) => `
      <div class="svc-card" data-reveal data-delay="${i + 1}">
        <div class="svc-card__name">${v.title}</div>
        <p class="svc-card__desc">${v.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <h2 class="cta-section__title">Work With Our Team</h2>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline">Request Inspection</a>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
<style>@media(max-width:800px){.three-col-responsive{grid-template-columns:1fr !important}}</style>
</body>
</html>`;
}

// ── GALLERY PAGE ───────────────────────────────────────────────────────────────

function buildGallery(biz: BizPageData, baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Project Gallery — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}
<section class="inner-hero">
  <div class="section-inner">
    <div class="kicker">Our Work</div>
    <h1 class="inner-hero__title">Project Gallery</h1>
    <p class="inner-hero__sub">Recent residential and commercial roofing projects in ${esc(biz.city || 'the local area')}.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="gallery-grid">
      ${ROOFING_PHOTOS.map((p, i) => `
      <div class="gallery-item" data-reveal data-delay="${(i % 4) + 1}">
        <img src="${biz.photos[i] || p}" alt="Roofing project ${i + 1}" loading="lazy">
        <div class="gallery-item__overlay"></div>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="ba-section">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Transformations</div>
      <h2 class="section-title">Before &amp; After</h2>
      <p style="color:var(--muted);font-size:.9rem;margin-top:.75rem">Drag the handle to compare</p>
    </div>
    <div class="ba-grid">
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${rph(1, biz)}" alt="After" loading="lazy"></div>
          <div class="ba-before"><img src="${rph(2, biz)}" alt="Before" loading="lazy"></div>
          <div class="ba-handle"></div>
          <span class="ba-label ba-label--before">Before</span>
          <span class="ba-label ba-label--after">After</span>
        </div>
      </div>
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${rph(4, biz)}" alt="After" loading="lazy"></div>
          <div class="ba-before"><img src="${rph(3, biz)}" alt="Before" loading="lazy"></div>
          <div class="ba-handle"></div>
          <span class="ba-label ba-label--before">Before</span>
          <span class="ba-label ba-label--after">After</span>
        </div>
      </div>
    </div>
  </div>
</section>
${BA_JS}

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── TESTIMONIALS PAGE ──────────────────────────────────────────────────────────

function buildTestimonials(biz: BizPageData, baseUrl: string): string {
  const reviews = reviewPad(biz, 10);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Customer Reviews — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}
<section class="inner-hero">
  <div class="section-inner">
    <div class="kicker">Customer Reviews</div>
    <h1 class="inner-hero__title">${biz.reviews ? `${biz.reviews}+` : '200+'} Completed Jobs</h1>
    <p class="inner-hero__sub">Real reviews from homeowners and property managers across ${esc(biz.city || 'the area')}.</p>
    ${biz.rating ? `<div style="margin-top:1.25rem;display:flex;align-items:center;justify-content:center;gap:.75rem"><span style="font-family:'Barlow Condensed',sans-serif;font-size:3rem;font-weight:900;color:var(--primary)">${biz.rating}</span><div><div style="color:var(--primary);font-size:1.3rem">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style="font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Average Rating</div></div></div>` : ''}
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem" class="two-col-responsive">
      ${reviews.map((r, i) => `
      <div class="review-card" style="width:auto" data-reveal data-delay="${(i % 2) + 1}">
        <div class="review-card__stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="review-card__text" style="color:rgba(248,250,252,.8)">${esc(r.text)}</p>
        <div class="review-card__author">${esc(r.reviewer)}</div>
        <div class="review-card__meta">${esc(r.svc)} &mdash; ${esc(r.city)} &mdash; ${esc(r.date)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <h2 class="cta-section__title">Ready to Add Your Review?</h2>
      <p class="cta-section__sub">Join hundreds of homeowners who got an honest inspection and a fair price. Free inspection, no obligation.</p>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline">Schedule Inspection</a>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
<style>@media(max-width:800px){.two-col-responsive{grid-template-columns:1fr !important}}</style>
</body>
</html>`;
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────

export function buildRoofingV2AllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home: buildHome(biz, baseUrl),
    about: buildAbout(biz, baseUrl),
    contact: buildContact(biz, baseUrl),
    team: buildTeam(biz, baseUrl),
    gallery: buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
