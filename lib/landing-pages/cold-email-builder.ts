export interface ColdEmailPageData {
  leadName: string;
  firstName: string;
  videoUrl: string;
  calendlyUrl: string;
  personalNote?: string;
  city?: string;
  brokerage?: string;
}

/**
 * Build a standalone HTML landing page for a cold email lead.
 * Returns a complete HTML string with inline CSS — no external dependencies.
 */
export function buildColdEmailPage(data: ColdEmailPageData): string {
  const {
    firstName,
    leadName,
    videoUrl,
    calendlyUrl,
    personalNote,
    city,
    brokerage,
  } = data;

  const locationLine = [city, brokerage].filter(Boolean).join(' · ');

  // Escape HTML entities in user-provided strings
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hey ${esc(firstName)} — Nexorra</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0b;
      color: #e4e4e7;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .hero {
      min-height: 50vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 1.5rem 3rem;
      background: linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 50%, #16213e 100%);
      position: relative;
      overflow: hidden;
    }

    .hero::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.08) 0%, transparent 60%),
                  radial-gradient(circle at 70% 60%, rgba(168, 85, 247, 0.06) 0%, transparent 50%);
      pointer-events: none;
    }

    .hero-tag {
      display: inline-block;
      padding: 0.35rem 1rem;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 100px;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #a5b4fc;
      margin-bottom: 1.5rem;
      position: relative;
    }

    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.2rem);
      font-weight: 700;
      color: #fafafa;
      max-width: 640px;
      position: relative;
    }

    .hero h1 span {
      background: linear-gradient(135deg, #818cf8, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-sub {
      margin-top: 1rem;
      font-size: 1.1rem;
      color: #a1a1aa;
      max-width: 480px;
      position: relative;
    }

    ${locationLine ? `.hero-location {
      margin-top: 0.75rem;
      font-size: 0.9rem;
      color: #71717a;
      position: relative;
    }` : ''}

    ${personalNote ? `.personal-note {
      margin-top: 1.5rem;
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.04);
      border-left: 3px solid #818cf8;
      border-radius: 0 8px 8px 0;
      max-width: 480px;
      text-align: left;
      font-size: 0.95rem;
      color: #d4d4d8;
      position: relative;
    }` : ''}

    section {
      max-width: 720px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }

    .video-section {
      padding-top: 2rem;
      padding-bottom: 2rem;
    }

    .video-wrapper {
      border-radius: 12px;
      overflow: hidden;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .video-wrapper video {
      width: 100%;
      display: block;
    }

    .about-section {
      text-align: center;
    }

    .about-section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #fafafa;
      margin-bottom: 1rem;
    }

    .about-section p {
      font-size: 1rem;
      color: #a1a1aa;
      max-width: 560px;
      margin: 0 auto;
    }

    .cta-section {
      text-align: center;
      padding-bottom: 4rem;
    }

    .cta-section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #fafafa;
      margin-bottom: 0.5rem;
    }

    .cta-section p {
      font-size: 1rem;
      color: #a1a1aa;
      margin-bottom: 2rem;
    }

    .calendly-embed {
      border-radius: 12px;
      overflow: hidden;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .calendly-embed iframe {
      width: 100%;
      height: 660px;
      border: none;
    }

    footer {
      text-align: center;
      padding: 2rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      color: #52525b;
      font-size: 0.8rem;
    }

    footer a {
      color: #818cf8;
      text-decoration: none;
    }

    @media (max-width: 480px) {
      .hero { padding: 3rem 1rem 2rem; }
      section { padding: 2rem 1rem; }
      .calendly-embed iframe { height: 560px; }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="hero">
    <div class="hero-tag">Made for you</div>
    <h1>Hi <span>${esc(firstName)}</span>, I made this for you</h1>
    <p class="hero-sub">A quick personal video about how we can help you book more appointments — without lifting a finger.</p>
    ${locationLine ? `<p class="hero-location">${esc(locationLine)}</p>` : ''}
    ${personalNote ? `<div class="personal-note">${esc(personalNote)}</div>` : ''}
  </div>

  <section class="video-section">
    <div class="video-wrapper">
      <video controls preload="metadata" playsinline poster="">
        <source src="${esc(videoUrl)}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>
  </section>

  <section class="about-section">
    <h2>What is Nexorra?</h2>
    <p>
      Nexorra is an AI-powered appointment-setting agency built specifically for real estate agents.
      We handle your lead follow-up with intelligent, personalized conversations — so you spend
      less time chasing and more time closing.
    </p>
  </section>

  <section class="cta-section">
    <h2>Let's talk</h2>
    <p>Pick a time that works for you — no pressure, just a quick chat.</p>
    <div class="calendly-embed">
      <iframe
        src="${esc(calendlyUrl)}?hide_gdpr_banner=1&background_color=18181b&text_color=e4e4e7&primary_color=818cf8"
        loading="lazy"
        title="Book a call with Nexorra"
      ></iframe>
    </div>
  </section>

  <footer>
    <p>&copy; ${new Date().getFullYear()} <a href="https://nexorra.com">Nexorra</a> &middot; AI Appointment Setting for Real Estate Agents</p>
  </footer>
</body>
</html>`;
}
