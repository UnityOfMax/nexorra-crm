/**
 * Exterminator demo website builder v2 — "Rapid Response" bold urgent style.
 * High-contrast black/amber — emphasizes speed and emergency response.
 * Palette: #0c0c0c true black, #141414 panel, #1c1c1c card, #f59e0b amber, #ef4444 red.
 * Fonts: Bebas Neue (display) + Outfit 300-600 (body).
 * Six pages: home, about, contact, team, gallery, testimonials.
 * Features: urgency-forward hero, amber emergency callout, bold numbered services,
 *   response time banner, before/after sliders, pest index, simple 3-step process.
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

const EXT_PHOTOS = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
  'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=800&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  'https://images.unsplash.com/photo-1617369120004-4042c1eec504?w=800&q=80',
  'https://images.unsplash.com/photo-1599597143701-7a0e57dfc9dd?w=800&q=80',
];

function eph(idx: number, biz: BizPageData): string {
  return biz.photos[idx] || EXT_PHOTOS[idx % EXT_PHOTOS.length];
}

function reviewPad(biz: BizPageData, count: number): Array<{ text: string; reviewer: string; city: string; svc: string; date: string }> {
  const padData = [
    { text: 'Called at 9 AM about a roach infestation. Tech was at my door by 11. Treated the whole unit, left detailed instructions, and the problem was gone in 48 hours.', reviewer: 'Maria S.', city: biz.city || 'Local Area', svc: 'Roach Treatment', date: 'April 2025' },
    { text: 'Bed bugs at a rental I manage. Called six places — these were the only ones who could come same day. Thorough heat treatment, full documentation, no comebacks.', reviewer: 'James T.', city: 'East Side', svc: 'Bed Bug Treatment', date: 'March 2025' },
    { text: 'Mice in the walls. They found and sealed four entry points I never would have noticed. Zero mice since. Fast and clean.', reviewer: 'Carol R.', city: biz.city || 'North District', svc: 'Rodent Control', date: 'February 2025' },
    { text: 'Discovered termites on a Friday afternoon. They were there by 6 PM, assessed the damage, started treatment that evening. Saved us a much bigger bill.', reviewer: 'David & Kim N.', city: 'West Metro', svc: 'Termite Treatment', date: 'January 2025' },
    { text: 'Wasp nest inside the wall cavity — not just under the eave. They opened the wall, removed it, treated, and patched the entry point the same day.', reviewer: 'Phil A.', city: biz.city || 'South Side', svc: 'Wasp Removal', date: 'October 2024' },
    { text: 'Three quotes, three different prices, three different opinions. These guys inspected first, gave me one clear answer, and were 40% cheaper than the biggest quote.', reviewer: 'Sandra M.', city: biz.city || 'West Side', svc: 'Pest Inspection', date: 'September 2024' },
    { text: 'They came at 7 PM because that was what worked for us. No extra charge for evening service. Problem diagnosed and treated in one visit.', reviewer: 'Tony H.', city: 'Lakeside', svc: 'General Pest Control', date: 'August 2024' },
    { text: 'Called about ants but they noticed signs of a moisture issue feeding the problem. Fixed the real source first instead of just treating symptoms. Smart team.', reviewer: 'Rachel B.', city: 'Millbrook', svc: 'Ant Treatment', date: 'July 2024' },
    { text: 'Apartment building, 24 units. They staged the treatment floor by floor with minimal disruption to tenants. Professional operation from top to bottom.', reviewer: 'Property Mgmt Co.', city: biz.city || 'Downtown', svc: 'Commercial Extermination', date: 'June 2024' },
    { text: 'Came back twice on the guarantee without a single complaint. Third visit was the last — completely gone. That is the kind of service that earns a customer for life.', reviewer: 'Frank L.', city: biz.city || 'North Metro', svc: 'General Pest Control', date: 'April 2024' },
  ];
  const base = (biz.reviewTexts || []).map((text, i) => ({
    text,
    reviewer: padData[i]?.reviewer || 'Verified Customer',
    city: padData[i]?.city || biz.city || 'Local Area',
    svc: padData[i]?.svc || 'Extermination Service',
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
  void biz;
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:#0c0c0c;
  --panel:#141414;
  --card:#1c1c1c;
  --amber:#f59e0b;
  --amber-hover:#d97706;
  --red:#ef4444;
  --white:#fafafa;
  --muted:#9ca3af;
  --border:rgba(245,158,11,0.2);
  --section-pad:clamp(4rem,8vw,7rem);
  --radius:8px;
  --tr:.3s cubic-bezier(.4,0,.2,1);
}
body{font-family:'Outfit',system-ui,sans-serif;background:var(--bg);color:var(--white);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{text-decoration:none;color:inherit}
img{display:block;max-width:100%}
${DATA_REVEAL_CSS}

/* ── Bebas display ── */
.bebas{font-family:'Bebas Neue',Impact,sans-serif;letter-spacing:.03em}

