/**
 * Pest Control demo website builder v2 — "Shield Pro" dark navy style.
 * Different from v1's green/light design — this is dark professional/corporate.
 * Palette: #050d1a deep navy, #0a1628 panel, #0f1f3a card, #16a34a green, #3b82f6 tech blue.
 * Fonts: Space Grotesk 600/700 (display) + Inter 300-500 (body).
 * Six pages: home, about, contact, team, gallery, testimonials.
 * Features: 2-col hero, hex-dot bg, certification badges, comparison table, seasonal pest grid.
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

const PC_PHOTOS = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
  'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
  'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=800&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  'https://images.unsplash.com/photo-1617369120004-4042c1eec504?w=800&q=80',
  'https://images.unsplash.com/photo-1599597143701-7a0e57dfc9dd?w=800&q=80',
];

function pcph(idx: number, biz: BizPageData): string {
  return biz.photos[idx] || PC_PHOTOS[idx % PC_PHOTOS.length];
}

function reviewPad(biz: BizPageData, count: number): Array<{ text: string; reviewer: string; city: string; svc: string; date: string }> {
  const padData = [
    { text: 'Found ants in the kitchen three weeks running. They showed up next morning, treated the whole perimeter, and we have not seen one since. That was four months ago.', reviewer: 'Karen B.', city: biz.city || 'Local Area', svc: 'Ant Treatment', date: 'April 2025' },
    { text: 'Had a roach problem I was embarrassed to admit to anyone. The tech was completely professional, no judgment, just thorough. Problem gone in two visits.', reviewer: 'Marcus T.', city: 'West Side', svc: 'Cockroach Control', date: 'March 2025' },
    { text: 'Termite discovery is terrifying. They came out the same day I called, gave me a clear picture of the damage, and started treatment that afternoon. Saved our floors.', reviewer: 'Linda & Steve P.', city: biz.city || 'North District', svc: 'Termite Treatment', date: 'February 2025' },
    { text: 'Mice in the walls of a new build — unbelievable. Three other companies wanted to schedule weeks out. These guys came next morning. Sealed every entry point I could not find myself.', reviewer: 'Derek H.', city: 'East Metro', svc: 'Rodent Control', date: 'January 2025' },
    { text: 'Spider problem every fall like clockwork. The quarterly plan has made a real difference. First fall in years without a single spider in the house.', reviewer: 'Julie R.', city: biz.city || 'South Side', svc: 'Quarterly Plan', date: 'October 2024' },
    { text: 'Bed bug situation at a rental property. Handled it fast, quietly, and documented everything I needed for insurance. Would not use anyone else for investment properties.', reviewer: 'Property Mgmt Co.', city: biz.city || 'Downtown', svc: 'Bed Bug Treatment', date: 'August 2024' },
    { text: 'Wasp nest the size of a basketball under the deck. Tech removed it same afternoon, no fuss. Kids back outside the next morning.', reviewer: 'Tom K.', city: 'Millbrook', svc: 'Wasp Removal', date: 'July 2024' },
    { text: 'Called about mosquitoes in the yard. Got an honest assessment that my drainage was the main problem, not just treatment. They fixed the real issue. Rare honesty.', reviewer: 'Chris M.', city: 'Lakeside', svc: 'Mosquito Control', date: 'June 2024' },
    { text: 'Annual termite inspection for peace of mind. Thorough, documented, and they explained every single thing they looked at. Worth every dollar for the certainty.', reviewer: 'Barbara N.', city: 'Ridgefield', svc: 'Termite Inspection', date: 'May 2024' },
    { text: 'Silverfish everywhere in the basement. Treated in one visit, followed up two weeks later without us asking. That follow-through is what keeps us on the annual plan.', reviewer: 'Frank A.', city: biz.city || 'North Metro', svc: 'General Pest Control', date: 'March 2024' },
  ];
  const base = (biz.reviewTexts || []).map((text, i) => ({
    text,
    reviewer: padData[i]?.reviewer || 'Verified Customer',
    city: padData[i]?.city || biz.city || 'Local Area',
    svc: padData[i]?.svc || 'Pest Control Service',
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
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:#050d1a;
  --panel:#0a1628;
  --card:#0f1f3a;
  --primary:#16a34a;
  --primary-hover:#15803d;
  --blue:#3b82f6;
  --white:#f0f6ff;
  --muted:#7ea4c8;
  --border:rgba(59,130,246,0.15);
  --section-pad:clamp(4rem,8vw,7rem);
  --radius:12px;
  --tr:.35s cubic-bezier(.4,0,.2,1);
}
body{font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--white);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{text-decoration:none;color:inherit}
img{display:block;max-width:100%}
${DATA_REVEAL_CSS}

/* ── Hex dot bg ── */
.hex-bg{background-image:radial-gradient(rgba(59,130,246,.06) 1px,transparent 1px);background-size:24px 24px}

