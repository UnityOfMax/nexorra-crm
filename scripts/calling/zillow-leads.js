#!/usr/bin/env node
// Zillow calling lead scraper for Jeff.
// Single persistent puppeteer connection — avoids PX re-detection from reconnects.
// Uses --stealth mode on Chrome to suppress automation signals.
// Includes both individual and team agents with 12+ deals last 12 months.
// Starts at page 2 to skip mega-team page 1.
//
// Usage: node scripts/calling/zillow-leads.js
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const puppeteer = require('/home/max/crm/node_modules/puppeteer-core');
const https = require('https');
const fs = require('fs');
const { spawnSync } = require('child_process');

const PORT = 9222;
const TARGET = parseInt(process.env.TARGET_LEADS || '1000');
const START_PAGE = 2;
const MIN_DEALS = 12;
const LOG_FILE = '/home/max/crm/logs/zillow-leads.log';
const CITY_PAGE_STATE = '/home/max/crm/agents/state/zillow-city-pages.json';
const PAGE_DELAY = 4000;     // 4s between listing pages
const PROFILE_DELAY = 1500;  // 1.5s between profile visits

// Cities grouped by timezone — ~250 leads per TZ per run, 5 biggest per state
const TZ_CITIES = {
  EST: [
    // New York
    ['new-york-ny',          'New York',        'NY', 'EST', 'US'],
    ['buffalo-ny',           'Buffalo',         'NY', 'EST', 'US'],
    ['rochester-ny',         'Rochester',       'NY', 'EST', 'US'],
    ['yonkers-ny',           'Yonkers',         'NY', 'EST', 'US'],
    ['syracuse-ny',          'Syracuse',        'NY', 'EST', 'US'],
    // Florida
    ['jacksonville-fl',      'Jacksonville',    'FL', 'EST', 'US'],
    ['miami-fl',             'Miami',           'FL', 'EST', 'US'],
    ['tampa-fl',             'Tampa',           'FL', 'EST', 'US'],
    ['orlando-fl',           'Orlando',         'FL', 'EST', 'US'],
    ['st-petersburg-fl',     'St. Petersburg',  'FL', 'EST', 'US'],
    // Georgia
    ['atlanta-ga',           'Atlanta',         'GA', 'EST', 'US'],
    ['augusta-ga',           'Augusta',         'GA', 'EST', 'US'],
    ['columbus-ga',          'Columbus',        'GA', 'EST', 'US'],
    ['savannah-ga',          'Savannah',        'GA', 'EST', 'US'],
    ['athens-ga',            'Athens',          'GA', 'EST', 'US'],
    // North Carolina
    ['charlotte-nc',         'Charlotte',       'NC', 'EST', 'US'],
    ['raleigh-nc',           'Raleigh',         'NC', 'EST', 'US'],
    ['greensboro-nc',        'Greensboro',      'NC', 'EST', 'US'],
    ['durham-nc',            'Durham',          'NC', 'EST', 'US'],
    ['winston-salem-nc',     'Winston-Salem',   'NC', 'EST', 'US'],
    // Pennsylvania
    ['philadelphia-pa',      'Philadelphia',    'PA', 'EST', 'US'],
    ['pittsburgh-pa',        'Pittsburgh',      'PA', 'EST', 'US'],
    ['allentown-pa',         'Allentown',       'PA', 'EST', 'US'],
    ['erie-pa',              'Erie',            'PA', 'EST', 'US'],
    ['reading-pa',           'Reading',         'PA', 'EST', 'US'],
    // Virginia
    ['virginia-beach-va',    'Virginia Beach',  'VA', 'EST', 'US'],
    ['norfolk-va',           'Norfolk',         'VA', 'EST', 'US'],
    ['chesapeake-va',        'Chesapeake',      'VA', 'EST', 'US'],
    ['richmond-va',          'Richmond',        'VA', 'EST', 'US'],
    ['newport-news-va',      'Newport News',    'VA', 'EST', 'US'],
    // Ohio
    ['columbus-oh',          'Columbus',        'OH', 'EST', 'US'],
    ['cleveland-oh',         'Cleveland',       'OH', 'EST', 'US'],
    ['cincinnati-oh',        'Cincinnati',      'OH', 'EST', 'US'],
    ['toledo-oh',            'Toledo',          'OH', 'EST', 'US'],
    ['akron-oh',             'Akron',           'OH', 'EST', 'US'],
    // Massachusetts
    ['boston-ma',            'Boston',          'MA', 'EST', 'US'],
    ['worcester-ma',         'Worcester',       'MA', 'EST', 'US'],
    ['springfield-ma',       'Springfield',     'MA', 'EST', 'US'],
    ['lowell-ma',            'Lowell',          'MA', 'EST', 'US'],
    ['cambridge-ma',         'Cambridge',       'MA', 'EST', 'US'],
    // New Jersey
    ['newark-nj',            'Newark',          'NJ', 'EST', 'US'],
    ['jersey-city-nj',       'Jersey City',     'NJ', 'EST', 'US'],
    ['paterson-nj',          'Paterson',        'NJ', 'EST', 'US'],
    ['elizabeth-nj',         'Elizabeth',       'NJ', 'EST', 'US'],
    ['trenton-nj',           'Trenton',         'NJ', 'EST', 'US'],
    // Michigan
    ['detroit-mi',           'Detroit',         'MI', 'EST', 'US'],
    ['grand-rapids-mi',      'Grand Rapids',    'MI', 'EST', 'US'],
    ['warren-mi',            'Warren',          'MI', 'EST', 'US'],
    ['sterling-heights-mi',  'Sterling Heights','MI', 'EST', 'US'],
    ['ann-arbor-mi',         'Ann Arbor',       'MI', 'EST', 'US'],
    // Maryland + DC
    ['baltimore-md',         'Baltimore',       'MD', 'EST', 'US'],
    ['washington-dc',        'Washington',      'DC', 'EST', 'US'],
    ['frederick-md',         'Frederick',       'MD', 'EST', 'US'],
    ['rockville-md',         'Rockville',       'MD', 'EST', 'US'],
    ['gaithersburg-md',      'Gaithersburg',    'MD', 'EST', 'US'],
    // South Carolina
    ['columbia-sc',          'Columbia',        'SC', 'EST', 'US'],
    ['charleston-sc',        'Charleston',      'SC', 'EST', 'US'],
    ['north-charleston-sc',  'North Charleston','SC', 'EST', 'US'],
    ['mount-pleasant-sc',    'Mount Pleasant',  'SC', 'EST', 'US'],
    ['rock-hill-sc',         'Rock Hill',       'SC', 'EST', 'US'],
  ],
  CST: [
    // Texas
    ['houston-tx',           'Houston',         'TX', 'CST', 'US'],
    ['san-antonio-tx',       'San Antonio',     'TX', 'CST', 'US'],
    ['dallas-tx',            'Dallas',          'TX', 'CST', 'US'],
    ['austin-tx',            'Austin',          'TX', 'CST', 'US'],
    ['fort-worth-tx',        'Fort Worth',      'TX', 'CST', 'US'],
    // Illinois
    ['chicago-il',           'Chicago',         'IL', 'CST', 'US'],
    ['aurora-il',            'Aurora',          'IL', 'CST', 'US'],
    ['joliet-il',            'Joliet',          'IL', 'CST', 'US'],
    ['naperville-il',        'Naperville',      'IL', 'CST', 'US'],
    ['rockford-il',          'Rockford',        'IL', 'CST', 'US'],
    // Tennessee
    ['nashville-tn',         'Nashville',       'TN', 'CST', 'US'],
    ['memphis-tn',           'Memphis',         'TN', 'CST', 'US'],
    ['knoxville-tn',         'Knoxville',       'TN', 'CST', 'US'],
    ['chattanooga-tn',       'Chattanooga',     'TN', 'CST', 'US'],
    ['clarksville-tn',       'Clarksville',     'TN', 'CST', 'US'],
    // Minnesota
    ['minneapolis-mn',       'Minneapolis',     'MN', 'CST', 'US'],
    ['saint-paul-mn',        'Saint Paul',      'MN', 'CST', 'US'],
    ['rochester-mn',         'Rochester',       'MN', 'CST', 'US'],
    ['duluth-mn',            'Duluth',          'MN', 'CST', 'US'],
    ['bloomington-mn',       'Bloomington',     'MN', 'CST', 'US'],
    // Missouri
    ['kansas-city-mo',       'Kansas City',     'MO', 'CST', 'US'],
    ['st-louis-mo',          'St. Louis',       'MO', 'CST', 'US'],
    ['springfield-mo',       'Springfield',     'MO', 'CST', 'US'],
    ['columbia-mo',          'Columbia',        'MO', 'CST', 'US'],
    ['independence-mo',      'Independence',    'MO', 'CST', 'US'],
    // Wisconsin
    ['milwaukee-wi',         'Milwaukee',       'WI', 'CST', 'US'],
    ['madison-wi',           'Madison',         'WI', 'CST', 'US'],
    ['green-bay-wi',         'Green Bay',       'WI', 'CST', 'US'],
    ['kenosha-wi',           'Kenosha',         'WI', 'CST', 'US'],
    ['racine-wi',            'Racine',          'WI', 'CST', 'US'],
    // Louisiana
    ['new-orleans-la',       'New Orleans',     'LA', 'CST', 'US'],
    ['baton-rouge-la',       'Baton Rouge',     'LA', 'CST', 'US'],
    ['shreveport-la',        'Shreveport',      'LA', 'CST', 'US'],
    ['lafayette-la',         'Lafayette',       'LA', 'CST', 'US'],
    ['lake-charles-la',      'Lake Charles',    'LA', 'CST', 'US'],
    // Oklahoma
    ['oklahoma-city-ok',     'Oklahoma City',   'OK', 'CST', 'US'],
    ['tulsa-ok',             'Tulsa',           'OK', 'CST', 'US'],
    ['norman-ok',            'Norman',          'OK', 'CST', 'US'],
    ['broken-arrow-ok',      'Broken Arrow',    'OK', 'CST', 'US'],
    ['lawton-ok',            'Lawton',          'OK', 'CST', 'US'],
    // Alabama
    ['birmingham-al',        'Birmingham',      'AL', 'CST', 'US'],
    ['montgomery-al',        'Montgomery',      'AL', 'CST', 'US'],
    ['huntsville-al',        'Huntsville',      'AL', 'CST', 'US'],
    ['mobile-al',            'Mobile',          'AL', 'CST', 'US'],
    ['tuscaloosa-al',        'Tuscaloosa',      'AL', 'CST', 'US'],
    // Arkansas
    ['little-rock-ar',       'Little Rock',     'AR', 'CST', 'US'],
    ['fort-smith-ar',        'Fort Smith',      'AR', 'CST', 'US'],
    ['fayetteville-ar',      'Fayetteville',    'AR', 'CST', 'US'],
    ['springdale-ar',        'Springdale',      'AR', 'CST', 'US'],
    ['jonesboro-ar',         'Jonesboro',       'AR', 'CST', 'US'],
    // Iowa
    ['des-moines-ia',        'Des Moines',      'IA', 'CST', 'US'],
    ['cedar-rapids-ia',      'Cedar Rapids',    'IA', 'CST', 'US'],
    ['davenport-ia',         'Davenport',       'IA', 'CST', 'US'],
    ['sioux-city-ia',        'Sioux City',      'IA', 'CST', 'US'],
    ['iowa-city-ia',         'Iowa City',       'IA', 'CST', 'US'],
  ],
  MST: [
    // Arizona
    ['phoenix-az',           'Phoenix',         'AZ', 'MST', 'US'],
    ['tucson-az',            'Tucson',          'AZ', 'MST', 'US'],
    ['mesa-az',              'Mesa',            'AZ', 'MST', 'US'],
    ['chandler-az',          'Chandler',        'AZ', 'MST', 'US'],
    ['scottsdale-az',        'Scottsdale',      'AZ', 'MST', 'US'],
    // Colorado
    ['denver-co',            'Denver',          'CO', 'MST', 'US'],
    ['colorado-springs-co',  'Colorado Springs','CO', 'MST', 'US'],
    ['aurora-co',            'Aurora',          'CO', 'MST', 'US'],
    ['fort-collins-co',      'Fort Collins',    'CO', 'MST', 'US'],
    ['lakewood-co',          'Lakewood',        'CO', 'MST', 'US'],
    // New Mexico
    ['albuquerque-nm',       'Albuquerque',     'NM', 'MST', 'US'],
    ['las-cruces-nm',        'Las Cruces',      'NM', 'MST', 'US'],
    ['rio-rancho-nm',        'Rio Rancho',      'NM', 'MST', 'US'],
    ['santa-fe-nm',          'Santa Fe',        'NM', 'MST', 'US'],
    ['roswell-nm',           'Roswell',         'NM', 'MST', 'US'],
    // Utah
    ['salt-lake-city-ut',    'Salt Lake City',  'UT', 'MST', 'US'],
    ['west-valley-city-ut',  'West Valley City','UT', 'MST', 'US'],
    ['provo-ut',             'Provo',           'UT', 'MST', 'US'],
    ['west-jordan-ut',       'West Jordan',     'UT', 'MST', 'US'],
    ['orem-ut',              'Orem',            'UT', 'MST', 'US'],
    // Idaho
    ['boise-id',             'Boise',           'ID', 'MST', 'US'],
    ['nampa-id',             'Nampa',           'ID', 'MST', 'US'],
    ['meridian-id',          'Meridian',        'ID', 'MST', 'US'],
    ['idaho-falls-id',       'Idaho Falls',     'ID', 'MST', 'US'],
    ['pocatello-id',         'Pocatello',       'ID', 'MST', 'US'],
    // Montana
    ['billings-mt',          'Billings',        'MT', 'MST', 'US'],
    ['missoula-mt',          'Missoula',        'MT', 'MST', 'US'],
    ['great-falls-mt',       'Great Falls',     'MT', 'MST', 'US'],
    ['bozeman-mt',           'Bozeman',         'MT', 'MST', 'US'],
    ['butte-mt',             'Butte',           'MT', 'MST', 'US'],
    // Wyoming
    ['cheyenne-wy',          'Cheyenne',        'WY', 'MST', 'US'],
    ['casper-wy',            'Casper',          'WY', 'MST', 'US'],
    ['laramie-wy',           'Laramie',         'WY', 'MST', 'US'],
    ['gillette-wy',          'Gillette',        'WY', 'MST', 'US'],
    ['rock-springs-wy',      'Rock Springs',    'WY', 'MST', 'US'],
  ],
  PST: [
    // California
    ['los-angeles-ca',       'Los Angeles',     'CA', 'PST', 'US'],
    ['san-diego-ca',         'San Diego',       'CA', 'PST', 'US'],
    ['san-jose-ca',          'San Jose',        'CA', 'PST', 'US'],
    ['san-francisco-ca',     'San Francisco',   'CA', 'PST', 'US'],
    ['fresno-ca',            'Fresno',          'CA', 'PST', 'US'],
    // Washington
    ['seattle-wa',           'Seattle',         'WA', 'PST', 'US'],
    ['spokane-wa',           'Spokane',         'WA', 'PST', 'US'],
    ['tacoma-wa',            'Tacoma',          'WA', 'PST', 'US'],
    ['vancouver-wa',         'Vancouver',       'WA', 'PST', 'US'],
    ['bellevue-wa',          'Bellevue',        'WA', 'PST', 'US'],
    // Oregon
    ['portland-or',          'Portland',        'OR', 'PST', 'US'],
    ['salem-or',             'Salem',           'OR', 'PST', 'US'],
    ['eugene-or',            'Eugene',          'OR', 'PST', 'US'],
    ['gresham-or',           'Gresham',         'OR', 'PST', 'US'],
    ['hillsboro-or',         'Hillsboro',       'OR', 'PST', 'US'],
    // Nevada
    ['las-vegas-nv',         'Las Vegas',       'NV', 'PST', 'US'],
    ['henderson-nv',         'Henderson',       'NV', 'PST', 'US'],
    ['reno-nv',              'Reno',            'NV', 'PST', 'US'],
    ['north-las-vegas-nv',   'North Las Vegas', 'NV', 'PST', 'US'],
    ['sparks-nv',            'Sparks',          'NV', 'PST', 'US'],
    // More California
    ['sacramento-ca',        'Sacramento',      'CA', 'PST', 'US'],
    ['long-beach-ca',        'Long Beach',      'CA', 'PST', 'US'],
    ['oakland-ca',           'Oakland',         'CA', 'PST', 'US'],
    ['bakersfield-ca',       'Bakersfield',     'CA', 'PST', 'US'],
    ['anaheim-ca',           'Anaheim',         'CA', 'PST', 'US'],
  ],
};
const TZ_TARGET = Math.ceil(TARGET / Object.keys(TZ_CITIES).length); // ~250 each

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  // Note: when launched via cron with >> redirect, console.log already goes to the log file.
  // appendFileSync would double-write, so we skip it here.
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Persist the last successfully scraped page per city slug so restarts resume
// from the next unseen page rather than starting at page 2 every time.
function loadCityPageState() {
  try { return JSON.parse(fs.readFileSync(CITY_PAGE_STATE, 'utf8')); } catch { return {}; }
}
function saveCityPage(state, citySlug, pageNum) {
  state[citySlug] = pageNum;
  try { fs.writeFileSync(CITY_PAGE_STATE, JSON.stringify(state, null, 2)); } catch {}
}

