const ASSETS_BASE = 'https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-assets';
const LOGO_URL = `${ASSETS_BASE}/nexorra-logo.png`;
const REVIEW_IMAGES = Array.from({ length: 9 }, (_, i) => `${ASSETS_BASE}/review-${i + 1}.jpg`);

const TESTIMONIALS = [
  { name: 'Brandon H.', text: "In the first full month we closed 3 extra transactions that I 100% attribute to their appointments. That added roughly $28k to my GCI for the month. The leads actually pick up, show up, and are pre-qualified." },
  { name: 'Sarah P.', text: "Been with them for 6 months now. Average 2.5 extra deals per month. Last quarter alone that was about 80k extra GCI. Appointments are high quality — serious buyers and sellers who already know my name." },
  { name: 'Mike D.', text: "Before this agency I was lucky to close 1 off-market deal every other month. Now it's consistently around 2 per month. February was my best: 3 closings, $32k GCI bump." },
  { name: 'Jessica R.', text: "I went from maybe 12–14 closes a year to pushing 35. That's basically 2 extra deals almost every single month. I'm making an extra 20k with these guys which has completely changed my life." },
  { name: 'Tom B.', text: "I get 8–12 solid appointments a month and usually convert 20–30% into deals. That's 2–3 closes monthly for the past four months straight. I've made over $100k so far with them." },
  { name: 'Michael S.', text: "First 90 days: 7 additional transactions, roughly $68k in extra GCI. The appointments are so much better — people actually expecting my call, not surprised." },
  { name: 'Jennifer L.', text: "2 deals in month 1, 3 in month 2, 2 in month 3. Averaging right around $23k extra GCI per month. Best outsourcing decision I've made in 8 years as a realtor." },
  { name: 'David R.', text: "Our team average went from 4–5 sides/month to 7–8 thanks to their consistent flow. That's ~$25k–50k additional GCI monthly for the team." },
  { name: 'Lauren G.', text: "Six-month update: 14 extra transactions. Average commission around $9,800 so that's ~$137k added to my business. The appointments feel like warm referrals, not cold outreach." },
  { name: 'Christopher H.', text: "I get 10–15 quality sits a month, close about 20%. That's 2–3 deals monthly, adding $20k–30k GCI consistently. Highly recommend if you hate prospecting." },
];

export interface ColdEmailPageData {
  leadName: string;
  firstName: string;
  videoUrl: string;
  calendlyUrl: string;
  personalNote?: string;
  city?: string;
  brokerage?: string;
  slug?: string;
  pageId?: string;
  profileImageUrl?: string;
  gifUrl?: string;
}

/**
 * Build a standalone HTML landing page for a cold email lead.
 * Returns a complete HTML string with inline CSS — no external dependencies.
 */
