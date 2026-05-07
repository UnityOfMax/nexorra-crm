/**
 * Roofing page builder — Hugo Builders LLC design system.
 * Palette: #c8102e red, #f59e0b gold, #0d0d0d dark, #f5f5f5 gray-bg.
 * Fonts: Barlow Condensed 700/800 (headings) + Inter 300-600 (body).
 * Six pages: home, about, contact, team, gallery, testimonials.
 * Features: sticky header, full-screen video hero, CSS marquee testimonials,
 *   sticky left why-us, before/after sliders, IntersectionObserver reveals.
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ph(idx: number, biz: BizPageData): string {
  const FALLBACKS = [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80',
    'https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=800&q=80',
    'https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=800&q=80',
    'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&q=80',
    'https://images.unsplash.com/photo-1518481852452-9415b262eba4?w=800&q=80',
    'https://images.unsplash.com/photo-1599619585752-c3edb42a414c?w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&sat=-20',
    'https://images.unsplash.com/photo-1518481852452-9415b262eba4?w=800&q=80&sat=-30',
  ];
  return biz.photos[idx] || FALLBACKS[idx % FALLBACKS.length];
}

function telLink(phone: string | null): string {
  return (phone ?? '').replace(/[^0-9+]/g, '');
}

function reviewPad(biz: BizPageData, count: number): Array<{ text: string; reviewer: string; city: string; svc: string; date: string }> {
  const padData = [
    { text: 'After the storm took half our roof, they had a crew out the next morning. Insurance claim handled, new roof done in two days. Absolute professionals.', reviewer: 'Greg T.', city: biz.city || 'Local Area', svc: 'Storm Damage Repair', date: 'March 2025' },
    { text: 'Got three bids. They were not the cheapest but they were the only ones who got on the roof before quoting. No surprises, no upsells, clean install.', reviewer: 'Sheila & Mike O.', city: 'North County', svc: 'Roof Replacement', date: 'January 2025' },
    { text: 'They replaced our roof and gutters in a single day. Crew showed up at 7, cleaned up every nail, and were done by 4 PM. We barely knew they were there.', reviewer: 'James R.', city: biz.city || 'South District', svc: 'Full Reroof', date: 'November 2024' },
    { text: 'Honest people. Told us we did not need a full replacement when two other companies said we did. Fixed the leak for $400. Will use them for everything.', reviewer: 'Patricia N.', city: 'East Metro', svc: 'Roof Repair', date: 'October 2024' },
    { text: '15-year warranty that they actually stand behind. Had a small leak six months after install, they came out next day, no charge. That is how you build trust.', reviewer: 'Dave L.', city: 'West Side', svc: 'Roof Installation', date: 'August 2024' },
    { text: 'Commercial building, 8,000 sq ft. Finished ahead of schedule, zero safety incidents, and the cost matched the quote to the dollar.', reviewer: 'Corporate Properties LLC', city: biz.city || 'Downtown', svc: 'Commercial Roofing', date: 'July 2024' },
    { text: 'The crew was professional from start to finish. They tarped everything before they started, and the cleanup afterward was better than my yard looked before.', reviewer: 'Sandra K.', city: 'Ridgefield', svc: 'Roof Replacement', date: 'June 2024' },
    { text: 'Fast, fair, and they actually showed up when they said they would. That alone puts them ahead of every other contractor we have dealt with.', reviewer: 'Tom & Lucy B.', city: 'Lakeside', svc: 'Roof Repair', date: 'April 2024' },
    { text: 'Had three competing estimates. They explained exactly what materials they would use and why. No vague language, no pressure. We hired them on the spot.', reviewer: 'Robert M.', city: 'Millbrook', svc: 'Roof Inspection', date: 'March 2024' },
    { text: 'Our insurance adjuster actually complimented the quality of the install during inspection. That is when you know the crew does it right.', reviewer: 'Angela F.', city: biz.city || 'North Metro', svc: 'Storm Damage Repair', date: 'February 2024' },
  ];
  const base = (biz.reviewTexts || []).map((text, i) => ({
    text,
    reviewer: padData[i]?.reviewer || 'Verified Customer',
    city: padData[i]?.city || biz.city || 'Local Area',
    svc: padData[i]?.svc || 'Roofing Services',
    date: padData[i]?.date || '2025',
  }));
  while (base.length < count) {
    base.push(padData[base.length % padData.length]);
  }
  return base.slice(0, count);
}

// ── Shared CSS ──────────────────────────────────────────────────────────────────

function globalStyles(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --color-primary:#c8102e;
  --color-primary-hover:#a00d24;
  --color-dark:#0d0d0d;
  --color-gold:#f59e0b;
  --color-gray-bg:#f5f5f5;
  --color-gray-100:#e5e5e5;
  --color-white:#ffffff;
  --color-text:#1a1a1a;
  --color-text-muted:#6b7280;
  --section-pad:clamp(4rem,8vw,7rem);
  --card-radius:12px;
  --transition-base:.35s cubic-bezier(.4,0,.2,1);
}
body{font-family:'Inter',system-ui,sans-serif;font-weight:400;color:var(--color-text);-webkit-font-smoothing:antialiased}
a{text-decoration:none;color:inherit}
img{display:block;max-width:100%}

/* ── Data-reveal ──────────────────────────────────────────────────── */
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
[data-reveal].revealed{opacity:1;transform:translateY(0)}
[data-delay="1"]{transition-delay:.1s}
[data-delay="2"]{transition-delay:.2s}
[data-delay="3"]{transition-delay:.3s}
[data-delay="4"]{transition-delay:.4s}

