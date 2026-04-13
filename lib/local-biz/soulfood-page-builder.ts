/**
 * Southern Soul Food page builder — for neighbourhood diners, sandwich shops, soul food joints.
 * Built specifically for Shirley's Soul Food 5th Street Sandwich Shop, Moultrie GA.
 *
 * Design identity (completely distinct from all other builders):
 *   - Fonts: Bebas Neue 400 (bold condensed display) + Playfair Display 700i (warm serif) + Lora 400 (body)
 *   - Palette: deep brick red #8C1C13, warm cream #FDF6EE, mustard #C8960C, charcoal #1C1714
 *   - Hero: full-bleed photo with dark overlay — STACKED centred type. NOT split, NOT dark-only.
 *   - Red headline band under hero with business name in huge Bebas Neue
 *   - Diner-style menu: dot leaders from item to price, like a printed menu board
 *   - Giant single pull-quote review — one testimonial as the visual centrepiece
 *   - "Open Until Midnight" late-night badge — this place closes at midnight, lean into it
 *   - Minimal ornament: a thin mustard rule used sparingly as a divider
 *   - Warm, honest, bold — neighbourhood comfort over corporate polish
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function p(idx: number, biz: BizPageData, fallback: string): string {
  return biz.photos[idx] || fallback;
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --red:#8C1C13;
  --red-dark:#5E1209;
  --cream:#FDF6EE;
  --cream-dark:#F0E6D4;
  --mustard:#C8960C;
  --charcoal:#1C1714;
  --charcoal-mid:#2E2420;
  --white:#FFFFFF;
  --font-display:'Bebas Neue',sans-serif;
  --font-serif:'Playfair Display',Georgia,serif;
  --font-body:'Lora',Georgia,serif;
}
body{font-family:var(--font-body);background:var(--cream);color:var(--charcoal);-webkit-font-smoothing:antialiased}
img{display:block;width:100%;object-fit:cover}
a{text-decoration:none;color:inherit}
.btn-red{display:inline-block;background:var(--red);color:#fff;font-family:var(--font-display);font-size:1.05rem;letter-spacing:0.12em;padding:0.85rem 2.2rem;border-radius:2px;transition:background .2s}
.btn-red:hover{background:var(--red-dark)}
.btn-outline{display:inline-block;border:2px solid var(--mustard);color:var(--mustard);font-family:var(--font-display);font-size:1rem;letter-spacing:0.12em;padding:0.75rem 2rem;border-radius:2px;transition:all .2s}
.btn-outline:hover{background:var(--mustard);color:var(--charcoal)}
.rule{display:block;height:2px;background:var(--mustard);border:none;margin:0 auto}
.nav-links{display:flex;align-items:center;gap:1.25rem}
@media(max-width:600px){
  .nav-links .nav-link{display:none}
  #nav{min-height:52px;padding:0 1rem}
  #nav a:first-child{font-size:1rem;max-width:calc(100vw - 130px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
}
</style>
</head>
<body>`;
}

// ── NAV ─────────────────────────────────────────────────────────────────────

function nav(baseUrl: string, biz: BizPageData): string {
  return `
<nav id="nav" style="position:sticky;top:0;z-index:100;background:var(--red-dark);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:0.75rem;min-height:56px">
  <a href="${baseUrl}" style="font-family:var(--font-display);font-size:1.2rem;letter-spacing:0.08em;color:#fff;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(biz.name)}</a>
  <div class="nav-links" style="flex-shrink:0">
    <a href="${baseUrl}/services" class="nav-link" style="color:rgba(255,255,255,0.85);font-family:var(--font-display);letter-spacing:0.1em;font-size:0.9rem">MENU</a>
    <a href="${baseUrl}/about" class="nav-link" style="color:rgba(255,255,255,0.85);font-family:var(--font-display);letter-spacing:0.1em;font-size:0.9rem">OUR STORY</a>
    <a href="${baseUrl}/booking" class="nav-link" style="color:rgba(255,255,255,0.85);font-family:var(--font-display);letter-spacing:0.1em;font-size:0.9rem">FIND US</a>
    ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-red" style="font-size:0.85rem;padding:0.55rem 1.4rem;flex-shrink:0">CALL NOW</a>` : ''}
  </div>
</nav>`;
}

// ── FOOTER ───────────────────────────────────────────────────────────────────

function footerHtml(biz: BizPageData): string {
  const hoursLines = (biz.hours || '').split('\n').filter(Boolean);
  return `
<footer style="background:var(--charcoal);color:rgba(255,255,255,0.75);padding:3.5rem 2rem 2rem">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2.5rem">
    <div>
      <p style="font-family:var(--font-display);font-size:1.3rem;letter-spacing:0.1em;color:#fff;margin-bottom:0.75rem">${esc(biz.name)}</p>
      ${biz.address ? `<p style="font-size:0.9rem;line-height:1.7">${esc(biz.address)}</p>` : ''}
      ${biz.phone ? `<p style="margin-top:0.5rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:var(--mustard);font-family:var(--font-display);letter-spacing:0.08em;font-size:1rem">${esc(biz.phone)}</a></p>` : ''}
    </div>
    <div>
      <p style="font-family:var(--font-display);font-size:1rem;letter-spacing:0.1em;color:var(--mustard);margin-bottom:0.75rem">HOURS</p>
      ${hoursLines.map(l => `<p style="font-size:0.9rem;line-height:1.9">${esc(l)}</p>`).join('')}
    </div>
  </div>
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:2rem auto;max-width:900px">
  <p style="text-align:center;font-size:0.8rem;color:rgba(255,255,255,0.4)">© ${new Date().getFullYear()} ${esc(biz.name)} · Moultrie, GA</p>
</footer>`;
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────

function buildSoulFoodHome(biz: BizPageData, baseUrl: string): string {
  const photo0 = p(0, biz, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&q=80');
  const photo1 = p(1, biz, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&q=80');
  const photo2 = p(2, biz, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80');
  const photo3 = p(3, biz, 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=1200&q=80');

  const review = biz.reviewTexts?.[0] || "You won't find better food in all of South Georgia. Shirley's is the real deal — honest, delicious, worth every bite.";
  const reviewAuthor = 'John Y. — Local';

  const mainServices = (biz.services || []).slice(0, 3);

  const headline = biz.heroHeadline || 'Moultrie\'s Neighbourhood';
  const headlineEm = biz.heroHeadlineEm || 'Soul Food Kitchen';
  const heroSub = biz.heroSub || 'Counter-service comfort. Open until midnight. Worth every mile.';

  return `${htmlHead(`${biz.name} | ${biz.city}, ${biz.state}`, heroSub)}

${nav(baseUrl, biz)}

<!-- HERO -->
<section style="position:relative;height:clamp(420px,70vh,700px);overflow:hidden">
  <img src="${photo0}" alt="${esc(biz.name)}" style="position:absolute;inset:0;height:100%;object-position:center">
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(28,23,20,0.45) 0%,rgba(28,23,20,0.72) 100%)"></div>
  <div style="position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem 1.5rem">
    ${biz.rating ? `<div style="display:inline-flex;align-items:center;gap:0.4rem;background:var(--mustard);color:var(--charcoal);font-family:var(--font-display);font-size:0.85rem;letter-spacing:0.1em;padding:0.3rem 1rem;border-radius:2px;margin-bottom:1.5rem">★ ${biz.rating} &nbsp;·&nbsp; ${biz.reviews} REVIEWS ON GOOGLE</div>` : ''}
    <h1 style="font-family:var(--font-display);font-size:clamp(3rem,9vw,7rem);letter-spacing:0.04em;color:#fff;line-height:0.95;text-shadow:0 2px 20px rgba(0,0,0,0.4)">
      ${esc(headline)}<br><span style="color:var(--mustard)">${esc(headlineEm)}</span>
    </h1>
    <p style="font-family:var(--font-serif);font-style:italic;color:rgba(255,255,255,0.88);font-size:clamp(1rem,2vw,1.2rem);margin-top:1.25rem;max-width:480px">${esc(heroSub)}</p>
    ${biz.phone ? `<div style="margin-top:2rem;display:flex;gap:1rem;flex-wrap:wrap;justify-content:center">
      <a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-red">CALL TO ORDER</a>
      <a href="${baseUrl}/services" class="btn-outline">VIEW MENU</a>
    </div>` : `<a href="${baseUrl}/services" class="btn-red" style="margin-top:2rem">VIEW MENU</a>`}
  </div>
</section>

<!-- RED IDENTITY BAND -->
<div style="background:var(--red);padding:1.75rem 2rem;text-align:center">
  <p style="font-family:var(--font-display);font-size:clamp(1.4rem,4vw,2.5rem);letter-spacing:0.12em;color:#fff">
    ${esc(biz.name).toUpperCase()}
    <span style="color:var(--mustard);font-size:0.6em;letter-spacing:0.2em;margin-left:1rem">${esc(biz.city)}, ${esc(biz.state)}</span>
  </p>
  <hr class="rule" style="width:60px;margin-top:0.75rem">
</div>

<!-- OPEN LATE BADGE + QUICK STATS -->
<section style="background:var(--charcoal);padding:2rem 1.5rem">
  <div style="max-width:800px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2.5rem;text-align:center">
    <div>
      <p style="font-family:var(--font-display);font-size:2rem;letter-spacing:0.06em;color:var(--mustard)">OPEN LATE</p>
      <p style="font-size:0.85rem;color:rgba(255,255,255,0.6);letter-spacing:0.05em">Closes Midnight Daily</p>
    </div>
    <div style="width:1px;height:40px;background:rgba(255,255,255,0.15)"></div>
    <div>
      <p style="font-family:var(--font-display);font-size:2rem;letter-spacing:0.06em;color:#fff">COUNTER SERVICE</p>
      <p style="font-size:0.85rem;color:rgba(255,255,255,0.6);letter-spacing:0.05em">Walk Up · Order · Eat</p>
    </div>
    <div style="width:1px;height:40px;background:rgba(255,255,255,0.15)"></div>
    <div>
      <p style="font-family:var(--font-display);font-size:2rem;letter-spacing:0.06em;color:#fff">${biz.rating ? `★ ${biz.rating}` : '★ 4.4'}</p>
      <p style="font-size:0.85rem;color:rgba(255,255,255,0.6);letter-spacing:0.05em">${biz.reviews || 40} Google Reviews</p>
    </div>
  </div>
</section>

<!-- SIGNATURE DISHES PREVIEW -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:900px;margin:0 auto">
    <p style="font-family:var(--font-serif);font-style:italic;color:var(--red);text-align:center;font-size:1rem;margin-bottom:0.5rem">Made fresh. Served bold.</p>
    <h2 style="font-family:var(--font-display);font-size:clamp(2rem,5vw,3.5rem);letter-spacing:0.06em;text-align:center;color:var(--charcoal);margin-bottom:0.75rem">WHAT WE SERVE</h2>
    <hr class="rule" style="width:60px;margin-bottom:3.5rem">

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0">
      ${mainServices.map((s, i) => {
        const imgs = [photo1, photo2, photo3];
        return `
      <div style="position:relative;overflow:hidden;aspect-ratio:4/3">
        <img src="${imgs[i]}" alt="${esc(s.name)}" style="height:100%;transition:transform .4s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(28,23,20,0.88) 0%,rgba(28,23,20,0.1) 60%)"></div>
        <div style="position:absolute;bottom:0;left:0;padding:1.5rem">
          <p style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.06em;color:#fff">${esc(s.name)}</p>
          ${s.price ? `<p style="color:var(--mustard);font-family:var(--font-display);font-size:1.1rem;letter-spacing:0.06em;margin-top:0.2rem">${esc(s.price)}</p>` : ''}
        </div>
      </div>`;
      }).join('')}
    </div>

    <div style="text-align:center;margin-top:2.5rem">
      <a href="${baseUrl}/services" class="btn-red">FULL MENU</a>
    </div>
  </div>
</section>

<!-- PULL QUOTE -->
<section style="background:var(--red);padding:5rem 2rem;text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <p style="font-size:3rem;color:var(--mustard);font-family:var(--font-serif);line-height:1;margin-bottom:1rem">"</p>
    <blockquote style="font-family:var(--font-serif);font-style:italic;font-size:clamp(1.25rem,3vw,1.9rem);color:#fff;line-height:1.5;margin-bottom:1.75rem">${esc(review)}</blockquote>
    <p style="font-family:var(--font-display);letter-spacing:0.15em;color:var(--mustard);font-size:0.9rem">${esc(reviewAuthor)}</p>
  </div>
</section>

<!-- ABOUT TEASER -->
<section style="background:var(--cream-dark);padding:5rem 2rem">
  <div style="max-width:800px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center">
    <div>
      <p style="font-family:var(--font-serif);font-style:italic;color:var(--red);font-size:1rem;margin-bottom:0.5rem">A Moultrie institution</p>
      <h2 style="font-family:var(--font-display);font-size:clamp(2rem,4vw,3rem);letter-spacing:0.06em;color:var(--charcoal);margin-bottom:1rem">${esc(biz.aboutText || 'NEIGHBOURHOOD KITCHEN')}</h2>
      <hr class="rule" style="width:50px;margin:0 0 1.25rem">
      <p style="font-size:1rem;line-height:1.8;color:var(--charcoal)">${esc(biz.aboutText2 || "Shirley's has been feeding Moultrie one plate at a time. Simple food done right — burgers stacked high, soul food that tastes like home, and a community that keeps coming back. Counter service only. No fuss. Just good.")}</p>
      <a href="${baseUrl}/about" style="display:inline-block;margin-top:1.5rem;font-family:var(--font-display);letter-spacing:0.12em;color:var(--red);font-size:0.95rem;border-bottom:2px solid var(--mustard);padding-bottom:2px">OUR STORY →</a>
    </div>
    <div style="position:relative">
      <img src="${p(4, biz, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80')}" alt="Soul food" style="border-radius:2px;aspect-ratio:3/4;object-fit:cover">
      ${biz.yearsInBiz ? `<div style="position:absolute;bottom:-1rem;left:-1rem;background:var(--mustard);padding:1rem 1.25rem;text-align:center">
        <p style="font-family:var(--font-display);font-size:2rem;letter-spacing:0.04em;color:var(--charcoal)">${esc(biz.yearsInBiz)}+</p>
        <p style="font-size:0.7rem;letter-spacing:0.1em;color:var(--charcoal);font-family:var(--font-display)">YEARS SERVING</p>
      </div>` : ''}
    </div>
  </div>
</section>

<!-- FIND US CTA -->
<section style="background:var(--charcoal-mid);padding:4rem 2rem;text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(1.8rem,4vw,2.8rem);letter-spacing:0.08em;color:#fff;margin-bottom:0.5rem">COME FIND US</h2>
  ${biz.address ? `<p style="color:rgba(255,255,255,0.7);font-size:1rem;margin-bottom:0.5rem">${esc(biz.address)}</p>` : ''}
  ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:var(--mustard);font-family:var(--font-display);font-size:1.4rem;letter-spacing:0.1em;display:block;margin-bottom:1.75rem">${esc(biz.phone)}</a>` : ''}
  <a href="${baseUrl}/booking" class="btn-red">HOURS & DIRECTIONS</a>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── MENU PAGE ─────────────────────────────────────────────────────────────────

function buildSoulFoodMenu(biz: BizPageData, baseUrl: string): string {
  const services = biz.services || [];

  // Split into logical categories
  const burgers = services.filter(s => /burger|sandwich|torta|sub|hoagie|wrap/i.test(s.name + ' ' + s.desc));
  const plates = services.filter(s => /plate|platter|fried|chicken|fish|catfish|soul|combo|special|dinner/i.test(s.name + ' ' + s.desc));
  const sides = services.filter(s => /side|greens|mac|beans|cornbread|rice|fries|slaw|salad|yam|potato/i.test(s.name + ' ' + s.desc));
  const drinks = services.filter(s => /drink|tea|lemonade|water|soda|juice|punch/i.test(s.name + ' ' + s.desc));
  const other = services.filter(s => !burgers.includes(s) && !plates.includes(s) && !sides.includes(s) && !drinks.includes(s));

  // If no categorisation worked, just show all as "Our Menu"
  const categories: { title: string; items: typeof services }[] = [];
  if (burgers.length) categories.push({ title: 'Burgers & Sandwiches', items: burgers });
  if (plates.length) categories.push({ title: 'Soul Food Plates', items: plates });
  if (other.length) categories.push({ title: 'Mains', items: other });
  if (sides.length) categories.push({ title: 'Sides', items: sides });
  if (drinks.length) categories.push({ title: 'Drinks', items: drinks });
  if (!categories.length && services.length) categories.push({ title: 'Our Menu', items: services });

  function menuItem(s: typeof services[0]): string {
    return `
    <div style="display:flex;align-items:baseline;gap:0.5rem;padding:0.9rem 0;border-bottom:1px solid var(--cream-dark)">
      <div style="flex:1;min-width:0">
        <p style="font-family:var(--font-display);font-size:1.15rem;letter-spacing:0.05em;color:var(--charcoal)">${esc(s.name)}</p>
        ${s.desc ? `<p style="font-size:0.88rem;color:#6B5A4E;line-height:1.6;margin-top:0.2rem;font-style:italic">${esc(s.desc)}</p>` : ''}
      </div>
      ${s.price ? `<p style="flex-shrink:0;font-family:var(--font-display);font-size:1.1rem;letter-spacing:0.05em;color:var(--red);white-space:nowrap">${esc(s.price)}</p>` : ''}
    </div>`;
  }

  return `${htmlHead(`Menu — ${biz.name}`, `Full menu for ${biz.name}, ${biz.city} ${biz.state}`)}
${nav(baseUrl, biz)}

<!-- MENU HERO BAND -->
<div style="background:var(--red);padding:4rem 2rem 3rem;text-align:center">
  <p style="font-family:var(--font-serif);font-style:italic;color:rgba(255,255,255,0.7);margin-bottom:0.5rem">Everything made to order</p>
  <h1 style="font-family:var(--font-display);font-size:clamp(3rem,8vw,6rem);letter-spacing:0.06em;color:#fff">OUR MENU</h1>
  <hr class="rule" style="width:60px;margin-top:1rem">
  ${biz.phone ? `<p style="color:rgba(255,255,255,0.8);margin-top:1.25rem;font-size:0.95rem">Call to order: <a href="tel:${biz.phone.replace(/\D/g,'')}" style="color:var(--mustard);font-family:var(--font-display);letter-spacing:0.06em">${esc(biz.phone)}</a></p>` : ''}
</div>

<!-- MENU CONTENT -->
<section style="background:var(--cream);padding:4rem 2rem">
  <div style="max-width:700px;margin:0 auto">
    ${categories.map(cat => `
    <div style="margin-bottom:3.5rem">
      <h2 style="font-family:var(--font-display);font-size:1.6rem;letter-spacing:0.12em;color:var(--red);margin-bottom:0.25rem">${esc(cat.title.toUpperCase())}</h2>
      <hr class="rule" style="width:40px;margin:0 0 0">
      ${cat.items.map(menuItem).join('')}
    </div>`).join('')}

    <div style="background:var(--charcoal);border-radius:2px;padding:2rem;text-align:center;margin-top:2rem">
      <p style="font-family:var(--font-serif);font-style:italic;color:rgba(255,255,255,0.8);margin-bottom:0.75rem">Menu prices and availability may vary. Call us to confirm.</p>
      ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-red">${esc(biz.phone)}</a>` : ''}
    </div>
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── GALLERY PAGE ──────────────────────────────────────────────────────────────

function buildSoulFoodGallery(biz: BizPageData, baseUrl: string): string {
  const fallbacks = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80',
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=1200&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
    'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=1200&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80',
    'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=1200&q=80',
    'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=1200&q=80',
    'https://images.unsplash.com/photo-1562802378-063ec186a863?w=1200&q=80',
  ];
  const photos = Array.from({ length: 8 }, (_, i) => p(i, biz, fallbacks[i]));

  return `${htmlHead(`Gallery — ${biz.name}`, `Photos from ${biz.name} in ${biz.city}, ${biz.state}`)}
${nav(baseUrl, biz)}

<div style="background:var(--red);padding:4rem 2rem 3rem;text-align:center">
  <h1 style="font-family:var(--font-display);font-size:clamp(3rem,8vw,5.5rem);letter-spacing:0.06em;color:#fff">GALLERY</h1>
  <hr class="rule" style="width:60px;margin-top:1rem">
</div>

<section style="background:var(--cream);padding:3rem 2rem">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem">
    ${photos.map((ph, i) => `<div style="overflow:hidden;border-radius:2px;aspect-ratio:${i === 0 ? '16/9' : '4/3'}${i === 0 ? ';grid-column:1/-1' : ''}">
      <img src="${ph}" alt="${esc(biz.name)} photo ${i + 1}" style="height:100%;object-position:center;transition:transform .4s" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
    </div>`).join('\n    ')}
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── ABOUT PAGE ────────────────────────────────────────────────────────────────

function buildSoulFoodAbout(biz: BizPageData, baseUrl: string): string {
  const reviews = biz.reviewTexts || [];

  return `${htmlHead(`Our Story — ${biz.name}`, `The story behind ${biz.name} in ${biz.city}, ${biz.state}`)}
${nav(baseUrl, biz)}

<!-- ABOUT HERO -->
<div style="background:var(--charcoal);padding:5rem 2rem;text-align:center">
  <p style="font-family:var(--font-serif);font-style:italic;color:var(--mustard);margin-bottom:0.75rem">The real ${esc(biz.city)} institution</p>
  <h1 style="font-family:var(--font-display);font-size:clamp(2.5rem,7vw,5.5rem);letter-spacing:0.06em;color:#fff">${esc(biz.aboutText || 'OUR STORY')}</h1>
</div>

<!-- STORY -->
<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:760px;margin:0 auto">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:start">
      <div>
        <p style="font-family:var(--font-serif);font-style:italic;color:var(--red);margin-bottom:0.5rem;font-size:1rem">About Us</p>
        <h2 style="font-family:var(--font-display);font-size:2rem;letter-spacing:0.06em;color:var(--charcoal);margin-bottom:1rem">WHY WE COOK</h2>
        <hr class="rule" style="width:40px;margin:0 0 1.5rem">
        <p style="font-size:1.05rem;line-height:1.9;color:var(--charcoal)">${esc(biz.aboutText2 || "We've been feeding Moultrie one plate at a time. Simple, honest food — the kind that reminds you of your grandmother's kitchen. Burgers stacked high, soul food plates that fill you up, and a community that keeps coming back generation after generation.")}</p>
      </div>
      <div>
        <img src="${p(5, biz, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80')}" alt="${esc(biz.name)}" style="aspect-ratio:3/4;object-fit:cover;border-radius:2px">
      </div>
    </div>
  </div>
</section>

<!-- REVIEWS -->
<section style="background:var(--red);padding:5rem 2rem">
  <div style="max-width:800px;margin:0 auto">
    <h2 style="font-family:var(--font-display);font-size:clamp(2rem,5vw,3.5rem);letter-spacing:0.08em;color:#fff;text-align:center;margin-bottom:3rem">WHAT PEOPLE SAY</h2>
    <div style="display:grid;gap:1.5rem">
      ${reviews.map(r => `
      <div style="background:rgba(255,255,255,0.1);border-left:3px solid var(--mustard);padding:1.5rem 1.75rem;border-radius:0 2px 2px 0">
        <p style="font-family:var(--font-serif);font-style:italic;color:#fff;font-size:1.05rem;line-height:1.7">"${esc(r)}"</p>
      </div>`).join('')}
    </div>
  </div>
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── BOOKING/FIND US PAGE ──────────────────────────────────────────────────────

function buildSoulFoodBooking(biz: BizPageData, baseUrl: string): string {
  const hoursLines = (biz.hours || '').split('\n').filter(Boolean);

  return `${htmlHead(`Find Us — ${biz.name}`, `Hours, location and contact for ${biz.name} in ${biz.city}, ${biz.state}`)}
${nav(baseUrl, biz)}

<div style="background:var(--red);padding:4rem 2rem 3rem;text-align:center">
  <h1 style="font-family:var(--font-display);font-size:clamp(3rem,8vw,5.5rem);letter-spacing:0.06em;color:#fff">FIND US</h1>
  <hr class="rule" style="width:60px;margin-top:1rem">
</div>

<section style="background:var(--cream);padding:5rem 2rem">
  <div style="max-width:800px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:3rem">
    <div>
      <h2 style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.1em;color:var(--red);margin-bottom:1.25rem">LOCATION</h2>
      ${biz.address ? `<p style="font-size:1.05rem;line-height:1.8;margin-bottom:1rem">${esc(biz.address)}</p>` : ''}
      ${biz.phone ? `<p style="margin-bottom:1.5rem"><a href="tel:${biz.phone.replace(/\D/g,'')}" style="font-family:var(--font-display);font-size:1.4rem;letter-spacing:0.08em;color:var(--red)">${esc(biz.phone)}</a></p>` : ''}
      ${biz.address ? `<a href="https://maps.google.com/?q=${encodeURIComponent(biz.address)}" target="_blank" class="btn-red">GET DIRECTIONS</a>` : ''}
    </div>
    <div>
      <h2 style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.1em;color:var(--red);margin-bottom:1.25rem">HOURS</h2>
      ${hoursLines.map(l => `<p style="font-size:1rem;line-height:2;border-bottom:1px solid var(--cream-dark);padding-bottom:0.25rem;margin-bottom:0.25rem">${esc(l)}</p>`).join('')}
      <div style="margin-top:1.25rem;background:var(--mustard);display:inline-block;padding:0.5rem 1rem;border-radius:2px">
        <p style="font-family:var(--font-display);font-size:1rem;letter-spacing:0.1em;color:var(--charcoal)">OPEN UNTIL MIDNIGHT</p>
      </div>
    </div>
  </div>
</section>

<!-- CALL TO ORDER BOX -->
<section style="background:var(--charcoal);padding:4rem 2rem;text-align:center">
  <p style="font-family:var(--font-serif);font-style:italic;color:rgba(255,255,255,0.7);margin-bottom:0.75rem">Counter service — walk in and order</p>
  <h2 style="font-family:var(--font-display);font-size:clamp(1.8rem,4vw,3rem);letter-spacing:0.08em;color:#fff;margin-bottom:1.5rem">CALL AHEAD TO ORDER</h2>
  ${biz.phone ? `<a href="tel:${biz.phone.replace(/\D/g,'')}" class="btn-red" style="font-size:1.1rem;padding:1rem 2.5rem">${esc(biz.phone)}</a>` : ''}
</section>

${footerHtml(biz)}
</body></html>`;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export function buildSoulFoodAllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home:     buildSoulFoodHome(biz, baseUrl),
    services: buildSoulFoodMenu(biz, baseUrl),
    gallery:  buildSoulFoodGallery(biz, baseUrl),
    about:    buildSoulFoodAbout(biz, baseUrl),
    booking:  buildSoulFoodBooking(biz, baseUrl),
  };
}
