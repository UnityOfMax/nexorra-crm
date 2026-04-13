/**
 * Mexican Cocina page builder — for Latina/Latino-owned Mexican restaurants.
 * Built specifically for Bertha's Cocina, Tifton GA.
 *
 * Design identity (completely distinct from all other builders):
 *   - Fonts: Syne 800 (festive display) + Nunito 600 (warm body) + Caveat 600 (handwritten accent)
 *   - Palette: warm cream bg, purple #7B2D8B (pulled from their actual walls), chile-red CTAs,
 *              forest green accents, marigold detail color
 *   - Hero: SPLIT — real photo left / bold purple panel right. No dark overlay.
 *   - Papel picado strip as cultural anchor between hero and content
 *   - Spanish section names: La Cocina, Antojitos, Platos Fuertes
 *   - Menu: card grid with colored left border accents — NOT dotted lines
 *   - Reviews on purple section bg
 *   - Light, warm, festive — diametrically opposite to the BBQ dark-smoke builder
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function p(idx: number, biz: BizPageData, fallback = 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80'): string {
  return biz.photos[idx] || fallback;
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Papel picado strip — repeating triangular pennant flags */
function papelPicado(count = 60): string {
  const colors = ['#7B2D8B', '#E53935', '#F4A018', '#2E7D32', '#E53935', '#7B2D8B', '#F4A018', '#2E7D32'];
  const flags = Array.from({ length: count }, (_, i) =>
    `<span style="display:inline-block;width:22px;height:30px;clip-path:polygon(0 0,100% 0,50% 100%);background:${colors[i % colors.length]};flex-shrink:0"></span>`
  ).join('');
  return `<div aria-hidden="true" style="display:flex;gap:4px;padding:6px 0 0;overflow:hidden;background:var(--cream)">${flags}</div>`;
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
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Nunito:wght@400;500;600&family=Caveat:wght@600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --cream:#FEF9F0;
  --cream-alt:#FFF3E0;
  --text:#2D1A0E;
  --muted:#6B4F3A;
  --purple:#7B2D8B;
  --purple-dark:#5C1F69;
  --green:#2E7D32;
  --red:#E53935;
  --red-dark:#B71C1C;
  --marigold:#F4A018;
  --white:#FFFFFF;
}
body{background:var(--cream);color:var(--text);font-family:'Nunito',sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%;height:auto}
a{color:inherit;text-decoration:none}
button{cursor:pointer;font-family:inherit;border:none;outline:none}

/* ── NAV ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:68px;transition:background .3s,backdrop-filter .3s,box-shadow .3s}
.nav.scrolled{background:rgba(254,249,240,0.96);backdrop-filter:blur(12px);box-shadow:0 1px 0 rgba(45,26,14,0.1)}
.nav-brand{font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;letter-spacing:0.02em}
.nav-brand .b1{color:var(--purple)}
.nav-brand .b2{color:var(--red)}
.nav-links{display:flex;align-items:center;gap:1.75rem}
.nav-links a{font-family:'Nunito',sans-serif;font-weight:600;font-size:0.9rem;color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--text)}
.nav-cta{background:var(--red);color:#fff!important;padding:0.5rem 1.2rem;border-radius:999px;font-weight:700;transition:background .2s!important}
.nav-cta:hover{background:var(--red-dark)!important}
.nav-toggle{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:4px}
.nav-toggle span{width:24px;height:2px;background:var(--text);display:block;transition:all .3s}
@media(max-width:768px){
  .nav{padding:0 1.25rem}
  .nav-links{display:none;position:fixed;top:68px;left:0;right:0;background:var(--purple);flex-direction:column;padding:2rem 1.5rem;gap:1.5rem;text-align:center}
  .nav-links.open{display:flex}
  .nav-links a{color:rgba(255,255,255,0.85)!important;font-size:1.2rem}
  .nav-cta{background:var(--red)!important;color:#fff!important}
  .nav-toggle{display:flex}
}

/* ── SECTION LABELS ── */
.tag{font-family:'Caveat',cursive;font-size:1.1rem;font-weight:600;color:var(--purple);display:block;margin-bottom:0.4rem}
.section-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(2rem,4vw,2.8rem);color:var(--text);line-height:1.1}
.section-title span{color:var(--red)}

