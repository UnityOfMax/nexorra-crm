// ============ SHARED MODULE (loaded on every page) ============
// Exports atoms, data, layout (Nav, CallBar, Footer, Outro), and tweaks to window.

const { useState, useEffect, useRef, useMemo } = React;

// ============ TWEAK DEFAULTS ============
const HUGO_DEFAULTS = Object.assign(/*EDITMODE-BEGIN*/{
  "companyName": "Hugo Pest & Termite",
  "city": "Columbus, Ohio",
  "phone": "(614) 555-0148",
  "accent": "citrus"
}/*EDITMODE-END*/, (typeof window !== "undefined" && window.__DEMO) ? window.__DEMO : {});

const ACCENTS = {
  citrus: { citrus:"#D8F26B", citrus2:"#BFE040" },
  amber:  { citrus:"#F2B636", citrus2:"#E09F1B" },
  coral:  { citrus:"#FF8862", citrus2:"#F26A40" },
  ice:    { citrus:"#9EE7E3", citrus2:"#5FCBC4" },
};

// ============ MEDIA ============
const HERO_VIDEO = "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4";
const HERO_VIDEO_2 = "https://www.w3schools.com/html/mov_bbb.mp4";
const HERO_VIDEO_FALLBACK = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1800&q=80";
const PROCESS_POSTER = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80";
const PROCESS_VIDEO = "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4";
const PROCESS_VIDEO_2 = "https://www.w3schools.com/html/movie.mp4";

// ============ DATA ============
const SERVICES = [
  { slug:"roaches-ants", icon:"🪳", name:"Roach & Ant Control",  bullets:["Targeted gel baiting","Crack & crevice treatment","Re-treat warranty"] },
  { slug:"rodents",      icon:"🐀", name:"Rodent Removal",       bullets:["Whole-home exclusion","Snap & bait stations","Sanitation & cleanup"] },
  { slug:"mosquitoes",   icon:"🦟", name:"Mosquito Defense",     bullets:["Seasonal misting","Yard barrier spray","Standing water audit"] },
  { slug:"spiders",      icon:"🕷️", name:"Spiders & Crawlers",   bullets:["Web sweep & dust","Perimeter band","Quarterly schedule"] },
  { slug:"termites",     icon:"🌳", name:"Termite Protection",   feature:true, bullets:["Sentricon® baiting system","Liquid soil barrier","Damage-repair warranty","Free annual inspection"], img:"https://picsum.photos/seed/hugo-termite-deck/1200/800" },
  { slug:"wasps",        icon:"🐝", name:"Bees, Wasps & Hornets", bullets:["Same-day removal","Nest extraction","Safe relocation when possible"] },
  { slug:"bed-bugs",     icon:"🛏️", name:"Bed Bug Eradication",  bullets:["K-9 detection","Heat or chemical","60-day guarantee"] },
];

const REVIEWS = [
  { name:"Marcus T.", area:"Clintonville", initials:"MT", body:"Justin's crew found a termite colony under our deck nobody else caught. Sentricon went in the next morning. Three years later, still nothing — and the annual inspection is free.", stars:5 },
  { name:"Priya R.",  area:"Worthington",  initials:"PR", body:"We had mice in the attic insulation. Hugo's team sealed every entry point, replaced the chewed insulation, and set up bait stations. Quiet ever since.", stars:5, dark:true },
  { name:"Devon K.",  area:"Westerville",  initials:"DK", body:"Quoted half what the national guys quoted, showed up on time, and the tech actually explained what he was spraying and why. That alone is worth it.", stars:5 },
  { name:"Sarah L.",  area:"Upper Arlington", initials:"SL", body:"Mosquito misting transformed our backyard. We barely used the patio last summer — now we eat dinner outside three nights a week.", stars:5 },
  { name:"Anthony G.",area:"Dublin",       initials:"AG", body:"Carpenter ants in a 1920s craftsman. They treated, mapped the trails, and came back twice to verify the colony was dead. No upsell, no nonsense.", stars:5, dark:true },
  { name:"Maya H.",   area:"Bexley",       initials:"MH", body:"Bed bugs from a vacation rental. The heat treatment was thorough and Hugo guaranteed it for 60 days. Cleared in one visit.", stars:5 },
  { name:"Trent W.",  area:"Hilliard",     initials:"TW", body:"Wasp nest the size of a basketball under our soffit. Gone in 20 minutes. Tech was polite, suited up properly, and cleaned the debris.", stars:5 },
  { name:"Carmen O.", area:"Grandview Heights", initials:"CO", body:"Quarterly plan. The same technician comes every time, knows our property, and our two dogs love him. That kind of consistency is rare.", stars:5, dark:true },
  { name:"James P.",  area:"German Village", initials:"JP", body:"Roach infestation in a 100-year-old brick row house — old habits die hard, apparently. Hugo cleared it in two visits and gave us a maintenance plan that's kept them out for 18 months.", stars:5 },
  { name:"Renee A.",  area:"New Albany",   initials:"RA", body:"They installed a mosquito system around our pool last spring. Honestly the best money we spent on the house this year. Quiet, invisible, effective.", stars:5, dark:true },
  { name:"Hector V.", area:"Powell",       initials:"HV", body:"Honest pricing and zero pressure. The inspector told us we didn't actually have termites, just old water damage from a leak. Saved us a $3k treatment we didn't need.", stars:5 },
  { name:"Lin C.",    area:"Gahanna",      initials:"LC", body:"Quarterly service for our restaurant. Their tech keeps detailed pest logs that have passed every health inspection without a hiccup for two years running.", stars:5 },
];

