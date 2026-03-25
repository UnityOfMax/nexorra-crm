const SUPABASE_STORAGE = 'https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-page-assets';
const LOGO_URL = `${SUPABASE_STORAGE}/logo.png`;
const REVIEW_IMAGES = Array.from({ length: 9 }, (_, i) => `${SUPABASE_STORAGE}/reviews/${i + 1}.jpg`);

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
  profileImageUrl?: string; // deprecated — logo is used instead
  gifUrl?: string;
}

/**
 * Build a standalone HTML landing page for a cold email lead.
 * Returns a complete HTML string with inline CSS — no external dependencies.
 * Nexorra logo front and center, testimonials marquee, eager Calendly embed.
 */
export function buildColdEmailPage(data: ColdEmailPageData): string {
  const {
    firstName = 'there',
    videoUrl,
    calendlyUrl = 'https://calendly.com/nexorra/demo-call',
    personalNote,
    city,
    brokerage,
    slug,
    pageId,
    gifUrl,
  } = data;

  const trackId = pageId || slug || '';
  const trackBase = '/api/landing-pages/track';

  const locationLine = city && brokerage
    ? `Based on what I've seen from your work with ${brokerage} in ${city}, I think you'd find this worth a look.`
    : city
    ? `Working in ${city}, you know how competitive it gets. This could give you an edge.`
    : brokerage
    ? `I've looked at what ${brokerage} agents are doing and think this could help you stand out.`
    : '';

  const personalBlock = personalNote
    ? `<p class="personal-note">${personalNote}</p>`
    : '';

  const reviewImagesHtml = REVIEW_IMAGES.map(
    (url, i) => `<div class="mq-item${i % 2 === 0 ? ' odd' : ' even'}"><img src="${url}" alt="Client result ${i + 1}" loading="lazy"></div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video for ${firstName} | Nexorra</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: #fafbfc;
      color: #1e293b;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 0 20px 60px;
    }

    /* ── Hero with logo ── */
    .hero {
      text-align: center;
      padding: 48px 20px 40px;
      background: linear-gradient(180deg, #f0f4ff 0%, #fafbfc 100%);
      margin: 0 -20px 40px;
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
    .hero-logo {
      width: 180px;
      height: auto;
      margin-bottom: 24px;
      filter: drop-shadow(0 4px 16px rgba(59, 130, 246, 0.12));
      position: relative;
      z-index: 1;
    }
    .hero h1 {
      font-family: 'Manrope', sans-serif;
      font-size: clamp(26px, 5vw, 38px);
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .hero .subtitle {
      font-family: 'DM Sans', sans-serif;
      font-size: clamp(14px, 2.5vw, 17px);
      font-weight: 500;
      color: #64748b;
      line-height: 1.6;
      max-width: 480px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
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
      margin-bottom: 40px;
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

    /* Custom controls bar */
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

    ${gifUrl ? `.gif-preview { width: 100%; border-radius: 16px; margin-bottom: 40px; border: 1px solid #e2e8f0; box-shadow: 0 4px 30px rgba(0,0,0,0.08); cursor: pointer; }` : ''}

    /* ── Copy section ── */
    .copy-section {
      margin-bottom: 48px;
    }
    .copy-section p {
      font-size: 16px;
      line-height: 1.75;
      color: #475569;
      margin-bottom: 14px;
    }
    .personal-note {
      padding: 14px 18px;
      background: #eff6ff;
      border-left: 3px solid #93c5fd;
      border-radius: 0 8px 8px 0;
      color: #64748b;
      font-style: italic;
      font-size: 15px;
    }

    /* ── Testimonials marquee ── */
    .testimonials {
      margin: 0 -20px 48px;
      padding: 40px 0;
      background: linear-gradient(180deg, #f8fafc 0%, #f0f4ff 50%, #f8fafc 100%);
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      overflow: hidden;
    }
    .testimonials h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 8px;
    }
    .testimonials .subtitle-sm {
      text-align: center;
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 28px;
    }
    .mq-wrap {
      display: flex;
      overflow-x: hidden;
      gap: 20px;
    }
    .mq-wrap::-webkit-scrollbar { display: none; }
    .mq-wrap { -ms-overflow-style: none; scrollbar-width: none; }
    .mq-track {
      display: flex;
      gap: 20px;
      flex-shrink: 0;
      align-items: center;
    }
    .mq-item {
      position: relative;
      width: 280px;
      flex-shrink: 0;
      margin: 16px 0;
      transition: transform 0.3s ease;
    }
    .mq-item img {
      width: 100%;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 8px 24px -4px rgba(0,0,0,0.12);
      border: 1px solid rgba(0,0,0,0.06);
    }
    .mq-item.odd { transform: rotate(-1.5deg); }
    .mq-item.even { transform: rotate(1.5deg); }
    .mq-item:hover { transform: scale(1.05) rotate(0deg) !important; z-index: 10; }

    /* ── Calendly ── */
    .calendly-section {
      margin-bottom: 40px;
    }
    .calendly-section h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      text-align: center;
      margin-bottom: 6px;
    }
    .calendly-section .cal-sub {
      text-align: center;
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 20px;
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
      .mq-item { width: 220px; }
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
    .hero h1, .hero .subtitle { animation: fadeInUp 0.6s ease-out both; }
    .hero .subtitle { animation-delay: 0.15s; }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <img src="${LOGO_URL}" alt="Nexorra" class="hero-logo">
      <h1>Video for ${firstName}</h1>
      <p class="subtitle">How we're helping our clients generate an extra $30,000+ every month on average.</p>
    </div>

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

    ${gifUrl ? `<p style="text-align:center;color:#94a3b8;font-size:13px;margin-bottom:8px;">Preview GIF (what appears in email):</p><img src="${gifUrl}" alt="Video preview" class="gif-preview" onclick="document.getElementById('vid').scrollIntoView({behavior:'smooth'});startVideo();">` : ''}

    <div class="copy-section">
      <p>As I mentioned in the video, I'd love to show you the whole system and how we do what we do.</p>
      <p>I just don't have the time to record a 15 minute long video every time. And no doubt your business is built on your personality — in order for us to help you, we need to understand that more.</p>
      <p>So if you're interested in how we get our clients results, and you have the capacity for more work right now, feel free to book a call with me below or let me know if you have any questions by replying to my initial message.</p>
      ${locationLine ? `<p>${locationLine}</p>` : ''}
      ${personalBlock}
    </div>

    <div class="testimonials">
      <h2>Real Results From Real Agents</h2>
      <p class="subtitle-sm">See what our clients have to say</p>
      <div class="mq-wrap" id="reviewsLoop">
        <div class="mq-track">${reviewImagesHtml}</div>
        <div class="mq-track">${reviewImagesHtml}</div>
        <div class="mq-track">${reviewImagesHtml}</div>
      </div>
    </div>

    <div class="calendly-section">
      <h2>Book a Quick Call</h2>
      <p class="cal-sub">Pick a time that works for you — no strings attached</p>
      <iframe src="${calendlyUrl}?hide_gdpr_banner=1&background_color=ffffff&text_color=1e293b&primary_color=3b82f6" title="Book a call with Nexorra"></iframe>
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
      var fastTime = fmt(vid.currentTime);
      var fastTotal = fmt(vid.duration);
      timeLabel.textContent = fastTime + ' / ' + fastTotal;
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

    // Testimonials marquee auto-scroll
    var mqWrap = document.getElementById('reviewsLoop');
    if (mqWrap) {
      var paused = false;
      var lastT = 0;
      mqWrap.addEventListener('mouseenter', function() { paused = true; });
      mqWrap.addEventListener('mouseleave', function() { paused = false; });
      mqWrap.addEventListener('touchstart', function() { paused = true; }, {passive: true});
      mqWrap.addEventListener('touchend', function() { setTimeout(function() { paused = false; }, 1200); });

      function mqAnimate(ts) {
        if (!lastT) lastT = ts;
        var dt = ts - lastT;
        lastT = ts;
        var maxScroll = mqWrap.scrollWidth / 3;
        if (mqWrap.scrollLeft >= maxScroll * 2) {
          mqWrap.scrollLeft -= maxScroll;
        }
        if (!paused) {
          mqWrap.scrollLeft += 0.4 * (dt / 16);
        }
        requestAnimationFrame(mqAnimate);
      }
      requestAnimationFrame(mqAnimate);
    }
  })();
  </script>
</body>
</html>`;
}