/* ── BUTTONS ── */
.btn-red{display:inline-flex;align-items:center;justify-content:center;background:var(--red);color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:0.9rem;letter-spacing:0.04em;padding:0.8rem 2rem;border-radius:999px;border:none;cursor:pointer;transition:background .2s,transform .15s;text-decoration:none}
.btn-red:hover{background:var(--red-dark);transform:translateY(-1px)}
.btn-ghost{display:inline-flex;align-items:center;justify-content:center;background:transparent;color:var(--white);font-family:'Syne',sans-serif;font-weight:700;font-size:0.9rem;letter-spacing:0.04em;padding:0.8rem 2rem;border-radius:999px;border:2px solid rgba(255,255,255,0.7);cursor:pointer;transition:all .2s;text-decoration:none}
.btn-ghost:hover{background:rgba(255,255,255,0.15)}
.btn-purple{display:inline-flex;align-items:center;justify-content:center;background:var(--purple);color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:0.9rem;letter-spacing:0.04em;padding:0.8rem 2rem;border-radius:999px;border:none;cursor:pointer;transition:background .2s;text-decoration:none}
.btn-purple:hover{background:var(--purple-dark)}

/* ── MENU CARDS ── */
.menu-card{background:var(--white);border-radius:12px;padding:1.25rem 1.25rem 1.25rem 1.5rem;border-left:4px solid var(--purple);box-shadow:0 2px 12px rgba(45,26,14,0.07);display:flex;flex-direction:column;gap:0.35rem}
.menu-card.green{border-left-color:var(--green)}
.menu-card.red{border-left-color:var(--red)}
.menu-card.gold{border-left-color:var(--marigold)}
.menu-card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem}
.menu-card-name{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;color:var(--text)}
.menu-card-price{font-family:'Syne',sans-serif;font-weight:800;font-size:1rem;color:var(--red);white-space:nowrap}
.menu-card-desc{font-size:0.88rem;color:var(--muted);line-height:1.5}

/* ── REVIEW CARDS ── */
.review-card{background:rgba(255,255,255,0.12);border-radius:12px;padding:1.5rem;border:1px solid rgba(255,255,255,0.2)}
.review-text{font-size:0.95rem;line-height:1.7;color:rgba(255,255,255,0.92);font-style:italic;margin-bottom:1rem}
.review-stars{color:var(--marigold);font-size:0.85rem;letter-spacing:0.05em;margin-bottom:0.3rem}
.review-author{font-family:'Syne',sans-serif;font-weight:700;font-size:0.8rem;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em}

/* ── FORMS ── */
.form-field{display:flex;flex-direction:column;gap:0.4rem}
.form-label{font-family:'Nunito',sans-serif;font-weight:600;font-size:0.8rem;letter-spacing:0.05em;color:var(--muted);text-transform:uppercase}
.form-input{background:var(--white);border:2px solid rgba(45,26,14,0.15);border-radius:8px;color:var(--text);padding:0.75rem 1rem;font-family:'Nunito',sans-serif;font-size:0.95rem;transition:border-color .2s;width:100%}
.form-input:focus{outline:none;border-color:var(--purple)}
.form-input::placeholder{color:var(--muted);opacity:0.7}
select.form-input option{background:#fff}

/* ── BADGE ── */
.owner-badge{display:inline-flex;align-items:center;gap:0.4rem;background:var(--marigold);color:var(--text);font-family:'Caveat',cursive;font-weight:600;font-size:0.95rem;padding:0.35rem 0.85rem;border-radius:999px}

/* ── FOOTER ── */
.footer{background:#2D1A0E;color:rgba(255,255,255,0.8);padding:3.5rem 2rem 2rem}
.footer-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2.5rem;max-width:860px;margin:0 auto}
.footer-brand-name{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;margin-bottom:0.5rem}
.footer-brand-name .b1{color:var(--purple)}
.footer-brand-name .b2{color:var(--red)}
.footer-heading{font-family:'Caveat',cursive;font-size:1rem;font-weight:600;color:var(--marigold);margin-bottom:0.75rem}
.footer-text{font-size:0.88rem;line-height:1.9;color:rgba(255,255,255,0.65)}
.footer-text a{color:rgba(255,255,255,0.8);transition:color .2s}
.footer-text a:hover{color:var(--marigold)}
.footer-bottom{text-align:center;font-size:0.75rem;color:rgba(255,255,255,0.3);margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.08)}
@media(max-width:640px){.footer-grid{grid-template-columns:1fr}.footer{padding:2.5rem 1.25rem 1.5rem}}
</style>
</head>
<body>`;
}

function nav(baseUrl: string, biz: BizPageData): string {
  return `
