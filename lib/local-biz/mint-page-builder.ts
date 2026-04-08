/**
 * The Mint Hair Salon — warm boutique design.
 *
 * Based on real salon photos: soft sage-mint accent walls, warm copper lighting,
 * fresh flower arrangements, bright welcoming space in Macon GA.
 *
 * Palette:
 *   #FAF7F2  warm cream (bg)
 *   #F5F1ED  cream-alt (section bg variation)
 *   #2D2D2D  dark charcoal (text)
 *   #8A7E78  warm muted (secondary text)
 *   #8FBF9F  muted sage-mint (accents, borders)
 *   #C97C5C  warm copper (CTA buttons, key highlights)
 *   #E8E5E1  subtle border
 *   #2D2D2D  footer bg (dark charcoal)
 *
 * Fonts: Playfair Display (bold headings) + Lato (body)
 * Buttons: border-radius 6px
 * Cards: border-radius 8px, shadow 0 2px 8px rgba(45,45,45,0.08)
 */

import type { BizPageData } from './multi-page-builder';

export type { BizPageData };

// ── Helpers ───────────────────────────────────────────────────────────────────

function photo(idx: number, biz: BizPageData): string {
  return biz.photos[idx] || biz.photos[0] || '';
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
<script>tailwind.config={theme:{extend:{colors:{cream:'#FAF7F2',sage:'#8FBF9F',copper:'#C97C5C',charcoal:'#2D2D2D'},fontFamily:{display:['Playfair Display','serif'],body:['Lato','sans-serif']}}}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{font-family:'Lato',sans-serif;background:#FAF7F2;color:#2D2D2D;-webkit-font-smoothing:antialiased}
h1,h2,h3,.serif{font-family:'Playfair Display',serif}
.card{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(45,45,45,0.08)}
.card-hover{transition:transform 0.2s ease,box-shadow 0.2s ease}
.card-hover:hover{transform:translateY(-3px);box-shadow:0 6px 20px rgba(45,45,45,0.12)}
.btn-copper{background:#C97C5C;color:#fff;border-radius:6px;font-family:'Lato',sans-serif;font-weight:700;letter-spacing:0.04em;transition:background 0.2s ease}
.btn-copper:hover{background:#b56748}
.btn-outline{border:2px solid #C97C5C;color:#C97C5C;border-radius:6px;font-family:'Lato',sans-serif;font-weight:700;letter-spacing:0.04em;transition:all 0.2s ease}
.btn-outline:hover{background:#C97C5C;color:#fff}
.sage-label{display:inline-block;background:rgba(143,191,159,0.15);color:#5a8a6a;border:1px solid rgba(143,191,159,0.4);border-radius:4px;font-family:'Lato',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:.25rem .75rem}
input[type=text],input[type=email],input[type=tel]{background:#fff;border:1.5px solid #E8E5E1;border-radius:6px;padding:.75rem 1rem;color:#2D2D2D;font-family:'Lato',sans-serif;font-size:.9rem;width:100%;outline:none;transition:border-color .2s}
input:focus{border-color:#8FBF9F}
input::placeholder{color:#B8B0AA}
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
    `<a href="${l.href}" class="text-[#2D2D2D]/70 hover:text-[#C97C5C] transition-colors text-sm font-normal tracking-wide">${l.label}</a>`
  ).join('');
  const mobileLinks = links.map(l =>
    `<a href="${l.href}" class="text-[#2D2D2D]/70 hover:text-[#C97C5C] py-2 text-base">${l.label}</a>`
  ).join('');

  return `<nav class="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2]/97 backdrop-blur-sm border-b border-[#E8E5E1]">
  <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="${baseUrl}" class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-[#8FBF9F] flex items-center justify-center">
        <span class="text-white text-xs font-bold" style="font-family:'Lato',sans-serif">M</span>
      </div>
      <div>
        <div class="text-[#2D2D2D] font-semibold text-sm leading-tight" style="font-family:'Playfair Display',serif">${biz.name}</div>
        <div class="text-[#8FBF9F] text-xs">${biz.city || ''}, ${biz.state || ''}</div>
      </div>
    </a>
    <div class="hidden md:flex items-center gap-8">
      ${desktopLinks}
      <a href="${baseUrl}/booking" class="btn-copper px-5 py-2 text-sm">Book Now</a>
    </div>
    <button id="menu-btn" class="md:hidden text-[#2D2D2D]" aria-label="Menu">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
  </div>
  <div id="mobile-menu" class="hidden md:hidden bg-[#FAF7F2] border-t border-[#E8E5E1] px-6 py-4 flex flex-col gap-1">
    ${mobileLinks}
    <a href="${baseUrl}/booking" class="btn-copper px-5 py-3 text-sm text-center mt-3 block">Book Now</a>
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
  return `<footer class="bg-[#2D2D2D] text-white py-16 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between gap-12 mb-12">
      <div>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-full bg-[#8FBF9F] flex items-center justify-center">
            <span class="text-white text-sm font-bold">M</span>
          </div>
          <span class="text-lg" style="font-family:'Playfair Display',serif">${biz.name}</span>
        </div>
        <div class="space-y-1.5 text-white/50 text-sm">
          ${biz.address ? `<div>${biz.address}</div>` : ''}
          ${biz.phone ? `<div><a href="tel:${biz.phone.replace(/[^0-9+]/g,'')}" class="hover:text-[#8FBF9F] transition-colors">${biz.phone}</a></div>` : ''}
        </div>
      </div>
      <div>
        <div class="text-[#8FBF9F] text-xs font-bold tracking-widest uppercase mb-4">Hours</div>
        <div class="text-white/60 text-sm whitespace-pre-line">${biz.hours || 'Tue–Sat 9am–6pm'}</div>
      </div>
      <div>
        <div class="text-[#8FBF9F] text-xs font-bold tracking-widest uppercase mb-4">Pages</div>
        <div class="space-y-2 text-sm text-white/50">
          ${links.map(l => `<div><a href="${l.href}" class="hover:text-[#C97C5C] transition-colors">${l.label}</a></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="pt-8 border-t border-white/10 flex flex-wrap justify-between gap-2 text-white/25 text-xs">
      <span>© ${new Date().getFullYear()} ${biz.name}. All rights reserved.</span>
      <span>Serving ${biz.city || 'the community'}.</span>
    </div>
  </div>
</footer>`;
}

// ── CTA section ───────────────────────────────────────────────────────────────

function ctaSection(biz: BizPageData, baseUrl: string): string {
  return `<section class="py-20 px-6 bg-[#F5F1ED] text-center">
  <div class="max-w-2xl mx-auto">
    <div class="sage-label mb-6">Ready to Book?</div>
    <h2 class="text-4xl md:text-5xl text-[#2D2D2D] mb-5 leading-tight" style="font-family:'Playfair Display',serif;font-weight:600">${biz.ctaText || 'Book your appointment today.'}</h2>
    <p class="text-[#8A7E78] mb-8">We'd love to see you. Give us a call or book your visit below.</p>
    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <a href="${baseUrl}/booking" class="btn-copper px-10 py-4 text-sm inline-block">Book Your Visit</a>
      ${biz.phone ? `<a href="tel:${biz.phone.replace(/[^0-9+]/g,'')}" class="btn-outline px-10 py-4 text-sm inline-block">${biz.phone}</a>` : ''}
    </div>
  </div>
</section>`;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

function reviewsStrip(biz: BizPageData): string {
  const revs = biz.reviewTexts.length >= 3 ? biz.reviewTexts : [
    ...biz.reviewTexts,
    `Warm, welcoming salon — everyone on the team is talented and so professional.`,
    `Every visit leaves me feeling great. Best in ${biz.city || 'town'}.`,
    `Such a lovely atmosphere. I won't go anywhere else.`,
  ];
  return `<section class="py-20 px-6 bg-white">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-12">
      <div class="sage-label mb-4">What Clients Say</div>
      <div class="flex items-center justify-center gap-2">
        <span class="text-[#C97C5C] text-xl">${stars(biz.rating)}</span>
        <span class="text-[#2D2D2D] font-semibold ml-1">${biz.rating ?? '4.9'} · ${biz.reviews ?? '35'} reviews</span>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${revs.slice(0, 3).map(r => `
      <div class="card p-7 card-hover">
        <div class="text-[#C97C5C] text-base mb-3">${stars(biz.rating)}</div>
        <p class="text-[#2D2D2D]/75 text-sm leading-relaxed italic mb-5">"${r}"</p>
        <div class="text-[#8FBF9F] text-xs font-bold tracking-widest uppercase">Google Review</div>
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
<body class="bg-[#FAF7F2]">
${nav(biz, baseUrl)}

<!-- Hero -->
<section class="relative" style="min-height:92vh">
  <div class="absolute inset-0 overflow-hidden">
    <img src="${heroImg}" alt="${biz.name}" class="w-full h-full object-cover object-center">
    <!-- Warm cream gradient from bottom — light touch, lets photo show -->
    <div class="absolute inset-0" style="background:linear-gradient(to bottom, rgba(250,247,242,0.15) 0%, rgba(250,247,242,0.3) 50%, rgba(250,247,242,0.92) 85%, #FAF7F2 100%)"></div>
  </div>
  <div class="relative z-10 flex flex-col justify-end h-full max-w-6xl mx-auto px-6 pb-16 pt-32" style="min-height:92vh">
    <div class="max-w-xl">
      <div class="sage-label mb-5">${biz.city || 'Macon'} · ${biz.rating ?? '4.9'} Stars · ${biz.reviews ?? '35'} Reviews</div>
      <h1 class="text-5xl md:text-6xl leading-none mb-3 text-[#2D2D2D]" style="font-family:'Playfair Display',serif;font-weight:700">
        ${biz.heroHeadline}
      </h1>
      ${biz.heroHeadlineEm ? `<h1 class="text-5xl md:text-6xl leading-none mb-6" style="font-family:'Playfair Display',serif;font-weight:700;color:#C97C5C;font-style:italic">${biz.heroHeadlineEm}</h1>` : '<div class="mb-5"></div>'}
      <p class="text-[#8A7E78] text-lg font-light leading-relaxed mb-8 max-w-sm">${biz.heroSub}</p>
      <div class="flex flex-col sm:flex-row gap-3">
        <a href="${baseUrl}/booking" class="btn-copper px-8 py-4 text-sm text-center">Book Your Visit</a>
        <a href="${baseUrl}/services" class="btn-outline px-8 py-4 text-sm text-center">Our Services</a>
      </div>
    </div>
  </div>
</section>

<!-- Services teaser -->
<section class="py-20 px-6 bg-[#FAF7F2]">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between items-end mb-10">
      <div>
        <div class="sage-label mb-3">What We Do</div>
        <h2 class="text-4xl text-[#2D2D2D]" style="font-family:'Playfair Display',serif;font-weight:700">Our Services</h2>
      </div>
      <a href="${baseUrl}/services" class="text-[#C97C5C] font-bold text-sm mt-4 md:mt-0 hover:text-[#b56748] transition-colors flex items-center gap-2 uppercase tracking-wide">View All →</a>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${svcTeaser.map(s => `
      <div class="card p-7 card-hover">
        <div class="w-1 h-10 bg-[#C97C5C] rounded mb-5"></div>
        <h3 class="text-xl text-[#2D2D2D] mb-2" style="font-family:'Playfair Display',serif;font-weight:600">${s.name}</h3>
        <p class="text-[#8A7E78] text-sm leading-relaxed mb-4">${s.desc}</p>
        ${s.price ? `<span class="text-[#C97C5C] font-bold text-sm">${s.price}</span>` : ''}
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- About strip -->
<section class="py-20 px-6 bg-[#F5F1ED]">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div>
        <div class="sage-label mb-5">About The Salon</div>
        <h2 class="text-3xl md:text-4xl text-[#2D2D2D] mb-5 leading-tight" style="font-family:'Playfair Display',serif;font-weight:700">${biz.aboutText}</h2>
        <p class="text-[#8A7E78] leading-relaxed mb-8">${biz.aboutText2}</p>
        <div class="flex gap-10 mb-8">
          ${biz.rating ? `<div><div class="text-3xl text-[#C97C5C]" style="font-family:'Playfair Display',serif;font-weight:700">${biz.rating}</div><div class="text-[#8A7E78] text-xs uppercase tracking-wider mt-1">Stars</div></div>` : ''}
          ${biz.reviews ? `<div><div class="text-3xl text-[#C97C5C]" style="font-family:'Playfair Display',serif;font-weight:700">${biz.reviews}+</div><div class="text-[#8A7E78] text-xs uppercase tracking-wider mt-1">Reviews</div></div>` : ''}
          ${biz.yearsInBiz ? `<div><div class="text-3xl text-[#C97C5C]" style="font-family:'Playfair Display',serif;font-weight:700">${biz.yearsInBiz}</div><div class="text-[#8A7E78] text-xs uppercase tracking-wider mt-1">Years</div></div>` : ''}
        </div>
        <a href="${baseUrl}/about" class="btn-outline px-8 py-3 text-sm inline-block">Meet the Team</a>
      </div>
      <div class="grid grid-cols-2 gap-3">
        ${[1,2,3,4].map(i => `
        <div class="overflow-hidden rounded-lg aspect-square">
          <img src="${photo(i, biz)}" alt="${biz.name}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
        </div>`).join('')}
      </div>
    </div>
  </div>
</section>

<!-- Team teaser -->
${biz.team.length > 0 ? `
<section class="py-20 px-6 bg-white">
  <div class="max-w-6xl mx-auto text-center">
    <div class="sage-label mb-4">The Team</div>
    <h2 class="text-3xl text-[#2D2D2D] mb-12" style="font-family:'Playfair Display',serif;font-weight:700">Meet Your Stylists</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      ${biz.team.slice(0, 4).map(m => `
      <div class="text-center">
        <div class="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-2 border-[#E8E5E1] hover:border-[#8FBF9F] transition-colors">
          ${m.photo
            ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover object-top">`
            : `<div class="w-full h-full bg-[#F5F1ED] flex items-center justify-center text-[#C97C5C] text-2xl" style="font-family:'Playfair Display',serif">${m.name[0]}</div>`
          }
        </div>
        <div class="text-[#2D2D2D] font-bold text-sm" style="font-family:'Playfair Display',serif">${m.name}</div>
        <div class="text-[#8A7E78] text-xs mt-0.5">${m.role}</div>
      </div>`).join('')}
    </div>
    <div class="mt-10">
      <a href="${baseUrl}/booking" class="btn-copper px-8 py-3 text-sm inline-block">Book with Your Stylist</a>
    </div>
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
<body class="bg-[#FAF7F2]">
${nav(biz, baseUrl)}

<section class="pt-32 pb-12 px-6 bg-[#F5F1ED] text-center">
  <div class="sage-label mb-4">What We Offer</div>
  <h1 class="text-5xl text-[#2D2D2D]" style="font-family:'Playfair Display',serif;font-weight:700">Our Services</h1>
  <div class="mt-5 w-10 h-px bg-[#C97C5C] mx-auto"></div>
</section>

<section class="py-16 px-6 bg-[#FAF7F2]">
  <div class="max-w-4xl mx-auto">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      ${biz.services.map(s => `
      <div class="card p-7 card-hover flex gap-5 items-start">
        <div class="w-1 h-full bg-[#C97C5C] rounded flex-shrink-0 mt-1" style="min-height:2.5rem"></div>
        <div class="flex-1">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-xl text-[#2D2D2D]" style="font-family:'Playfair Display',serif;font-weight:600">${s.name}</h3>
            ${s.price ? `<span class="text-[#C97C5C] font-bold text-sm ml-4 whitespace-nowrap">${s.price}</span>` : ''}
          </div>
          <p class="text-[#8A7E78] text-sm leading-relaxed mb-2">${s.desc}</p>
          ${s.duration ? `<span class="text-[#8FBF9F] text-xs font-bold uppercase tracking-wide">${s.duration}</span>` : ''}
        </div>
      </div>`).join('')}
    </div>
    <div class="text-center mt-14">
      <a href="${baseUrl}/booking" class="btn-copper px-10 py-4 text-sm inline-block">Book an Appointment</a>
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
  const allPhotos = biz.photos.length > 0 ? biz.photos : [];

  return `${head(biz, 'Gallery')}
<body class="bg-[#FAF7F2]">
${nav(biz, baseUrl)}

<section class="pt-32 pb-12 px-6 bg-[#F5F1ED] text-center">
  <div class="sage-label mb-4">The Salon</div>
  <h1 class="text-5xl text-[#2D2D2D]" style="font-family:'Playfair Display',serif;font-weight:700">Gallery</h1>
  <div class="mt-5 w-10 h-px bg-[#C97C5C] mx-auto"></div>
</section>

<section class="py-12 px-6 bg-[#FAF7F2]">
  <div class="max-w-6xl mx-auto">
    <!-- Hero grid: first photo large -->
    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
      <div class="overflow-hidden rounded-lg aspect-[3/4] md:row-span-2 md:col-span-1">
        <img src="${allPhotos[0] || ''}" alt="${biz.name}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
      </div>
      ${allPhotos.slice(1, 5).map((p, i) => `
      <div class="overflow-hidden rounded-lg aspect-square">
        <img src="${p}" alt="${biz.name} ${i+2}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
      </div>`).join('')}
    </div>
    ${allPhotos.length > 5 ? `
    <div class="grid grid-cols-3 md:grid-cols-4 gap-3">
      ${allPhotos.slice(5).map((p, i) => `
      <div class="overflow-hidden rounded-lg aspect-square">
        <img src="${p}" alt="${biz.name} ${i+6}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
      </div>`).join('')}
    </div>` : ''}
  </div>
</section>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ABOUT / TEAM PAGE
// ══════════════════════════════════════════════════════════════════════════════

export function buildMintAboutPage(biz: BizPageData, baseUrl: string): string {
  const teamGrid = biz.team.map(m => `
  <div class="text-center">
    <div class="w-36 h-36 mx-auto mb-5 rounded-full overflow-hidden border-2 border-[#E8E5E1] hover:border-[#8FBF9F] transition-colors">
      ${m.photo
        ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover object-top">`
        : `<div class="w-full h-full bg-[#F5F1ED] flex items-center justify-center text-[#C97C5C] text-3xl" style="font-family:'Playfair Display',serif">${m.name[0]}</div>`
      }
    </div>
    <h3 class="text-xl text-[#2D2D2D] mb-1" style="font-family:'Playfair Display',serif;font-weight:600">${m.name}</h3>
    <div class="text-[#C97C5C] text-xs font-bold uppercase tracking-widest mb-3">${m.role}</div>
    ${m.bio ? `<p class="text-[#8A7E78] text-sm leading-relaxed max-w-xs mx-auto">${m.bio}</p>` : ''}
  </div>`).join('');

  return `${head(biz, 'Our Team')}
<body class="bg-[#FAF7F2]">
${nav(biz, baseUrl)}

<section class="pt-32 pb-12 px-6 bg-[#F5F1ED] text-center">
  <div class="sage-label mb-4">The People</div>
  <h1 class="text-5xl text-[#2D2D2D]" style="font-family:'Playfair Display',serif;font-weight:700">Our Team</h1>
  <div class="mt-5 w-10 h-px bg-[#C97C5C] mx-auto"></div>
</section>

<section class="py-16 px-6 bg-[#FAF7F2]">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
      <div>
        <h2 class="text-3xl md:text-4xl text-[#2D2D2D] mb-5 leading-tight" style="font-family:'Playfair Display',serif;font-weight:700">${biz.aboutText}</h2>
        <div class="w-10 h-px bg-[#C97C5C] mb-6"></div>
        <p class="text-[#8A7E78] text-lg leading-relaxed mb-8">${biz.aboutText2}</p>
        <div class="flex gap-8">
          ${biz.rating ? `<div><div class="text-3xl text-[#C97C5C]" style="font-family:'Playfair Display',serif;font-weight:700">${biz.rating}</div><div class="text-[#8A7E78] text-xs uppercase tracking-wider mt-1">Stars</div></div>` : ''}
          ${biz.reviews ? `<div><div class="text-3xl text-[#C97C5C]" style="font-family:'Playfair Display',serif;font-weight:700">${biz.reviews}+</div><div class="text-[#8A7E78] text-xs uppercase tracking-wider mt-1">Reviews</div></div>` : ''}
        </div>
      </div>
      <div class="overflow-hidden rounded-lg aspect-[4/5]">
        <img src="${photo(1, biz)}" alt="${biz.name}" class="w-full h-full object-cover">
      </div>
    </div>

    ${teamGrid ? `
    <h2 class="text-3xl text-[#2D2D2D] mb-12 text-center" style="font-family:'Playfair Display',serif;font-weight:700">Meet the Stylists</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(biz.team.length, 4)} gap-10">
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
// BOOKING PAGE — warm boutique style, Fresha-inspired
// ══════════════════════════════════════════════════════════════════════════════

export function buildMintBookingPage(biz: BizPageData, baseUrl: string): string {
  const cat = biz.businessCategory;
  const hasStylistStep = ['salon', 'barber', 'beauty', 'fitness', 'gym'].includes(cat);
  const totalSteps = hasStylistStep ? 4 : 3;
  const phoneClean = biz.phone?.replace(/[^0-9+]/g, '') || '';

  const serviceCards = biz.services.map(s => `
    <div class="svc-card cursor-pointer bg-white border-2 border-[#E8E5E1] rounded-lg p-5 hover:border-[#8FBF9F] transition-all duration-200 flex gap-4 items-start"
         onclick="selectService(this,'${s.name.replace(/'/g,"\\'")}','${s.price}','${s.duration || '60 min'}')"
         data-name="${s.name}">
      <div class="w-1 rounded flex-shrink-0 mt-1 bg-[#C97C5C]" style="min-height:2rem"></div>
      <div class="flex-1">
        <div class="flex justify-between items-start">
          <h3 class="font-bold text-[#2D2D2D] text-sm" style="font-family:'Playfair Display',serif">${s.name}</h3>
          ${s.price ? `<span class="text-[#C97C5C] font-bold text-sm ml-3 whitespace-nowrap">${s.price}</span>` : ''}
        </div>
        <p class="text-[#8A7E78] text-xs leading-relaxed mt-1">${s.desc}</p>
      </div>
    </div>`).join('');

  const teamForWidget = [...biz.team, { name: 'Any Available', role: 'First available stylist', photo: undefined }];
  const stylistCards = teamForWidget.map(m => `
    <div class="team-card cursor-pointer bg-white border-2 border-[#E8E5E1] rounded-lg p-4 hover:border-[#8FBF9F] transition-all duration-200 text-center"
         onclick="selectStyleist(this,'${m.name.replace(/'/g,"\\'")}')">
      <div class="w-16 h-16 mx-auto mb-3 overflow-hidden rounded-full border-2 border-[#E8E5E1]">
        ${m.photo
          ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover object-top">`
          : `<div class="w-full h-full bg-[#F5F1ED] flex items-center justify-center text-[#C97C5C] text-xl" style="font-family:'Playfair Display',serif">${m.name[0]}</div>`
        }
      </div>
      <div class="text-[#2D2D2D] text-sm font-bold" style="font-family:'Playfair Display',serif">${m.name}</div>
      <div class="text-[#8A7E78] text-xs mt-0.5">${m.role}</div>
    </div>`).join('');

  return `${head(biz, 'Book')}
<body class="bg-[#FAF7F2]">
${nav(biz, baseUrl)}

<section class="pt-32 pb-12 px-6 bg-[#F5F1ED] text-center">
  <div class="sage-label mb-4">Reserve Your Spot</div>
  <h1 class="text-5xl text-[#2D2D2D]" style="font-family:'Playfair Display',serif;font-weight:700">Book an Appointment</h1>
  <div class="mt-5 w-10 h-px bg-[#C97C5C] mx-auto"></div>
</section>

<style>
.svc-card.selected,.team-card.selected{border-color:#8FBF9F!important;background:#F0F8F4!important}
.slot{padding:.4rem .9rem;border:1.5px solid #E8E5E1;border-radius:6px;font-size:.75rem;cursor:pointer;color:#2D2D2D;transition:all .2s;background:#fff;font-family:'Lato',sans-serif}
.slot:hover{border-color:#8FBF9F;color:#5a8a6a}
.slot.selected{background:#8FBF9F!important;border-color:#8FBF9F!important;color:#fff!important;font-weight:700}
.slot.booked{opacity:.3;cursor:default;pointer-events:none;text-decoration:line-through}
.cal-day{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer;font-size:.82rem;transition:all .2s;color:#8A7E78;font-family:'Lato',sans-serif}
.cal-day:hover:not(.past):not(.empty){background:#F5F1ED;color:#2D2D2D}
.cal-day.selected{background:#C97C5C!important;color:#fff!important;font-weight:700}
.cal-day.past,.cal-day.empty{opacity:.25;cursor:default;pointer-events:none}
.cal-day.today{border:1.5px solid #8FBF9F;color:#2D2D2D;font-weight:700}
.step-dot{width:32px;height:32px;border-radius:50%;border:2px solid #E8E5E1;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#B8B0AA;transition:all .3s;background:#fff;font-family:'Lato',sans-serif}
.step-dot.active{border-color:#C97C5C;color:#C97C5C;background:#FEF3EF}
.step-dot.done{background:#C97C5C;border-color:#C97C5C;color:#fff}
.step-line{flex:1;height:2px;background:#E8E5E1;margin:0 4px;border-radius:1px}
</style>

<section class="py-16 px-4 bg-[#FAF7F2]">
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
      <div class="text-[#C97C5C] text-xs font-bold tracking-widest uppercase mb-2">Step 1 of ${totalSteps}</div>
      <h2 class="text-2xl text-[#2D2D2D] mb-6" style="font-family:'Playfair Display',serif;font-weight:600">Choose a Service</h2>
      <div class="space-y-3">${serviceCards}</div>
    </div>

    ${hasStylistStep ? `
    <div id="panel-2" class="hidden">
      <div class="text-[#C97C5C] text-xs font-bold tracking-widest uppercase mb-2">Step 2 of ${totalSteps}</div>
      <h2 class="text-2xl text-[#2D2D2D] mb-2" style="font-family:'Playfair Display',serif;font-weight:600">Choose Your Stylist</h2>
      <p class="text-[#8A7E78] text-sm mb-6">Selected: <span id="chosen-service" class="text-[#2D2D2D] font-bold"></span></p>
      <div class="grid grid-cols-2 gap-3">${stylistCards}</div>
      <button onclick="goStep(1)" class="mt-6 text-[#8A7E78] text-sm hover:text-[#C97C5C] transition-colors">← Back</button>
    </div>` : ''}

    <!-- Panel 3: Date + Time -->
    <div id="panel-3" class="hidden">
      <div class="text-[#C97C5C] text-xs font-bold tracking-widest uppercase mb-2">Step ${hasStylistStep ? 3 : 2} of ${totalSteps}</div>
      <h2 class="text-2xl text-[#2D2D2D] mb-2" style="font-family:'Playfair Display',serif;font-weight:600">Pick a Date & Time</h2>
      ${hasStylistStep
        ? `<p class="text-[#8A7E78] text-sm mb-6">With: <span id="chosen-stylist" class="text-[#2D2D2D] font-bold"></span></p>`
        : `<p class="text-[#8A7E78] text-sm mb-6">Service: <span id="chosen-service-3" class="text-[#2D2D2D] font-bold"></span></p>`
      }
      <div class="bg-white rounded-lg border border-[#E8E5E1] p-5 mb-5">
        <div class="flex items-center justify-between mb-4">
          <button onclick="calPrev()" class="text-[#8A7E78] hover:text-[#C97C5C] transition-colors text-xl leading-none">‹</button>
          <div class="font-bold text-[#2D2D2D] text-sm" id="cal-month-label" style="font-family:'Playfair Display',serif"></div>
          <button onclick="calNext()" class="text-[#8A7E78] hover:text-[#C97C5C] transition-colors text-xl leading-none">›</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center mb-2">
          ${['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<div class="text-[#8A7E78]/50 text-xs font-bold">${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1 justify-items-center" id="cal-grid"></div>
      </div>
      <div id="slots-container" class="hidden">
        <div class="text-[#8A7E78] text-xs font-bold uppercase tracking-wider mb-3">Available Times — <span id="slots-date-label"></span></div>
        <div class="flex flex-wrap gap-2" id="slots-grid"></div>
      </div>
      <button onclick="goStep(${hasStylistStep ? 2 : 1})" class="mt-6 text-[#8A7E78] text-sm hover:text-[#C97C5C] transition-colors">← Back</button>
    </div>

    <!-- Panel 4: Details -->
    <div id="panel-4" class="hidden">
      <div class="text-[#C97C5C] text-xs font-bold tracking-widest uppercase mb-2">Step ${totalSteps} of ${totalSteps}</div>
      <h2 class="text-2xl text-[#2D2D2D] mb-2" style="font-family:'Playfair Display',serif;font-weight:600">Your Details</h2>
      <p class="text-[#8A7E78] text-sm mb-6"><span id="summary-line" class="text-[#2D2D2D] font-bold"></span></p>
      <div class="space-y-4">
        <div><label class="block text-[#8A7E78] text-xs font-bold uppercase tracking-wider mb-2">Full Name</label><input type="text" id="bk-name" placeholder="Your name"></div>
        <div><label class="block text-[#8A7E78] text-xs font-bold uppercase tracking-wider mb-2">Email</label><input type="email" id="bk-email" placeholder="your@email.com"></div>
        <div><label class="block text-[#8A7E78] text-xs font-bold uppercase tracking-wider mb-2">Phone</label><input type="tel" id="bk-phone" placeholder="(555) 000-0000"></div>
        <button onclick="submitBooking()" class="btn-copper w-full py-4 text-sm mt-2">Confirm Appointment</button>
      </div>
      <button onclick="goStep(${hasStylistStep ? 3 : 2})" class="mt-5 text-[#8A7E78] text-sm hover:text-[#C97C5C] transition-colors">← Back</button>
    </div>

    <!-- Success -->
    <div id="panel-success" class="hidden text-center py-8">
      <div class="w-16 h-16 rounded-full bg-[#8FBF9F] flex items-center justify-center mx-auto mb-6 text-white text-2xl">✓</div>
      <h2 class="text-3xl text-[#2D2D2D] mb-4" style="font-family:'Playfair Display',serif;font-weight:700">All set!</h2>
      <p class="text-[#8A7E78] mb-2">Thanks <span id="success-name" class="text-[#2D2D2D] font-bold"></span> — we've received your request.</p>
      <p class="text-[#8A7E78] mb-8">We'll call <span id="success-phone" class="text-[#C97C5C] font-bold"></span> to confirm shortly.</p>
      ${biz.phone ? `<p class="text-[#8A7E78] text-sm">Questions? <a href="tel:${phoneClean}" class="text-[#C97C5C] hover:underline font-bold">${biz.phone}</a></p>` : ''}
    </div>

    <!-- Contact strip -->
    <div class="mt-14 pt-10 border-t border-[#E8E5E1] grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm text-[#8A7E78]">
      ${biz.phone ? `<div><div class="text-[#C97C5C] text-xs font-bold uppercase tracking-wider mb-2">Call</div><a href="tel:${phoneClean}" class="hover:text-[#C97C5C] font-bold">${biz.phone}</a></div>` : ''}
      ${biz.address ? `<div><div class="text-[#C97C5C] text-xs font-bold uppercase tracking-wider mb-2">Find Us</div>${biz.address}</div>` : ''}
      <div><div class="text-[#C97C5C] text-xs font-bold uppercase tracking-wider mb-2">Hours</div>${biz.hours || 'Tue–Sat 9am–6pm'}</div>
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
// EXPORT
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