/* ── Buttons ── */
.btn{display:inline-block;font-family:'Inter',sans-serif;font-weight:600;font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all var(--tr);border:none;border-radius:6px}
.btn-green{background:var(--primary);color:#fff;padding:13px 28px}
.btn-green:hover{background:var(--primary-hover);transform:translateY(-2px)}
.btn-blue{background:var(--blue);color:#fff;padding:13px 28px}
.btn-blue:hover{background:#2563eb;transform:translateY(-2px)}
.btn-outline-green{border:1.5px solid var(--primary);color:var(--primary);padding:12px 27px;background:transparent}
.btn-outline-green:hover{background:var(--primary);color:#fff}
.btn-outline-white{border:1.5px solid rgba(240,246,255,.25);color:var(--white);padding:12px 27px;background:transparent}
.btn-outline-white:hover{border-color:rgba(240,246,255,.6);background:rgba(240,246,255,.06)}

/* ── Kicker ── */
.kicker{font-family:'Space Grotesk',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--blue)}
.kicker--green{color:var(--primary)}

/* ── Site Header ── */
.site-header{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(5,13,26,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);transition:box-shadow .3s}
.site-header.scrolled{box-shadow:0 4px 30px rgba(0,0,0,.4)}
.header__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;height:68px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}
.header__nav{display:flex;align-items:center;gap:1.75rem}
.header__nav--right{justify-content:flex-end;gap:1rem}
.header__nav a{font-size:.78rem;font-weight:500;letter-spacing:.06em;color:var(--muted);transition:color var(--tr)}
.header__nav a:hover{color:var(--white)}
.header__logo{text-align:center}
.header__logo-text{font-family:'Space Grotesk',sans-serif;font-size:1.2rem;font-weight:700;color:var(--white);letter-spacing:.01em}
.header__logo-badge{display:inline-block;background:var(--primary);color:#fff;font-size:.55rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:2px 7px;border-radius:3px;margin-left:.4rem;vertical-align:middle}
.header__burger{display:none;background:none;border:none;cursor:pointer;padding:4px;flex-direction:column;gap:5px}
.header__burger span{display:block;width:24px;height:2px;background:var(--white)}
@media(max-width:900px){.header__nav{display:none}.header__inner{grid-template-columns:1fr auto}.header__burger{display:flex}}

/* ── Mobile menu ── */
.mobile-menu{position:fixed;inset:0;background:var(--panel);z-index:200;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2rem;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1)}
.mobile-menu.open{transform:translateX(0)}
.mobile-menu a{font-family:'Space Grotesk',sans-serif;font-size:2rem;font-weight:700;color:var(--white)}
.mobile-menu a:hover{color:var(--primary)}
.mobile-close{position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;cursor:pointer;font-size:1.8rem;color:var(--white)}

/* ── Hero ── */
.hero{padding:7rem 0 5rem;background:var(--bg);position:relative;overflow:hidden;min-height:100vh;display:flex;align-items:center}
.hero::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(59,130,246,.05) 1px,transparent 1px);background-size:28px 28px}
.hero__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;position:relative;z-index:1}
@media(max-width:900px){.hero__inner{grid-template-columns:1fr}}
.hero__eyebrow{font-family:'Space Grotesk',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--blue);margin-bottom:1rem}
.hero__title{font-family:'Space Grotesk',sans-serif;font-size:clamp(2.8rem,6vw,4.5rem);font-weight:700;color:var(--white);line-height:1.05;margin-bottom:1.25rem}
.hero__title em{color:var(--primary);font-style:normal}
.hero__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-bottom:2rem;line-height:1.75}
.hero__stats{display:flex;gap:2rem;flex-wrap:wrap;margin-bottom:2.5rem}
.hero__stat-num{font-family:'Space Grotesk',sans-serif;font-size:1.6rem;font-weight:700;color:var(--white);line-height:1}
.hero__stat-label{font-size:.72rem;font-weight:500;color:var(--muted);margin-top:.2rem}
.hero__ctas{display:flex;gap:.85rem;flex-wrap:wrap}
.hero__photo{position:relative}
.hero__photo-wrap{border-radius:var(--radius);overflow:hidden;aspect-ratio:4/5;box-shadow:0 0 60px rgba(59,130,246,.15),0 0 120px rgba(22,163,74,.1)}
.hero__photo-wrap img{width:100%;height:100%;object-fit:cover}
.hero__badge{position:absolute;bottom:-1rem;left:-1rem;background:var(--primary);color:#fff;border-radius:var(--radius);padding:1rem 1.25rem;box-shadow:0 8px 30px rgba(22,163,74,.3)}
.hero__badge-num{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;line-height:1}
.hero__badge-label{font-size:.7rem;font-weight:500;opacity:.85;margin-top:.2rem}

/* ── Guarantee bar ── */
.guarantee-bar{background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:.9rem 0;overflow-x:auto}
.guarantee-bar__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:nowrap;white-space:nowrap}
.guarantee-bar__item{display:flex;align-items:center;gap:.45rem;padding:0 1.75rem;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}
.guarantee-bar__item svg{color:var(--primary);flex-shrink:0}
.guarantee-bar__divider{width:1px;height:22px;background:var(--border);flex-shrink:0}

/* ── Section inner ── */
.section-inner{max-width:1320px;margin:0 auto;padding:0 1.5rem}
.section-header{text-align:center;margin-bottom:3.5rem}
.section-title{font-family:'Space Grotesk',sans-serif;font-size:clamp(2rem,4.5vw,3.2rem);font-weight:700;color:var(--white);line-height:1.05;margin-top:.5rem}

