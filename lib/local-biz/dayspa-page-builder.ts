/**
 * Day Spa page builder — for independent day spas, nail salons, wellness studios.
 * Built specifically for Spa De Da Day Spa, Douglas GA.
 *
 * Design identity (completely distinct from all other builders):
 *   - Fonts: Cormorant Garamond 300/600 (elegant thin serif display) + Jost 300/400 (clean modern sans)
 *   - Palette: off-white #FDF8F4, warm taupe #D9C4B5, dusty rose #C4848A, sage #7FA898, deep charcoal #2C2422
 *   - Hero: full-bleed with warm semi-transparent blush overlay — soft, NOT dark
 *   - Services: soft rounded cards with icon prefix — intimate boutique feel
 *   - Team: circular portrait cards — Ciera, Dawn, Carol
 *   - Organic shapes: large border-radius throughout, soft shadows, no hard edges
 *   - CTA: pill-shaped buttons in dusty rose
 *   - Completely different from salon dark-luxury (AHS), light-mint, bold-cocina, bold-soulfood
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function p(idx: number, biz: BizPageData, fallback: string): string {
  return biz.photos[idx] || fallback;
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1400&q=80',  // spa treatment room
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80',  // foot pedicure spa
  'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=1200&q=80',  // nail manicure
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=1200&q=80',  // spa stones candles
  'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1200&q=80',    // massage table
  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=80', // hair salon
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80', // beauty treatment
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=80', // spa candles zen
];

function ph(idx: number, biz: BizPageData): string {
  return p(idx, biz, FALLBACK_PHOTOS[idx] || FALLBACK_PHOTOS[0]);
}

function htmlHead(title: string, desc: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --cream:#FDF8F4;
  --taupe:#D9C4B5;
  --rose:#C4848A;
  --rose-dark:#A06368;
  --sage:#7FA898;
  --sage-light:#A8C5BA;
  --charcoal:#2C2422;
  --muted:#7A6A64;
  --font-display:'Cormorant Garamond',Georgia,serif;
  --font-body:'Jost',system-ui,sans-serif;
}
body{font-family:var(--font-body);background:var(--cream);color:var(--charcoal);font-weight:300;-webkit-font-smoothing:antialiased}
img{display:block;width:100%;object-fit:cover}
a{text-decoration:none;color:inherit}
.btn-rose{display:inline-block;background:var(--rose);color:#fff;font-family:var(--font-body);font-weight:400;font-size:0.88rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.85rem 2.2rem;border-radius:50px;transition:background .2s}
.btn-rose:hover{background:var(--rose-dark)}
.btn-outline{display:inline-block;border:1.5px solid var(--rose);color:var(--rose);font-family:var(--font-body);font-weight:400;font-size:0.88rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.8rem 2rem;border-radius:50px;transition:all .2s}
.btn-outline:hover{background:var(--rose);color:#fff}
/* Mobile nav */
.nav-links{display:flex;align-items:center;gap:2rem}
@media(max-width:640px){
  .nav-links .nav-link{display:none}
  #spa-nav{padding:0 1.25rem}
  #spa-nav .brand-name{font-size:1rem}
}
/* Grid collapse */
@media(max-width:640px){
  .two-col{grid-template-columns:1fr!important}
  .three-col{grid-template-columns:1fr!important}
}
</style>
</head>
<body>`;
}

// ── NAV ───────────────────────────────────────────────────────────────────────

function nav(baseUrl: string, biz: BizPageData): string {
  return `
<nav id="spa-nav" style="position:sticky;top:0;z-index:100;background:rgba(253,248,244,0.97);backdrop-filter:blur(8px);border-bottom:1px solid var(--taupe);padding:0 2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:60px">
  <a href="${baseUrl}" class="brand-name" style="font-family:var(--font-display);font-size:1.2rem;font-weight:600;letter-spacing:0.04em;color:var(--charcoal);flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(biz.name)}</a>
  <div class="nav-links" style="flex-shrink:0">
    <a href="${baseUrl}/services" class="nav-link" style="color:var(--muted);font-size:0.82rem;letter-spacing:0.1em;text-transform:uppercase">Services</a>
    <a href="${baseUrl}/about" class="nav-link" style="color:var(--muted);font-size:0.82rem;letter-spacing:0.1em;text-transform:uppercase">Our Team</a>
    <a href="${baseUrl}/booking" class="nav-link" style="color:var(--muted);font-size:0.82rem;letter-spacing:0.1em;text-transform:uppercase">Book</a>
    ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-rose" style="font-size:0.78rem;padding:0.6rem 1.4rem;flex-shrink:0">Call Now</a>` : ''}
  </div>