function formatPhone(raw) {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return null;
}

async function restartChrome() {
  log('[Chrome] Restarting for fresh session...');
  spawnSync('pkill', ['-9', '-f', 'remote-debugging-port=9222'], { timeout: 5000 });
  await sleep(3000);
  spawnSync('bash', ['/home/max/crm/scripts/chrome-launch.sh'], { timeout: 45000, encoding: 'utf8' });
  await sleep(6000);
  log('[Chrome] Restarted');
}

// Send a Telegram alert with an optional screenshot attachment.
// Used to escalate CAPTCHA failures to Max for manual resolution.
async function sendTelegramAlert(message, screenshotPath) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = '5880638817';
  if (!botToken) { log('[Telegram] No TELEGRAM_BOT_TOKEN — cannot send alert'); return; }

  // Send text message
  const textBody = JSON.stringify({ chat_id: chatId, text: message });
  await new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.telegram.org', path: `/bot${botToken}/sendMessage`,
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(textBody) },
    }, (r) => { r.resume(); resolve(); });
    req.on('error', resolve);
    req.write(textBody);
    req.end();
  }).catch(() => {});

  // Attach screenshot via curl (multipart is painful with raw https)
  if (screenshotPath && fs.existsSync(screenshotPath)) {
    spawnSync('bash', ['-c',
      `curl -s -F chat_id=${chatId} -F photo=@"${screenshotPath}" ` +
      `"https://api.telegram.org/bot${botToken}/sendPhoto" > /dev/null 2>&1`
    ], { timeout: 20000 });
    log(`[Telegram] Screenshot sent: ${screenshotPath}`);
  }
}