<nav class="nav" id="nav">
  <a href="${baseUrl}" class="nav-brand"><span class="b1">${esc(biz.name.split(' ')[0])}</span>'s <span class="b2">Cocina</span></a>
  <button class="nav-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
  <div class="nav-links">
    <a href="${baseUrl}/services">Menú</a>
    <a href="${baseUrl}/gallery">Fotos</a>
    <a href="${baseUrl}/about">Nuestra Historia</a>
    <a href="${baseUrl}/booking" class="nav-cta">Reservar Mesa</a>
  </div>
</nav>
<script>
window.addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('scrolled',window.scrollY>30);
});
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>{
  document.querySelector('.nav-links').classList.remove('open');
}));
</script>`;
}

function footerHtml(biz: BizPageData): string {
  const hours = biz.hours.split('\n').map(l => `<div>${esc(l)}</div>`).join('');
  const firstName = biz.name.split(' ')[0];
  return `
<footer class="footer">
  <div class="footer-grid">
    <div>
      <div class="footer-brand-name"><span class="b1">${esc(firstName)}</span>'s <span class="b2">Cocina</span></div>
      <p style="font-size:0.88rem;color:rgba(255,255,255,0.5);margin-top:0.3rem">Cocina Mexicana Auténtica</p>
    </div>
    <div>
      <div class="footer-heading">Horario</div>
      <div class="footer-text">${hours}</div>
    </div>
    <div>
      <div class="footer-heading">Encuéntranos</div>
      <div class="footer-text">
        ${biz.address ? `<div>${esc(biz.address)}</div>` : ''}
        ${biz.phone ? `<div style="margin-top:0.5rem"><a href="tel:${biz.phone.replace(/\D/g,'')}">${esc(biz.phone)}</a></div>` : ''}
      </div>
    </div>
  </div>
  <div class="footer-bottom">&copy; ${new Date().getFullYear()} ${esc(biz.name)} &mdash; Hecho con ❤️ en ${esc(biz.city || 'Georgia')}</div>
</footer>`;
}

// ── HOME PAGE ────────────────────────────────────────────────────────────────

function buildCocinaHome(biz: BizPageData, baseUrl: string): string {
  const services = biz.services || [];
  const reviews = biz.reviewTexts || [];

  const cardColors = ['', 'green', 'red', 'gold'];
  const menuGrid = services.slice(0, 4).map((s, i) => `
    <div class="menu-card ${cardColors[i % 4]}">
      <div class="menu-card-header">
        <span class="menu-card-name">${esc(s.name)}</span>
        <span class="menu-card-price">${esc(s.price || '')}</span>
      </div>
      <p class="menu-card-desc">${esc(s.desc)}</p>
    </div>`).join('');

  const galleryPhotos = biz.photos.slice(1, 7).map(url =>
    `<img src="${url}" alt="${esc(biz.name)}" loading="lazy" style="height:240px;width:320px;object-fit:cover;border-radius:12px;flex-shrink:0">`
  ).join('');

  const reviewCards = reviews.slice(0, 2).map(r => `
    <div class="review-card">
      <div class="review-stars">★★★★★</div>
      <p class="review-text">"${esc(r)}"</p>
      <div class="review-author">Google Review</div>
    </div>`).join('');

  const hoursLines = biz.hours.split('\n').map(l => `<span>${esc(l)}</span>`).join(' &nbsp;·&nbsp; ');

  return `${htmlHead(`${biz.name} | ${biz.city}, ${biz.state}`, biz.heroSub)}
${nav(baseUrl, biz)}