</nav>`;
}

// ── FOOTER ────────────────────────────────────────────────────────────────────

function footerHtml(biz: BizPageData): string {
  const hoursLines = (biz.hours || '').split('\n').filter(Boolean);
  return `
<footer style="background:var(--charcoal);color:rgba(255,255,255,0.65);padding:4rem 2rem 2rem">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2.5rem" class="three-col">
    <div>
      <p style="font-family:var(--font-display);font-size:1.2rem;font-weight:600;color:#fff;margin-bottom:0.75rem">${esc(biz.name)}</p>
      ${biz.address ? `<p style="font-size:0.88rem;line-height:1.8">${esc(biz.address)}</p>` : ''}
      ${biz.phone ? `<p style="margin-top:0.5rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:var(--rose);font-size:0.95rem">${esc(biz.phone)}</a></p>` : ''}
    </div>
    <div>
      <p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--taupe);margin-bottom:0.75rem">Hours</p>
      ${hoursLines.map(l => `<p style="font-size:0.88rem;line-height:2">${esc(l)}</p>`).join('')}
    </div>
    <div>
      <p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--taupe);margin-bottom:0.75rem">Services</p>
      ${(biz.services || []).slice(0, 4).map(s => `<p style="font-size:0.88rem;line-height:2">${esc(s.name)}</p>`).join('')}
    </div>
  </div>
  <p style="text-align:center;font-size:0.75rem;color:rgba(255,255,255,0.25);margin-top:3rem">© ${new Date().getFullYear()} ${esc(biz.name)} · ${esc(biz.city)}, ${esc(biz.state)}</p>
</footer>`;
}

// ── DIVIDER ───────────────────────────────────────────────────────────────────

function waveDivider(fromColor: string, toColor: string): string {
  return `<div style="background:${fromColor};line-height:0">
  <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%">
    <path d="M0 30 Q360 60 720 30 Q1080 0 1440 30 L1440 60 L0 60 Z" fill="${toColor}"/>
  </svg>
</div>`;
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────

function buildSpaHome(biz: BizPageData, baseUrl: string): string {
  const heroSub = biz.heroSub || 'A warm, welcoming escape in the heart of Douglas, Georgia.';
  const mainServices = (biz.services || []).slice(0, 4);
  const review0 = biz.reviewTexts?.[0] || "Ciera gave me a relaxing pedicure and beautiful manicure. My favourite place in the south!";
  const review1 = biz.reviewTexts?.[1] || "The best! My twin girls got their nails done and they were so happy. We will always be back.";

  return `${htmlHead(`${biz.name} | ${biz.city}, ${biz.state}`, heroSub)}

${nav(baseUrl, biz)}

<!-- HERO -->
<section style="position:relative;height:clamp(480px,75vh,720px);overflow:hidden">
  <img src="${ph(0, biz)}" alt="${esc(biz.name)}" style="position:absolute;inset:0;height:100%;object-position:center 30%">
  <!-- Warm blush overlay — NOT dark -->
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(196,132,138,0.55) 0%,rgba(217,196,181,0.4) 50%,rgba(127,168,152,0.35) 100%)"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(253,248,244,0) 40%,rgba(253,248,244,0.85) 100%)"></div>
  <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:center;padding:2rem 2rem 4rem;max-width:680px">
    ${biz.rating ? `<div style="display:inline-flex;align-items:center;gap:0.5rem;margin-bottom:1.5rem">
      <span style="color:var(--rose);font-size:1rem">★★★★★</span>
      <span style="font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--charcoal)">${biz.rating} · ${biz.reviews} Google Reviews</span>
    </div>` : ''}
    <h1 style="font-family:var(--font-display);font-size:clamp(2.8rem,7vw,5.5rem);font-weight:300;line-height:1.05;color:var(--charcoal);margin-bottom:1rem">
      ${esc(biz.heroHeadline || 'Your Personal')}<br><em style="font-weight:600;color:var(--rose)">${esc(biz.heroHeadlineEm || 'Day Spa Escape')}</em>
    </h1>
    <p style="font-size:1.05rem;color:var(--muted);line-height:1.7;max-width:440px;margin-bottom:2rem">${esc(heroSub)}</p>
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-rose">Book an Appointment</a>` : ''}
      <a href="${baseUrl}/services" class="btn-outline">Our Services</a>
    </div>
  </div>
