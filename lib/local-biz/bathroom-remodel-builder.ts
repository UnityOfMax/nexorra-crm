/**
 * Bathroom Remodel demo website builder
 * Design: Cormorant Garamond (headings) + Inter (body), dark slate + warm bronze
 * Palette: #141820 bg, #92704a bronze, #1a2030 card bg, #f5f5f5 light sections
 * Six pages: home, about, contact, team, gallery, testimonials
 * Features: sticky nav with scroll-solidify, infinite CSS marquee, before/after slider,
 *            data-reveal IntersectionObserver, OpenStreetMap contact, FAQ <details>
 */

import { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ph(biz: BizPageData, idx: number): string {
  const FALLBACKS = [
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80',
    'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80',
    'https://images.unsplash.com/photo-1620626011761-996317702149?w=800&q=80',
  ];
  return biz.photos[idx] || FALLBACKS[idx % FALLBACKS.length];
}

function phoneDisplay(biz: BizPageData): string {
  return biz.phone || '(503) 555-0180';
}

function telHref(biz: BizPageData): string {
  return `tel:${(biz.phone || '').replace(/[^0-9+]/g, '')}`;
}

function cityState(biz: BizPageData): string {
  if (biz.city && biz.state) return `${biz.city}, ${biz.state}`;
  if (biz.city) return biz.city;
  return 'Portland, OR';
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const CSS_VARS = `
  --color-primary: #92704a;
  --color-primary-hover: #7a5c3a;
  --color-dark: #141820;
  --color-dark-2: #1a2030;
  --color-gray-bg: #f5f5f5;
  --color-gray-100: #e5e5e5;
  --color-white: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #6b7280;
  --section-pad: clamp(4rem, 8vw, 7rem);
  --card-radius: 12px;
  --transition-base: .35s cubic-bezier(.4,0,.2,1);
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">`;

const TAILWIND = `<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={theme:{extend:{fontFamily:{display:['Cormorant Garamond','Georgia','serif'],sans:['Inter','system-ui','sans-serif']},colors:{primary:'#92704a',dark:'#141820','dark-2':'#1a2030'}}}}</script>`;

// ── Data-reveal script ─────────────────────────────────────────────────────────

const REVEAL_STYLE = `<style>
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease;}
[data-reveal].revealed{opacity:1;transform:translateY(0);}
[data-delay="1"]{transition-delay:.1s;}
[data-delay="2"]{transition-delay:.2s;}
[data-delay="3"]{transition-delay:.3s;}
[data-delay="4"]{transition-delay:.4s;}
</style>`;

const REVEAL_SCRIPT = `<script>
(function(){const io=new IntersectionObserver((e)=>{e.forEach(i=>{if(i.isIntersecting){i.target.classList.add('revealed');io.unobserve(i.target);}});},{threshold:.1,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));})();
</script>`;

// ── Before/After slider ────────────────────────────────────────────────────────

const BA_BEFORE = 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80';
const BA_AFTER  = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80';

function baSlider(beforeSrc: string, afterSrc: string): string {
  return `<div class="ba-container" style="position:relative;overflow:hidden;border-radius:12px;aspect-ratio:4/3;cursor:ew-resize;user-select:none;max-width:640px;margin:0 auto">
  <img src="${esc(afterSrc)}" alt="Bathroom after renovation" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div class="ba-before" style="position:absolute;inset:0;clip-path:inset(0 50% 0 0)">
    <img src="${esc(beforeSrc)}" alt="Bathroom before renovation" style="width:100%;height:100%;object-fit:cover">
  </div>
  <div style="position:absolute;top:14px;left:14px;background:rgba(20,24,32,0.9);color:#f5f0ea;padding:4px 13px;font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;border-radius:20px">Before</div>
  <div style="position:absolute;top:14px;right:14px;background:#92704a;color:#fff;padding:4px 13px;font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;border-radius:20px">After</div>
  <div class="ba-handle" style="position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:rgba(146,112,74,0.7);touch-action:none">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;background:#92704a;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(146,112,74,.18),0 6px 28px rgba(0,0,0,.45)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
}

const BA_SCRIPT = `<script>
document.querySelectorAll('.ba-container').forEach(function(c){
  var b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle');var d=false;
  function pos(x){var r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}
  h.addEventListener('mousedown',function(){d=true;});window.addEventListener('mouseup',function(){d=false;});window.addEventListener('mousemove',function(e){if(d)pos(e.clientX);});
  h.addEventListener('touchstart',function(e){d=true;e.preventDefault();},{passive:false});window.addEventListener('touchend',function(){d=false;});window.addEventListener('touchmove',function(e){if(d)pos(e.touches[0].clientX);},{passive:true});
});
</script>`;

// ── Shared Nav ─────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string, active: string): string {
  const leftLinks = [
    { href: `${baseUrl}`,         label: 'Home'    },
    { href: `${baseUrl}/about`,   label: 'About'   },
    { href: `${baseUrl}/gallery`, label: 'Gallery' },
  ];
  const rightLinks = [
    { href: `${baseUrl}/team`,         label: 'Team'    },
    { href: `${baseUrl}/testimonials`, label: 'Reviews' },
    { href: `${baseUrl}/contact`,      label: 'Contact' },
  ];
  const allLinks = [...leftLinks, ...rightLinks];

  function linkStyle(label: string): string {
    const isActive = label === active;
    return `font-family:Inter,sans-serif;font-size:13px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:${isActive ? '#92704a' : 'rgba(245,240,234,0.72)'};text-decoration:none;transition:color var(--transition-base);` ;
  }

  return `<style>
#site-nav{position:fixed;top:0;left:0;right:0;z-index:200;transition:background var(--transition-base),box-shadow var(--transition-base);}
#site-nav.scrolled{background:rgba(20,24,32,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 1px 0 rgba(146,112,74,.13);}
.nav-inner{max-width:1280px;margin:0 auto;padding:0 32px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:76px;}
.nav-left,.nav-right{display:flex;align-items:center;gap:32px;}
.nav-right{justify-content:flex-end;}
.nav-link{font-family:Inter,sans-serif;font-size:13px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;transition:color .25s;}
.nav-link:hover{color:#92704a!important;}
.nav-cta{font-family:Inter,sans-serif;font-size:13px;font-weight:600;letter-spacing:.06em;color:#fff;background:#92704a;padding:10px 22px;border-radius:6px;text-decoration:none;white-space:nowrap;transition:background var(--transition-base);}
.nav-cta:hover{background:#7a5c3a;}
#nav-toggle{display:none;background:none;border:none;cursor:pointer;padding:8px;}
#mobile-menu{display:none;flex-direction:column;padding:16px 24px 28px;border-top:1px solid rgba(146,112,74,.13);gap:0;background:rgba(20,24,32,.98);}
#mobile-menu a{font-family:Inter,sans-serif;font-size:15px;font-weight:500;color:rgba(245,240,234,.8);text-decoration:none;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.05);}
#mobile-menu a:last-child{color:#92704a;border-bottom:none;font-weight:600;}
@media(max-width:860px){.nav-left,.nav-right{display:none!important;}.nav-inner{grid-template-columns:1fr auto;}#nav-toggle{display:flex!important;}}
</style>
<nav id="site-nav">
  <div class="nav-inner">
    <div class="nav-left">
      ${leftLinks.map(l => `<a href="${esc(l.href)}" class="nav-link" style="color:${l.label===active?'#92704a':'rgba(245,240,234,0.72)'}">${l.label}</a>`).join('')}
    </div>
    <a href="${esc(baseUrl)}" style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#f5f0ea;text-decoration:none;letter-spacing:.06em;white-space:nowrap;">${esc(biz.name)}</a>
    <div class="nav-right">
      ${rightLinks.map(l => `<a href="${esc(l.href)}" class="nav-link" style="color:${l.label===active?'#92704a':'rgba(245,240,234,0.72)'}">${l.label}</a>`).join('')}
      <a href="${esc(telHref(biz))}" class="nav-cta">Free Consultation</a>
    </div>
    <button id="nav-toggle" onclick="var m=document.getElementById('mobile-menu');m.style.display=m.style.display==='flex'?'none':'flex';">
      <svg width="24" height="24" fill="none" stroke="#f5f0ea" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
  <div id="mobile-menu">
    ${allLinks.map(l => `<a href="${esc(l.href)}">${l.label}</a>`).join('')}
    <a href="${esc(telHref(biz))}">${phoneDisplay(biz)}</a>
  </div>
</nav>
<script>
(function(){var n=document.getElementById('site-nav');function upd(){n.classList.toggle('scrolled',window.scrollY>40);}window.addEventListener('scroll',upd,{passive:true});upd();})();
</script>`;
}

// ── Shared Footer ──────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `<footer style="background:#0d111a;color:rgba(245,240,234,.55);font-family:Inter,sans-serif;font-size:13px;">
  <div style="max-width:1280px;margin:0 auto;padding:56px 32px 32px;display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;">
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:#f5f0ea;margin-bottom:14px;">${esc(biz.name)}</div>
      <p style="line-height:1.7;max-width:300px;color:rgba(245,240,234,.5);">Premium bathroom remodeling in ${esc(cityState(biz))}. Craftsmanship built to last.</p>
      <a href="${esc(telHref(biz))}" style="display:inline-block;margin-top:20px;font-size:16px;font-weight:600;color:#92704a;text-decoration:none;">${esc(phoneDisplay(biz))}</a>
    </div>
    <div>
      <div style="font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#92704a;margin-bottom:18px;">Navigation</div>
      ${[{href:'',label:'Home'},{href:'/about',label:'About'},{href:'/gallery',label:'Gallery'},{href:'/team',label:'Team'},{href:'/testimonials',label:'Reviews'},{href:'/contact',label:'Contact'}].map(l=>`<div style="margin-bottom:10px;"><a href="${esc(baseUrl+l.href)}" style="color:rgba(245,240,234,.55);text-decoration:none;transition:color .2s;" onmouseover="this.style.color='#92704a'" onmouseout="this.style.color='rgba(245,240,234,.55)'">${l.label}</a></div>`).join('')}
    </div>
    <div>
      <div style="font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#92704a;margin-bottom:18px;">Contact</div>
      <div style="margin-bottom:10px;">${esc(biz.address || cityState(biz))}</div>
      <div style="margin-bottom:10px;">${esc(phoneDisplay(biz))}</div>
      <div style="margin-bottom:10px;">${esc(biz.hours || 'Mon-Sat 8am-6pm')}</div>
    </div>
  </div>
  <div style="max-width:1280px;margin:0 auto;padding:20px 32px;border-top:1px solid rgba(146,112,74,.1);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
    <span>© ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</span>
    <span>Licensed Contractor · NKBA Certified · ${esc(cityState(biz))}</span>
  </div>
</footer>`;
}

// ── Page shell ─────────────────────────────────────────────────────────────────

function shell(title: string, navHtml: string, body: string, footerHtml: string, extraHead = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${FONTS}
${TAILWIND}
${REVEAL_STYLE}
${extraHead}
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{${CSS_VARS}}
html{scroll-behavior:smooth;}
body{font-family:Inter,system-ui,sans-serif;background:#141820;color:#f5f0ea;-webkit-font-smoothing:antialiased;}
img{max-width:100%;height:auto;display:block;}
a{color:inherit;}
</style>
</head>
<body>
${navHtml}
${body}
${footerHtml}
${REVEAL_SCRIPT}
${BA_SCRIPT}
</body>
</html>`;
}

// ── Reviews data ───────────────────────────────────────────────────────────────

interface ReviewEntry { text: string; name: string; city: string; svc: string; date: string; }

function reviewsData(biz: BizPageData, count: number): ReviewEntry[] {
  const defaults: ReviewEntry[] = [
    { text: 'We had been putting off our master bath for three years. They made it effortless. From the design consult to final tile grout, everything happened on schedule and the result is better than the photos online.', name: 'Claire M.', city: biz.city || 'Portland', svc: 'Master Bath Remodel', date: 'March 2025' },
    { text: 'The walk-in shower they designed is the reason I look forward to mornings now. Custom tile, frameless glass, and a bench I actually use. Not a single leak since installation.', name: 'Darren & Yvonne H.', city: 'Lake Oswego', svc: 'Walk-In Shower', date: 'January 2025' },
    { text: 'They sourced a soaking tub I could not find anywhere else and had it installed in two days. The crew was quiet, respectful, and cleaned everything before they left.', name: 'Sofia R.', city: biz.city || 'NE District', svc: 'Soaking Tub Addition', date: 'December 2024' },
    { text: 'Three competing bids. Two of them tried to oversell us. These people told us exactly what we needed, nothing more. The honest quote matched the final invoice to the dollar.', name: 'James & Patricia O.', city: 'Beaverton', svc: 'Vanity & Tile', date: 'November 2024' },
    { text: 'Guest bathroom went from a 1980s eyesore to something out of a boutique hotel. Our guests keep commenting on it. Worth every cent of the investment.', name: 'Rachel T.', city: 'Hillsboro', svc: 'Guest Bath Remodel', date: 'September 2024' },
    { text: 'The project manager called me every Friday with a status update without me asking. I have never experienced that level of communication from a contractor. It made all the difference.', name: 'Steven K.', city: biz.city || 'SW Portland', svc: 'Full Remodel', date: 'August 2024' },
    { text: 'I was nervous about the mess and the timeline. They put down floor protection on day one and finished two days ahead of schedule. Perfect tile work throughout.', name: 'Andrea & Tom N.', city: 'Tigard', svc: 'Tile & Flooring', date: 'July 2024' },
    { text: 'The NKBA designer they sent understood exactly what we wanted even before we could articulate it. The layout she proposed uses the space in ways we had not considered.', name: 'Margot F.', city: 'West Linn', svc: 'Design Consultation', date: 'May 2024' },
  ];
  const texts = biz.reviewTexts || [];
  const merged: ReviewEntry[] = texts.map((text, i) => ({
    text,
    name: defaults[i]?.name || 'Verified Customer',
    city: defaults[i]?.city || biz.city || 'Local Area',
    svc: defaults[i]?.svc || 'Bathroom Remodel',
    date: defaults[i]?.date || '2025',
  }));
  while (merged.length < count) merged.push(defaults[merged.length % defaults.length]);
  return merged.slice(0, count);
}

// ── Trust bar ──────────────────────────────────────────────────────────────────

function trustBar(): string {
  const items = [
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M8 12h8M12 8v8M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3s9 4.03 9 9z"/></svg>`, label: 'Free Consultation' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-9.618 5.04A11.955 11.955 0 012 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-1.57-.366-3.055-1.016-4.372a.75.75 0 00-.366-.388z"/></svg>`, label: 'Licensed Contractor' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.372 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.539 1.118L12 14.347l-3.953 2.777c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L4.063 9.384c-.784-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L11.05 2.927z"/></svg>`, label: 'NKBA Certified' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M12 6V12l4 2M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/></svg>`, label: '8+ Years Experience' },
    { icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`, label: 'Satisfaction Guaranteed' },
  ];
  return `<section style="background:#f5f5f5;padding:0;">
  <div style="max-width:1280px;margin:0 auto;display:flex;align-items:stretch;justify-content:center;flex-wrap:wrap;">
    ${items.map(item => `<div style="flex:1;min-width:160px;max-width:220px;padding:32px 20px;display:flex;flex-direction:column;align-items:center;gap:10px;border-right:1px solid #e5e5e5;text-align:center;">
      <span style="color:#92704a;">${item.icon}</span>
      <span style="font-family:Inter,sans-serif;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#1a1a1a;line-height:1.4;">${item.label}</span>
    </div>`).join('')}
  </div>
</section>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildHome(biz: BizPageData, baseUrl: string): string {
  const navHtml = nav(biz, baseUrl, 'Home');
  const footerHtml = footer(biz, baseUrl);

  const SERVICES = [
    { name: 'Walk-In Shower Renovation', img: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80', desc: 'Custom frameless glass enclosures, bench seating, and premium tile work that turns your shower into a daily ritual.' },
    { name: 'Vanity & Sink Installation', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', desc: 'Floating vanities, vessel sinks, and storage solutions designed around your space and your morning routine.' },
    { name: 'Soaking Tub Addition', img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80', desc: 'Freestanding soaking tubs and alcove installations with full plumbing, surrounds, and accent lighting.' },
    { name: 'Tile Work & Flooring', img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', desc: 'Porcelain, natural stone, and mosaic tile — laid straight, on pattern, or custom-designed for visual impact.' },
    { name: 'Full Master Bath Remodel', img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80', desc: 'From layout design through final fixture install. One crew, one schedule, zero subcontractor surprises.' },
    { name: 'Bathroom Addition', img: 'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?w=800&q=80', desc: 'Full permit-to-finish additions for growing households — we handle the design, plumbing, and finish work.' },
  ];

  const WHY_US = [
    { num: '01', title: 'Bespoke Design Service', desc: 'Every project begins with a design consultation — no pre-packaged plans, no catalog selections unless you want them.' },
    { num: '02', title: 'NKBA Certified Specialists', desc: 'Our designers hold NKBA credentials, the only certifications in the industry that verify bathroom design expertise.' },
    { num: '03', title: 'Premium Fixture Sourcing', desc: 'We have supplier relationships most homeowners cannot access — better product at trade pricing.' },
    { num: '04', title: 'Minimal Disruption Process', desc: 'Dust barriers, daily cleanup, and a project timeline you can count on. We treat your home with respect.' },
    { num: '05', title: '5-Year Workmanship Warranty', desc: 'Every project we complete is backed by a five-year warranty on all labor. We stand behind our work.' },
  ];

  const GALLERY_IMGS = [
    ph(biz, 0), ph(biz, 1), ph(biz, 2),
    ph(biz, 3), ph(biz, 4), ph(biz, 5),
  ];

  const reviews8 = reviewsData(biz, 8);
  const reviewCards = reviews8.map(r => `
    <div style="flex:0 0 340px;background:#1a2030;border-radius:12px;padding:28px;border:1px solid rgba(146,112,74,.1);">
      <div style="color:#92704a;font-size:15px;letter-spacing:.06em;margin-bottom:14px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.75;color:rgba(245,240,234,.8);margin-bottom:18px;">"${esc(r.text)}"</p>
      <div style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#f5f0ea;">${esc(r.name)}</div>
      <div style="font-family:Inter,sans-serif;font-size:12px;color:rgba(245,240,234,.4);margin-top:2px;">${esc(r.svc)} — ${esc(r.city)}</div>
    </div>`).join('');

  const FAQ = [
    { q: 'How long does a full bathroom remodel take?', a: 'Most full remodels run 2–4 weeks depending on scope. Shower-only projects can complete in 3–5 days. We give you a firm timeline before work begins and communicate any changes immediately.' },
    { q: 'Do you handle permits and inspections?', a: 'Yes. We pull all required permits, schedule inspections, and ensure every installation meets local code. You never have to deal with the permit office.' },
    { q: 'Can I stay in my home during the remodel?', a: 'For most projects, yes. We work in contained areas, use dust barriers, and restore water access each evening where possible. For full gut remodels, we work with you on a realistic timeline.' },
    { q: 'Do you offer design services or do I need to bring my own plans?', a: 'We offer full in-house design through our NKBA-certified designers. If you have plans from an architect or designer, we work from those too. Either way, you get a single point of contact.' },
    { q: 'What does the free consultation include?', a: 'A walkthrough of your space, discussion of your goals and budget, preliminary layout ideas, and a ballpark estimate — all at no charge and with no obligation to proceed.' },
  ];

  const body = `
<main style="padding-top:76px;">

  <!-- HERO -->
  <section style="position:relative;height:100svh;min-height:600px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
    <img src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1920&q=80" alt="Luxury bathroom remodel" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;">
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(20,24,32,.55) 0%,rgba(20,24,32,.72) 100%);z-index:1;"></div>
    <div style="position:relative;z-index:2;text-align:center;padding:0 24px;max-width:900px;">
      <div style="font-family:'Cormorant Garamond',serif;font-size:clamp(3rem,8vw,6rem);font-weight:700;font-style:italic;color:#fff;line-height:1.05;letter-spacing:-.01em;margin-bottom:28px;" data-reveal>${esc(biz.name)}</div>
      <p style="font-family:Inter,sans-serif;font-size:clamp(1rem,2.5vw,1.2rem);font-weight:300;color:rgba(255,255,255,.82);max-width:520px;margin:0 auto 36px;line-height:1.7;" data-reveal data-delay="1">${esc(biz.heroSub || 'Premium bathroom remodeling for the home you deserve.')}</p>
      <a href="${esc(telHref(biz))}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;letter-spacing:.06em;color:#fff;border:1.5px solid rgba(255,255,255,.7);padding:14px 36px;border-radius:6px;text-decoration:none;transition:all var(--transition-base);display:inline-block;" onmouseover="this.style.background='rgba(255,255,255,.12)';this.style.borderColor='#fff'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,255,255,.7)'" data-reveal data-delay="2">Schedule a Consultation</a>
    </div>
    <div style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:.6;">
      <span style="font-family:Inter,sans-serif;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#fff;">Scroll</span>
      <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke="#fff" stroke-width="1.5"><rect x="2" y="2" width="12" height="20" rx="6"/><circle cx="8" cy="8" r="2" fill="#fff" stroke="none"><animate attributeName="cy" values="8;14;8" dur="1.8s" repeatCount="indefinite"/></circle></svg>
    </div>
  </section>

  <!-- TRUST BAR -->
  ${trustBar()}

  <!-- SERVICES -->
  <section style="background:#fff;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:56px;" data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">What We Do</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3rem);font-weight:700;color:#1a1a1a;line-height:1.15;">Every corner of your bathroom, redone right.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:28px;">
        ${SERVICES.map((s, i) => `<div style="border-radius:12px;overflow:hidden;background:#f9f9f9;border:1px solid #e5e5e5;" data-reveal data-delay="${Math.min(i+1,4) as unknown as string}">
          <div style="aspect-ratio:16/9;overflow:hidden;">
            <img src="${esc(s.img)}" alt="${esc(s.name)}" style="width:100%;height:100%;object-fit:cover;transition:transform .5s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
          </div>
          <div style="padding:24px 26px;">
            <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.35rem;font-weight:700;color:#1a1a1a;margin-bottom:10px;">${esc(s.name)}</h3>
            <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.7;color:#6b7280;">${esc(s.desc)}</p>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- SHOWREEL — 2-col -->
  <section style="background:#141820;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;">
      <div style="border-radius:12px;overflow:hidden;aspect-ratio:4/3;">
        <img src="${esc(ph(biz,1))}" alt="Bathroom remodel showcase" style="width:100%;height:100%;object-fit:cover;" data-reveal>
      </div>
      <div data-reveal data-delay="2">
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:14px;">Our Philosophy</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.8rem);font-weight:700;color:#f5f0ea;line-height:1.2;margin-bottom:20px;">Your bathroom should feel like a retreat.</h2>
        <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,240,234,.65);margin-bottom:32px;">Most bathrooms are designed around function. We design around the way you want to feel when you walk in. The tile you touch, the light that hits the mirror, the way water sounds in the shower — we think about all of it before a single tool comes out.</p>
        <a href="${esc(baseUrl+'/contact')}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;letter-spacing:.06em;color:#fff;background:#92704a;padding:13px 30px;border-radius:6px;text-decoration:none;display:inline-block;transition:background var(--transition-base);" onmouseover="this.style.background='#7a5c3a'" onmouseout="this.style.background='#92704a'">Talk to a Designer</a>
      </div>
    </div>
  </section>

  <!-- WHY US — sticky left -->
  <section style="background:#1a2030;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;">
      <div style="position:sticky;top:120px;" data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:14px;">Why Choose Us</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,3.5vw,2.8rem);font-weight:700;color:#f5f0ea;line-height:1.2;margin-bottom:20px;">Five reasons homeowners trust us with their most personal space.</h2>
        <p style="font-family:Inter,sans-serif;font-size:14px;font-weight:300;line-height:1.75;color:rgba(245,240,234,.55);margin-bottom:32px;">Bathrooms are where your day starts and ends. We take that seriously.</p>
        <a href="${esc(telHref(biz))}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#92704a;text-decoration:none;">${esc(phoneDisplay(biz))}</a>
      </div>
      <div style="display:flex;flex-direction:column;gap:0;">
        ${WHY_US.map((w, i) => `<div style="padding:28px 0;border-bottom:1px solid rgba(146,112,74,.12);" data-reveal data-delay="${Math.min(i+1,4) as unknown as string}">
          <div style="display:flex;gap:20px;align-items:flex-start;">
            <span style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:700;color:#92704a;line-height:1;min-width:36px;">${w.num}</span>
            <div>
              <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:700;color:#f5f0ea;margin-bottom:8px;">${esc(w.title)}</h3>
              <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.7;color:rgba(245,240,234,.6);">${esc(w.desc)}</p>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- GALLERY preview — white, 3 col -->
  <section style="background:#fff;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:40px;" data-reveal>
        <div>
          <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:10px;">Our Work</div>
          <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.8rem);font-weight:700;color:#1a1a1a;">Recent Projects</h2>
        </div>
        <a href="${esc(baseUrl+'/gallery')}" style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;letter-spacing:.06em;color:#92704a;text-decoration:none;border-bottom:1px solid #92704a;padding-bottom:2px;">View All</a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        ${GALLERY_IMGS.slice(0,6).map((img, i) => `<div style="border-radius:10px;overflow:hidden;aspect-ratio:${i===0?'4/3':'1/1'};" data-reveal data-delay="${Math.min(i+1,4) as unknown as string}">
          <img src="${esc(img)}" alt="Bathroom remodel project ${i+1}" style="width:100%;height:100%;object-fit:cover;transition:transform .5s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS — infinite marquee -->
  <section style="background:#141820;padding:var(--section-pad) 0;overflow:hidden;">
    <div style="max-width:1280px;margin:0 auto 40px;padding:0 32px;text-align:center;" data-reveal>
      <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">Client Reviews</div>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3rem);font-weight:700;color:#f5f0ea;">What our clients say.</h2>
    </div>
    <style>
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    .testimonials__wrap{overflow:hidden;mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 8%,black 92%,transparent);}
    .testimonials__track{display:flex;gap:1.5rem;width:max-content;animation:marquee 45s linear infinite;}
    .testimonials__track:hover{animation-play-state:paused;}
    </style>
    <div class="testimonials__wrap">
      <div class="testimonials__track">
        ${[...reviews8, ...reviews8].map(r => `<div style="flex:0 0 340px;background:#1a2030;border-radius:12px;padding:28px;border:1px solid rgba(146,112,74,.1);">
          <div style="color:#92704a;font-size:15px;letter-spacing:.06em;margin-bottom:14px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.75;color:rgba(245,240,234,.8);margin-bottom:18px;">"${esc(r.text)}"</p>
          <div style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#f5f0ea;">${esc(r.name)}</div>
          <div style="font-family:Inter,sans-serif;font-size:12px;color:rgba(245,240,234,.4);margin-top:2px;">${esc(r.svc)} — ${esc(r.city)}</div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section style="background:#f5f5f5;padding:var(--section-pad) 32px;">
    <div style="max-width:760px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:48px;" data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">FAQ</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.6rem);font-weight:700;color:#1a1a1a;">Questions we hear most often.</h2>
      </div>
      <div style="display:flex;flex-direction:column;gap:0;" data-reveal>
        ${FAQ.map(f => `<details style="border-bottom:1px solid #e5e5e5;overflow:hidden;">
          <summary style="font-family:Inter,sans-serif;font-size:15px;font-weight:600;color:#1a1a1a;padding:22px 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">
            ${esc(f.q)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92704a" stroke-width="2" style="flex-shrink:0;transition:transform .3s;"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.75;color:#6b7280;padding:0 0 22px;">${esc(f.a)}</p>
        </details>`).join('')}
      </div>
    </div>
  </section>

  <!-- CONTACT CTA — dark -->
  <section style="background:#141820;padding:var(--section-pad) 32px;">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;">
      <div data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:14px;">Get Started</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,3.5vw,2.8rem);font-weight:700;color:#f5f0ea;line-height:1.2;margin-bottom:18px;">Ready to see what your bathroom could be?</h2>
        <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,240,234,.6);margin-bottom:28px;">The consultation is free. The conversation is short. And you'll leave knowing exactly what your project will cost.</p>
        <a href="${esc(telHref(biz))}" style="display:block;font-family:Inter,sans-serif;font-size:clamp(1.4rem,3vw,2rem);font-weight:600;color:#92704a;text-decoration:none;margin-bottom:8px;">${esc(phoneDisplay(biz))}</a>
        <div style="font-family:Inter,sans-serif;font-size:13px;color:rgba(245,240,234,.4);">${esc(biz.hours || 'Mon-Sat 8am-6pm')}</div>
      </div>
      <form onsubmit="event.preventDefault();this.innerHTML='<p style=\\'font-family:Inter,sans-serif;font-size:15px;color:#92704a;padding:24px 0;\\'>Thank you. We\\'ll be in touch within one business day.</p>';" style="display:flex;flex-direction:column;gap:14px;" data-reveal data-delay="2">
        <input type="text" name="name" placeholder="Your name" required style="font-family:Inter,sans-serif;font-size:14px;background:#1a2030;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
        <input type="tel" name="phone" placeholder="Phone number" required style="font-family:Inter,sans-serif;font-size:14px;background:#1a2030;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
        <input type="email" name="email" placeholder="Email address" style="font-family:Inter,sans-serif;font-size:14px;background:#1a2030;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
        <select name="service" style="font-family:Inter,sans-serif;font-size:14px;background:#1a2030;color:rgba(245,240,234,.7);border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
          <option value="">Project type (optional)</option>
          <option>Walk-In Shower Renovation</option>
          <option>Vanity & Sink Installation</option>
          <option>Soaking Tub Addition</option>
          <option>Tile Work & Flooring</option>
          <option>Full Master Bath Remodel</option>
          <option>Bathroom Addition</option>
        </select>
        <textarea name="message" placeholder="Anything else we should know?" rows="3" style="font-family:Inter,sans-serif;font-size:14px;background:#1a2030;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;resize:vertical;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'"></textarea>
        <button type="submit" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;letter-spacing:.06em;color:#fff;background:#92704a;border:none;border-radius:6px;padding:15px 24px;cursor:pointer;transition:background var(--transition-base);" onmouseover="this.style.background='#7a5c3a'" onmouseout="this.style.background='#92704a'">Request Free Consultation</button>
      </form>
    </div>
  </section>

</main>`;

  return shell(`${biz.name} — Bathroom Remodeling`, navHtml, body, footerHtml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ABOUT PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildAbout(biz: BizPageData, baseUrl: string): string {
  const navHtml = nav(biz, baseUrl, 'About');
  const footerHtml = footer(biz, baseUrl);

  const body = `
<main style="padding-top:76px;">

  <!-- PAGE HERO -->
  <section style="background:#1a2030;padding:clamp(3rem,6vw,5rem) 32px;">
    <div style="max-width:800px;margin:0 auto;text-align:center;" data-reveal>
      <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:14px;">About Us</div>
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,5vw,3.8rem);font-weight:700;color:#f5f0ea;line-height:1.1;margin-bottom:20px;">${esc(biz.aboutText || 'Bathroom design built around the way you live.')}</h1>
      <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;line-height:1.8;color:rgba(245,240,234,.65);">${esc(biz.aboutText2 || 'We started this company because we believed homeowners deserved a contractor who treated their bathroom remodel the way a hotel designer treats a suite.')}</p>
    </div>
  </section>

  <!-- STORY -->
  <section style="background:#fff;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;">
      <div data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:14px;">Our Story</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.8rem,3vw,2.5rem);font-weight:700;color:#1a1a1a;line-height:1.2;margin-bottom:18px;">Founded on a belief that bathrooms deserve more attention than they get.</h2>
        <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;line-height:1.8;color:#6b7280;margin-bottom:18px;">Most remodeling companies treat bathrooms like a box to check. We started ${esc(biz.name)} because we knew that the 20 minutes most people spend in their bathroom each morning shapes the rest of their day.</p>
        <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;line-height:1.8;color:#6b7280;margin-bottom:32px;">Every material we specify, every tile we lay, every fixture we source is chosen with that in mind. We are not a production remodeler. We are a design-led studio that also builds what we design.</p>
        <div style="display:flex;gap:40px;">
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:700;color:#92704a;">${esc(biz.yearsInBiz || '8')}+</div>
            <div style="font-family:Inter,sans-serif;font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;margin-top:4px;">Years in Business</div>
          </div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:700;color:#92704a;">${esc(String(biz.reviews || '200'))}+</div>
            <div style="font-family:Inter,sans-serif;font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;margin-top:4px;">Projects Completed</div>
          </div>
          <div>
            <div style="font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:700;color:#92704a;">${esc(String(biz.rating || '5.0'))}</div>
            <div style="font-family:Inter,sans-serif;font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;margin-top:4px;">Average Rating</div>
          </div>
        </div>
      </div>
      <div style="border-radius:12px;overflow:hidden;aspect-ratio:3/4;" data-reveal data-delay="2">
        <img src="${esc(ph(biz,2))}" alt="Our studio workspace" style="width:100%;height:100%;object-fit:cover;">
      </div>
    </div>
  </section>

  <!-- DESIGN PHILOSOPHY -->
  <section style="background:#141820;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:52px;" data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">Design Philosophy</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3rem);font-weight:700;color:#f5f0ea;">How we think about space.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;">
        ${[
          { title: 'Proportion first.', desc: 'A small bathroom that feels spacious beats a large bathroom that feels cramped. We start with layout before we talk about finishes.' },
          { title: 'Material honesty.', desc: 'We do not use faux stone or plastic-laminate finishes dressed up as something else. Natural materials age beautifully. Imitations do not.' },
          { title: 'Light as material.', desc: 'How light moves through a bathroom in the morning is as important as the tile. We specify fixtures, placement, and temperature together with finishes.' },
        ].map((p, i) => `<div style="border-radius:12px;background:#1a2030;border:1px solid rgba(146,112,74,.1);padding:32px;" data-reveal data-delay="${i+1}">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;color:#92704a;margin-bottom:12px;">${esc(p.title)}</h3>
          <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.75;color:rgba(245,240,234,.65);">${esc(p.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CERTIFICATIONS -->
  <section style="background:#f5f5f5;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:44px;" data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">Credentials</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3vw,2.5rem);font-weight:700;color:#1a1a1a;">Industry certifications that matter.</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;">
        ${[
          { cert: 'NKBA Certified', full: 'National Kitchen & Bath Association', desc: 'The only certification that tests bathroom design knowledge specifically.' },
          { cert: 'NARI Certified Remodeler', full: 'National Association of the Remodeling Industry', desc: 'Verifies business ethics, financial stability, and technical competence.' },
          { cert: 'EPA Lead-Safe Certified', full: 'Environmental Protection Agency', desc: 'Required for all remodels in homes built before 1978. We hold this by default.' },
          { cert: 'Licensed General Contractor', full: `State of ${esc(biz.state || 'Oregon')}`, desc: 'Full general contractor license for all structural, plumbing, and electrical work.' },
        ].map((c, i) => `<div style="background:#fff;border-radius:10px;border:1px solid #e5e5e5;padding:26px;" data-reveal data-delay="${i+1}">
          <div style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:700;color:#92704a;margin-bottom:4px;">${esc(c.cert)}</div>
          <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">${esc(c.full)}</div>
          <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.65;color:#6b7280;">${esc(c.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section style="background:#141820;padding:var(--section-pad) 32px;text-align:center;">
    <div style="max-width:640px;margin:0 auto;" data-reveal>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,2.8rem);font-weight:700;color:#f5f0ea;margin-bottom:16px;">See the work before you commit.</h2>
      <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;line-height:1.75;color:rgba(245,240,234,.6);margin-bottom:32px;">Browse our project gallery, then call us when you are ready to talk.</p>
      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
        <a href="${esc(baseUrl+'/gallery')}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#fff;background:#92704a;padding:13px 28px;border-radius:6px;text-decoration:none;transition:background var(--transition-base);" onmouseover="this.style.background='#7a5c3a'" onmouseout="this.style.background='#92704a'">View Gallery</a>
        <a href="${esc(telHref(biz))}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#92704a;border:1.5px solid rgba(146,112,74,.5);padding:13px 28px;border-radius:6px;text-decoration:none;transition:all var(--transition-base);" onmouseover="this.style.borderColor='#92704a'" onmouseout="this.style.borderColor='rgba(146,112,74,.5)'">${esc(phoneDisplay(biz))}</a>
      </div>
    </div>
  </section>

</main>`;

  return shell(`About — ${biz.name}`, navHtml, body, footerHtml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildContact(biz: BizPageData, baseUrl: string): string {
  const navHtml = nav(biz, baseUrl, 'Contact');
  const footerHtml = footer(biz, baseUrl);

  const CONTACT_FAQ = [
    { q: 'Do I need to have a design ready before calling?', a: 'No. Most clients come to us with nothing more than a vague idea and a budget. We help you figure out the rest.' },
    { q: 'How soon can you start?', a: 'Current lead time is typically 3–6 weeks from signed contract to project start, depending on scope and material availability.' },
    { q: 'Do you work in my area?', a: `We serve ${esc(cityState(biz))} and surrounding communities. Call us to confirm availability for your address.` },
    { q: 'Is there a fee for the consultation?', a: 'No. The first consultation is free, takes about 45 minutes, and comes with a written estimate at no charge.' },
  ];

  const body = `
<main style="padding-top:76px;">

  <!-- HERO PHONE -->
  <section style="background:#141820;padding:clamp(4rem,8vw,6rem) 32px;text-align:center;">
    <div style="max-width:700px;margin:0 auto;" data-reveal>
      <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:18px;">Get In Touch</div>
      <a href="${esc(telHref(biz))}" style="display:block;font-family:'Cormorant Garamond',serif;font-size:clamp(3rem,10vw,6rem);font-weight:700;color:#92704a;text-decoration:none;line-height:1;margin-bottom:16px;transition:color .2s;" onmouseover="this.style.color='#b8936a'" onmouseout="this.style.color='#92704a'">${esc(phoneDisplay(biz))}</a>
      <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;color:rgba(245,240,234,.6);">${esc(biz.hours || 'Mon-Sat 8am-6pm')} — Free consultations available</p>
    </div>
  </section>

  <!-- FORM + INFO -->
  <section style="background:#1a2030;padding:var(--section-pad) 32px;">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:72px;">
      <div data-reveal>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.6rem);font-weight:700;color:#f5f0ea;margin-bottom:20px;">Tell us about your project.</h2>
        <p style="font-family:Inter,sans-serif;font-size:14px;font-weight:300;line-height:1.8;color:rgba(245,240,234,.55);margin-bottom:32px;">Fill in the form and we will reach out within one business day to schedule your free consultation.</p>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:32px;">
          <div style="font-family:Inter,sans-serif;font-size:14px;color:rgba(245,240,234,.7);"><strong style="color:#f5f0ea;">Address:</strong> ${esc(biz.address || cityState(biz))}</div>
          <div style="font-family:Inter,sans-serif;font-size:14px;color:rgba(245,240,234,.7);"><strong style="color:#f5f0ea;">Hours:</strong> ${esc(biz.hours || 'Mon-Sat 8am-6pm')}</div>
          <div style="font-family:Inter,sans-serif;font-size:14px;color:rgba(245,240,234,.7);"><strong style="color:#f5f0ea;">Phone:</strong> ${esc(phoneDisplay(biz))}</div>
        </div>
        <!-- OpenStreetMap — Portland bbox -->
        <div style="border-radius:10px;overflow:hidden;height:220px;border:1px solid rgba(146,112,74,.15);">
          <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-122.75%2C45.45%2C-122.45%2C45.65&layer=mapnik" width="100%" height="100%" style="border:0;" loading="lazy" title="Service area map"></iframe>
        </div>
      </div>
      <form onsubmit="event.preventDefault();this.innerHTML='<p style=\\'font-family:Inter,sans-serif;font-size:15px;color:#92704a;padding:32px 0;text-align:center;\\'>Thank you. We\\'ll be in touch within one business day.</p>';" style="display:flex;flex-direction:column;gap:14px;" data-reveal data-delay="2">
        <input type="text" placeholder="Full name" required style="font-family:Inter,sans-serif;font-size:14px;background:#141820;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
        <input type="tel" placeholder="Phone number" required style="font-family:Inter,sans-serif;font-size:14px;background:#141820;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
        <input type="email" placeholder="Email address" style="font-family:Inter,sans-serif;font-size:14px;background:#141820;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
        <select style="font-family:Inter,sans-serif;font-size:14px;background:#141820;color:rgba(245,240,234,.7);border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
          <option value="">Project type (optional)</option>
          <option>Walk-In Shower Renovation</option>
          <option>Vanity & Sink Installation</option>
          <option>Soaking Tub Addition</option>
          <option>Tile Work & Flooring</option>
          <option>Full Master Bath Remodel</option>
          <option>Bathroom Addition</option>
        </select>
        <input type="text" placeholder="Approximate budget (optional)" style="font-family:Inter,sans-serif;font-size:14px;background:#141820;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'">
        <textarea placeholder="Tell us about your space and goals" rows="4" style="font-family:Inter,sans-serif;font-size:14px;background:#141820;color:#f5f0ea;border:1px solid rgba(146,112,74,.2);border-radius:6px;padding:14px 16px;outline:none;resize:vertical;transition:border-color .2s;" onfocus="this.style.borderColor='#92704a'" onblur="this.style.borderColor='rgba(146,112,74,.2)'"></textarea>
        <button type="submit" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;letter-spacing:.06em;color:#fff;background:#92704a;border:none;border-radius:6px;padding:15px 24px;cursor:pointer;transition:background var(--transition-base);" onmouseover="this.style.background='#7a5c3a'" onmouseout="this.style.background='#92704a'">Send Message</button>
      </form>
    </div>
  </section>

  <!-- CONTACT FAQ -->
  <section style="background:#f5f5f5;padding:var(--section-pad) 32px;">
    <div style="max-width:760px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:44px;" data-reveal>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3vw,2.5rem);font-weight:700;color:#1a1a1a;">Before you call.</h2>
      </div>
      <div data-reveal>
        ${CONTACT_FAQ.map(f => `<details style="border-bottom:1px solid #e5e5e5;">
          <summary style="font-family:Inter,sans-serif;font-size:15px;font-weight:600;color:#1a1a1a;padding:20px 0;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;">
            ${esc(f.q)}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92704a" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.75;color:#6b7280;padding:0 0 20px;">${esc(f.a)}</p>
        </details>`).join('')}
      </div>
    </div>
  </section>

</main>`;

  return shell(`Contact — ${biz.name}`, navHtml, body, footerHtml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildTeam(biz: BizPageData, baseUrl: string): string {
  const navHtml = nav(biz, baseUrl, 'Team');
  const footerHtml = footer(biz, baseUrl);

  const DEFAULT_TEAM = [
    { name: 'Aria Blackwood',  role: 'Lead Designer & Co-founder',      bio: 'NKBA-certified with 12 years designing bathrooms exclusively. Aria believes every square foot of a bathroom has a job to do and a way to be beautiful at the same time.' },
    { name: 'Daniel Stern',    role: 'Project Director',                  bio: 'Daniel runs every project from permit to punch list. His background is commercial construction, which means your timeline and budget are treated as commitments, not estimates.' },
    { name: 'Priya Kapoor',    role: 'Tile & Materials Specialist',       bio: 'Priya sources the materials that make our bathrooms look different from everything else on the market. She has supplier relationships that most contractors simply do not have access to.' },
    { name: 'Luis Herrera',    role: 'Master Plumber & Installation Lead', bio: 'Fifteen years running rough-in and finish plumbing on residential remodels. Luis is the reason our installations do not leak and our inspections pass on the first visit.' },
  ];

  const members = (biz.team && biz.team.length > 0)
    ? biz.team.map((m, i) => ({ name: m.name, role: m.role, bio: m.bio || DEFAULT_TEAM[i % DEFAULT_TEAM.length].bio, photo: m.photo }))
    : DEFAULT_TEAM.map(m => ({ ...m, photo: undefined }));

  function initial(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }

  const body = `
<main style="padding-top:76px;">

  <section style="background:#1a2030;padding:clamp(3rem,6vw,5rem) 32px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;" data-reveal>
      <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">Our Team</div>
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:700;color:#f5f0ea;line-height:1.15;">The people behind your project.</h1>
    </div>
  </section>

  <section style="background:#141820;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:32px;">
      ${members.map((m, i) => `<div style="background:#1a2030;border-radius:12px;overflow:hidden;border:1px solid rgba(146,112,74,.1);" data-reveal data-delay="${Math.min(i+1,4) as unknown as string}">
        <div style="aspect-ratio:1/1;overflow:hidden;background:#0d111a;">
          ${m.photo
            ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover;">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a2030,#0d111a);">
                <span style="font-family:'Cormorant Garamond',serif;font-size:3rem;font-weight:700;color:#92704a;">${initial(m.name)}</span>
              </div>`}
        </div>
        <div style="padding:24px;">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;color:#f5f0ea;margin-bottom:4px;">${esc(m.name)}</h3>
          <div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#92704a;margin-bottom:14px;">${esc(m.role)}</div>
          <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.7;color:rgba(245,240,234,.6);">${esc(m.bio || '')}</p>
        </div>
      </div>`).join('')}
    </div>
  </section>

  <section style="background:#f5f5f5;padding:var(--section-pad) 32px;text-align:center;">
    <div style="max-width:580px;margin:0 auto;" data-reveal>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.6rem);font-weight:700;color:#1a1a1a;margin-bottom:16px;">Work with people who care.</h2>
      <p style="font-family:Inter,sans-serif;font-size:15px;font-weight:300;line-height:1.8;color:#6b7280;margin-bottom:32px;">This team has worked together for years. When you hire us, you get all of them.</p>
      <a href="${esc(telHref(biz))}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#fff;background:#92704a;padding:13px 28px;border-radius:6px;text-decoration:none;display:inline-block;transition:background var(--transition-base);" onmouseover="this.style.background='#7a5c3a'" onmouseout="this.style.background='#92704a'">Call Us Today</a>
    </div>
  </section>

</main>`;

  return shell(`Our Team — ${biz.name}`, navHtml, body, footerHtml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GALLERY PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildGallery(biz: BizPageData, baseUrl: string): string {
  const navHtml = nav(biz, baseUrl, 'Gallery');
  const footerHtml = footer(biz, baseUrl);

  const GALLERY_IMGS: Array<{ src: string; caption: string }> = [
    { src: ph(biz, 0), caption: 'Master Bath — Walk-in shower with custom tile mosaic' },
    { src: ph(biz, 1), caption: 'Freestanding soaking tub with brass fixtures' },
    { src: ph(biz, 2), caption: 'Guest bath — full renovation with floating vanity' },
    { src: ph(biz, 3), caption: 'Frameless glass shower enclosure' },
    { src: ph(biz, 4), caption: 'Herringbone floor tile with radiant heat' },
    { src: ph(biz, 5), caption: 'Double vanity with natural stone countertop' },
    { src: 'https://images.unsplash.com/photo-1620626011761-996317702149?w=800&q=80', caption: 'Spa-inspired ensuite — Portland Hills' },
    { src: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80', caption: 'Powder room refresh with custom mirror' },
    { src: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80', caption: 'Accessible shower remodel — step-free entry' },
  ];

  const body = `
<main style="padding-top:76px;">

  <section style="background:#1a2030;padding:clamp(3rem,6vw,4rem) 32px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;" data-reveal>
      <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">Our Work</div>
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:700;color:#f5f0ea;">Recent projects.</h1>
    </div>
  </section>

  <!-- BEFORE / AFTER -->
  <section style="background:#141820;padding:var(--section-pad) 32px;">
    <div style="max-width:1000px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:40px;" data-reveal>
        <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:10px;">Transformation</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.6rem);font-weight:700;color:#f5f0ea;">Before & After</h2>
        <p style="font-family:Inter,sans-serif;font-size:14px;color:rgba(245,240,234,.5);margin-top:10px;">Drag the handle to compare.</p>
      </div>
      <div data-reveal>
        ${baSlider(BA_BEFORE, BA_AFTER)}
      </div>
    </div>
  </section>

  <!-- GALLERY GRID -->
  <section style="background:#fff;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;">
      <div style="columns:3;column-gap:16px;">
        ${GALLERY_IMGS.map((img, i) => `<div style="break-inside:avoid;margin-bottom:16px;border-radius:10px;overflow:hidden;" data-reveal data-delay="${Math.min(i % 4 + 1, 4) as unknown as string}">
          <div style="position:relative;overflow:hidden;">
            <img src="${esc(img.src)}" alt="${esc(img.caption)}" style="width:100%;display:block;transition:transform .5s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
            <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(20,24,32,.85));padding:20px 16px 14px;opacity:0;transition:opacity .3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
              <p style="font-family:Inter,sans-serif;font-size:12px;color:rgba(245,240,234,.85);">${esc(img.caption)}</p>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <section style="background:#141820;padding:var(--section-pad) 32px;text-align:center;">
    <div style="max-width:560px;margin:0 auto;" data-reveal>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.6rem);font-weight:700;color:#f5f0ea;margin-bottom:14px;">Want to see a project like yours?</h2>
      <p style="font-family:Inter,sans-serif;font-size:14px;font-weight:300;line-height:1.75;color:rgba(245,240,234,.55);margin-bottom:28px;">Call us and describe your space. We'll pull relevant photos from projects we've completed in your area.</p>
      <a href="${esc(telHref(biz))}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#fff;background:#92704a;padding:13px 28px;border-radius:6px;text-decoration:none;display:inline-block;transition:background var(--transition-base);" onmouseover="this.style.background='#7a5c3a'" onmouseout="this.style.background='#92704a'">${esc(phoneDisplay(biz))}</a>
    </div>
  </section>

</main>`;

  return shell(`Gallery — ${biz.name}`, navHtml, body, footerHtml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTIMONIALS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function buildTestimonials(biz: BizPageData, baseUrl: string): string {
  const navHtml = nav(biz, baseUrl, 'Reviews');
  const footerHtml = footer(biz, baseUrl);
  const all10 = reviewsData(biz, 10);
  const featured = all10[0];
  const grid9 = all10.slice(1);

  const body = `
<main style="padding-top:76px;">

  <section style="background:#1a2030;padding:clamp(3rem,6vw,5rem) 32px;text-align:center;">
    <div style="max-width:600px;margin:0 auto;" data-reveal>
      <div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#92704a;margin-bottom:12px;">Reviews</div>
      <h1 style="font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,5vw,3.5rem);font-weight:700;color:#f5f0ea;line-height:1.15;">What clients say about working with us.</h1>
    </div>
  </section>

  <!-- FEATURED REVIEW -->
  <section style="background:#141820;padding:var(--section-pad) 32px;">
    <div style="max-width:860px;margin:0 auto;text-align:center;" data-reveal>
      <div style="color:#92704a;font-size:20px;letter-spacing:.1em;margin-bottom:28px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <blockquote style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.5rem,3.5vw,2.2rem);font-weight:600;font-style:italic;color:#f5f0ea;line-height:1.5;margin-bottom:28px;">"${esc(featured.text)}"</blockquote>
      <div style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#92704a;">${esc(featured.name)}</div>
      <div style="font-family:Inter,sans-serif;font-size:13px;color:rgba(245,240,234,.4);margin-top:4px;">${esc(featured.svc)} — ${esc(featured.city)} — ${esc(featured.date)}</div>
    </div>
  </section>

  <!-- GRID 9 -->
  <section style="background:#f5f5f5;padding:var(--section-pad) 32px;">
    <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
      ${grid9.map((r, i) => `<div style="background:#fff;border-radius:12px;border:1px solid #e5e5e5;padding:28px;" data-reveal data-delay="${Math.min(i % 4 + 1, 4) as unknown as string}">
        <div style="color:#92704a;font-size:14px;letter-spacing:.06em;margin-bottom:16px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <p style="font-family:Inter,sans-serif;font-size:14px;line-height:1.75;color:#374151;margin-bottom:20px;">"${esc(r.text)}"</p>
        <div style="font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;">${esc(r.name)}</div>
        <div style="font-family:Inter,sans-serif;font-size:12px;color:#9ca3af;margin-top:3px;">${esc(r.svc)} — ${esc(r.city)} — ${esc(r.date)}</div>
      </div>`).join('')}
    </div>
  </section>

  <section style="background:#141820;padding:var(--section-pad) 32px;text-align:center;">
    <div style="max-width:580px;margin:0 auto;" data-reveal>
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.9rem,3.5vw,2.6rem);font-weight:700;color:#f5f0ea;margin-bottom:14px;">Ready to add your story to this list?</h2>
      <a href="${esc(telHref(biz))}" style="font-family:Inter,sans-serif;font-size:14px;font-weight:600;color:#fff;background:#92704a;padding:13px 28px;border-radius:6px;text-decoration:none;display:inline-block;transition:background var(--transition-base);margin-top:8px;" onmouseover="this.style.background='#7a5c3a'" onmouseout="this.style.background='#92704a'">Schedule a Free Consultation</a>
    </div>
  </section>

</main>`;

  return shell(`Reviews — ${biz.name}`, navHtml, body, footerHtml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function buildBathroomRemodelAllPages(
  biz: BizPageData,
  baseUrl: string,
): Record<string, string> {
  return {
    home:         buildHome(biz, baseUrl),
    about:        buildAbout(biz, baseUrl),
    contact:      buildContact(biz, baseUrl),
    team:         buildTeam(biz, baseUrl),
    gallery:      buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