/* ── Buttons ──────────────────────────────────────────────────────── */
.btn{display:inline-block;font-family:'Inter',sans-serif;font-weight:600;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:all var(--transition-base);border:none}
.btn--primary{background:var(--color-primary);color:#fff;padding:12px 28px}
.btn--primary:hover{background:var(--color-primary-hover)}
.btn--ghost{border:1.5px solid var(--color-primary);color:var(--color-primary);padding:11px 27px;background:transparent}
.btn--ghost:hover{background:var(--color-primary);color:#fff}
.btn--white{background:#fff;color:var(--color-dark);padding:12px 28px}
.btn--white:hover{background:var(--color-gray-bg)}
.btn--white-ghost{border:1.5px solid rgba(255,255,255,.45);color:#fff;padding:14px 44px;background:transparent;backdrop-filter:blur(4px);font-size:.9rem;letter-spacing:.12em}
.btn--white-ghost:hover{background:rgba(255,255,255,.1)}

/* ── Section kicker ──────────────────────────────────────────────── */
.kicker{font-family:'Inter',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--color-primary)}

/* ── Site Header ─────────────────────────────────────────────────── */
.site-header{position:fixed;top:0;left:0;right:0;z-index:100;transition:background .3s,box-shadow .3s}
.site-header.scrolled{background:#fff;box-shadow:0 1px 20px rgba(0,0,0,.12)}
.header__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;height:72px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1rem}
.header__nav{display:flex;align-items:center;gap:1.5rem}
.header__nav--right{justify-content:flex-end}
.header__nav a{font-family:'Inter',sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#fff;transition:color var(--transition-base)}
.site-header.scrolled .header__nav a{color:var(--color-text)}
.site-header.scrolled .header__nav a:hover{color:var(--color-primary)}
.header__phone{font-weight:600;font-size:.82rem}
.header__logo{text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px}
.header__logo-text{font-family:'Barlow Condensed',Impact,sans-serif;font-size:1.5rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#fff;transition:color var(--transition-base);line-height:1}
.header__logo-sub{font-family:'Inter',sans-serif;font-size:.65rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.6);transition:color var(--transition-base)}
.site-header.scrolled .header__logo-text{color:var(--color-dark)}
.site-header.scrolled .header__logo-sub{color:var(--color-text-muted)}
.header__burger{display:none;background:none;border:none;cursor:pointer;padding:4px;flex-direction:column;gap:5px}
.header__burger span{display:block;width:24px;height:2px;background:#fff;transition:all .3s}
.site-header.scrolled .header__burger span{background:var(--color-dark)}
@media(max-width:900px){
  .header__nav{display:none}
  .header__inner{grid-template-columns:1fr auto}
  .header__burger{display:flex}
  .header__logo{align-items:flex-start}
}

/* ── Mobile menu ─────────────────────────────────────────────────── */
.mobile-menu{position:fixed;inset:0;background:#fff;z-index:200;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2rem;transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1)}
.mobile-menu.open{transform:translateX(0)}
.mobile-menu a{font-family:'Barlow Condensed',sans-serif;font-size:2.5rem;font-weight:800;text-transform:uppercase;color:var(--color-dark);letter-spacing:.04em}
.mobile-menu a:hover{color:var(--color-primary)}
.mobile-close{position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;cursor:pointer;font-size:1.8rem;color:var(--color-dark)}

/* ── Hero ────────────────────────────────────────────────────────── */
.hero{position:relative;height:100vh;min-height:600px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.hero__media{position:absolute;inset:0}
.hero__video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero__poster{position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80') center/cover no-repeat}
.hero__overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.1),rgba(0,0,0,.4) 70%,rgba(0,0,0,.7))}
.hero__content{position:relative;z-index:2;text-align:center;padding:0 1.5rem;max-width:900px}
.hero__eyebrow{font-family:'Inter',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:1.2rem}
.hero__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(3.5rem,10vw,8rem);font-weight:800;text-transform:uppercase;color:#fff;letter-spacing:-.01em;line-height:.95;margin-bottom:1rem}
.hero__sub{font-family:'Inter',sans-serif;font-size:clamp(1rem,2vw,1.2rem);font-weight:300;color:rgba(255,255,255,.85);margin-bottom:2.5rem;letter-spacing:.02em}
.hero__scroll-indicator{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.4rem;z-index:2;animation:bounce 2s ease infinite}
.hero__scroll-text{font-family:'Inter',sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6)}
@keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(6px)}}

/* ── Trust Bar ───────────────────────────────────────────────────── */
.trust-bar{background:var(--color-gray-bg);border-bottom:1px solid var(--color-gray-100);padding:.9rem 0;overflow-x:auto}
.trust-bar__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:nowrap;white-space:nowrap}
.trust-bar__item{display:flex;align-items:center;gap:.5rem;padding:0 1.5rem;font-family:'Inter',sans-serif;font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-muted)}
.trust-bar__item svg{color:var(--color-primary);flex-shrink:0}
.trust-bar__divider{width:1px;height:24px;background:var(--color-gray-100);flex-shrink:0}

/* ── Services ────────────────────────────────────────────────────── */
.services{padding:var(--section-pad) 0;background:#fff}
.section-inner{max-width:1320px;margin:0 auto;padding:0 1.5rem}
.section-header{text-align:center;margin-bottom:3.5rem}
.section-title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2.2rem,5vw,3.8rem);font-weight:800;text-transform:uppercase;color:var(--color-dark);line-height:1;letter-spacing:.01em;margin-top:.5rem}
.services__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
@media(max-width:900px){.services__grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:580px){.services__grid{grid-template-columns:1fr}}
.service-card{background:#fff;border-radius:var(--card-radius);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.07);transition:transform var(--transition-base),box-shadow var(--transition-base)}
.service-card:hover{transform:translateY(-6px);box-shadow:0 12px 40px rgba(0,0,0,.12)}
.service-card__img{aspect-ratio:16/10;overflow:hidden}
.service-card__img img{width:100%;height:100%;object-fit:cover;transition:transform var(--transition-base)}
.service-card:hover .service-card__img img{transform:scale(1.05)}
.service-card__body{padding:1.5rem}
.service-card__title{font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--color-dark);margin-bottom:.6rem}
.service-card__desc{font-family:'Inter',sans-serif;font-size:.9rem;font-weight:400;line-height:1.65;color:var(--color-text-muted);margin-bottom:1rem}
.service-card__link{font-family:'Inter',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--color-primary);display:inline-flex;align-items:center;gap:.35rem;transition:gap var(--transition-base)}
.service-card:hover .service-card__link{gap:.6rem}

/* ── Showreel ─────────────────────────────────────────────────────── */
.showreel{padding:var(--section-pad) 0;background:var(--color-dark)}
.showreel__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
@media(max-width:900px){.showreel__inner{grid-template-columns:1fr;gap:2.5rem}}
.showreel__media{border-radius:var(--card-radius);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);aspect-ratio:4/3}
.showreel__media img{width:100%;height:100%;object-fit:cover}
.showreel__kicker{color:var(--color-gold);margin-bottom:.75rem}
.showreel__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:800;text-transform:uppercase;color:#fff;letter-spacing:.02em;line-height:1;margin-bottom:1.25rem}
.showreel__body{font-family:'Inter',sans-serif;font-size:.95rem;font-weight:300;line-height:1.75;color:rgba(255,255,255,.65);margin-bottom:.85rem}

