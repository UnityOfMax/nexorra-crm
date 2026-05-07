/**
 * Exterminator demo website builder — Pestora-inspired design.
 * Generates 6 HTML pages: home, about, contact, team, gallery, testimonials.
 *
 * Design: Barlow Condensed 700/800 + Inter 300-600, #eab308 yellow + #0a0a00 black,
 * Hugo Builders LLC structure, transparent-to-solid header, CSS marquee testimonials,
 * sticky Why-Us left column, data-reveal scroll animations, before/after clip-path sliders.
 */

import { BizPageData } from './multi-page-builder';

// ── Helpers ───────────────────────────────────────────────────────────────────

const HERO_POSTER = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80';

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80',
  'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=800&q=80',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  'https://images.unsplash.com/photo-1599597143701-7a0e57dfc9dd?w=800&q=80',
  'https://images.unsplash.com/photo-1617369120004-4042c1eec504?w=800&q=80',
];

function extPhoto(idx: number, biz: BizPageData): string {
  return biz.photos[idx] || FALLBACK_PHOTOS[idx % FALLBACK_PHOTOS.length];
}

function phoneClean(biz: BizPageData): string {
  return biz.phone?.replace(/[^0-9+]/g, '') || '';
}

function starText(rating: number | null): string {
  const n = Math.round(rating || 5);
  return '&#9733;'.repeat(n) + '&#9734;'.repeat(Math.max(0, 5 - n));
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const CSS_VARS = `
:root {
  --color-primary: #eab308;
  --color-primary-hover: #ca8a04;
  --color-dark: #0a0a00;
  --color-dark-2: #111100;
  --color-gray-bg: #f5f5f5;
  --color-gray-100: #e5e5e5;
  --color-white: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --section-pad: clamp(4rem, 8vw, 7rem);
  --card-radius: 12px;
  --transition-base: .35s cubic-bezier(.4,0,.2,1);
}`;

// ── Data-reveal animation ─────────────────────────────────────────────────────

const REVEAL_CSS = `
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease;}
[data-reveal].revealed{opacity:1;transform:translateY(0);}
[data-delay="1"]{transition-delay:.1s;}
[data-delay="2"]{transition-delay:.2s;}
[data-delay="3"]{transition-delay:.3s;}
[data-delay="4"]{transition-delay:.4s;}`;

const REVEAL_JS = `<script>
(function(){
  var io=new IntersectionObserver(function(e){
    e.forEach(function(i){
      if(i.isIntersecting){i.target.classList.add('revealed');io.unobserve(i.target);}
    });
  },{threshold:.1,rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('[data-reveal]').forEach(function(el){io.observe(el);});
})();
</script>`;

// ── Before/After slider ───────────────────────────────────────────────────────

function baSlider(beforeSrc: string, afterSrc: string, beforeAlt = 'Before', afterAlt = 'After'): string {
  return `<div class="ba-container" style="position:relative;overflow:hidden;border-radius:var(--card-radius);aspect-ratio:4/3;cursor:ew-resize;user-select:none">
  <img src="${afterSrc}" alt="${afterAlt}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div class="ba-before" style="position:absolute;inset:0;clip-path:inset(0 50% 0 0)">
    <img src="${beforeSrc}" alt="${beforeAlt}" style="width:100%;height:100%;object-fit:cover">
  </div>
  <div style="position:absolute;top:12px;left:12px;background:rgba(0,0,0,.75);color:#fff;padding:3px 10px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-radius:4px">BEFORE</div>
  <div style="position:absolute;top:12px;right:12px;background:#eab308;color:#0a0a00;padding:3px 10px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;border-radius:4px">AFTER</div>
  <div class="ba-handle" style="position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:#eab308;touch-action:none">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;background:#eab308;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(234,179,8,.25),0 4px 16px rgba(0,0,0,.5)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a00" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
}

const BA_JS = `<script>
document.querySelectorAll('.ba-container').forEach(function(c){
  var b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle');var d=false;
  function pos(x){var r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}
  h.addEventListener('mousedown',function(){d=true;});
  window.addEventListener('mouseup',function(){d=false;});
  window.addEventListener('mousemove',function(e){if(d)pos(e.clientX);});
  h.addEventListener('touchstart',function(e){d=true;e.preventDefault();},{passive:false});
  window.addEventListener('touchend',function(){d=false;});
  window.addEventListener('touchmove',function(e){if(d)pos(e.touches[0].clientX);},{passive:true});
});
</script>`;

// ── Shared head ───────────────────────────────────────────────────────────────

function head(title: string, biz: BizPageData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ${biz.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
${CSS_VARS}
body{font-family:'Inter',sans-serif;background:var(--color-white);color:var(--color-text);line-height:1.6}
.bc{font-family:'Barlow Condensed',sans-serif;letter-spacing:.02em}
h1,h2,h3{font-family:'Barlow Condensed',sans-serif}

/* Header */
header{position:fixed;top:0;left:0;right:0;z-index:100;padding:1.25rem 1.5rem;transition:background var(--transition-base),box-shadow var(--transition-base)}
header.scrolled{background:var(--color-dark);box-shadow:0 2px 24px rgba(0,0,0,.4)}
.header-inner{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1rem}
.header-nav-left,.header-nav-right{display:flex;align-items:center;gap:1.75rem}
.header-nav-right{justify-content:flex-end}
.header-nav-left a,.header-nav-right a.nav-link{color:rgba(255,255,255,.75);text-decoration:none;font-size:.8rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;transition:color var(--transition-base)}
.header-nav-left a:hover,.header-nav-right a.nav-link:hover{color:var(--color-primary)}
.company-name{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.35rem;letter-spacing:.05em;text-transform:uppercase;color:#fff;text-decoration:none;text-align:center;white-space:nowrap}
.btn-book{background:var(--color-primary);color:var(--color-dark);font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.55rem 1.25rem;border-radius:6px;text-decoration:none;transition:background var(--transition-base),transform var(--transition-base)}
.btn-book:hover{background:var(--color-primary-hover);transform:translateY(-1px)}

/* Hero */
.hero{position:relative;min-height:100svh;display:flex;align-items:center;overflow:hidden}
.hero-bg{position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,.72) 0%,rgba(10,10,0,.55) 100%)}
.hero-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1}
.hero-content{position:relative;z-index:2;max-width:1280px;margin:0 auto;padding:clamp(7rem,15vw,10rem) 1.5rem clamp(4rem,8vw,6rem)}
.hero-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(3.5rem,10vw,8rem);line-height:.9;text-transform:uppercase;color:#fff;margin-bottom:1.5rem}
.hero-title span{color:var(--color-primary)}
.ghost-cta{display:inline-block;border:1.5px solid rgba(255,255,255,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);color:#fff;font-size:.85rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:.8rem 2rem;border-radius:8px;text-decoration:none;transition:border-color var(--transition-base),background var(--transition-base)}
.ghost-cta:hover{border-color:var(--color-primary);background:rgba(234,179,8,.1)}
.primary-cta{display:inline-block;background:var(--color-primary);color:var(--color-dark);font-size:.85rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.85rem 2.25rem;border-radius:8px;text-decoration:none;transition:background var(--transition-base),transform var(--transition-base)}
.primary-cta:hover{background:var(--color-primary-hover);transform:translateY(-2px)}
.scroll-indicator{position:absolute;bottom:2.5rem;left:50%;transform:translateX(-50%);z-index:2;animation:bounce 2s infinite}
@keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(8px)}}

/* Trust bar */
.trust-bar{background:var(--color-gray-bg);padding:1.5rem 1.5rem}
.trust-bar-inner{max-width:1280px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.5rem 0}
.trust-item{display:flex;align-items:center;gap:.6rem;padding:.4rem 1.5rem;font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--color-text)}
.trust-divider{width:1px;height:1.25rem;background:var(--color-gray-100)}
.trust-icon{width:18px;height:18px;color:var(--color-primary);flex-shrink:0}

/* Services cards */
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.service-card{border-radius:var(--card-radius);overflow:hidden;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.06);transition:transform var(--transition-base),box-shadow var(--transition-base)}
.service-card:hover{transform:translateY(-6px);box-shadow:0 12px 32px rgba(0,0,0,.12)}
.service-card-img{width:100%;height:200px;object-fit:cover}
.service-card-body{padding:1.5rem}
.service-card-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.25rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:.6rem}
.service-card-desc{font-size:.875rem;color:var(--color-text-muted);line-height:1.65}
.service-card-link{display:inline-flex;align-items:center;gap:.4rem;margin-top:1rem;font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--color-primary);text-decoration:none;transition:gap var(--transition-base)}
.service-card-link:hover{gap:.7rem}

/* Showreel */
.showreel{background:var(--color-dark);color:#fff}
.showreel-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;min-height:520px}
.showreel-img{width:100%;height:100%;object-fit:cover}
.showreel-copy{padding:clamp(3rem,6vw,5rem);display:flex;flex-direction:column;justify-content:center}
.showreel-kicker{font-size:.75rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--color-primary);margin-bottom:1.25rem}
.showreel-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2rem,5vw,3.5rem);line-height:1;text-transform:uppercase;color:#fff;margin-bottom:1.5rem}
.showreel-body{font-size:.95rem;color:rgba(255,255,255,.6);line-height:1.75;margin-bottom:2rem}

/* Why Us — sticky */
.why-section{background:var(--color-dark);color:#fff;padding:var(--section-pad) 1.5rem}
.why-grid{display:grid;grid-template-columns:1fr 1fr;gap:4rem;max-width:1280px;margin:0 auto;align-items:start}
.why-left{position:sticky;top:6rem}
.why-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2.5rem,5vw,3.75rem);line-height:.95;text-transform:uppercase;color:#fff;margin-bottom:1.5rem}
.why-sub{font-size:.95rem;color:rgba(255,255,255,.55);line-height:1.75;max-width:360px}
.why-cards{display:flex;flex-direction:column;gap:1.25rem}
.why-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:var(--card-radius);padding:1.75rem;transition:background var(--transition-base)}
.why-card:hover{background:rgba(234,179,8,.07)}
.why-num{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:2.5rem;line-height:1;color:var(--color-primary);margin-bottom:.75rem}
.why-card-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.15rem;letter-spacing:.04em;text-transform:uppercase;color:#fff;margin-bottom:.6rem}
.why-card-body{font-size:.875rem;color:rgba(255,255,255,.5);line-height:1.65}

/* Gallery */
.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.gallery-item{position:relative;overflow:hidden;border-radius:var(--card-radius);aspect-ratio:4/3}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.gallery-item:hover img{transform:scale(1.06)}
.gallery-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.65) 0%,transparent 55%);opacity:0;transition:opacity var(--transition-base);display:flex;align-items:flex-end;padding:1.25rem}
.gallery-item:hover .gallery-overlay{opacity:1}
.gallery-overlay-text{color:#fff;font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}

/* Testimonials marquee */
.testimonials-section{padding:var(--section-pad) 0;background:var(--color-gray-bg);overflow:hidden}
.testimonials-header{max-width:1280px;margin:0 auto 3rem;padding:0 1.5rem}
.testimonials-wrap{overflow:hidden;mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent)}
.testimonials-track{display:flex;gap:1.5rem;width:max-content;animation:marquee 38s linear infinite}
.testimonials-track:hover{animation-play-state:paused}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.review-card{background:#fff;border-radius:var(--card-radius);padding:2rem;width:340px;flex-shrink:0;box-shadow:0 2px 16px rgba(0,0,0,.06)}
.review-stars{color:var(--color-primary);font-size:1rem;letter-spacing:.1em;margin-bottom:.75rem}
.review-text{font-size:.875rem;color:var(--color-text-muted);line-height:1.7;margin-bottom:1.25rem}
.review-author{font-size:.8rem;font-weight:600;color:var(--color-text)}
.review-meta{font-size:.75rem;color:var(--color-text-muted);margin-top:.2rem}

/* FAQ */
.faq-item{border-bottom:1px solid var(--color-gray-100)}
.faq-item summary{padding:1.4rem 0;font-size:.95rem;font-weight:600;cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:1rem;color:var(--color-text)}
.faq-item summary::-webkit-details-marker{display:none}
.faq-arrow{width:20px;height:20px;color:var(--color-primary);flex-shrink:0;transition:transform var(--transition-base)}
details[open] .faq-arrow{transform:rotate(45deg)}
.faq-body{padding:0 0 1.4rem;font-size:.875rem;color:var(--color-text-muted);line-height:1.75}

/* Contact CTA */
.contact-cta{background:var(--color-dark);color:#fff}
.contact-cta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4rem;max-width:1280px;margin:0 auto;padding:var(--section-pad) 1.5rem;align-items:start}
.form-field{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;font-family:'Inter',sans-serif;font-size:.875rem;padding:.8rem 1rem;border-radius:8px;outline:none;transition:border-color var(--transition-base)}
.form-field:focus{border-color:var(--color-primary)}
.form-field::placeholder{color:rgba(255,255,255,.3)}
.form-label{display:block;font-size:.75rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:.4rem}
select.form-field option{background:#1a1a00;color:#fff}

/* Footer */
footer{background:var(--color-dark-2);border-top:1px solid rgba(234,179,8,.12);color:rgba(255,255,255,.45);padding:clamp(3rem,6vw,5rem) 1.5rem 2rem}
.footer-grid{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:3rem;margin-bottom:3rem}
.footer-brand{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.75rem;letter-spacing:.06em;text-transform:uppercase;color:#fff;margin-bottom:.75rem}
.footer-tagline{font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(234,179,8,.5);margin-bottom:1.25rem}
.footer-address{font-size:.875rem;line-height:1.6;margin-bottom:.75rem}
.footer-phone{font-size:1.1rem;font-weight:600;color:var(--color-primary);text-decoration:none;transition:color var(--transition-base)}
.footer-phone:hover{color:#fff}
.footer-heading{font-size:.7rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--color-primary);margin-bottom:1.25rem}
.footer-links{list-style:none;display:flex;flex-direction:column;gap:.6rem}
.footer-links a{font-size:.875rem;color:rgba(255,255,255,.45);text-decoration:none;transition:color var(--transition-base)}
.footer-links a:hover{color:#fff}
.footer-bottom{max-width:1280px;margin:0 auto;padding-top:2rem;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:.5rem;font-size:.75rem;text-align:center}

/* Mobile nav */
.mobile-menu{display:none;flex-direction:column;gap:.25rem;background:var(--color-dark);padding:1.25rem 1.5rem;border-top:1px solid rgba(234,179,8,.12)}
.mobile-menu.open{display:flex}
.mobile-menu a{color:rgba(255,255,255,.7);text-decoration:none;font-size:.875rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.05)}
.mobile-menu a:hover{color:var(--color-primary)}

/* Section helpers */
.section-pad{padding:var(--section-pad) 1.5rem}
.section-inner{max-width:1280px;margin:0 auto}
.section-kicker{font-size:.75rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.75rem}
.section-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2rem,5vw,3.25rem);line-height:1;text-transform:uppercase;margin-bottom:1.5rem}
.section-divider{width:48px;height:3px;background:var(--color-primary);border-radius:2px;margin-bottom:2rem}

/* About-page specifics */
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:5rem;align-items:center}
.about-img-wrap{position:relative}
.about-img{width:100%;border-radius:var(--card-radius);object-fit:cover;aspect-ratio:4/3}
.about-badge{position:absolute;bottom:-1.5rem;left:-1.5rem;background:var(--color-primary);color:var(--color-dark);font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.1rem;letter-spacing:.05em;text-transform:uppercase;padding:1rem 1.5rem;border-radius:var(--card-radius)}
.stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--color-gray-100);border-radius:var(--card-radius);overflow:hidden;margin-top:3rem}
.stat-cell{padding:2rem 1.5rem;text-align:center;border-right:1px solid var(--color-gray-100)}
.stat-cell:last-child{border-right:none}
.stat-num{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2rem,4vw,2.75rem);color:var(--color-primary)}
.stat-label{font-size:.7rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin-top:.35rem}

/* Team page */
.team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem}
.team-card{background:#fff;border-radius:var(--card-radius);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}
.team-avatar{width:80px;height:80px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.75rem;color:var(--color-dark);margin:2rem auto 1rem}
.team-card-body{padding:0 1.5rem 2rem;text-align:center}
.team-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.3rem;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.25rem}
.team-role{font-size:.75rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.75rem}
.team-bio{font-size:.8rem;color:var(--color-text-muted);line-height:1.65}

/* Contact page */
.contact-hero-phone{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(3rem,10vw,6rem);line-height:1;color:var(--color-primary);text-decoration:none;display:block;margin-bottom:1.5rem;transition:color var(--transition-base)}
.contact-hero-phone:hover{color:var(--color-primary-hover)}
.osm-wrap{border-radius:var(--card-radius);overflow:hidden;border:2px solid rgba(234,179,8,.25);margin-top:2rem}
.info-row{display:flex;align-items:flex-start;gap:1rem;margin-bottom:1.25rem}
.info-icon{width:40px;height:40px;background:rgba(234,179,8,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.info-icon svg{width:20px;height:20px;color:var(--color-primary)}
.info-label{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--color-primary);margin-bottom:.2rem}
.info-value{font-size:.9rem;color:var(--color-text)}

/* Testimonials page */
.featured-review{background:var(--color-dark);color:#fff;border-radius:var(--card-radius);padding:3rem;position:relative;overflow:hidden}
.featured-review::before{content:'\"';position:absolute;top:-1.5rem;left:1.5rem;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:12rem;line-height:1;color:rgba(234,179,8,.08);pointer-events:none}
.reviews-masonry{columns:3;gap:1.5rem}
.review-grid-card{background:#fff;border-radius:var(--card-radius);padding:1.75rem;box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:1.5rem;break-inside:avoid}

${REVEAL_CSS}

@media(max-width:1024px){
  .services-grid{grid-template-columns:repeat(2,1fr)}
  .team-grid{grid-template-columns:repeat(2,1fr)}
  .footer-grid{grid-template-columns:1fr 1fr}
  .why-grid{grid-template-columns:1fr}
  .why-left{position:static}
  .showreel-grid{grid-template-columns:1fr}
  .gallery-grid{grid-template-columns:repeat(2,1fr)}
  .contact-cta-grid{grid-template-columns:1fr}
  .about-grid{grid-template-columns:1fr}
  .stat-row{grid-template-columns:repeat(2,1fr)}
  .stat-cell:nth-child(2){border-right:none}
  .stat-cell:nth-child(3){border-top:1px solid var(--color-gray-100);border-right:1px solid var(--color-gray-100)}
  .stat-cell:nth-child(4){border-top:1px solid var(--color-gray-100)}
  .reviews-masonry{columns:2}
  .header-nav-left,.header-nav-right .nav-link{display:none}
}
@media(max-width:640px){
  .services-grid{grid-template-columns:1fr}
  .team-grid{grid-template-columns:1fr 1fr}
  .gallery-grid{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr}
  .reviews-masonry{columns:1}
}
</style>
</head>`;
}

// ── Shared header ─────────────────────────────────────────────────────────────

function siteHeader(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);
  const leftLinks = [
    { href: baseUrl, label: 'Home' },
    { href: `${baseUrl}/about`, label: 'About' },
    { href: `${baseUrl}/gallery`, label: 'Gallery' },
  ];
  const rightLinks = [
    { href: `${baseUrl}/team`, label: 'Team' },
    { href: `${baseUrl}/testimonials`, label: 'Reviews' },
    { href: `${baseUrl}/contact`, label: 'Contact' },
  ];

  return `<header id="site-header">
  <div class="header-inner">
    <nav class="header-nav-left">
      ${leftLinks.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
    </nav>
    <a href="${baseUrl}" class="company-name">${biz.name}</a>
    <nav class="header-nav-right">
      ${rightLinks.map(l => `<a href="${l.href}" class="nav-link">${l.label}</a>`).join('')}
      ${pc ? `<a href="${baseUrl}/contact" class="btn-book">Book Now</a>` : ''}
    </nav>
    <button id="menu-btn" onclick="document.getElementById('mobile-menu').classList.toggle('open')" aria-label="Menu" style="display:none;background:none;border:none;color:#fff;cursor:pointer;padding:.25rem">
      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">
  ${[...leftLinks, ...rightLinks].map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
  ${pc ? `<a href="tel:${pc}" class="btn-book" style="text-align:center;margin-top:.5rem">${biz.phone}</a>` : ''}
</div>
<script>
var header=document.getElementById('site-header');
window.addEventListener('scroll',function(){header.classList.toggle('scrolled',window.scrollY>60);});
var menuBtn=document.getElementById('menu-btn');
if(menuBtn){menuBtn.style.display='block';}
</script>`;
}