</section>

<!-- SERVICES PREVIEW -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:960px;margin:0 auto">
    <p style="font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);text-align:center;margin-bottom:0.5rem">What We Offer</p>
    <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);font-weight:300;text-align:center;color:var(--charcoal);margin-bottom:3.5rem">Treatments &amp; Services</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem" class="two-col">
      ${mainServices.map((s, i) => {
        const icons = ['🌸', '✨', '💅', '🌿'];
        return `<div style="background:#fff;border-radius:20px;padding:2rem 1.75rem;box-shadow:0 4px 24px rgba(44,36,34,0.07);transition:transform .25s,box-shadow .25s" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 32px rgba(44,36,34,0.12)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 24px rgba(44,36,34,0.07)'">
          <p style="font-size:1.75rem;margin-bottom:0.75rem">${icons[i % icons.length]}</p>
          <p style="font-family:var(--font-display);font-size:1.2rem;font-weight:600;color:var(--charcoal);margin-bottom:0.5rem">${esc(s.name)}</p>
          ${s.price ? `<p style="color:var(--rose);font-size:0.9rem;font-weight:400;margin-bottom:0.5rem">${esc(s.price)}</p>` : ''}
          <p style="font-size:0.88rem;color:var(--muted);line-height:1.7">${esc(s.desc)}</p>
        </div>`;
      }).join('')}
    </div>
    <div style="text-align:center;margin-top:2.5rem">
      <a href="${baseUrl}/services" class="btn-outline">View All Services</a>
    </div>
  </div>
</section>

${waveDivider('var(--cream)', '#FAF0EE')}

<!-- REVIEWS -->
<section style="background:#FAF0EE;padding:5rem 2rem">
  <div style="max-width:860px;margin:0 auto">
    <p style="font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--sage);text-align:center;margin-bottom:0.5rem">Kind Words</p>
    <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);font-weight:300;text-align:center;color:var(--charcoal);margin-bottom:3rem">What Our Guests Say</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem" class="two-col">
      ${[review0, review1].map(r => `
      <div style="background:#fff;border-radius:20px;padding:2rem;box-shadow:0 2px 16px rgba(44,36,34,0.06)">
        <p style="color:var(--rose);margin-bottom:0.75rem;font-size:1.1rem">★★★★★</p>
        <p style="font-family:var(--font-display);font-style:italic;font-size:1.05rem;color:var(--charcoal);line-height:1.7">"${esc(r)}"</p>
      </div>`).join('')}
    </div>
  </div>
</section>

${waveDivider('#FAF0EE', 'var(--cream)')}

<!-- ABOUT TEASER -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center" class="two-col">
    <div>
      <img src="${ph(3, biz)}" alt="Spa atmosphere" style="border-radius:24px;aspect-ratio:3/4;object-fit:cover;box-shadow:0 8px 40px rgba(44,36,34,0.1)">
    </div>
    <div>
      <p style="font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:0.5rem">Our Story</p>
      <h2 style="font-family:var(--font-display);font-size:clamp(1.8rem,3vw,2.8rem);font-weight:300;color:var(--charcoal);margin-bottom:1rem">${esc(biz.aboutText || 'Your Sanctuary in Douglas')}</h2>
      <p style="font-size:0.95rem;color:var(--muted);line-height:1.9;margin-bottom:1.75rem">${esc(biz.aboutText2 || "Spa De Da has been Douglas's favourite escape for over a decade. Our small, dedicated team of licensed therapists and stylists brings warmth and expertise to every single appointment. We take our time because you deserve it.")}</p>
      <a href="${baseUrl}/about" class="btn-rose">Meet the Team</a>
    </div>
  </div>
</section>

<!-- BOOK CTA STRIP -->
<section style="background:var(--sage);padding:4rem 2rem;text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(1.8rem,4vw,3rem);font-weight:300;color:#fff;margin-bottom:0.5rem">Ready for Some <em>You Time?</em></h2>
  <p style="color:rgba(255,255,255,0.8);margin-bottom:2rem;font-size:0.95rem">${esc(biz.ctaText || 'Call us to book your appointment — we\'d love to see you.')}</p>
  ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-rose" style="background:#fff;color:var(--rose)">${esc(biz.phone)}</a>` : `<a href="${baseUrl}/booking" class="btn-rose" style="background:#fff;color:var(--rose)">Book Now</a>`}
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── SERVICES PAGE ─────────────────────────────────────────────────────────────

