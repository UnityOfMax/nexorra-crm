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
}

/**
 * Build a standalone HTML landing page for a cold email lead.
 * Returns a complete HTML string with inline CSS — no external dependencies.
 * Design matches nexorra.io: dark slate (#020617), Manrope/Inter fonts, blue accents.
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video for ${firstName} | Nexorra</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', sans-serif;
      background: #020617;
      color: #e2e8f0;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 20px 60px;
    }

    /* Hero */
    .hero {
      text-align: center;
      margin-bottom: 48px;
      padding-top: 20px;
    }
    .hero h1 {
      font-family: 'Manrope', sans-serif;
      font-size: clamp(28px, 5vw, 42px);
      font-weight: 800;
      background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.15;
      margin-bottom: 14px;
    }
    .hero .subtitle {
      font-family: 'Manrope', sans-serif;
      font-size: clamp(15px, 2.5vw, 18px);
      font-weight: 600;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* Video */
    .video-container {
      position: relative;
      width: 100%;
      border-radius: 16px;
      overflow: hidden;
      background: #0f172a;
      border: 1px solid rgba(59, 130, 246, 0.15);
      box-shadow: 0 0 80px rgba(59, 130, 246, 0.08), 0 20px 60px rgba(0,0,0,0.4);
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
      align-items: center;
      justify-content: center;
      background: rgba(2, 6, 23, 0.5);
      cursor: pointer;
      transition: opacity 0.3s;
    }
    .play-overlay.hidden { opacity: 0; pointer-events: none; }
    .play-btn {
      width: 80px;
      height: 80px;
      background: rgba(59, 130, 246, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
      box-shadow: 0 0 40px rgba(59, 130, 246, 0.4);
    }
    .play-btn:hover { transform: scale(1.08); background: #3b82f6; }
    .play-btn svg { width: 32px; height: 32px; fill: white; margin-left: 4px; }

    /* Copy section */
    .copy-section {
      margin-bottom: 48px;
    }
    .copy-section p {
      font-size: 16px;
      line-height: 1.75;
      color: #cbd5e1;
      margin-bottom: 16px;
    }
    .personal-note {
      padding: 16px 20px;
      background: rgba(59, 130, 246, 0.06);
      border-left: 3px solid #3b82f6;
      border-radius: 0 8px 8px 0;
      color: #94a3b8;
      font-style: italic;
      font-size: 15px;
    }

    /* Calendly */
    .calendly-section {
      margin-bottom: 48px;
    }
    .calendly-section h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
      text-align: center;
      margin-bottom: 24px;
    }
    .calendly-section iframe {
      width: 100%;
      height: 660px;
      border: none;
      border-radius: 12px;
      background: #0f172a;
    }
    @media (max-width: 640px) {
      .calendly-section iframe { height: 560px; }
    }

    /* Footer */
    .footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .footer p {
      font-size: 13px;
      color: #475569;
    }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <h1>Video for ${firstName}</h1>
      <p class="subtitle">How we're making our clients an extra $30,000 every month on average.</p>
    </div>

    <div class="video-container">
      <video id="vid" preload="metadata" playsinline>
        <source src="${videoUrl}" type="video/mp4">
      </video>
      <div class="play-overlay" id="playOverlay" onclick="startVideo()">
        <div class="play-btn">
          <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </div>

    <div class="copy-section">
      <p>As I mentioned in the video, I'd love to show you the whole system and how we do what we do.</p>
      <p>I just don't have the time to record a 15 minute long video every time. And no doubt your business is built on your personality — in order for us to help you, we need to understand that more.</p>
      <p>So if you're interested in how we get our clients results, and you have the capacity for more work right now, feel free to book a call with me below or let me know if you have any questions by replying to my initial message.</p>
      ${locationLine ? `<p>${locationLine}</p>` : ''}
      ${personalBlock}
    </div>

    <div class="calendly-section">
      <h2>Book a Quick Call</h2>
      <iframe src="${calendlyUrl}?hide_gdpr_banner=1&background_color=020617&text_color=e2e8f0&primary_color=3b82f6" loading="lazy" title="Book a call with Nexorra"></iframe>
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
    var slug = '${trackId}';
    var tracked = {};

    window.startVideo = function() {
      vid.play();
      overlay.classList.add('hidden');
    };

    vid.addEventListener('click', function() {
      if (vid.paused) { vid.play(); overlay.classList.add('hidden'); }
      else vid.pause();
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
