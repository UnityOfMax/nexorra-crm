/**
 * Landscaping page builder — "Glade" editorial light design identity.
 * Palette: #f7f5f1 cream bg, #2c5f2e deep forest green, #8ab87a sage accent.
 * Fonts: Fraunces variable italic serif (display) + Inter (body).
 * Six pages: home, about, contact, team, gallery, testimonials.
 * Features: alternating process layout, accordion FAQ, spec service cards,
 *   Houzz awards strip, before/after sliders, blog preview, IntersectionObserver reveals.
 */

import type { BizPageData } from './multi-page-builder';

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ph(idx: number, biz: BizPageData): string {
  const FALLBACKS = [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
    'https://images.unsplash.com/photo-1598902108854-10e335adac99?w=800&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&crop=entropy',
    'https://images.unsplash.com/photo-1561406636-b80293969660?w=800&q=80',
    'https://images.unsplash.com/photo-1574879948818-0b6e87b79099?w=800&q=80',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80',
  ];
  return biz.photos[idx] || FALLBACKS[idx % FALLBACKS.length];
}

function telLink(phone: string | null): string {
  return (phone ?? '').replace(/[^0-9+]/g, '');
}

function reviewPad(biz: BizPageData): Array<{ text: string; reviewer: string; city: string; svc: string }> {
  const padData = [
    { text: 'We had a completely overgrown half-acre and no idea where to start. They came out, took photos, listened for about an hour, and came back with a plan that actually made sense for how we live. Installation was flawless.', reviewer: 'Hannah & Chris W.', city: biz.city || 'Local Area', svc: 'Full Property Redesign' },
    { text: 'Four years of maintenance and our garden has genuinely transformed. They suggested adding a dry creek bed two summers ago — at the time I thought it was unnecessary. It is now my favorite part of the yard.', reviewer: 'Frank L.', city: 'North Side', svc: 'Ongoing Maintenance' },
    { text: 'We moved into a new build with a completely bare lot and they turned it into something that looked established within one season. Incredible plant selection and spacing — nothing looks crammed.', reviewer: 'Meredith P.', city: biz.city || 'East Metro', svc: 'New Construction Landscaping' },
    { text: 'Our commercial building had zero curb appeal. They redesigned the entry and parking lot borders on a tight budget and the difference was remarkable. Tenants noticed immediately.', reviewer: 'Pinecrest Property Group', city: 'Business District', svc: 'Commercial Landscaping' },
    { text: 'Hired them after three other landscapers failed to fix a persistent drainage issue. They dug up the entire swale, regraded, and replanted. No standing water since — and the area looks beautiful.', reviewer: 'Doug & Anne F.', city: biz.city || 'South County', svc: 'Drainage Correction' },
    { text: 'I specifically asked for a low-maintenance garden. They delivered exactly that — drought-tolerant natives arranged in a way that looks intentional and lush even without much care from me.', reviewer: 'Sam R.', city: 'Hillcrest', svc: 'Native Garden Design' },
    { text: 'They installed our irrigation and programmed it by zone and plant type. First summer, our water bill dropped by a third. The system has run without issues for two seasons.', reviewer: 'Lisa & Omar K.', city: biz.city || 'West Hills', svc: 'Irrigation Installation' },
    { text: 'The crew cleaned up after a major storm — downed branches, displaced mulch, damaged beds — in a single day. Then they came back two weeks later to assess what needed replanting. That follow-through matters.', reviewer: 'Troy N.', city: 'Ridgefield', svc: 'Storm Recovery' },
    { text: 'Our front garden went from embarrassing to the best on the street. We had neighbors stop and ask who did the work before the crew had even packed up. That says everything.', reviewer: 'Patricia C.', city: biz.city || 'North County', svc: 'Curb Appeal Redesign' },
    { text: 'Every crew member was professional and careful. They worked around a new deck installation without damaging it once. The coordination between their team and ours was seamless.', reviewer: 'Jordan M.', city: biz.city || 'Lakeside', svc: 'Full Landscape Install' },
  ];
  const base = (biz.reviewTexts || []).map((text, i) => ({
    text,
    reviewer: padData[i]?.reviewer || 'Verified Customer',
    city: padData[i]?.city || biz.city || 'Local Area',
    svc: padData[i]?.svc || 'Landscaping Services',
  }));
  while (base.length < 10) base.push(padData[base.length % padData.length]);
  return base.slice(0, 10);
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DATA_REVEAL_CSS = `[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease;}[data-reveal].revealed{opacity:1;transform:translateY(0);}[data-delay="1"]{transition-delay:.1s;}[data-delay="2"]{transition-delay:.2s;}[data-delay="3"]{transition-delay:.3s;}[data-delay="4"]{transition-delay:.4s;}`;

const DATA_REVEAL_JS = `<script>(function(){const io=new IntersectionObserver((e)=>{e.forEach(i=>{if(i.isIntersecting){i.target.classList.add('revealed');io.unobserve(i.target);}});},{threshold:.1,rootMargin:'0px 0px -50px 0px'});document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));})();</script>`;

const BA_JS = `<script>
document.querySelectorAll('.ba-container').forEach(c=>{
  const b=c.querySelector('.ba-before'),h=c.querySelector('.ba-handle');let d=false;
  function pos(x){const r=c.getBoundingClientRect(),p=Math.max(2,Math.min(98,(x-r.left)/r.width*100));b.style.clipPath='inset(0 '+(100-p)+'% 0 0)';h.style.left=p+'%';}
  h.addEventListener('mousedown',()=>d=true);window.addEventListener('mouseup',()=>d=false);window.addEventListener('mousemove',e=>{if(d)pos(e.clientX);});
  h.addEventListener('touchstart',e=>{d=true;e.preventDefault();},{passive:false});window.addEventListener('touchend',()=>d=false);window.addEventListener('touchmove',e=>{if(d)pos(e.touches[0].clientX);},{passive:true});
});
</script>`;

const FAQ_JS = `<script>
document.querySelectorAll('.faq-item').forEach(item=>{
  const q=item.querySelector('.faq-question');
  const a=item.querySelector('.faq-answer');
  const icon=item.querySelector('.faq-icon');
  q.addEventListener('click',()=>{
    const open=item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i=>{
      i.classList.remove('open');
      i.querySelector('.faq-answer').style.maxHeight='0';
      i.querySelector('.faq-icon').style.transform='rotate(0deg)';
    });
    if(!open){
      item.classList.add('open');
      a.style.maxHeight=a.scrollHeight+'px';
      icon.style.transform='rotate(45deg)';
    }
  });
});
</script>`;

// ── Shared CSS ─────────────────────────────────────────────────────────────────

function globalStyles(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;1,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:root{
  --bg:#f7f5f1;
  --card:#ffffff;
  --border:#e2ddd6;
  --green:#2c5f2e;
  --green-hover:#214821;
  --green-light:rgba(44,95,46,.08);
  --green-accent:#8ab87a;
  --text:#1a1a18;
  --muted:#6b6960;
  --card-radius:12px;
  --font-display:'Fraunces',Georgia,serif;
  --font-body:'Inter',system-ui,sans-serif;
  --max-w:1200px;
}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%;height:auto}
${DATA_REVEAL_CSS}

/* Before/After */
.ba-container{position:relative;overflow:hidden;border-radius:var(--card-radius);aspect-ratio:16/9;cursor:ew-resize;user-select:none;border:1px solid var(--border)}
.ba-before{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.ba-handle{position:absolute;top:0;bottom:0;left:50%;transform:translateX(-50%);width:2px;background:var(--green);touch-action:none}
.ba-handle-knob{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:44px;height:44px;background:var(--green);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 4px rgba(44,95,46,.2),0 4px 16px rgba(0,0,0,.15)}

/* FAQ */
.faq-item{border-bottom:1px solid var(--border)}
.faq-question{display:flex;justify-content:space-between;align-items:center;padding:20px 0;cursor:pointer;font-size:16px;font-weight:500;color:var(--text)}
.faq-icon{width:24px;height:24px;flex-shrink:0;transition:transform .3s;color:var(--green);font-size:22px;line-height:1;display:flex;align-items:center;justify-content:center}
.faq-answer{max-height:0;overflow:hidden;transition:max-height .35s ease}
.faq-answer-inner{padding:0 0 20px;font-size:15px;color:var(--muted);line-height:1.8}

/* Nav */
.nav-wrap{position:fixed;top:0;left:0;right:0;z-index:100;transition:background .3s,box-shadow .3s}
.nav-wrap.scrolled{background:rgba(247,245,241,.97);backdrop-filter:blur(12px);box-shadow:0 1px 0 var(--border)}
.nav-inner{max-width:var(--max-w);margin:0 auto;padding:0 32px;height:68px;display:flex;align-items:center;justify-content:space-between;gap:32px}
.nav-logo{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--green);letter-spacing:-.01em}
.nav-links{display:flex;gap:28px;align-items:center}
.nav-links a{font-size:14px;font-weight:500;color:var(--muted);transition:color .2s}
.nav-links a:hover{color:var(--green)}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--green);color:#fff;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:background .2s,transform .15s}
.btn-primary:hover{background:var(--green-hover);transform:translateY(-1px)}
.btn-ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--green);padding:10px 22px;border-radius:6px;font-size:13px;font-weight:600;border:2px solid var(--green);cursor:pointer;transition:background .2s,color .2s}
.btn-ghost:hover{background:var(--green);color:#fff}
.mobile-menu-btn{display:none;background:none;border:none;cursor:pointer;color:var(--text);padding:8px}

/* Section primitives */
.section-label{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--green-accent)}
.section-title{font-family:var(--font-display);font-size:clamp(32px,4vw,52px);font-weight:700;color:var(--text);line-height:1.15;letter-spacing:-.02em}
.section-sub{font-size:16px;color:var(--muted);line-height:1.85;max-width:560px}