/* ── Buttons ── */
.btn{display:inline-block;font-family:'Outfit',sans-serif;font-weight:600;font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all var(--tr);border:none;border-radius:4px}
.btn-amber{background:var(--amber);color:#0c0c0c;padding:13px 30px}
.btn-amber:hover{background:var(--amber-hover);transform:translateY(-2px)}
.btn-red{background:var(--red);color:#fff;padding:13px 30px}
.btn-red:hover{background:#dc2626;transform:translateY(-2px)}
.btn-outline{border:1.5px solid rgba(245,158,11,.4);color:var(--amber);padding:12px 29px;background:transparent}
.btn-outline:hover{background:var(--amber);color:#0c0c0c;border-color:var(--amber)}
.btn-outline-white{border:1.5px solid rgba(250,250,250,.2);color:var(--white);padding:12px 29px;background:transparent}
.btn-outline-white:hover{border-color:rgba(250,250,250,.6);background:rgba(250,250,250,.06)}

/* ── Kicker ── */
.kicker{font-family:'Bebas Neue',Impact,sans-serif;font-size:.95rem;letter-spacing:.22em;color:var(--amber)}

/* ── Site Header ── */
.site-header{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(12,12,12,.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(245,158,11,.12);transition:border-color .3s}
.site-header.scrolled{border-bottom-color:rgba(245,158,11,.25)}
.header__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;height:68px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1rem}
.header__nav{display:flex;align-items:center;gap:1.75rem}
.header__nav--right{justify-content:flex-end;gap:1rem}
.header__nav a{font-size:.78rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);transition:color var(--tr)}
.header__nav a:hover{color:var(--white)}
.header__logo{text-align:center}
.header__logo-text{font-family:'Bebas Neue',Impact,sans-serif;font-size:1.5rem;letter-spacing:.08em;color:var(--white);line-height:1}
.header__logo-phone{font-size:.68rem;font-weight:500;letter-spacing:.1em;color:var(--amber);margin-top:1px}
.header__burger{display:none;background:none;border:none;cursor:pointer;padding:4px;flex-direction:column;gap:5px}
.header__burger span{display:block;width:24px;height:2px;background:var(--white)}
@media(max-width:900px){.header__nav{display:none}.header__inner{grid-template-columns:1fr auto}.header__burger{display:flex}}

/* ── Mobile menu ── */
.mobile-menu{position:fixed;inset:0;background:var(--panel);z-index:200;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1.75rem;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1)}
.mobile-menu.open{transform:translateX(0)}
.mobile-menu a{font-family:'Bebas Neue',Impact,sans-serif;font-size:3rem;letter-spacing:.08em;color:var(--white)}
.mobile-menu a:hover{color:var(--amber)}
.mobile-close{position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;cursor:pointer;font-size:1.8rem;color:var(--white)}

/* ── Hero ── */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden}
.hero__bg{position:absolute;inset:0;background:url('') center/cover no-repeat}
.hero__overlay{position:absolute;inset:0;background:linear-gradient(to right,rgba(12,12,12,.95) 50%,rgba(12,12,12,.6))}
.hero__inner{max-width:1320px;margin:0 auto;padding:6rem 1.5rem 4rem;position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
@media(max-width:900px){.hero__inner{grid-template-columns:1fr}.hero__overlay{background:rgba(12,12,12,.85)}}
.hero__eyebrow{font-family:'Bebas Neue',sans-serif;font-size:.95rem;letter-spacing:.22em;color:var(--amber);margin-bottom:.75rem}
.hero__title{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(4rem,10vw,7.5rem);color:var(--white);letter-spacing:.03em;line-height:.9;margin-bottom:1rem}
.hero__title em{color:var(--amber);font-style:normal;display:block}
.hero__phone{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(2.2rem,5vw,3.8rem);color:var(--amber);letter-spacing:.04em;line-height:1;margin-bottom:.35rem;display:block}
.hero__phone-label{font-size:.72rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:2rem}
.hero__urgency{font-size:.92rem;font-weight:300;color:rgba(250,250,250,.75);margin-bottom:2rem;line-height:1.65;max-width:420px}
.hero__ctas{display:flex;gap:.85rem;flex-wrap:wrap}
.hero__photo-wrap{border-radius:var(--radius);overflow:hidden;aspect-ratio:3/4;border:1px solid var(--border)}
.hero__photo-wrap img{width:100%;height:100%;object-fit:cover}

/* ── Trust strip ── */
.trust-strip{background:var(--amber);padding:.75rem 0;overflow-x:auto}
.trust-strip__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:nowrap;white-space:nowrap}
.trust-strip__item{display:flex;align-items:center;gap:.4rem;padding:0 1.5rem;font-family:'Outfit',sans-serif;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#0c0c0c}
.trust-strip__divider{width:1px;height:20px;background:rgba(12,12,12,.25);flex-shrink:0}

/* ── Emergency callout ── */
.emergency-callout{padding:4rem 0;background:var(--panel);border-bottom:1px solid var(--border)}
.emergency-callout__inner{max-width:900px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1fr auto;gap:2rem;align-items:center}
@media(max-width:700px){.emergency-callout__inner{grid-template-columns:1fr}}
.emergency-callout__tag{font-family:'Bebas Neue',Impact,sans-serif;font-size:.95rem;letter-spacing:.2em;color:var(--amber);margin-bottom:.5rem}
.emergency-callout__title{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(2rem,5vw,3.5rem);color:var(--white);line-height:.95;margin-bottom:.75rem}
.emergency-callout__sub{font-size:.9rem;font-weight:300;color:var(--muted);max-width:440px}
.emergency-callout__right{display:flex;flex-direction:column;gap:.75rem;align-items:flex-start}
.emergency-callout__phone{font-family:'Bebas Neue',sans-serif;font-size:clamp(2rem,4vw,3rem);color:var(--amber);letter-spacing:.04em;line-height:1}
.emergency-callout__form{display:flex;gap:.5rem;flex-wrap:wrap}
.emergency-callout__form input{background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--white);font-family:'Outfit',sans-serif;font-size:.88rem;padding:.75rem 1rem;border-radius:4px;outline:none;transition:border-color var(--tr);min-width:200px}
.emergency-callout__form input::placeholder{color:rgba(250,250,250,.25)}
.emergency-callout__form input:focus{border-color:var(--amber)}

/* ── Section inner ── */
.section-inner{max-width:1320px;margin:0 auto;padding:0 1.5rem}
.section-header{text-align:center;margin-bottom:3.5rem}
.section-title{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(2.5rem,6vw,5rem);color:var(--white);letter-spacing:.04em;line-height:.95;margin-top:.3rem}

/* ── Numbered services ── */
.services{padding:var(--section-pad) 0;background:var(--bg)}
.svc-list{display:flex;flex-direction:column;gap:0;margin-top:3rem}
.svc-item{display:grid;grid-template-columns:80px 1fr auto;gap:2rem;align-items:start;padding:2.5rem 0;border-bottom:1px solid var(--border);transition:background var(--tr)}
.svc-item:first-child{border-top:1px solid var(--border)}
.svc-item:hover{background:rgba(245,158,11,.03)}
@media(max-width:800px){.svc-item{grid-template-columns:60px 1fr}.svc-item-price{display:none}}
.svc-item__num{font-family:'Bebas Neue',Impact,sans-serif;font-size:3.5rem;color:rgba(245,158,11,.2);line-height:1;padding-top:.2rem}
.svc-item__name{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(1.6rem,3.5vw,2.2rem);color:var(--white);letter-spacing:.04em;margin-bottom:.4rem}
.svc-item__pests{font-size:.78rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--amber);margin-bottom:.6rem}
.svc-item__desc{font-size:.9rem;font-weight:300;line-height:1.7;color:var(--muted);max-width:500px}
.svc-item__guarantee{font-size:.78rem;font-weight:500;color:rgba(245,158,11,.75);margin-top:.5rem;display:flex;align-items:center;gap:.4rem}
.svc-item-price{text-align:right}
.svc-item__price{font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--amber);letter-spacing:.04em}
.svc-item__price-label{font-size:.7rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-top:.2rem}