function buildSpaServices(biz: BizPageData, baseUrl: string): string {
  const services = biz.services || [];
  const icons = ['🌸', '💅', '✨', '🌿', '💆', '🧖', '💇', '🕯️'];

  return `${htmlHead(`Services — ${biz.name}`, `All treatments and services at ${biz.name}, ${biz.city} ${biz.state}`)}
${nav(baseUrl, biz)}

<div style="background:linear-gradient(135deg,#FAF0EE,var(--cream));padding:5rem 2rem 4rem;text-align:center">
  <p style="font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:0.5rem">Everything We Offer</p>
  <h1 style="font-family:var(--font-display);font-size:clamp(2.5rem,6vw,4.5rem);font-weight:300;color:var(--charcoal)">Our Treatments</h1>
</div>

<section style="background:var(--cream);padding:4rem 2rem">
  <div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem">
    ${services.map((s, i) => `
    <div style="background:#fff;border-radius:20px;padding:2rem;box-shadow:0 4px 20px rgba(44,36,34,0.07)">
      <p style="font-size:1.5rem;margin-bottom:0.75rem">${icons[i % icons.length]}</p>
      <p style="font-family:var(--font-display);font-size:1.25rem;font-weight:600;color:var(--charcoal);margin-bottom:0.25rem">${esc(s.name)}</p>
      ${s.price ? `<p style="color:var(--rose);font-weight:400;font-size:0.92rem;margin-bottom:0.75rem">${esc(s.price)}</p>` : ''}
      ${s.duration ? `<p style="color:var(--sage);font-size:0.82rem;letter-spacing:0.06em;margin-bottom:0.6rem">${esc(s.duration)}</p>` : ''}
      <p style="font-size:0.9rem;color:var(--muted);line-height:1.75">${esc(s.desc)}</p>
    </div>`).join('')}
  </div>

  <div style="background:linear-gradient(135deg,var(--rose),var(--rose-dark));border-radius:20px;padding:2.5rem;text-align:center;max-width:600px;margin:3rem auto 0">
    <p style="font-family:var(--font-display);font-style:italic;font-size:1.3rem;color:#fff;margin-bottom:0.5rem">Ready to treat yourself?</p>
    <p style="color:rgba(255,255,255,0.8);font-size:0.9rem;margin-bottom:1.5rem">Call us to book your appointment. Walk-ins welcome when available.</p>
    ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-rose" style="background:#fff;color:var(--rose)">${esc(biz.phone)}</a>` : ''}
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── GALLERY PAGE ──────────────────────────────────────────────────────────────

function buildSpaGallery(biz: BizPageData, baseUrl: string): string {
  const photos = Array.from({ length: 8 }, (_, i) => ph(i, biz));

  return `${htmlHead(`Gallery — ${biz.name}`, `Photos from ${biz.name} in ${biz.city}, ${biz.state}`)}
${nav(baseUrl, biz)}

<div style="background:linear-gradient(135deg,#FAF0EE,var(--cream));padding:5rem 2rem 4rem;text-align:center">
  <h1 style="font-family:var(--font-display);font-size:clamp(2.5rem,6vw,4.5rem);font-weight:300;color:var(--charcoal)">Gallery</h1>
  <p style="color:var(--muted);margin-top:0.75rem;font-size:0.95rem">A glimpse inside your next escape</p>
</div>

<section style="background:var(--cream);padding:3rem 2rem">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
    ${photos.map((ph, i) => `<div style="overflow:hidden;border-radius:16px;aspect-ratio:${i === 0 || i === 3 ? '4/3' : '1/1'}${i === 0 ? ';grid-column:span 2' : ''}">
      <img src="${ph}" alt="${esc(biz.name)} photo ${i + 1}" style="height:100%;object-position:center;transition:transform .4s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
    </div>`).join('\n    ')}
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── ABOUT/TEAM PAGE ───────────────────────────────────────────────────────────

function buildSpaAbout(biz: BizPageData, baseUrl: string): string {
  const reviews = biz.reviewTexts || [];
  const team = biz.team || [];

  return `${htmlHead(`Our Team — ${biz.name}`, `Meet the team at ${biz.name} in ${biz.city}, ${biz.state}`)}
${nav(baseUrl, biz)}

<!-- ABOUT HERO -->
<div style="position:relative;height:clamp(280px,40vh,420px);overflow:hidden">
  <img src="${ph(4, biz)}" alt="Our spa" style="position:absolute;inset:0;height:100%;object-position:center">
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(196,132,138,0.6),rgba(127,168,152,0.5))"></div>
  <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem">
    <p style="font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:0.5rem">About Us</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(2rem,5vw,3.5rem);font-weight:300;color:#fff">${esc(biz.aboutText || 'Your Local Spa Family')}</h1>
  </div>
