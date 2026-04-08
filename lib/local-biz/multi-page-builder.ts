/**
 * Multi-page website demo builder.
 * Generates 5 separate HTML pages in the mnp4thsv dark-luxury style:
 *   home, services, gallery, about, booking
 *
 * Design: Playfair Display + DM Sans, #0f0a05 bg, gold/brown accents, Tailwind CDN.
 */

export interface TeamMember {
  name:   string;
  role:   string;
  photo?: string;   // URL or undefined (will show initial avatar)
  bio?:   string;   // optional bio/description
}

export interface BizPageData {
  name:             string;
  type:             string;
  businessCategory: string;  // 'salon' | 'barber' | 'restaurant' | 'fitness' | 'trades' | 'professional'
  phone:            string | null;
  address:          string | null;
  city:             string | null;
  state:            string | null;
  rating:           number | null;
  reviews:          number | null;
  photos:           string[];           // real photo URLs (salon/interior first, portfolio after)
  hours:            string;
  colorPrimary:     string;             // e.g. #9B6F42
  colorAccent:      string;             // e.g. #C9A55A
  heroHeadline:     string;
  heroHeadlineEm:   string;
  heroSub:          string;
  aboutText:        string;             // about headline / tagline
  aboutText2:       string;             // about body paragraph
  ctaText:          string;
  services:         Array<{ name: string; desc: string; price: string; duration?: string }>;
  reviewTexts:      string[];
  yearsInBiz:       string;
  teamName:         string;             // first name of owner/lead stylist
  team:             TeamMember[];       // all stylists/staff (for booking widget + stylists page)
  // Optional extra content pages
  products?:        Array<{ name: string; img?: string; desc?: string }>;
  community?:       Array<{ title: string; desc: string }>;
  specialEvents?:   {
    promsText?:     string;
    weddingsText?:  string;
    occasionsItems?: string[];
    promPhotos?:    string[];
    weddingPhotos?: string[];
  };
  // Extra nav links beyond the default 5 (used when a business has more pages)
  extraNavLinks?:   Array<{ href: string; label: string }>;
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
  // Build nav link list: use extraNavLinks if provided, else default 5-page set
  const defaultLinks = [
    { href: `${baseUrl}/services`, label: 'Services' },
    { href: `${baseUrl}/gallery`, label: 'Gallery' },
    { href: `${baseUrl}/about`, label: 'About' },
  ];
  const extraLinks = biz.extraNavLinks || [];
  const allLinks = extraLinks.length > 0 ? extraLinks.filter(l => l.label !== 'Book Now') : defaultLinks;
  const bookingLink = `${baseUrl}/booking`;

  const desktopLinks = allLinks.map(l =>
    `<a href="${l.href}" class="hover:text-accent transition-colors whitespace-nowrap">${l.label}</a>`
  ).join('');
  const mobileLinks = allLinks.map(l =>
    `<a href="${l.href}" class="hover:text-accent py-1">${l.label}</a>`
  ).join('');