/* ── Response time banner ── */
.response-banner{background:var(--amber);padding:3.5rem 0}
.response-banner__inner{max-width:900px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
@media(max-width:700px){.response-banner__inner{grid-template-columns:1fr}}
.response-banner__num{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(5rem,12vw,9rem);color:#0c0c0c;letter-spacing:.01em;line-height:.85}
.response-banner__unit{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(1.5rem,3vw,2.5rem);color:rgba(12,12,12,.6);letter-spacing:.06em}
.response-banner__label{font-size:.8rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(12,12,12,.7);margin-top:.25rem}
.response-banner__desc{font-size:1rem;font-weight:400;line-height:1.7;color:rgba(12,12,12,.8)}

/* ── Pest index ── */
.pest-index{padding:var(--section-pad) 0;background:var(--panel)}
.pest-index__grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1rem;margin-top:3rem}
@media(max-width:900px){.pest-index__grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:580px){.pest-index__grid{grid-template-columns:repeat(2,1fr)}}
.pest-index-card{background:var(--card);border:1px solid rgba(245,158,11,.1);border-radius:var(--radius);padding:1.25rem;text-align:center;transition:border-color var(--tr),transform var(--tr)}
.pest-index-card:hover{border-color:var(--border);transform:translateY(-3px)}
.pest-index-card__name{font-family:'Bebas Neue',Impact,sans-serif;font-size:1.1rem;letter-spacing:.06em;color:var(--white);margin-top:.6rem;margin-bottom:.2rem}
.pest-index-card__tag{font-size:.7rem;font-weight:500;color:var(--muted)}

/* ── Before/After ── */
.ba-section{padding:var(--section-pad) 0;background:var(--bg)}
.ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:3rem}
@media(max-width:800px){.ba-grid{grid-template-columns:1fr}}
.ba-container{position:relative;aspect-ratio:16/10;overflow:hidden;border-radius:var(--radius);cursor:ew-resize;user-select:none;border:1px solid var(--border)}
.ba-after,.ba-before{position:absolute;inset:0}
.ba-after img,.ba-before img{width:100%;height:100%;object-fit:cover}
.ba-before{clip-path:inset(0 50% 0 0)}
.ba-handle{position:absolute;top:0;bottom:0;left:50%;width:3px;background:var(--amber);transform:translateX(-50%);cursor:ew-resize}
.ba-handle::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;background:var(--amber);border-radius:50%;border:3px solid #0c0c0c}
.ba-label{position:absolute;bottom:.75rem;font-size:.65rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#0c0c0c;background:var(--amber);padding:4px 10px;border-radius:3px}
.ba-label--before{left:.75rem}
.ba-label--after{right:.75rem}

/* ── Guarantee ── */
.guarantee{padding:var(--section-pad) 0;background:var(--panel);border-top:1px solid var(--border)}
.guarantee__inner{max-width:820px;margin:0 auto;padding:0 1.5rem;text-align:center}
.guarantee__title{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(3rem,7vw,5.5rem);color:var(--white);letter-spacing:.04em;line-height:.92;margin-top:.4rem}
.guarantee__title em{color:var(--amber);font-style:normal}
.guarantee__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-top:1.25rem;line-height:1.7;max-width:560px;margin-left:auto;margin-right:auto;margin-bottom:2.5rem}