/* ── Certifications ── */
.certs{padding:var(--section-pad) 0;background:var(--panel)}
.certs__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3rem}
@media(max-width:800px){.certs__grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.certs__grid{grid-template-columns:1fr 1fr}}
.cert-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;display:flex;align-items:center;gap:1rem;transition:border-color var(--tr)}
.cert-card:hover{border-color:rgba(59,130,246,.4)}
.cert-card__icon{width:40px;height:40px;background:rgba(59,130,246,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cert-card__name{font-family:'Space Grotesk',sans-serif;font-size:.92rem;font-weight:600;color:var(--white)}
.cert-card__sub{font-size:.75rem;font-weight:300;color:var(--muted);margin-top:.15rem}

/* ── Services ── */
.services{padding:var(--section-pad) 0;background:var(--bg)}
.services__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
@media(max-width:900px){.services__grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.services__grid{grid-template-columns:1fr}}
.svc-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;position:relative;transition:border-color var(--tr),transform var(--tr)}
.svc-card:hover{border-color:rgba(22,163,74,.4);transform:translateY(-4px)}
.svc-card--popular{border-color:rgba(22,163,74,.35)}
.svc-badge{position:absolute;top:-1px;right:1.5rem;background:var(--primary);color:#fff;font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 12px;border-radius:0 0 6px 6px}
.svc-card__name{font-family:'Space Grotesk',sans-serif;font-size:1.15rem;font-weight:700;color:var(--white);margin-bottom:.6rem;margin-top:.4rem}
.svc-card__pests{font-size:.78rem;font-weight:500;color:var(--primary);margin-bottom:.85rem;letter-spacing:.04em}
.svc-card__desc{font-size:.88rem;font-weight:300;line-height:1.7;color:var(--muted);margin-bottom:1rem}
.svc-card__price{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:var(--blue)}

/* ── How It Works ── */
.how{padding:var(--section-pad) 0;background:var(--panel)}
.how__steps{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;margin-top:3rem}
@media(max-width:800px){.how__steps{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.how__steps{grid-template-columns:1fr}}
.how-step{text-align:center;padding:2rem 1.5rem;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);transition:border-color var(--tr)}
.how-step:hover{border-color:rgba(59,130,246,.35)}
.how-step__icon{width:52px;height:52px;background:rgba(59,130,246,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
.how-step__num{font-family:'Space Grotesk',sans-serif;font-size:.85rem;font-weight:700;color:var(--blue);margin-bottom:.4rem;letter-spacing:.1em}
.how-step__title{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:var(--white);margin-bottom:.5rem}
.how-step__desc{font-size:.83rem;font-weight:300;line-height:1.65;color:var(--muted)}

/* ── Stats ── */
.stats{padding:4rem 0;background:var(--bg);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.stats__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0}
@media(max-width:800px){.stats__grid{grid-template-columns:repeat(2,1fr)}}
.stat-item{text-align:center;padding:2rem 1rem;border-right:1px solid var(--border)}
.stat-item:last-child{border-right:none}
@media(max-width:800px){.stat-item:nth-child(2){border-right:none}.stat-item:nth-child(3){border-right:1px solid var(--border)}}
.stat-num{font-family:'Space Grotesk',sans-serif;font-size:clamp(2rem,5vw,3rem);font-weight:700;color:var(--primary);line-height:1;margin-bottom:.35rem}
.stat-label{font-size:.72rem;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}

/* ── Comparison table ── */
.compare{padding:var(--section-pad) 0;background:var(--panel)}
.compare__table{width:100%;margin-top:3rem;border-collapse:collapse;border-radius:var(--radius);overflow:hidden}
.compare__table th{padding:1rem 1.5rem;font-family:'Space Grotesk',sans-serif;font-size:.82rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.compare__table th:first-child{text-align:left;color:var(--white)}
.compare__table th.us-col{background:rgba(22,163,74,.12);color:var(--primary)}
.compare__table td{padding:.85rem 1.5rem;border-top:1px solid var(--border);font-size:.88rem;font-weight:300;color:var(--muted);text-align:center}
.compare__table td:first-child{text-align:left;color:var(--white);font-weight:400}
.compare__table td.us-col{background:rgba(22,163,74,.05);color:var(--white);font-weight:500}
.check-yes{color:var(--primary);font-size:1.1rem;font-weight:700}
.check-no{color:#475569;font-size:1rem}
@media(max-width:700px){.compare__table{font-size:.78rem}.compare__table th,.compare__table td{padding:.65rem .75rem}}

/* ── Seasonal pests ── */
.pests{padding:var(--section-pad) 0;background:var(--bg)}
.pests__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-top:3rem}
@media(max-width:900px){.pests__grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:580px){.pests__grid{grid-template-columns:repeat(2,1fr)}}
.pest-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.25rem;text-align:center;transition:border-color var(--tr),transform var(--tr)}
.pest-card:hover{border-color:rgba(22,163,74,.3);transform:translateY(-3px)}
.pest-card__icon{width:44px;height:44px;background:rgba(22,163,74,.08);border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto .75rem}
.pest-card__name{font-family:'Space Grotesk',sans-serif;font-size:.95rem;font-weight:700;color:var(--white);margin-bottom:.3rem}
.pest-card__desc{font-size:.78rem;font-weight:300;color:var(--muted);line-height:1.5}

/* ── Testimonials ── */
.testimonials{padding:var(--section-pad) 0;background:var(--panel)}
.testimonials__grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;margin-top:3rem}
@media(max-width:800px){.testimonials__grid{grid-template-columns:1fr}}
.review-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;transition:border-color var(--tr)}
.review-card:hover{border-color:rgba(59,130,246,.3)}
.review-card__stars{display:flex;gap:.2rem;margin-bottom:.85rem}
.review-card__star{width:16px;height:16px;background:var(--primary);clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.review-card__text{font-size:.9rem;font-weight:300;line-height:1.75;color:rgba(240,246,255,.8);margin-bottom:1rem}
.review-card__author{font-family:'Space Grotesk',sans-serif;font-size:.82rem;font-weight:700;color:var(--white)}
.review-card__meta{font-size:.75rem;font-weight:300;color:var(--muted);margin-top:.2rem}

/* ── Emergency ── */
.emergency{padding:4rem 0;background:linear-gradient(135deg,rgba(22,163,74,.15),rgba(5,13,26,1));border-top:1px solid rgba(22,163,74,.2);border-bottom:1px solid rgba(22,163,74,.2)}
.emergency__inner{max-width:900px;margin:0 auto;padding:0 1.5rem;text-align:center}
.emergency__title{font-family:'Space Grotesk',sans-serif;font-size:clamp(2rem,5vw,3rem);font-weight:700;color:var(--white);margin-bottom:.75rem}
.emergency__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-bottom:2rem;line-height:1.7}
.emergency__phone{font-family:'Space Grotesk',sans-serif;font-size:clamp(1.8rem,4vw,3rem);font-weight:700;color:var(--primary);margin-bottom:.5rem}

/* ── CTA ── */
.cta-section{padding:var(--section-pad) 0;background:linear-gradient(to bottom,var(--bg),var(--panel))}
.cta-section__inner{max-width:820px;margin:0 auto;padding:0 1.5rem;text-align:center}
.cta-section__title{font-family:'Space Grotesk',sans-serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:700;color:var(--white);line-height:1.1;margin-bottom:1rem}
.cta-section__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-bottom:2.5rem;line-height:1.7}
.cta-section__ctas{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}

/* ── Footer ── */
.footer{background:var(--panel);border-top:1px solid var(--border);padding:4rem 0 0}
.footer__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:3rem;margin-bottom:3rem}
@media(max-width:800px){.footer__inner{grid-template-columns:1fr 1fr}}
@media(max-width:500px){.footer__inner{grid-template-columns:1fr}}
.footer__logo{font-family:'Space Grotesk',sans-serif;font-size:1.2rem;font-weight:700;color:var(--white);margin-bottom:.5rem}
.footer__tagline{font-size:.85rem;font-weight:300;color:var(--muted);line-height:1.65;max-width:260px;margin-bottom:1.5rem}
.footer__col-title{font-size:.68rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(240,246,255,.3);margin-bottom:1rem}
.footer__links{display:flex;flex-direction:column;gap:.5rem}
.footer__links a{font-size:.85rem;font-weight:300;color:var(--muted);transition:color var(--tr)}
.footer__links a:hover{color:var(--white)}
.footer__bottom{border-top:1px solid var(--border);padding:1.25rem 1.5rem;max-width:1320px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem}
.footer__copy{font-size:.78rem;font-weight:300;color:rgba(240,246,255,.3)}