<!-- HERO: Split — photo left / purple panel right -->
<section style="display:grid;grid-template-columns:60% 40%;min-height:100vh;padding-top:68px">
  <div style="overflow:hidden;min-height:500px">
    <img src="${p(0, biz)}" alt="${esc(biz.name)} interior" style="width:100%;height:100%;object-fit:cover;filter:brightness(1.05) saturate(1.1)">
  </div>
  <div style="background:var(--purple);display:flex;flex-direction:column;justify-content:center;padding:3.5rem 3rem;min-height:500px">
    <span style="font-family:'Caveat',cursive;font-size:1.1rem;color:rgba(255,255,255,0.75);margin-bottom:1.2rem">★ ${biz.rating ? biz.rating.toFixed(1) : '4.9'} · ${biz.reviews || 18} Reseñas en Google</span>
    <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(2rem,3.5vw,3rem);color:#fff;line-height:1.1;margin-bottom:1rem">${esc(biz.heroHeadline)}<br><span style="color:var(--marigold)">${esc(biz.heroHeadlineEm)}</span></h1>
    <p style="font-size:1rem;color:rgba(255,255,255,0.8);margin-bottom:2rem;line-height:1.7">${esc(biz.heroSub)}</p>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
      <a href="${baseUrl}/services" class="btn-red">Ver el Menú</a>
      <a href="${baseUrl}/booking" class="btn-ghost">Reservar Mesa</a>
    </div>
    <div style="margin-top:2.5rem;display:flex;flex-wrap:wrap;gap:0.5rem">
      <span class="owner-badge">👩 Dueña Mujer</span>
      <span class="owner-badge">🌮 Cocina Latina</span>
    </div>
  </div>
</section>
<style>
@media(max-width:640px){
  section[style*="grid-template-columns:60% 40%"]{grid-template-columns:1fr;min-height:auto}
  section[style*="grid-template-columns:60% 40%"] > div:first-child{min-height:260px}
}
</style>

<!-- Papel Picado strip -->
${papelPicado(70)}

<!-- Hours strip -->
<div style="background:var(--red);padding:0.9rem 1.5rem;text-align:center;font-family:'Nunito',sans-serif;font-weight:600;font-size:0.85rem;color:#fff;letter-spacing:0.03em">
  🕐 ${hoursLines}
  ${biz.phone ? `&nbsp;·&nbsp; <a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:#fff;text-decoration:underline">${esc(biz.phone)}</a>` : ''}
</div>

<!-- La Cocina / About section -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center">
    <div>
      <span class="tag">Nuestra Historia</span>
      <h2 class="section-title" style="margin-bottom:1.25rem">${esc(biz.aboutText)}</h2>
      <p style="color:var(--muted);margin-bottom:1rem;font-size:1rem">${esc(biz.aboutText2)}</p>
      <p style="color:var(--muted);font-size:0.95rem">Every dish is made from scratch. Every recipe carries memory. This is a kitchen run with love, for family and neighbours.</p>
      <div style="margin-top:1.75rem;display:flex;gap:0.5rem;flex-wrap:wrap">
        <span class="owner-badge">👩 Women-Owned</span>
        <span class="owner-badge">🌮 Latino-Owned</span>
        <span class="owner-badge">📍 ${esc(biz.city || 'Tifton')}'s Own</span>
      </div>
    </div>
    <div style="position:relative">
      <img src="${p(1, biz)}" alt="La Cocina" style="width:100%;height:340px;object-fit:cover;border-radius:16px;box-shadow:0 12px 40px rgba(123,45,139,0.2)">
      <div style="position:absolute;bottom:-14px;right:-14px;background:var(--purple);color:#fff;font-family:'Caveat',cursive;font-size:1rem;padding:0.6rem 1rem;border-radius:8px">Hecho con amor 💜</div>
    </div>
  </div>
  <style>@media(max-width:640px){section[style*="5rem 2rem"] div[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr}}</style>
</section>

<!-- Menu Preview -->
<section style="background:var(--cream-alt);padding:5rem 2rem">
  <div style="max-width:900px;margin:0 auto">
    <span class="tag">Lo Que Servimos</span>
    <h2 class="section-title" style="margin-bottom:0.5rem">El <span>Menú</span></h2>
    <p style="color:var(--muted);margin-bottom:2.5rem">Tortillas hechas a mano · Carnes de lenta cocción · Salsas de la casa</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      ${menuGrid}
    </div>
    <div style="text-align:center;margin-top:2rem">
      <a href="${baseUrl}/services" class="btn-purple">Ver Menú Completo</a>
    </div>
  </div>
  <style>@media(max-width:560px){section[style*="cream-alt"] div[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr}}</style>
