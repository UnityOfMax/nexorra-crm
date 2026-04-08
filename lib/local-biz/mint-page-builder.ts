/**
 * The Mint Hair Salon — editorial fresh design system.
 * "Glossier meets boutique studio" — Vogue white issues, not dark covers.
 *
 * Design:
 *   - Cormorant Garamond 300–400w (thin editorial serif for headings)
 *   - DM Sans 400–500w (body)
 *   - Background: #F7FAF8 (near-white with green tint)
 *   - Primary: #1A3A2A (deep green text)
 *   - Accent: #4CAF85 (mint — used as punctuation, not wallpaper)
 *   - Cards: white with box-shadow: 0 2px 16px rgba(0,0,0,0.06) only
 *   - Buttons: border-radius 4px — NOT pills
 *   - Spacing: 80–120px vertical padding
 */

import type { BizPageData } from './multi-page-builder';

export type { BizPageData };

// ── Helpers ───────────────────────────────────────────────────────────────────

function photo(idx: number, biz: BizPageData): string {
  return biz.photos[idx] || biz.photos[0] || 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1200&q=80';
}

function stars(rating: number | null): string {
  const n = Math.round(rating || 4.9);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// ── Head ──────────────────────────────────────────────────────────────────────

function head(biz: BizPageData, pageTitle: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} — ${biz.name}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{forest:'#1A3A2A',mint:'#4CAF85',cream:'#F7FAF8',sage:'#8A9A90'},fontFamily:{display:['Cormorant Garamond','serif'],body:['DM Sans','sans-serif']}}}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
body{font-family:'DM Sans',sans-serif;background:#F7FAF8;color:#1A3A2A}
h1,h2,h3,.display{font-family:'Cormorant Garamond',serif;font-weight:300;letter-spacing:-0.01em}
.card-shadow{box-shadow:0 2px 16px rgba(0,0,0,0.06)}
.card-hover{transition:all 0.25s ease}
.card-hover:hover{transform:translateY(-2px);box-shadow:0 4px 24px rgba(0,0,0,0.09)}
.mint-badge{background:rgba(76,175,133,0.1);color:#1A3A2A;border:1px solid rgba(76,175,133,0.3)}
input[type=text],input[type=email],input[type=tel]{background:#fff;border:1.5px solid rgba(26,58,42,0.15);border-radius:4px;padding:.75rem 1rem;color:#1A3A2A;font-family:'DM Sans',sans-serif;font-size:.9rem;width:100%;outline:none;transition:border-color .2s}
input:focus{border-color:#4CAF85}
input::placeholder{color:#8A9A90}
</style>
</head>`;
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string): string {
  const defaultLinks = [
    { href: `${baseUrl}/services`, label: 'Services' },
    { href: `${baseUrl}/gallery`, label: 'Gallery' },
    { href: `${baseUrl}/about`, label: 'Our Team' },
  ];
  const links = biz.extraNavLinks?.filter(l => l.label !== 'Book Now') || defaultLinks;
  const desktopLinks = links.map(l =>
    `<a href="${l.href}" class="text-[#1A3A2A]/70 hover:text-[#1A3A2A] transition-colors text-sm font-medium">${l.label}</a>`
  ).join('');
  const mobileLinks = links.map(l =>
    `<a href="${l.href}" class="text-[#1A3A2A]/70 hover:text-[#1A3A2A] py-2 text-base font-medium">${l.label}</a>`
  ).join('');

  return `<nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#1A3A2A]/10">
  <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="${baseUrl}" class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-[#4CAF85] flex items-center justify-center text-white font-bold text-sm" style="font-family:'Cormorant Garamond',serif;font-weight:300">M</div>
      <div>
        <span class="text-[#1A3A2A] font-semibold text-base" style="font-family:'Cormorant Garamond',serif;font-weight:300">${biz.name}</span>
        <div class="text-[#4CAF85] text-xs font-medium tracking-wide">${biz.city || ''}, ${biz.state || ''}</div>
      </div>
    </a>
    <div class="hidden md:flex items-center gap-7">
      ${desktopLinks}
      <a href="${baseUrl}/booking" class="bg-[#1A3A2A] text-white px-5 py-2 rounded text-sm font-medium tracking-wide hover:bg-[#4CAF85] transition-colors" style="letter-spacing:0.05em">Book Now</a>
    </div>
    <button id="menu-btn" class="md:hidden text-[#1A3A2A]" aria-label="Menu">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
  </div>
  <div id="mobile-menu" class="hidden md:hidden bg-white border-t border-[#1A3A2A]/10 px-6 py-4 flex flex-col gap-1">
    ${mobileLinks}
    <a href="${baseUrl}/booking" class="bg-[#1A3A2A] text-white px-5 py-3 rounded text-sm font-medium text-center mt-2" style="letter-spacing:0.05em">Book Now</a>
  </div>
</nav>
<script>document.getElementById('menu-btn').addEventListener('click',()=>document.getElementById('mobile-menu').classList.toggle('hidden'));</script>`;
}

// ── Footer ────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  const links = biz.extraNavLinks || [
    { href: `${baseUrl}/services`, label: 'Services' },
    { href: `${baseUrl}/gallery`, label: 'Gallery' },
    { href: `${baseUrl}/about`, label: 'Our Team' },
    { href: `${baseUrl}/booking`, label: 'Book Now' },
  ];
  return `<footer class="bg-[#1A3A2A] text-white py-16 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between gap-12 mb-12">
      <div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-[#4CAF85] flex items-center justify-center text-white font-bold" style="font-family:'Cormorant Garamond',serif;font-weight:300">M</div>
          <span class="text-xl font-semibold" style="font-family:'Cormorant Garamond',serif;font-weight:300">${biz.name}</span>
        </div>
        <div class="space-y-1 text-white/60 text-sm mt-4">
          ${biz.address ? `<div>${biz.address}</div>` : ''}
          ${biz.phone ? `<div><a href="tel:${biz.phone.replace(/[^0-9+]/g,'')}" class="hover:text-[#4CAF85] transition-colors">${biz.phone}</a></div>` : ''}
        </div>
      </div>
      <div>
        <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mb-4">Hours</div>
        <div class="text-white/70 text-sm whitespace-pre-line">${biz.hours || 'Tue–Sat 9am–6pm'}</div>
      </div>
      <div>
        <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mb-4">Pages</div>
        <div class="space-y-2 text-sm text-white/70">
          ${links.map(l => `<div><a href="${l.href}" class="hover:text-[#4CAF85] transition-colors">${l.label}</a></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="pt-8 border-t border-white/10 flex justify-between flex-wrap gap-2 text-white/30 text-xs">
      <span>© ${new Date().getFullYear()} ${biz.name}. All rights reserved.</span>
      <span>Serving ${biz.city || 'the community'}.</span>
    </div>
  </div>
</footer>`;
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function ctaSection(biz: BizPageData, baseUrl: string): string {
  return `<section class="py-24 px-6 bg-[#1A3A2A] text-white text-center">
  <div class="max-w-2xl mx-auto">
    <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-6" style="background:rgba(74,175,128,0.2);color:#A8D8BE">Ready to Book?</div>
    <h2 class="text-4xl md:text-5xl font-bold mb-6 leading-tight" style="font-family:'Cormorant Garamond',serif;font-weight:300">${biz.ctaText || 'Book your appointment today.'}</h2>
    <a href="${baseUrl}/booking" class="inline-block bg-[#4CAF85] text-white px-10 py-4 rounded text-sm font-medium hover:bg-white hover:text-[#1A3A2A] transition-all duration-300 mt-2" style="letter-spacing:0.08em">
      Book Your Visit
    </a>
    ${biz.phone ? `<p class="mt-5 text-white/50 text-sm">Or call: <a href="tel:${biz.phone.replace(/[^0-9+]/g,'')}" class="text-[#4CAF85] hover:underline">${biz.phone}</a></p>` : ''}
  </div>
</section>`;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

function reviewsStrip(biz: BizPageData): string {
  const revs = biz.reviewTexts.length >= 3 ? biz.reviewTexts : [
    ...biz.reviewTexts,
    `Amazing salon — the team is talented and so warm and welcoming.`,
    `Every visit is a great experience. Highly recommend!`,
    `Best in ${biz.city || 'the area'}. I won't go anywhere else.`,
  ];
  return `<section class="py-20 px-6 bg-white">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-12">
      <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4">Reviews</div>
      <div class="flex items-center justify-center gap-2">
        <span class="text-[#4CAF85] text-2xl">${stars(biz.rating)}</span>
        <span class="text-[#1A3A2A] font-semibold ml-1">${biz.rating ?? '4.9'} · ${biz.reviews ?? '35'}+ reviews</span>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${revs.slice(0, 3).map(r => `
      <div class="bg-[#F7FAF8] rounded p-7 card-shadow">
        <div class="text-[#4CAF85] text-lg mb-3">${stars(biz.rating)}</div>
        <p class="text-[#1A3A2A]/80 text-sm leading-relaxed italic">"${r}"</p>
        <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mt-4">Google Review</div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ══════════════════════════════════════════════════════════════════════════════

export function buildMintHomePage(biz: BizPageData, baseUrl: string): string {
  const heroImg = photo(0, biz);
  const svcTeaser = biz.services.slice(0, 3);

  return `${head(biz, 'Welcome')}
<body class="bg-[#F7FAF8]">
${nav(biz, baseUrl)}

<!-- Hero -->
<section class="relative min-h-screen flex items-center">
  <div class="absolute inset-0">
    <img src="${heroImg}" alt="${biz.name}" class="w-full h-full object-cover object-center">
    <div class="absolute inset-0" style="background:linear-gradient(135deg, rgba(26,60,52,0.85) 0%, rgba(26,60,52,0.4) 60%, rgba(26,60,52,0.2) 100%)"></div>
  </div>
  <div class="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-24 w-full">
    <div class="max-w-xl">
      <div class="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full mb-8">
        <div class="w-2 h-2 rounded-full bg-[#4CAF85]"></div>
        <span class="text-white/90 text-xs font-semibold tracking-widest uppercase">${biz.city || ''} · ${biz.rating ?? '4.9'} Stars · ${biz.reviews ?? '35'} Reviews</span>
      </div>
      <h1 class="text-5xl md:text-7xl font-bold text-white leading-none mb-4" style="font-family:'Cormorant Garamond',serif;font-weight:300">
        ${biz.heroHeadline}
      </h1>
      ${biz.heroHeadlineEm ? `<div class="text-3xl md:text-5xl font-bold leading-none mb-6" style="font-family:'Cormorant Garamond',serif;font-weight:300;color:#4CAF85">${biz.heroHeadlineEm}</div>` : '<div class="mb-4"></div>'}
      <p class="text-white/80 text-lg font-light leading-relaxed mb-10 max-w-md">${biz.heroSub}</p>
      <div class="flex flex-col sm:flex-row gap-3">
        <a href="${baseUrl}/booking" class="bg-[#4CAF85] text-white px-8 py-4 rounded text-sm font-medium hover:bg-white hover:text-[#1A3A2A] transition-all text-center" style="letter-spacing:0.08em">Book Your Visit</a>
        <a href="${baseUrl}/services" class="bg-white/15 backdrop-blur-sm text-white px-8 py-4 rounded text-sm font-medium hover:bg-white/25 transition-all text-center" style="letter-spacing:0.08em">View Services</a>
      </div>
    </div>
  </div>
</section>

<!-- Services teaser -->
<section class="py-24 px-6 bg-[#F7FAF8]">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between items-end mb-12">
      <div>
        <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-3">What We Do</div>
        <h2 class="text-4xl md:text-5xl font-bold text-[#1A3A2A] leading-tight" style="font-family:'Cormorant Garamond',serif;font-weight:300">Our Services</h2>
      </div>
      <a href="${baseUrl}/services" class="text-[#4CAF85] font-semibold text-sm mt-4 md:mt-0 hover:text-[#1A3A2A] transition-colors flex items-center gap-2">
        View All <span>→</span>
      </a>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${svcTeaser.map(s => `
      <div class="bg-white rounded p-7 card-shadow card-hover">
        <div class="w-10 h-10 rounded-full bg-[#4CAF85]/15 flex items-center justify-center mb-4">
          <div class="w-3 h-3 rounded-full bg-[#4CAF85]"></div>
        </div>
        <h3 class="text-xl font-semibold text-[#1A3A2A] mb-2" style="font-family:'Cormorant Garamond',serif;font-weight:300">${s.name}</h3>
        <p class="text-[#8A9A90] text-sm leading-relaxed mb-4">${s.desc}</p>
        ${s.price ? `<span class="text-[#4CAF85] font-semibold text-sm">${s.price}</span>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Team teaser (if we have team data) -->
${biz.team.length > 0 ? `
<section class="py-20 px-6 bg-white">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4">The Team</div>
      <h2 class="text-4xl font-bold text-[#1A3A2A]" style="font-family:'Cormorant Garamond',serif;font-weight:300">Meet Your Stylists</h2>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      ${biz.team.slice(0, 4).map(m => `
      <div class="text-center">
        <div class="w-24 h-24 mx-auto mb-3 overflow-hidden rounded-full border-2 border-[#4CAF85]/30">
          ${m.photo
            ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover object-top">`
            : `<div class="w-full h-full bg-[#1A3A2A] flex items-center justify-center text-white text-2xl font-bold" style="font-family:'Cormorant Garamond',serif;font-weight:300">${m.name[0]}</div>`
          }
        </div>
        <div class="text-[#1A3A2A] font-semibold text-sm" style="font-family:'Cormorant Garamond',serif;font-weight:300">${m.name}</div>
        <div class="text-[#8A9A90] text-xs mt-0.5">${m.role}</div>
      </div>`).join('')}
    </div>
    <div class="text-center mt-10">
      <a href="${baseUrl}/booking" class="bg-[#1A3A2A] text-white px-8 py-3 rounded text-sm font-medium hover:bg-[#4CAF85] transition-colors" style="letter-spacing:0.08em">Book with Your Stylist</a>
    </div>
  </div>
</section>` : ''}

<!-- Gallery peek -->
${biz.photos.length > 2 ? `
<section class="py-16 bg-[#F7FAF8]">
  <div class="max-w-6xl mx-auto px-6 mb-8">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-[#1A3A2A]" style="font-family:'Cormorant Garamond',serif;font-weight:300">The Salon</h2>
      <a href="${baseUrl}/gallery" class="text-[#4CAF85] font-semibold text-sm hover:text-[#1A3A2A] transition-colors flex items-center gap-2">All Photos →</a>
    </div>
  </div>
  <div class="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-3">
    ${[0,1,2,3].map(i => `
    <div class="overflow-hidden rounded aspect-square">
      <img src="${photo(i, biz)}" alt="${biz.name}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
    </div>`).join('')}
  </div>
</section>` : ''}

${reviewsStrip(biz)}
${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICES PAGE
// ══════════════════════════════════════════════════════════════════════════════

export function buildMintServicesPage(biz: BizPageData, baseUrl: string): string {
  return `${head(biz, 'Services')}
<body class="bg-[#F7FAF8]">
${nav(biz, baseUrl)}

<section class="pt-36 pb-16 px-6 bg-white">
  <div class="max-w-4xl mx-auto text-center">
    <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4">What We Offer</div>
    <h1 class="text-5xl md:text-6xl font-bold text-[#1A3A2A] leading-tight" style="font-family:'Cormorant Garamond',serif;font-weight:300">Our Services</h1>
    <div class="mt-6 w-12 h-px bg-[#4CAF85] mx-auto"></div>
  </div>
</section>

<section class="py-16 px-6 bg-[#F7FAF8]">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${biz.services.map(s => `
      <div class="bg-white rounded p-7 card-shadow card-hover">
        <div class="w-10 h-10 rounded-full bg-[#4CAF85]/15 flex items-center justify-center mb-4">
          <div class="w-3 h-3 rounded-full bg-[#4CAF85]"></div>
        </div>
        <h3 class="text-xl font-bold text-[#1A3A2A] mb-2" style="font-family:'Cormorant Garamond',serif;font-weight:300">${s.name}</h3>
        <p class="text-[#8A9A90] text-sm leading-relaxed mb-4">${s.desc}</p>
        <div class="flex justify-between items-center">
          ${s.price ? `<span class="text-[#4CAF85] font-semibold text-sm">${s.price}</span>` : '<span></span>'}
          ${s.duration ? `<span class="text-[#1A3A2A]/40 text-xs">${s.duration}</span>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

${reviewsStrip(biz)}
${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// GALLERY PAGE
// ══════════════════════════════════════════════════════════════════════════════

export function buildMintGalleryPage(biz: BizPageData, baseUrl: string): string {
  const allPhotos = biz.photos.length > 0 ? biz.photos : Array(8).fill('https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80');

  const heroRow = `
  <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
    <div class="overflow-hidden rounded aspect-[3/4] md:row-span-2">
      <img src="${allPhotos[0]}" alt="${biz.name}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
    </div>
    ${allPhotos.slice(1, 5).map((p, i) => `
    <div class="overflow-hidden rounded aspect-square">
      <img src="${p}" alt="${biz.name} — ${i+2}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
    </div>`).join('')}
  </div>`;

  const extraGrid = allPhotos.length > 5 ? `
  <div class="grid grid-cols-3 md:grid-cols-4 gap-3">
    ${allPhotos.slice(5).map((p, i) => `
    <div class="overflow-hidden rounded aspect-square">
      <img src="${p}" alt="${biz.name} — ${i+6}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
    </div>`).join('')}
  </div>` : '';

  return `${head(biz, 'Gallery')}
<body class="bg-[#F7FAF8]">
${nav(biz, baseUrl)}

<section class="pt-36 pb-12 px-6 bg-white text-center">
  <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4">The Salon</div>
  <h1 class="text-5xl md:text-6xl font-bold text-[#1A3A2A]" style="font-family:'Cormorant Garamond',serif;font-weight:300">Gallery</h1>
  <div class="mt-6 w-12 h-px bg-[#4CAF85] mx-auto"></div>
</section>

<section class="py-12 px-6 bg-[#F7FAF8]">
  <div class="max-w-6xl mx-auto">
    ${heroRow}
    ${extraGrid}
  </div>
</section>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEAM PAGE (About)
// ══════════════════════════════════════════════════════════════════════════════

export function buildMintAboutPage(biz: BizPageData, baseUrl: string): string {
  const teamGrid = biz.team.length > 0
    ? biz.team.map(m => `
    <div class="bg-white rounded overflow-hidden card-shadow card-hover text-center">
      <div class="aspect-[3/4] overflow-hidden">
        ${m.photo
          ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500">`
          : `<div class="w-full h-full bg-[#1A3A2A] flex items-center justify-center text-white text-5xl font-bold" style="font-family:'Cormorant Garamond',serif;font-weight:300">${m.name[0]}</div>`
        }
      </div>
      <div class="p-6">
        <h3 class="text-xl font-bold text-[#1A3A2A] mb-1" style="font-family:'Cormorant Garamond',serif;font-weight:300">${m.name}</h3>
        <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mb-3">${m.role}</div>
        ${m.bio ? `<p class="text-[#8A9A90] text-sm leading-relaxed">${m.bio}</p>` : ''}
      </div>
    </div>`).join('')
    : '';

  return `${head(biz, 'Our Team')}
<body class="bg-[#F7FAF8]">
${nav(biz, baseUrl)}

<!-- Page header -->
<section class="pt-36 pb-16 px-6 bg-white">
  <div class="max-w-4xl mx-auto text-center">
    <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4">The People</div>
    <h1 class="text-5xl md:text-6xl font-bold text-[#1A3A2A] leading-tight" style="font-family:'Cormorant Garamond',serif;font-weight:300">Our Team</h1>
    <div class="mt-6 w-12 h-px bg-[#4CAF85] mx-auto"></div>
  </div>
</section>

<!-- About salon -->
<section class="py-16 px-6 bg-[#F7FAF8]">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
      <div>
        <h2 class="text-3xl md:text-4xl font-bold text-[#1A3A2A] mb-6 leading-tight" style="font-family:'Cormorant Garamond',serif;font-weight:300">${biz.aboutText}</h2>
        <div class="w-12 h-px bg-[#4CAF85] mb-6"></div>
        <p class="text-[#8A9A90] text-lg leading-relaxed mb-8">${biz.aboutText2}</p>
        <div class="flex gap-8">
          ${biz.rating ? `<div><div class="text-3xl font-bold text-[#1A3A2A]" style="font-family:'Cormorant Garamond',serif;font-weight:300">${biz.rating}</div><div class="text-[#8A9A90] text-xs uppercase tracking-wider mt-1">Star Rating</div></div>` : ''}
          ${biz.reviews ? `<div><div class="text-3xl font-bold text-[#1A3A2A]" style="font-family:'Cormorant Garamond',serif;font-weight:300">${biz.reviews}</div><div class="text-[#8A9A90] text-xs uppercase tracking-wider mt-1">Reviews</div></div>` : ''}
        </div>
      </div>
      <div class="overflow-hidden rounded aspect-[4/5]">
        <img src="${photo(1, biz)}" alt="${biz.name}" class="w-full h-full object-cover">
      </div>
    </div>

    <!-- Team grid -->
    ${teamGrid ? `
    <h2 class="text-3xl font-bold text-[#1A3A2A] mb-10 text-center" style="font-family:'Cormorant Garamond',serif;font-weight:300">Meet the Stylists</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(biz.team.length, 4)} gap-6">
      ${teamGrid}
    </div>` : ''}
  </div>
</section>

${reviewsStrip(biz)}
${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOKING PAGE — Fresha-style, light theme
// ══════════════════════════════════════════════════════════════════════════════

export function buildMintBookingPage(biz: BizPageData, baseUrl: string): string {
  const cat = biz.businessCategory;
  const hasStylistStep = ['salon', 'barber', 'beauty', 'fitness', 'gym'].includes(cat);
  const totalSteps = hasStylistStep ? 4 : 3;
  const phoneClean = biz.phone?.replace(/[^0-9+]/g, '') || '';

  const serviceCards = biz.services.map(s => `
    <div class="svc-card cursor-pointer bg-white border-2 border-transparent rounded p-5 hover:border-[#4CAF85] transition-all duration-200 card-shadow"
         onclick="selectService(this,'${s.name.replace(/'/g,"\\'")}','${s.price}','${s.duration || '60 min'}')"
         data-name="${s.name}">
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-semibold text-[#1A3A2A] text-sm" style="font-family:'Cormorant Garamond',serif;font-weight:300">${s.name}</h3>
        ${s.price ? `<span class="text-[#4CAF85] font-semibold text-sm ml-3 whitespace-nowrap">${s.price}</span>` : ''}
      </div>
      <p class="text-[#8A9A90] text-xs leading-relaxed mb-2">${s.desc}</p>
      ${s.duration ? `<span class="text-[#1A3A2A]/40 text-xs">${s.duration}</span>` : ''}
    </div>`).join('');

  const teamForWidget = [...biz.team, { name: 'Any Available', role: 'First available stylist', photo: undefined }];
  const stylistCards = teamForWidget.map(m => `
    <div class="team-card cursor-pointer bg-white border-2 border-transparent rounded p-4 hover:border-[#4CAF85] transition-all duration-200 text-center card-shadow"
         onclick="selectStyleist(this,'${m.name.replace(/'/g,"\\'")}')">
      <div class="w-16 h-16 mx-auto mb-3 overflow-hidden rounded-full border-2 border-[#4CAF85]/20">
        ${m.photo
          ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover object-top">`
          : `<div class="w-full h-full bg-[#1A3A2A] flex items-center justify-center text-white text-xl font-bold" style="font-family:'Cormorant Garamond',serif;font-weight:300">${m.name[0]}</div>`
        }
      </div>
      <div class="text-[#1A3A2A] text-sm font-semibold" style="font-family:'Cormorant Garamond',serif;font-weight:300">${m.name}</div>
      <div class="text-[#8A9A90] text-xs mt-0.5">${m.role}</div>
    </div>`).join('');

  return `${head(biz, 'Book')}
<body class="bg-[#F7FAF8]">
${nav(biz, baseUrl)}

<section class="pt-36 pb-16 px-6 bg-white text-center">
  <div class="inline-block mint-badge px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4">Reserve Your Spot</div>
  <h1 class="text-5xl md:text-6xl font-bold text-[#1A3A2A] leading-tight" style="font-family:'Cormorant Garamond',serif;font-weight:300">Book an Appointment</h1>
  <div class="mt-6 w-12 h-px bg-[#4CAF85] mx-auto"></div>
</section>

<style>
.svc-card.selected,.team-card.selected{border-color:#4CAF85!important;background:#F0FBF5!important}
.slot{padding:.4rem .75rem;border:1.5px solid rgba(26,58,42,0.15);border-radius:4px;font-size:.75rem;cursor:pointer;color:#1A3A2A;transition:all .2s;background:#fff;font-family:'DM Sans',sans-serif}
.slot:hover{border-color:#4CAF85;color:#4CAF85}
.slot.selected{background:#4CAF85!important;border-color:#4CAF85!important;color:#fff!important;font-weight:600}
.slot.booked{opacity:.3;cursor:default;pointer-events:none;text-decoration:line-through}
.cal-day{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer;font-size:.82rem;transition:all .2s;color:#8A9A90;font-family:'DM Sans',sans-serif}
.cal-day:hover:not(.past):not(.empty){background:#F0FBF5;color:#1A3A2A}
.cal-day.selected{background:#4CAF85!important;color:#fff!important;font-weight:600}
.cal-day.past,.cal-day.empty{opacity:.25;cursor:default;pointer-events:none}
.cal-day.today{border:1.5px solid rgba(74,175,128,0.5);color:#1A3A2A;font-weight:600}
.step-dot{width:32px;height:32px;border-radius:50%;border:2px solid rgba(26,60,52,0.2);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#8A9A90;transition:all .3s;background:#fff;font-family:'Cormorant Garamond',serif;font-weight:300}
.step-dot.active{border-color:#4CAF85;color:#4CAF85;background:#F0FBF5}
.step-dot.done{background:#4CAF85;border-color:#4CAF85;color:#fff}
.step-line{flex:1;height:2px;background:rgba(26,60,52,0.1);margin:0 4px;border-radius:1px}
</style>

<section class="py-16 px-4 bg-[#F7FAF8]">
  <div class="max-w-xl mx-auto">

    <!-- Step indicator -->
    <div class="flex items-center mb-10">
      <div class="step-dot active" id="dot-1">1</div>
      <div class="step-line"></div>
      ${hasStylistStep
        ? `<div class="step-dot" id="dot-2">2</div><div class="step-line"></div><div class="step-dot" id="dot-3">3</div><div class="step-line"></div><div class="step-dot" id="dot-4">4</div>`
        : `<div class="step-dot" id="dot-2">2</div><div class="step-line"></div><div class="step-dot" id="dot-3">3</div>`
      }
    </div>

    <!-- Panel 1: Service -->
    <div id="panel-1">
      <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mb-2">Step 1 of ${totalSteps}</div>
      <h2 class="text-2xl font-bold text-[#1A3A2A] mb-6" style="font-family:'Cormorant Garamond',serif;font-weight:300">Choose a Service</h2>
      <div class="space-y-3">${serviceCards}</div>
    </div>

    ${hasStylistStep ? `<!-- Panel 2: Stylist -->
    <div id="panel-2" class="hidden">
      <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mb-2">Step 2 of ${totalSteps}</div>
      <h2 class="text-2xl font-bold text-[#1A3A2A] mb-2" style="font-family:'Cormorant Garamond',serif;font-weight:300">Choose Your Stylist</h2>
      <p class="text-[#8A9A90] text-sm mb-6">Selected: <span id="chosen-service" class="text-[#1A3A2A] font-medium"></span></p>
      <div class="grid grid-cols-2 gap-3">${stylistCards}</div>
      <button onclick="goStep(1)" class="mt-6 text-[#1A3A2A]/50 text-sm hover:text-[#4CAF85] transition-colors">← Back</button>
    </div>` : ''}

    <!-- Panel 3: Date + Time -->
    <div id="panel-3" class="hidden">
      <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mb-2">Step ${hasStylistStep ? 3 : 2} of ${totalSteps}</div>
      <h2 class="text-2xl font-bold text-[#1A3A2A] mb-2" style="font-family:'Cormorant Garamond',serif;font-weight:300">Pick a Date & Time</h2>
      ${hasStylistStep
        ? `<p class="text-[#8A9A90] text-sm mb-6">With: <span id="chosen-stylist" class="text-[#1A3A2A] font-medium"></span></p>`
        : `<p class="text-[#8A9A90] text-sm mb-6">Service: <span id="chosen-service-3" class="text-[#1A3A2A] font-medium"></span></p>`
      }
      <div class="bg-white rounded card-shadow p-5 mb-5">
        <div class="flex items-center justify-between mb-4">
          <button onclick="calPrev()" class="text-[#1A3A2A]/40 hover:text-[#4CAF85] transition-colors text-xl leading-none">‹</button>
          <div class="font-bold text-[#1A3A2A] text-sm" id="cal-month-label" style="font-family:'Cormorant Garamond',serif;font-weight:300"></div>
          <button onclick="calNext()" class="text-[#1A3A2A]/40 hover:text-[#4CAF85] transition-colors text-xl leading-none">›</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center mb-2">
          ${['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<div class="text-[#1A3A2A]/30 text-xs font-semibold">${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1 justify-items-center" id="cal-grid"></div>
      </div>
      <div id="slots-container" class="hidden">
        <div class="text-[#1A3A2A]/40 text-xs font-semibold uppercase tracking-wider mb-3">Available Times — <span id="slots-date-label"></span></div>
        <div class="flex flex-wrap gap-2" id="slots-grid"></div>
      </div>
      <button onclick="goStep(${hasStylistStep ? 2 : 1})" class="mt-6 text-[#1A3A2A]/50 text-sm hover:text-[#4CAF85] transition-colors">← Back</button>
    </div>

    <!-- Panel 4: Details -->
    <div id="panel-4" class="hidden">
      <div class="text-[#4CAF85] text-xs font-semibold tracking-widest uppercase mb-2">Step ${totalSteps} of ${totalSteps}</div>
      <h2 class="text-2xl font-bold text-[#1A3A2A] mb-2" style="font-family:'Cormorant Garamond',serif;font-weight:300">Your Details</h2>
      <p class="text-[#8A9A90] text-sm mb-6"><span id="summary-line" class="text-[#1A3A2A] font-medium"></span></p>
      <div class="space-y-4">
        <div><label class="block text-[#1A3A2A]/50 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label><input type="text" id="bk-name" placeholder="Your name"></div>
        <div><label class="block text-[#1A3A2A]/50 text-xs font-semibold uppercase tracking-wider mb-2">Email</label><input type="email" id="bk-email" placeholder="your@email.com"></div>
        <div><label class="block text-[#1A3A2A]/50 text-xs font-semibold uppercase tracking-wider mb-2">Phone</label><input type="tel" id="bk-phone" placeholder="(555) 000-0000"></div>
        <button onclick="submitBooking()" class="w-full bg-[#1A3A2A] text-white py-4 rounded text-sm font-medium hover:bg-[#4CAF85] transition-colors mt-2" style="letter-spacing:0.08em">
          Confirm Appointment
        </button>
      </div>
      <button onclick="goStep(${hasStylistStep ? 3 : 2})" class="mt-5 text-[#1A3A2A]/50 text-sm hover:text-[#4CAF85] transition-colors">← Back</button>
    </div>

    <!-- Success -->
    <div id="panel-success" class="hidden text-center py-8">
      <div class="w-16 h-16 rounded-full bg-[#4CAF85] flex items-center justify-center mx-auto mb-6 text-white text-2xl">✓</div>
      <h2 class="text-3xl font-bold text-[#1A3A2A] mb-4" style="font-family:'Cormorant Garamond',serif;font-weight:300">You're all set!</h2>
      <p class="text-[#8A9A90] mb-2">Thanks <span id="success-name" class="text-[#1A3A2A] font-semibold"></span> — we've received your request.</p>
      <p class="text-[#8A9A90] mb-8">We'll call <span id="success-phone" class="text-[#4CAF85] font-semibold"></span> to confirm, usually within a few hours.</p>
      ${biz.phone ? `<p class="text-[#8A9A90] text-sm">Questions? <a href="tel:${phoneClean}" class="text-[#4CAF85] hover:underline font-medium">${biz.phone}</a></p>` : ''}
    </div>

    <!-- Contact strip -->
    <div class="mt-14 pt-10 border-t border-[#1A3A2A]/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm text-[#8A9A90]">
      ${biz.phone ? `<div><div class="text-[#4CAF85] text-xs font-semibold uppercase tracking-wider mb-2">Call</div><a href="tel:${phoneClean}" class="hover:text-[#4CAF85] font-medium">${biz.phone}</a></div>` : ''}
      ${biz.address ? `<div><div class="text-[#4CAF85] text-xs font-semibold uppercase tracking-wider mb-2">Find Us</div>${biz.address}</div>` : ''}
      <div><div class="text-[#4CAF85] text-xs font-semibold uppercase tracking-wider mb-2">Hours</div>${biz.hours || 'Tue–Sat 9am–6pm'}</div>
    </div>
  </div>
</section>

<script>
var sel={service:'',price:'',duration:'',stylist:'',date:'',time:''};
var calYear,calMonth,hasStylist=${hasStylistStep};
function goStep(n){
  var panels=['panel-1','panel-2','panel-3','panel-4'];
  if(!hasStylist) panels=['panel-1','panel-3','panel-4'];
  panels.forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('hidden');});
  var panelMap=hasStylist?{1:'panel-1',2:'panel-2',3:'panel-3',4:'panel-4'}:{1:'panel-1',2:'panel-3',3:'panel-4'};
  var target=document.getElementById(panelMap[n]);if(target)target.classList.remove('hidden');
  var total=${totalSteps};
  for(var i=1;i<=total;i++){
    var dot=document.getElementById('dot-'+i);if(!dot)continue;
    if(i<n){dot.classList.add('done');dot.classList.remove('active');dot.textContent='✓';}
    else if(i===n){dot.classList.add('active');dot.classList.remove('done');}
    else{dot.classList.remove('active','done');dot.textContent=i;}
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
function selectService(el,name,price,duration){
  document.querySelectorAll('.svc-card').forEach(function(c){c.classList.remove('selected');});
  el.classList.add('selected');sel.service=name;sel.price=price;sel.duration=duration;
  setTimeout(function(){
    var s=document.getElementById('chosen-service');if(s)s.textContent=name+(price?' · '+price:'');
    var s3=document.getElementById('chosen-service-3');if(s3)s3.textContent=name;
    goStep(2);
  },200);
}
function selectStyleist(el,name){
  document.querySelectorAll('.team-card').forEach(function(c){c.classList.remove('selected');});
  el.classList.add('selected');sel.stylist=name;
  setTimeout(function(){var cs=document.getElementById('chosen-stylist');if(cs)cs.textContent=name;goStep(3);},200);
}
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function renderCal(){
  var now=new Date(),first=new Date(calYear,calMonth,1),last=new Date(calYear,calMonth+1,0);
  document.getElementById('cal-month-label').textContent=MONTHS[calMonth]+' '+calYear;
  var grid=document.getElementById('cal-grid');grid.innerHTML='';
  var startDay=(first.getDay()+6)%7;
  for(var i=0;i<startDay;i++){var e=document.createElement('div');e.className='cal-day empty';grid.appendChild(e);}
  for(var d=1;d<=last.getDate();d++){
    var e=document.createElement('div');e.className='cal-day';e.textContent=d;
    var thisDate=new Date(calYear,calMonth,d);
    if(thisDate.toDateString()===now.toDateString())e.classList.add('today');
    if(thisDate<new Date(now.getFullYear(),now.getMonth(),now.getDate()))e.classList.add('past');
    else{(function(day,el){el.addEventListener('click',function(){
      document.querySelectorAll('.cal-day').forEach(function(c){c.classList.remove('selected');});
      el.classList.add('selected');
      sel.date=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
      document.getElementById('slots-date-label').textContent=MONTHS[calMonth]+' '+day+', '+calYear;
      renderSlots(day);document.getElementById('slots-container').classList.remove('hidden');
    });})(d,e);}
    grid.appendChild(e);
  }
}
function calPrev(){if(calMonth===0){calMonth=11;calYear--;}else calMonth--;renderCal();}
function calNext(){if(calMonth===11){calMonth=0;calYear++;}else calMonth++;renderCal();}
function renderSlots(day){
  var grid=document.getElementById('slots-grid');grid.innerHTML='';
  var times=['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM'];
  var booked=[day%7,(day%5)+3,(day%4)+8];
  times.forEach(function(t,i){
    var btn=document.createElement('button');btn.className='slot'+(booked.includes(i)?' booked':'');btn.textContent=t;
    if(!booked.includes(i))btn.addEventListener('click',function(){
      document.querySelectorAll('.slot').forEach(function(s){s.classList.remove('selected');});
      btn.classList.add('selected');sel.time=t;
      setTimeout(function(){
        var summary=sel.service+(sel.stylist?' with '+sel.stylist:'')+(sel.date?' · '+MONTHS[new Date(sel.date+'T00:00').getMonth()]+' '+new Date(sel.date+'T00:00').getDate():'')+(sel.time?' at '+sel.time:'');
        var sl=document.getElementById('summary-line');if(sl)sl.textContent=summary;
        goStep(${totalSteps});
      },200);
    });
    grid.appendChild(btn);
  });
}
function submitBooking(){
  var name=document.getElementById('bk-name').value.trim();
  var email=document.getElementById('bk-email').value.trim();
  var phone=document.getElementById('bk-phone').value.trim();
  if(!name||!email||!phone){alert('Please fill in all fields.');return;}
  document.getElementById('success-name').textContent=name;
  document.getElementById('success-phone').textContent=phone;
  ['panel-1','panel-2','panel-3','panel-4'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('hidden');});
  document.getElementById('panel-success').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}
var now=new Date();calYear=now.getFullYear();calMonth=now.getMonth();renderCal();
</script>

${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT: Build all Mint pages
// ══════════════════════════════════════════════════════════════════════════════

export interface MintPages {
  home:     string;
  services: string;
  gallery:  string;
  about:    string;
  booking:  string;
  [key: string]: string;
}

export function buildMintAllPages(biz: BizPageData, baseUrl: string): MintPages {
  return {
    home:     buildMintHomePage(biz, baseUrl),
    services: buildMintServicesPage(biz, baseUrl),
    gallery:  buildMintGalleryPage(biz, baseUrl),
    about:    buildMintAboutPage(biz, baseUrl),
    booking:  buildMintBookingPage(biz, baseUrl),
  };
}