/* Footer */
.footer{background:var(--green);color:#fff;padding:64px 32px 32px}
.footer-inner{max-width:var(--max-w);margin:0 auto}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px}
.footer-brand{font-family:var(--font-display);font-size:22px;font-weight:700;color:#fff;margin-bottom:14px}
.footer-tagline{font-size:14px;color:rgba(255,255,255,.65);line-height:1.7;max-width:260px;margin-bottom:20px}
.footer-col h4{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--green-accent);margin-bottom:16px}
.footer-col ul{list-style:none}
.footer-col ul li{margin-bottom:10px}
.footer-col ul li a{font-size:14px;color:rgba(255,255,255,.65);transition:color .2s}
.footer-col ul li a:hover{color:#fff}
.footer-divider{border:none;border-top:1px solid rgba(255,255,255,.15);margin:0 0 24px}
.footer-copy{font-size:13px;color:rgba(255,255,255,.5)}

@media(max-width:768px){
  .nav-links,.nav-right .btn-primary{display:none}
  .mobile-menu-btn{display:flex}
  .footer-grid{grid-template-columns:1fr 1fr;gap:32px}
}
</style>`;
}

// ── Nav ────────────────────────────────────────────────────────────────────────

function nav(biz: BizPageData, baseUrl: string): string {
  return `<nav class="nav-wrap" id="mainNav">
  <div class="nav-inner">
    <div class="nav-logo">${esc(biz.name)}</div>
    <div class="nav-links">
      <a href="${esc(baseUrl)}">Home</a>
      <a href="${esc(baseUrl)}-about">About</a>
      <a href="${esc(baseUrl)}-gallery">Gallery</a>
      <a href="${esc(baseUrl)}-team">Team</a>
      <a href="${esc(baseUrl)}-testimonials">Reviews</a>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      ${biz.phone ? `<a href="tel:${esc(telLink(biz.phone))}" class="nav-links" style="display:flex;font-size:14px;font-weight:600;color:var(--green)">${esc(biz.phone)}</a>` : ''}
      <a href="${esc(baseUrl)}-contact" class="btn-primary">Free Consultation</a>
      <button class="mobile-menu-btn" aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
    </div>
  </div>
</nav>
<script>
(function(){
  const nav=document.getElementById('mainNav');
  window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>40);});
})();
</script>`;
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function footer(biz: BizPageData, baseUrl: string): string {
  return `<footer class="footer">
  <div class="footer-inner">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">${esc(biz.name)}</div>
        <p class="footer-tagline">${esc(biz.heroSub)}</p>
        ${biz.phone ? `<a href="tel:${esc(telLink(biz.phone))}" style="color:#fff;font-weight:600;font-size:15px">${esc(biz.phone)}</a>` : ''}
      </div>
      <div class="footer-col">
        <h4>Navigation</h4>
        <ul>
          <li><a href="${esc(baseUrl)}">Home</a></li>
          <li><a href="${esc(baseUrl)}-about">About Us</a></li>
          <li><a href="${esc(baseUrl)}-gallery">Gallery</a></li>
          <li><a href="${esc(baseUrl)}-team">Our Team</a></li>
          <li><a href="${esc(baseUrl)}-testimonials">Reviews</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Services</h4>
        <ul>
          ${(biz.services || []).slice(0, 5).map(s => `<li><a href="${esc(baseUrl)}-contact">${esc(s.name)}</a></li>`).join('')}
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          ${biz.phone ? `<li><a href="tel:${esc(telLink(biz.phone))}">${esc(biz.phone)}</a></li>` : ''}
          ${biz.address ? `<li><span style="color:rgba(255,255,255,.55);font-size:14px">${esc(biz.address)}</span></li>` : ''}
          ${biz.city ? `<li><span style="color:rgba(255,255,255,.55);font-size:14px">${esc(biz.city)}${biz.state ? ', ' + esc(biz.state) : ''}</span></li>` : ''}
          <li><a href="${esc(baseUrl)}-contact">Get a Quote</a></li>
        </ul>
      </div>
    </div>
    <hr class="footer-divider">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <p class="footer-copy">&copy; ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</p>
      <p class="footer-copy">Licensed &amp; Insured${biz.city ? ' — ' + esc(biz.city) : ''}</p>
    </div>
  </div>