/* ── Testimonials ── */
.testimonials{padding:var(--section-pad) 0;background:var(--bg)}
.testimonials__grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;margin-top:3rem}
@media(max-width:800px){.testimonials__grid{grid-template-columns:1fr}}
.review-card{background:var(--card);border:1px solid rgba(245,158,11,.15);border-radius:var(--radius);padding:1.75rem;transition:border-color var(--tr)}
.review-card:hover{border-color:var(--border)}
.review-card__stars{color:var(--amber);font-size:.95rem;letter-spacing:.15em;margin-bottom:.85rem}
.review-card__text{font-size:.9rem;font-weight:300;line-height:1.75;color:rgba(250,250,250,.8);margin-bottom:1rem}
.review-card__author{font-family:'Outfit',sans-serif;font-size:.82rem;font-weight:600;color:var(--white)}
.review-card__meta{font-size:.75rem;font-weight:300;color:var(--muted);margin-top:.2rem}

/* ── Process ── */
.process{padding:var(--section-pad) 0;background:var(--panel)}
.process__steps{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;margin-top:3rem}
@media(max-width:700px){.process__steps{grid-template-columns:1fr}}
.process-step{padding:2.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);position:relative;overflow:hidden;transition:border-color var(--tr)}
.process-step:hover{border-color:rgba(245,158,11,.4)}
.process-step::before{content:attr(data-step);position:absolute;top:-.5rem;right:.75rem;font-family:'Bebas Neue',Impact,sans-serif;font-size:8rem;color:rgba(245,158,11,.05);line-height:1;letter-spacing:.02em}
.process-step__num{font-family:'Bebas Neue',Impact,sans-serif;font-size:1rem;letter-spacing:.18em;color:var(--amber);margin-bottom:.5rem}
.process-step__title{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(1.6rem,3vw,2.2rem);color:var(--white);letter-spacing:.04em;margin-bottom:.75rem}
.process-step__desc{font-size:.9rem;font-weight:300;line-height:1.7;color:var(--muted)}

/* ── CTA ── */
.cta-section{padding:var(--section-pad) 0;background:var(--bg)}
.cta-section__inner{max-width:820px;margin:0 auto;padding:0 1.5rem;text-align:center}
.cta-section__title{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(3rem,8vw,6rem);color:var(--white);letter-spacing:.04em;line-height:.92}
.cta-section__title em{color:var(--amber);font-style:normal}
.cta-section__sub{font-size:1rem;font-weight:300;color:var(--muted);margin:1.25rem 0 2.5rem;line-height:1.7}
.cta-section__ctas{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}

/* ── Footer ── */
.footer{background:var(--panel);border-top:1px solid var(--border);padding:4rem 0 0}
.footer__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:3rem;margin-bottom:3rem}
@media(max-width:800px){.footer__inner{grid-template-columns:1fr 1fr}}
@media(max-width:500px){.footer__inner{grid-template-columns:1fr}}
.footer__logo{font-family:'Bebas Neue',Impact,sans-serif;font-size:1.6rem;letter-spacing:.08em;color:var(--white);margin-bottom:.5rem}
.footer__tagline{font-size:.85rem;font-weight:300;color:var(--muted);line-height:1.65;max-width:260px;margin-bottom:1.5rem}
.footer__col-title{font-size:.68rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:rgba(250,250,250,.3);margin-bottom:1rem}
.footer__links{display:flex;flex-direction:column;gap:.5rem}
.footer__links a{font-size:.85rem;font-weight:300;color:var(--muted);transition:color var(--tr)}
.footer__links a:hover{color:var(--white)}
.footer__bottom{border-top:1px solid var(--border);padding:1.25rem 1.5rem;max-width:1320px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem}
.footer__copy{font-size:.78rem;font-weight:300;color:rgba(250,250,250,.3)}

/* ── Inner pages ── */
.inner-hero{padding:10rem 0 5rem;background:var(--panel);border-bottom:1px solid var(--border);text-align:center}
.inner-hero__title{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(3rem,9vw,7rem);color:var(--white);letter-spacing:.04em;line-height:.9;margin-top:.4rem}
.inner-hero__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-top:1rem;max-width:540px;margin-left:auto;margin-right:auto}

/* ── Team ── */
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem}
@media(max-width:800px){.team-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:500px){.team-grid{grid-template-columns:1fr}}
.team-card{background:var(--card);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)}
.team-card__photo{aspect-ratio:1/1;overflow:hidden;background:var(--panel)}
.team-card__photo img{width:100%;height:100%;object-fit:cover}
.team-card__initials{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',Impact,sans-serif;font-size:4rem;letter-spacing:.04em;color:var(--amber)}
.team-card__body{padding:1.25rem}
.team-card__name{font-family:'Bebas Neue',Impact,sans-serif;font-size:1.3rem;letter-spacing:.06em;color:var(--white);margin-bottom:.2rem}
.team-card__role{font-size:.75rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--amber)}

/* ── Gallery ── */
.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3rem}
@media(max-width:700px){.gallery-grid{grid-template-columns:repeat(2,1fr)}}
.gallery-item{aspect-ratio:4/3;overflow:hidden;border-radius:var(--radius);position:relative;border:1px solid var(--border)}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.gallery-item:hover img{transform:scale(1.07)}