export function buildColdEmailPage(data: ColdEmailPageData): string {
  const {
    firstName = 'there',
    videoUrl,
    calendlyUrl = 'https://calendly.com/nexorra/demo-call?embed_domain=nexorra.io&embed_type=Inline',
    slug,
    pageId,
    gifUrl,
  } = data;

  const trackId = pageId || slug || '';
  const trackBase = '/api/landing-pages/track';

  // Testimonials cards HTML (duplicated 3x for seamless loop)
  const testimonialCards = TESTIMONIALS.map((t, i) => `
    <div class="tcard">
      <div class="tcard-stars">★★★★★</div>
      <p class="tcard-text">"${t.text}"</p>
      <p class="tcard-name">— ${t.name}</p>
    </div>
  `).join('');

  // Review images HTML (duplicated 3x for seamless loop)
  const reviewImagesHtml = REVIEW_IMAGES.map(
    (url, i) => `<div class="ri-item"><img src="${url}" alt="Client review ${i + 1}" loading="lazy"></div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How we Guarantee 3-5 Closed Deals in 90 Days - Or You Don't Pay</title>
  <meta property="og:title" content="How we Guarantee 3-5 Closed Deals in 90 Days - Or You Don't Pay">
  <meta property="og:description" content="We've helped over 100 realestate agents close an extra 3 deals per month on average.">
  <meta property="og:image" content="${gifUrl || ASSETS_BASE + '/og-thumbnail.jpg'}">
  <meta property="og:image:alt" content="Video for ${firstName} | Nexorra">
  <meta property="og:type" content="video.other">
  <meta property="og:video" content="${videoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="How we Guarantee 3-5 Closed Deals in 90 Days - Or You Don't Pay">
  <meta name="twitter:image" content="${gifUrl || ASSETS_BASE + '/og-thumbnail.jpg'}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      overflow-x: hidden;
      max-width: 100vw;
    }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #fafbfc;
      color: #1e293b;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      max-width: 760px;
      margin: 0 auto;
      padding: 0 20px 60px;
    }

    /* ── Logo + Headline ── */
    .hero {
      text-align: center;
      padding: 44px 20px 36px;
      background: linear-gradient(180deg, #f0f4ff 0%, #fafbfc 100%);
      margin: 0 -20px 36px;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -60%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%);
      pointer-events: none;
    }

    .logo-word {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }
    .logo-letter {
      font-family: 'Manrope', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .logo-letter-nex {
      margin-right: -2px;
    }
    .logo-letter-rra {
      margin-left: -2px;
    }
    .logo-img {
      width: 26px;
      height: 26px;
      object-fit: contain;
      margin: 0 0px;
      vertical-align: middle;
      filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.15));
    }

    .hero h1 {
      font-family: 'Manrope', sans-serif;
      font-size: clamp(22px, 4.5vw, 34px);
      font-weight: 800;
      color: #0f172a;
      line-height: 1.45;
      position: relative;
      z-index: 1;
      max-width: 620px;
      margin: 0 auto;
    }
    .video-intro {
      font-size: 16px;
      color: #64748b;
      font-weight: 500;
      text-align: center;
      margin-bottom: 14px;
    }
    .hero h1 .underline-italic {
      font-style: italic;
      text-decoration: underline;
      text-decoration-color: #3b82f6;
      text-underline-offset: 4px;
      text-decoration-thickness: 2px;
    }
    .hero h1 .bold-accent {
      font-weight: 800;
      color: #1e40af;
    }

    /* ── Video ── */
    .video-container {
      position: relative;
      width: 100%;
      border-radius: 16px;
      overflow: hidden;
      background: #0f172a;
      border: 1px solid #e2e8f0;
      box-shadow: 0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.03);
      margin-bottom: 48px;
    }
    .video-container video {
      width: 100%;
      display: block;
      cursor: pointer;
    }
    .play-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.40);
      cursor: pointer;
      transition: opacity 0.3s;
      z-index: 2;
    }
    .play-overlay.hidden { opacity: 0; pointer-events: none; }
    .play-btn {
      width: 72px;
      height: 72px;
      background: #3b82f6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 24px rgba(59, 130, 246, 0.4);
    }
    .play-btn:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(59, 130, 246, 0.55); }
    .play-btn svg { width: 28px; height: 28px; fill: white; margin-left: 3px; }
    .overlay-time {
      display: flex;
      align-items: center;
      color: white;
      font-size: 14px;
      font-weight: 500;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
      margin-top: 12px;
    }

    .controls-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      padding: 12px 14px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 3;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .video-container:hover .controls-bar { opacity: 1; }
    .controls-bar.show { opacity: 1; }
    .ctrl-btn {
      background: none; border: none; cursor: pointer; padding: 2px;
      display: flex; align-items: center;
    }
    .ctrl-btn svg { width: 20px; height: 20px; fill: white; }
    .progress-wrap {
      flex: 1; height: 4px; background: rgba(255,255,255,0.25); border-radius: 2px;
      cursor: pointer; position: relative;
    }
    .progress-fill {
      height: 100%; background: #3b82f6; border-radius: 2px; width: 0%;
      transition: width 0.1s linear;
    }
    .time-label {
      font-size: 12px; color: rgba(255,255,255,0.85); font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .speed-badge {
      font-size: 10px; background: rgba(59,130,246,0.8); color: white;
      padding: 1px 5px; border-radius: 3px; font-weight: 600;
    }
    .vol-slider {
      width: 60px; height: 4px; -webkit-appearance: none; appearance: none;
      background: rgba(255,255,255,0.25); border-radius: 2px; cursor: pointer;
    }
    .vol-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px;
      background: white; border-radius: 50%; cursor: pointer;
    }

    /* ── Book A Call Section ── */
    .cta-section {
      text-align: center;
      margin-bottom: 12px;
    }
    .cta-title {
      font-family: 'Manrope', sans-serif;
      font-size: clamp(24px, 4vw, 32px);
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .cta-arrows {
      font-size: 28px;
      color: #3b82f6;
      animation: bounceArrow 1.5s ease-in-out infinite;
      margin-bottom: 8px;
    }
    @keyframes bounceArrow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(6px); }
    }
    .cta-subtitle {
      font-size: 15px;
      color: #64748b;
      line-height: 1.65;
      max-width: 560px;
      margin: 0 auto 24px;
    }

    /* ── Calendly ── */
    .calendly-section {
      margin-bottom: 56px;
    }
    .calendly-section iframe {
      width: 100%;
      height: 700px;
      border: none;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    @media (max-width: 640px) {
      .calendly-section iframe { height: 580px; }
    }

    /* ── Testimonials marquee (text cards) ── */
    .testimonials-section {
      margin: 0 -20px 56px;
      padding: 48px 0;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%);
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .section-title {
      font-family: 'Manrope', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      text-align: center;
      margin-bottom: 32px;
    }

    .tmarquee {
      display: flex;
      overflow: hidden;
    }
    .tmarquee-track {
      display: flex;
      gap: 20px;
      flex-shrink: 0;
      animation: scrollLeft 60s linear infinite;
    }
    .tmarquee:hover .tmarquee-track { animation-play-state: paused; }

    @keyframes scrollLeft {
      0% { transform: translateX(0); }
      100% { transform: translateX(-33.333%); }
    }

    .tcard {
      width: 320px;
      flex-shrink: 0;
      background: white;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.05);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .tcard:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .tcard-stars {
      color: #f59e0b;
      font-size: 16px;
      letter-spacing: 2px;
      margin-bottom: 12px;
    }
    .tcard-text {
      font-size: 14px;
      line-height: 1.65;
      color: #475569;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .tcard-name {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
    }

    /* ── Reviews images marquee ── */
    .reviews-section {
      margin: 0 -20px 56px;
      padding: 48px 0 40px;
      overflow: hidden;
    }
    .reviews-subtitle {
      text-align: center;
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 24px;
    }

    .ri-marquee {
      display: flex;
      overflow: hidden;
    }
    .ri-track {
      display: flex;
      gap: 20px;
      flex-shrink: 0;
      animation: scrollRight 50s linear infinite;
      align-items: center;
    }
    .ri-marquee:hover .ri-track { animation-play-state: paused; }

    @keyframes scrollRight {
      0% { transform: translateX(-33.333%); }
      100% { transform: translateX(0); }
    }

    .ri-item {
      width: 280px;
      flex-shrink: 0;
      transition: transform 0.3s;
    }
    .ri-item img {
      width: 100%;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 6px 20px -4px rgba(0,0,0,0.12);
      border: 1px solid rgba(0,0,0,0.06);
    }
    .ri-item:hover {
      transform: scale(1.05);
      z-index: 10;
    }
    @media (max-width: 640px) {
      .ri-item { width: 220px; }
      .tcard { width: 260px; padding: 18px; }
    }

    /* ── Book a Call button ── */
    .book-btn-wrap {
      text-align: center;
      margin-bottom: 48px;
    }
    .book-btn {
      display: inline-block;
      background: #3b82f6;
      color: white;
      font-family: 'DM Sans', sans-serif;
      font-size: 17px;
      font-weight: 700;
      padding: 16px 48px;
      border-radius: 12px;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
      cursor: pointer;
      border: none;
    }
    .book-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.45);
      background: #2563eb;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      padding-top: 28px;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      font-size: 13px;
      color: #94a3b8;
    }
    .footer a { color: #3b82f6; text-decoration: none; }

    /* ── Animations ── */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .hero h1 { animation: fadeInUp 0.6s ease-out both; }
    .logo-word { animation: fadeInUp 0.5s ease-out both; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Logo as NEX[logo]RRA -->
    <div class="hero">
      <div class="logo-word">
        <span class="logo-letter logo-letter-nex">NEX</span>
        <img src="${LOGO_URL}" alt="O" class="logo-img">
        <span class="logo-letter logo-letter-rra">RRA</span>
      </div>
      <h1>We will guarantee you, ${firstName}, 3-5 <span class="underline-italic">Closed Deals</span> In Under 3 Months &mdash; <span class="bold-accent">Or You Don&rsquo;t Pay</span></h1>
    </div>

    <!-- Video -->
    <p class="video-intro">Here's the video I made for you, ${firstName}</p>
    <div class="video-container">
      <video id="vid" preload="metadata" playsinline>
        <source src="${videoUrl}" type="video/mp4">
      </video>
      <div class="play-overlay" id="playOverlay" onclick="startVideo()">
        <div class="play-btn">
          <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
        <div class="overlay-time" id="overlayTime">
          <span class="speed-badge" style="margin-right:6px">1.3x</span>
          <span id="overlayDuration">0:00</span>
        </div>
      </div>
      <div class="controls-bar" id="controlsBar">
        <button class="ctrl-btn" id="playPauseBtn" onclick="togglePlay()">
          <svg id="ppIcon" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <div class="progress-wrap" id="progressWrap" onclick="seek(event)">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <span class="time-label" id="timeLabel">0:00 / 0:00</span>
        <button class="ctrl-btn" id="volBtn" onclick="toggleMute()">
          <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.5 4.5 0 002.5-3.5zM14 3.23v2.06a6.51 6.51 0 010 13.42v2.06A8.52 8.52 0 0022.5 12 8.52 8.52 0 0014 3.23z"/></svg>
        </button>
        <input type="range" class="vol-slider" id="volSlider" min="0" max="1" step="0.1" value="1" oninput="setVol(this.value)">
        <button class="ctrl-btn" onclick="goFS()">
          <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        </button>
      </div>
    </div>

    <!-- Book A Call CTA -->
    <div class="cta-section" id="bookCallSection">
      <div class="cta-title">Book A Call</div>
      <div class="cta-arrows">↓ ↓ ↓</div>
      <p class="cta-subtitle">Book a 15-20 minute call, non-salesy, no pressure. The purpose of this call is to show you how we're able to generate 15-100 qualified appointments per month and for us to figure out the best way of helping you.</p>
    </div>

    <!-- Calendly embed (loads immediately) -->
    <div class="calendly-section" id="calendlyEmbed">
      <iframe src="${calendlyUrl}${calendlyUrl.includes('?') ? '&' : '?'}hide_gdpr_banner=1&background_color=ffffff&text_color=1e293b&primary_color=3b82f6" title="Book a call with Nexorra" loading="eager"></iframe>
    </div>
  </div>

  <!-- Testimonials (full-width marquee) -->
  <div class="testimonials-section">
    <div class="section-title">Our Testimonials</div>
    <div class="tmarquee">
      <div class="tmarquee-track">${testimonialCards}${testimonialCards}${testimonialCards}</div>
    </div>
  </div>

  <!-- Review images marquee -->
  <div class="reviews-section">
    <div class="section-title">Some More Reviews</div>
    <div class="ri-marquee">
      <div class="ri-track">${reviewImagesHtml}${reviewImagesHtml}${reviewImagesHtml}</div>
    </div>
  </div>

  <div class="page">
    <!-- Book a Call button -->
    <div class="book-btn-wrap">
      <a href="#calendlyEmbed" class="book-btn" onclick="document.getElementById('calendlyEmbed').scrollIntoView({behavior:'smooth'});return false;">Book a Call</a>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} <a href="https://nexorra.io">Nexorra</a>. AI-powered appointment setting for real estate agents.</p>
    </div>
  </div>

  ${trackId ? `<img src="${trackBase}?s=${trackId}&t=view" width="1" height="1" style="position:absolute;opacity:0" alt="">` : ''}

  <script>
  (function() {
    var vid = document.getElementById('vid');
    var overlay = document.getElementById('playOverlay');
    var controlsBar = document.getElementById('controlsBar');
    var ppIcon = document.getElementById('ppIcon');
    var progressFill = document.getElementById('progressFill');
    var timeLabel = document.getElementById('timeLabel');
    var volSlider = document.getElementById('volSlider');
    var slug = '${trackId}';
    var tracked = {};
    var SPEED = 1.3;

    function fmt(s) {
      var m = Math.floor(s/60); var sec = Math.floor(s%60);
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    window.startVideo = function() {
      vid.play();
      overlay.classList.add('hidden');
      controlsBar.classList.add('show');
    };

    window.togglePlay = function() {
      if (vid.paused) { vid.play(); overlay.classList.add('hidden'); }
      else vid.pause();
    };

    window.seek = function(e) {
      var rect = e.currentTarget.getBoundingClientRect();
      var pct = (e.clientX - rect.left) / rect.width;
      vid.currentTime = pct * vid.duration;
    };

    window.toggleMute = function() {
      vid.muted = !vid.muted;
      volSlider.value = vid.muted ? 0 : vid.volume;
    };

    window.setVol = function(v) {
      vid.volume = parseFloat(v);
      vid.muted = (v == 0);
    };

    window.goFS = function() {
      var container = document.querySelector('.video-container');
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      else if (vid.requestFullscreen) vid.requestFullscreen();
      else if (vid.webkitRequestFullscreen) vid.webkitRequestFullscreen();
      else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();
    };

    vid.addEventListener('loadedmetadata', function() {
      var origTotal = fmt(vid.duration * SPEED);
      var fastTotal = fmt(vid.duration);
      document.getElementById('overlayDuration').innerHTML = '<s style="color:rgba(255,255,255,0.5);text-decoration:line-through">' + origTotal + '</s> ' + fastTotal;
    });

    vid.addEventListener('click', function() {
      if (vid.paused) { vid.play(); overlay.classList.add('hidden'); }
      else vid.pause();
    });

    vid.addEventListener('play', function() {
      ppIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      controlsBar.classList.add('show');
    });
    vid.addEventListener('pause', function() {
      ppIcon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
    });

    vid.addEventListener('timeupdate', function() {
      if (!vid.duration) return;
      var pct = (vid.currentTime / vid.duration) * 100;
      progressFill.style.width = pct + '%';
      timeLabel.textContent = fmt(vid.currentTime) + ' / ' + fmt(vid.duration);
    });

    function track(type, meta) {
      if (tracked[type]) return;
      tracked[type] = true;
      if (!slug) return;
      fetch('${trackBase}', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({slug: slug, event_type: type, metadata: meta || {}})
      }).catch(function(){});
    }

    vid.addEventListener('play', function() { track('video_play'); });
    vid.addEventListener('timeupdate', function() {
      if (!vid.duration) return;
      var pct = Math.floor((vid.currentTime / vid.duration) * 100);
      if (pct >= 25) track('video_25', {seconds: Math.floor(vid.currentTime)});
      if (pct >= 50) track('video_50', {seconds: Math.floor(vid.currentTime)});
      if (pct >= 75) track('video_75', {seconds: Math.floor(vid.currentTime)});
      if (pct >= 100) track('video_100', {seconds: Math.floor(vid.currentTime)});
    });

    window.addEventListener('message', function(e) {
      if (e.data && e.data.event) {
        if (e.data.event === 'calendly.event_scheduled') track('booking_confirmed', e.data.payload || {});
        if (e.data.event === 'calendly.date_and_time_selected') track('calendly_click');
      }
    });
  })();
  </script>
</body>
</html>`;
}