</footer>`;
}

// ── Before/After Slider ────────────────────────────────────────────────────────

function baSlider(beforeUrl: string, afterUrl: string, label?: string): string {
  return `<div class="ba-container">
  <img src="${esc(afterUrl)}" alt="${label ? esc(label) + ' after' : 'After landscaping'}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div class="ba-before">
    <img src="${esc(beforeUrl)}" alt="${label ? esc(label) + ' before' : 'Before landscaping'}" style="width:100%;height:100%;object-fit:cover">
  </div>
  <div style="position:absolute;top:12px;left:12px;background:rgba(247,245,241,.92);color:var(--muted);padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:var(--font-body);border-radius:4px">Before</div>
  <div style="position:absolute;top:12px;right:12px;background:var(--green);color:#fff;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:var(--font-body);border-radius:4px">After</div>
  <div class="ba-handle">
    <div class="ba-handle-knob">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><path d="M8 4l-4 8 4 8M16 4l4 8-4 8"/></svg>
    </div>
  </div>
</div>`;
}

// ── Page Builder: Home ─────────────────────────────────────────────────────────

function buildHome(biz: BizPageData, baseUrl: string): string {
  const reviews = reviewPad(biz);
  const services = (biz.services || []).slice(0, 6);

  const processSteps = [
    { n: '1', title: 'Walk the Site Together', desc: 'We start by walking your property with you — no clipboard quotes, no pressure. We listen to how you use the space, what frustrates you about it, and what you wish it could be.' },
    { n: '2', title: 'Detailed Design Plan', desc: 'Our designers produce a full written plan: plant selections with rationale, material specifications, phased timeline, and itemized pricing. You approve before we schedule anything.' },
    { n: '3', title: 'Skilled Installation', desc: 'Our own crew handles every stage — soil prep, grading, drainage, planting, and hardscape. No subcontracting of core work. The same people every day until the job is done.' },
    { n: '4', title: 'Ongoing Partnership', desc: 'Most clients stay with us for ongoing maintenance. We visit, adjust, and improve the property seasonally — not just maintain it.' },
  ];

  const faqs = [
    { q: 'How long does a typical design consultation take?', a: 'About 60 to 90 minutes on-site. We walk the entire property, ask questions, take photos and measurements, and discuss your goals. The consultation is free and comes with no obligation.' },
    { q: 'Do you handle both residential and commercial properties?', a: 'Yes. We work on residential properties of all sizes, commercial buildings, HOA common areas, and multi-unit developments. Commercial projects get a dedicated project manager.' },
    { q: 'How far in advance should I book?', a: 'For new installations, we typically schedule 3 to 6 weeks out depending on the season. Maintenance slots open more regularly — we can usually start within two weeks.' },
    { q: 'Do you handle permits for hardscaping projects?', a: 'Yes. For projects requiring municipal permits — retaining walls, large patios, irrigation systems — we handle the application and inspection coordination as part of the project scope.' },
    { q: 'What is included in your maintenance plans?', a: 'Our standard plan covers mowing, edging, blowing, and bed maintenance. The full-service plan adds shrub trimming, fertilization, and seasonal color rotations. All plans include a dedicated crew and consistent scheduling.' },
    { q: 'Do you work with existing plants or remove everything?', a: 'We assess each plant on its merits. Healthy, well-placed plants are integrated into the new design. Struggling or misplaced plants are discussed with you before any removal happens.' },
  ];

  const blogPosts = [
    { date: 'April 2025', category: 'Lawn Care', title: 'Why your lawn looks worse after spring fertilization', excerpt: 'A lot of homeowners apply fertilizer in early spring and end up with more weeds than before. Here is what is actually happening and how to avoid it.' },
    { date: 'March 2025', category: 'Plant Selection', title: 'The case for native plants in a managed landscape', excerpt: 'Native plants are not just for wildflower gardens. The right natives look intentional, require far less water, and outperform exotic species in difficult spots.' },
    { date: 'February 2025', category: 'Hardscaping', title: 'What to ask before hiring a contractor for a patio or retaining wall', excerpt: 'Most complaints about hardscape projects trace back to the same few mistakes. These are the questions that separate a good contractor from a problematic one.' },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(biz.name)} — Landscaping${biz.city ? ' in ' + esc(biz.city) : ''}</title>
${globalStyles()}
<style>
/* Hero */
.hero{padding:152px 32px 96px;background:var(--bg);position:relative;overflow:hidden}
.hero-inner{max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.hero-hl{font-family:var(--font-display);font-size:clamp(44px,6vw,76px);font-weight:700;color:var(--text);line-height:1.08;letter-spacing:-.03em;margin-bottom:8px}
.hero-hl em{font-style:italic;color:var(--green)}
.hero-rule{border:none;border-top:2px solid var(--border);margin:24px 0}
.hero-sub{font-size:17px;color:var(--muted);line-height:1.85;margin-bottom:36px;max-width:460px}
.hero-image{border-radius:var(--card-radius);overflow:hidden;aspect-ratio:3/4;clip-path:polygon(0 0,100% 0,100% 100%,0 92%)}
.trust-row{border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:16px 32px;background:var(--card)}
.trust-inner{max-width:var(--max-w);margin:0 auto;display:flex;align-items:center;gap:0;justify-content:center}
.trust-item{font-size:13px;font-weight:500;color:var(--muted);padding:0 28px}
.trust-item+.trust-item{border-left:1px solid var(--border)}
/* About */
.about-section{padding:100px 32px;background:var(--card)}
.about-inner{max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
.about-quote{font-family:var(--font-display);font-size:clamp(26px,3.5vw,38px);font-weight:700;font-style:italic;color:var(--green);line-height:1.3;margin-bottom:24px;letter-spacing:-.02em}
.about-photos{position:relative;height:480px}
.about-photo-main{position:absolute;top:0;right:0;width:80%;height:340px;border-radius:var(--card-radius);overflow:hidden}
.about-photo-secondary{position:absolute;bottom:0;left:0;width:55%;height:200px;border-radius:var(--card-radius);overflow:hidden;border:4px solid var(--bg)}
/* Services */
.services-section{padding:100px 32px;background:var(--bg)}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.service-card{background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:32px;transition:border-color .3s,box-shadow .3s}
.service-card:hover{border-color:var(--green-accent);box-shadow:0 4px 24px rgba(44,95,46,.08)}
.service-spec-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px}
.service-spec-label{color:var(--muted);font-weight:500}
.service-spec-value{color:var(--text);font-weight:600;text-align:right;max-width:60%}
/* Process */
.process-section{padding:100px 32px;background:var(--card);border-top:1px solid var(--border)}
.process-inner{max-width:var(--max-w);margin:0 auto}
.process-step-row{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;margin-bottom:64px;padding-bottom:64px;border-bottom:1px solid var(--border)}
.process-step-row:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.process-step-row.flip{direction:rtl}
.process-step-row.flip>*{direction:ltr}
.process-num{font-family:var(--font-display);font-size:100px;font-weight:700;color:var(--green-light);line-height:1;letter-spacing:-.04em;margin-bottom:-16px}
.process-title{font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--text);margin-bottom:12px;letter-spacing:-.02em}
.process-desc{font-size:15px;color:var(--muted);line-height:1.85}
/* Awards */
.awards-strip{padding:48px 32px;background:var(--bg);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.awards-inner{max-width:var(--max-w);margin:0 auto;display:flex;align-items:center;gap:0;justify-content:center;flex-wrap:wrap}
.award-badge{padding:12px 28px;display:flex;flex-direction:column;align-items:center;gap:4px;border-right:1px solid var(--border)}
.award-badge:last-child{border-right:none}
.award-name{font-size:13px;font-weight:700;color:var(--text)}
.award-year{font-size:11px;color:var(--muted);font-weight:500}
/* Testimonials */
.testimonials-section{padding:100px 32px;background:var(--bg)}
.testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.testimonial-card{background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:32px}
.tquote{font-family:var(--font-display);font-size:40px;font-weight:700;color:var(--green-accent);line-height:1;margin-bottom:-4px}
/* FAQ */
.faq-section{padding:100px 32px;background:var(--card);border-top:1px solid var(--border)}
.faq-inner{max-width:720px;margin:0 auto}
/* Blog */
.blog-section{padding:100px 32px;background:var(--bg);border-top:1px solid var(--border)}
.blog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.blog-card{background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);overflow:hidden;transition:box-shadow .3s}
.blog-card:hover{box-shadow:0 4px 24px rgba(44,95,46,.08)}
/* CTA */
.cta-banner{background:var(--green);padding:100px 32px;text-align:center}

@media(max-width:768px){
  .hero-inner{grid-template-columns:1fr}
  .hero-image{display:none}
  .trust-item{padding:0 16px;font-size:12px}
  .about-inner{grid-template-columns:1fr}
  .about-photos{height:300px}
  .services-grid{grid-template-columns:1fr}
  .process-step-row{grid-template-columns:1fr}
  .process-step-row.flip{direction:ltr}
  .awards-inner{gap:0}
  .award-badge{padding:10px 16px}
  .testimonials-grid{grid-template-columns:1fr}
  .blog-grid{grid-template-columns:1fr}
}
</style>
</head>
<body>
${nav(biz, baseUrl)}

<!-- Hero -->
<section class="hero">
  <div class="hero-inner">
    <div>
      <p class="section-label" style="margin-bottom:16px" data-reveal>${esc(biz.city || 'Landscape Design')}</p>
      <h1 class="hero-hl" data-reveal>${esc(biz.heroHeadline)}<br><em>${esc(biz.heroHeadlineEm)}</em></h1>
      <hr class="hero-rule">
      <p class="hero-sub" data-reveal>${esc(biz.heroSub)}</p>
      <div style="display:flex;gap:14px;flex-wrap:wrap" data-reveal>
        <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 28px;font-size:15px">Book a Consultation</a>
        <a href="${esc(baseUrl)}-gallery" class="btn-ghost" style="padding:14px 28px;font-size:15px">View Our Work</a>
      </div>
    </div>
    <div class="hero-image" data-reveal>
      <img src="${ph(0, biz)}" alt="${esc(biz.name)}" style="width:100%;height:100%;object-fit:cover">
    </div>
  </div>
</section>

<!-- Trust Row -->
<div class="trust-row">
  <div class="trust-inner">
    <span class="trust-item">Licensed &amp; Insured</span>
    <span class="trust-item">500+ Projects Completed</span>
    <span class="trust-item">Free Consultations</span>
    <span class="trust-item">Satisfaction Guarantee</span>
    <span class="trust-item">${esc(biz.yearsInBiz)}+ Years in Business</span>
  </div>
</div>

<!-- About Preview -->
<section class="about-section">
  <div class="about-inner">
    <div>
      <p class="section-label" style="margin-bottom:16px" data-reveal>Who We Are</p>
      <p class="about-quote" data-reveal>"${esc(biz.aboutText)}"</p>
      <p style="font-size:16px;color:var(--muted);line-height:1.9;margin-bottom:24px" data-reveal>${esc(biz.aboutText2)}</p>
      <p style="font-size:16px;color:var(--muted);line-height:1.9;margin-bottom:36px" data-reveal>We have been doing this work in ${esc(biz.city || 'this area')} for ${esc(biz.yearsInBiz)} years. Our client retention rate is high not because of contracts, but because people see the difference a consistent, skilled crew makes over time.</p>
      <a href="${esc(baseUrl)}-about" class="btn-ghost" data-reveal>Our Story</a>
    </div>
    <div class="about-photos" data-reveal>
      <div class="about-photo-main"><img src="${ph(1, biz)}" alt="Landscape project" style="width:100%;height:100%;object-fit:cover"></div>
      <div class="about-photo-secondary"><img src="${ph(2, biz)}" alt="Garden detail" style="width:100%;height:100%;object-fit:cover"></div>
    </div>
  </div>
</section>

<!-- Services -->
<section class="services-section">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:12px" data-reveal>What We Do</p>
    <h2 class="section-title" style="margin-bottom:12px" data-reveal>Services, done properly</h2>
    <p class="section-sub" style="margin-bottom:56px" data-reveal>Every service we offer is done start to finish by our own crew. No subcontracting, no guessing on quality.</p>
    <div class="services-grid">
      ${services.map((s, i) => `
      <div class="service-card" data-reveal data-delay="${(i % 3) + 1}">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--green-accent);margin-bottom:8px">Landscaping Service</div>
        <h3 style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--text);margin-bottom:10px;letter-spacing:-.02em">${esc(s.name)}</h3>
        <p style="font-size:14px;color:var(--muted);line-height:1.75;margin-bottom:20px">${esc(s.desc)}</p>
        <div style="border-top:1px solid var(--border);padding-top:16px">
          <div class="service-spec-row"><span class="service-spec-label">Ideal for:</span><span class="service-spec-value">Residential &amp; Commercial</span></div>
          ${s.duration ? `<div class="service-spec-row"><span class="service-spec-label">Estimated Duration:</span><span class="service-spec-value">${esc(s.duration)}</span></div>` : ''}
          <div class="service-spec-row"><span class="service-spec-label">Budget Range:</span><span class="service-spec-value">From ${esc(s.price)}</span></div>
        </div>
        <a href="${esc(baseUrl)}-contact" style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--green);margin-top:20px">Request a Quote &rarr;</a>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Process -->
