/**
 * Multi-page website demo builder.
 * Generates 5 separate HTML pages in the mnp4thsv dark-luxury style:
 *   home, services, gallery, about, booking
 *
 * Design: Playfair Display + DM Sans, #0f0a05 bg, gold/brown accents, Tailwind CDN.
 */

export interface BizPageData {
  name:          string;
  type:          string;
  phone:         string | null;
  address:       string | null;
  city:          string | null;
  state:         string | null;
  rating:        number | null;
  reviews:       number | null;
  photos:        string[];           // real photo URLs
  hours:         string;
  colorPrimary:  string;             // e.g. #9B6F42
  colorAccent:   string;             // e.g. #C9A55A
  heroHeadline:  string;
  heroHeadlineEm: string;
  heroSub:       string;
  aboutText:     string;             // about headline / tagline
  aboutText2:    string;             // about body paragraph
  ctaText:       string;
  services:      Array<{ name: string; desc: string; price: string; duration?: string }>;
  reviewTexts:   string[];
  yearsInBiz:    string;
  teamName:      string;             // first name of owner/lead stylist
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function photo(idx: number, biz: BizPageData, fallback = ''): string {
  return biz.photos[idx] || fallback || `https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80`;
}

function stars(rating: number | null): string {
  const n = Math.round(rating || 4.8);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// ── Shared HTML head ──────────────────────────────────────────────────────────

function head(biz: BizPageData, pageTitle: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageTitle} — ${biz.name}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{colors:{primary:'${biz.colorPrimary}',accent:'${biz.colorAccent}'}}}}</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');
body{font-family:'DM Sans',sans-serif}
.serif{font-family:'Playfair Display',serif}
h1,h2,h3{font-family:'Playfair Display',serif}
</style>
</head>`;
}

// ── Shared nav ────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string): string {
  return `<nav class="fixed top-0 left-0 right-0 z-50 bg-[#0f0a05]/90 backdrop-blur-sm border-b border-[${biz.colorPrimary}]/20">
  <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="${baseUrl}">
      <span class="serif text-accent text-xl tracking-wide">${biz.name}</span>
      <div class="text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mt-0.5">${biz.city || ''}, ${biz.state || ''}</div>
    </a>
    <div class="hidden md:flex items-center gap-8 text-sm tracking-wider text-[#c5b49a]">
      <a href="${baseUrl}/services" class="hover:text-accent transition-colors">Services</a>
      <a href="${baseUrl}/gallery" class="hover:text-accent transition-colors">Gallery</a>
      <a href="${baseUrl}/about" class="hover:text-accent transition-colors">About</a>
      <a href="${baseUrl}/booking" class="bg-accent text-[#0f0a05] px-5 py-2 rounded-sm font-medium hover:bg-primary transition-colors">Book Now</a>
    </div>
    <button id="menu-btn" class="md:hidden text-accent" aria-label="Menu">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
  </div>
  <div id="mobile-menu" class="hidden md:hidden bg-[#150d05] border-t border-[${biz.colorPrimary}]/20 px-6 py-4 flex flex-col gap-4 text-sm text-[#c5b49a]">
    <a href="${baseUrl}/services" class="hover:text-accent py-1">Services</a>
    <a href="${baseUrl}/gallery" class="hover:text-accent py-1">Gallery</a>
    <a href="${baseUrl}/about" class="hover:text-accent py-1">About</a>
    <a href="${baseUrl}/booking" class="bg-accent text-[#0f0a05] px-5 py-2.5 rounded-sm font-medium text-center mt-1">Book Now</a>
  </div>