</div>

<!-- STORY -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:760px;margin:0 auto;text-align:center">
    <p style="font-family:var(--font-display);font-style:italic;font-size:1.3rem;font-weight:300;color:var(--charcoal);line-height:1.7;margin-bottom:2rem">"${esc(biz.aboutText2 || "We're more than a spa — we're your community's place to breathe. Our licensed team brings warmth and expertise to every treatment, and we take our time because you deserve it.")}"</p>
    ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-rose">Book with Us</a>` : ''}
  </div>
</section>

${team.length ? `
<!-- TEAM -->
<section style="background:#FAF0EE;padding:5rem 2rem">
  <div style="max-width:900px;margin:0 auto">
    <h2 style="font-family:var(--font-display);font-size:clamp(1.8rem,3vw,2.8rem);font-weight:300;text-align:center;color:var(--charcoal);margin-bottom:3rem">Meet the Team</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem">
      ${team.map((m, i) => `
      <div style="text-align:center">
        <div style="width:120px;height:120px;border-radius:50%;overflow:hidden;margin:0 auto 1rem;border:3px solid var(--taupe)">
          <img src="${ph(i + 4, biz)}" alt="${esc(m.name)}" style="height:100%;object-position:top">
        </div>
        <p style="font-family:var(--font-display);font-size:1.15rem;font-weight:600;color:var(--charcoal)">${esc(m.name)}</p>
        <p style="font-size:0.82rem;letter-spacing:0.08em;color:var(--rose);text-transform:uppercase;margin-top:0.25rem">${esc(m.role)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

<!-- REVIEWS -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:800px;margin:0 auto">
    <h2 style="font-family:var(--font-display);font-size:clamp(1.8rem,3vw,2.5rem);font-weight:300;text-align:center;color:var(--charcoal);margin-bottom:3rem">Guest Reviews</h2>
    <div style="display:grid;gap:1.25rem">
      ${reviews.map(r => `
      <div style="background:#fff;border-radius:16px;padding:1.75rem 2rem;box-shadow:0 2px 16px rgba(44,36,34,0.06)">
        <p style="color:var(--rose);margin-bottom:0.75rem">★★★★★</p>
        <p style="font-family:var(--font-display);font-style:italic;font-size:1.05rem;color:var(--charcoal);line-height:1.7">"${esc(r)}"</p>
      </div>`).join('')}
    </div>
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── BOOKING/FIND US PAGE ──────────────────────────────────────────────────────

function buildSpaBooking(biz: BizPageData, baseUrl: string): string {
  const hoursLines = (biz.hours || '').split('\n').filter(Boolean);
  const services = (biz.services || []).map(s => s.name);

  return `${htmlHead(`Book an Appointment — ${biz.name}`, `Book at ${biz.name} in ${biz.city}, ${biz.state}. ${biz.phone || ''}`)}
${nav(baseUrl, biz)}

<div style="background:linear-gradient(135deg,#FAF0EE,var(--cream));padding:5rem 2rem 4rem;text-align:center">
  <p style="font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:0.5rem">Reserve Your Time</p>
  <h1 style="font-family:var(--font-display);font-size:clamp(2.5rem,6vw,4rem);font-weight:300;color:var(--charcoal)">Book an Appointment</h1>
</div>

<section style="background:var(--cream);padding:4rem 2rem">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:start" class="two-col">

    <!-- BOOKING WIDGET -->
    <div style="background:#fff;border-radius:24px;padding:2.5rem;box-shadow:0 4px 30px rgba(44,36,34,0.08)">
      <p style="font-family:var(--font-display);font-size:1.4rem;font-weight:600;color:var(--charcoal);margin-bottom:0.25rem">Request an Appointment</p>
      <p style="color:var(--muted);font-size:0.88rem;margin-bottom:1.75rem">Call us or fill in below and we'll get back to you.</p>

      <form onsubmit="handleBook(event)">
        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.4rem">Your Name</label>
          <input name="name" required placeholder="Jane Smith" style="width:100%;padding:0.85rem 1rem;border:1.5px solid var(--taupe);border-radius:12px;font-family:var(--font-body);font-size:0.95rem;background:#FDFAF8;outline:none;transition:border .2s" onfocus="this.style.borderColor='var(--rose)'" onblur="this.style.borderColor='var(--taupe)'">
        </div>
        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.4rem">Phone Number</label>
          <input name="phone" type="tel" required placeholder="(912) 555-0123" style="width:100%;padding:0.85rem 1rem;border:1.5px solid var(--taupe);border-radius:12px;font-family:var(--font-body);font-size:0.95rem;background:#FDFAF8;outline:none;transition:border .2s" onfocus="this.style.borderColor='var(--rose)'" onblur="this.style.borderColor='var(--taupe)'">
        </div>
        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.4rem">Service</label>
          <select name="service" style="width:100%;padding:0.85rem 1rem;border:1.5px solid var(--taupe);border-radius:12px;font-family:var(--font-body);font-size:0.95rem;background:#FDFAF8;outline:none;appearance:none">
            <option value="">Select a service...</option>
            ${services.map(s => `<option>${esc(s)}</option>`).join('')}
          </select>
        </div>
        <div style="margin-bottom:1.75rem">
          <label style="display:block;font-size:0.78rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.4rem">Preferred Date</label>
          <input name="date" type="date" style="width:100%;padding:0.85rem 1rem;border:1.5px solid var(--taupe);border-radius:12px;font-family:var(--font-body);font-size:0.95rem;background:#FDFAF8;outline:none;transition:border .2s" onfocus="this.style.borderColor='var(--rose)'" onblur="this.style.borderColor='var(--taupe)'">
        </div>
        <button type="submit" class="btn-rose" style="width:100%;padding:1rem;font-size:0.9rem">Request Appointment</button>
      </form>

      <div id="book-confirm" style="display:none;text-align:center;padding:2rem 0">
        <p style="font-size:2rem;margin-bottom:0.75rem">🌸</p>
        <p style="font-family:var(--font-display);font-size:1.2rem;color:var(--charcoal);margin-bottom:0.5rem">Thank you!</p>
        <p style="color:var(--muted);font-size:0.9rem">We'll call you to confirm your appointment at <strong>${esc(biz.phone || '')}</strong></p>
      </div>
    </div>

    <!-- INFO -->
    <div>
      <h2 style="font-family:var(--font-display);font-size:1.5rem;font-weight:300;color:var(--charcoal);margin-bottom:1.5rem">Find Us</h2>
      ${biz.address ? `<p style="color:var(--muted);font-size:0.95rem;line-height:1.8;margin-bottom:1.5rem">${esc(biz.address)}</p>` : ''}
      ${biz.phone ? `<p style="margin-bottom:1.75rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="font-family:var(--font-display);font-size:1.5rem;font-weight:600;color:var(--rose)">${esc(biz.phone)}</a></p>` : ''}
      ${biz.address ? `<a href="https://maps.google.com/?q=${encodeURIComponent(biz.address)}" target="_blank" class="btn-outline" style="margin-bottom:2.5rem;display:inline-block">Get Directions</a>` : ''}

      <div style="margin-top:2rem">
        <p style="font-size:0.72rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);margin-bottom:0.75rem">Hours</p>
        ${hoursLines.map(l => `<p style="font-size:0.92rem;line-height:2;border-bottom:1px solid var(--taupe);padding-bottom:0.25rem;margin-bottom:0.25rem;color:var(--charcoal)">${esc(l)}</p>`).join('')}
      </div>
    </div>
  </div>
</section>

<script>
function handleBook(e) {
  e.preventDefault();
  document.querySelector('form').style.display = 'none';
  document.getElementById('book-confirm').style.display = 'block';
}
</script>

${footerHtml(biz)}
</body></html>`;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export function buildDaySpaAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:     buildSpaHome(biz, baseUrl),
    services: buildSpaServices(biz, baseUrl),
    gallery:  buildSpaGallery(biz, baseUrl),
    about:    buildSpaAbout(biz, baseUrl),
    booking:  buildSpaBooking(biz, baseUrl),
  };
}