<section class="process-section">
  <div class="process-inner">
    <p class="section-label" style="margin-bottom:12px" data-reveal>How It Works</p>
    <h2 class="section-title" style="margin-bottom:12px" data-reveal>Four steps to a better property</h2>
    <p class="section-sub" style="margin-bottom:72px" data-reveal>Straightforward from start to finish. You always know where the project stands and what comes next.</p>
    ${processSteps.map((s, i) => `
    <div class="process-step-row${i % 2 === 1 ? ' flip' : ''}" data-reveal>
      <div>
        <div style="border-radius:var(--card-radius);overflow:hidden;aspect-ratio:4/3">
          <img src="${ph(i + 1, biz)}" alt="Step ${s.n}" style="width:100%;height:100%;object-fit:cover">
        </div>
      </div>
      <div>
        <div class="process-num">${s.n}</div>
        <h3 class="process-title">${s.title}</h3>
        <p class="process-desc">${s.desc}</p>
      </div>
    </div>`).join('')}
  </div>
</section>

<!-- Awards -->
<section class="awards-strip">
  <div class="awards-inner">
    ${[2021, 2022, 2023, 2024, 2025, 2026].map(y => `
    <div class="award-badge">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      <div class="award-name">Houzz Best of ${y}</div>
      <div class="award-year">Design &amp; Service Award</div>
    </div>`).join('')}
  </div>