</section>

<!-- Gallery strip -->
<section style="background:var(--cream);padding:4rem 0">
  <div style="padding:0 2rem;margin-bottom:1.5rem">
    <span class="tag">Galería</span>
    <h2 class="section-title">La <span>Comida</span></h2>
  </div>
  <div style="display:flex;gap:1rem;overflow-x:auto;padding:0 2rem;scrollbar-width:none">
    ${galleryPhotos}
  </div>
</section>

<!-- Reviews — purple section -->
<section style="background:var(--purple);padding:5rem 2rem">
  <div style="max-width:800px;margin:0 auto">
    <span style="font-family:'Caveat',cursive;font-size:1.1rem;font-weight:600;color:var(--marigold)">Lo Que Dicen</span>
    <h2 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.8rem,3vw,2.4rem);color:#fff;margin:0.3rem 0 2.5rem">Nuestros Clientes</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem">
      ${reviewCards}
    </div>
    <style>@media(max-width:560px){section[style*="var(--purple)"] div[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr}}</style>
    <div style="text-align:center;margin-top:2.5rem">
      <span style="font-family:'Caveat',cursive;font-size:1.1rem;color:rgba(255,255,255,0.7)">★ ${biz.rating ? biz.rating.toFixed(1) : '4.9'} en Google · ${biz.reviews || 18} Reseñas</span>
    </div>
  </div>
</section>

<!-- Find Us — green section -->
<section style="background:var(--green);padding:4rem 2rem;text-align:center">
  <span style="font-family:'Caveat',cursive;font-size:1.1rem;font-weight:600;color:rgba(255,255,255,0.85)">Ven a Visitarnos</span>
  <h2 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.8rem,3vw,2.4rem);color:#fff;margin:0.4rem 0 1rem">¿Dónde Estamos?</h2>
  ${biz.address ? `<p style="color:rgba(255,255,255,0.85);font-size:1rem;margin-bottom:0.5rem">${esc(biz.address)}</p>` : ''}
  ${biz.phone ? `<p style="margin-bottom:1.75rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:1.2rem">${esc(biz.phone)}</a></p>` : ''}
  <a href="${baseUrl}/booking" class="btn-red">Reservar Mesa</a>
</section>

${papelPicado(70)}

${footerHtml(biz)}
</body></html>`;
}

// ── MENU PAGE ────────────────────────────────────────────────────────────────

function buildCocinaMenu(biz: BizPageData, baseUrl: string): string {
  const services = biz.services || [];

  // Split into categories
  const sides = services.filter(s => !s.price || s.price.toLowerCase() === 'side' || /\bside\b/i.test(s.price));
  const drinks = services.filter(s => /agua|bebida|drink|horchata|jugos|soda/i.test(s.name + ' ' + s.desc));
  const desserts = services.filter(s => /flan|churro|dessert|postre|cake|pastel|dulce/i.test(s.name + ' ' + s.desc));
  const mains = services.filter(s => !sides.includes(s) && !drinks.includes(s) && !desserts.includes(s));

  const cardColors = ['', 'green', 'red', 'gold', '', 'green', 'red', 'gold'];
  function renderCategory(title: string, items: typeof services, offset = 0): string {
    if (!items.length) return '';
    return `
    <div style="margin-bottom:3rem">
      <h3 style="font-family:'Syne',sans-serif;font-weight:800;font-size:1rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--purple);border-bottom:2px solid var(--marigold);padding-bottom:0.6rem;margin-bottom:1.5rem;display:inline-block">${esc(title)}</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.85rem">
        ${items.map((s, i) => `
        <div class="menu-card ${cardColors[(i + offset) % cardColors.length]}">
          <div class="menu-card-header">
            <span class="menu-card-name">${esc(s.name)}</span>
            ${s.price && s.price.toLowerCase() !== 'side' ? `<span class="menu-card-price">${esc(s.price)}</span>` : ''}
          </div>
          <p class="menu-card-desc">${esc(s.desc)}</p>
        </div>`).join('')}
      </div>
    </div>`;
  }

  return `${htmlHead(`Menú — ${biz.name}`, `Menú completo de ${biz.name} en ${biz.city}`)}