</nav>
<script>document.getElementById('menu-btn').addEventListener('click',()=>document.getElementById('mobile-menu').classList.toggle('hidden'));</script>`;
}

// ── Shared footer ─────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `<footer class="bg-[#080503] border-t border-[${biz.colorPrimary}]/20 py-12 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col md:flex-row justify-between items-start gap-10">
      <div>
        <div class="serif text-accent text-2xl mb-2">${biz.name}</div>
        <div class="text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mb-6">${biz.city || ''}, ${biz.state || ''}${biz.yearsInBiz ? ' · Est. ' + (new Date().getFullYear() - parseInt(biz.yearsInBiz)) : ''}</div>
        <div class="space-y-2 text-[#9d8e7e] text-sm">
          ${biz.address ? `<div>${biz.address}</div>` : ''}
          ${biz.phone ? `<div><a href="tel:${biz.phone.replace(/[^0-9+]/g, '')}" class="hover:text-accent transition-colors">${biz.phone}</a></div>` : ''}
        </div>
      </div>
      <div>
        <div class="text-accent text-xs tracking-[0.3em] uppercase mb-4">Hours</div>
        <div class="text-sm text-[#9d8e7e]">${biz.hours || 'Mon–Sat 9am–6pm'}</div>
      </div>
      <div>
        <div class="text-accent text-xs tracking-[0.3em] uppercase mb-4">Quick Links</div>
        <div class="space-y-2 text-sm text-[#9d8e7e]">
          <div><a href="${baseUrl}/services" class="hover:text-accent transition-colors">Services</a></div>
          <div><a href="${baseUrl}/gallery" class="hover:text-accent transition-colors">Gallery</a></div>
          <div><a href="${baseUrl}/about" class="hover:text-accent transition-colors">About</a></div>
          <div><a href="${baseUrl}/booking" class="hover:text-accent transition-colors">Book Now</a></div>
        </div>
      </div>
    </div>
    <div class="mt-10 pt-8 border-t border-[${biz.colorPrimary}]/15 text-[#4a3f35] text-xs flex justify-between flex-wrap gap-2">
      <span>© ${new Date().getFullYear()} ${biz.name}. All rights reserved.</span>
      <span>Serving ${biz.city || 'the community'} with pride.</span>
    </div>
  </div>
</footer>`;
}

// ── Page section header ───────────────────────────────────────────────────────

function pageHeader(eyebrow: string, title: string, biz: BizPageData): string {
  return `<section class="pt-32 pb-16 px-6 bg-[#0f0a05] border-b border-[${biz.colorPrimary}]/20">
  <div class="max-w-4xl mx-auto text-center">
    <div class="text-accent text-xs tracking-[0.3em] uppercase mb-4">${eyebrow}</div>
    <h1 class="serif text-5xl md:text-6xl text-[#f5ede0] font-semibold leading-tight">${title}</h1>
    <div class="mt-6 w-16 h-px bg-accent mx-auto"></div>
  </div>
</section>`;
}

// ── CTA section ───────────────────────────────────────────────────────────────

function ctaSection(biz: BizPageData, baseUrl: string): string {
  return `<section class="py-20 px-6 bg-[#0c0804]">
  <div class="max-w-2xl mx-auto text-center">
    <div class="text-accent text-xs tracking-[0.3em] uppercase mb-4">Ready to Book?</div>
    <h2 class="serif text-4xl text-[#f5ede0] font-semibold mb-6">${biz.ctaText || 'Book your appointment today.'}</h2>
    <div class="w-16 h-px bg-accent mx-auto mb-8"></div>
    <a href="${baseUrl}/booking" class="inline-block bg-accent text-[#0f0a05] px-10 py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary transition-colors rounded-sm">
      Book Your Visit
    </a>
    ${biz.phone ? `<p class="mt-6 text-[#9d8e7e] text-sm">Or call us: <a href="tel:${biz.phone.replace(/[^0-9+]/g,'')}" class="text-accent hover:underline">${biz.phone}</a></p>` : ''}
  </div>
</section>`;
}

// ── Reviews strip ─────────────────────────────────────────────────────────────

function reviewsStrip(biz: BizPageData): string {
  const revs = biz.reviewTexts.length >= 3 ? biz.reviewTexts : [
    ...biz.reviewTexts,
    `Absolutely the best ${biz.type} in ${biz.city || 'the area'}. Will keep coming back.`,
    `Professional, warm, and talented. Highly recommend.`,
    `Such a wonderful experience every single time.`,
  ];
  return `<section class="py-16 px-6 bg-[#0c0804] border-y border-[${biz.colorPrimary}]/15">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-10">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">What Our Clients Say</div>
      <div class="flex items-center justify-center gap-2">
        <span class="text-accent text-xl">${stars(biz.rating)}</span>
        <span class="text-[#9B6F42] text-sm">${biz.rating ?? '4.8'} stars · ${biz.reviews ?? '50'}+ reviews</span>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      ${revs.slice(0, 3).map((r, i) => `
      <div class="text-center px-4${i > 0 ? ' border-t md:border-t-0 md:border-l border-[' + biz.colorPrimary + ']/20 pt-8 md:pt-0' : ''}">
        <div class="text-accent text-lg mb-3">${stars(biz.rating)}</div>
        <p class="text-[#9d8e7e] text-sm italic leading-relaxed">"${r}"</p>
        <div class="text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mt-4">— Google Review</div>
      </div>`).join('')}
    </div>
  </div>