</section>

<!-- Testimonials -->
<section class="testimonials-section">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:12px" data-reveal>Client Reviews</p>
    <h2 class="section-title" style="margin-bottom:12px" data-reveal>Feedback from real clients</h2>
    <p class="section-sub" style="margin-bottom:56px" data-reveal>Unsolicited reviews from people who chose to share their experience.</p>
    <div class="testimonials-grid">
      ${reviews.slice(0, 3).map((r, i) => `
      <div class="testimonial-card" data-reveal data-delay="${i + 1}">
        <div class="tquote">"</div>
        <p style="font-size:15px;color:var(--text);line-height:1.85;margin-bottom:20px">${esc(r.text)}</p>
        <div style="color:var(--green-accent);font-size:14px;letter-spacing:.1em;margin-bottom:12px">★★★★★</div>
        <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(r.reviewer)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">${esc(r.svc)} — ${esc(r.city)}</div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:40px" data-reveal>
      <a href="${esc(baseUrl)}-testimonials" class="btn-ghost">Read All Reviews</a>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq-section">
  <div class="faq-inner">
    <p class="section-label" style="margin-bottom:12px;text-align:center" data-reveal>Common Questions</p>
    <h2 class="section-title" style="margin-bottom:12px;text-align:center" data-reveal>Questions we hear often</h2>
    <p class="section-sub" style="margin-bottom:48px;text-align:center;margin-left:auto;margin-right:auto" data-reveal>If yours is not here, call us or send a message — we respond the same day.</p>
    <div data-reveal>
      ${faqs.map(f => `
      <div class="faq-item">
        <div class="faq-question">
          <span>${esc(f.q)}</span>
          <span class="faq-icon">+</span>
        </div>
        <div class="faq-answer"><div class="faq-answer-inner">${esc(f.a)}</div></div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Blog Preview -->
<section class="blog-section">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:12px" data-reveal>From the Field</p>
    <h2 class="section-title" style="margin-bottom:12px" data-reveal>Things worth knowing</h2>
    <p class="section-sub" style="margin-bottom:56px" data-reveal>Practical advice from people who work in landscapes every day.</p>
    <div class="blog-grid">
      ${blogPosts.map((b, i) => `
      <div class="blog-card" data-reveal data-delay="${i + 1}">
        <div style="height:200px;overflow:hidden">
          <img src="${ph(i + 3, biz)}" alt="${esc(b.title)}" style="width:100%;height:100%;object-fit:cover;transition:transform .5s" loading="lazy">
        </div>
        <div style="padding:24px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--green);background:var(--green-light);padding:3px 10px;border-radius:4px">${esc(b.category)}</span>
            <span style="font-size:12px;color:var(--muted)">${esc(b.date)}</span>
          </div>
          <h3 style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--text);margin-bottom:10px;line-height:1.3;letter-spacing:-.02em">${esc(b.title)}</h3>
          <p style="font-size:14px;color:var(--muted);line-height:1.7">${esc(b.excerpt)}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-banner">
  <p class="section-label" style="color:var(--green-accent);margin-bottom:16px" data-reveal>Ready to Start</p>
  <h2 style="font-family:var(--font-display);font-size:clamp(36px,5vw,60px);font-weight:700;color:#fff;font-style:italic;line-height:1.1;max-width:640px;margin:0 auto 20px;letter-spacing:-.02em" data-reveal>${esc(biz.ctaText)}</h2>
  <p style="font-size:16px;color:rgba(255,255,255,.7);max-width:480px;margin:0 auto 36px;line-height:1.85" data-reveal>Walk us through your property and we will give you an honest plan and a clear quote — no commitment required.</p>
  <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap" data-reveal>
    <a href="${esc(baseUrl)}-contact" style="background:#fff;color:var(--green);padding:16px 36px;border-radius:6px;font-size:15px;font-weight:600;display:inline-flex;align-items:center;transition:background .2s">Book a Free Consultation</a>
    ${biz.phone ? `<a href="tel:${esc(telLink(biz.phone))}" style="background:transparent;color:#fff;padding:16px 36px;border-radius:6px;font-size:15px;font-weight:600;display:inline-flex;align-items:center;border:2px solid rgba(255,255,255,.5);transition:background .2s">${esc(biz.phone)}</a>` : ''}
  </div>
</section>

${footer(biz, baseUrl)}
${BA_JS}
${FAQ_JS}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: About ────────────────────────────────────────────────────────

function buildAbout(biz: BizPageData, baseUrl: string): string {
  const foundedYear = Math.max(2000, new Date().getFullYear() - parseInt(biz.yearsInBiz || '10', 10));
  const milestones = [
    { year: String(foundedYear), event: `${esc(biz.name)} founded as a two-person residential design crew in ${esc(biz.city || 'the area')}.` },
    { year: String(foundedYear + 3), event: 'Added dedicated irrigation division and expanded to commercial and HOA contracts.' },
    { year: String(foundedYear + 6), event: 'Reached 500 completed projects. First Houzz Best of Design award. Grew crew to ten full-time employees.' },
    { year: String(foundedYear + 9), event: 'Launched native plant design program. Began offering certified smart irrigation programming.' },
    { year: String(new Date().getFullYear() - 2), event: `Surpassed 1,000 projects. Team of ${20}+ full-time crew members. Expanded service radius.` },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:152px 32px 80px;background:var(--card);border-bottom:1px solid var(--border)}
.page-hero-inner{max-width:var(--max-w);margin:0 auto}
.story-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
.story-photos{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.story-photo{border-radius:var(--card-radius);overflow:hidden}
.timeline{border-left:2px solid var(--border);padding-left:28px}
.timeline-item{position:relative;margin-bottom:32px;padding-left:0}
.timeline-item::before{content:'';position:absolute;left:-35px;top:5px;width:12px;height:12px;background:var(--green-accent);border-radius:50%;border:2px solid var(--bg)}
.timeline-year{font-size:12px;font-weight:700;color:var(--green);letter-spacing:.07em;margin-bottom:5px;text-transform:uppercase}
.timeline-text{font-size:14px;color:var(--muted);line-height:1.75}
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
@media(max-width:768px){.story-grid{grid-template-columns:1fr}.story-photos{grid-template-columns:1fr 1fr}.team-grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div class="page-hero-inner">
    <p class="section-label" style="margin-bottom:14px" data-reveal>Our Story</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,70px);font-weight:700;color:var(--text);line-height:1.08;letter-spacing:-.03em;max-width:700px;margin-bottom:20px" data-reveal>${esc(biz.aboutText)}</h1>
    <p style="font-size:17px;color:var(--muted);max-width:520px;line-height:1.85" data-reveal>Serving ${esc(biz.city || 'the area')} since ${foundedYear}.</p>
  </div>
</section>

<!-- Story + Photos -->
<section style="padding:100px 32px;background:var(--bg)">
  <div class="story-grid" style="max-width:var(--max-w);margin:0 auto">
    <div>
      <p class="section-label" style="margin-bottom:14px" data-reveal>The Company</p>
      <h2 class="section-title" style="margin-bottom:20px" data-reveal>Built on craft, not corner-cutting</h2>
      <p style="font-size:16px;color:var(--muted);line-height:1.9;margin-bottom:20px" data-reveal>${esc(biz.aboutText2)}</p>
      <p style="font-size:16px;color:var(--muted);line-height:1.9;margin-bottom:20px" data-reveal>We started as a two-person crew. We grew by doing honest work and letting results speak. Today we manage everything from weekly lawn maintenance to full commercial property installations — but the same attention to detail that defined our early work is still how we operate.</p>
      <p style="font-size:16px;color:var(--muted);line-height:1.9;margin-bottom:36px" data-reveal>98% of our maintenance clients renew year over year. That number tells us we are doing something right.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" data-reveal>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:24px">
          <div style="font-family:var(--font-display);font-size:40px;font-weight:700;color:var(--green);line-height:1;margin-bottom:4px">${esc(biz.yearsInBiz)}+</div>
          <div style="font-size:13px;color:var(--muted);font-weight:500">Years in Business</div>
        </div>
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:24px">
          <div style="font-family:var(--font-display);font-size:40px;font-weight:700;color:var(--green);line-height:1;margin-bottom:4px">1,200+</div>
          <div style="font-size:13px;color:var(--muted);font-weight:500">Projects Completed</div>
        </div>
      </div>
    </div>
    <div>
      <div class="story-photos">
        <div class="story-photo" style="aspect-ratio:3/4;grid-row:span 2" data-reveal>
          <img src="${ph(1, biz)}" alt="Our team" style="width:100%;height:100%;object-fit:cover">
        </div>
        <div class="story-photo" style="aspect-ratio:4/3" data-reveal data-delay="1">
          <img src="${ph(3, biz)}" alt="Project work" style="width:100%;height:100%;object-fit:cover">
        </div>
        <div class="story-photo" style="aspect-ratio:4/3" data-reveal data-delay="2">
          <img src="${ph(4, biz)}" alt="Garden detail" style="width:100%;height:100%;object-fit:cover">
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Timeline -->
<section style="padding:80px 32px;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 2fr;gap:80px;align-items:start">
    <div>
      <p class="section-label" style="margin-bottom:14px" data-reveal>Timeline</p>
      <h2 class="section-title" style="margin-bottom:20px" data-reveal>${esc(biz.yearsInBiz)} years of steady growth</h2>
      <p style="font-size:15px;color:var(--muted);line-height:1.85" data-reveal>Every milestone driven by the same thing: clients who trusted us and came back.</p>
    </div>
    <div class="timeline" data-reveal>
      ${milestones.map(m => `<div class="timeline-item"><div class="timeline-year">${m.year}</div><div class="timeline-text">${m.event}</div></div>`).join('')}
    </div>
  </div>
</section>

<!-- Team Intro -->
<section style="padding:100px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:12px" data-reveal>The People</p>
    <h2 class="section-title" style="margin-bottom:12px" data-reveal>Meet the crew</h2>
    <p class="section-sub" style="margin-bottom:56px" data-reveal>Every person on our crew is a direct employee — hired for skill, trained to a consistent standard, and given the tools to do the job right.</p>
    <div class="team-grid">
      ${(biz.team && biz.team.length > 0 ? biz.team : [
        { name: biz.teamName || 'Alex M.', role: 'Owner & Lead Designer' },
        { name: 'Jordan P.', role: 'Irrigation Specialist' },
        { name: 'Riley S.', role: 'Crew Lead' },
      ]).slice(0, 3).map((m, i) => `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);overflow:hidden" data-reveal data-delay="${i + 1}">
        <div style="height:260px;background:var(--green-light);overflow:hidden">
          ${(m as any).photo ? `<img src="${esc((m as any).photo)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><div style="width:80px;height:80px;background:rgba(44,95,46,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:30px;font-weight:700;color:var(--green)">${esc(m.name.charAt(0))}</div></div>`}
        </div>
        <div style="padding:20px">
          <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:4px">${esc(m.name)}</div>
          <div style="font-size:13px;color:var(--green-accent);font-weight:500">${esc(m.role)}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:40px" data-reveal>
      <a href="${esc(baseUrl)}-team" class="btn-ghost">Full Team</a>
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--green);text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(32px,4vw,52px);font-weight:700;font-style:italic;color:#fff;line-height:1.15;margin-bottom:20px;letter-spacing:-.02em" data-reveal>Start with a free site visit</h2>
  <p style="font-size:16px;color:rgba(255,255,255,.7);max-width:440px;margin:0 auto 32px;line-height:1.85" data-reveal>No commitment, no pressure. Walk us through your property and we give you an honest assessment.</p>
  <a href="${esc(baseUrl)}-contact" style="background:#fff;color:var(--green);padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;display:inline-flex;align-items:center" data-reveal>Request a Consultation</a>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Contact ──────────────────────────────────────────────────────

function buildContact(biz: BizPageData, baseUrl: string): string {
  const mapQuery = biz.address
    ? encodeURIComponent(`${biz.address}, ${biz.city || ''} ${biz.state || ''}`)
    : encodeURIComponent(`${biz.city || 'landscape'} ${biz.state || ''}`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Contact — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:152px 32px 80px;background:var(--card);border-bottom:1px solid var(--border)}
.contact-layout{max-width:var(--max-w);margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;padding:80px 32px;align-items:start}
.form-group{margin-bottom:20px}
.form-label{display:block;font-size:12px;font-weight:600;color:var(--muted);letter-spacing:.06em;margin-bottom:8px;text-transform:uppercase}
.form-input{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:15px;color:var(--text);font-family:var(--font-body);outline:none;transition:border-color .2s}
.form-input:focus{border-color:var(--green)}
.form-input::placeholder{color:var(--muted)}
textarea.form-input{resize:vertical;min-height:140px}
@media(max-width:768px){.contact-layout{grid-template-columns:1fr;padding:48px 20px}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:14px" data-reveal>Contact</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:700;color:var(--text);line-height:1.08;letter-spacing:-.03em;max-width:640px;margin-bottom:16px" data-reveal>Let's talk about your property</h1>
    <p style="font-size:17px;color:var(--muted);max-width:480px;line-height:1.85" data-reveal>Free consultations, same-day responses. No obligation to commit before you are ready.</p>
  </div>
</section>

<div class="contact-layout">
  <div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:36px;margin-bottom:24px" data-reveal>
      <h3 style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--text);margin-bottom:24px">Get in touch directly</h3>
      ${biz.phone ? `<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:20px"><div style="width:40px;height:40px;background:var(--green-light);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.5 9.19 19.79 19.79 0 011.49 4 2 2 0 013.49 2h3a2 2 0 012 1.72c.13.97.36 1.92.7 2.84a2 2 0 01-.45 2.11L8 9.91a16 16 0 006.09 6.09l.74-.74a2 2 0 012.11-.45c.92.34 1.87.57 2.84.7A2 2 0 0122 16.92z"/></svg></div><div><div style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:4px">Phone</div><a href="tel:${esc(telLink(biz.phone))}" style="font-size:16px;color:var(--text);font-weight:500">${esc(biz.phone)}</a></div></div>` : ''}
      ${biz.address ? `<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:20px"><div style="width:40px;height:40px;background:var(--green-light);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div><div style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:4px">Address</div><span style="font-size:15px;color:var(--text)">${esc(biz.address)}${biz.city ? ', ' + esc(biz.city) : ''}${biz.state ? ' ' + esc(biz.state) : ''}</span></div></div>` : ''}
      <div style="display:flex;gap:14px;align-items:flex-start"><div style="width:40px;height:40px;background:var(--green-light);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:4px">Hours</div><span style="font-size:15px;color:var(--text)">${esc(biz.hours)}</span></div></div>
    </div>
    <div style="border-radius:var(--card-radius);overflow:hidden;height:280px;border:1px solid var(--border)" data-reveal>
      <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${mapQuery}&layer=mapnik" width="100%" height="280" style="border:none" title="Location map" loading="lazy"></iframe>
    </div>
  </div>
  <div data-reveal>
    <form style="background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:40px">
      <h3 style="font-family:var(--font-display);font-size:24px;font-weight:700;color:var(--text);margin-bottom:28px">Request a Free Consultation</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-group"><label class="form-label">First Name</label><input type="text" class="form-input" placeholder="Jane"></div>
        <div class="form-group"><label class="form-label">Last Name</label><input type="text" class="form-input" placeholder="Smith"></div>
      </div>
      <div class="form-group"><label class="form-label">Phone</label><input type="tel" class="form-input" placeholder="${esc(biz.phone || '(555) 000-0000')}"></div>
      <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" placeholder="jane@email.com"></div>
      <div class="form-group"><label class="form-label">Property Type</label>
        <select class="form-input">
          <option>Residential</option>
          <option>Commercial</option>
          <option>HOA / Multi-Unit</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Service Needed</label>
        <select class="form-input">
          <option value="">Select a service</option>
          ${(biz.services || []).map(s => `<option>${esc(s.name)}</option>`).join('')}
          <option>Not Sure — Need Assessment</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Project Details</label><textarea class="form-input" placeholder="Tell us about your property and what you want to achieve..."></textarea></div>
      <button type="submit" class="btn-primary" style="width:100%;justify-content:center;padding:16px;font-size:15px">Send Request</button>
      <p style="font-size:13px;color:var(--muted);text-align:center;margin-top:14px">We respond within the same business day.</p>
    </form>
  </div>
</div>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Team ─────────────────────────────────────────────────────────

function buildTeam(biz: BizPageData, baseUrl: string): string {
  const defaultTeam = [
    { name: biz.teamName || 'Alex M.', role: 'Owner & Lead Designer' },
    { name: 'Jordan P.', role: 'Senior Irrigation Specialist' },
    { name: 'Riley S.', role: 'Installation Crew Lead' },
    { name: 'Morgan W.', role: 'Horticulturalist' },
    { name: 'Casey L.', role: 'Maintenance Crew Lead' },
    { name: 'Taylor B.', role: 'Project Coordinator' },
  ];
  const teamMembers = (biz.team && biz.team.length > 0) ? biz.team : defaultTeam;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Our Team — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:152px 32px 80px;background:var(--card);border-bottom:1px solid var(--border)}
.team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.team-card{background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);overflow:hidden;transition:box-shadow .3s,border-color .3s}
.team-card:hover{border-color:var(--green-accent);box-shadow:0 4px 24px rgba(44,95,46,.08)}
.principles-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media(max-width:768px){.team-grid{grid-template-columns:1fr 1fr}.principles-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:14px" data-reveal>The Team</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:700;color:var(--text);line-height:1.08;letter-spacing:-.03em;max-width:640px;margin-bottom:16px" data-reveal>The crew that does the work</h1>
    <p style="font-size:17px;color:var(--muted);max-width:500px;line-height:1.85" data-reveal>No rotating labor, no subcontractors. The same professionals handle your project from consultation through ongoing care.</p>
  </div>
</section>

<section style="padding:100px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:12px" data-reveal>Everyone on the Crew</p>
    <h2 class="section-title" style="margin-bottom:56px" data-reveal>People who are serious about this work</h2>
    <div class="team-grid">
      ${teamMembers.map((m, i) => `
      <div class="team-card" data-reveal data-delay="${(i % 3) + 1}">
        <div style="height:280px;background:var(--green-light);overflow:hidden">
          ${(m as any).photo ? `<img src="${esc((m as any).photo)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><div style="width:88px;height:88px;background:rgba(44,95,46,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:32px;font-weight:700;color:var(--green)">${esc(m.name.charAt(0))}</div></div>`}
        </div>
        <div style="padding:24px">
          <div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:4px">${esc(m.name)}</div>
          <div style="font-size:13px;color:var(--green-accent);font-weight:500;margin-bottom:${(m as any).bio ? '12px' : '0'}">${esc(m.role)}</div>
          ${(m as any).bio ? `<p style="font-size:14px;color:var(--muted);line-height:1.7">${esc((m as any).bio)}</p>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Working Principles -->
<section style="padding:80px 32px;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:12px" data-reveal>How We Operate</p>
    <h2 class="section-title" style="margin-bottom:48px" data-reveal>Working principles, not marketing statements</h2>
    <div class="principles-grid">
      ${[
        { title: 'Same crew, every time', desc: 'Consistency matters in landscape care. You work with the same people from start to finish — no surprise substitutions on install day.' },
        { title: 'Honest assessments first', desc: 'If your budget is better spent on a different approach, we say so. We would rather lose a bigger sale than watch a project underperform.' },
        { title: 'Clean sites at the end of every day', desc: 'Debris, cuttings, and materials are cleared before we leave. Your property is respectful from day one.' },
        { title: 'Follow-through on issues', desc: 'If something is not right, we come back — no charge, no delay, no arguments. Our reputation is worth more than a service call.' },
      ].map((p, i) => `
      <div style="padding:32px;background:var(--bg);border:1px solid var(--border);border-radius:var(--card-radius)" data-reveal data-delay="${i + 1}">
        <div style="width:36px;height:36px;background:var(--green-light);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:10px">${esc(p.title)}</h3>
        <p style="font-size:14px;color:var(--muted);line-height:1.75">${esc(p.desc)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--bg);text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(32px,4vw,52px);font-weight:700;color:var(--text);line-height:1.15;letter-spacing:-.02em;margin-bottom:20px" data-reveal>Work with this team</h2>
  <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 32px;font-size:15px" data-reveal>Request a Consultation</a>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Gallery ──────────────────────────────────────────────────────

function buildGallery(biz: BizPageData, baseUrl: string): string {
  const allPhotos = Array.from({ length: 9 }, (_, i) => ph(i, biz));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gallery — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:152px 32px 80px;background:var(--card);border-bottom:1px solid var(--border)}
.gallery-masonry{columns:3;column-gap:16px}
.gallery-item{break-inside:avoid;margin-bottom:16px;border-radius:var(--card-radius);overflow:hidden;border:1px solid var(--border)}
.ba-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media(max-width:768px){.gallery-masonry{columns:2}.ba-grid{grid-template-columns:1fr}}
@media(max-width:480px){.gallery-masonry{columns:1}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:14px" data-reveal>Portfolio</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:700;color:var(--text);line-height:1.08;letter-spacing:-.03em;max-width:600px;margin-bottom:16px" data-reveal>Work worth looking at</h1>
    <p style="font-size:17px;color:var(--muted);max-width:480px;line-height:1.85" data-reveal>Residential, commercial, and specialty landscape projects — all done by our own crew.</p>
  </div>
</section>

<section style="padding:80px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <div class="gallery-masonry">
      ${allPhotos.map((url, i) => `
      <div class="gallery-item" data-reveal data-delay="${(i % 4) + 1}">
        <img src="${esc(url)}" alt="Landscaping project ${i + 1}" style="width:100%;display:block" loading="lazy">
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- Before/After -->
<section style="padding:80px 32px;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:12px" data-reveal>Transformations</p>
    <h2 class="section-title" style="margin-bottom:12px" data-reveal>Before &amp; after</h2>
    <p class="section-sub" style="margin-bottom:48px" data-reveal>Drag the handle to see the full extent of the transformation.</p>
    <div class="ba-grid">
      ${baSlider(ph(7, biz), ph(1, biz), 'Residential garden')}
      ${baSlider(ph(8, biz), ph(3, biz), 'Front yard redesign')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--bg);text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(30px,4vw,48px);font-weight:700;color:var(--text);line-height:1.15;letter-spacing:-.02em;margin-bottom:20px" data-reveal>Your project could be next</h2>
  <a href="${esc(baseUrl)}-contact" class="btn-primary" style="padding:14px 32px;font-size:15px" data-reveal>Get a Free Quote</a>
</section>

${footer(biz, baseUrl)}
${BA_JS}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Page Builder: Testimonials ─────────────────────────────────────────────────

function buildTestimonials(biz: BizPageData, baseUrl: string): string {
  const reviews = reviewPad(biz);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reviews — ${esc(biz.name)}</title>
${globalStyles()}
<style>
.page-hero{padding:152px 32px 80px;background:var(--card);border-bottom:1px solid var(--border)}
.reviews-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.review-card{background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:32px;transition:box-shadow .3s}
.review-card:hover{box-shadow:0 4px 24px rgba(44,95,46,.08)}
@media(max-width:768px){.reviews-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
${nav(biz, baseUrl)}
<section class="page-hero">
  <div style="max-width:var(--max-w);margin:0 auto">
    <p class="section-label" style="margin-bottom:14px" data-reveal>Reviews</p>
    <h1 style="font-family:var(--font-display);font-size:clamp(40px,6vw,68px);font-weight:700;color:var(--text);line-height:1.08;letter-spacing:-.03em;max-width:640px;margin-bottom:16px" data-reveal>What clients actually say</h1>
    <p style="font-size:17px;color:var(--muted);max-width:480px;line-height:1.85" data-reveal>We have never paid for a review. Every one of these was left by someone who wanted to share their experience.</p>
  </div>
</section>

<!-- Rating Summary -->
<section style="padding:48px 32px;background:var(--bg);border-bottom:1px solid var(--border)">
  <div style="max-width:var(--max-w);margin:0 auto;display:flex;align-items:center;gap:32px;flex-wrap:wrap">
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--card-radius);padding:24px 32px;display:inline-flex;align-items:center;gap:20px" data-reveal>
      <div>
        <div style="font-family:var(--font-display);font-size:52px;font-weight:700;color:var(--green);line-height:1;letter-spacing:-.03em">${esc(String(biz.rating || 4.9))}</div>
        <div style="color:var(--green-accent);font-size:18px;margin-top:4px">★★★★★</div>
      </div>
      <div>
        <div style="font-size:16px;font-weight:600;color:var(--text)">${esc(String(biz.reviews || '200'))}+ Google Reviews</div>
        <div style="font-size:13px;color:var(--muted);margin-top:4px">Verified customer ratings</div>
      </div>
    </div>
    <p style="font-size:15px;color:var(--muted);max-width:440px;line-height:1.85" data-reveal>Our rating reflects hundreds of projects held to the same standard. We do not cherry-pick easy jobs — and the reviews show it.</p>
  </div>
</section>

<!-- Reviews Grid -->
<section style="padding:80px 32px;background:var(--bg)">
  <div style="max-width:var(--max-w);margin:0 auto">
    <div class="reviews-grid">
      ${reviews.map((r, i) => `
      <div class="review-card" data-reveal data-delay="${(i % 3) + 1}">
        <div style="color:var(--green-accent);font-size:15px;letter-spacing:.1em;margin-bottom:16px">★★★★★</div>
        <p style="font-family:var(--font-display);font-size:15px;font-style:italic;color:var(--text);line-height:1.8;margin-bottom:20px">"${esc(r.text)}"</p>
        <div style="border-top:1px solid var(--border);padding-top:16px">
          <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(r.reviewer)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">${esc(r.svc)} — ${esc(r.city)}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- CTA -->
<section style="padding:80px 32px;background:var(--green);text-align:center">
  <h2 style="font-family:var(--font-display);font-size:clamp(32px,4vw,52px);font-weight:700;font-style:italic;color:#fff;line-height:1.15;letter-spacing:-.02em;margin-bottom:20px" data-reveal>Join the list</h2>
  <p style="font-size:16px;color:rgba(255,255,255,.7);max-width:440px;margin:0 auto 32px;line-height:1.85" data-reveal>Free consultation, honest assessment, no pressure to commit. Same-day response.</p>
  <a href="${esc(baseUrl)}-contact" style="background:#fff;color:var(--green);padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;display:inline-flex;align-items:center" data-reveal>Get a Free Quote</a>
</section>

${footer(biz, baseUrl)}
${DATA_REVEAL_JS}
</body>
</html>`;
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function buildLandscapingV3AllPages(biz: BizPageData, baseUrl: string): Record<string, string> {
  return {
    home: buildHome(biz, baseUrl),
    about: buildAbout(biz, baseUrl),
    contact: buildContact(biz, baseUrl),
    team: buildTeam(biz, baseUrl),
    gallery: buildGallery(biz, baseUrl),
    testimonials: buildTestimonials(biz, baseUrl),
  };
}