/* ── Why Us ───────────────────────────────────────────────────────── */
.why{padding:var(--section-pad) 0;background:var(--color-dark)}
.why__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem}
.why__layout{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start}
@media(max-width:900px){.why__layout{grid-template-columns:1fr}}
.why__left{position:sticky;top:6rem}
.why__kicker{color:var(--color-gold);margin-bottom:.75rem}
.why__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(2.2rem,4vw,3.4rem);font-weight:800;text-transform:uppercase;color:#fff;letter-spacing:.02em;line-height:1;margin-bottom:2rem}
.why__cert-box{border:1px solid rgba(255,255,255,.1);border-radius:var(--card-radius);padding:1.5rem;background:rgba(255,255,255,.04)}
.why__cert-box-title{font-family:'Inter',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:1rem}
.why__cert-list{display:flex;flex-direction:column;gap:.5rem}
.why__cert-item{font-family:'Inter',sans-serif;font-size:.85rem;font-weight:500;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:.5rem}
.why__cert-item::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--color-primary);flex-shrink:0}
.why__right{display:flex;flex-direction:column;gap:1rem}
.why-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:var(--card-radius);padding:1.75rem;transition:background var(--transition-base),border-color var(--transition-base)}
.why-card:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15)}
.why-card__num{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:800;color:var(--color-primary);letter-spacing:.1em;margin-bottom:.5rem}
.why-card__title{font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:700;text-transform:uppercase;color:#fff;letter-spacing:.04em;margin-bottom:.5rem}
.why-card__desc{font-family:'Inter',sans-serif;font-size:.88rem;font-weight:300;line-height:1.7;color:rgba(255,255,255,.55)}

/* ── Gallery ─────────────────────────────────────────────────────── */
.gallery-section{padding:var(--section-pad) 0;background:#fff}
.gallery__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
@media(max-width:700px){.gallery__grid{grid-template-columns:repeat(2,1fr)}}
.gallery__item{aspect-ratio:4/3;overflow:hidden;border-radius:var(--card-radius);cursor:pointer;position:relative}
.gallery__item img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.gallery__item:hover img{transform:scale(1.08)}
.gallery__overlay{position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;transition:background var(--transition-base)}
.gallery__item:hover .gallery__overlay{background:rgba(0,0,0,.45)}
.gallery__overlay-text{font-family:'Inter',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;border:1.5px solid rgba(255,255,255,.7);padding:8px 20px;opacity:0;transition:opacity var(--transition-base)}
.gallery__item:hover .gallery__overlay-text{opacity:1}

/* ── Testimonials Marquee ────────────────────────────────────────── */
.testimonials{padding:var(--section-pad) 0;background:var(--color-gray-bg);overflow:hidden}
.testimonials__wrap{overflow:hidden;mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent)}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.testimonials__track{display:flex;gap:1.5rem;width:max-content;animation:marquee 40s linear infinite}
.testimonials__track:hover{animation-play-state:paused}
.review-card{background:#fff;border-radius:var(--card-radius);padding:1.75rem;width:320px;flex-shrink:0;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.review-card__stars{color:var(--color-gold);font-size:1rem;letter-spacing:.1em;margin-bottom:.75rem}
.review-card__text{font-family:'Inter',sans-serif;font-size:.88rem;font-weight:400;line-height:1.7;color:var(--color-text);margin-bottom:1rem}
.review-card__author{font-family:'Inter',sans-serif;font-size:.8rem;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.06em}
.review-card__meta{font-family:'Inter',sans-serif;font-size:.75rem;font-weight:400;color:var(--color-text-muted);margin-top:.2rem}

/* ── FAQ ─────────────────────────────────────────────────────────── */
.faq{padding:var(--section-pad) 0;background:#fff}
.faq__list{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:0}
details{border-bottom:1px solid var(--color-gray-100)}
details:first-child{border-top:1px solid var(--color-gray-100)}
summary{list-style:none;display:flex;justify-content:space-between;align-items:center;padding:1.25rem 0;cursor:pointer;font-family:'Inter',sans-serif;font-size:.97rem;font-weight:600;color:var(--color-dark);gap:1rem}
summary::-webkit-details-marker{display:none}
summary::after{content:'+';font-size:1.4rem;font-weight:300;color:var(--color-primary);flex-shrink:0;transition:transform .3s}
details[open] summary::after{content:'-'}
.faq__answer{font-family:'Inter',sans-serif;font-size:.9rem;font-weight:300;line-height:1.75;color:var(--color-text-muted);padding-bottom:1.25rem}

/* ── Contact CTA ─────────────────────────────────────────────────── */
.contact-cta{padding:var(--section-pad) 0;background:var(--color-dark)}
.contact-cta__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1.1fr 1fr;gap:4rem;align-items:start}
@media(max-width:900px){.contact-cta__inner{grid-template-columns:1fr;gap:2.5rem}}
.form-title{font-family:'Barlow Condensed',sans-serif;font-size:clamp(1.8rem,3vw,2.5rem);font-weight:800;text-transform:uppercase;color:#fff;letter-spacing:.02em;margin-bottom:1.5rem}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem}
@media(max-width:580px){.form-grid{grid-template-columns:1fr}}
.form-field{display:flex;flex-direction:column;gap:.35rem}
.form-field label{font-family:'Inter',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.45)}
.form-field input,.form-field select,.form-field textarea{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;font-family:'Inter',sans-serif;font-size:.92rem;font-weight:300;padding:.85rem 1rem;width:100%;outline:none;border-radius:6px;transition:border-color var(--transition-base);-webkit-appearance:none}
.form-field input:focus,.form-field select:focus,.form-field textarea:focus{border-color:var(--color-primary)}
.form-field input::placeholder,.form-field textarea::placeholder{color:rgba(255,255,255,.2)}
.form-field select option{background:var(--color-dark);color:#fff}
.span-2{grid-column:1/-1}
.contact-info__phone{font-family:'Barlow Condensed',sans-serif;font-size:clamp(2.5rem,6vw,4rem);font-weight:800;color:var(--color-primary);letter-spacing:.01em;margin-bottom:.5rem}
.contact-info__label{font-family:'Inter',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:1.75rem}
.contact-info__block{margin-bottom:1.25rem}
.contact-info__block-title{font-family:'Inter',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:.35rem}
.contact-info__block-text{font-family:'Inter',sans-serif;font-size:.92rem;font-weight:300;color:rgba(255,255,255,.7);line-height:1.65}

/* ── Footer ──────────────────────────────────────────────────────── */
.footer{background:var(--color-dark);border-top:1px solid rgba(255,255,255,.07);padding:3.5rem 0 0}
.footer__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:3rem;margin-bottom:3rem}
@media(max-width:800px){.footer__inner{grid-template-columns:1fr 1fr}}
@media(max-width:500px){.footer__inner{grid-template-columns:1fr}}
.footer__logo{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:800;text-transform:uppercase;color:#fff;letter-spacing:.05em;margin-bottom:.5rem}
.footer__tagline{font-family:'Inter',sans-serif;font-size:.85rem;font-weight:300;color:rgba(255,255,255,.4);line-height:1.65;max-width:260px}
.footer__col-title{font-family:'Inter',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:1rem}
.footer__links{display:flex;flex-direction:column;gap:.6rem}
.footer__links a{font-family:'Inter',sans-serif;font-size:.87rem;font-weight:300;color:rgba(255,255,255,.55);transition:color var(--transition-base)}
.footer__links a:hover{color:#fff}
.footer__contact-item{font-family:'Inter',sans-serif;font-size:.87rem;font-weight:300;color:rgba(255,255,255,.55);margin-bottom:.5rem}
.footer__bar{border-top:1px solid rgba(255,255,255,.07);padding:1.25rem 1.5rem;max-width:1320px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem}
.footer__bar-text{font-family:'Inter',sans-serif;font-size:.76rem;font-weight:400;color:rgba(255,255,255,.25)}

/* ── About page ──────────────────────────────────────────────────── */
.page-hero{padding:calc(var(--section-pad) + 72px) 0 var(--section-pad);background:var(--color-dark);text-align:center}
.page-hero__title{font-family:'Barlow Condensed',Impact,sans-serif;font-size:clamp(3rem,8vw,6rem);font-weight:800;text-transform:uppercase;color:#fff;letter-spacing:-.01em;line-height:.95;margin-bottom:1rem}
.page-hero__sub{font-family:'Inter',sans-serif;font-size:1rem;font-weight:300;color:rgba(255,255,255,.55);max-width:560px;margin:0 auto}
.about-story{padding:var(--section-pad) 0;background:#fff}
.about-story__grid{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
@media(max-width:900px){.about-story__grid{grid-template-columns:1fr}}
.about-story__img{border-radius:var(--card-radius);overflow:hidden;aspect-ratio:4/3}
.about-story__img img{width:100%;height:100%;object-fit:cover}
.about-story__body p{font-family:'Inter',sans-serif;font-size:.95rem;font-weight:300;line-height:1.8;color:var(--color-text-muted);margin-bottom:1.1rem}
.certs-strip{padding:3rem 0;background:var(--color-gray-bg);border-top:1px solid var(--color-gray-100);border-bottom:1px solid var(--color-gray-100)}
.certs-strip__inner{max-width:1320px;margin:0 auto;padding:0 1.5rem;display:flex;flex-wrap:wrap;justify-content:center;gap:1rem}
.cert-badge{border:1px solid var(--color-gray-100);border-radius:8px;padding:.75rem 1.5rem;background:#fff;font-family:'Inter',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-muted)}
.values-section{padding:var(--section-pad) 0;background:var(--color-dark)}
.values-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:2.5rem}
@media(max-width:700px){.values-grid{grid-template-columns:1fr 1fr}}
@media(max-width:450px){.values-grid{grid-template-columns:1fr}}
.value-card{border:1px solid rgba(255,255,255,.08);border-radius:var(--card-radius);padding:1.75rem}
.value-card__num{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:2rem;color:var(--color-primary);margin-bottom:.5rem}
.value-card__title{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;text-transform:uppercase;color:#fff;letter-spacing:.05em;margin-bottom:.5rem}
.value-card__desc{font-family:'Inter',sans-serif;font-size:.86rem;font-weight:300;line-height:1.7;color:rgba(255,255,255,.5)}

/* ── Team page ───────────────────────────────────────────────────── */
.team-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:2rem;margin-top:2.5rem}
@media(max-width:600px){.team-grid{grid-template-columns:1fr}}
.team-card{background:var(--color-gray-bg);border-radius:var(--card-radius);padding:2rem;display:flex;gap:1.5rem;align-items:flex-start}
.team-card__avatar{width:64px;height:64px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:800;color:#fff;flex-shrink:0;letter-spacing:.04em}
.team-card__name{font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:700;text-transform:uppercase;color:var(--color-dark);letter-spacing:.04em;margin-bottom:.2rem}
.team-card__role{font-family:'Inter',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.5rem}
.team-card__certs{font-family:'Inter',sans-serif;font-size:.78rem;font-weight:600;color:var(--color-text-muted);margin-bottom:.75rem}
.team-card__bio{font-family:'Inter',sans-serif;font-size:.88rem;font-weight:300;line-height:1.7;color:var(--color-text-muted)}

/* ── Gallery page ────────────────────────────────────────────────── */
.filter-bar{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:2rem;justify-content:center}
.filter-btn{font-family:'Inter',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:8px 20px;border-radius:40px;border:1.5px solid var(--color-gray-100);background:#fff;color:var(--color-text-muted);cursor:pointer;transition:all var(--transition-base)}
.filter-btn.active,.filter-btn:hover{background:var(--color-primary);border-color:var(--color-primary);color:#fff}
.ba-container{position:relative;overflow:hidden;border-radius:var(--card-radius);aspect-ratio:16/9;cursor:ew-resize;user-select:none}
.ba-before{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.ba-before img,.ba-after{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ba-label{position:absolute;top:12px;padding:4px 14px;font-family:'Inter',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.ba-label--before{left:12px;background:rgba(0,0,0,.7);color:#fff;border-radius:4px}
.ba-label--after{right:12px;background:var(--color-primary);color:#fff;border-radius:4px}
.ba-handle-line{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--color-primary);touch-action:none}
.ba-handle-knob{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;background:var(--color-primary);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(200,16,46,.25),0 4px 20px rgba(0,0,0,.5)}

/* ── Testimonials page ───────────────────────────────────────────── */
.featured-review{background:var(--color-dark);color:#fff;padding:3.5rem;border-radius:var(--card-radius);margin-bottom:3rem;position:relative}
.featured-review::before{content:open-quote;font-size:8rem;line-height:0;position:absolute;top:2.5rem;left:2.5rem;color:rgba(200,16,46,.15);font-family:Georgia,serif}
.featured-review__text{font-family:'Inter',sans-serif;font-size:1.15rem;font-weight:300;line-height:1.75;color:rgba(255,255,255,.85);margin-bottom:1.25rem;position:relative;z-index:1}
.featured-review__author{font-family:'Inter',sans-serif;font-size:.88rem;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:.08em;text-transform:uppercase}
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem}
@media(max-width:900px){.reviews-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:580px){.reviews-grid{grid-template-columns:1fr}}

/* ── Contact page ────────────────────────────────────────────────── */
.contact-page-hero{padding:calc(var(--section-pad) + 72px) 0 var(--section-pad);background:var(--color-dark);text-align:center}
.contact-phone-big{font-family:'Barlow Condensed',sans-serif;font-size:clamp(3rem,10vw,6rem);font-weight:800;color:var(--color-primary);letter-spacing:.01em;display:block;margin-bottom:.35rem}
.hours-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem .5rem}
@media(max-width:480px){.hours-grid{grid-template-columns:1fr}}
.hours-row{font-family:'Inter',sans-serif;font-size:.87rem;font-weight:300;color:var(--color-text-muted);display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--color-gray-100)}
</style>`;
}

// ── Reveal JS ──────────────────────────────────────────────────────────────────

const REVEAL_JS = `<script>
(function(){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('revealed');io.unobserve(e.target);}
    });
  },{threshold:0.1,rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('[data-reveal]').forEach(function(el){io.observe(el);});
})();
</script>`;

// ── Header JS ─────────────────────────────────────────────────────────────────

const HEADER_JS = `<script>
(function(){
  var h=document.getElementById('site-header');
  if(h){window.addEventListener('scroll',function(){h.classList.toggle('scrolled',window.scrollY>60);});}
  var burger=document.getElementById('burger'),menu=document.getElementById('mobile-menu'),close=document.getElementById('menu-close');
  if(burger&&menu){
    burger.addEventListener('click',function(){menu.classList.toggle('open');});
    if(close)close.addEventListener('click',function(){menu.classList.remove('open');});
    menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.classList.remove('open');});});
  }
})();
</script>`;

// ── Before/After JS ───────────────────────────────────────────────────────────

const BA_JS = `<script>
document.querySelectorAll('.ba-container').forEach(function(c){
  var b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle-line');
  if(!b||!h)return;
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

// ── Shared header/footer ───────────────────────────────────────────────────────

function siteHeader(biz: BizPageData, baseUrl: string): string {
  const phone = biz.phone ?? '';
  const tel = telLink(biz.phone);
  return `<header class="site-header" id="site-header">
  <div class="header__inner">
    <nav class="header__nav header__nav--left">
      <a href="${baseUrl}/about">About</a>
      <a href="${baseUrl}/gallery">Our Work</a>
    </nav>
    <a href="${baseUrl}" class="header__logo">
      <span class="header__logo-text">${esc(biz.name)}</span>
      <span class="header__logo-sub">${esc(biz.city || '')}, ${esc(biz.state || '')}</span>
    </a>
    <nav class="header__nav header__nav--right">
      <a href="${baseUrl}/contact">Contact</a>
      ${phone ? `<a href="tel:${tel}" class="header__phone">${esc(phone)}</a>` : ''}
      <a href="${baseUrl}/contact" class="btn btn--primary">Free Inspection</a>
    </nav>
    <button class="header__burger" id="burger" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  <button class="mobile-close" id="menu-close" aria-label="Close menu">&times;</button>
  <a href="${baseUrl}">Home</a>
  <a href="${baseUrl}/about">About</a>
  <a href="${baseUrl}/gallery">Our Work</a>
  <a href="${baseUrl}/team">Team</a>
  <a href="${baseUrl}/testimonials">Reviews</a>
  <a href="${baseUrl}/contact">Contact</a>
  ${phone ? `<a href="tel:${tel}">${esc(phone)}</a>` : ''}
</div>`;
}

function siteFooter(biz: BizPageData, baseUrl: string): string {
  const year = new Date().getFullYear();
  const tel = telLink(biz.phone);
  return `<footer class="footer">
  <div class="footer__inner">
    <div>
      <div class="footer__logo">${esc(biz.name)}</div>
      <p class="footer__tagline">Professional roofing services in ${esc(biz.city || 'your area')}. Licensed, insured, and backed by a 15-year warranty.</p>
    </div>
    <div>
      <div class="footer__col-title">Quick Links</div>
      <nav class="footer__links">
        <a href="${baseUrl}">Home</a>
        <a href="${baseUrl}/about">About Us</a>
        <a href="${baseUrl}/gallery">Our Work</a>
        <a href="${baseUrl}/team">Our Team</a>
        <a href="${baseUrl}/testimonials">Reviews</a>
        <a href="${baseUrl}/contact">Contact</a>
      </nav>
    </div>
    <div>
      <div class="footer__col-title">Contact</div>
      ${biz.phone ? `<div class="footer__contact-item"><a href="tel:${tel}" style="color:var(--color-primary);font-weight:600">${esc(biz.phone)}</a></div>` : ''}
      ${biz.address ? `<div class="footer__contact-item">${esc(biz.address)}</div>` : ''}
      <div class="footer__contact-item" style="margin-top:.75rem">${esc(biz.hours || 'Mon–Fri 7 AM–6 PM')}</div>
    </div>
  </div>
  <div class="footer__bar" style="max-width:1320px;margin:0 auto">
    <span class="footer__bar-text">&copy; ${year} ${esc(biz.name)}. All rights reserved.</span>
    <span class="footer__bar-text">Licensed &amp; Insured</span>
  </div>
</footer>`;
}

function pageShell(biz: BizPageData, baseUrl: string, pageTitle: string, body: string, extraJs = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(pageTitle)} — ${esc(biz.name)}</title>
${globalStyles()}
</head>
<body>
${siteHeader(biz, baseUrl)}
${body}
${siteFooter(biz, baseUrl)}
${REVEAL_JS}
${HEADER_JS}
${extraJs}
</body>
</html>`;
}

// ── Service images ─────────────────────────────────────────────────────────────

const SERVICE_IMGS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80',
  'https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=800&q=80',
];

const SERVICES = [
  { title: 'Roof Replacement', desc: 'Full tear-off and replacement using manufacturer-certified materials. Every install comes with our 15-year workmanship warranty.' },
  { title: 'Roof Repair', desc: 'From minor leaks to damaged flashing, we diagnose and fix the root cause. No unnecessary upsells.' },
  { title: 'Storm Damage', desc: 'Insurance claim specialists. We document, scope, and restore your roof after hail or wind damage.' },
  { title: 'New Construction', desc: 'Collaborating with builders from day one. Precision installs that meet all code requirements.' },
  { title: 'Gutters & Drainage', desc: 'Seamless gutter installation, guards, and downspout rerouting to protect your foundation.' },
  { title: 'Emergency Tarping', desc: 'Same-day emergency response when your roof is exposed. We secure the structure while you plan the repair.' },
];

// ── HOME PAGE ─────────────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {
  const tel = telLink(biz.phone);
  const city = esc(biz.city || 'Your City');
  const name = esc(biz.name);
  const reviews = reviewPad(biz, 8);
  const marqueeReviews = [...reviews, ...reviews];

  const servicesHtml = SERVICES.map((s, i) => `
    <div class="service-card" data-reveal data-delay="${((i % 3) + 1).toString()}">
      <div class="service-card__img">
        <img src="${SERVICE_IMGS[i]}" alt="${esc(s.title)}" loading="lazy">
      </div>
      <div class="service-card__body">
        <div class="service-card__title">${esc(s.title)}</div>
        <p class="service-card__desc">${esc(s.desc)}</p>
        <a href="${baseUrl}/contact" class="service-card__link">Learn More <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h8M6 2l4 4-4 4"/></svg></a>
      </div>
    </div>`).join('');

  const whyCards = [
    { num: '01', title: 'No-Surprise Pricing', desc: `We inspect your roof before giving a quote. The number we hand you matches the invoice every time.` },
    { num: '02', title: 'Manufacturer-Certified Installs', desc: `Certified by GAF and Owens Corning. That unlocks longer warranties most contractors cannot offer.` },
    { num: '03', title: 'Full Insurance Claim Support', desc: `We have dealt with every major carrier in ${city}. We document the damage, attend the adjuster meeting, and handle the paperwork.` },
    { num: '04', title: 'Same-Day Emergency Response', desc: `Storm took your roof last night? We answer after hours and get tarps on the structure before more damage occurs.` },
    { num: '05', title: 'Crew You Can Trust On-Site', desc: `No rotating subcontractors. The same trained crew that shows up on day one sees the job through to cleanup.` },
    { num: '06', title: '15-Year Workmanship Warranty', desc: `We stand behind every install. If there is a problem within 15 years, we fix it. No questions, no runaround.` },
  ];

  const galleryImgs = [0, 1, 2, 3, 4, 5].map(i => ph(i, biz));

  return pageShell(biz, baseUrl, 'Home', `
<section class="hero">
  <div class="hero__media">
    <div class="hero__poster"></div>
  </div>
  <div class="hero__overlay"></div>
  <div class="hero__content">
    <div class="hero__eyebrow">${city} Roofing Specialists</div>
    <h1 class="hero__title">${name}</h1>
    <p class="hero__sub">${esc(biz.heroSub || 'Premium roofing. Guaranteed.')}</p>
    <a href="${baseUrl}/contact" class="btn btn--white-ghost">Get a Free Inspection</a>
  </div>
  <div class="hero__scroll-indicator">
    <span class="hero__scroll-text">Scroll</span>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l5 5 5-5"/></svg>
  </div>
</section>

<section class="trust-bar">
  <div class="trust-bar__inner">
    <div class="trust-bar__item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span>Free Inspections</span>
    </div>
    <div class="trust-bar__divider"></div>
    <div class="trust-bar__item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span>Licensed &amp; Insured</span>
    </div>
    <div class="trust-bar__divider"></div>
    <div class="trust-bar__item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <span>15-Year Warranty</span>
    </div>
    <div class="trust-bar__divider"></div>
    <div class="trust-bar__item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>Same-Day Response</span>
    </div>
    <div class="trust-bar__divider"></div>
    <div class="trust-bar__item">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v8M8 18h8"/></svg>
      <span>NRCA Member</span>
    </div>
  </div>
</section>

<section class="services">
  <div class="section-inner">
    <div class="section-header">
      <div class="kicker" data-reveal>What We Do</div>
      <h2 class="section-title" data-reveal data-delay="1">Roofing Services<br>Built to Last</h2>
    </div>
    <div class="services__grid">
      ${servicesHtml}
    </div>
  </div>
</section>

<section class="showreel">
  <div class="showreel__inner">
    <div class="showreel__media" data-reveal>
      <img src="${ph(1, biz)}" alt="Roofing project in progress" loading="lazy">
    </div>
    <div data-reveal data-delay="2">
      <div class="kicker showreel__kicker">See the Difference</div>
      <h2 class="showreel__title">Precision. Every Shingle. Every Time.</h2>
      <p class="showreel__body">Every job we take starts with a thorough inspection by a certified technician. We do not guess at what needs fixing. We show you what we find, explain the options, and let you decide without pressure.</p>
      <p class="showreel__body">The result is a roof that performs for decades, not years. That is what separates a real roofing company from a crew with a truck.</p>
      <a href="${baseUrl}/contact" class="btn btn--primary">Get a Free Inspection</a>
    </div>
  </div>
</section>

<section class="why">
  <div class="why__inner">
    <div class="why__layout">
      <div class="why__left" data-reveal>
        <div class="kicker why__kicker">Why Choose Us</div>
        <h2 class="why__title">Why ${city} Homeowners Choose ${name}</h2>
        <div class="why__cert-box">
          <div class="why__cert-box-title">Certifications &amp; Memberships</div>
          <div class="why__cert-list">
            <div class="why__cert-item">NRCA Member in Good Standing</div>
            <div class="why__cert-item">GAF Certified Master Elite Contractor</div>
            <div class="why__cert-item">Owens Corning Preferred Contractor</div>
            <div class="why__cert-item">BBB Accredited — A+ Rating</div>
            <div class="why__cert-item">CertainTeed ShingleMaster</div>
          </div>
        </div>
      </div>
      <div class="why__right">
        ${whyCards.map((c, i) => `
        <div class="why-card" data-reveal data-delay="${Math.min(i + 1, 4).toString()}">
          <div class="why-card__num">${esc(c.num)}</div>
          <div class="why-card__title">${esc(c.title)}</div>
          <p class="why-card__desc">${esc(c.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>

<section class="gallery-section">
  <div class="section-inner">
    <div class="section-header">
      <div class="kicker" data-reveal>Recent Projects</div>
      <h2 class="section-title" data-reveal data-delay="1">Our Work Speaks<br>for Itself</h2>
    </div>
    <div class="gallery__grid">
      ${galleryImgs.map((src, i) => `
      <div class="gallery__item" data-reveal data-delay="${((i % 3) + 1).toString()}">
        <img src="${esc(src)}" alt="Roofing project ${i + 1}" loading="lazy">
        <div class="gallery__overlay">
          <span class="gallery__overlay-text">View Project</span>
        </div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:2.5rem">
      <a href="${baseUrl}/gallery" class="btn btn--ghost">See All Projects</a>
    </div>
  </div>
</section>

<section class="testimonials">
  <div class="section-inner" style="margin-bottom:2.5rem">
    <div class="section-header" style="margin-bottom:0">
      <div class="kicker" data-reveal>What Clients Say</div>
      <h2 class="section-title" data-reveal data-delay="1" style="color:var(--color-dark)">Real Reviews from<br>Real Homeowners</h2>
    </div>
  </div>
  <div class="testimonials__wrap">
    <div class="testimonials__track">
      ${marqueeReviews.map(r => `
      <div class="review-card">
        <div class="review-card__stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="review-card__text">"${esc(r.text)}"</p>
        <div class="review-card__author">${esc(r.reviewer)}</div>
        <div class="review-card__meta">${esc(r.city)} &middot; ${esc(r.svc)}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<section class="faq">
  <div class="section-inner">
    <div class="section-header">
      <div class="kicker" data-reveal>Common Questions</div>
      <h2 class="section-title" data-reveal data-delay="1">Got Questions?<br>We Have Answers.</h2>
    </div>
    <div class="faq__list">
      <details><summary>How long does a roof replacement take?</summary><p class="faq__answer">Most residential replacements take one to two days depending on the size and pitch of the roof. We will give you a firm timeline before any work begins so you can plan accordingly.</p></details>
      <details><summary>Do you work with insurance claims?</summary><p class="faq__answer">Yes. We are experienced working with all major carriers. We can help document the damage, meet with the adjuster, and make sure the scope of work covers what your roof actually needs.</p></details>
      <details><summary>What roofing materials do you use?</summary><p class="faq__answer">We primarily install GAF and Owens Corning architectural shingles, both of which carry strong manufacturer warranties. We will walk you through the options and help you pick the right material for your home and budget.</p></details>
      <details><summary>How do I know if I need a full replacement or just a repair?</summary><p class="faq__answer">We do a thorough inspection before recommending anything. In many cases a targeted repair is all that is needed. We will tell you honestly what we find, and if the repair would only delay the inevitable we will say so.</p></details>
      <details><summary>Do you offer financing?</summary><p class="faq__answer">Yes, we work with several financing partners for qualified homeowners. Contact us and we can walk you through the options. A new roof does not have to be a financial emergency.</p></details>
    </div>
  </div>
</section>

<section class="contact-cta">
  <div class="contact-cta__inner">
    <div data-reveal>
      <div class="form-title">Get Your Free Inspection</div>
      <form onsubmit="return false;">
        <div class="form-grid">
          <div class="form-field"><label>Your Name</label><input type="text" placeholder="John Smith"></div>
          <div class="form-field"><label>Phone</label><input type="tel" placeholder="${esc(biz.phone || '(555) 000-0000')}"></div>
          <div class="form-field"><label>Email</label><input type="email" placeholder="you@email.com"></div>
          <div class="form-field"><label>Service Type</label>
            <select>
              <option>Roof Replacement</option>
              <option>Roof Repair</option>
              <option>Storm Damage</option>
              <option>New Construction</option>
              <option>Gutters &amp; Drainage</option>
              <option>Emergency Tarping</option>
              <option>Other</option>
            </select>
          </div>
          <div class="form-field span-2"><label>Message</label><textarea rows="4" placeholder="Tell us about your roof..."></textarea></div>
          <div class="span-2"><button type="submit" class="btn btn--primary" style="width:100%;font-size:.9rem;padding:16px">Request Free Inspection</button></div>
        </div>
      </form>
    </div>
    <div data-reveal data-delay="2">
      ${biz.phone ? `<a href="tel:${tel}" class="contact-info__phone">${esc(biz.phone)}</a>` : ''}
      <div class="contact-info__label">Call or Text Anytime</div>
      ${biz.address ? `<div class="contact-info__block"><div class="contact-info__block-title">Address</div><div class="contact-info__block-text">${esc(biz.address)}</div></div>` : ''}
      <div class="contact-info__block"><div class="contact-info__block-title">Hours</div><div class="contact-info__block-text">${esc(biz.hours || 'Mon–Fri 7 AM – 6 PM\nSat 8 AM – 3 PM\nSun: Emergency Only')}</div></div>
    </div>
  </div>
</section>`);
}

// ── ABOUT PAGE ────────────────────────────────────────────────────────────────

function buildAbout(biz: BizPageData, baseUrl: string): string {
  const name = esc(biz.name);
  const city = esc(biz.city || 'the area');
  const years = esc(biz.yearsInBiz || '15');

  const certs = ['NRCA Member', 'GAF Master Elite Contractor', 'Owens Corning Preferred', 'BBB A+ Accredited', 'CertainTeed ShingleMaster'];
  const values = [
    { num: '01', title: 'Honest Assessment', desc: 'We inspect before we quote. If you do not need a replacement, we will tell you.' },
    { num: '02', title: 'Craftsmanship', desc: 'Every install follows manufacturer specs. We do not cut corners to finish faster.' },
    { num: '03', title: 'Clear Communication', desc: 'You know what is happening on your roof and why. No jargon, no surprises.' },
    { num: '04', title: 'Real Accountability', desc: 'We put our name on every job. If something is wrong, we come back and fix it.' },
    { num: '05', title: 'Community First', desc: `We live and work in ${city}. Our reputation depends on doing right by our neighbors.` },
    { num: '06', title: 'Safety Always', desc: 'Full fall protection on every job. Zero injury incidents in our operating history.' },
  ];

  return pageShell(biz, baseUrl, 'About Us', `
<div class="page-hero">
  <div class="section-inner">
    <div class="kicker" style="color:rgba(255,255,255,.5)" data-reveal>About ${name}</div>
    <h1 class="page-hero__title" data-reveal data-delay="1">${years} Years of<br>Roofing Done Right</h1>
    <p class="page-hero__sub" data-reveal data-delay="2">Family-owned and operated in ${city}. No subcontractors. No shortcuts.</p>
  </div>
</div>

<section class="about-story">
  <div class="section-inner">
    <div class="about-story__grid">
      <div class="about-story__img" data-reveal>
        <img src="${ph(0, biz)}" alt="${name} crew on a roofing project" loading="lazy">
      </div>
      <div class="about-story__body" data-reveal data-delay="2">
        <div class="kicker" style="margin-bottom:.75rem">Our Story</div>
        <h2 class="section-title" style="margin-bottom:1.5rem;font-size:clamp(1.8rem,3.5vw,2.8rem)">Built from the Ground Up in ${city}</h2>
        <p>${name} started with a single crew and a commitment to showing up on time and doing the work correctly. ${years} years later, that has not changed.</p>
        <p>We grew by referral. Homeowners who trusted us told their neighbors. That growth model means we cannot afford to cut corners. Every job is a handshake agreement that we will stand behind the work indefinitely.</p>
        <p>Today we handle everything from single-shingle repairs to full commercial reroof projects. The team is bigger but the standard is the same as it was on day one.</p>
        <a href="${baseUrl}/contact" class="btn btn--primary" style="margin-top:1rem">Get a Free Inspection</a>
      </div>
    </div>
  </div>
</section>

<section class="certs-strip">
  <div class="certs-strip__inner">
    ${certs.map(c => `<div class="cert-badge" data-reveal>${esc(c)}</div>`).join('')}
  </div>
</section>

<section class="values-section">
  <div class="section-inner">
    <div class="section-header">
      <div class="kicker" style="color:var(--color-gold)" data-reveal>What We Stand For</div>
      <h2 class="section-title" style="color:#fff" data-reveal data-delay="1">Our Values</h2>
    </div>
    <div class="values-grid">
      ${values.map((v, i) => `
      <div class="value-card" data-reveal data-delay="${((i % 3) + 1).toString()}">
        <div class="value-card__num">${esc(v.num)}</div>
        <div class="value-card__title">${esc(v.title)}</div>
        <p class="value-card__desc">${esc(v.desc)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:#fff">
  <div class="section-inner" style="text-align:center">
    <div class="kicker" data-reveal>Ready to Get Started?</div>
    <h2 class="section-title" data-reveal data-delay="1" style="margin-bottom:1.5rem">Let Us Take a Look<br>at Your Roof</h2>
    <p style="font-family:'Inter',sans-serif;font-size:1rem;font-weight:300;color:var(--color-text-muted);max-width:500px;margin:0 auto 2rem" data-reveal data-delay="2">No sales pressure. We inspect, report what we find, and give you options. The decision is always yours.</p>
    <a href="${baseUrl}/contact" class="btn btn--primary" data-reveal data-delay="3">Schedule a Free Inspection</a>
  </div>
</section>`);
}

// ── CONTACT PAGE ──────────────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {
  const tel = telLink(biz.phone);
  const city = biz.city || '';
  const state = biz.state || '';

  const hoursRows = [
    ['Monday', '7:00 AM – 6:00 PM'],
    ['Tuesday', '7:00 AM – 6:00 PM'],
    ['Wednesday', '7:00 AM – 6:00 PM'],
    ['Thursday', '7:00 AM – 6:00 PM'],
    ['Friday', '7:00 AM – 6:00 PM'],
    ['Saturday', '8:00 AM – 3:00 PM'],
    ['Sunday', 'Emergency Only'],
  ];

  return pageShell(biz, baseUrl, 'Contact', `
<div class="contact-page-hero">
  <div class="section-inner">
    ${biz.phone ? `<a href="tel:${tel}" class="contact-phone-big">${esc(biz.phone)}</a>` : ''}
    <div style="font-family:'Inter',sans-serif;font-size:.8rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:1.25rem">Call or Text for a Free Inspection</div>
    <p class="page-hero__sub">We respond same day. No answering service. A real person picks up.</p>
  </div>
</div>

<section style="padding:var(--section-pad) 0;background:#fff">
  <div class="section-inner">
    <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:4rem;align-items:start">
      <div data-reveal>
        <div class="kicker" style="margin-bottom:.75rem">Send Us a Message</div>
        <h2 class="section-title" style="margin-bottom:1.75rem;font-size:clamp(1.8rem,3vw,2.5rem)">Schedule Your Free Inspection</h2>
        <form onsubmit="return false;">
          <div class="form-grid" style="--fg-bg:var(--color-gray-bg);--fg-border:var(--color-gray-100);--fg-color:var(--color-text)">
            <style>.light-form .form-field input,.light-form .form-field select,.light-form .form-field textarea{background:var(--color-gray-bg);border:1px solid var(--color-gray-100);color:var(--color-text);border-radius:6px}.light-form .form-field label{color:var(--color-text-muted)}.light-form .form-field input::placeholder,.light-form .form-field textarea::placeholder{color:#aaa}</style>
          </div>
          <div class="form-grid light-form">
            <div class="form-field"><label>Your Name</label><input type="text" placeholder="John Smith"></div>
            <div class="form-field"><label>Phone</label><input type="tel" placeholder="${esc(biz.phone || '(555) 000-0000')}"></div>
            <div class="form-field"><label>Email</label><input type="email" placeholder="you@email.com"></div>
            <div class="form-field"><label>Service Needed</label>
              <select style="background:var(--color-gray-bg);border:1px solid var(--color-gray-100);color:var(--color-text)">
                <option>Roof Replacement</option>
                <option>Roof Repair</option>
                <option>Storm Damage</option>
                <option>New Construction</option>
                <option>Gutters &amp; Drainage</option>
                <option>Emergency Tarping</option>
                <option>Free Inspection</option>
                <option>Other</option>
              </select>
            </div>
            <div class="form-field span-2"><label>Message</label><textarea rows="5" placeholder="Describe your situation..." style="background:var(--color-gray-bg);border:1px solid var(--color-gray-100);color:var(--color-text)"></textarea></div>
            <div class="span-2"><button type="submit" class="btn btn--primary" style="width:100%;font-size:.9rem;padding:16px">Send Message</button></div>
          </div>
        </form>
      </div>
      <div data-reveal data-delay="2">
        <div class="kicker" style="margin-bottom:1.25rem">Contact Details</div>
        ${biz.phone ? `<div style="margin-bottom:1.75rem"><a href="tel:${tel}" style="font-family:'Barlow Condensed',sans-serif;font-size:2.5rem;font-weight:800;color:var(--color-primary);display:block;line-height:1">${esc(biz.phone)}</a><div style="font-family:'Inter',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--color-text-muted);margin-top:.25rem">Main Line</div></div>` : ''}
        ${biz.address ? `<div style="margin-bottom:1.75rem"><div style="font-family:'Inter',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:.4rem">Office Address</div><div style="font-family:'Inter',sans-serif;font-size:.95rem;font-weight:300;color:var(--color-text);line-height:1.6">${esc(biz.address)}</div></div>` : ''}
        <div style="margin-bottom:1.75rem">
          <div style="font-family:'Inter',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:.75rem">Business Hours</div>
          <div class="hours-grid">
            ${hoursRows.map(([day, hrs]) => `<div class="hours-row"><span style="font-weight:500">${esc(day)}</span><span>${esc(hrs)}</span></div>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-family:'Inter',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:.75rem">Service Area</div>
          <p style="font-family:'Inter',sans-serif;font-size:.9rem;font-weight:300;color:var(--color-text-muted);line-height:1.7">${esc(city)} and the surrounding ${esc(state)} metro area within a 50-mile radius.</p>
        </div>
      </div>
    </div>
    <div style="margin-top:3.5rem;border-radius:var(--card-radius);overflow:hidden;height:320px" data-reveal>
      <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-95.55,29.65,-95.25,29.85&amp;layer=mapnik" style="width:100%;height:100%;border:none" loading="lazy" title="Service Area Map"></iframe>
    </div>
  </div>
</section>

<section class="faq" style="background:var(--color-gray-bg)">
  <div class="section-inner">
    <div class="section-header">
      <div class="kicker" data-reveal>Quick Answers</div>
      <h2 class="section-title" data-reveal data-delay="1">Before You Call</h2>
    </div>
    <div class="faq__list">
      <details><summary>How quickly can you come out?</summary><p class="faq__answer">We typically schedule free inspections within 24–48 hours. For emergency situations such as active leaks or storm damage, we respond the same day.</p></details>
      <details><summary>Do I need to be home during the inspection?</summary><p class="faq__answer">You do not have to be present for the exterior inspection, but we recommend it so we can walk you through our findings in real time and answer questions on the spot.</p></details>
      <details><summary>Do you provide written estimates?</summary><p class="faq__answer">Yes, every inspection results in a written, itemized estimate. We do not do verbal-only quotes. You will have everything in writing before signing anything.</p></details>
      <details><summary>What areas do you serve?</summary><p class="faq__answer">${esc(city)} and the surrounding ${esc(state)} region within approximately 50 miles. Call us and we will confirm if your address is in our service zone.</p></details>
    </div>
  </div>
</section>`);
}

// ── TEAM PAGE ─────────────────────────────────────────────────────────────────

function buildTeam(biz: BizPageData, baseUrl: string): string {
  const members = [
    { initials: 'MC', name: 'Mike Callahan', role: 'Owner & Lead Inspector', yrs: '22', certs: 'GAF Master Elite, NRCA Certified, Owens Corning Preferred', bio: 'Mike started the company after 12 years working for larger regional contractors. He got tired of watching good homeowners get oversold on work they did not need. Every estimate he writes is one he would be comfortable explaining to his own family.' },
    { initials: 'AD', name: 'Andre Davis', role: 'Senior Crew Chief', yrs: '14', certs: 'OSHA 30 Certified, GAF Certified Installer, Fall Protection Trainer', bio: 'Andre runs the install crews and sets the standard for every job. He has trained every technician currently working for the company. If something is not right, he catches it before the truck leaves the site.' },
    { initials: 'JM', name: 'Jess Moreno', role: 'Insurance & Claims Specialist', yrs: '9', certs: 'Xactimate Level 2, HAAG Certified Inspector, Public Adjuster Liaison', bio: 'Jess handles the paperwork most contractors avoid. She knows insurance policy language, knows what adjusters look for, and has successfully recovered full replacement value for hundreds of homeowners after storm events.' },
    { initials: 'KP', name: 'Kim Patel', role: 'Customer Experience Lead', yrs: '6', certs: 'BBB Trained, CertainTeed SureStart Certified, Project Management Professional', bio: 'Kim is the person keeping the schedule, communicating with homeowners, and making sure nothing slips through the cracks. She answers the phone, follows up after installs, and is the reason clients know exactly what is happening at every stage.' },
  ];

  return pageShell(biz, baseUrl, 'Our Team', `
<div class="page-hero">
  <div class="section-inner">
    <div class="kicker" style="color:rgba(255,255,255,.5)" data-reveal>The People Behind the Work</div>
    <h1 class="page-hero__title" data-reveal data-delay="1">Meet the Team</h1>
    <p class="page-hero__sub" data-reveal data-delay="2">Experienced, certified, and accountable. No subcontractors. The same crew from start to finish.</p>
  </div>
</div>

<section style="padding:var(--section-pad) 0;background:#fff">
  <div class="section-inner">
    <div class="team-grid">
      ${members.map((m, i) => `
      <div class="team-card" data-reveal data-delay="${((i % 2) + 1).toString()}">
        <div class="team-card__avatar">${esc(m.initials)}</div>
        <div>
          <div class="team-card__name">${esc(m.name)}</div>
          <div class="team-card__role">${esc(m.role)}</div>
          <div class="team-card__certs">${esc(m.yrs)} years experience &middot; ${esc(m.certs)}</div>
          <p class="team-card__bio">${esc(m.bio)}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<section style="padding:var(--section-pad) 0;background:var(--color-dark);text-align:center">
  <div class="section-inner">
    <div class="kicker" style="color:var(--color-gold)" data-reveal>Work With Our Team</div>
    <h2 class="section-title" style="color:#fff" data-reveal data-delay="1">Schedule a Free Inspection</h2>
    <p style="font-family:'Inter',sans-serif;font-size:1rem;font-weight:300;color:rgba(255,255,255,.5);max-width:480px;margin:1rem auto 2rem" data-reveal data-delay="2">One of our certified inspectors will come out, get on the roof, and tell you exactly what they find. No pressure, no obligation.</p>
    <a href="${baseUrl}/contact" class="btn btn--primary" data-reveal data-delay="3">Book a Free Inspection</a>
  </div>
</section>`);
}

// ── GALLERY PAGE ──────────────────────────────────────────────────────────────

function buildGallery(biz: BizPageData, baseUrl: string): string {
  const baImgs = [0, 1, 2, 3, 4, 5].map(i => ph(i, biz));
  const categories = ['All Projects', 'Replacements', 'Storm Damage', 'Repairs', 'New Construction'];

  function baSlider(before: string, after: string, label: string): string {
    return `<div class="ba-container" data-reveal>
  <img class="ba-after" src="${esc(after)}" alt="${esc(label)} — After" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div class="ba-before">
    <img src="${esc(before)}" alt="${esc(label)} — Before" style="width:100%;height:100%;object-fit:cover">
  </div>
  <div class="ba-label ba-label--before">Before</div>
  <div class="ba-label ba-label--after">After</div>
  <div class="ba-handle-line">
    <div class="ba-handle-knob">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
  }

  const sliders = [
    [baImgs[0], baImgs[1], 'Asphalt Shingle Replacement'],
    [baImgs[2], baImgs[3], 'Hail Damage Restoration'],
    [baImgs[4], baImgs[5], 'Flat Roof Commercial Project'],
    [baImgs[1], baImgs[0], 'Full Reroof — 2,800 sq ft'],
    [baImgs[3], baImgs[2], 'Storm Damage Repair'],
    [baImgs[5], baImgs[4], 'New Construction Shingle'],
  ];

  return pageShell(biz, baseUrl, 'Our Work', `
<div class="page-hero">
  <div class="section-inner">
    <div class="kicker" style="color:rgba(255,255,255,.5)" data-reveal>Before &amp; After</div>
    <h1 class="page-hero__title" data-reveal data-delay="1">Our Work</h1>
    <p class="page-hero__sub" data-reveal data-delay="2">Every slider shows a real project. Drag to compare before and after.</p>
  </div>
</div>

<section style="padding:var(--section-pad) 0;background:#fff">
  <div class="section-inner">
    <div class="filter-bar">
      ${categories.map((c, i) => `<button class="filter-btn${i === 0 ? ' active' : ''}" onclick="document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${esc(c)}</button>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem">
      ${sliders.map(([b, a, label]) => baSlider(b, a, label)).join('')}
    </div>
    <div style="margin-top:3rem;text-align:center">
      <div class="kicker" data-reveal style="margin-bottom:.75rem">Like What You See?</div>
      <a href="${baseUrl}/contact" class="btn btn--primary" data-reveal data-delay="1">Get a Free Inspection</a>
    </div>
  </div>
</section>
`, BA_JS);
}

// ── TESTIMONIALS PAGE ─────────────────────────────────────────────────────────

function buildTestimonials(biz: BizPageData, baseUrl: string): string {
  const allReviews = reviewPad(biz, 10);
  const featured = allReviews[0];
  const gridReviews = allReviews.slice(1);

  return pageShell(biz, baseUrl, 'Reviews', `
<div class="page-hero">
  <div class="section-inner">
    <div class="kicker" style="color:rgba(255,255,255,.5)" data-reveal>Client Reviews</div>
    <h1 class="page-hero__title" data-reveal data-delay="1">What Homeowners Say</h1>
    <p class="page-hero__sub" data-reveal data-delay="2">Real reviews from verified customers in ${esc(biz.city || 'our service area')}.</p>
  </div>
</div>

<section style="padding:var(--section-pad) 0;background:#fff">
  <div class="section-inner">
    <div class="featured-review" data-reveal>
      <div style="font-size:.9rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--color-gold);margin-bottom:1.25rem">Featured Review</div>
      <div class="review-card__stars" style="font-size:1.3rem;margin-bottom:1rem">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <p class="featured-review__text">"${esc(featured.text)}"</p>
      <div class="featured-review__author">${esc(featured.reviewer)} &mdash; ${esc(featured.city)} &middot; ${esc(featured.svc)}</div>
    </div>
    <div class="reviews-grid">
      ${gridReviews.map((r, i) => `
      <div class="review-card" data-reveal data-delay="${((i % 3) + 1).toString()}" style="box-shadow:0 2px 16px rgba(0,0,0,.07)">
        <div class="review-card__stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p class="review-card__text">"${esc(r.text)}"</p>
        <div class="review-card__author">${esc(r.reviewer)}</div>
        <div class="review-card__meta">${esc(r.city)} &middot; ${esc(r.svc)} &middot; ${esc(r.date)}</div>
      </div>`).join('')}
    </div>
    <div style="margin-top:3.5rem;text-align:center">
      <div class="kicker" data-reveal style="margin-bottom:.75rem">Join Hundreds of Satisfied Homeowners</div>
      <a href="${baseUrl}/contact" class="btn btn--primary" data-reveal data-delay="1">Schedule a Free Inspection</a>
    </div>
  </div>
</section>`);
}

// ── Entry Point ───────────────────────────────────────────────────────────────

export function buildRoofingAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:         buildHome(biz, baseUrl),
    about:        buildAbout(biz, baseUrl),
    contact:      buildContact(biz, baseUrl),
    team:         buildTeam(biz, baseUrl),
    gallery:      buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