// ── Shared footer ─────────────────────────────────────────────────────────────

function siteFooter(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);
  return `<footer>
  <div class="footer-grid">
    <div>
      <div class="footer-brand">${biz.name}</div>
      <div class="footer-tagline">${biz.city || ''} — Licensed &amp; Bonded</div>
      ${biz.address ? `<div class="footer-address">${biz.address}</div>` : ''}
      ${pc ? `<a href="tel:${pc}" class="footer-phone">${biz.phone}</a>` : ''}
    </div>
    <div>
      <div class="footer-heading">Quick Links</div>
      <ul class="footer-links">
        <li><a href="${baseUrl}">Home</a></li>
        <li><a href="${baseUrl}/about">About</a></li>
        <li><a href="${baseUrl}/gallery">Gallery</a></li>
        <li><a href="${baseUrl}/team">Team</a></li>
        <li><a href="${baseUrl}/testimonials">Reviews</a></li>
        <li><a href="${baseUrl}/contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-heading">Services</div>
      <ul class="footer-links">
        <li><a href="${baseUrl}/contact">Termite Control</a></li>
        <li><a href="${baseUrl}/contact">Bed Bug Elimination</a></li>
        <li><a href="${baseUrl}/contact">Rodent Control</a></li>
        <li><a href="${baseUrl}/contact">Cockroach Control</a></li>
        <li><a href="${baseUrl}/contact">Wasp Removal</a></li>
        <li><a href="${baseUrl}/contact">Commercial Pest</a></li>
      </ul>
    </div>
    <div>
      <div class="footer-heading">Hours</div>
      <ul class="footer-links" style="gap:.4rem">
        <li style="font-size:.875rem">Mon – Fri: 7 AM – 7 PM</li>
        <li style="font-size:.875rem">Saturday: 8 AM – 5 PM</li>
        <li style="font-size:.875rem">Sunday: By Appointment</li>
        <li style="font-size:.875rem;color:var(--color-primary);font-weight:600;margin-top:.5rem">Emergency: 24/7</li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">
    <div>© ${new Date().getFullYear()} ${biz.name}. All rights reserved.</div>
    <div>Serving ${biz.city || 'your area'} and surrounding communities.</div>
  </div>
</footer>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: HOME
// ══════════════════════════════════════════════════════════════════════════════

function buildHomePage(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);

  const trustItems = [
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`, text: 'Emergency Same-Day Service' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, text: 'Licensed &amp; Bonded' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`, text: '25,000+ Infestations Cleared' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`, text: 'NPMA Certified' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`, text: 'Zero Callback Guarantee' },
  ];

  const services = [
    { name: 'Termite Extermination', desc: 'Full liquid-barrier and bait-station protocols. We map every affected zone, treat it, and verify at 30 days. If termites return, so do we — no charge.', img: FALLBACK_PHOTOS[0] },
    { name: 'Bed Bug Elimination', desc: 'Thermal heat treatment combined with targeted chemical protocols. Most residential jobs are resolved in a single visit with no need to replace furniture.', img: FALLBACK_PHOTOS[1] },
    { name: 'Rodent &amp; Rat Control', desc: 'We find every entry point, seal it permanently, then eliminate the infestation. No revolving-door trap service — full structural exclusion.', img: FALLBACK_PHOTOS[2] },
    { name: 'Cockroach Control', desc: 'Gel-bait, liquid, and IGR treatment protocols. We document all treatment zones and schedule a 2-week follow-up to verify zero activity.', img: FALLBACK_PHOTOS[0] },
    { name: 'Wasp &amp; Hornet Removal', desc: 'Safe nest removal from wall cavities, attics, and eaves. Entry points sealed after extraction. Same-day dispatch for active nests near occupied areas.', img: FALLBACK_PHOTOS[3] },
    { name: 'Commercial Pest Control', desc: 'Scheduled, discreet service for restaurants, offices, and warehouses. Full IPM documentation provided for health inspections.', img: FALLBACK_PHOTOS[4] },
  ];

  const whyCards = [
    { n: '01', title: 'Guaranteed Elimination', body: 'If the pest returns within 30 days of treatment, we come back and retreat the entire property at no charge. No conditions, no fine print.' },
    { n: '02', title: 'Advanced IPM Methods', body: 'We apply Integrated Pest Management — identifying the source, removing harborage conditions, and using the lowest effective treatment dose.' },
    { n: '03', title: '24/7 Emergency Response', body: 'Active infestations don\'t wait for business hours. Our emergency line dispatches a technician the same day, typically within 2 hours of your call.' },
    { n: '04', title: 'Safe for Families &amp; Pets', body: 'Every product is EPA-registered and applied by licensed technicians at the minimum effective dose. We give you a clear re-entry timeline.' },
    { n: '05', title: 'No Re-Infestation Warranty', body: 'Our structural exclusion work comes with a written warranty. If the same entry point allows re-entry, we return and re-seal at no cost.' },
  ];

  const reviews8 = [
    { text: `Called ${biz.name} after another company failed twice. They found the actual entry points in 20 minutes and had everything handled the same afternoon.`, name: 'Marcus L.', meta: `${biz.city || 'Local Area'} — Rodent Removal` },
    { text: 'Found termites two days before a home inspection. They were on-site within three hours, treated the property, and gave us documentation for the buyer. Saved the deal.', name: 'Carla J.', meta: `${biz.city || 'Local Area'} — Termite Elimination` },
    { text: 'Commercial property — three units hit by bed bugs. Heat treatment done floor by floor, zero disruption to tenants, zero callbacks after eight months.', name: 'Omar T.', meta: `${biz.city || 'Local Area'} — Bed Bug Extermination` },
    { text: 'Wasp nest inside the wall cavity the size of a basketball. They arrived at 9 AM and had it handled by 10:30. Patched the entry point too. Zero issues since.', name: 'Tamara R.', meta: `${biz.city || 'Local Area'} — Emergency Response` },
    { text: 'Mice every winter for years. Every other company just reset traps. These guys found the foundation entry points and sealed them permanently. First clean winter in five years.', name: 'Nicole V.', meta: `${biz.city || 'Local Area'} — Rodent Exclusion` },
    { text: 'Cockroach problem a commercial kitchen that two others couldn\'t fix. Changed the protocol entirely — gel bait in all harborage sites — and we passed health inspection 36 hours later.', name: 'David M.', meta: `${biz.city || 'Local Area'} — Cockroach Control` },
    { text: 'Three restaurants, all managed by this team. Health inspector hasn\'t flagged a single location in four years. Discreet, thorough, completely reliable.', name: 'Sandra K.', meta: `${biz.city || 'Local Area'} — Commercial Pest Management` },
    { text: 'Had an ant infestation that defied every DIY treatment. One visit, they identified the colony location and species, applied a targeted protocol. Resolved in 10 days.', name: 'Maria G.', meta: `${biz.city || 'Local Area'} — Ant Control` },
  ];

  const allReviews = biz.reviewTexts.length >= 4
    ? [...biz.reviewTexts.slice(0, 8).map((t, i) => ({ text: t, name: reviews8[i % 8].name, meta: reviews8[i % 8].meta })), ...reviews8.slice(biz.reviewTexts.slice(0, 8).length)]
    : [...reviews8.slice(0, Math.max(0, 8 - biz.reviewTexts.length)), ...biz.reviewTexts.map((t, i) => ({ text: t, name: reviews8[i % 8].name, meta: reviews8[i % 8].meta }))];

  const dupReviews = [...allReviews, ...allReviews];

  const galleryImgs = [0, 1, 2, 3, 4, 5].map(i => extPhoto(i, biz));

  const faqs = [
    { q: 'How quickly can you respond to an active infestation?', a: 'For active infestations we dispatch same-day, typically within 2 hours of your call. Scheduled inspections can be booked within 24 hours. Call us directly for the fastest dispatch.' },
    { q: 'Are treatments safe for children and pets?', a: 'Yes. Every product we use is EPA-registered and applied at the minimum effective dose. We provide a clear re-entry window — usually 2 to 4 hours — before the job is finished.' },
    { q: 'What if the same pest comes back after treatment?', a: 'Every treatment includes a 30-day guarantee. If activity recurs from the same pest, we return and re-treat the entire affected area at no charge. No conditions.' },
    { q: 'Do I need to prepare the house before treatment?', a: 'For most treatments, minor preparation is needed: clear under sinks, pull furniture 6 inches from walls, and remove pets during application. We email a full prep checklist after booking.' },
    { q: 'Do you offer ongoing maintenance programs?', a: 'Yes. Monthly and quarterly programs cover scheduled inspections, targeted treatments when needed, and priority same-day response for any active issue. Ask about pricing when you call.' },
  ];

  return `${head('Home', biz)}