  return `<nav class="fixed top-0 left-0 right-0 z-50 bg-[#0f0a05]/90 backdrop-blur-sm border-b border-[${biz.colorPrimary}]/20">
  <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="${baseUrl}">
      <span class="serif text-accent text-xl tracking-wide">${biz.name}</span>
      <div class="text-[${biz.colorPrimary}] text-xs tracking-widest uppercase mt-0.5">${biz.city || ''}, ${biz.state || ''}</div>
    </a>
    <div class="hidden md:flex items-center gap-5 text-xs tracking-wider text-[#c5b49a]">
      ${desktopLinks}
      <a href="${bookingLink}" class="bg-accent text-[#0f0a05] px-5 py-2 rounded-sm font-medium hover:bg-primary transition-colors whitespace-nowrap">Book Now</a>
    </div>
    <button id="menu-btn" class="md:hidden text-accent" aria-label="Menu">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
  </div>
  <div id="mobile-menu" class="hidden md:hidden bg-[#150d05] border-t border-[${biz.colorPrimary}]/20 px-6 py-4 flex flex-col gap-4 text-sm text-[#c5b49a]">
    ${mobileLinks}
    <a href="${bookingLink}" class="bg-accent text-[#0f0a05] px-5 py-2.5 rounded-sm font-medium text-center mt-1">Book Now</a>
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
          ${(biz.extraNavLinks?.length
              ? biz.extraNavLinks
              : [
                  { href: `${baseUrl}/services`, label: 'Services' },
                  { href: `${baseUrl}/gallery`, label: 'Gallery' },
                  { href: `${baseUrl}/about`, label: 'About' },
                  { href: `${baseUrl}/booking`, label: 'Book Now' },
                ]
            ).map(l => `<div><a href="${l.href}" class="hover:text-accent transition-colors">${l.label}</a></div>`).join('')}
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
  const isRestaurant = biz.businessCategory === 'restaurant';
  const icons = ['✦','✧','◈','◇','✦','✧','♛','✦'];
  const grid = biz.services.map((s, i) => `
  <div class="group bg-[#150d05] border border-[${biz.colorPrimary}]/20 rounded-sm p-8 hover:scale-105 transition-all duration-300 hover:border-accent/40 hover:bg-[#1a1008]">
    <div class="text-accent text-2xl mb-4">${icons[i % icons.length]}</div>
    <h3 class="serif text-xl text-[#f5ede0] mb-3">${s.name}</h3>
    <p class="text-[#9d8e7e] text-sm leading-relaxed mb-5">${s.desc}</p>
    <div class="flex items-center justify-between">
      ${s.price ? `<div class="text-accent font-medium tracking-wide">${s.price}</div>` : '<div></div>'}
      ${s.duration && !isRestaurant ? `<div class="text-[${biz.colorPrimary}] text-xs tracking-wider uppercase">${s.duration}</div>` : ''}
    </div>
  </div>`).join('');

  const pageLabel = isRestaurant ? 'The Menu' : 'What We Offer';
  const pageTitle = isRestaurant ? 'Menu Highlights' : 'Our Services';

  return `${head(biz, isRestaurant ? 'Menu' : 'Services')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader(pageLabel, pageTitle, biz)}

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

${biz.team.length > 0 ? `
<section class="py-16 px-6 bg-[#0c0804] border-t border-[${biz.colorPrimary}]/20">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-4">The People Behind the Work</div>
      <h2 class="serif text-3xl md:text-4xl text-[#f5ede0] font-semibold">Meet Our Stylists</h2>
      <div class="mt-4 w-16 h-px bg-accent mx-auto"></div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${Math.min(biz.team.length, 6)} gap-6">
      ${biz.team.map(m => `
      <div class="text-center">
        <div class="w-20 h-20 mx-auto mb-3 overflow-hidden rounded-full border border-[${biz.colorPrimary}]/30">
          ${m.photo
            ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover">`
            : `<div class="w-full h-full bg-[#1a1008] flex items-center justify-center serif text-accent text-xl">${m.name[0]}</div>`
          }
        </div>
        <div class="text-[#f5ede0] text-sm font-medium">${m.name}</div>
        <div class="text-[#9d8e7e] text-xs mt-0.5">${m.role}</div>
        ${m.bio ? `<p class="text-[#9d8e7e] text-xs mt-2 leading-relaxed px-2">${m.bio}</p>` : ''}
      </div>`).join('')}
    </div>
    ${biz.extraNavLinks?.some(l => l.href.includes('/stylists')) ? `
    <div class="text-center mt-10">
      <a href="${baseUrl}/stylists" class="inline-block border border-[${biz.colorPrimary}]/60 text-[#c5b49a] px-8 py-3 text-sm tracking-widest uppercase hover:border-accent hover:text-accent transition-colors rounded-sm">
        Meet the Full Team
      </a>
    </div>` : ''}
  </div>
</section>` : ''}
${reviewsStrip(biz)}
${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: BOOKING — Fresha-style multi-step widget
// Steps vary by business category:
//   salon/barber: Service → Stylist → Date+Time → Your Details
//   fitness:      Class → Trainer → Date+Time → Your Details
//   restaurant:   Party size → Date+Time → Your Details
//   trades:       Service → Date+Time → Your Details + Address
//   professional: Consultation → Date → Your Details + Notes
// ══════════════════════════════════════════════════════════════════════════════

function buildRestaurantBookingPage(biz: BizPageData, baseUrl: string): string {
  const p = biz.colorPrimary;
  const phoneClean = biz.phone?.replace(/[^0-9+]/g, '') || '';
  return `${head(biz, 'Reserve')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('Reserve a Table', 'Make a Reservation', biz)}

<style>
.party-card{width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(155,111,66,.3);border-radius:2px;cursor:pointer;color:#9d8e7e;font-size:1rem;font-weight:600;transition:all .2s;font-family:'DM Sans',sans-serif}
.party-card:hover{border-color:${biz.colorAccent};color:${biz.colorAccent}}
.party-card.selected{background:${biz.colorAccent};border-color:${biz.colorAccent};color:#0f0a05}
.slot{padding:.45rem .75rem;border:1px solid rgba(155,111,66,.3);border-radius:2px;font-size:.75rem;cursor:pointer;color:#c5b49a;transition:all .2s;background:#0f0a05}
.slot:hover{border-color:${biz.colorAccent};color:${biz.colorAccent}}
.slot.selected{background:${biz.colorAccent};border-color:${biz.colorAccent};color:#0f0a05;font-weight:600}
.cal-day{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:2px;cursor:pointer;font-size:.82rem;transition:all .2s;color:#9d8e7e}
.cal-day:hover:not(.past):not(.empty){background:#1a1008;color:${biz.colorAccent}}
.cal-day.selected{background:${biz.colorAccent}!important;color:#0f0a05!important;font-weight:600}
.cal-day.past,.cal-day.empty{opacity:.25;cursor:default;pointer-events:none}
.cal-day.today{border:1px solid rgba(201,165,90,.4);color:#c5b49a}
.step-dot{width:28px;height:28px;border-radius:50%;border:2px solid rgba(155,111,66,.3);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:600;color:#4a3f35;transition:all .3s;background:#0f0a05}
.step-dot.active{border-color:${biz.colorAccent};color:${biz.colorAccent}}
.step-dot.done{background:${biz.colorAccent};border-color:${biz.colorAccent};color:#0f0a05}
.step-line{flex:1;height:1px;background:rgba(155,111,66,.2);margin:0 4px}
input[type=text],input[type=email],input[type=tel],textarea{background:#0c0804;border:1px solid rgba(155,111,66,.3);border-radius:2px;padding:.75rem 1rem;color:#e8ddd0;font-family:'DM Sans',sans-serif;font-size:.9rem;width:100%;outline:none;transition:border-color .2s;resize:vertical}
input:focus,textarea:focus{border-color:${biz.colorAccent}}
input::placeholder,textarea::placeholder{color:#4a3f35}
</style>

<section class="py-16 px-4 bg-[#0f0a05]">
  <div class="max-w-xl mx-auto">
    <div class="flex items-center mb-10">
      <div class="step-dot active" id="dot-1">1</div><div class="step-line"></div>
      <div class="step-dot" id="dot-2">2</div><div class="step-line"></div>
      <div class="step-dot" id="dot-3">3</div>
    </div>

    <!-- Panel 1: Party size -->
    <div id="panel-1">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step 1 of 3</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-2">Party Size</h2>
      <p class="text-[#9d8e7e] text-sm mb-8">How many guests will be dining?</p>
      <div class="flex flex-wrap gap-3">
        ${[1,2,3,4,5,6,7,'8+'].map(n => `<div class="party-card" onclick="selectParty(this,'${n}')">${n}</div>`).join('')}
      </div>
    </div>

    <!-- Panel 2: Date + time -->
    <div id="panel-2" class="hidden">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step 2 of 3</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-2">Date & Time</h2>
      <p class="text-[#9d8e7e] text-sm mb-6">Party of <span id="chosen-party" class="text-[#c5b49a]"></span></p>
      <div class="bg-[#0c0804] border border-[${p}]/15 rounded-sm p-4 mb-5">
        <div class="flex items-center justify-between mb-4">
          <button onclick="calPrev()" class="text-[${p}] hover:text-accent transition-colors text-lg">‹</button>
          <div class="serif text-[#f5ede0] text-base" id="cal-month-label"></div>
          <button onclick="calNext()" class="text-[${p}] hover:text-accent transition-colors text-lg">›</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center mb-2">
          ${['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<div class="text-[${p}] text-xs tracking-wider">${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1 justify-items-center" id="cal-grid"></div>
      </div>
      <div id="slots-container" class="hidden">
        <div class="text-[${p}] text-xs tracking-[0.2em] uppercase mb-3">Lunch — <span id="slots-date-label"></span></div>
        <div class="flex flex-wrap gap-2 mb-4" id="lunch-slots"></div>
        <div class="text-[${p}] text-xs tracking-[0.2em] uppercase mb-3">Dinner</div>
        <div class="flex flex-wrap gap-2" id="dinner-slots"></div>
      </div>
      <button onclick="goStep(1)" class="mt-6 text-[${p}] text-sm hover:text-accent transition-colors">← Back</button>
    </div>

    <!-- Panel 3: Contact -->
    <div id="panel-3" class="hidden">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step 3 of 3</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-2">Your Details</h2>
      <p class="text-[#9d8e7e] text-sm mb-6"><span id="summary-line" class="text-[#c5b49a]"></span></p>
      <div class="space-y-4">
        <div><label class="block text-[${p}] text-xs tracking-[0.2em] uppercase mb-2">Full Name</label><input type="text" id="bk-name" placeholder="Your name"></div>
        <div><label class="block text-[${p}] text-xs tracking-[0.2em] uppercase mb-2">Phone</label><input type="tel" id="bk-phone" placeholder="(555) 000-0000"></div>
        <div><label class="block text-[${p}] text-xs tracking-[0.2em] uppercase mb-2">Special Requests <span class="text-[#4a3f35] normal-case">(optional)</span></label><textarea id="bk-notes" placeholder="Allergies, celebrations, seating preferences..." style="min-height:80px"></textarea></div>
        <button onclick="submitReservation()" class="w-full border border-accent text-accent py-4 text-sm tracking-[0.2em] uppercase hover:bg-accent hover:text-[#0f0a05] transition-all mt-2">Reserve Table</button>
      </div>
      <button onclick="goStep(2)" class="mt-5 text-[${p}] text-sm hover:text-accent transition-colors">← Back</button>
    </div>

    <!-- Success -->
    <div id="panel-success" class="hidden text-center py-8">
      <div class="text-accent text-4xl mb-6">✦</div>
      <h2 class="serif text-3xl text-[#f5ede0] mb-4">Table Reserved</h2>
      <p class="text-[#9d8e7e] mb-2">Thank you <span id="success-name" class="text-[#c5b49a]"></span> — your table is provisionally held.</p>
      <p class="text-[#9d8e7e] mb-8">We'll call <span id="success-phone" class="text-accent"></span> to confirm within the hour.</p>
      ${biz.phone ? `<p class="text-[#9d8e7e] text-sm">Questions? <a href="tel:${phoneClean}" class="text-accent hover:underline">${biz.phone}</a></p>` : ''}
    </div>

    <div class="mt-14 pt-10 border-t border-[${p}]/15 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm text-[#9d8e7e]">
      ${biz.phone ? `<div><div class="text-accent text-xs tracking-[0.2em] uppercase mb-2">Call</div><a href="tel:${phoneClean}" class="hover:text-accent text-[#c5b49a]">${biz.phone}</a></div>` : ''}
      ${biz.address ? `<div><div class="text-accent text-xs tracking-[0.2em] uppercase mb-2">Find Us</div>${biz.address}</div>` : ''}
      <div><div class="text-accent text-xs tracking-[0.2em] uppercase mb-2">Hours</div><div class="whitespace-pre-line">${biz.hours || 'Tue–Sun 11am–10pm'}</div></div>
    </div>
  </div>
</section>

<script>
var sel={party:'',date:'',time:''};
var calYear,calMonth;
function goStep(n){
  ['panel-1','panel-2','panel-3'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('hidden');});
  document.getElementById('panel-'+n).classList.remove('hidden');
  for(var i=1;i<=3;i++){
    var dot=document.getElementById('dot-'+i);if(!dot)continue;
    if(i<n){dot.classList.add('done');dot.classList.remove('active');dot.textContent='✓';}
    else if(i===n){dot.classList.add('active');dot.classList.remove('done');}
    else{dot.classList.remove('active','done');dot.textContent=i;}
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
function selectParty(el,n){
  document.querySelectorAll('.party-card').forEach(function(c){c.classList.remove('selected');});
  el.classList.add('selected');sel.party=n;
  setTimeout(function(){
    var cp=document.getElementById('chosen-party');if(cp)cp.textContent=n+(n==='1'?' guest':' guests');
    goStep(2);
  },200);
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
      document.getElementById('slots-date-label').textContent=MONTHS[calMonth]+' '+day;
      renderSlots();document.getElementById('slots-container').classList.remove('hidden');
    });})(d,e);}
    grid.appendChild(e);
  }
}
function calPrev(){if(calMonth===0){calMonth=11;calYear--;}else calMonth--;renderCal();}
function calNext(){if(calMonth===11){calMonth=0;calYear++;}else calMonth++;renderCal();}
function renderSlots(){
  var lunch=['12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM'];
  var dinner=['5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM'];
  function makeSlot(t,grid){var btn=document.createElement('button');btn.className='slot';btn.textContent=t;btn.addEventListener('click',function(){document.querySelectorAll('.slot').forEach(function(s){s.classList.remove('selected');});btn.classList.add('selected');sel.time=t;setTimeout(function(){var sl=document.getElementById('summary-line');if(sl)sl.textContent=MONTHS[calMonth]+' '+parseInt(sel.date.split('-')[2])+' at '+t+' · Party of '+sel.party;goStep(3);},200);});grid.appendChild(btn);}
  var lg=document.getElementById('lunch-slots'),dg=document.getElementById('dinner-slots');lg.innerHTML='';dg.innerHTML='';
  lunch.forEach(function(t){makeSlot(t,lg);});dinner.forEach(function(t){makeSlot(t,dg);});
}
function submitReservation(){
  var name=document.getElementById('bk-name').value.trim();
  var phone=document.getElementById('bk-phone').value.trim();
  if(!name||!phone){alert('Please fill in your name and phone.');return;}
  document.getElementById('success-name').textContent=name;
  document.getElementById('success-phone').textContent=phone;
  ['panel-1','panel-2','panel-3'].forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('hidden');});
  document.getElementById('panel-success').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}
var now=new Date();calYear=now.getFullYear();calMonth=now.getMonth();renderCal();
</script>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

function buildBookingPage(biz: BizPageData, baseUrl: string): string {
  const cat = biz.businessCategory;
  if (cat === 'restaurant') return buildRestaurantBookingPage(biz, baseUrl);
  const hasStylistStep = ['salon', 'barber', 'beauty', 'fitness', 'gym'].includes(cat);
  const totalSteps = hasStylistStep ? 4 : 3;

  // Step labels
  const step2Label = cat === 'restaurant' ? 'Date & Time' : cat === 'fitness' || cat === 'gym' ? 'Trainer' : hasStylistStep ? 'Stylist' : 'Date & Time';
  const step3Label = hasStylistStep ? 'Date & Time' : 'Your Details';
  const step4Label = 'Your Details';

  // Service cards
  const serviceCards = biz.services.map((s, i) => `
    <div class="svc-card cursor-pointer border border-[${biz.colorPrimary}]/20 rounded-sm p-5 hover:border-accent/60 transition-all duration-200 bg-[#0f0a05]"
         onclick="selectService(this,'${s.name.replace(/'/g,"\\'")}','${s.price}','${s.duration||'60 min'}')"
         data-name="${s.name}" data-idx="${i}">
      <div class="flex justify-between items-start mb-2">
        <h3 class="serif text-base text-[#f5ede0] leading-tight">${s.name}</h3>
        <span class="text-accent text-sm font-medium ml-4 whitespace-nowrap">${s.price}</span>
      </div>
      <p class="text-[#9d8e7e] text-xs leading-relaxed mb-3">${s.desc}</p>
      <span class="text-[${biz.colorPrimary}] text-xs tracking-wider">${s.duration || '60 min'}</span>
    </div>`).join('');

  // Team member cards (salon/barber/fitness) — include "Any Available" always
  const teamForWidget: TeamMember[] = [
    ...biz.team,
    { name: 'Any Available', role: 'First available stylist' },
  ];
  const stylistCards = teamForWidget.map((m, i) => {
    const initial = m.name.charAt(0).toUpperCase();
    const photoHtml = m.photo
      ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover rounded-full" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const initials = `<div class="w-full h-full rounded-full bg-[#1a1008] border border-accent/30 flex items-center justify-center serif text-accent text-xl"${m.photo ? ' style="display:none"' : ''}>${initial}</div>`;
    return `
    <div class="team-card cursor-pointer border border-[${biz.colorPrimary}]/20 rounded-sm p-4 hover:border-accent/60 transition-all duration-200 bg-[#0f0a05] text-center"
         onclick="selectStyleist(this,'${m.name.replace(/'/g,"\\'")}')">
      <div class="w-14 h-14 mx-auto mb-3 relative overflow-hidden rounded-full">${photoHtml}${initials}</div>
      <div class="text-[#f5ede0] text-sm font-medium">${m.name}</div>
      <div class="text-[#9d8e7e] text-xs mt-0.5">${m.role}</div>
    </div>`;
  }).join('');

  const p = biz.colorPrimary;
  const phoneClean = biz.phone?.replace(/[^0-9+]/g, '') || '';

  return `${head(biz, 'Book')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('Reserve Your Spot', 'Book an Appointment', biz)}

<style>
.svc-card.selected,.team-card.selected,.slot.selected{border-color:${biz.colorAccent}!important;background:#1a1008!important}
.slot{padding:.45rem .75rem;border:1px solid rgba(155,111,66,.3);border-radius:2px;font-size:.75rem;cursor:pointer;color:#c5b49a;transition:all .2s;background:#0f0a05}
.slot:hover{border-color:${biz.colorAccent};color:${biz.colorAccent}}
.slot.booked{opacity:.3;cursor:default;pointer-events:none;text-decoration:line-through}
.cal-day{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:2px;cursor:pointer;font-size:.82rem;transition:all .2s;color:#9d8e7e}
.cal-day:hover:not(.past):not(.empty){background:#1a1008;color:${biz.colorAccent}}
.cal-day.selected{background:${biz.colorAccent}!important;color:#0f0a05!important;font-weight:600}
.cal-day.past,.cal-day.empty{opacity:.25;cursor:default;pointer-events:none}
.cal-day.today{border:1px solid rgba(201,165,90,.4);color:#c5b49a}
.step-dot{width:28px;height:28px;border-radius:50%;border:2px solid rgba(155,111,66,.3);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:600;color:#4a3f35;transition:all .3s;background:#0f0a05}
.step-dot.active{border-color:${biz.colorAccent};color:${biz.colorAccent}}
.step-dot.done{background:${biz.colorAccent};border-color:${biz.colorAccent};color:#0f0a05}
.step-line{flex:1;height:1px;background:rgba(155,111,66,.2);margin:0 4px}
input[type=text],input[type=email],input[type=tel]{background:#0c0804;border:1px solid rgba(155,111,66,.3);border-radius:2px;padding:.75rem 1rem;color:#e8ddd0;font-family:'DM Sans',sans-serif;font-size:.9rem;width:100%;outline:none;transition:border-color .2s}
input:focus{border-color:${biz.colorAccent}}
input::placeholder{color:#4a3f35}
</style>

<section class="py-16 px-4 bg-[#0f0a05]">
  <div class="max-w-xl mx-auto">

    <!-- Step indicator -->
    <div class="flex items-center mb-10">
      <div class="step-dot active" id="dot-1">1</div>
      <div class="step-line"></div>
      ${hasStylistStep ? `<div class="step-dot" id="dot-2">2</div><div class="step-line"></div>
      <div class="step-dot" id="dot-3">3</div><div class="step-line"></div>
      <div class="step-dot" id="dot-4">4</div>` :
      `<div class="step-dot" id="dot-2">2</div><div class="step-line"></div>
      <div class="step-dot" id="dot-3">3</div>`}
    </div>

    <!-- Panel 1: Service -->
    <div id="panel-1">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step 1 of ${totalSteps}</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-6">Choose a Service</h2>
      <div class="space-y-3">${serviceCards}</div>
    </div>

    ${hasStylistStep ? `<!-- Panel 2: Stylist -->
    <div id="panel-2" class="hidden">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step 2 of ${totalSteps}</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-2">Choose Your Stylist</h2>
      <p class="text-[#9d8e7e] text-sm mb-6">Selected: <span id="chosen-service" class="text-[#c5b49a]"></span></p>
      <div class="grid grid-cols-2 gap-3">${stylistCards}</div>
      <button onclick="goStep(1)" class="mt-6 text-[${p}] text-sm hover:text-accent transition-colors">← Back</button>
    </div>` : ''}

    <!-- Panel 3: Date + Time -->
    <div id="panel-3" class="hidden">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step ${hasStylistStep ? 3 : 2} of ${totalSteps}</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-2">Pick a Date & Time</h2>
      ${hasStylistStep ? `<p class="text-[#9d8e7e] text-sm mb-6">With: <span id="chosen-stylist" class="text-[#c5b49a]"></span></p>` : `<p class="text-[#9d8e7e] text-sm mb-6">Service: <span id="chosen-service-3" class="text-[#c5b49a]"></span></p>`}

      <!-- Calendar -->
      <div class="bg-[#0c0804] border border-[${p}]/15 rounded-sm p-4 mb-5">
        <div class="flex items-center justify-between mb-4">
          <button onclick="calPrev()" class="text-[${p}] hover:text-accent transition-colors text-lg leading-none">‹</button>
          <div class="serif text-[#f5ede0] text-base" id="cal-month-label"></div>
          <button onclick="calNext()" class="text-[${p}] hover:text-accent transition-colors text-lg leading-none">›</button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center mb-2">
          ${['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<div class="text-[${p}] text-xs tracking-wider">${d}</div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1 justify-items-center" id="cal-grid"></div>
      </div>

      <!-- Time slots -->
      <div id="slots-container" class="hidden">
        <div class="text-[${p}] text-xs tracking-widest uppercase mb-3">Available Times — <span id="slots-date-label"></span></div>
        <div class="flex flex-wrap gap-2" id="slots-grid"></div>
      </div>

      <button onclick="goStep(${hasStylistStep ? 2 : 1})" class="mt-6 text-[${p}] text-sm hover:text-accent transition-colors">← Back</button>
    </div>

    <!-- Panel 4: Contact Details -->
    <div id="panel-4" class="hidden">
      <div class="text-accent text-xs tracking-[0.3em] uppercase mb-2">Step ${totalSteps} of ${totalSteps}</div>
      <h2 class="serif text-2xl text-[#f5ede0] mb-2">Your Details</h2>
      <p class="text-[#9d8e7e] text-sm mb-6"><span id="summary-line" class="text-[#c5b49a]"></span></p>
      <div class="space-y-4">
        <div>
          <label class="block text-[${p}] text-xs tracking-widest uppercase mb-2">Full Name</label>
          <input type="text" id="bk-name" placeholder="Your name" required>
        </div>
        <div>
          <label class="block text-[${p}] text-xs tracking-widest uppercase mb-2">Email</label>
          <input type="email" id="bk-email" placeholder="your@email.com" required>
        </div>
        <div>
          <label class="block text-[${p}] text-xs tracking-widest uppercase mb-2">Phone</label>
          <input type="tel" id="bk-phone" placeholder="(555) 000-0000" required>
        </div>
        <button onclick="submitBooking()" class="w-full bg-accent text-[#0f0a05] py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary transition-colors rounded-sm mt-2">
          Confirm Appointment
        </button>
      </div>
      <button onclick="goStep(${hasStylistStep ? 3 : 2})" class="mt-5 text-[${p}] text-sm hover:text-accent transition-colors">← Back</button>
    </div>

    <!-- Success -->
    <div id="panel-success" class="hidden text-center py-6">
      <div class="text-accent text-5xl mb-6">✦</div>
      <h2 class="serif text-3xl text-[#f5ede0] mb-4">You're all set!</h2>
      <p class="text-[#9d8e7e] mb-2">Thanks <span id="success-name" class="text-[#c5b49a] font-medium"></span> — we've received your request.</p>
      <p class="text-[#9d8e7e] mb-8">We'll call <span id="success-phone" class="text-accent"></span> to confirm your appointment, usually within a few hours.</p>
      ${biz.phone ? `<p class="text-[#9d8e7e] text-sm">Questions? <a href="tel:${phoneClean}" class="text-accent hover:underline">${biz.phone}</a></p>` : ''}
    </div>

    <!-- Contact strip -->
    <div class="mt-14 pt-10 border-t border-[${p}]/15 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm text-[#9d8e7e]">
      ${biz.phone ? `<div><div class="text-accent text-xs tracking-widest uppercase mb-2">Call</div><a href="tel:${phoneClean}" class="hover:text-accent">${biz.phone}</a></div>` : ''}
      ${biz.address ? `<div><div class="text-accent text-xs tracking-widest uppercase mb-2">Find Us</div>${biz.address}</div>` : ''}
      <div><div class="text-accent text-xs tracking-widest uppercase mb-2">Hours</div>${biz.hours || 'Mon–Sat 9am–6pm'}</div>
    </div>
  </div>
</section>

<script>
var sel={service:'',price:'',duration:'',stylist:'',date:'',time:''};
var calYear,calMonth,hasStylist=${hasStylistStep};

function goStep(n){
  var panels=['panel-1','panel-2','panel-3','panel-4'];
  if(!hasStylist) panels=['panel-1','panel-3','panel-4'];
  panels.forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.classList.add('hidden');
  });
  var panelMap=hasStylist?{1:'panel-1',2:'panel-2',3:'panel-3',4:'panel-4'}:{1:'panel-1',2:'panel-3',3:'panel-4'};
  var target=document.getElementById(panelMap[n]);
  if(target) target.classList.remove('hidden');
  // Update dots
  var totalDots=${totalSteps};
  for(var i=1;i<=totalDots;i++){
    var dot=document.getElementById('dot-'+i);
    if(!dot) continue;
    if(i<n){dot.classList.add('done');dot.classList.remove('active');dot.textContent='✓';}
    else if(i===n){dot.classList.add('active');dot.classList.remove('done');}
    else{dot.classList.remove('active','done');dot.textContent=i;}
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

function selectService(el,name,price,duration){
  document.querySelectorAll('.svc-card').forEach(function(c){c.classList.remove('selected');});
  el.classList.add('selected');
  sel.service=name;sel.price=price;sel.duration=duration;
  setTimeout(function(){
    var s=document.getElementById('chosen-service');if(s)s.textContent=name+(price?' · '+price:'');
    var s3=document.getElementById('chosen-service-3');if(s3)s3.textContent=name;
    goStep(2);
  },200);
}

function selectStyleist(el,name){
  document.querySelectorAll('.team-card').forEach(function(c){c.classList.remove('selected');});
  el.classList.add('selected');
  sel.stylist=name;
  setTimeout(function(){
    var cs=document.getElementById('chosen-stylist');if(cs)cs.textContent=name;
    goStep(3);
  },200);
}

// Calendar
var DAYS=['Mo','Tu','We','Th','Fr','Sa','Su'];
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function renderCal(){
  var now=new Date();
  var first=new Date(calYear,calMonth,1);
  var last=new Date(calYear,calMonth+1,0);
  document.getElementById('cal-month-label').textContent=MONTHS[calMonth]+' '+calYear;
  var grid=document.getElementById('cal-grid');grid.innerHTML='';
  // Start on Monday (0=Sun → shift)
  var startDay=(first.getDay()+6)%7;
  for(var i=0;i<startDay;i++){var e=document.createElement('div');e.className='cal-day empty';e.textContent='';grid.appendChild(e);}
  for(var d=1;d<=last.getDate();d++){
    var e=document.createElement('div');e.className='cal-day';e.textContent=d;
    var thisDate=new Date(calYear,calMonth,d);
    var isToday=thisDate.toDateString()===now.toDateString();
    if(isToday)e.classList.add('today');
    if(thisDate<new Date(now.getFullYear(),now.getMonth(),now.getDate()))e.classList.add('past');
    else{
      (function(day,el){
        el.addEventListener('click',function(){
          document.querySelectorAll('.cal-day').forEach(function(c){c.classList.remove('selected');});
          el.classList.add('selected');
          var dateStr=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
          sel.date=dateStr;
          var label=MONTHS[calMonth]+' '+day+', '+calYear;
          document.getElementById('slots-date-label').textContent=label;
          renderSlots(day);
          document.getElementById('slots-container').classList.remove('hidden');
        });
      })(d,e);
    }
    grid.appendChild(e);
  }
}
function calPrev(){if(calMonth===0){calMonth=11;calYear--;}else calMonth--;renderCal();}
function calNext(){if(calMonth===11){calMonth=0;calYear++;}else calMonth++;renderCal();}

function renderSlots(day){
  var grid=document.getElementById('slots-grid');grid.innerHTML='';
  var times=['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM'];
  // Deterministically mark some slots as booked based on day
  var booked=[day%7,(day%5)+3,(day%4)+8];
  times.forEach(function(t,i){
    var btn=document.createElement('button');
    btn.className='slot'+(booked.includes(i)?' booked':'');
    btn.textContent=t;
    if(!booked.includes(i)){
      btn.addEventListener('click',function(){
        document.querySelectorAll('.slot').forEach(function(s){s.classList.remove('selected');});
        btn.classList.add('selected');
        sel.time=t;
        setTimeout(function(){
          var summary=sel.service+(sel.stylist?' with '+sel.stylist:'')+(sel.date?' · '+MONTHS[new Date(sel.date+'T00:00').getMonth()]+' '+new Date(sel.date+'T00:00').getDate():'')+(sel.time?' at '+sel.time:'');
          var sl=document.getElementById('summary-line');if(sl)sl.textContent=summary;
          goStep(${totalSteps});
        },200);
      });
    }
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

// Init
var now=new Date();calYear=now.getFullYear();calMonth=now.getMonth();
renderCal();
</script>

${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: STYLISTS — Full team grid with photos and bios
// ══════════════════════════════════════════════════════════════════════════════

function buildStylistsPage(biz: BizPageData, baseUrl: string): string {
  const p = biz.colorPrimary;
  const teamGrid = biz.team.map(m => `
  <div class="text-center px-4">
    <div class="w-44 h-44 mx-auto mb-6 rounded-full overflow-hidden border-2 border-[${p}]/40 hover:border-accent/60 transition-all">
      ${m.photo
        ? `<img src="${m.photo}" alt="${m.name}" class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500">`
        : `<div class="w-full h-full bg-[#1a1008] flex items-center justify-center serif text-accent text-5xl">${m.name[0]}</div>`
      }
    </div>
    <h3 class="serif text-2xl text-[#f5ede0] mb-1">${m.name}</h3>
    <div class="text-accent text-xs tracking-widest uppercase mb-4">${m.role}</div>
    ${m.bio ? `<p class="text-[#9d8e7e] text-sm leading-relaxed max-w-xs mx-auto">${m.bio}</p>` : ''}
  </div>`).join('');

  return `${head(biz, 'Our Stylists')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('The Team', 'Our Stylists', biz)}

<section class="py-20 px-6 bg-[#0f0a05]">
  <div class="max-w-6xl mx-auto">
    <p class="text-center text-[#9d8e7e] text-lg max-w-2xl mx-auto mb-20">
      We are experienced hair stylists providing a full range of hair services for women, men and children.
      Client satisfaction is our top priority.
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-14">
      ${teamGrid}
    </div>
  </div>
</section>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: PRODUCTS — Brand grid
// ══════════════════════════════════════════════════════════════════════════════

function buildProductsPage(biz: BizPageData, baseUrl: string): string {
  const p = biz.colorPrimary;
  const productGrid = (biz.products || []).map(prod => `
  <div class="bg-[#150d05] border border-[${p}]/20 rounded-sm p-8 hover:border-accent/30 transition-all flex flex-col items-center text-center">
    ${prod.img
      ? `<div class="h-28 flex items-center justify-center mb-4">
           <img src="${prod.img}" alt="${prod.name}" class="max-h-full max-w-full object-contain filter brightness-90 hover:brightness-100 transition-all">
         </div>`
      : `<div class="h-28 flex items-center justify-center mb-4 serif text-accent text-4xl">✦</div>`
    }
    <h3 class="serif text-lg text-[#f5ede0] mb-2">${prod.name}</h3>
    ${prod.desc ? `<p class="text-[#9d8e7e] text-sm">${prod.desc}</p>` : `<p class="text-[#9d8e7e] text-xs tracking-wider uppercase">Available In-Salon</p>`}
  </div>`).join('');

  return `${head(biz, 'Products')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('Hair Care', 'Our Products', biz)}

<section class="py-20 px-6 bg-[#0f0a05]">
  <div class="max-w-5xl mx-auto">
    <p class="text-center text-[#9d8e7e] text-lg max-w-2xl mx-auto mb-16">
      We feature many popular hair care products to keep your style looking its best between visits.
    </p>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">
      ${productGrid}
    </div>
  </div>
</section>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: SPECIAL EVENTS — Proms, Weddings, Occasions
// ══════════════════════════════════════════════════════════════════════════════

function buildSpecialEventsPage(biz: BizPageData, baseUrl: string): string {
  const ev = biz.specialEvents || {};
  const p = biz.colorPrimary;

  const promsSection = ev.promsText ? `
  <div class="mb-20">
    <div class="flex items-center gap-4 mb-6">
      <span class="text-accent text-3xl">✦</span>
      <h2 class="serif text-3xl md:text-4xl text-[#f5ede0]">Proms & Special Events</h2>
    </div>
    <p class="text-[#9d8e7e] text-lg leading-relaxed mb-10 max-w-2xl">${ev.promsText}</p>
    ${ev.promPhotos?.length ? `
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      ${ev.promPhotos.slice(0, 24).map((ph, i) => `
      <div class="overflow-hidden rounded-sm aspect-square">
        <img src="${ph}" alt="Prom style ${i+1}" class="w-full h-full object-cover hover:scale-110 transition-transform duration-500">
      </div>`).join('')}
    </div>` : ''}
  </div>` : '';

  const weddingsSection = ev.weddingsText ? `
  <div class="mb-20 pt-12 border-t border-[${p}]/20">
    <div class="flex items-center gap-4 mb-6">
      <span class="text-accent text-3xl">◈</span>
      <h2 class="serif text-3xl md:text-4xl text-[#f5ede0]">Weddings</h2>
    </div>
    <p class="text-[#9d8e7e] text-lg leading-relaxed mb-10 max-w-2xl">${ev.weddingsText}</p>
    ${ev.weddingPhotos?.length ? `
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      ${ev.weddingPhotos.slice(0, 24).map((ph, i) => `
      <div class="overflow-hidden rounded-sm aspect-square">
        <img src="${ph}" alt="Wedding style ${i+1}" class="w-full h-full object-cover hover:scale-110 transition-transform duration-500">
      </div>`).join('')}
    </div>` : ''}
  </div>` : '';

  const occasionsSection = ev.occasionsItems?.length ? `
  <div class="pt-12 border-t border-[${p}]/20">
    <div class="flex items-center gap-4 mb-6">
      <span class="text-accent text-3xl">◇</span>
      <h2 class="serif text-3xl md:text-4xl text-[#f5ede0]">Other Occasions</h2>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${(ev.occasionsItems || []).map(item => {
        const [title, ...rest] = item.split(':');
        return `
      <div class="bg-[#150d05] border border-[${p}]/20 rounded-sm p-8">
        <h3 class="serif text-xl text-[#f5ede0] mb-3">${title.trim()}</h3>
        <p class="text-[#9d8e7e] text-sm leading-relaxed">${rest.join(':').trim()}</p>
      </div>`;
      }).join('')}
    </div>
  </div>` : '';

  return `${head(biz, 'Special Events')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('Beyond the Chair', 'Special Events', biz)}

<section class="py-20 px-6 bg-[#0f0a05]">
  <div class="max-w-6xl mx-auto">
    ${promsSection}
    ${weddingsSection}
    ${occasionsSection}
  </div>
</section>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE: COMMUNITY — Charity and community service events
// ══════════════════════════════════════════════════════════════════════════════

function buildCommunityPage(biz: BizPageData, baseUrl: string): string {
  const p = biz.colorPrimary;
  const events = biz.community || [];

  return `${head(biz, 'Community')}
<body class="bg-[#0f0a05] text-[#e8ddd0]">
${nav(biz, baseUrl)}
${pageHeader('Giving Back', 'Community Service', biz)}

<section class="py-20 px-6 bg-[#0f0a05]">
  <div class="max-w-4xl mx-auto">
    <p class="text-[#9d8e7e] text-xl leading-relaxed text-center mb-16">
      At ${biz.name}, we believe in more than great hair. We're proud members of the ${biz.city || 'local'} community
      and give back whenever we can.
    </p>
    <div class="space-y-8">
      ${events.map(ev => `
      <div class="border-l-2 border-accent pl-8 py-2">
        <h3 class="serif text-2xl text-[#f5ede0] mb-3">${ev.title}</h3>
        <p class="text-[#9d8e7e] leading-relaxed">${ev.desc}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

${ctaSection(biz, baseUrl)}
${footer(biz, baseUrl)}
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT: Build all pages
// ══════════════════════════════════════════════════════════════════════════════

export interface DemoPages {
  home:      string;
  services:  string;
  gallery:   string;
  about:     string;
  booking:   string;
  stylists?: string;
  products?: string;
  events?:   string;
  community?: string;
  [key: string]: string | undefined;
}

export function buildAllPages(biz: BizPageData, baseUrl: string): DemoPages {
  const pages: DemoPages = {
    home:     buildHomePage(biz, baseUrl),
    services: buildServicesPage(biz, baseUrl),
    gallery:  buildGalleryPage(biz, baseUrl),
    about:    buildAboutPage(biz, baseUrl),
    booking:  buildBookingPage(biz, baseUrl),
  };
  if (biz.team.length > 0) {
    pages.stylists = buildStylistsPage(biz, baseUrl);
  }
  if (biz.products?.length) {
    pages.products = buildProductsPage(biz, baseUrl);
  }
  if (biz.specialEvents) {
    pages.events = buildSpecialEventsPage(biz, baseUrl);
  }
  if (biz.community?.length) {
    pages.community = buildCommunityPage(biz, baseUrl);
  }
  return pages;
}