/* ── Inner pages ── */
.inner-hero{padding:10rem 0 5rem;background:var(--panel);border-bottom:1px solid var(--border);text-align:center}
.inner-hero__title{font-family:'Space Grotesk',sans-serif;font-size:clamp(2.5rem,7vw,5rem);font-weight:700;color:var(--white);line-height:1.05;margin-top:.5rem}
.inner-hero__sub{font-size:1rem;font-weight:300;color:var(--muted);margin-top:1rem;max-width:540px;margin-left:auto;margin-right:auto}

/* ── Team ── */
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem}
@media(max-width:800px){.team-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:500px){.team-grid{grid-template-columns:1fr}}
.team-card{background:var(--card);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)}
.team-card__photo{aspect-ratio:1/1;overflow:hidden;background:var(--panel)}
.team-card__photo img{width:100%;height:100%;object-fit:cover}
.team-card__initials{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-size:3rem;font-weight:700;color:var(--primary)}
.team-card__body{padding:1.25rem}
.team-card__name{font-family:'Space Grotesk',sans-serif;font-size:1rem;font-weight:700;color:var(--white);margin-bottom:.25rem}
.team-card__role{font-size:.75rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--blue)}

/* ── Gallery ── */
.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:3rem}
@media(max-width:700px){.gallery-grid{grid-template-columns:repeat(2,1fr)}}
.gallery-item{aspect-ratio:4/3;overflow:hidden;border-radius:var(--radius);position:relative}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.gallery-item:hover img{transform:scale(1.07)}