<body>
${siteHeader(biz, baseUrl)}

<!-- HERO -->
<section class="hero">
  <img src="${HERO_POSTER}" alt="Pest control technician" class="hero-poster">
  <video autoplay muted loop playsinline poster="${HERO_POSTER}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1"></video>
  <div class="hero-bg"></div>
  <div class="hero-content">
    <p class="section-kicker" data-reveal style="color:var(--color-primary);margin-bottom:.75rem">Professional Pest Control — ${biz.city || 'Serving Your Area'}</p>
    <h1 class="hero-title" data-reveal data-delay="1">${biz.name}<br><span>Zero Tolerance.</span></h1>
    <p style="font-size:1.1rem;color:rgba(255,255,255,.65);max-width:540px;margin-bottom:2rem;line-height:1.7" data-reveal data-delay="2">We don't just treat — we eliminate. Same-day dispatch. Guaranteed results or we come back free.</p>
    <div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center" data-reveal data-delay="3">
      ${pc ? `<a href="tel:${pc}" class="primary-cta">Call for Same-Day Service</a>` : ''}
      <a href="${baseUrl}/contact" class="ghost-cta">Get a Free Estimate</a>
    </div>
    ${biz.rating ? `<div style="display:flex;align-items:center;gap:.75rem;margin-top:2.5rem" data-reveal data-delay="4">
      <span style="color:var(--color-primary);font-size:1rem;letter-spacing:.1em">${starText(biz.rating)}</span>
      <span style="color:rgba(255,255,255,.45);font-size:.85rem">${biz.rating} rating — ${biz.reviews ?? ''}+ reviews</span>
    </div>` : ''}
  </div>
  <div class="scroll-indicator">
    <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
  </div>