${nav(baseUrl, biz)}
<style>@media(max-width:560px){div[style*="grid-template-columns:1fr 1fr"]{grid-template-columns:1fr}}</style>

<!-- Header -->
<section style="background:var(--purple);padding:9rem 2rem 4rem;text-align:center">
  <span style="font-family:'Caveat',cursive;font-size:1.2rem;color:var(--marigold)">Tortillas hechas a mano · Salsas de la casa</span>
  <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(2.5rem,6vw,4rem);color:#fff;margin:0.5rem 0 0.75rem">El Menú</h1>
  <p style="color:rgba(255,255,255,0.75);font-size:1rem">${esc(biz.city || 'Tifton')}, ${esc(biz.state || 'GA')} &nbsp;·&nbsp; ${esc(biz.phone || '')}</p>
</section>
${papelPicado(70)}

<!-- Menu content -->
<section style="background:var(--cream);padding:4rem 2rem 6rem">
  <div style="max-width:780px;margin:0 auto">
    ${renderCategory('Antojitos & Platos Principales', mains, 0)}
    ${renderCategory('Acompañamientos', sides, 2)}
    ${renderCategory('Bebidas', drinks, 1)}
    ${renderCategory('Postres', desserts, 3)}
    <div style="border-top:2px dashed rgba(123,45,139,0.2);padding-top:2rem;text-align:center">
      <p style="font-family:'Caveat',cursive;font-size:1.1rem;color:var(--muted);margin-bottom:1.5rem">Precios y disponibilidad pueden variar. ¡Pregúntanos por los especiales del día!</p>
      <a href="${baseUrl}/booking" class="btn-red">Reservar Mesa</a>
    </div>
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── GALLERY PAGE ─────────────────────────────────────────────────────────────

function buildCocinaGallery(biz: BizPageData, baseUrl: string): string {
  const photos = biz.photos.filter(Boolean);
  const grid = photos.map((url, i) =>
    `<div style="overflow:hidden;border-radius:12px;${i === 0 ? 'grid-column:span 2;' : ''}">
      <img src="${url}" alt="${esc(biz.name)} ${i + 1}" loading="${i < 4 ? 'eager' : 'lazy'}" style="width:100%;height:${i === 0 ? '380px' : '220px'};object-fit:cover;display:block;transition:transform .4s">
    </div>`
  ).join('');

  return `${htmlHead(`Fotos — ${biz.name}`, `Galería de fotos de ${biz.name}`)}
${nav(baseUrl, biz)}

<!-- Header -->
<section style="background:var(--green);padding:9rem 2rem 4rem;text-align:center">
  <span style="font-family:'Caveat',cursive;font-size:1.2rem;color:rgba(255,255,255,0.85)">Bienvenidos</span>
  <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(2.2rem,5vw,3.5rem);color:#fff;margin-top:0.5rem">La Cocina en Fotos</h1>
</section>
${papelPicado(70)}

<!-- Gallery grid -->
<section style="background:var(--cream);padding:3rem 2rem 5rem">
  <div style="max-width:960px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
    ${grid}
  </div>
  <style>@media(max-width:640px){section[style*="960px"] div[style*="grid-template-columns:1fr 1fr 1fr"]{grid-template-columns:1fr 1fr}div[style*="grid-column:span 2"]{grid-column:span 2}}</style>
</section>

<section style="background:var(--purple);padding:3rem 2rem;text-align:center">
  <a href="${baseUrl}/services" class="btn-red" style="margin-right:1rem">Ver el Menú</a>
  <a href="${baseUrl}/booking" class="btn-ghost">Reservar Mesa</a>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── ABOUT PAGE ───────────────────────────────────────────────────────────────

function buildCocinaAbout(biz: BizPageData, baseUrl: string): string {
  return `${htmlHead(`Nuestra Historia — ${biz.name}`, `Conoce la historia de ${biz.name}`)}
${nav(baseUrl, biz)}

<!-- Header with photo -->
<section style="position:relative;min-height:55vh;display:flex;align-items:flex-end;overflow:hidden;padding-top:68px">
  <img src="${p(2, biz)}" alt="${esc(biz.name)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:saturate(1.1)">
  <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(254,249,240,0.97) 0%,rgba(254,249,240,0.2) 60%)"></div>
  <div style="position:relative;padding:3rem 3rem;width:100%">
    <span style="font-family:'Caveat',cursive;font-size:1.2rem;color:var(--purple)">Nuestra Historia</span>
    <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(2rem,5vw,3.5rem);color:var(--text);line-height:1.1;max-width:600px">${esc(biz.aboutText)}</h1>
  </div>
