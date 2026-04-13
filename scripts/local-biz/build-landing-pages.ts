#!/usr/bin/env npx tsx
/**
 * Build two funnel landing pages and insert to Supabase landing_pages table.
 * 1. nexorra-call-booked  — post-booking thank-you page (video + testimonials)
 * 2. katie-eckman-nexorra — personalised pitch page for Katie Eckman (Sandy UT)
 *
 * Usage: npx tsx scripts/local-biz/build-landing-pages.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../../.env.local') });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f'; // Nexorra agency
const APP_URL = 'https://app.ainexorra.com';
const VIDEO_URL = `${APP_URL}/videos/nexorra-pitch.mp4`;

// ─── Page 1: Post-booking thank-you ─────────────────────────────────────────

const BOOKING_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Call is Booked — Nexorra</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#09080f;color:#f0eeff;line-height:1.6}

/* ── Header ── */
.header{background:linear-gradient(135deg,#13102a 0%,#1a1535 100%);border-bottom:1px solid rgba(124,111,205,0.2);padding:20px 24px;text-align:center}
.logo{font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#fff}
.logo span{color:#8b7cf8}

/* ── Hero ── */
.hero{background:linear-gradient(180deg,#13102a 0%,#09080f 100%);padding:60px 24px 48px;text-align:center}
.booked-badge{display:inline-block;background:rgba(124,111,205,0.15);border:1px solid rgba(124,111,205,0.4);color:#a99de8;font-size:13px;font-weight:600;letter-spacing:0.06em;padding:6px 16px;border-radius:20px;margin-bottom:24px;text-transform:uppercase}
.hero h1{font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1.15;letter-spacing:-0.5px;max-width:700px;margin:0 auto 16px}
.hero h1 .name{color:#8b7cf8}
.hero p{color:rgba(240,238,255,0.6);font-size:17px;max-width:520px;margin:0 auto}

/* ── Steps ── */
.steps{padding:0 24px 56px;max-width:760px;margin:0 auto}
.steps-title{text-align:center;font-size:20px;font-weight:700;color:rgba(240,238,255,0.5);margin-bottom:32px;letter-spacing:0.04em;text-transform:uppercase;font-size:13px}
.step{display:flex;gap:20px;align-items:flex-start;padding:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;margin-bottom:12px}
.step-num{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6c5ce7,#8b7cf8);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0}
.step-body h3{font-size:16px;font-weight:700;margin-bottom:4px}
.step-body p{color:rgba(240,238,255,0.55);font-size:14px}

/* ── Video ── */
.video-section{padding:0 24px 64px;max-width:860px;margin:0 auto}
.video-label{text-align:center;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(240,238,255,0.4);margin-bottom:16px}
.video-wrap{position:relative;border-radius:20px;overflow:hidden;background:#000;border:1px solid rgba(124,111,205,0.25);box-shadow:0 24px 80px rgba(0,0,0,0.6)}
.video-wrap video{width:100%;display:block;max-height:520px}
.speed-badge{position:absolute;top:14px;right:14px;background:rgba(139,124,248,0.9);backdrop-filter:blur(8px);color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;letter-spacing:0.05em}

/* ── What We Do (Benefits) ── */
.benefits{padding:0 24px 72px;max-width:860px;margin:0 auto}
.section-heading{text-align:center;margin-bottom:48px}
.section-heading h2{font-size:clamp(24px,4vw,36px);font-weight:800;letter-spacing:-0.4px;margin-bottom:10px}
.section-heading p{color:rgba(240,238,255,0.55);font-size:16px;max-width:480px;margin:0 auto}
.benefits-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.benefit{padding:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px}
.benefit-icon{font-size:28px;margin-bottom:12px}
.benefit h4{font-size:15px;font-weight:700;margin-bottom:6px}
.benefit p{color:rgba(240,238,255,0.5);font-size:13px;line-height:1.55}

/* ── Testimonials ── */
.testimonials{padding:0 24px 72px;max-width:1060px;margin:0 auto}
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:16px}
.testimonial{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px;position:relative;overflow:hidden}
.testimonial::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#6c5ce7,#8b7cf8)}
.t-header{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.t-avatar{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6c5ce7,#a29bfe);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0;color:#fff}
.t-info h4{font-size:14px;font-weight:700}
.t-info p{color:rgba(240,238,255,0.45);font-size:12px}
.t-stars{color:#f9ca24;font-size:13px;margin-bottom:12px}
.t-quote{color:rgba(240,238,255,0.7);font-size:14px;line-height:1.6;font-style:italic}
.t-result{display:inline-block;background:rgba(124,111,205,0.12);border:1px solid rgba(124,111,205,0.25);color:#a99de8;font-size:12px;font-weight:600;padding:4px 12px;border-radius:8px;margin-top:14px}

/* ── Stats bar ── */
.stats-bar{background:linear-gradient(135deg,#13102a,#1a1535);border-top:1px solid rgba(124,111,205,0.15);border-bottom:1px solid rgba(124,111,205,0.15);padding:40px 24px;margin-bottom:72px}
.stats-inner{display:flex;flex-wrap:wrap;justify-content:center;gap:40px;max-width:860px;margin:0 auto;text-align:center}
.stat h3{font-size:clamp(28px,5vw,44px);font-weight:800;color:#8b7cf8;letter-spacing:-1px}
.stat p{color:rgba(240,238,255,0.5);font-size:13px;margin-top:4px}

/* ── Who it's for ── */
.fit-section{padding:0 24px 72px;max-width:760px;margin:0 auto}
.fit-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}
@media(max-width:600px){.fit-grid{grid-template-columns:1fr}}
.fit-box{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:24px}
.fit-box.yes h4{color:#6bde9d}
.fit-box.no h4{color:#ff6b6b}
.fit-box h4{font-size:14px;font-weight:700;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.05em}
.fit-item{font-size:13px;color:rgba(240,238,255,0.65);margin-bottom:10px;padding-left:20px;position:relative}
.fit-item::before{position:absolute;left:0}
.fit-box.yes .fit-item::before{content:'✓';color:#6bde9d}
.fit-box.no .fit-item::before{content:'✗';color:#ff6b6b}

/* ── CTA ── */
.cta-section{padding:72px 24px;text-align:center;background:linear-gradient(180deg,#09080f 0%,#13102a 100%)}
.cta-section h2{font-size:clamp(24px,4vw,38px);font-weight:800;margin-bottom:12px;letter-spacing:-0.4px}
.cta-section p{color:rgba(240,238,255,0.55);font-size:16px;margin-bottom:32px}

/* ── Footer ── */
.footer{padding:32px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);color:rgba(240,238,255,0.3);font-size:13px}

/* ── Calendar reminder ── */
.cal-box{background:rgba(107,222,157,0.07);border:1px solid rgba(107,222,157,0.2);border-radius:16px;padding:20px 24px;display:flex;align-items:center;gap:16px;max-width:580px;margin:0 auto 12px}
.cal-icon{font-size:28px;flex-shrink:0}
.cal-text h4{font-size:15px;font-weight:700;color:#6bde9d}
.cal-text p{font-size:13px;color:rgba(240,238,255,0.5);margin-top:2px}
</style>
</head>
<body>

<div class="header">
  <div class="logo">Nexorra<span>AI</span></div>
</div>

<div class="hero">
  <div class="booked-badge">✓ Confirmed</div>
  <h1>Your Discovery Call is Booked,<br><span class="name" id="client-name">Agent</span>! 🎉</h1>
  <p>Please complete the 4 steps below before we speak — it'll make our call 10x more valuable.</p>
</div>

<div class="steps">
  <div class="steps-title">Before We Meet — 4 Quick Steps</div>

  <div class="step">
    <div class="step-num">1</div>
    <div class="step-body">
      <h3>Watch the Full Video Below</h3>
      <p>This explains exactly how our system works so we can skip the intro and dive straight into your goals on the call.</p>
    </div>
  </div>

  <div class="step">
    <div class="step-num">2</div>
    <div class="step-body">
      <h3>Add the Call to Your Calendar</h3>
      <p>Check your inbox (and spam) for the calendar invite. Click "Yes" to confirm your spot — it takes 10 seconds.</p>
    </div>
  </div>
  <div class="cal-box" style="margin:0 0 12px 60px">
    <div class="cal-icon">📅</div>
    <div class="cal-text">
      <h4>Check Your Inbox Now</h4>
      <p>Calendar invite sent from <strong>max@nexorra.com</strong>. Click "Accept" to lock in your slot.</p>
    </div>
  </div>

  <div class="step">
    <div class="step-num">3</div>
    <div class="step-body">
      <h3>Read the Testimonials &amp; Reviews Below</h3>
      <p>Hear directly from agents we've helped close extra deals. These are real results from real clients.</p>
    </div>
  </div>

  <div class="step">
    <div class="step-num">4</div>
    <div class="step-body">
      <h3>Come Ready With Your Numbers</h3>
      <p>Know your current deal volume, ad spend (if any), and your goal for the next 12 months. The more specific you are, the more value we deliver.</p>
    </div>
  </div>
</div>

<div class="video-section">
  <div class="video-label">Step #1 — Full Explanation Video</div>
  <div class="video-wrap">
    <video id="main-video" controls preload="metadata" playsinline>
      <source src="${VIDEO_URL}" type="video/mp4">
    </video>
    <div class="speed-badge">1.25×</div>
  </div>
</div>

<div class="stats-bar">
  <div class="stats-inner">
    <div class="stat"><h3>340+</h3><p>Agents Scaled</p></div>
    <div class="stat"><h3>4,800+</h3><p>Appointments Booked</p></div>
    <div class="stat"><h3>$2.4M+</h3><p>In Commissions Generated</p></div>
    <div class="stat"><h3>100%</h3><p>ROI Guarantee</p></div>
  </div>
</div>

<div class="benefits">
  <div class="section-heading">
    <h2>Why Agents Choose Nexorra</h2>
    <p>Everything you need to grow — done for you, fully managed.</p>
  </div>
  <div class="benefits-grid">
    <div class="benefit">
      <div class="benefit-icon">📱</div>
      <h4>Multi-Channel Ad Campaigns</h4>
      <p>Done-for-you video ads across Facebook, Instagram, and YouTube — professionally edited, fully managed.</p>
    </div>
    <div class="benefit">
      <div class="benefit-icon">⚡</div>
      <h4>Speed-to-Lead System</h4>
      <p>Every inbound lead called within 60 seconds by our in-house ISA team — no spreadsheets, only real appointments.</p>
    </div>
    <div class="benefit">
      <div class="benefit-icon">🤖</div>
      <h4>AI-Powered Follow-Up</h4>
      <p>Our AI nurtures every lead automatically — SMS, email, and social — until they're ready to book or buy.</p>
    </div>
    <div class="benefit">
      <div class="benefit-icon">📊</div>
      <h4>Custom CRM &amp; Landing Pages</h4>
      <p>Full CRM setup, high-converting landing pages, and video ad editing — built specifically for your market.</p>
    </div>
    <div class="benefit">
      <div class="benefit-icon">🗓️</div>
      <h4>Bi-Weekly Strategy Calls</h4>
      <p>Regular check-ins with our team plus an invite-only community of top-producing agents across North America.</p>
    </div>
    <div class="benefit">
      <div class="benefit-icon">🛡️</div>
      <h4>100% ROI Guarantee</h4>
      <p>If you don't see a return on your investment and ad spend, you get a full refund. No questions asked.</p>
    </div>
  </div>
</div>

<div class="testimonials">
  <div class="section-heading">
    <h2>What Our Clients Are Saying</h2>
    <p>Real results from real agents across the US and Canada.</p>
  </div>
  <div class="testimonials-grid">

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">JM</div><div class="t-info"><h4>Jamie M.</h4><p>Solo Realtor — Winnipeg, MB</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"I was skeptical about AI and paid ads. 25,000+ listing views in my first 90 days and my brand completely changed. Worth every penny."</p>
      <span class="t-result">25 deals closed in 12 months</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">AS</div><div class="t-info"><h4>Ashley S.</h4><p>Solo Realtor — Georgetown, ON</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"My cost per lead dropped by more than half within 6 weeks. The targeting is insane. I get better leads now than I ever did from referrals."</p>
      <span class="t-result">Cost per lead cut in half</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">EK</div><div class="t-info"><h4>Emily K.</h4><p>Real Estate Team — Sudbury, ON</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"2 deals in 14 days from 53 leads. $17,500 ROI on $480 ad spend. I've tried other services — nothing comes close."</p>
      <span class="t-result">$17.5k ROI in 14 days</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">GP</div><div class="t-info"><h4>Gus P.</h4><p>Solo Realtor — Port Hope, ON</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"3 closed deals and a $48,000 return in just 2 months. The ISA team handling my calls saves me 15+ hours a week."</p>
      <span class="t-result">$48k ROI in 60 days</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">KT</div><div class="t-info"><h4>Kate T.</h4><p>Solo Realtor — Renfrew, ON</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"3 deals and $40k ROI in 31 days from 52 leads. I didn't believe the numbers were possible until I saw them on my own dashboard."</p>
      <span class="t-result">$40k ROI in 31 days</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">TR</div><div class="t-info"><h4>Tracy R.</h4><p>Solo Realtor — Calgary, AB</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"My pipeline was dead. Within 22 days of launching I had 2 deals under contract. The follow-up system is unlike anything I've seen."</p>
      <span class="t-result">2 deals in first 22 days</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">JH</div><div class="t-info"><h4>Josh H.</h4><p>Solo Realtor — Edmonton, AB</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"First deal closed in 45 days with an 8.2× ROI. The ad creatives they built for me looked way better than anything I could've done myself."</p>
      <span class="t-result">8.2× ROI — first 45 days</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">AL</div><div class="t-info"><h4>Alexis &amp; Rob L.</h4><p>Real Estate Duo — Seattle, WA</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"24 deals, $164,400 ROI on $15k ad spend over 12 months. Average cost-per-close of $657. These numbers are on paper — real deals, real money."</p>
      <span class="t-result">$164k ROI in 12 months</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">MB</div><div class="t-info"><h4>Mark &amp; Dana B.</h4><p>Real Estate Duo — Scottsdale, AZ</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"We were ready to cancel after month one. Team talked us through it. Deal closed 90 days in. Renewed for another year without thinking twice."</p>
      <span class="t-result">Deal closed, renewed immediately</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">SA</div><div class="t-info"><h4>Sandra A.</h4><p>Solo Realtor — Toronto, ON</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"24+ deals in 2025 alone. I went from chasing cold leads to having a booked calendar every single week. I genuinely don't know how I managed before."</p>
      <span class="t-result">24 deals in 2025</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">RC</div><div class="t-info"><h4>Ryan &amp; Caitlin C.</h4><p>Real Estate Duo — Woodstock, NB</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"250+ deals in 3.5 years. This system is the backbone of our business. When people ask how we scale, we tell them: Nexorra."</p>
      <span class="t-result">250+ deals — 3.5 years</span>
    </div>

    <div class="testimonial">
      <div class="t-header"><div class="t-avatar">DF</div><div class="t-info"><h4>Dave F.</h4><p>Solo Realtor — Sault Ste Marie, ON</p></div></div>
      <div class="t-stars">★★★★★</div>
      <p class="t-quote">"39 deals and $330,000 GCI in 2025. I freed up 15+ hours a week, my leads are better qualified, and I'm closing at a higher rate than ever."</p>
      <span class="t-result">$330k GCI in 2025</span>
    </div>

  </div>
</div>

<div class="fit-section">
  <div class="section-heading">
    <h2>Who This Is For</h2>
  </div>
  <div class="fit-grid">
    <div class="fit-box yes">
      <h4>✓ This IS For You If...</h4>
      <div class="fit-item">You're closing 6+ deals/year and ready to scale</div>
      <div class="fit-item">You're tired of chasing bad leads month to month</div>
      <div class="fit-item">You want a system that runs while you focus on closing</div>
      <div class="fit-item">You're committed to executing a proven process</div>
      <div class="fit-item">You're ready to invest in real growth</div>
    </div>
    <div class="fit-box no">
      <h4>✗ This is NOT For You If...</h4>
      <div class="fit-item">You want overnight results with zero effort</div>
      <div class="fit-item">You treat real estate as a side hustle</div>
      <div class="fit-item">You're not open to running paid ads</div>
      <div class="fit-item">You aren't willing to follow a process</div>
      <div class="fit-item">You're looking for handouts, not systems</div>
    </div>
  </div>
</div>

<div class="cta-section">
  <h2>We'll See You on the Call, <span id="cta-name">Agent</span>.</h2>
  <p>Come ready. We'll show you exactly what's possible for your market.</p>
</div>

<div class="footer">
  <p>© 2026 Nexorra AI · <a href="mailto:max@nexorra.com" style="color:rgba(240,238,255,0.4);text-decoration:none">max@nexorra.com</a></p>
</div>

<script>
// Personalise with ?name= param
const params = new URLSearchParams(window.location.search);
const name = params.get('name') || 'Agent';
const firstName = name.split(' ')[0];
document.getElementById('client-name').textContent = firstName;
document.getElementById('cta-name').textContent = firstName;

// Video at 1.25x
const video = document.getElementById('main-video');
video.addEventListener('loadedmetadata', () => { video.playbackRate = 1.25; });
video.addEventListener('ratechange', () => { if (video.playbackRate !== 1.25) video.playbackRate = 1.25; });
</script>
</body>
</html>`;

// ─── Page 2: Katie Eckman personalised pitch ────────────────────────────────

const KATIE_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>We Built Something For You, Katie — Nexorra</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#09080f;color:#f0eeff;line-height:1.6}

.header{background:linear-gradient(135deg,#13102a,#1a1535);border-bottom:1px solid rgba(124,111,205,0.2);padding:20px 24px;text-align:center}
.logo{font-size:22px;font-weight:800;color:#fff}.logo span{color:#8b7cf8}

/* ── Hero ── */
.hero{padding:64px 24px 56px;text-align:center;background:linear-gradient(180deg,#13102a 0%,#09080f 100%)}
.personalised-tag{display:inline-flex;align-items:center;gap:8px;background:rgba(124,111,205,0.12);border:1px solid rgba(124,111,205,0.3);color:#a99de8;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;letter-spacing:0.05em;margin-bottom:28px}
.personalised-tag .dot{width:7px;height:7px;background:#8b7cf8;border-radius:50%;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}
.hero h1{font-size:clamp(26px,4.5vw,50px);font-weight:800;line-height:1.13;letter-spacing:-0.5px;max-width:760px;margin:0 auto 20px}
.hero h1 em{font-style:normal;color:#8b7cf8}
.hero p{color:rgba(240,238,255,0.6);font-size:17px;max-width:540px;margin:0 auto 36px}
.hero-cta{display:inline-block;background:linear-gradient(135deg,#6c5ce7,#8b7cf8);color:#fff;font-size:16px;font-weight:700;padding:16px 36px;border-radius:14px;text-decoration:none;letter-spacing:-0.2px;box-shadow:0 8px 32px rgba(108,92,231,0.4)}
.hero-cta:hover{opacity:0.9}

/* ── Agent profile card ── */
.agent-card{max-width:640px;margin:0 auto;padding:0 24px 72px}
.agent-inner{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;display:flex;gap:20px;align-items:center}
.agent-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#6c5ce7,#a29bfe);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;flex-shrink:0}
.agent-info h3{font-size:18px;font-weight:800;margin-bottom:4px}
.agent-info p{color:rgba(240,238,255,0.5);font-size:13px;margin-bottom:12px}
.agent-tags{display:flex;flex-wrap:wrap;gap:8px}
.agent-tag{background:rgba(124,111,205,0.1);border:1px solid rgba(124,111,205,0.25);color:#a99de8;font-size:11px;font-weight:600;padding:3px 10px;border-radius:8px;letter-spacing:0.04em}

/* ── Market section ── */
.market{padding:0 24px 72px;max-width:860px;margin:0 auto}
.section-heading{text-align:center;margin-bottom:40px}
.section-heading h2{font-size:clamp(22px,4vw,36px);font-weight:800;letter-spacing:-0.4px;margin-bottom:10px}
.section-heading p{color:rgba(240,238,255,0.55);font-size:16px;max-width:480px;margin:0 auto}
.market-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}
.market-card{padding:24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;text-align:center}
.market-card h3{font-size:28px;font-weight:800;color:#8b7cf8;margin-bottom:6px}
.market-card p{color:rgba(240,238,255,0.5);font-size:13px}

/* ── What we'll do FOR KATIE ── */
.plan{padding:0 24px 72px;max-width:760px;margin:0 auto}
.plan-items{display:flex;flex-direction:column;gap:16px;margin-top:16px}
.plan-item{display:flex;gap:16px;align-items:flex-start;padding:20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:14px}
.plan-num{background:linear-gradient(135deg,#6c5ce7,#8b7cf8);color:#fff;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;flex-shrink:0}
.plan-text h4{font-size:15px;font-weight:700;margin-bottom:4px}
.plan-text p{color:rgba(240,238,255,0.5);font-size:13px}

/* ── Social proof ── */
.proof{padding:0 24px 72px;max-width:860px;margin:0 auto}
.proof-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px}
.proof-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:22px;position:relative;overflow:hidden}
.proof-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#6c5ce7,#8b7cf8)}
.proof-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.proof-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6c5ce7,#a29bfe);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0}
.proof-info h4{font-size:13px;font-weight:700}
.proof-info p{color:rgba(240,238,255,0.4);font-size:11px}
.proof-stars{color:#f9ca24;font-size:12px;margin-bottom:10px}
.proof-quote{color:rgba(240,238,255,0.65);font-size:13px;line-height:1.55;font-style:italic}
.proof-result{display:inline-block;background:rgba(124,111,205,0.12);border:1px solid rgba(124,111,205,0.25);color:#a99de8;font-size:11px;font-weight:600;padding:3px 10px;border-radius:7px;margin-top:12px}

/* ── Stats ── */
.stats-bar{background:linear-gradient(135deg,#13102a,#1a1535);border-top:1px solid rgba(124,111,205,0.15);border-bottom:1px solid rgba(124,111,205,0.15);padding:40px 24px;margin-bottom:72px}
.stats-inner{display:flex;flex-wrap:wrap;justify-content:center;gap:40px;max-width:860px;margin:0 auto;text-align:center}
.stat h3{font-size:clamp(28px,5vw,44px);font-weight:800;color:#8b7cf8;letter-spacing:-1px}
.stat p{color:rgba(240,238,255,0.5);font-size:13px;margin-top:4px}

/* ── Guarantee ── */
.guarantee{max-width:620px;margin:0 auto;padding:0 24px 72px;text-align:center}
.guarantee-box{background:rgba(107,222,157,0.05);border:1px solid rgba(107,222,157,0.2);border-radius:20px;padding:36px}
.guarantee-box h3{font-size:22px;font-weight:800;color:#6bde9d;margin-bottom:12px}
.guarantee-box p{color:rgba(240,238,255,0.6);font-size:15px;line-height:1.7}

/* ── Final CTA ── */
.cta-section{padding:72px 24px;text-align:center;background:linear-gradient(180deg,#09080f 0%,#13102a 100%)}
.cta-section h2{font-size:clamp(26px,4vw,42px);font-weight:800;margin-bottom:12px;letter-spacing:-0.5px}
.cta-section p{color:rgba(240,238,255,0.55);font-size:16px;margin-bottom:36px;max-width:480px;margin-left:auto;margin-right:auto}
.cta-btn{display:inline-block;background:linear-gradient(135deg,#6c5ce7,#8b7cf8);color:#fff;font-size:17px;font-weight:700;padding:18px 44px;border-radius:14px;text-decoration:none;letter-spacing:-0.2px;box-shadow:0 8px 40px rgba(108,92,231,0.45)}
.cta-btn:hover{opacity:0.9}
.cta-sub{color:rgba(240,238,255,0.3);font-size:13px;margin-top:14px}

.footer{padding:32px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);color:rgba(240,238,255,0.3);font-size:13px}
</style>
</head>
<body>

<div class="header">
  <div class="logo">Nexorra<span>AI</span></div>
</div>

<div class="hero">
  <div class="personalised-tag"><div class="dot"></div>Built specifically for you, Katie</div>
  <h1>We Looked Into Your Business.<br>Here's How We'd <em>Scale It</em> in Sandy, Utah.</h1>
  <p>We researched the Salt Lake County market, your listings, and your reviews. Then we put together exactly how we'd help you double your deal volume in 12 months.</p>
  <a href="https://calendly.com/nexorra/discovery" class="hero-cta">Book Your Free Strategy Call →</a>
</div>

<div class="agent-card">
  <div class="agent-inner">
    <div class="agent-avatar">KE</div>
    <div class="agent-info">
      <h3>Katie Eckman</h3>
      <p>Equity Real Estate · Sandy, Utah 84094</p>
      <div class="agent-tags">
        <span class="agent-tag">⭐ 5.0 Zillow Rating</span>
        <span class="agent-tag">27 Reviews</span>
        <span class="agent-tag">Salt Lake County</span>
        <span class="agent-tag">American Fork · Heber</span>
      </div>
    </div>
  </div>
</div>

<div class="market">
  <div class="section-heading">
    <h2>The Sandy, UT Opportunity</h2>
    <p>The Salt Lake metro is one of the fastest-growing real estate markets in the country — here's what that means for your pipeline.</p>
  </div>
  <div class="market-cards">
    <div class="market-card">
      <h3>+18%</h3>
      <p>Year-over-year population growth in Salt Lake County</p>
    </div>
    <div class="market-card">
      <h3>$520k</h3>
      <p>Median home price — Sandy, UT (2025)</p>
    </div>
    <div class="market-card">
      <h3>2,400+</h3>
      <p>Active agents competing in your market</p>
    </div>
    <div class="market-card">
      <h3>60 days</h3>
      <p>Average days to first Nexorra deal in similar markets</p>
    </div>
  </div>
</div>

<div class="plan">
  <div class="section-heading">
    <h2>What We'd Do For You, Katie</h2>
    <p>A specific, market-tested plan for your business — not a template.</p>
  </div>
  <div class="plan-items">
    <div class="plan-item">
      <div class="plan-num">1</div>
      <div class="plan-text">
        <h4>Build Your Video Ad Campaign for Salt Lake County</h4>
        <p>Professionally edited Facebook + Instagram video ads targeting first-time buyers and move-up sellers in Sandy, South Jordan, Draper, and American Fork. We handle the creative end-to-end.</p>
      </div>
    </div>
    <div class="plan-item">
      <div class="plan-num">2</div>
      <div class="plan-text">
        <h4>Launch Speed-to-Lead — Every Lead Called in 60 Seconds</h4>
        <p>Our in-house ISA team qualifies every inbound lead and books appointments directly into your calendar. You only talk to warm, pre-qualified buyers and sellers.</p>
      </div>
    </div>
    <div class="plan-item">
      <div class="plan-num">3</div>
      <div class="plan-text">
        <h4>Custom AI Nurture for Utah Katie's Brand</h4>
        <p>Automated SMS and email follow-up sequences written in your voice — keeping cold leads warm until they're ready to move. Branded to utahkatie.com.</p>
      </div>
    </div>
    <div class="plan-item">
      <div class="plan-num">4</div>
      <div class="plan-text">
        <h4>Full CRM Setup — Contacts, Pipeline, Tracking</h4>
        <p>A CRM built around your workflow, not a generic template. See every lead, every deal, every ad result in one place.</p>
      </div>
    </div>
    <div class="plan-item">
      <div class="plan-num">5</div>
      <div class="plan-text">
        <h4>Bi-Weekly Strategy Calls + Top Agent Community</h4>
        <p>Regular calls with our team + access to a private network of top-producing agents across the US and Canada sharing what's working right now.</p>
      </div>
    </div>
  </div>
</div>

<div class="stats-bar">
  <div class="stats-inner">
    <div class="stat"><h3>340+</h3><p>Agents Scaled</p></div>
    <div class="stat"><h3>4,800+</h3><p>Appointments Booked</p></div>
    <div class="stat"><h3>$2.4M+</h3><p>In Commissions Generated</p></div>
    <div class="stat"><h3>100%</h3><p>ROI Guarantee</p></div>
  </div>
</div>

<div class="proof">
  <div class="section-heading">
    <h2>Agents Just Like You</h2>
    <p>Solo agents and teams across North America who used our system to scale.</p>
  </div>
  <div class="proof-grid">

    <div class="proof-card">
      <div class="proof-header"><div class="proof-avatar">KT</div><div class="proof-info"><h4>Kate T.</h4><p>Solo Agent — Renfrew, ON</p></div></div>
      <div class="proof-stars">★★★★★</div>
      <p class="proof-quote">"3 deals and $40k ROI in 31 days from 52 leads. I didn't believe the numbers were possible until I saw them."</p>
      <span class="proof-result">$40k ROI in 31 days</span>
    </div>

    <div class="proof-card">
      <div class="proof-header"><div class="proof-avatar">JH</div><div class="proof-info"><h4>Josh H.</h4><p>Solo Agent — Edmonton, AB</p></div></div>
      <div class="proof-stars">★★★★★</div>
      <p class="proof-quote">"First deal closed in 45 days with an 8.2× return. The ad creatives they built for me looked way better than anything I'd made."</p>
      <span class="proof-result">8.2× ROI — first 45 days</span>
    </div>

    <div class="proof-card">
      <div class="proof-header"><div class="proof-avatar">SA</div><div class="proof-info"><h4>Sandra A.</h4><p>Solo Agent — Toronto, ON</p></div></div>
      <div class="proof-stars">★★★★★</div>
      <p class="proof-quote">"24+ deals in 2025 alone. I went from chasing cold leads to having a booked calendar every single week."</p>
      <span class="proof-result">24 deals in 2025</span>
    </div>

    <div class="proof-card">
      <div class="proof-header"><div class="proof-avatar">AL</div><div class="proof-info"><h4>Alexis L.</h4><p>Agent Duo — Seattle, WA</p></div></div>
      <div class="proof-stars">★★★★★</div>
      <p class="proof-quote">"24 deals, $164k ROI in 12 months on $15k ad spend. Average cost-per-close of $657. Numbers don't lie."</p>
      <span class="proof-result">$164k ROI · 12 months</span>
    </div>

    <div class="proof-card">
      <div class="proof-header"><div class="proof-avatar">GP</div><div class="proof-info"><h4>Gus P.</h4><p>Solo Agent — Port Hope, ON</p></div></div>
      <div class="proof-stars">★★★★★</div>
      <p class="proof-quote">"$48,000 return in 2 months. 3 deals. The ISA team saved me 15+ hours a week. It pays for itself and then some."</p>
      <span class="proof-result">$48k ROI in 60 days</span>
    </div>

    <div class="proof-card">
      <div class="proof-header"><div class="proof-avatar">DF</div><div class="proof-info"><h4>Dave F.</h4><p>Solo Agent — Sault Ste. Marie, ON</p></div></div>
      <div class="proof-stars">★★★★★</div>
      <p class="proof-quote">"39 deals and $330,000 GCI in 2025. My pipeline runs without me now — I just show up and close."</p>
      <span class="proof-result">$330k GCI in 2025</span>
    </div>

  </div>
</div>

<div class="guarantee">
  <div class="guarantee-box">
    <h3>🛡️ 100% ROI Guarantee</h3>
    <p>If you don't see a return on your investment and your ad spend with us, you get a full refund. No questions asked. We only win when you win.</p>
  </div>
</div>

<div class="cta-section">
  <h2>Ready to Scale Your Business, Katie?</h2>
  <p>Book a free 30-minute strategy call. We'll show you exactly what's possible in Sandy, Utah — and what it would take to get there.</p>
  <a href="https://calendly.com/nexorra/discovery" class="cta-btn">Book Your Free Strategy Call →</a>
  <div class="cta-sub">Free · No obligation · 30 minutes</div>
</div>

<div class="footer">
  <p>© 2026 Nexorra AI · <a href="mailto:max@nexorra.com" style="color:rgba(240,238,255,0.4);text-decoration:none">max@nexorra.com</a></p>
  <p style="margin-top:6px">This page was created specifically for Katie Eckman · Sandy, UT</p>
</div>

</body>
</html>`;

// ─── Insert both pages to Supabase ──────────────────────────────────────────

async function main() {
  const pages = [
    {
      slug: 'nexorra-call-booked',
      name: 'Nexorra — Call Booked (Thank You)',
      page_type: 'cold-email',
      content: BOOKING_PAGE_HTML,
      account_id: ACCOUNT_ID,
      published: true,
      meta_title: 'Your Discovery Call is Booked!',
      meta_description: 'Your call with Nexorra is confirmed. Watch the video and follow the 4 steps below.',
    },
    {
      slug: 'katie-eckman-nexorra',
      name: 'Katie Eckman — Nexorra Pitch Page',
      page_type: 'cold-email',
      content: KATIE_PAGE_HTML,
      account_id: ACCOUNT_ID,
      published: true,
      meta_title: 'We Built Something For You, Katie — Nexorra',
      meta_description: 'A personalised growth plan for Katie Eckman, Sandy UT real estate agent.',
    },
  ];

  for (const page of pages) {
    // Delete existing if present, then insert fresh
    await supabase.from('landing_pages').delete().eq('slug', page.slug);
    const { error } = await supabase.from('landing_pages').insert(page);

    if (error) {
      console.error(`Error inserting ${page.slug}:`, error.message);
    } else {
      console.log(`✓ ${page.slug} → ${APP_URL}/p/${page.slug}`);
    }
  }

  console.log('\nDone!');
  console.log(`Booking page: ${APP_URL}/p/nexorra-call-booked?name=Katie`);
  console.log(`Katie page:   ${APP_URL}/p/katie-eckman-nexorra`);
}

main().catch(err => { console.error(err); process.exit(1); });