</section>

<!-- TRUST BAR -->
<div class="trust-bar" data-reveal>
  <div class="trust-bar-inner">
    ${trustItems.map((t, i) => `<div class="trust-item"><svg class="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon.replace(/^<svg[^>]*>/,'').replace('</svg>','')}</svg>${t.text}</div>${i < trustItems.length - 1 ? '<div class="trust-divider"></div>' : ''}`).join('')}
  </div>
</div>

<!-- SERVICES -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>What We Do</p>
    <h2 class="section-title" data-reveal data-delay="1">Our Services</h2>
    <div class="section-divider" data-reveal data-delay="2"></div>
    <div class="services-grid">
      ${services.map((s, i) => `
      <div class="service-card" data-reveal data-delay="${Math.min(i % 3 + 1, 4) as 1 | 2 | 3 | 4}">
        <img src="${s.img}" alt="${s.name}" class="service-card-img" loading="lazy">
        <div class="service-card-body">
          <h3 class="service-card-title">${s.name}</h3>
          <p class="service-card-desc">${s.desc}</p>
          <a href="${baseUrl}/contact" class="service-card-link">
            Get a Quote
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- SHOWREEL -->
<section class="showreel">
  <div class="showreel-grid">
    <div style="min-height:480px;overflow:hidden">
      <img src="${extPhoto(1, biz)}" alt="Our work" class="showreel-img" loading="lazy">
    </div>
    <div class="showreel-copy" data-reveal>
      <p class="showreel-kicker">See the Results</p>
      <h2 class="showreel-title">Zero Tolerance.<br>Complete Elimination.</h2>
      <p class="showreel-body">We document every job from inspection to follow-up. Every treatment comes with before-and-after documentation, a written outcome report, and a 30-day guarantee. If we don't get it right the first time, we come back until we do.</p>
      <a href="${baseUrl}/gallery" class="primary-cta" style="align-self:flex-start">View Our Work</a>
    </div>
  </div>
</section>

<!-- WHY US — STICKY LEFT -->
<section class="why-section">
  <div class="why-grid">
    <div class="why-left" data-reveal>
      <p class="section-kicker" style="color:var(--color-primary)">The Difference</p>
      <h2 class="why-title" style="color:#fff">Why ${biz.name}</h2>
      <div class="section-divider"></div>
      <p class="why-sub">Five reasons homeowners and businesses across ${biz.city || 'the area'} call us first — and call us only once.</p>
      ${pc ? `<a href="tel:${pc}" class="primary-cta" style="display:inline-block;margin-top:2rem">${biz.phone}</a>` : ''}
    </div>
    <div class="why-cards">
      ${whyCards.map((c, i) => `
      <div class="why-card" data-reveal data-delay="${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}">
        <div class="why-num">${c.n}</div>
        <h3 class="why-card-title">${c.title}</h3>
        <p class="why-card-body">${c.body}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- GALLERY PREVIEW -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>Proof of Results</p>
    <h2 class="section-title" data-reveal data-delay="1">Work Gallery</h2>
    <div class="section-divider" data-reveal data-delay="2"></div>
    <div class="gallery-grid">
      ${galleryImgs.map((src, i) => `
      <div class="gallery-item" data-reveal data-delay="${Math.min((i % 3) + 1, 4) as 1 | 2 | 3 | 4}">
        <img src="${src}" alt="Pest control result ${i + 1}" loading="lazy">
        <div class="gallery-overlay"><span class="gallery-overlay-text">View Project</span></div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:2.5rem" data-reveal>
      <a href="${baseUrl}/gallery" class="ghost-cta" style="border-color:var(--color-gray-100);color:var(--color-text)">See All Projects</a>
    </div>
  </div>
</section>

<!-- TESTIMONIALS MARQUEE -->
<section class="testimonials-section">
  <div class="testimonials-header" data-reveal>
    <p class="section-kicker">Real Customers</p>
    <h2 class="section-title">What People Are Saying</h2>
    <div class="section-divider"></div>
  </div>
  <div class="testimonials-wrap">
    <div class="testimonials-track">
      ${dupReviews.map(r => `
      <div class="review-card">
        <div class="review-stars">${starText(biz.rating)}</div>
        <p class="review-text">${r.text}</p>
        <div class="review-author">${r.name}</div>
        <div class="review-meta">${r.meta}</div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner" style="max-width:720px">
    <p class="section-kicker" data-reveal>Common Questions</p>
    <h2 class="section-title" data-reveal data-delay="1">FAQ</h2>
    <div class="section-divider" data-reveal data-delay="2"></div>
    ${faqs.map((f, i) => `
    <details class="faq-item" data-reveal data-delay="${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}">
      <summary>${f.q}<svg class="faq-arrow" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></summary>
      <div class="faq-body">${f.a}</div>
    </details>`).join('')}
  </div>
</section>

<!-- CONTACT CTA -->
<section class="contact-cta">
  <div class="contact-cta-grid">
    <div data-reveal>
      <p class="section-kicker" style="color:var(--color-primary)">Get Started</p>
      <h2 class="section-title" style="color:#fff;font-size:clamp(2.5rem,6vw,4rem)">Request a<br>Free Inspection</h2>
      <div class="section-divider"></div>
      ${pc ? `<div style="margin-bottom:1.5rem">
        <a href="tel:${pc}" style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(1.75rem,4vw,2.5rem);color:var(--color-primary);text-decoration:none;letter-spacing:.03em;text-transform:uppercase">${biz.phone}</a>
      </div>` : ''}
      <div style="display:flex;flex-direction:column;gap:.75rem">
        <div class="info-row">
          <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
          <div><div class="info-label">Response Time</div><div class="info-value" style="color:rgba(255,255,255,.7)">Same-day for active infestations</div></div>
        </div>
        <div class="info-row">
          <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div><div class="info-label">Guarantee</div><div class="info-value" style="color:rgba(255,255,255,.7)">30-day re-treatment, no charge</div></div>
        </div>
        ${biz.address ? `<div class="info-row">
          <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
          <div><div class="info-label">Location</div><div class="info-value" style="color:rgba(255,255,255,.7)">${biz.address}</div></div>
        </div>` : ''}
      </div>
    </div>
    <div data-reveal data-delay="2">
      <form onsubmit="document.getElementById('home-success').style.display='block';this.style.display='none';return false;" style="display:flex;flex-direction:column;gap:1.25rem">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div><label class="form-label">Name</label><input type="text" placeholder="Your name" required class="form-field"></div>
          <div><label class="form-label">Phone</label><input type="tel" placeholder="(555) 000-0000" required class="form-field"></div>
        </div>
        <div><label class="form-label">Pest Type</label>
          <select class="form-field">
            <option value="">Select pest...</option>
            <option>Termites</option><option>Bed Bugs</option><option>Rodents</option><option>Cockroaches</option><option>Wasps / Hornets</option><option>Ants</option><option>Other</option>
          </select>
        </div>
        <div><label class="form-label">Message</label><textarea rows="4" placeholder="Describe the problem..." class="form-field" style="resize:none"></textarea></div>
        <button type="submit" class="primary-cta" style="width:100%;text-align:center;border:none;cursor:pointer;font-family:inherit">Send Request</button>
      </form>
      <div id="home-success" style="display:none;background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3);border-radius:var(--card-radius);padding:2rem;color:#fff">
        <strong style="color:var(--color-primary)">Request received.</strong><br>
        <span style="font-size:.875rem;color:rgba(255,255,255,.6);margin-top:.5rem;display:block">We will call you within the hour to confirm your free inspection.</span>
      </div>
    </div>
  </div>
</section>

${siteFooter(biz, baseUrl)}
${REVEAL_JS}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: ABOUT
// ══════════════════════════════════════════════════════════════════════════════

function buildAboutPage(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);

  const values = [
    { n: '01', title: 'Find the Source, Not the Symptom', body: 'Every technician is trained to locate the colony or harborage site before treatment begins. We document it, treat it, and eliminate the condition that allowed it to form in the first place.' },
    { n: '02', title: 'Effective Means Done Once', body: 'A treatment that works once is worth more than four partial ones. We calibrate dose and method to the actual pest load and return if the result is anything less than complete.' },
    { n: '03', title: 'Honest Assessment, Every Time', body: 'If the problem can be solved with exclusion alone, we say so. If it calls for multiple visits, we tell you upfront and include those visits in the original quote.' },
  ];

  const certs = ['NPMA Member', 'State Licensed Pest Operator', 'EPA Certified Applicator', 'QualityPro Accredited', 'BBB A+ Rating', 'Structural Pest Control License', 'Termite Bond Certified'];

  return `${head('About', biz)}
<body>
${siteHeader(biz, baseUrl)}

<!-- PAGE HEADER -->
<section style="background:var(--color-dark);padding:clamp(8rem,14vw,11rem) 1.5rem clamp(3rem,6vw,5rem)">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>Who We Are</p>
    <h1 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(3.5rem,10vw,7rem);line-height:.9;text-transform:uppercase;color:#fff;margin-bottom:1rem" data-reveal data-delay="1">About<br><span style="color:var(--color-primary)">${biz.name}</span></h1>
    <div class="section-divider" data-reveal data-delay="2"></div>
  </div>
</section>

<!-- FOUNDING STORY -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner">
    <div class="about-grid">
      <div data-reveal>
        <p class="section-kicker">Our Story</p>
        <h2 class="section-title">Built Because the Industry Got It Wrong</h2>
        <div class="section-divider"></div>
        <p style="color:var(--color-text-muted);line-height:1.75;margin-bottom:1.25rem">${biz.name} was founded in ${biz.city || 'the local area'} by a team that spent years watching national franchise chains charge for treatments that didn't last. Quick spray, gone in 30 minutes, back with the same bugs inside three weeks. We built this company to operate differently.</p>
        <p style="color:var(--color-text-muted);line-height:1.75;margin-bottom:1.25rem">From day one, we hired technicians who wanted to understand pest biology and structural entry points — not just apply product and leave. Every job is documented. Every technician carries certification. Every treatment comes with a guarantee because we're confident it will work.</p>
        <p style="color:var(--color-text-muted);line-height:1.75">Today we serve residential customers, commercial operators, and multi-family properties across ${biz.state || 'the region'}. The team has grown, but the standard hasn't changed: find the source, fix it permanently, stand behind the result.</p>
        <div class="stat-row" style="margin-top:2.5rem">
          ${[
            { n: (biz.yearsInBiz ? biz.yearsInBiz + '+' : '15+'), label: 'Years Active' },
            { n: '25K+', label: 'Jobs Done' },
            { n: '3', label: 'States Covered' },
            { n: '100%', label: 'Guaranteed' },
          ].map(s => `<div class="stat-cell"><div class="stat-num">${s.n}</div><div class="stat-label">${s.label}</div></div>`).join('')}
        </div>
      </div>
      <div class="about-img-wrap" data-reveal data-delay="2">
        <img src="${extPhoto(0, biz)}" alt="${biz.name}" class="about-img">
        <div class="about-badge">Same-Day<br>Response</div>
      </div>
    </div>
  </div>
</section>

<!-- VALUES -->
<section class="section-pad" style="background:var(--color-gray-bg)">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>How We Work</p>
    <h2 class="section-title" data-reveal data-delay="1">Zero Tolerance Philosophy</h2>
    <div class="section-divider" data-reveal data-delay="2"></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      ${values.map((v, i) => `
      <div style="background:#fff;border-radius:var(--card-radius);padding:2.5rem;box-shadow:0 2px 12px rgba(0,0,0,.05)" data-reveal data-delay="${i + 1 as 1 | 2 | 3}">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:3rem;color:var(--color-primary);line-height:1;margin-bottom:1rem">${v.n}</div>
        <h3 style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.2rem;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.75rem">${v.title}</h3>
        <p style="font-size:.875rem;color:var(--color-text-muted);line-height:1.7">${v.body}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CERTIFICATIONS -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner" style="text-align:center">
    <p class="section-kicker" data-reveal>Credentials</p>
    <h2 class="section-title" data-reveal data-delay="1">Certified &amp; Accredited</h2>
    <div class="section-divider" style="margin-left:auto;margin-right:auto" data-reveal data-delay="2"></div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:.75rem;margin-top:1rem">
      ${certs.map((c, i) => `<span style="border:1px solid var(--color-gray-100);border-radius:6px;padding:.55rem 1.1rem;font-size:.8rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--color-text-muted)" data-reveal data-delay="${Math.min((i % 4) + 1, 4) as 1 | 2 | 3 | 4}">${c}</span>`).join('')}
    </div>
  </div>
</section>

<!-- TEAM TEASER -->
<section class="section-pad" style="background:var(--color-dark);text-align:center">
  <div class="section-inner" data-reveal>
    <p class="section-kicker" style="color:var(--color-primary)">The Technicians</p>
    <h2 class="section-title" style="color:#fff;margin:0 auto;max-width:560px">The People Who Actually Show Up</h2>
    <p style="color:rgba(255,255,255,.5);max-width:500px;margin:1.5rem auto 2.5rem;font-size:.95rem;line-height:1.75">Every technician is state-licensed, background-checked, and trained in pest biology, structural exclusion, and safe product application — not just handed a sprayer.</p>
    <a href="${baseUrl}/team" class="primary-cta">Meet the Team</a>
  </div>
</section>

<!-- CTA -->
<section class="section-pad" style="background:var(--color-primary)">
  <div class="section-inner" style="text-align:center" data-reveal>
    <h2 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2.5rem,7vw,4.5rem);line-height:.95;text-transform:uppercase;color:var(--color-dark);margin-bottom:1rem">Ready to Solve the Problem?</h2>
    <p style="color:rgba(0,0,0,.6);font-size:.95rem;margin-bottom:2rem">One call gets a same-day assessment. No commitment until you've seen the plan and the price.</p>
    <div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center">
      ${pc ? `<a href="tel:${pc}" style="display:inline-block;background:var(--color-dark);color:var(--color-primary);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1rem;letter-spacing:.1em;text-transform:uppercase;padding:1rem 2.5rem;border-radius:8px;text-decoration:none">Call ${biz.phone}</a>` : ''}
      <a href="${baseUrl}/contact" style="display:inline-block;border:2px solid var(--color-dark);color:var(--color-dark);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1rem;letter-spacing:.1em;text-transform:uppercase;padding:1rem 2.5rem;border-radius:8px;text-decoration:none">Free Inspection</a>
    </div>
  </div>
</section>

${siteFooter(biz, baseUrl)}
${REVEAL_JS}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: CONTACT
// ══════════════════════════════════════════════════════════════════════════════

function buildContactPage(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);

  const faqs = [
    { q: 'How quickly can you get to us?', a: 'For active infestations, we dispatch same-day — typically within 2 hours of your call. Scheduled inspections are usually booked within 24 hours. Call directly for the fastest response.' },
    { q: 'Is treatment safe for children and pets?', a: 'Yes. Every product is EPA-registered and applied at the minimum effective dose. We provide a clear re-entry window — usually 2 to 4 hours — before leaving.' },
    { q: 'What if the pests come back?', a: 'Every treatment includes a 30-day guarantee. If activity recurs from the same pest within 30 days, we return and re-treat the entire affected area at no charge.' },
    { q: 'Do I need to leave the house during treatment?', a: 'For most interior applications, a 2 to 4 hour vacate is required. Heat treatments for bed bugs require 6 to 8 hours. We walk you through exactly what to expect before scheduling.' },
    { q: 'Do you offer contracts for ongoing service?', a: 'Yes. Monthly and quarterly maintenance programs include scheduled inspections, treatments when needed, and priority same-day response for active issues.' },
  ];

  const hours = [
    ['Monday', '7:00 AM – 7:00 PM'],
    ['Tuesday', '7:00 AM – 7:00 PM'],
    ['Wednesday', '7:00 AM – 7:00 PM'],
    ['Thursday', '7:00 AM – 7:00 PM'],
    ['Friday', '7:00 AM – 7:00 PM'],
    ['Saturday', '8:00 AM – 5:00 PM'],
    ['Sunday', 'By Appointment'],
  ];

  return `${head('Contact', biz)}
<body>
${siteHeader(biz, baseUrl)}

<!-- PHONE HERO -->
<section style="background:var(--color-dark);padding:clamp(8rem,14vw,11rem) 1.5rem clamp(3rem,6vw,4rem);text-align:center">
  <div class="section-inner" data-reveal>
    <p class="section-kicker" style="color:var(--color-primary)">Reach Us Directly</p>
    <h1 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(3rem,8vw,5rem);line-height:.95;text-transform:uppercase;color:#fff;margin-bottom:1.5rem">Contact Us</h1>
    ${pc ? `<a href="tel:${pc}" class="contact-hero-phone">${biz.phone}</a>
    <a href="tel:${pc}" class="primary-cta" style="font-size:1rem;padding:1rem 2.5rem">Call Now</a>` : ''}
  </div>
</section>

<!-- EMERGENCY NOTE -->
<div style="background:rgba(234,179,8,.12);border-top:2px solid var(--color-primary);border-bottom:2px solid var(--color-primary);padding:.9rem 1.5rem;text-align:center">
  <span style="font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--color-primary)">Active infestation? We dispatch same-day. Emergency lines open 24/7.</span>
</div>

<!-- FORM + INFO -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5rem" class="contact-two-col">
      <!-- FORM -->
      <div data-reveal>
        <p class="section-kicker">Request a Visit</p>
        <h2 class="section-title">Get a Free Inspection</h2>
        <div class="section-divider"></div>
        <form onsubmit="document.getElementById('contact-success').style.display='block';this.style.display='none';return false;" style="display:flex;flex-direction:column;gap:1.25rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div><label class="form-label" style="color:var(--color-text-muted)">Full Name *</label><input type="text" placeholder="Your name" required style="width:100%;border:1px solid var(--color-gray-100);border-radius:8px;padding:.8rem 1rem;font-size:.875rem;outline:none;font-family:'Inter',sans-serif;transition:border-color var(--transition-base)" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='var(--color-gray-100)'"></div>
            <div><label class="form-label" style="color:var(--color-text-muted)">Phone *</label><input type="tel" placeholder="(555) 000-0000" required style="width:100%;border:1px solid var(--color-gray-100);border-radius:8px;padding:.8rem 1rem;font-size:.875rem;outline:none;font-family:'Inter',sans-serif;transition:border-color var(--transition-base)" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='var(--color-gray-100)'"></div>
          </div>
          <div><label class="form-label" style="color:var(--color-text-muted)">Email</label><input type="email" placeholder="you@email.com" style="width:100%;border:1px solid var(--color-gray-100);border-radius:8px;padding:.8rem 1rem;font-size:.875rem;outline:none;font-family:'Inter',sans-serif;transition:border-color var(--transition-base)" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='var(--color-gray-100)'"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div><label class="form-label" style="color:var(--color-text-muted)">Pest Type</label>
              <select style="width:100%;border:1px solid var(--color-gray-100);border-radius:8px;padding:.8rem 1rem;font-size:.875rem;outline:none;font-family:'Inter',sans-serif;background:#fff;transition:border-color var(--transition-base)" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='var(--color-gray-100)'">
                <option value="">Select pest...</option>
                <option>Termites</option><option>Bed Bugs</option><option>Rodents</option><option>Cockroaches</option><option>Mosquitoes</option><option>Wasps / Hornets</option><option>Ants</option><option>Other / Not Sure</option>
              </select>
            </div>
            <div><label class="form-label" style="color:var(--color-text-muted)">Property Type</label>
              <select style="width:100%;border:1px solid var(--color-gray-100);border-radius:8px;padding:.8rem 1rem;font-size:.875rem;outline:none;font-family:'Inter',sans-serif;background:#fff;transition:border-color var(--transition-base)" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='var(--color-gray-100)'">
                <option value="">Select property...</option>
                <option>Residential — Single Family</option><option>Residential — Multi-Family</option><option>Commercial — Restaurant</option><option>Commercial — Office / Retail</option><option>Commercial — Warehouse</option><option>Other</option>
              </select>
            </div>
          </div>
          <div><label class="form-label" style="color:var(--color-text-muted)">Urgency</label>
            <select style="width:100%;border:1px solid var(--color-gray-100);border-radius:8px;padding:.8rem 1rem;font-size:.875rem;outline:none;font-family:'Inter',sans-serif;background:#fff;transition:border-color var(--transition-base)" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='var(--color-gray-100)'">
              <option value="">Select urgency...</option>
              <option>Emergency — Active Infestation (Same Day)</option>
              <option>High — Within 48 Hours</option>
              <option>Standard — This Week</option>
              <option>Planning — Just Getting a Quote</option>
            </select>
          </div>
          <div><label class="form-label" style="color:var(--color-text-muted)">Message</label><textarea rows="4" placeholder="Describe the problem, how long it has been going on, and any relevant details..." style="width:100%;border:1px solid var(--color-gray-100);border-radius:8px;padding:.8rem 1rem;font-size:.875rem;outline:none;font-family:'Inter',sans-serif;resize:none;transition:border-color var(--transition-base)" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='var(--color-gray-100)'"></textarea></div>
          <button type="submit" class="primary-cta" style="width:100%;border:none;cursor:pointer;font-family:inherit;font-size:.9rem;padding:1rem">Send Request</button>
        </form>
        <div id="contact-success" style="display:none;background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.3);border-radius:var(--card-radius);padding:2rem;margin-top:1rem">
          <strong style="color:var(--color-primary)">Request received.</strong>
          <p style="font-size:.875rem;color:var(--color-text-muted);margin-top:.5rem">We will call you within the hour to confirm your free inspection.</p>
        </div>
      </div>

      <!-- INFO -->
      <div data-reveal data-delay="2">
        <p class="section-kicker">Business Hours</p>
        <table style="width:100%;font-size:.875rem;margin-bottom:2rem">
          <tbody>
            ${hours.map(([d, h]) => `<tr style="border-bottom:1px solid var(--color-gray-100)"><td style="padding:.8rem 0;color:var(--color-text-muted)">${d}</td><td style="padding:.8rem 0;text-align:right;font-weight:500">${h}</td></tr>`).join('')}
            <tr><td style="padding:.8rem 0;color:var(--color-primary);font-weight:700">Emergency Line</td><td style="padding:.8rem 0;text-align:right;color:var(--color-primary);font-weight:700">24 / 7</td></tr>
          </tbody>
        </table>
        ${biz.address ? `<div style="margin-bottom:2rem">
          <p class="section-kicker" style="margin-bottom:.5rem">Address</p>
          <p style="font-size:.9rem;color:var(--color-text-muted)">${biz.address}</p>
        </div>` : ''}
        <div>
          <p class="section-kicker" style="margin-bottom:.75rem">Service Area</p>
          <div style="display:flex;flex-wrap:wrap;gap:.5rem">
            ${[biz.city, biz.state, 'Metro Area', 'Suburban Counties', 'Rural Properties', 'Commercial Districts'].filter(Boolean).map(a => `<span style="border:1px solid var(--color-gray-100);border-radius:6px;padding:.4rem .85rem;font-size:.75rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--color-text-muted)">${a}</span>`).join('')}
          </div>
        </div>
        <div class="osm-wrap">
          <iframe title="Service location" src="https://www.openstreetmap.org/export/embed.html?bbox=-96.9,32.65,-96.6,32.85&layer=mapnik" width="100%" height="320" style="border:0;display:block" loading="lazy"></iframe>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="section-pad" style="background:var(--color-gray-bg)">
  <div class="section-inner" style="max-width:720px">
    <p class="section-kicker" data-reveal>Common Questions</p>
    <h2 class="section-title" data-reveal data-delay="1">FAQ</h2>
    <div class="section-divider" data-reveal data-delay="2"></div>
    ${faqs.map((f, i) => `
    <details class="faq-item" data-reveal data-delay="${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}">
      <summary>${f.q}<svg class="faq-arrow" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></summary>
      <div class="faq-body">${f.a}</div>
    </details>`).join('')}
  </div>
</section>

<style>@media(max-width:768px){.contact-two-col{grid-template-columns:1fr !important;gap:3rem !important}}</style>

${siteFooter(biz, baseUrl)}
${REVEAL_JS}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: TEAM
// ══════════════════════════════════════════════════════════════════════════════

function buildTeamPage(biz: BizPageData, baseUrl: string): string {
  const pc = phoneClean(biz);

  const defaultMembers = [
    {
      name: 'Rick Navarro',
      role: 'Owner / Lead Technician',
      years: 18,
      certs: ['State Licensed Pest Operator', 'Termite Bond Certified', 'EPA Certified Applicator'],
      bio: 'Rick founded the company after 18 years in the field, including a decade running operations for a national chain. He built this business to do the opposite of everything that frustrated him there — real diagnostics, honest pricing, and results that hold.',
      initials: 'RN',
    },
    {
      name: 'Beth Okafor',
      role: 'Termite Specialist',
      years: 11,
      certs: ['State Licensed Pest Operator', 'WDO Certification', 'NPMA Associate'],
      bio: 'Beth has spent 11 years working exclusively with wood-destroying organisms. Over 3,000 inspections and treatments, zero re-treatment callbacks in the last four years. Her thoroughness in mapping before treating sets the standard for the whole team.',
      initials: 'BO',
    },
    {
      name: 'Tony Ricci',
      role: 'Bed Bug Division',
      years: 7,
      certs: ['State Licensed Pest Operator', 'Heat Treatment Certified', 'EPA Certified Applicator'],
      bio: 'Tony runs every bed bug job and has refined the heat treatment protocol over seven years. He coordinates multi-unit treatments with minimal tenant disruption and handles the most complex property management accounts in the portfolio.',
      initials: 'TR',
    },
    {
      name: 'Leah Park',
      role: 'Client Services',
      years: 5,
      certs: ['NPMA Industry Certification', 'Pesticide Handler Certification'],
      bio: 'Leah manages every client interaction from first call to post-treatment follow-up. She coordinates scheduling, handles commercial accounts, and runs the 48-hour callback check after every job. Clients regularly mention her by name in reviews.',
      initials: 'LP',
    },
  ];

  const teamToShow = biz.team && biz.team.length >= 2
    ? biz.team.slice(0, 4).map((m, i) => ({
        name: m.name,
        role: m.role,
        years: defaultMembers[i % 4].years,
        certs: defaultMembers[i % 4].certs,
        bio: m.bio || defaultMembers[i % 4].bio,
        initials: m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        photo: m.photo,
      }))
    : defaultMembers;

  return `${head('Our Team', biz)}
<body>
${siteHeader(biz, baseUrl)}

<!-- PAGE HEADER -->
<section style="background:var(--color-dark);padding:clamp(8rem,14vw,11rem) 1.5rem clamp(3rem,6vw,5rem)">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>The People Who Show Up</p>
    <h1 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(3.5rem,10vw,7rem);line-height:.9;text-transform:uppercase;color:#fff;margin-bottom:1rem" data-reveal data-delay="1">Our<br><span style="color:var(--color-primary)">Team</span></h1>
    <div class="section-divider" data-reveal data-delay="2"></div>
    <p style="color:rgba(255,255,255,.5);max-width:480px;font-size:.95rem;line-height:1.75;margin-top:1rem" data-reveal data-delay="3">Every technician holds a current state license, passes a background check, and completes 40+ hours of supervised field training before handling a job independently.</p>
  </div>
</section>

<!-- TEAM GRID -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner">
    <div class="team-grid">
      ${teamToShow.map((m, i) => `
      <div class="team-card" data-reveal data-delay="${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}">
        ${'photo' in m && m.photo
          ? `<div style="height:180px;overflow:hidden"><img src="${m.photo}" alt="${m.name}" style="width:100%;height:100%;object-fit:cover"></div>`
          : `<div class="team-avatar">${m.initials}</div>`}
        <div class="team-card-body" ${!('photo' in m && m.photo) ? '' : 'style="padding-top:1.5rem"'}>
          <h3 class="team-name">${m.name}</h3>
          <div class="team-role">${m.role}</div>
          <p style="font-size:.75rem;color:var(--color-text-muted);margin-bottom:.75rem">${m.years} years experience</p>
          <p class="team-bio">${m.bio}</p>
          <div style="margin-top:1.25rem;display:flex;flex-direction:column;gap:.4rem">
            ${m.certs.map((c: string) => `<div style="border-left:2px solid rgba(234,179,8,.4);padding-left:.6rem;font-size:.75rem;color:var(--color-text-muted)">${c}</div>`).join('')}
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- TRAINING STANDARDS -->
<section class="section-pad" style="background:var(--color-gray-bg)">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>How We Train</p>
    <h2 class="section-title" data-reveal data-delay="1">Our Standards</h2>
    <div class="section-divider" data-reveal data-delay="2"></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      ${[
        { title: '40-Hour Field Apprenticeship', body: 'New technicians shadow senior staff on real jobs for 40 hours before handling anything independently. They observe diagnostics, document findings, and practice application technique with a licensed technician present.' },
        { title: 'Annual License Renewal', body: 'Every technician completes continuing education hours annually to maintain their state pest control license. Certifications are tracked centrally and expirations are managed proactively.' },
        { title: 'Documentation Standards', body: 'Every job is documented — pest species, harborage locations, treatment type, products applied, and follow-up schedule. Customers receive a written report after every visit.' },
      ].map((s, i) => `
      <div style="background:#fff;border-radius:var(--card-radius);padding:2.25rem;box-shadow:0 2px 12px rgba(0,0,0,.05)" data-reveal data-delay="${i + 1 as 1 | 2 | 3}">
        <h3 style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.2rem;letter-spacing:.04em;text-transform:uppercase;margin-bottom:.75rem">${s.title}</h3>
        <p style="font-size:.875rem;color:var(--color-text-muted);line-height:1.7">${s.body}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- JOIN CTA -->
<section class="section-pad" style="background:var(--color-dark);text-align:center">
  <div class="section-inner" data-reveal>
    <p class="section-kicker" style="color:var(--color-primary)">Careers</p>
    <h2 class="section-title" style="color:#fff;max-width:500px;margin-left:auto;margin-right:auto">Join Our Team</h2>
    <p style="color:rgba(255,255,255,.5);max-width:480px;margin:1.5rem auto 2.5rem;font-size:.95rem;line-height:1.75">We hire for field technician roles. Full training provided — no prior experience required, but reliability and attention to detail are non-negotiable. Competitive pay, company vehicle, and benefits.</p>
    <div style="display:flex;flex-wrap:wrap;gap:1rem;justify-content:center">
      <a href="${baseUrl}/contact" class="primary-cta">Apply Now</a>
      ${pc ? `<a href="tel:${pc}" class="ghost-cta">Call to Discuss</a>` : ''}
    </div>
  </div>
</section>

${siteFooter(biz, baseUrl)}
${REVEAL_JS}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: GALLERY
// ══════════════════════════════════════════════════════════════════════════════

function buildGalleryPage(biz: BizPageData, baseUrl: string): string {
  const projects = [
    { name: 'Subterranean Termite Colony', service: 'Termite', outcome: 'Full liquid-barrier treatment applied. Colony eliminated, confirmed at 30-day re-inspection.', cat: 'Termite' },
    { name: 'Hotel Bed Bug Infestation', service: 'Bed Bugs', outcome: 'Heat treatment across 12 rooms. Completed overnight, zero guest disruption. Zero callbacks.', cat: 'Bed Bugs' },
    { name: 'Restaurant Cockroach Outbreak', service: 'Commercial', outcome: 'Gel-bait and IGR protocol. Health inspection passed 48 hours post-treatment.', cat: 'Commercial' },
    { name: 'Warehouse Rodent Exclusion', service: 'Rodent', outcome: '14 structural entry points sealed. Infestation cleared within one week, no re-entry in 8 months.', cat: 'Rodent' },
    { name: 'Drywood Termite Treatment', service: 'Termite', outcome: 'Spot treatment plus preventive borate on all exposed framing. Zero activity at follow-up.', cat: 'Termite' },
    { name: 'Apartment Complex Bed Bug Programme', service: 'Bed Bugs', outcome: '24-unit sequential heat treatment. Full property clear in 3 weeks, no tenant complaints post-treatment.', cat: 'Bed Bugs' },
  ];

  const filterCats = ['All', 'Termite', 'Bed Bugs', 'Rodent', 'Commercial'];

  return `${head('Gallery', biz)}
<body>
${siteHeader(biz, baseUrl)}

<!-- PAGE HEADER -->
<section style="background:var(--color-dark);padding:clamp(8rem,14vw,11rem) 1.5rem clamp(3rem,6vw,5rem)">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>Proof We Deliver</p>
    <h1 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(3.5rem,10vw,7rem);line-height:.9;text-transform:uppercase;color:#fff;margin-bottom:1rem" data-reveal data-delay="1">Work<br><span style="color:var(--color-primary)">Gallery</span></h1>
    <div class="section-divider" data-reveal data-delay="2"></div>
    <p style="color:rgba(255,255,255,.5);max-width:480px;font-size:.95rem;line-height:1.75;margin-top:1rem" data-reveal data-delay="3">Drag the slider to compare before and after. Filter by treatment type to find examples matching your situation.</p>
  </div>
</section>

<!-- FILTERS + SLIDERS -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner">
    <div style="display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:3rem" data-reveal>
      ${filterCats.map((c, i) => `<button onclick="filterGallery('${c}')" data-cat="${c}" class="filter-btn" style="border:1px solid ${i === 0 ? 'var(--color-primary);background:var(--color-primary);color:var(--color-dark)' : 'var(--color-gray-100);background:#fff;color:var(--color-text-muted)'};font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.55rem 1.25rem;border-radius:6px;cursor:pointer;transition:all var(--transition-base)">${c}</button>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2rem" id="gallery-grid">
      ${projects.map((p, i) => `
      <div class="gallery-proj" data-cat="${p.cat}" data-reveal data-delay="${(i % 2 + 1) as 1 | 2}">
        ${baSlider(FALLBACK_PHOTOS[0], extPhoto(i, biz))}
        <div style="background:var(--color-gray-bg);border-radius:0 0 var(--card-radius) var(--card-radius);padding:1.25rem 1.5rem;border-top:3px solid var(--color-primary)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.75rem">
            <div>
              <div style="font-weight:600;font-size:.9rem">${p.name}</div>
              <div style="font-size:.75rem;color:var(--color-text-muted);margin-top:.15rem">${biz.city || 'Local Area'} — ${p.service}</div>
            </div>
            <span style="border:1px solid rgba(234,179,8,.4);color:var(--color-primary);font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.3rem .75rem;border-radius:4px;white-space:nowrap;flex-shrink:0">${p.cat}</span>
          </div>
          <p style="font-size:.8rem;color:var(--color-text-muted);line-height:1.65">${p.outcome}</p>
        </div>
      </div>`).join('')}
    </div>
    <p style="text-align:center;color:var(--color-text-muted);font-size:.85rem;margin-top:2.5rem">Contact us for documentation specific to your pest type or property category.</p>
  </div>
</section>

<!-- CTA -->
<section style="background:var(--color-primary);padding:var(--section-pad) 1.5rem;text-align:center">
  <div class="section-inner" data-reveal>
    <h2 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2.5rem,6vw,4rem);line-height:.95;text-transform:uppercase;color:var(--color-dark);margin-bottom:1rem">Ready for Results Like These?</h2>
    <p style="color:rgba(0,0,0,.6);font-size:.95rem;margin-bottom:2rem">Free inspection. Flat quote. Same-day dispatch available.</p>
    <a href="${baseUrl}/contact" style="display:inline-block;background:var(--color-dark);color:var(--color-primary);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1rem;letter-spacing:.1em;text-transform:uppercase;padding:1rem 2.5rem;border-radius:8px;text-decoration:none">Book Free Inspection</a>
  </div>
</section>

<script>
function filterGallery(cat){
  document.querySelectorAll('.filter-btn').forEach(function(b){
    var active=b.dataset.cat===cat;
    b.style.background=active?'var(--color-primary)':'#fff';
    b.style.color=active?'var(--color-dark)':'var(--color-text-muted)';
    b.style.borderColor=active?'var(--color-primary)':'var(--color-gray-100)';
  });
  document.querySelectorAll('.gallery-proj').forEach(function(item){
    item.style.display=(cat==='All'||item.dataset.cat===cat)?'':'none';
  });
}
</script>
${siteFooter(biz, baseUrl)}
${BA_JS}
${REVEAL_JS}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: TESTIMONIALS
// ══════════════════════════════════════════════════════════════════════════════

function buildTestimonialsPage(biz: BizPageData, baseUrl: string): string {
  const defaultReviews = [
    { text: `Called ${biz.name} after a national chain failed twice in two months. The technician walked the entire crawlspace, found the original entry point, and had it sealed and treated the same day. Nothing since.`, name: 'Frank D.', city: biz.city || 'Local Area', service: 'Rodent Removal', date: 'March 2025' },
    { text: 'Found active termites two days before closing. They were on-site within three hours, completed the treatment, and handed us written documentation for the buyer. The sale went through.', name: 'Carla J.', city: biz.city || 'Local Area', service: 'Termite Elimination', date: 'January 2025' },
    { text: 'We run three restaurants and they manage all three. Health inspector has not flagged a single location in four years. Discreet, thorough, completely reliable on their schedule.', name: 'Omar T.', city: biz.city || 'Local Area', service: 'Commercial Pest Management', date: 'February 2025' },
    { text: 'Mice coming in every winter for years. Every company just kept resetting traps. These guys found the entry points in the foundation and sealed them permanently. First clean winter in five years.', name: 'Nicole V.', city: biz.city || 'Local Area', service: 'Rodent Removal', date: 'November 2024' },
    { text: 'Bed bugs in a rental unit. They scheduled around the tenant, completed the heat treatment in a single day, and I have had zero complaints in eight months since. Professional from start to finish.', name: 'James K.', city: biz.city || 'Local Area', service: 'Bed Bug Extermination', date: 'October 2024' },
    { text: 'Wasp nest inside the wall cavity behind my garage. Called at 7 AM, they were on-site by 9:15. Had the nest removed, entry point patched, everything cleaned up before I left for work.', name: 'Tamara R.', city: biz.city || 'Local Area', service: 'Emergency Response', date: 'August 2024' },
    { text: 'Cockroach problem in a commercial kitchen that two others could not solve. Changed the protocol entirely and we passed health inspection 36 hours later. Genuinely impressed.', name: 'David M.', city: biz.city || 'Local Area', service: 'Cockroach Control', date: 'September 2024' },
    { text: 'Mosquito barrier treatment at the start of the season and we had a fully usable backyard for the first time in three years. Monthly service, very consistent technician each visit.', name: 'Sarah B.', city: biz.city || 'Local Area', service: 'Mosquito Control', date: 'July 2024' },
    { text: 'Large warehouse, rodents had been getting in through gaps around the loading dock for months. They conducted a full structural exclusion and followed up two weeks later to verify. No activity since.', name: 'Chris P.', city: biz.city || 'Local Area', service: 'Commercial Rodent Exclusion', date: 'June 2024' },
    { text: 'Ant infestation that defied every treatment we tried ourselves. One visit, they identified the colony location and species, applied a targeted protocol, and it was completely resolved in 10 days.', name: 'Maria G.', city: biz.city || 'Local Area', service: 'Ant Control', date: 'May 2024' },
  ];

  const revTexts = biz.reviewTexts || [];
  const allReviews = [
    ...revTexts.slice(0, 10).map((t, i) => ({
      text: t,
      name: defaultReviews[i % 10].name,
      city: biz.city || 'Local Area',
      service: defaultReviews[i % 10].service,
      date: defaultReviews[i % 10].date,
    })),
    ...defaultReviews.slice(revTexts.length),
  ].slice(0, 10);

  const featured = allReviews[0];
  const gridReviews = allReviews.slice(1);

  return `${head('Reviews', biz)}
<body>
${siteHeader(biz, baseUrl)}

<!-- PAGE HEADER -->
<section style="background:var(--color-dark);padding:clamp(8rem,14vw,11rem) 1.5rem clamp(3rem,6vw,5rem)">
  <div class="section-inner">
    <p class="section-kicker" data-reveal>What People Are Saying</p>
    <h1 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(3.5rem,10vw,7rem);line-height:.9;text-transform:uppercase;color:#fff;margin-bottom:1rem" data-reveal data-delay="1">Real<br><span style="color:var(--color-primary)">Reviews</span></h1>
    <div class="section-divider" data-reveal data-delay="2"></div>
    <div style="display:flex;align-items:center;gap:1rem;margin-top:1.5rem" data-reveal data-delay="3">
      <span style="color:var(--color-primary);font-size:1.1rem;letter-spacing:.1em">${starText(biz.rating)}</span>
      <span style="color:rgba(255,255,255,.45);font-size:.875rem">${biz.rating ?? '4.9'} rating — ${biz.reviews ?? '200'}+ reviews</span>
    </div>
  </div>
</section>

<!-- FEATURED REVIEW -->
<section class="section-pad" style="background:#fff">
  <div class="section-inner" style="max-width:800px">
    <div class="featured-review" data-reveal>
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:5rem;line-height:1;color:var(--color-primary);margin-bottom:1rem">"</div>
      <p style="font-size:1.2rem;line-height:1.75;color:#fff;margin-bottom:2rem">${featured.text}</p>
      <div style="color:var(--color-primary);font-size:1rem;letter-spacing:.1em;margin-bottom:.75rem">${starText(biz.rating)}</div>
      <div style="color:#fff;font-weight:600">${featured.name}</div>
      <div style="color:rgba(255,255,255,.4);font-size:.8rem;margin-top:.25rem">${featured.city} — ${featured.service} — ${featured.date}</div>
    </div>
  </div>
</section>

<!-- REVIEW GRID -->
<section class="section-pad" style="background:var(--color-gray-bg)">
  <div class="section-inner">
    <div class="reviews-masonry">
      ${gridReviews.map((r, i) => `
      <div class="review-grid-card" data-reveal data-delay="${Math.min((i % 3) + 1, 4) as 1 | 2 | 3 | 4}">
        <div style="color:var(--color-primary);font-size:.95rem;letter-spacing:.1em;margin-bottom:.75rem">${starText(biz.rating)}</div>
        <p style="font-size:.875rem;color:var(--color-text-muted);line-height:1.7;margin-bottom:1.25rem">${r.text}</p>
        <div style="border-top:1px solid var(--color-gray-100);padding-top:1rem">
          <div style="font-weight:600;font-size:.875rem">${r.name}</div>
          <div style="font-size:.75rem;color:var(--color-text-muted);margin-top:.2rem">${r.city} — ${r.service}</div>
          <div style="font-size:.75rem;color:var(--color-gray-100);margin-top:.15rem">${r.date}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- GOOGLE REVIEW CTA -->
<section class="section-pad" style="background:var(--color-primary);text-align:center">
  <div class="section-inner" data-reveal>
    <h2 style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:clamp(2rem,5vw,3rem);line-height:.95;text-transform:uppercase;color:var(--color-dark);margin-bottom:1rem">Satisfied? Leave a Google Review.</h2>
    <p style="color:rgba(0,0,0,.6);font-size:.95rem;margin-bottom:2rem;max-width:500px;margin-left:auto;margin-right:auto">Two minutes of your time helps local homeowners and businesses find honest pest control. Every review matters.</p>
    <a href="https://www.google.com/search?q=${encodeURIComponent((biz.name || '') + ' ' + (biz.city || ''))}" target="_blank" rel="noopener" style="display:inline-block;background:var(--color-dark);color:var(--color-primary);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1rem;letter-spacing:.1em;text-transform:uppercase;padding:1rem 2.5rem;border-radius:8px;text-decoration:none">Review on Google</a>
  </div>
</section>

${siteFooter(biz, baseUrl)}
${REVEAL_JS}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export function buildExterminatorAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:         buildHomePage(biz, baseUrl),
    about:        buildAboutPage(biz, baseUrl),
    contact:      buildContactPage(biz, baseUrl),
    team:         buildTeamPage(biz, baseUrl),
    gallery:      buildGalleryPage(biz, baseUrl),
    testimonials: buildTestimonialsPage(biz, baseUrl),
  };
}