</section>

<!-- Story body -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:680px;margin:0 auto">
    <p style="font-size:1.1rem;line-height:1.85;color:var(--text);margin-bottom:1.75rem">${esc(biz.aboutText2)}</p>
    <p style="font-size:1rem;color:var(--muted);line-height:1.8;margin-bottom:2rem">Every dish that comes out of this kitchen carries the warmth of a family tradition. No shortcuts, no compromises — just real ingredients cooked with care for the people of ${esc(biz.city || 'Tifton')}. That's what a cocina is for.</p>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:2.5rem">
      <span class="owner-badge">👩 Women-Owned</span>
      <span class="owner-badge">🌮 Latino-Owned</span>
      <span class="owner-badge">📍 ${esc(biz.city || 'Tifton')}'s Own</span>
    </div>
    <a href="${baseUrl}/services" class="btn-red">Ver el Menú</a>
  </div>
</section>

<!-- Numbers strip -->
<section style="background:var(--purple);padding:3.5rem 2rem">
  <div style="max-width:760px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;text-align:center">
    <div>
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:2.8rem;color:var(--marigold)">${biz.rating ? biz.rating.toFixed(1) : '4.9'}★</div>
      <div style="font-family:'Nunito',sans-serif;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-top:0.3rem">Google Rating</div>
    </div>
    <div>
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:2.8rem;color:var(--marigold)">${biz.reviews || 18}</div>
      <div style="font-family:'Nunito',sans-serif;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-top:0.3rem">Happy Guests</div>
    </div>
    <div>
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:2.8rem;color:var(--marigold)">100%</div>
      <div style="font-family:'Nunito',sans-serif;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-top:0.3rem">Hecho en Casa</div>
    </div>
  </div>
  <style>@media(max-width:480px){section[style*="var(--purple)"] div[style*="repeat(3,1fr)"]{grid-template-columns:1fr}}</style>
</section>

<section style="background:var(--green);padding:3rem 2rem;text-align:center">
  <a href="${baseUrl}/booking" class="btn-red">Reservar Mesa</a>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── BOOKING PAGE ─────────────────────────────────────────────────────────────