// Find the main Chrome browser window on a given display (largest window by width — skips utility windows)
function findMainChromeWindow(display) {
  const r = spawnSync('bash', ['-c',
    `DISPLAY=${display} xdotool search --class "google-chrome" 2>/dev/null | while read w; do
      geom=$(DISPLAY=${display} xdotool getwindowgeometry --shell "$w" 2>/dev/null)
      wd=$(echo "$geom" | grep ^WIDTH= | cut -d= -f2)
      ht=$(echo "$geom" | grep ^HEIGHT= | cut -d= -f2)
      [ -n "$wd" ] && [ "$wd" -gt 200 ] && echo "$wd $ht $w"
    done | sort -rn | head -1 | awk '{print $3}'`
  ], { encoding: 'utf8', timeout: 5000 });
  return r.stdout.trim();
}

// Detect which X11 display Chrome is running on (:0 real display preferred, :99 Xvfb fallback)
function detectChromeDisplay() {
  for (const disp of [':0', ':99']) {
    const win = findMainChromeWindow(disp);
    if (win) return disp;
  }
  return ':0';
}

// Solve the "Press & Hold" challenge using real X11 mouse events via xdotool.
// CDP mouse events have isTrusted:false which PX detects and rejects.
// xdotool injects at the OS/XTEST level → isTrusted:true → PX accepts the hold.
//
// Strategy:
//   1 attempt: find main Chrome window (not utility windows) → window-relative coords → hold with jitter
//   If no progress in 15s: alert Max via Telegram, wait up to 5 min for manual solve
async function solveCaptcha(page, attempt = 1) {
  const title = await page.title().catch(() => '');
  if (!title.toLowerCase().includes('denied') && !title.toLowerCase().includes('access')) return true;

  const screenshotPath = `/tmp/captcha-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath }).catch(() => {});
  log(`  [CAPTCHA] Detected (attempt ${attempt}) — screenshot: ${screenshotPath}`);

  // After xdotool attempt fails, alert Max and wait up to 5 min for manual solve
  if (attempt > 1) {
    log('  [CAPTCHA] xdotool failed — alerting Max, waiting for manual resolution...');
    await sendTelegramAlert(
      `⚠️ Jeff CAPTCHA on Zillow — please solve it in the Chrome window on your screen. Waiting up to 5 min.`,
      screenshotPath
    );
    for (let w = 0; w < 60; w++) {
      await sleep(5000);
      const t = await page.title().catch(() => '');
      if (!t.toLowerCase().includes('denied') && !t.toLowerCase().includes('access')) {
        log('  [CAPTCHA] Resolved!');
        return true;
      }
    }
    log('  [CAPTCHA] 5min timeout — restarting Chrome');
    return false;
  }

  await sleep(2500); // wait for PX challenge to fully render

  // Get viewport dimensions for button position calculation
  const vpSize = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight })).catch(() => null);

  // Try DOM detection first (works when PX challenge is in the main frame)
  let relX = vpSize ? Math.round(vpSize.w / 2) : 935;
  let relY = vpSize ? Math.round(vpSize.h * 0.55) : 528; // ~55% height = PX button position
  let buttonFound = false;
  try {
    const btnCoords = await page.evaluate(() => {
      const btn = document.querySelector('button') || document.querySelector('[role="button"]');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return null;
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }).catch(() => null);
    if (btnCoords) {
      relX = btnCoords.x;
      relY = btnCoords.y;
      buttonFound = true;
      log(`  [CAPTCHA] Button found in DOM at viewport (${relX}, ${relY})`);
    }
  } catch {}

  if (!buttonFound) {
    log(`  [CAPTCHA] DOM detection failed — using fallback (${relX}, ${relY}) for ${vpSize ? `${vpSize.w}x${vpSize.h}` : 'unknown'} viewport`);
  }

  // Find the MAIN Chrome browser window (largest by width — avoids 10×10 utility windows)
  const chromeDisplay = detectChromeDisplay();
  const chromeWin = findMainChromeWindow(chromeDisplay);

  if (!chromeWin) {
    log('  [CAPTCHA] Could not find main Chrome window — escalating');
    return solveCaptcha(page, 2);
  }

  // Get actual window geometry to calculate toolbar height dynamically
  // toolbarH = windowHeight - viewportHeight (avoids hardcoded 79px assumption)
  const geom = spawnSync('bash', ['-c',
    `DISPLAY=${chromeDisplay} xdotool getwindowgeometry --shell ${chromeWin} 2>/dev/null`
  ], { encoding: 'utf8', timeout: 3000 }).stdout;
  const winH = parseInt((geom.match(/^HEIGHT=(\d+)/m) || [])[1] || '0');
  const toolbarH = (vpSize && winH > 0) ? Math.max(60, winH - vpSize.h) : 87;

  // Window-relative button position: xdotool uses top-left of the window as origin
  const winRelX = relX;                // viewport x = window x (no left chrome)
  const winRelY = relY + toolbarH;     // viewport y + toolbar = window y

  log(`  [CAPTCHA] WIN=${chromeWin} toolbarH=${toolbarH} → window-relative (${winRelX}, ${winRelY})`);

  // Activate + focus main Chrome window, then do all xdotool ops in one chained command
  spawnSync('bash', ['-c',
    `DISPLAY=${chromeDisplay} xdotool windowactivate --sync ${chromeWin} windowfocus --sync ${chromeWin}`
  ], { timeout: 3000 });
  await sleep(500);

  // Move to button and start hold — all in one atomic xdotool chain
  spawnSync('bash', ['-c',
    `DISPLAY=${chromeDisplay} xdotool mousemove --window ${chromeWin} ${winRelX} ${winRelY} sleep 0.4 mousedown 1`
  ], { timeout: 5000 });

  log(`  [CAPTCHA] Hold started — polling every second, jitter every 2s, max 15s...`);

  let solved = false;
  for (let sec = 0; sec < 15; sec++) {
    await sleep(1000);
    const t = await page.title().catch(() => '');
    if (!t.toLowerCase().includes('denied') && !t.toLowerCase().includes('access')) {
      solved = true;
      break;
    }
    // Micro-jitter every 2s: ±1-2px movement simulates natural human hand tremor
    if (sec % 2 === 1) {
      const jx = winRelX + (Math.random() > 0.5 ? 1 : -1);
      const jy = winRelY + (Math.random() > 0.5 ? 1 : -1);
      spawnSync('bash', ['-c',
        `DISPLAY=${chromeDisplay} xdotool mousemove --window ${chromeWin} ${jx} ${jy} sleep 0.1 mousemove --window ${chromeWin} ${winRelX} ${winRelY}`
      ], { timeout: 2000 });
    }
    if (sec % 5 === 4) {
      await page.screenshot({ path: `/tmp/captcha-hold-${Date.now()}.png` }).catch(() => {});
      log(`  [CAPTCHA] Still holding... (${sec + 1}s)`);
    }
  }

  spawnSync('bash', ['-c', `DISPLAY=${chromeDisplay} xdotool mouseup 1`], { timeout: 3000 });

  if (solved) {
    log('  [CAPTCHA] Solved!');
    return true;
  }

  log('  [CAPTCHA] 15s hold failed — escalating to Max...');
  return solveCaptcha(page, attempt + 1);
}

async function gotoWithCaptcha(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  } catch {
    log(`  [goto] Timeout — ${url.slice(0, 60)}`);
    return false;
  }
  await sleep(2000);
  return solveCaptcha(page);
}

function parseAgentsFromText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match both individual ("X sales") and team ("X team sales") last 12 months
    const m = line.match(/^(\d+)\s+(?:team\s+)?sales last 12 months$/);
    const noSales = line === 'No sales last 12 months' || line === 'No team sales last 12 months';
    if (!m && !noSales) continue;
    const count = m ? parseInt(m[1]) : 0;
    let name = '';
    for (let back = 1; back <= 8; back++) {
      const c = lines[i - back];
      if (!c) continue;
      if (c.startsWith('$') || c.startsWith('(') || c.match(/^\d/) ||
          ['TEAM', 'View details', 'Contact Now', 'Ask a question', '🔥 Fast Responder'].includes(c) ||
          c.includes('price range') || c.includes('sales') || c.includes('reviews') ||
          c.includes('Experience') || c.includes('Transactions')) continue;
      name = c;
      break;
    }
    entries.push({ name, count });
  }
  return entries;
}

async function getProfileUrlsFromPage(page) {
  return page.evaluate(() => {
    const seen = new Set();
    const result = [];
    document.querySelectorAll('a[href*="/profile/"]').forEach(a => {
      const u = a.href.split('?')[0];
      if (!seen.has(u)) { seen.add(u); result.push(u); }
    });
    return result;
  });
}

async function getContactFromProfile(page, profileUrl) {
  const ok = await gotoWithCaptcha(page, profileUrl);
  if (!ok) return null;

  // Scroll to bottom (contact info is there)
  await page.evaluate(() => { if (document.body) window.scrollTo(0, document.body.scrollHeight); }).catch(() => {});
  await sleep(1000);

  return page.evaluate(() => {
    if (!document.body) return { phone: null, email: null, name: null };
    const text = document.body.innerText;
    const rawPhones = (text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []);
    const phone = rawPhones.find(p => {
      const d = p.replace(/\D/g, '');
      if (d.length !== 10 && !(d.length === 11 && d[0] === '1')) return false;
      if (d.startsWith('20160') || d.startsWith('20161') || d.startsWith('20162')) return false;
      return true;
    }) || null;
    const email = ((text.match(/[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
      .filter(e => !e.includes('zillow') && !e.includes('example') && !e.includes('@sentry')))[0] || null;
    // Extract real agent name from page title: "First Last - Real Estate Agent | Zillow"
    const titleMatch = document.title.match(/^([^|–\-]+?)(?:\s*[-–|])/);
    const name = titleMatch ? titleMatch[1].trim() : null;
    return { phone, email, name };
  });
}

async function saveLead(lead) {
  const parts = lead.full_name.split(' ');
  const payload = {
    full_name: lead.full_name,
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || '',
    email: lead.email || null,
    phone: lead.phone,
    profile_url: lead.profile_url,
    source_brokerage: 'zillow',
    country: lead.country,
    state_province: lead.state,
    city: lead.city,
    timezone: lead.timezone,
    lead_category: 'calling',
  };
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, err: data.slice(0, 150) }));
    });
    req.on('error', e => resolve({ ok: false, err: e.message }));
    req.write(body);
    req.end();
  });
}

async function countTodayLeads() {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=id&lead_category=eq.calling&source_brokerage=eq.zillow&scraped_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'count=exact' },
    }, (res) => {
      const count = parseInt(res.headers['content-range']?.split('/')[1] || '0');
      res.resume();
      resolve(count);
    });
    req.on('error', () => resolve(0));
    req.end();
  });
}

// Returns per-timezone counts already saved today so we don't re-scrape completed TZs
async function countTodayLeadsByTz() {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    const u = new URL(`${SUPABASE_URL}/rest/v1/leads?select=timezone&lead_category=eq.calling&source_brokerage=eq.zillow&scraped_at=gte.${today}T00:00:00Z`);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const rows = JSON.parse(data);
          const counts = { EST: 0, CST: 0, MST: 0, PST: 0 };
          for (const r of rows) if (counts[r.timezone] !== undefined) counts[r.timezone]++;
          resolve(counts);
        } catch { resolve({ EST: 0, CST: 0, MST: 0, PST: 0 }); }
      });
    });
    req.on('error', () => resolve({ EST: 0, CST: 0, MST: 0, PST: 0 }));
    req.end();
  });
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) { log('ERROR: Missing SUPABASE env vars'); process.exit(1); }

  log(`=== Zillow Calling Lead Scraper — target: ${TARGET} leads ===`);

  let saved = await countTodayLeads();
  const tzSaved = await countTodayLeadsByTz();
  // Allow START_TZ env var to mark earlier timezones as already complete
  const startTz = process.env.START_TZ;
  const tzOrder = ['EST', 'CST', 'MST', 'PST'];
  if (startTz && tzOrder.includes(startTz)) {
    for (const tz of tzOrder) {
      if (tz === startTz) break;
      tzSaved[tz] = TZ_TARGET;
      log(`Skipping ${tz} (marked complete via START_TZ)`);
    }
  }
  log(`Already saved today: ${saved} (EST:${tzSaved.EST} CST:${tzSaved.CST} MST:${tzSaved.MST} PST:${tzSaved.PST})`);
  if (saved >= TARGET) { log('Target already reached.'); return; }

  // Single persistent connection — do not reconnect repeatedly
  let browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null });
  let page = (await browser.pages())[0];

  let skipped = 0;
  let errors = 0;
  let failStreak = 0;
  const cityPageState = loadCityPageState();
  log(`City page state loaded (${Object.keys(cityPageState).length} cities tracked)`);

  outer:
  for (const [tz, cities] of Object.entries(TZ_CITIES)) {
    if (saved >= TARGET) break;
    log(`\n====== ${tz} — target: ${TZ_TARGET} (have: ${tzSaved[tz]}) ======`);

    for (const [citySlug, cityName, state, timezone, country] of cities) {
      if (saved >= TARGET || tzSaved[tz] >= TZ_TARGET) break;
      const resumePage = Math.max(START_PAGE, (cityPageState[citySlug] || START_PAGE - 1) + 1);
      log(`\n=== ${cityName}, ${state} (resuming from page ${resumePage}) ===`);
      failStreak = 0;
      let dryStreak = 0;

    for (let pageNum = resumePage; pageNum <= 300; pageNum++) {
      if (saved >= TARGET) break outer;
      if (tzSaved[tz] >= TZ_TARGET) break;

      const url = `https://www.zillow.com/professionals/real-estate-agent-reviews/${citySlug}/?page=${pageNum}`;
      log(`\n[${cityName} p${pageNum}]`);

      const navOk = await gotoWithCaptcha(page, url);
      if (!navOk) {
        failStreak++;
        log(`  Nav failed (streak ${failStreak})`);
        if (failStreak >= 3) {
          // Session blocked — restart Chrome and reconnect
          await browser.disconnect().catch(() => {});
          await restartChrome();
          browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null });
          page = (await browser.pages())[0];
          failStreak = 0;
          // Retry same page
          pageNum--;
          continue;
        }
        await sleep(10000);
        continue;
      }
      failStreak = 0;

      const text = await page.evaluate(() => document.body.innerText);

      if (text.includes('No agents found') || text.includes("doesn't match")) {
        log('  End of results');
        break;
      }

      const profileUrls = await getProfileUrlsFromPage(page);
      const entries = parseAgentsFromText(text);
      const len = Math.min(profileUrls.length, entries.length);

      const qualifying = [];
      for (let i = 0; i < len; i++) {
        if (entries[i].count >= MIN_DEALS && entries[i].name) {
          qualifying.push({ name: entries[i].name, deals: entries[i].count, profileUrl: profileUrls[i] });
        }
      }

      log(`  ${profileUrls.length} profiles — ${qualifying.length} with ${MIN_DEALS}+ deals`);

      let pageNewSaves = 0;
      let pageDuplicates = 0;
      for (const agent of qualifying) {
        if (saved >= TARGET) break outer;

        log(`  → ${agent.name} | ${agent.deals} deals`);

        const contact = await getContactFromProfile(page, agent.profileUrl);

        if (!contact || !contact.phone) {
          log('    No phone');
          skipped++;
          await sleep(2000);
          continue;
        }

        const phone = formatPhone(contact.phone);
        if (!phone) { skipped++; continue; }

        const fullName = contact.name || agent.name;
        log(`    ${fullName} | Phone: ${phone} | Email: ${contact.email || 'none'}`);

        const result = await saveLead({
          full_name: fullName, phone, email: contact.email,
          profile_url: agent.profileUrl, city: cityName, state, timezone, country,
        });

        if (result.ok) {
          saved++;
          pageNewSaves++;
          tzSaved[tz]++;
          log(`    ✓ Saved (${saved}/${TARGET}) [${tz}: ${tzSaved[tz]}/${TZ_TARGET}]`);
        } else if (result.status === 409) {
          log('    Duplicate');
          skipped++;
          pageDuplicates++;
        } else {
          log(`    ✗ Error ${result.status}: ${result.err}`);
          errors++;
        }

        await sleep(PROFILE_DELAY);
      }

      // Record that we've finished this page so next run resumes from the next one
      saveCityPage(cityPageState, citySlug, pageNum);

      if (pageNewSaves > 0) {
        dryStreak = 0;
        if (pageDuplicates > 0) log(`  Page ${pageNum}: ${pageDuplicates} dupes, ${pageNewSaves} new`);
      } else if (qualifying.length === 0) {
        // No qualifying agents at all → true end of Zillow results
        dryStreak++;
        if (dryStreak >= 3) {
          log(`  Dry streak ${dryStreak} — no qualifying agents left, moving to next city`);
          break;
        }
      } else {
        // Has qualifying agents but all are duplicates → Zillow is recycling results (pagination cap)
        dryStreak++;
        log(`  Page ${pageNum}: ${pageDuplicates} dupes, 0 new (dryStreak ${dryStreak})`);
        if (dryStreak >= 5) {
          log(`  Pagination cap hit — Zillow recycling results, moving to next city`);
          break;
        }
      }

      await sleep(PAGE_DELAY);
    } // end pages
    } // end cities
  } // end timezones

  log(`\n=== DONE: ${saved} saved, ${skipped} skipped, ${errors} errors ===`);
  log(`TZ breakdown: EST ${tzSaved.EST} | CST ${tzSaved.CST} | MST ${tzSaved.MST} | PST ${tzSaved.PST}`);
  await browser.disconnect().catch(() => {});
}

main().catch(e => { log(`FATAL: ${e.stack}`); process.exit(1); });