/* ── Contact ── */
.contact-layout{display:grid;grid-template-columns:1.1fr 1fr;gap:4rem;align-items:start;margin-top:3rem}
@media(max-width:900px){.contact-layout{grid-template-columns:1fr}}
.form-group{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.85rem}
.form-group label{font-size:.68rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(250,250,250,.4)}
.form-group input,.form-group select,.form-group textarea{background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--white);font-family:'Outfit',sans-serif;font-size:.9rem;font-weight:300;padding:.85rem 1rem;width:100%;outline:none;border-radius:4px;transition:border-color var(--tr)}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--amber)}
.form-group input::placeholder,.form-group textarea::placeholder{color:rgba(250,250,250,.2)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}
@media(max-width:580px){.form-row{grid-template-columns:1fr}}
.map-container{border-radius:var(--radius);overflow:hidden;height:260px;margin-top:1.5rem;border:1px solid var(--border)}
.map-container iframe{width:100%;height:100%;border:none}

@media(max-width:580px){.hero__ctas,.cta-section__ctas{flex-direction:column;align-items:stretch}}
</style>`;
}

// ── Header ─────────────────────────────────────────────────────────────────────

function header(biz: BizPageData, baseUrl: string): string {
  return `<header class="site-header" id="site-header">
  <div class="header__inner">
    <nav class="header__nav">
      <a href="${baseUrl}">Home</a>
      <a href="${baseUrl}-about">About</a>
      <a href="${baseUrl}-gallery">Gallery</a>
    </nav>
    <div class="header__logo">
      <div class="header__logo-text">${esc(biz.name)}</div>
      ${biz.phone ? `<div class="header__logo-phone">${esc(biz.phone)}</div>` : ''}
    </div>
    <nav class="header__nav header__nav--right">
      <a href="${baseUrl}-team">Team</a>
      <a href="${baseUrl}-testimonials">Reviews</a>
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Call Now</a>` : `<a href="${baseUrl}-contact" class="btn btn-amber">Call Now</a>`}
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
  <a href="${baseUrl}-gallery">Gallery</a>
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
      <p class="footer__tagline">Licensed exterminator serving ${esc(biz.city || 'the local area')}${biz.state ? ', ' + esc(biz.state) : ''}. Same-day service. 30-day re-treatment guarantee.</p>
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber" style="margin-top:1rem">${esc(biz.phone)}</a>` : ''}
    </div>
    <div>
      <div class="footer__col-title">Services</div>
      <div class="footer__links">
        <a href="${baseUrl}">Roach Extermination</a>
        <a href="${baseUrl}">Bed Bug Treatment</a>
        <a href="${baseUrl}">Rodent Control</a>
        <a href="${baseUrl}">Termite Treatment</a>
        <a href="${baseUrl}">Wasp Removal</a>
      </div>
    </div>
    <div>
      <div class="footer__col-title">Company</div>
      <div class="footer__links">
        <a href="${baseUrl}-about">About Us</a>
        <a href="${baseUrl}-gallery">Gallery</a>
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
  const reviews = reviewPad(biz, 8);
  const svcs = biz.services?.length ? biz.services : [
    { name: 'Roach &amp; Ant Extermination', desc: 'Full interior and exterior treatment. Gel baits, crack-and-crevice application, and exterior barrier.', price: 'From $129', duration: undefined },
    { name: 'Bed Bug Elimination', desc: 'Chemical treatment or heat option. Full inspection, preparation guide, and 30-day follow-up included.', price: 'From $349', duration: undefined },
    { name: 'Rodent Control', desc: 'Entry point audit, sealing, trap deployment, and monitoring visits. Prevents re-entry — not just removal.', price: 'From $199', duration: undefined },
    { name: 'Termite Treatment', desc: 'Liquid barrier or bait station systems based on species and structure type. 1-year monitoring included.', price: 'Custom quote', duration: undefined },
    { name: 'Wasp &amp; Hornet Removal', desc: 'Same-day nest removal for accessible and in-wall nests. Property treated to prevent rebuilding.', price: 'From $99', duration: undefined },
  ];

  const pestIndex = [
    { name: 'Roaches', tag: 'Same day' },
    { name: 'Bed Bugs', tag: 'Heat + chemical' },
    { name: 'Rodents', tag: 'Seal + trap' },
    { name: 'Termites', tag: 'Barrier + bait' },
    { name: 'Ants', tag: 'Colony elimination' },
    { name: 'Wasps', tag: 'Same-day removal' },
    { name: 'Spiders', tag: 'Interior + exterior' },
    { name: 'Silverfish', tag: 'Moisture + treatment' },
    { name: 'Mosquitoes', tag: 'Yard spray program' },
    { name: 'Fleas', tag: 'Interior treatment' },
  ];

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
  <div class="hero__bg" style="background-image:url('${eph(0, biz).replace('w=800', 'w=1920')}')"></div>
  <div class="hero__overlay"></div>
  <div class="hero__inner">
    <div>
      <div class="hero__eyebrow">Licensed &amp; Insured &mdash; ${esc(biz.city || 'Local Area')}</div>
      <h1 class="hero__title">
        Same-Day<br>
        <em>Extermination</em>
      </h1>
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="hero__phone">${esc(biz.phone)}</a><div class="hero__phone-label">24/7 Emergency Line</div>` : ''}
      <p class="hero__urgency">${esc(biz.heroSub || "Don't wait. One call removes the problem. We have same-day availability for most pest issues.")}</p>
      <div class="hero__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Call for Same-Day Service</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Get a Quote</a>
      </div>
    </div>
    <div style="display:none" class="hero-photo-col">
      <div class="hero__photo-wrap"><img src="${eph(1, biz)}" alt="Exterminator at work" loading="eager"></div>
    </div>
  </div>
</section>
<style>@media(min-width:900px){.hero-photo-col{display:block !important}}</style>

<!-- TRUST STRIP -->
<div class="trust-strip">
  <div class="trust-strip__inner">
    <span class="trust-strip__item">Licensed &amp; Insured</span>
    <div class="trust-strip__divider"></div>
    <span class="trust-strip__item">Same-Day Service</span>
    <div class="trust-strip__divider"></div>
    <span class="trust-strip__item">100% Satisfaction Guaranteed</span>
    <div class="trust-strip__divider"></div>
    <span class="trust-strip__item">24/7 Emergency Line</span>
  </div>
</div>

<!-- EMERGENCY CALLOUT -->
<section class="emergency-callout">
  <div class="emergency-callout__inner">
    <div>
      <div class="emergency-callout__tag">Pest Emergency</div>
      <h2 class="emergency-callout__title">We Can Be There Today</h2>
      <p class="emergency-callout__sub">Call before noon and we are usually there by end of day. No extra charge for same-day response.</p>
    </div>
    <div class="emergency-callout__right">
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="emergency-callout__phone">${esc(biz.phone)}</a>` : ''}
      <form class="emergency-callout__form" onsubmit="event.preventDefault();this.innerHTML='<p style=color:var(--amber);font-weight:600>We will call you back within 15 minutes.</p>'">
        <input type="tel" placeholder="Your phone number" required>
        <button type="submit" class="btn btn-amber">Get Same-Day Quote</button>
      </form>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section class="services">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">What We Treat</div>
      <h2 class="section-title">Extermination Services</h2>
    </div>
    <div class="svc-list">
      ${svcs.map((s, i) => `
      <div class="svc-item" data-reveal>
        <div class="svc-item__num">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <div class="svc-item__name">${s.name}</div>
          <div class="svc-item__pests">${s.desc.split('.')[0]}</div>
          <p class="svc-item__desc">${esc(s.desc)}</p>
          <div class="svc-item__guarantee">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            30-day re-treatment guarantee
          </div>
        </div>
        <div class="svc-item-price">
          <div class="svc-item__price">${esc(s.price)}</div>
          <div class="svc-item__price-label">Starting at</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- RESPONSE TIME BANNER -->
<section class="response-banner">
  <div class="response-banner__inner">
    <div>
      <div class="response-banner__num">2</div>
      <div class="response-banner__unit">Hours</div>
      <div class="response-banner__label">Average Response Time</div>
    </div>
    <div>
      <p class="response-banner__desc">When you have a pest problem, waiting days is not an option. Our average response time for confirmed bookings is under two hours. Call before noon and you will typically have a technician at your door before dinner.</p>
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-red" style="margin-top:1.5rem">${esc(biz.phone)}</a>` : ''}
    </div>
  </div>
</section>

<!-- PEST INDEX -->
<section class="pest-index">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Full Coverage</div>
      <h2 class="section-title">Every Pest We Handle</h2>
    </div>
    <div class="pest-index__grid">
      ${pestIndex.map((p, i) => `
      <div class="pest-index-card" data-reveal data-delay="${(i % 5) + 1}">
        <svg width="22" height="22" fill="none" stroke="#f59e0b" stroke-width="1.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div class="pest-index-card__name">${p.name}</div>
        <div class="pest-index-card__tag">${p.tag}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- BEFORE/AFTER -->
<section class="ba-section">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Results</div>
      <h2 class="section-title">Before &amp; After</h2>
      <p style="color:var(--muted);font-size:.9rem;margin-top:.5rem">Drag the handle to compare</p>
    </div>
    <div class="ba-grid">
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${eph(1, biz)}" alt="After treatment" loading="lazy"></div>
          <div class="ba-before"><img src="${eph(2, biz)}" alt="Before treatment" loading="lazy"></div>
          <div class="ba-handle"></div>
          <span class="ba-label ba-label--before">Before</span>
          <span class="ba-label ba-label--after">After</span>
        </div>
      </div>
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${eph(4, biz)}" alt="After treatment" loading="lazy"></div>
          <div class="ba-before"><img src="${eph(3, biz)}" alt="Before treatment" loading="lazy"></div>
          <div class="ba-handle"></div>
          <span class="ba-label ba-label--before">Before</span>
          <span class="ba-label ba-label--after">After</span>
        </div>
      </div>
    </div>
  </div>
</section>
${BA_JS}

<!-- GUARANTEE -->
<section class="guarantee">
  <div class="guarantee__inner" data-reveal>
    <div class="kicker">Our Promise</div>
    <h2 class="guarantee__title">Our No-Pest<br><em>Guarantee</em></h2>
    <p class="guarantee__sub">If the pests we treated return within 30 days of your service, we come back and re-treat at no charge. No forms to fill out, no approvals needed. Just call us and we will be there.</p>
    ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Call ${esc(biz.phone)}</a>` : `<a href="${baseUrl}-contact" class="btn btn-amber">Book Service</a>`}
  </div>
</section>

<!-- TESTIMONIALS -->
<section class="testimonials">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Reviews</div>
      <h2 class="section-title">${biz.reviews ? biz.reviews + '+' : '1,000+'} Jobs. Done Right.</h2>
    </div>
    <div class="testimonials__grid">
      ${reviews.slice(0, 4).map((r, i) => `
      <div class="review-card" data-reveal data-delay="${(i % 2) + 1}">
        <div class="review-card__stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="review-card__text">${esc(r.text)}</p>
        <div class="review-card__author">${esc(r.reviewer)}</div>
        <div class="review-card__meta">${esc(r.svc)} &mdash; ${esc(r.date)}</div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:2.5rem"><a href="${baseUrl}-testimonials" class="btn btn-outline-white">View All Reviews</a></div>
  </div>
</section>

<!-- PROCESS -->
<section class="process">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">How It Works</div>
      <h2 class="section-title">Three Steps. Problem Solved.</h2>
    </div>
    <div class="process__steps">
      <div class="process-step" data-step="1" data-reveal data-delay="1">
        <div class="process-step__num">Step 01</div>
        <div class="process-step__title">Call Us</div>
        <p class="process-step__desc">Call or text. We pick up. Tell us what you are dealing with and we will confirm your same-day or next-day slot before you hang up.</p>
      </div>
      <div class="process-step" data-step="2" data-reveal data-delay="2">
        <div class="process-step__num">Step 02</div>
        <div class="process-step__title">We Arrive</div>
        <p class="process-step__desc">Technician shows up in the confirmed window, inspects the property, explains exactly what they will treat and with what products. No surprises.</p>
      </div>
      <div class="process-step" data-step="3" data-reveal data-delay="3">
        <div class="process-step__num">Step 03</div>
        <div class="process-step__title">Problem Solved</div>
        <p class="process-step__desc">Treatment done, property documented, guarantee in writing. If pests return within 30 days, we come back for free. That is the whole deal.</p>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <div class="kicker">Book Today</div>
      <h2 class="cta-section__title">Book<br><em>Same-Day</em><br>Service</h2>
      <p class="cta-section__sub">Licensed, insured, and ready to be at your door today. ${esc(biz.yearsInBiz || '15')} years eliminating pests across ${esc(biz.city || 'the area')}.</p>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Request Quote</a>
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
    <div class="kicker">About Us</div>
    <h1 class="inner-hero__title">No Corners Cut</h1>
    <p class="inner-hero__sub">${esc(biz.yearsInBiz || '15')} years in ${esc(biz.city || 'the area')} doing the job that needs doing.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center" class="two-col">
      <div data-reveal>
        <div class="kicker">Who We Are</div>
        <h2 class="section-title" style="margin-bottom:1.5rem">${esc(biz.aboutText || 'Local Experts. No Franchise.')}</h2>
        <p style="font-size:.95rem;font-weight:300;line-height:1.8;color:var(--muted);margin-bottom:1rem">${esc(biz.aboutText2 || `${biz.name} is an independent extermination company based in ${biz.city || 'the area'}. We are not a franchise and we do not subcontract. Every technician who comes to your door works for us directly.`)}</p>
        <p style="font-size:.95rem;font-weight:300;line-height:1.8;color:var(--muted);margin-bottom:1.5rem">We started because we thought homeowners were being oversold by the big chains — paying for quarterly plans they did not need and waiting a week for a problem that needed fixing today. We built the company around speed, honesty, and a guarantee we actually stand behind.</p>
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Talk to Our Team</a>` : ''}
      </div>
      <div data-reveal data-delay="2">
        <div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:4/3;border:1px solid var(--border)"><img src="${eph(1, biz)}" alt="Exterminator team" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>
      </div>
    </div>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--panel)">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Our Standards</div>
      <h2 class="section-title">How We Operate</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:2rem" class="three-col">
      ${[
        { title: 'Same-Day Priority', desc: 'We schedule same-day appointments for most active infestations. Pest problems do not wait, and neither do we.' },
        { title: 'Product Transparency', desc: 'You know what we are applying before we apply it. Every product, every location, every visit — documented.' },
        { title: '30-Day Guarantee', desc: 'If treated pests return within 30 days, we come back at no charge. No restrictions, no paperwork.' },
      ].map((v, i) => `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem" data-reveal data-delay="${i + 1}">
        <div style="font-family:'Bebas Neue',Impact,sans-serif;font-size:1.5rem;letter-spacing:.06em;color:var(--amber);margin-bottom:.65rem">${v.title}</div>
        <p style="font-size:.88rem;font-weight:300;line-height:1.7;color:var(--muted)">${v.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <h2 class="cta-section__title">Ready to Work With Us?</h2>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Get a Quote</a>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
<style>@media(max-width:900px){.two-col,.three-col{grid-template-columns:1fr !important}}</style>
</body>
</html>`;
}

// ── CONTACT PAGE ───────────────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {
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
    <div class="kicker">Contact Us</div>
    <h1 class="inner-hero__title">Get Same-Day Service</h1>
    <p class="inner-hero__sub">Call or fill out the form. We confirm all appointments within 15 minutes during business hours.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="contact-layout">
      <div data-reveal>
        <form onsubmit="event.preventDefault();this.innerHTML='<p style=color:var(--amber);font-family:Bebas Neue,sans-serif;font-size:1.5rem;letter-spacing:.06em>Request received. We will call you within 15 minutes.</p>'">
          <div class="form-row">
            <div class="form-group"><label>First Name</label><input type="text" placeholder="John" required></div>
            <div class="form-group"><label>Last Name</label><input type="text" placeholder="Smith" required></div>
          </div>
          <div class="form-group"><label>Phone Number</label><input type="tel" placeholder="${biz.phone || '(555) 000-0000'}" required></div>
          <div class="form-group"><label>Address</label><input type="text" placeholder="123 Main Street, ${biz.city || 'Your City'}"></div>
          <div class="form-group"><label>Pest Issue</label>
            <select>
              <option>Not sure / general inspection</option>
              <option>Roaches</option>
              <option>Bed Bugs</option>
              <option>Mice / Rats</option>
              <option>Termites</option>
              <option>Ants</option>
              <option>Wasps / Hornets</option>
              <option>Spiders</option>
              <option>Fleas</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group"><label>Urgency</label>
            <select>
              <option>Same-day if possible</option>
              <option>Within 24 hours</option>
              <option>This week</option>
              <option>Just getting a quote</option>
            </select>
          </div>
          <div class="form-group"><label>Details</label><textarea rows="4" placeholder="Where have you seen the pests? How long has this been going on? Any treatments already tried?"></textarea></div>
          <button type="submit" class="btn btn-amber" style="width:100%;font-size:.9rem;padding:14px 0;text-align:center">Request Same-Day Service</button>
        </form>
      </div>
      <div data-reveal data-delay="2">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" style="font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(2rem,5vw,3.5rem);letter-spacing:.04em;color:var(--amber);display:block;margin-bottom:.3rem">${esc(biz.phone)}</a><div style="font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:2rem">24/7 Emergency Line</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:1.5rem;margin-bottom:2rem">
          ${biz.address ? `<div><div style="font-size:.68rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Office</div><div style="font-size:.9rem;font-weight:300;color:rgba(250,250,250,.7)">${esc(biz.address)}</div></div>` : ''}
          <div><div style="font-size:.68rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Hours</div><div style="font-size:.88rem;font-weight:300;color:rgba(250,250,250,.7);line-height:1.8">${esc(biz.hours || 'Mon–Sat 7AM–8PM | Emergency line 24/7')}</div></div>
          <div><div style="font-size:.68rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Response</div><div style="font-size:.88rem;font-weight:300;color:rgba(250,250,250,.7)">All form requests confirmed within 15 minutes. Same-day slots available most days before noon.</div></div>
        </div>
        <div class="map-container"><iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-80,25,-65,50&amp;layer=mapnik" allowfullscreen loading="lazy"></iframe></div>
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
    { name: biz.teamName || 'Owner', role: 'Owner & Lead Technician' },
    { name: 'Senior Technician', role: 'Bed Bug & Termite Specialist' },
    { name: 'Field Technician', role: 'Residential Division' },
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
    <div class="kicker">The Team</div>
    <h1 class="inner-hero__title">Trained. Certified. Ready.</h1>
    <p class="inner-hero__sub">Background-checked, state-licensed technicians. You will always know who is coming to your door.</p>
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

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <h2 class="cta-section__title">Book with Our Team</h2>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Request Quote</a>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
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
<title>Gallery — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}
<section class="inner-hero">
  <div class="section-inner">
    <div class="kicker">Our Work</div>
    <h1 class="inner-hero__title">Treatment Gallery</h1>
    <p class="inner-hero__sub">Service documentation from jobs across ${esc(biz.city || 'the area')}.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="gallery-grid">
      ${EXT_PHOTOS.map((p, i) => `
      <div class="gallery-item" data-reveal data-delay="${(i % 4) + 1}">
        <img src="${biz.photos[i] || p}" alt="Extermination service ${i + 1}" loading="lazy">
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="ba-section">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Before &amp; After</div>
      <h2 class="section-title">The Difference</h2>
    </div>
    <div class="ba-grid">
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${eph(1, biz)}" alt="After" loading="lazy"></div>
          <div class="ba-before"><img src="${eph(2, biz)}" alt="Before" loading="lazy"></div>
          <div class="ba-handle"></div>
          <span class="ba-label ba-label--before">Before</span>
          <span class="ba-label ba-label--after">After</span>
        </div>
      </div>
      <div>
        <div class="ba-container">
          <div class="ba-after"><img src="${eph(4, biz)}" alt="After" loading="lazy"></div>
          <div class="ba-before"><img src="${eph(3, biz)}" alt="Before" loading="lazy"></div>
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
<title>Reviews — ${esc(biz.name)}</title>
${globalStyles(biz)}
</head>
<body>
${header(biz, baseUrl)}
<section class="inner-hero">
  <div class="section-inner">
    <div class="kicker">Reviews</div>
    <h1 class="inner-hero__title">${biz.reviews ? biz.reviews + '+' : '1,000+'} Jobs Done</h1>
    ${biz.rating ? `<div style="display:flex;align-items:center;justify-content:center;gap:.75rem;margin-top:1.25rem"><span style="font-family:'Bebas Neue',sans-serif;font-size:3rem;color:var(--amber)">${biz.rating}</span><div><div style="color:var(--amber);font-size:1.3rem;letter-spacing:.15em">&#9733;&#9733;&#9733;&#9733;&#9733;</div><div style="font-size:.72rem;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:.2rem">Avg. Rating</div></div></div>` : ''}
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="testimonials__grid">
      ${reviews.map((r, i) => `
      <div class="review-card" data-reveal data-delay="${(i % 2) + 1}">
        <div class="review-card__stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="review-card__text">${esc(r.text)}</p>
        <div class="review-card__author">${esc(r.reviewer)}</div>
        <div class="review-card__meta">${esc(r.svc)} &mdash; ${esc(r.city)} &mdash; ${esc(r.date)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <h2 class="cta-section__title">Ready to Call?</h2>
      <p class="cta-section__sub">Same-day service. 30-day guarantee. ${esc(biz.yearsInBiz || '15')} years in ${esc(biz.city || 'the area')}.</p>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-amber">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Request Quote</a>
      </div>
    </div>
  </div>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────

export function buildExterminatorV2AllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home: buildHome(biz, baseUrl),
    about: buildAbout(biz, baseUrl),
    contact: buildContact(biz, baseUrl),
    team: buildTeam(biz, baseUrl),
    gallery: buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