function buildCocinaBooking(biz: BizPageData, baseUrl: string): string {
  return `${htmlHead(`Reservar — ${biz.name}`, `Reserva tu mesa en ${biz.name}`)}
${nav(baseUrl, biz)}

<!-- Header -->
<section style="background:var(--purple);padding:9rem 2rem 4rem;text-align:center">
  <span style="font-family:'Caveat',cursive;font-size:1.2rem;color:var(--marigold)">¡Cuéntanos cuándo vienes!</span>
  <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(2rem,5vw,3rem);color:#fff;margin-top:0.5rem">Reservar Mesa</h1>
</section>
${papelPicado(70)}

<!-- Form -->
<section style="background:var(--cream);padding:4rem 2rem 6rem">
  <div style="max-width:520px;margin:0 auto">
    <div id="booking-form">
      <div class="form-field" style="margin-bottom:1.25rem">
        <label class="form-label">¿Cuántas Personas?</label>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-top:0.4rem" id="party-grid">
          ${['1','2','3','4','5','6','7','8+'].map(n =>
            `<button class="party-btn" onclick="selectParty(this,'${n}')" style="background:var(--white);border:2px solid rgba(45,26,14,0.15);border-radius:8px;padding:0.75rem;font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;color:var(--text);transition:all .15s">${n}</button>`
          ).join('')}
        </div>
        <input type="hidden" id="party-val" value="">
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem">
        <div class="form-field">
          <label class="form-label">Fecha</label>
          <input type="date" id="res-date" class="form-input" min="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-field">
          <label class="form-label">Hora</label>
          <select id="res-time" class="form-input">
            <option value="">Elige una hora</option>
            <optgroup label="Comida">
              <option>11:30 AM</option><option>12:00 PM</option><option>12:30 PM</option><option>1:00 PM</option><option>1:30 PM</option>
            </optgroup>
            <optgroup label="Cena">
              <option>5:30 PM</option><option>6:00 PM</option><option>6:30 PM</option><option>7:00 PM</option><option>7:30 PM</option><option>8:00 PM</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem">
        <div class="form-field">
          <label class="form-label">Tu Nombre</label>
          <input type="text" id="res-name" class="form-input" placeholder="Nombre y apellido">
        </div>
        <div class="form-field">
          <label class="form-label">Teléfono</label>
          <input type="tel" id="res-phone" class="form-input" placeholder="Tu número">
        </div>
      </div>

      <div class="form-field" style="margin-bottom:1.75rem">
        <label class="form-label">Notas Especiales</label>
        <textarea id="res-notes" class="form-input" rows="3" placeholder="Alergias, celebraciones, preferencias de asiento..."></textarea>
      </div>

      <button class="btn-red" style="width:100%;font-size:1rem;padding:1rem;border-radius:12px" onclick="submitBooking()">Confirmar Reserva 🌮</button>
    </div>

    <!-- Success -->
    <div id="booking-success" style="display:none;text-align:center;padding:4rem 1rem">
      <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
      <h2 style="font-family:'Syne',sans-serif;font-weight:800;font-size:2rem;color:var(--purple);margin-bottom:0.75rem">¡Reserva Solicitada!</h2>
      <p style="color:var(--muted);margin-bottom:0.5rem">Te llamaremos para confirmar tu reserva en <strong>${esc(biz.name)}</strong>.</p>
      ${biz.phone ? `<p style="margin-top:1.5rem;font-family:'Syne',sans-serif;font-size:1.2rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:var(--red)">${esc(biz.phone)}</a></p>` : ''}
      ${biz.address ? `<p style="margin-top:0.4rem;font-size:0.9rem;color:var(--muted)">${esc(biz.address)}</p>` : ''}
    </div>
  </div>
</section>

<!-- Hours -->
<section style="background:var(--cream-alt);padding:3rem 2rem">
  <div style="max-width:400px;margin:0 auto;text-align:center">
    <span style="font-family:'Caveat',cursive;font-size:1.1rem;color:var(--purple)">Horario</span>
    <div style="margin-top:0.5rem;font-size:0.9rem;color:var(--muted);line-height:2">${biz.hours.split('\n').map(l => `<div>${esc(l)}</div>`).join('')}</div>
  </div>
</section>

${papelPicado(70)}
${footerHtml(biz)}

<script>
function selectParty(el, val) {
  document.querySelectorAll('.party-btn').forEach(b => {
    b.style.background='var(--white)'; b.style.borderColor='rgba(45,26,14,0.15)'; b.style.color='var(--text)';
  });
  el.style.background='var(--purple)'; el.style.borderColor='var(--purple)'; el.style.color='#fff';
  document.getElementById('party-val').value = val;
}
function submitBooking() {
  const party = document.getElementById('party-val').value;
  const date  = document.getElementById('res-date').value;
  const time  = document.getElementById('res-time').value;
  const name  = document.getElementById('res-name').value.trim();
  const phone = document.getElementById('res-phone').value.trim();
  if (!party) { alert('¿Cuántas personas serán?'); return; }
  if (!date)  { alert('Por favor selecciona una fecha.'); return; }
  if (!time)  { alert('Por favor selecciona una hora.'); return; }
  if (!name)  { alert('Por favor ingresa tu nombre.'); return; }
  if (!phone) { alert('Por favor ingresa tu número de teléfono.'); return; }
  document.getElementById('booking-form').style.display = 'none';
  document.getElementById('booking-success').style.display = 'block';
}
</script>
</body></html>`;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export function buildCocinaAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:     buildCocinaHome(biz, baseUrl),
    services: buildCocinaMenu(biz, baseUrl),
    gallery:  buildCocinaGallery(biz, baseUrl),
    about:    buildCocinaAbout(biz, baseUrl),
    booking:  buildCocinaBooking(biz, baseUrl),
  };
}