</section>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: HOME
// ══════════════════════════════════════════════════════════════════════════════

function buildHomePage(biz: BizPageData, baseUrl: string): string {
  const heroImg = photo(0, biz);
  const svcTeaser = biz.services.slice(0, 3);

  const servicesTeaser = `<section class="py-24 px-6 bg-[#0f0a05]">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-4">What We Offer</div>
      <h2 class="serif text-4xl md:text-5xl text-[#f5ede0] font-semibold">Our Services</h2>
      <div class="mt-4 w-16 h-px bg-accent mx-auto"></div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
      ${svcTeaser.map(s => `
      <div class="bg-[#150d05] border border-[${biz.colorPrimary}]/20 rounded-sm p-8 hover:scale-105 transition-all duration-300 hover:border-accent/40">
        <div class="text-accent text-2xl mb-4">✦</div>
        <h3 class="serif text-xl text-[#f5ede0] mb-3">${s.name}</h3>
        <p class="text-[#9d8e7e] text-sm leading-relaxed mb-5">${s.desc}</p>
        ${s.price ? `<div class="text-accent font-medium tracking-wide">${s.price}</div>` : ''}
      </div>`).join('')}
    </div>
    <div class="text-center">
      <a href="${baseUrl}/services" class="inline-block border border-[${biz.colorPrimary}]/60 text-[#c5b49a] px-8 py-3 text-sm tracking-widest uppercase hover:border-accent hover:text-accent transition-colors rounded-sm">
        View All Services
      </a>
    </div>
  </div>
</section>`;

  const galleryTeaser = biz.photos.length > 1 ? `<section class="py-24 px-6 bg-[#0c0804]">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-4">The Salon</div>
      <h2 class="serif text-4xl md:text-5xl text-[#f5ede0] font-semibold">A Glimpse Inside</h2>
      <div class="mt-4 w-16 h-px bg-accent mx-auto"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      ${[1,2,3].map(i => `
      <div class="overflow-hidden rounded-sm aspect-[4/5]${i === 2 ? ' md:mt-8' : ''}">
        <img src="${photo(i, biz)}" alt="${biz.name}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
      </div>`).join('')}
    </div>
    <div class="text-center">
      <a href="${baseUrl}/gallery" class="inline-block border border-[${biz.colorPrimary}]/60 text-[#c5b49a] px-8 py-3 text-sm tracking-widest uppercase hover:border-accent hover:text-accent transition-colors rounded-sm">
        View Full Gallery
      </a>
    </div>
  </div>
</section>` : '';

  return `${head(biz, 'Welcome')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}

<section class="relative min-h-screen flex items-center justify-center">
  <div class="absolute inset-0 z-0">
    <img src="${heroImg}" alt="${biz.name}" class="w-full h-full object-cover object-center">
    <div class="absolute inset-0 bg-gradient-to-b from-[#0f0a05]/70 via-[#0f0a05]/50 to-[#0f0a05]"></div>
  </div>
  <div class="relative z-10 text-center max-w-3xl mx-auto px-6 pt-24 pb-32">
    <div class="text-accent text-xs tracking-[0.3em] uppercase mb-6">${biz.city || ''} · Est. ${new Date().getFullYear() - parseInt(biz.yearsInBiz || '5')}</div>
    <h1 class="serif text-5xl md:text-7xl font-semibold text-[#f5ede0] leading-tight mb-6">
      ${biz.heroHeadline}${biz.heroHeadlineEm ? `<br><em class="text-accent">${biz.heroHeadlineEm}</em>` : ''}
    </h1>
    <p class="text-[#c5b49a] text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed mb-10">${biz.heroSub}</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="${baseUrl}/booking" class="bg-accent text-[#0f0a05] px-8 py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary transition-colors rounded-sm">Book Your Visit</a>
      <a href="${baseUrl}/services" class="border border-[${biz.colorPrimary}]/60 text-[#c5b49a] px-8 py-4 text-sm tracking-widest uppercase font-medium hover:border-accent hover:text-accent transition-colors rounded-sm">View Services</a>
    </div>
    ${biz.rating ? `<div class="mt-14 flex items-center justify-center gap-2">
      <span class="text-accent text-lg">${stars(biz.rating)}</span>
      <span class="text-[${biz.colorPrimary}] text-sm ml-1">${biz.rating} stars · ${biz.reviews ?? ''} reviews</span>
    </div>` : ''}
  </div>
  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
    <svg class="w-5 h-5 text-[${biz.colorPrimary}]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
  </div>
</section>

${servicesTeaser}
${galleryTeaser}
${reviewsStrip(biz)}
${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: SERVICES
// ══════════════════════════════════════════════════════════════════════════════

function buildServicesPage(biz: BizPageData, baseUrl: string): string {
  const icons = ['✦','✧','◈','◇','✦','✧','♛','✦'];
  const grid = biz.services.map((s, i) => `
  <div class="group bg-[#150d05] border border-[${biz.colorPrimary}]/20 rounded-sm p-8 hover:scale-105 transition-all duration-300 hover:border-accent/40 hover:bg-[#1a1008]">
    <div class="text-accent text-2xl mb-4">${icons[i % icons.length]}</div>
    <h3 class="serif text-xl text-[#f5ede0] mb-3">${s.name}</h3>
    <p class="text-[#9d8e7e] text-sm leading-relaxed mb-5">${s.desc}</p>
    <div class="flex items-center justify-between">
      ${s.price ? `<div class="text-accent font-medium tracking-wide">${s.price}</div>` : '<div></div>'}
      ${s.duration ? `<div class="text-[${biz.colorPrimary}] text-xs tracking-wider uppercase">${s.duration}</div>` : ''}
    </div>
  </div>`).join('');

  return `${head(biz, 'Services')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('What We Offer', 'Our Services', biz)}

<section class="py-20 px-6 bg-[#0f0a05]">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${grid}
    </div>
  </div>
</section>

${reviewsStrip(biz)}
${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: GALLERY
// ══════════════════════════════════════════════════════════════════════════════

function buildGalleryPage(biz: BizPageData, baseUrl: string): string {
  const allPhotos = biz.photos.length > 0 ? biz.photos : Array(8).fill(`https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=80`);

  const mainGrid = allPhotos.slice(0, 3).map((p, i) => `
  <div class="overflow-hidden rounded-sm aspect-[4/5]${i === 1 ? ' md:mt-8' : ''}">
    <img src="${p}" alt="${biz.name} — photo ${i+1}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
  </div>`).join('');

  const secondGrid = allPhotos.length > 3 ? `
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
    ${allPhotos.slice(3, 7).map((p, i) => `
    <div class="overflow-hidden rounded-sm aspect-square">
      <img src="${p}" alt="${biz.name} — photo ${i+4}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
    </div>`).join('')}
  </div>` : '';

  const extraGrid = allPhotos.length > 7 ? `
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
    ${allPhotos.slice(7).map((p, i) => `
    <div class="overflow-hidden rounded-sm aspect-[3/2]">
      <img src="${p}" alt="${biz.name} — photo ${i+8}" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500">
    </div>`).join('')}
  </div>` : '';

  return `${head(biz, 'Gallery')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('The Salon', 'Our Gallery', biz)}

<section class="py-20 px-6 bg-[#0c0804]">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      ${mainGrid}
    </div>
    ${secondGrid}
    ${extraGrid}
  </div>
</section>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: ABOUT
// ══════════════════════════════════════════════════════════════════════════════

function buildAboutPage(biz: BizPageData, baseUrl: string): string {
  const aboutImg = photo(4, biz, photo(1, biz));

  return `${head(biz, 'About')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('Our Story', 'About Us', biz)}

<section class="py-20 px-6 bg-[#0f0a05]">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col md:flex-row gap-16 items-center">
      <div class="flex-1 order-2 md:order-1">
        <div class="text-accent text-xs tracking-[0.3em] uppercase mb-6">Our Story</div>
        <h2 class="serif text-4xl md:text-5xl text-[#f5ede0] font-semibold leading-tight mb-6">${biz.aboutText}</h2>
        <div class="w-16 h-px bg-accent mb-8"></div>
        <p class="text-[#9d8e7e] text-lg leading-relaxed mb-10">${biz.aboutText2}</p>
        <div class="grid grid-cols-3 gap-6 mb-10">
          ${biz.yearsInBiz ? `<div class="border-l border-accent pl-4">
            <div class="serif text-3xl text-accent font-semibold">${biz.yearsInBiz}+</div>
            <div class="text-[#9d8e7e] text-xs uppercase tracking-wider mt-1">Years Serving ${biz.city || 'The Area'}</div>
          </div>` : ''}
          ${biz.rating ? `<div class="border-l border-accent pl-4">
            <div class="serif text-3xl text-accent font-semibold">${biz.rating}</div>
            <div class="text-[#9d8e7e] text-xs uppercase tracking-wider mt-1">Star Rating</div>
          </div>` : ''}
          ${biz.reviews ? `<div class="border-l border-accent pl-4">
            <div class="serif text-3xl text-accent font-semibold">${biz.reviews}</div>
            <div class="text-[#9d8e7e] text-xs uppercase tracking-wider mt-1">Reviews</div>
          </div>` : ''}
        </div>
        <a href="${baseUrl}/booking" class="inline-block bg-accent text-[#0f0a05] px-8 py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary transition-colors rounded-sm">Book a Visit</a>
      </div>
      <div class="flex-1 order-1 md:order-2">
        <div class="relative">
          <div class="absolute -top-4 -left-4 w-full h-full border border-accent/30 rounded-sm pointer-events-none"></div>
          <img src="${aboutImg}" alt="${biz.name}" class="w-full rounded-sm object-cover aspect-[4/5] relative z-10">
          <div class="absolute -bottom-6 -right-6 bg-[#150d05] border border-accent/30 px-6 py-4 rounded-sm z-20">
            <div class="serif text-accent text-sm italic">"In good hands."</div>
            <div class="text-[#9d8e7e] text-xs mt-1 tracking-wider">— ${biz.teamName}${biz.city ? ', ' + biz.city : ''}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

${reviewsStrip(biz)}
${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: BOOKING
// ══════════════════════════════════════════════════════════════════════════════

function buildBookingPage(biz: BizPageData, baseUrl: string): string {
  const svcOptions = biz.services.map(s =>
    `<option value="${s.name}">${s.name}${s.price ? ' — ' + s.price : ''}${s.duration ? ' (' + s.duration + ')' : ''}</option>`
  ).join('');

  return `${head(biz, 'Book')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('Reserve Your Spot', 'Book an Appointment', biz)}

<section class="py-20 px-6 bg-[#0f0a05]">
  <div class="max-w-2xl mx-auto">

    <!-- Booking form -->
    <div id="booking-form" class="bg-[#150d05] border border-[${biz.colorPrimary}]/20 rounded-sm p-8 md:p-10">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step 1 of 1</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-8">Your Details</h2>

      <form id="bk-form" class="space-y-5" onsubmit="submitBooking(event)">
        <div>
          <label class="block text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mb-2">Your Name</label>
          <input type="text" id="bk-name" required placeholder="Full name"
            class="w-full bg-[#0f0a05] border border-[${biz.colorPrimary}]/30 rounded-sm px-4 py-3 text-[#e8ddd0] placeholder-[#4a3f35] focus:outline-none focus:border-accent transition-colors">
        </div>
        <div>
          <label class="block text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mb-2">Phone Number</label>
          <input type="tel" id="bk-phone" required placeholder="(555) 000-0000"
            class="w-full bg-[#0f0a05] border border-[${biz.colorPrimary}]/30 rounded-sm px-4 py-3 text-[#e8ddd0] placeholder-[#4a3f35] focus:outline-none focus:border-accent transition-colors">
        </div>
        <div>
          <label class="block text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mb-2">Service</label>
          <select id="bk-service" required
            class="w-full bg-[#0f0a05] border border-[${biz.colorPrimary}]/30 rounded-sm px-4 py-3 text-[#e8ddd0] focus:outline-none focus:border-accent transition-colors appearance-none">
            <option value="">Select a service...</option>
            ${svcOptions}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mb-2">Preferred Date</label>
            <input type="date" id="bk-date" required
              class="w-full bg-[#0f0a05] border border-[${biz.colorPrimary}]/30 rounded-sm px-4 py-3 text-[#e8ddd0] focus:outline-none focus:border-accent transition-colors">
          </div>
          <div>
            <label class="block text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mb-2">Preferred Time</label>
            <select id="bk-time"
              class="w-full bg-[#0f0a05] border border-[${biz.colorPrimary}]/30 rounded-sm px-4 py-3 text-[#e8ddd0] focus:outline-none focus:border-accent transition-colors appearance-none">
              <option>9:00 AM</option><option>9:30 AM</option><option>10:00 AM</option>
              <option>10:30 AM</option><option>11:00 AM</option><option>11:30 AM</option>
              <option>12:00 PM</option><option>1:00 PM</option><option>1:30 PM</option>
              <option>2:00 PM</option><option>2:30 PM</option><option>3:00 PM</option>
              <option>3:30 PM</option><option>4:00 PM</option><option>4:30 PM</option>
            </select>
          </div>
        </div>
        <button type="submit"
          class="w-full bg-accent text-[#0f0a05] py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary transition-colors rounded-sm mt-2">
          Request Appointment
        </button>
      </form>
    </div>

    <!-- Success state -->
    <div id="booking-success" class="hidden bg-[#150d05] border border-accent/30 rounded-sm p-10 text-center">
      <div class="text-accent text-4xl mb-4">✦</div>
      <h2 class="serif text-3xl text-[#f5ede0] mb-4">You're all set!</h2>
      <p class="text-[#9d8e7e] mb-6">We've received your request. <span id="success-name" class="text-[#c5b49a]"></span></p>
      <p class="text-[#9d8e7e] mb-8">We'll call <span id="success-phone" class="text-accent"></span> to confirm your appointment — usually within a few hours.</p>
      ${biz.phone ? `<p class="text-[#9d8e7e] text-sm">Questions? Call us: <a href="tel:${biz.phone.replace(/[^0-9+]/g,'')}" class="text-accent hover:underline">${biz.phone}</a></p>` : ''}
    </div>

    <!-- Contact info -->
    <div class="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm text-[#9d8e7e]">
      ${biz.phone ? `<div><div class="text-accent text-xs tracking-widest uppercase mb-2">Phone</div><a href="tel:${biz.phone.replace(/[^0-9+]/g,'')}" class="hover:text-accent">${biz.phone}</a></div>` : ''}
      ${biz.address ? `<div><div class="text-accent text-xs tracking-widest uppercase mb-2">Address</div>${biz.address}</div>` : ''}
      <div><div class="text-accent text-xs tracking-widest uppercase mb-2">Hours</div>${biz.hours || 'Mon–Sat 9am–6pm'}</div>
    </div>
  </div>
</section>

<script>
function submitBooking(e) {
  e.preventDefault();
  var name = document.getElementById('bk-name').value;
  var phone = document.getElementById('bk-phone').value;
  document.getElementById('success-name').textContent = name + ',';
  document.getElementById('success-phone').textContent = phone;
  document.getElementById('booking-form').classList.add('hidden');
  document.getElementById('booking-success').classList.remove('hidden');
  window.scrollTo({top: document.getElementById('booking-success').offsetTop - 100, behavior: 'smooth'});
}
// Set min date to today
var d = new Date(); var mm = String(d.getMonth()+1).padStart(2,'0'); var dd = String(d.getDate()).padStart(2,'0');
document.getElementById('bk-date').min = d.getFullYear()+'-'+mm+'-'+dd;
</script>

${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT: Build all pages
// ══════════════════════════════════════════════════════════════════════════════

export interface DemoPages {
  home:     string;
  services: string;
  gallery:  string;
  about:    string;
  booking:  string;
}

export function buildAllPages(biz: BizPageData, baseUrl: string): DemoPages {
  return {
    home:     buildHomePage(biz, baseUrl),
    services: buildServicesPage(biz, baseUrl),
    gallery:  buildGalleryPage(biz, baseUrl),
    about:    buildAboutPage(biz, baseUrl),
    booking:  buildBookingPage(biz, baseUrl),
  };
}