/* ── Contact ── */
.contact-layout{display:grid;grid-template-columns:1.1fr 1fr;gap:4rem;align-items:start;margin-top:3rem}
@media(max-width:900px){.contact-layout{grid-template-columns:1fr}}
.form-group{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.85rem}
.form-group label{font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(240,246,255,.4)}
.form-group input,.form-group select,.form-group textarea{background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--white);font-family:'Inter',sans-serif;font-size:.9rem;font-weight:300;padding:.85rem 1rem;width:100%;outline:none;border-radius:6px;transition:border-color var(--tr)}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--primary)}
.form-group input::placeholder,.form-group textarea::placeholder{color:rgba(240,246,255,.2)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}
@media(max-width:580px){.form-row{grid-template-columns:1fr}}
.map-container{border-radius:var(--radius);overflow:hidden;height:260px;margin-top:1.5rem;border:1px solid var(--border)}
.map-container iframe{width:100%;height:100%;border:none}
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
      <span class="header__logo-text">${esc(biz.name)}</span>
      <span class="header__logo-badge">Pro</span>
    </div>
    <nav class="header__nav header__nav--right">
      <a href="${baseUrl}-team">Team</a>
      <a href="${baseUrl}-testimonials">Reviews</a>
      <a href="${baseUrl}-contact" class="btn btn-green">Free Quote</a>
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
      <p class="footer__tagline">Licensed and certified pest control serving ${esc(biz.city || 'the local area')}${biz.state ? ', ' + esc(biz.state) : ''}. 100% satisfaction guaranteed.</p>
      ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-green" style="margin-top:1rem">${esc(biz.phone)}</a>` : ''}
    </div>
    <div>
      <div class="footer__col-title">Services</div>
      <div class="footer__links">
        <a href="${baseUrl}">General Pest Control</a>
        <a href="${baseUrl}">Termite Treatment</a>
        <a href="${baseUrl}">Rodent Control</a>
        <a href="${baseUrl}">Bed Bug Treatment</a>
        <a href="${baseUrl}">Mosquito Control</a>
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
    { name: 'General Pest Control', desc: 'Quarterly or monthly service covering all common household pests. Perimeter treatment + interior as needed.', price: 'From $89/quarter', duration: undefined },
    { name: 'Termite Treatment', desc: 'Liquid barrier and bait station systems. Full inspection, treatment plan, and annual monitoring.', price: 'Custom quote', duration: undefined },
    { name: 'Rodent Control', desc: 'Entry point sealing, trap placement, and monitoring. Covers mice and rats indoors and in crawl spaces.', price: 'From $199', duration: undefined },
  ];

  const pests = [
    { name: 'Ants', desc: 'All species including carpenter ants' },
    { name: 'Roaches', desc: 'German, American, Oriental varieties' },
    { name: 'Termites', desc: 'Subterranean and dry wood treatment' },
    { name: 'Mice', desc: 'Entry sealing and trap programs' },
    { name: 'Spiders', desc: 'Interior and exterior web removal' },
    { name: 'Bed Bugs', desc: 'Heat treatment and chemical options' },
    { name: 'Wasps', desc: 'Nest removal and prevention' },
    { name: 'Mosquitoes', desc: 'Yard spray and larval treatment' },
  ];

  const compareRows = [
    { feature: 'Same-Day Service Available', us: true, chain: false },
    { feature: '100% Satisfaction Guarantee', us: true, chain: false },
    { feature: 'Free Re-Treatment if Pests Return', us: true, chain: false },
    { feature: 'Licensed Technicians', us: true, chain: true },
    { feature: 'No Long-Term Contracts Required', us: true, chain: false },
    { feature: 'Local & Family Owned', us: true, chain: false },
    { feature: 'Technician Name Provided in Advance', us: true, chain: false },
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
  <div class="hero__inner">
    <div>
      <div class="hero__eyebrow">${esc(biz.city || 'Local Area')} Pest Control Specialists</div>
      <h1 class="hero__title">${esc(biz.heroHeadline || 'Protect Your Home')}<br><em>${esc(biz.heroHeadlineEm || 'From the Inside Out')}</em></h1>
      <p class="hero__sub">${esc(biz.heroSub || `${biz.yearsInBiz || '15'} years eliminating pests from homes and businesses across ${biz.city || 'the area'}. Licensed, certified, and satisfaction-guaranteed.`)}</p>
      <div class="hero__stats">
        <div>
          <div class="hero__stat-num">5,000+</div>
          <div class="hero__stat-label">Homes Protected</div>
        </div>
        <div>
          <div class="hero__stat-num">98%</div>
          <div class="hero__stat-label">Pest-Free Rate</div>
        </div>
        <div>
          <div class="hero__stat-num">Same Day</div>
          <div class="hero__stat-label">Service Available</div>
        </div>
      </div>
      <div class="hero__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-green">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Get Free Quote</a>
      </div>
    </div>
    <div class="hero__photo">
      <div class="hero__photo-wrap"><img src="${pcph(0, biz)}" alt="Pest control technician" loading="eager"></div>
      <div class="hero__badge">
        <div class="hero__badge-num">${biz.rating || '4.9'}</div>
        <div class="hero__badge-label">Avg. Google Rating</div>
      </div>
    </div>
  </div>
</section>

<!-- GUARANTEE BAR -->
<div class="guarantee-bar">
  <div class="guarantee-bar__inner">
    <span class="guarantee-bar__item">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      100% Satisfaction Guaranteed
    </span>
    <div class="guarantee-bar__divider"></div>
    <span class="guarantee-bar__item">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Free Re-Treatment if Pests Return
    </span>
    <div class="guarantee-bar__divider"></div>
    <span class="guarantee-bar__item">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Licensed &amp; Certified
    </span>
    <div class="guarantee-bar__divider"></div>
    <span class="guarantee-bar__item">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Same-Day Service Available
    </span>
  </div>
</div>

<!-- CERTIFICATIONS -->
<section class="certs">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Our Credentials</div>
      <h2 class="section-title">Certified. Verified. Trusted.</h2>
    </div>
    <div class="certs__grid">
      ${[
        { name: 'NPMA Member', sub: 'National Pest Mgmt. Association' },
        { name: 'QualityPro Certified', sub: 'Industry excellence standard' },
        { name: 'EPA Registered', sub: 'All products approved' },
        { name: `${biz.state || 'State'} Licensed`, sub: 'Active state contractor license' },
        { name: 'BBB Accredited', sub: 'A+ Business Rating' },
        { name: 'Angi Top Pro', sub: 'Top 5% of service providers' },
      ].map((c, i) => `
      <div class="cert-card" data-reveal data-delay="${(i % 3) + 1}">
        <div class="cert-card__icon">
          <svg width="22" height="22" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <div class="cert-card__name">${c.name}</div>
          <div class="cert-card__sub">${c.sub}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- SERVICES -->
<section class="services">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">What We Treat</div>
      <h2 class="section-title">Pest Control Services</h2>
    </div>
    <div class="services__grid">
      ${svcs.map((s, i) => `
      <div class="svc-card ${i === 0 ? 'svc-card--popular' : ''}" data-reveal data-delay="${(i % 3) + 1}">
        ${i === 0 ? '<div class="svc-badge">Most Popular</div>' : ''}
        <div class="svc-card__name">${esc(s.name)}</div>
        <div class="svc-card__pests">${s.desc.split('.')[0]}</div>
        <p class="svc-card__desc">${esc(s.desc)}</p>
        <div class="svc-card__price">${esc(s.price)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section class="how">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">The Process</div>
      <h2 class="section-title">How We Work</h2>
    </div>
    <div class="how__steps">
      ${[
        { n: '01', title: 'Call or Book Online', desc: 'Reach us by phone or form. We confirm your appointment within 30 minutes.', icon: '<path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>' },
        { n: '02', title: 'Thorough Inspection', desc: 'Certified technician inspects the property and identifies entry points, nesting areas, and pest species.', icon: '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>' },
        { n: '03', title: 'Treatment Plan', desc: 'We explain every product we will use, where we apply it, and why. No surprises on your invoice.', icon: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>' },
        { n: '04', title: 'Guaranteed Results', desc: 'If pests return before your next scheduled service, we re-treat at no charge. No conditions, no paperwork.', icon: '<path d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"/>' },
      ].map((s, i) => `
      <div class="how-step" data-reveal data-delay="${i + 1}">
        <div class="how-step__icon"><svg width="24" height="24" fill="none" stroke="#3b82f6" stroke-width="2" viewBox="0 0 24 24">${s.icon}</svg></div>
        <div class="how-step__num">${s.n}</div>
        <div class="how-step__title">${s.title}</div>
        <p class="how-step__desc">${s.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- STATS -->
<section class="stats">
  <div class="section-inner">
    <div class="stats__grid">
      <div class="stat-item" data-reveal data-delay="1"><div class="stat-num">5,000+</div><div class="stat-label">Homes Protected</div></div>
      <div class="stat-item" data-reveal data-delay="2"><div class="stat-num">98%</div><div class="stat-label">Pest-Free Rate</div></div>
      <div class="stat-item" data-reveal data-delay="3"><div class="stat-num">48hr</div><div class="stat-label">Response Time</div></div>
      <div class="stat-item" data-reveal data-delay="4"><div class="stat-num">${biz.yearsInBiz || '15'}yr</div><div class="stat-label">Licensed</div></div>
    </div>
  </div>
</section>

<!-- COMPARISON TABLE -->
<section class="compare">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Why Local Wins</div>
      <h2 class="section-title">Us vs. The Big Chains</h2>
    </div>
    <div style="overflow-x:auto;margin-top:3rem">
      <table class="compare__table">
        <thead>
          <tr>
            <th style="text-align:left;padding-left:1.5rem">Feature</th>
            <th class="us-col">${esc(biz.name)}</th>
            <th>National Chains</th>
          </tr>
        </thead>
        <tbody>
          ${compareRows.map(r => `
          <tr>
            <td>${r.feature}</td>
            <td class="us-col">${r.us ? '<span class="check-yes">Yes</span>' : '<span class="check-no">No</span>'}</td>
            <td>${r.chain ? '<span class="check-yes">Yes</span>' : '<span class="check-no">No</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
</section>

<!-- SEASONAL PESTS -->
<section class="pests">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">What We Handle</div>
      <h2 class="section-title">Common Pests We Eliminate</h2>
    </div>
    <div class="pests__grid">
      ${pests.map((p, i) => `
      <div class="pest-card" data-reveal data-delay="${(i % 4) + 1}">
        <div class="pest-card__icon">
          <svg width="20" height="20" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div class="pest-card__name">${p.name}</div>
        <div class="pest-card__desc">${p.desc}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section class="testimonials">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Customer Reviews</div>
      <h2 class="section-title">What Our Customers Say</h2>
    </div>
    <div class="testimonials__grid">
      ${reviews.slice(0, 4).map((r, i) => `
      <div class="review-card" data-reveal data-delay="${(i % 2) + 1}">
        <div class="review-card__stars">${'<div class="review-card__star"></div>'.repeat(5)}</div>
        <p class="review-card__text">${esc(r.text)}</p>
        <div class="review-card__author">${esc(r.reviewer)}</div>
        <div class="review-card__meta">${esc(r.svc)} &mdash; ${esc(r.date)}</div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:2.5rem"><a href="${baseUrl}-testimonials" class="btn btn-outline-white">View All Reviews</a></div>
  </div>
</section>

<!-- EMERGENCY -->
<section class="emergency">
  <div class="emergency__inner">
    <div class="kicker kicker--green" data-reveal>Same-Day Availability</div>
    <h2 class="emergency__title" data-reveal>Pest Problem Today?</h2>
    ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="emergency__phone" data-reveal>${esc(biz.phone)}</a>` : ''}
    <p class="emergency__sub" data-reveal>We can schedule same-day service for most pest issues. Call before noon and we are usually there by end of day.</p>
    <a href="${baseUrl}-contact" class="btn btn-green">Request Same-Day Service</a>
  </div>
</section>

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <div class="kicker">Get Started</div>
      <h2 class="cta-section__title">Ready for a Pest-Free Home?</h2>
      <p class="cta-section__sub">Free inspection. No contracts required. If the pests come back before your next service, so do we.</p>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-green">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Get Free Quote</a>
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
<section class="inner-hero hex-bg">
  <div class="section-inner">
    <div class="kicker">About Us</div>
    <h1 class="inner-hero__title">Local Experts Who Show Up</h1>
    <p class="inner-hero__sub">${esc(biz.yearsInBiz || '15')} years protecting homes and businesses in ${esc(biz.city || 'the area')}.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center" class="two-col">
      <div data-reveal>
        <div class="kicker">Who We Are</div>
        <h2 class="section-title" style="margin-bottom:1.5rem">${esc(biz.aboutText || 'Family Owned. Fully Certified.')}</h2>
        <p style="font-size:.95rem;font-weight:300;line-height:1.8;color:var(--muted);margin-bottom:1rem">${esc(biz.aboutText2 || `${biz.name} was founded in ${biz.city || 'the area'} by a team of certified pest control technicians who believed local homeowners deserved better service than the national chains were providing.`)}</p>
        <p style="font-size:.95rem;font-weight:300;line-height:1.8;color:var(--muted);margin-bottom:1.5rem">We operate on a simple principle: do the job right the first time, stand behind it if we did not, and treat every property like it is our own. Our technicians are not commission-based — they are incentivized on customer satisfaction scores and re-treatment rates.</p>
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-green">Talk to Our Team</a>` : ''}
      </div>
      <div data-reveal data-delay="2">
        <div style="border-radius:var(--radius);overflow:hidden;aspect-ratio:4/3;box-shadow:0 0 60px rgba(59,130,246,.1)"><img src="${pcph(1, biz)}" alt="Pest control team" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>
      </div>
    </div>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--panel)">
  <div class="section-inner">
    <div class="section-header" data-reveal>
      <div class="kicker">Our Values</div>
      <h2 class="section-title">What Drives How We Work</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:2rem" class="three-col">
      ${[
        { title: 'Honest Assessments', desc: 'We tell you what we actually find — including when your problem is smaller than you feared. No inflating scope.' },
        { title: 'Transparent Pricing', desc: 'You see a full breakdown before any work starts. No surprise charges after the job is done.' },
        { title: 'Guaranteed Work', desc: 'If treated pests return between scheduled services, we come back at no charge. That is the deal, every time.' },
      ].map((v, i) => `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:2rem" data-reveal data-delay="${i + 1}">
        <div style="font-family:'Space Grotesk',sans-serif;font-size:1.05rem;font-weight:700;color:var(--white);margin-bottom:.65rem">${v.title}</div>
        <p style="font-size:.88rem;font-weight:300;line-height:1.7;color:var(--muted)">${v.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="cta-section__inner">
    <div data-reveal>
      <h2 class="cta-section__title">Ready to Work with Us?</h2>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-green">Call ${esc(biz.phone)}</a>` : ''}
        <a href="${baseUrl}-contact" class="btn btn-outline-white">Request Quote</a>
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
<section class="inner-hero hex-bg">
  <div class="section-inner">
    <div class="kicker">Contact Us</div>
    <h1 class="inner-hero__title">Get a Free Quote</h1>
    <p class="inner-hero__sub">Fill out the form below or call us directly. We confirm all appointments within 30 minutes.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="contact-layout">
      <div data-reveal>
        <form onsubmit="event.preventDefault();this.innerHTML='<p style=color:var(--primary);font-family:Space Grotesk,sans-serif;font-weight:600;font-size:1.1rem>Request received. We will call you within 30 minutes.</p>'">
          <div class="form-row">
            <div class="form-group"><label>First Name</label><input type="text" placeholder="John" required></div>
            <div class="form-group"><label>Last Name</label><input type="text" placeholder="Smith" required></div>
          </div>
          <div class="form-group"><label>Phone Number</label><input type="tel" placeholder="${biz.phone || '(555) 000-0000'}" required></div>
          <div class="form-group"><label>Email Address</label><input type="email" placeholder="john@example.com"></div>
          <div class="form-group"><label>Property Type</label>
            <select>
              <option>Residential</option>
              <option>Commercial</option>
              <option>Multi-Family</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group"><label>Pest Issue</label>
            <select>
              <option>Not sure / general inspection</option>
              <option>Ants</option>
              <option>Roaches</option>
              <option>Termites</option>
              <option>Mice / Rodents</option>
              <option>Spiders</option>
              <option>Bed Bugs</option>
              <option>Wasps / Hornets</option>
              <option>Mosquitoes</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-group"><label>Additional Details</label><textarea rows="4" placeholder="Describe where you have seen activity, how long the problem has been present, any treatments already tried..."></textarea></div>
          <button type="submit" class="btn btn-green" style="width:100%;justify-content:center;font-size:.9rem;padding:14px 0">Request Free Quote</button>
        </form>
      </div>
      <div data-reveal data-delay="2">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" style="font-family:'Space Grotesk',sans-serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;color:var(--primary);display:block;margin-bottom:.4rem">${esc(biz.phone)}</a><div style="font-size:.72rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:2rem">Available Same-Day</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:1.5rem;margin-bottom:2rem">
          ${biz.address ? `<div><div style="font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Office</div><div style="font-size:.9rem;font-weight:300;color:rgba(240,246,255,.7)">${esc(biz.address)}</div></div>` : ''}
          <div><div style="font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Hours</div><div style="font-size:.88rem;font-weight:300;color:rgba(240,246,255,.7);line-height:1.8">${esc(biz.hours || 'Mon–Fri 7AM–7PM | Sat 8AM–5PM | Emergency line 24/7')}</div></div>
          <div><div style="font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem">Response Time</div><div style="font-size:.88rem;font-weight:300;color:rgba(240,246,255,.7)">We confirm all quote requests within 30 minutes during business hours.</div></div>
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
    { name: 'Senior Technician', role: 'Termite Specialist' },
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
<section class="inner-hero hex-bg">
  <div class="section-inner">
    <div class="kicker">The Team</div>
    <h1 class="inner-hero__title">Licensed. Trained. Trusted.</h1>
    <p class="inner-hero__sub">Every technician is background-checked, state-licensed, and trained on the products they apply.</p>
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
      <h2 class="cta-section__title">Schedule with Our Team</h2>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-green">Call ${esc(biz.phone)}</a>` : ''}
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
<section class="inner-hero hex-bg">
  <div class="section-inner">
    <div class="kicker">Our Work</div>
    <h1 class="inner-hero__title">Treatment Gallery</h1>
    <p class="inner-hero__sub">Documentation from residential and commercial pest control jobs across ${esc(biz.city || 'the area')}.</p>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="gallery-grid">
      ${PC_PHOTOS.map((p, i) => `
      <div class="gallery-item" data-reveal data-delay="${(i % 4) + 1}">
        <img src="${biz.photos[i] || p}" alt="Pest control service ${i + 1}" loading="lazy">
      </div>`).join('')}
    </div>
  </div>
</section>

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
<section class="inner-hero hex-bg">
  <div class="section-inner">
    <div class="kicker">Reviews</div>
    <h1 class="inner-hero__title">What Our Customers Say</h1>
    ${biz.rating ? `<div style="display:flex;align-items:center;justify-content:center;gap:.75rem;margin-top:1.25rem"><span style="font-family:'Space Grotesk',sans-serif;font-size:2.5rem;font-weight:700;color:var(--primary)">${biz.rating}</span><div><div style="display:flex;gap:.25rem">${'<div class="review-card__star" style="width:18px;height:18px;background:var(--primary);clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)"></div>'.repeat(5)}</div><div style="font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:.2rem">Avg. Rating</div></div></div>` : ''}
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--bg)">
  <div class="section-inner">
    <div class="testimonials__grid">
      ${reviews.map((r, i) => `
      <div class="review-card" data-reveal data-delay="${(i % 2) + 1}">
        <div class="review-card__stars">${'<div class="review-card__star"></div>'.repeat(5)}</div>
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
      <h2 class="cta-section__title">Ready to Join Them?</h2>
      <p class="cta-section__sub">Free inspection, honest quote, guaranteed results. Call today and we will schedule within 24 hours.</p>
      <div class="cta-section__ctas">
        ${biz.phone ? `<a href="tel:${telLink(biz.phone)}" class="btn btn-green">Call ${esc(biz.phone)}</a>` : ''}
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

export function buildPestControlV2AllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home: buildHome(biz, baseUrl),
    about: buildAbout(biz, baseUrl),
    contact: buildContact(biz, baseUrl),
    team: buildTeam(biz, baseUrl),
    gallery: buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