const GALLERY = [
  { src:"https://picsum.photos/seed/hugo-termite-bait/1400/900",       label:"Termite bait station install" },
  { src:"https://picsum.photos/seed/hugo-crawlspace/1200/800",         label:"Crawlspace inspection" },
  { src:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80", label:"Perimeter treatment" },
  { src:"https://picsum.photos/seed/hugo-rodent-seal/1200/800",        label:"Rodent exclusion" },
  { src:"https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80", label:"Attic remediation" },
  { src:"https://images.unsplash.com/photo-1572177812156-58036aae439c?auto=format&fit=crop&w=1200&q=80", label:"Mosquito mist install" },
  { src:"https://picsum.photos/seed/hugo-inspection-truck/1400/800",   label:"Free home inspection" },
];

const GALLERY_EXTRA = [
  { src:"https://picsum.photos/seed/hugo-extra-1/900/900",  label:"Sentricon station, Worthington" },
  { src:"https://picsum.photos/seed/hugo-extra-2/900/900",  label:"Soffit wasp removal" },
  { src:"https://picsum.photos/seed/hugo-extra-3/900/900",  label:"Pre-treatment, new build" },
  { src:"https://picsum.photos/seed/hugo-extra-4/900/900",  label:"K-9 bed bug detection" },
  { src:"https://picsum.photos/seed/hugo-extra-5/900/900",  label:"Drain fly remediation" },
  { src:"https://picsum.photos/seed/hugo-extra-6/900/900",  label:"Commercial IPM audit" },
  { src:"https://picsum.photos/seed/hugo-extra-7/900/900",  label:"Mole tunnel mapping" },
  { src:"https://picsum.photos/seed/hugo-extra-8/900/900",  label:"Crew, German Village" },
  { src:"https://picsum.photos/seed/hugo-extra-9/900/900",  label:"Foundation sealing" },
  { src:"https://picsum.photos/seed/hugo-extra-10/900/900", label:"Spring service kickoff" },
  { src:"https://picsum.photos/seed/hugo-extra-11/900/900", label:"Yard barrier, Powell" },
  { src:"https://picsum.photos/seed/hugo-extra-12/900/900", label:"Carpenter ant trails" },
];

const AREAS = [
  ["Clintonville","43214","Tree-lined streets and century homes — termite, carpenter ant, and rodent country."],
  ["Worthington","43085","Older brick foundations, busy mosquito seasons. Quarterly plans most popular."],
  ["Westerville","43081","Newer builds with active termite pressure. Sentricon installs are routine here."],
  ["Upper Arlington","43221","Historic homes, mature trees, plenty of squirrel and ant calls in spring."],
  ["Dublin","43017","Family-friendly suburb — mosquito misting and yard treatments dominate the calendar."],
  ["Bexley","43209","Brick craftsman homes with finicky basements — we know every quirk."],
  ["Hilliard","43026","Fast-growing — lots of new-construction termite prep and rodent exclusion."],
  ["Grandview Heights","43212","Compact lots, shared walls, the occasional surprise wasp nest."],
  ["German Village","43206","Pre-1900 brick, lath-and-plaster, and every pest a 120-year-old wall can hide."],
  ["New Albany","43054","Large lots, woodland edges — heavy mosquito, deer tick, and rodent demand."],
  ["Powell","43065","Pool surrounds and patios — our biggest mosquito-misting customer base."],
  ["Gahanna","43230","Mixed older and newer stock, balanced workload, repeat customers."],
];

const FAQS = [
  { q:"Do you offer free pest inspections?", a:"Yes — every home inspection is free, no-obligation, and includes a full perimeter walk plus attic and crawlspace checks. We'll send you a written report with photos within 24 hours, whether or not you book service." },
  { q:"How long does a typical treatment take?", a:"Most one-time interior treatments run 45–90 minutes. Termite bait stations install in a single morning. Mosquito misting setups take a full day for the plumbing run. We'll always give you a window when scheduling." },
  { q:"Are your treatments safe for kids and pets?", a:"We use EPA-registered, low-toxicity products and only apply where pests are active — not blanket spraying. Treated surfaces are typically pet- and kid-safe within an hour. Your technician will walk you through specifics for each product used in your home." },
  { q:"What does the Sentricon® termite warranty cover?", a:"Damage repair and re-treat. If termites return inside the protected zone, we re-treat at no cost; if they cause new structural damage, the warranty covers up to $250,000 in repairs. The warranty transfers free to subsequent owners." },
  { q:"Do you offer financing?", a:"Yes — flexible 0% APR plans up to 24 months for jobs over $500, through GreenSky. Approval is typically instant. We can pull a soft quote during the inspection so it doesn't affect your credit." },
  { q:"Do you treat businesses too?", a:"Absolutely. We service restaurants, warehouses, multifamily buildings, and HOAs across Franklin County with documented IPM programs, monthly logs, and quarterly audits — built to pass health inspections without drama." },
  { q:"What if pests come back after a treatment?", a:"That's what the 60-day guarantee is for. Call us, we come back, and we re-treat at no charge. Most quarterly customers never use it — but it's there." },
  { q:"How quickly can you come out?", a:"Same-day for emergencies inside I-270. Typical non-emergency scheduling window is 2–4 business days. Our after-hours line is 24/7 for stinging-insect or rodent emergencies." },
];

const TEAM = [
  { name:"Justin Hugo",    role:"Owner & Lead Tech",       img:"https://picsum.photos/seed/hugo-justin/800/1000",  bio:"Licensed Ohio PCO since 2014. Sentricon Certified Specialist. Lives in Clintonville with his wife, two kids, and one extremely smug Labrador." },
  { name:"Maria Salvatore",role:"Operations Manager",      img:"https://picsum.photos/seed/hugo-maria/800/1000",   bio:"Keeps the calendar (and Justin) on time. 12 years in service-business ops. Will absolutely text you back faster than you expect." },
  { name:"Devon Park",     role:"Senior Technician",       img:"https://picsum.photos/seed/hugo-devon/800/1000",   bio:"Bed bug and rodent specialist. Previously ran the bed-bug program at a regional hotel chain. Speaks fluent crawlspace." },
  { name:"Aisha Brown",    role:"Mosquito Program Lead",   img:"https://picsum.photos/seed/hugo-aisha/800/1000",   bio:"Designs every misting install we run. Backyards she's worked on are 80% quieter on a summer evening — we measured." },
  { name:"Tomás Reyes",    role:"Termite Inspector",       img:"https://picsum.photos/seed/hugo-tomas/800/1000",   bio:"15 years in WDIR inspections. Has seen things in crawlspaces you do not want to know about." },
  { name:"Jen Whitaker",   role:"Customer Care",           img:"https://picsum.photos/seed/hugo-jen/800/1000",     bio:"Your first call. Books inspections, decodes pest descriptions (\"flying ants? Or are they swarmers?\"), and runs the review program." },
];

// ============ ATOMS ============
const Star = ({ filled=true, size=14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
  </svg>
);
const Stars = ({ n=5 }) => (
  <div className="row">{Array.from({length:5}).map((_,i)=><Star key={i} filled={i<n} />)}</div>
);
const ArrIcon = ({ size=16 }) => (
  <svg className="arr" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7M9 7h8v8"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const PlayIcon = ({ size=32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const Check = ({ size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);
const PhoneIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const CircleText = () => (
  <svg viewBox="0 0 200 200">
    <defs>
      <path id="circle" d="M 100,100 m -76,0 a 76,76 0 1,1 152,0 a 76,76 0 1,1 -152,0"/>
    </defs>
    <text fontFamily="Bricolage Grotesque, sans-serif" fontSize="14" fontWeight="600" letterSpacing="6" fill="currentColor">
      <textPath href="#circle" startOffset="0">FREE INSPECTIONS · 60-DAY GUARANTEE · LICENSED &amp; INSURED · </textPath>
    </text>
  </svg>
);

// ============ LAYOUT ============
const CallBar = ({ phone }) => (
  <div className="callbar">
    <div className="wrap">
      <div className="left">
        <span><span className="dot"></span><span className="copy">Crews dispatched today · Columbus &amp; suburbs</span></span>
      </div>
      <div className="right">
        <a href={`tel:${phone}`}><strong>{phone}</strong></a>
        <span style={{opacity:.5}}>·</span>
        <a href="contact.html">Free inspection →</a>
      </div>
    </div>
  </div>
);

const Nav = ({ companyName, active }) => {
  const links = [
    ["index.html","Home","home"],
    ["services.html","Services","services"],
    ["about.html","About","about"],
    ["gallery.html","Gallery","gallery"],
    ["reviews.html","Reviews","reviews"],
    ["service-area.html","Service area","area"],
    ["faq.html","FAQ","faq"],
  ];
  const [first, ...rest] = companyName.split(" ");
  return (
    <nav className="top">
      <div className="wrap">
        <a href="index.html" className="logo">
          <div className="mark">H</div>
          <div className="name">{first}<small>{rest.join(" ").toUpperCase()}</small></div>
        </a>
        <div className="navlinks">
          {links.map(([h,l,k])=>(
            <a key={k} href={h} className={active===k?"active":""}>{l}</a>
          ))}
        </div>
        <div className="nav-cta">
          <a href="contact.html" className="btn btn--ghost">Free inspection</a>
          <a href="contact.html" className="btn btn--primary">Get a quote <ArrIcon /></a>
        </div>
      </div>
    </nav>
  );
};

const PageHero = ({ eyebrow, title, swash, lede, crumbs }) => (
  <header className="page-hero">
    <div className="wrap">
      {crumbs && (
        <div className="crumbs">
          {crumbs.map((c,i)=>(
            <React.Fragment key={i}>
              {c.href ? <a href={c.href}>{c.label}</a> : <span className="cur">{c.label}</span>}
              {i<crumbs.length-1 && <span className="sep">/</span>}
            </React.Fragment>
          ))}
        </div>
      )}
      <span className="eyebrow on-dark">{eyebrow}</span>
      <h1 className="display">{title} {swash && <span className="swash">{swash}</span>}</h1>
      {lede && <p className="lede">{lede}</p>}
    </div>
  </header>
);

const CTABanner = ({ phone }) => (
  <section className="cta-banner">
    <div className="wrap">
      <div>
        <span className="eyebrow on-dark">Ready when you are</span>
        <h3 className="display">Free inspection. <span className="swash">No pressure.</span></h3>
      </div>
      <div className="ctas">
        <a href={`tel:${phone}`} className="btn btn--ghost on-dark"><PhoneIcon /> <span className="mono-num">{phone}</span></a>
        <a href="contact.html" className="btn btn--primary">Book online <ArrIcon /></a>
      </div>
    </div>
  </section>
);

const Outro = () => (
  <div className="outro">
    <div className="outro-mega">Hugo. <span className="fill">Pest-free.</span> Promise.</div>
  </div>
);

const Footer = ({ companyName, city, phone }) => {
  const [first, ...rest] = companyName.split(" ");
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="logo">
              <div className="mark">H</div>
              <div className="name" style={{color:"var(--cream)"}}>{first}<small style={{color:"rgba(244,239,227,.5)"}}>{rest.join(" ").toUpperCase()}</small></div>
            </div>
            <p>Family-owned pest control serving Central Ohio since 2014. Licensed, insured, and guaranteed.</p>
          </div>
          <div>
            <h6>Services</h6>
            <ul>
              <li><a href="services.html#termites">Termite protection</a></li>
              <li><a href="services.html#rodents">Rodent removal</a></li>
              <li><a href="services.html#mosquitoes">Mosquito defense</a></li>
              <li><a href="services.html#bed-bugs">Bed bugs</a></li>
              <li><a href="services.html">Commercial IPM</a></li>
            </ul>
          </div>
          <div>
            <h6>Company</h6>
            <ul>
              <li><a href="about.html">About</a></li>
              <li><a href="service-area.html">Service area</a></li>
              <li><a href="reviews.html">Reviews</a></li>
              <li><a href="gallery.html">Gallery</a></li>
              <li><a href="faq.html">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h6>Contact</h6>
            <ul>
              <li><a href={`tel:${phone}`}>{phone}</a></li>
              <li><a href="mailto:hi@hugopest.co">hi@hugopest.co</a></li>
              <li>2410 N High Street<br/>{city} 43202</li>
              <li>Mon–Sat · 24/7 emergency</li>
            </ul>
          </div>
        </div>
        <div className="foot-base">
          <div>© 2026 {companyName} LLC · ODA #14-PCO-2244</div>
          <div className="right">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ============ TRUST STRIP (used on home + about) ============
const TrustStrip = () => (
  <section className="trust" style={{padding:"32px 0"}}>
    <div className="wrap">
      <div className="trust-item stars">
        <Stars n={5}/>
        <div><strong>4.9 on Google</strong><span>312 verified reviews</span></div>
      </div>
      <div className="trust-item">
        <div className="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg></div>
        <div><strong>Licensed &amp; insured</strong><span>ODA #14-PCO-2244</span></div>
      </div>
      <div className="trust-item">
        <div className="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg></div>
        <div><strong>60-day guarantee</strong><span>Re-treat at no cost</span></div>
      </div>
      <div className="trust-item">
        <div className="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12h18M12 3v18"/><circle cx="12" cy="12" r="9"/></svg></div>
        <div><strong>Local crews</strong><span>Columbus &amp; suburbs</span></div>
      </div>
      <div className="trust-item">
        <div className="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></svg></div>
        <div><strong>0% financing</strong><span>Up to 24 months</span></div>
      </div>
    </div>
  </section>
);

// ============ TWEAKS ============
const SimpleTweaks = ({ t, setTweak }) => {
  if (!window.TweaksPanel) return null;
  const { TweaksPanel, TweakSection, TweakText, TweakColor } = window;
  const currentColor = (ACCENTS[t.accent] || ACCENTS.citrus).citrus;
  const colorOpts = Object.values(ACCENTS).map(a => [a.citrus, a.citrus2]);
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Brand">
        <TweakText label="Company" value={t.companyName} onChange={v=>setTweak("companyName",v)}/>
        <TweakText label="City" value={t.city} onChange={v=>setTweak("city",v)}/>
        <TweakText label="Phone" value={t.phone} onChange={v=>setTweak("phone",v)}/>
      </TweakSection>
      <TweakSection label="Accent">
        <TweakColor
          label="Palette"
          value={[currentColor, (ACCENTS[t.accent]||ACCENTS.citrus).citrus2]}
          options={colorOpts}
          onChange={pair=>{
            const hex = Array.isArray(pair) ? pair[0] : pair;
            const found = Object.entries(ACCENTS).find(([_,c])=>c.citrus===hex);
            if (found) setTweak("accent", found[0]);
          }}
        />
      </TweakSection>
    </TweaksPanel>
  );
};

// Hook used by every page App() to wire tweaks + accent variables
function useHugoTweaks() {
  const useTweaks = window.useTweaks;
  const result = useTweaks ? useTweaks(HUGO_DEFAULTS) : [HUGO_DEFAULTS, ()=>{}];
  const t = result[0];
  const setTweak = result[1];
  useEffect(()=>{
    const a = ACCENTS[t.accent] || ACCENTS.citrus;
    document.documentElement.style.setProperty("--citrus", a.citrus);
    document.documentElement.style.setProperty("--citrus-2", a.citrus2);
  }, [t.accent]);
  return [t, setTweak];
}

// Tiny shell every page uses
function PageShell({ active, children }) {
  const [t, setTweak] = useHugoTweaks();
  return (
    <>
      <CallBar phone={t.phone} />
      <Nav companyName={t.companyName} active={active} />
      {typeof children === "function" ? children(t) : children}
      <Outro />
      <Footer companyName={t.companyName} city={t.city} phone={t.phone} />
      <SimpleTweaks t={t} setTweak={setTweak} />
    </>
  );
}

// Export to window so per-page files can access
Object.assign(window, {
  // atoms
  Star, Stars, ArrIcon, PlusIcon, PlayIcon, Check, PhoneIcon, CircleText,
  // layout
  CallBar, Nav, PageHero, CTABanner, Outro, Footer, TrustStrip, SimpleTweaks,
  PageShell, useHugoTweaks,
  // data
  HUGO_DEFAULTS, ACCENTS, SERVICES, REVIEWS, GALLERY, GALLERY_EXTRA, AREAS, FAQS, TEAM,
  HERO_VIDEO, HERO_VIDEO_2, HERO_VIDEO_FALLBACK, PROCESS_POSTER, PROCESS_VIDEO, PROCESS_VIDEO_2,
  // react
  useState, useEffect, useRef, useMemo,
});
