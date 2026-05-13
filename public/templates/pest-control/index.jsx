// HOME PAGE
const { useState, useEffect, useRef } = React;

const Hero = ({ companyName, city, phone }) => {
  const videoRef = useRef(null);
  return (
    <header className="hero" id="top">
      <video ref={videoRef} className="bgvid" autoPlay muted loop playsInline poster={HERO_VIDEO_FALLBACK}>
        <source src={HERO_VIDEO} type="video/mp4" />
        <source src={HERO_VIDEO_2} type="video/mp4" />
      </video>
      <div className="scrim"></div>
      <div className="grain"></div>
      <div className="floating-badge">
        <CircleText />
        <div className="center">FREE<br/>QUOTE<br/>TODAY</div>
      </div>
      <div className="wrap">
        <span className="eyebrow on-dark">Pest control · {city}</span>
        <h1 className="display">
          Your home,<br/>
          <span className="underline">pest-free —</span><br/>
          <span className="swash">guaranteed.</span>
        </h1>
        <p className="lede">
          Born and raised in Columbus, {companyName.split(" ")[0]} handles termites, roaches, rodents, mosquitoes, and everything else Ohio throws at your foundation — with a 60-day re-treat guarantee on every job.
        </p>
        <div className="ctas">
          <a href="contact.html" className="btn btn--primary">Book free inspection <ArrIcon /></a>
          <a href={`tel:${phone}`} className="btn btn--ghost on-dark">
            <PhoneIcon /><span className="mono-num">{phone}</span>
          </a>
        </div>
        <div className="meta-row">
          <div><div className="meta-num">4.9<span className="sub">/5</span></div><div className="meta-label">Across 312 Google reviews</div></div>
          <div><div className="meta-num">11<span className="sub">yrs</span></div><div className="meta-label">Treating Central Ohio homes</div></div>
          <div><div className="meta-num">60<span className="sub">-day</span></div><div className="meta-label">Re-treat guarantee, every job</div></div>
          <div><div className="meta-num">$0</div><div className="meta-label">No-obligation inspections</div></div>
        </div>
      </div>
    </header>
  );
};

const ServicesTeaser = () => {
  const first = SERVICES.slice(0,4);
  const feature = SERVICES.find(s=>s.feature);
  return (
    <section id="services">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">What we treat</span>
            <h2 className="display">Every pest<br/><i className="serif">Ohio throws at us.</i></h2>
          </div>
          <div className="right">
            From carpenter ants chewing through 1920s craftsman homes to mice making themselves at home in your attic insulation — we have a treatment program for it, with a guarantee behind it.
          </div>
        </div>
        <div className="svc-grid">
          {first.map((s,i)=>(
            <a key={i} href={`services.html#${s.slug}`} className="svc">
              <div className="svc-arr"><ArrIcon size={14}/></div>
              <div className="svc-icon">{s.icon}</div>
              <h3>{s.name}</h3>
              <ul className="svc-bullets">{s.bullets.map((b,j)=><li key={j}>{b}</li>)}</ul>
            </a>
          ))}
          <a href={`services.html#${feature.slug}`} className="svc feature">
            <div className="svc-arr"><ArrIcon size={14}/></div>
            <div className="svc-icon">{feature.icon}</div>
            <h3>{feature.name}</h3>
            <ul className="svc-bullets">{feature.bullets.map((b,j)=><li key={j}>{b}</li>)}</ul>
            <div className="feature-img" style={{backgroundImage:`url(${feature.img})`}}></div>
          </a>
          <a href="services.html" className="svc" style={{background:"var(--ink)",color:"var(--cream)",justifyContent:"center",alignItems:"center",textAlign:"center"}}>
            <div className="svc-icon" style={{margin:0}}>→</div>
            <h3 style={{margin:"16px 0 6px"}}>See all services</h3>
            <p style={{fontSize:13,color:"rgba(244,239,227,.6)",margin:0}}>Bed bugs, wasps, spiders, commercial IPM, more.</p>
          </a>
        </div>
      </div>
    </section>
  );
};

const ProcessTeaser = () => {
  const vidRef = useRef(null);
  const [playing,setPlaying] = useState(false);
  const togglePlay = () => {
    const v = vidRef.current; if(!v) return;
    if (v.paused){ v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  return (
    <section id="process">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow on-dark">How it works</span>
            <h2 className="display">A real inspection.<br/><i className="serif">No high-pressure quote.</i></h2>
          </div>
          <div className="right">
            Watch a 90-second walkthrough of what our techs do on a free home inspection — what they look for, where they crawl, how the report lands in your inbox the same day.
          </div>
        </div>
        <div className="video-block" onClick={togglePlay}>
          <video ref={vidRef} poster={PROCESS_POSTER} muted playsInline loop>
            <source src={PROCESS_VIDEO} type="video/mp4" />
            <source src={PROCESS_VIDEO_2} type="video/mp4" />
          </video>
          {!playing && <div className="play"><div className="play-btn"><PlayIcon /></div></div>}
          <div className="video-caption">
            <div>
              <h4>Watch: A Hugo home inspection, start to finish</h4>
              <p>Filmed in a German Village home, March 2026 — termite, rodent, and perimeter walk.</p>
            </div>
            <div className="runtime">01:32</div>
          </div>
        </div>
        <div className="process-steps">
          {[
            ["01","Book free inspection","Pick a 2-hour window online or by phone. We confirm in under an hour during business days."],
            ["02","On-site walk-through","Full interior, exterior, attic, and crawlspace check. Usually 45–60 minutes."],
            ["03","Written report","Photo-documented report within 24 hours — entry points, evidence, recommended program."],
            ["04","Treatment & guarantee","Treatment scheduled same week if needed. Every job backed by our 60-day re-treat guarantee."],
          ].map(([n,h,p])=>(
            <div key={n} className="pstep">
              <div className="num">— {n}</div>
              <h5>{h}</h5>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ReviewsTeaser = () => {
  const [page,setPage] = useState(0);
  const perPage = 4;
  const pages = Math.ceil(REVIEWS.length / perPage);
  useEffect(()=>{
    const t = setInterval(()=> setPage(p => (p+1) % pages), 7500);
    return ()=> clearInterval(t);
  }, [pages]);
  return (
    <section id="reviews">
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">In their words</span>
            <h2 className="display">312 reviews,<br/><i className="serif">4.9 average.</i></h2>
          </div>
          <div className="right">
            We don't filter, prompt, or trade discounts for reviews. These are unedited, straight from Google — same neighbors, same houses, same crews.
          </div>
        </div>
        <div className="reviews-track-wrap">
          <div className="reviews-track" style={{transform:`translateX(calc(${-page*100}% - ${page*20}px))`}}>
            {REVIEWS.map((r,i)=>(
              <div key={i} className={`review ${r.dark?"dark":""}`}>
                <div className="stars"><Stars n={r.stars}/></div>
                <p>"{r.body}"</p>
                <div className="author">
                  <div className="ava">{r.initials}</div>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{r.area} · Verified Google review</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="reviews-controls">
          <div className="rc-bullets">
            {Array.from({length:pages}).map((_,i)=>(
              <button key={i} className={i===page?"active":""} onClick={()=>setPage(i)} aria-label={`Page ${i+1}`}/>
            ))}
          </div>
          <div className="rc-arrows">
            <button onClick={()=>setPage(p => (p-1+pages)%pages)} aria-label="Previous">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={()=>setPage(p => (p+1)%pages)} aria-label="Next">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M5 12h14M13 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
        <div style={{marginTop:32,textAlign:"center"}}>
          <a href="reviews.html" className="btn btn--ghost">Read all 312 reviews <ArrIcon /></a>
        </div>
      </div>
    </section>
  );
};

const WhyTeaser = () => (
  <section id="why">
    <div className="wrap">
      <div className="why-grid">
        <div className="why-left">
          <span className="eyebrow">Why Hugo</span>
          <h2 className="display" style={{fontSize:"clamp(40px,5vw,72px)",margin:"14px 0 24px"}}>
            Honest assessments.<br/><i className="serif">Real guarantees.</i>
          </h2>
          <p style={{fontSize:17,color:"rgba(14,26,20,.65)",maxWidth:"54ch",margin:"0 0 12px"}}>
            We grew up on the east side and got into this trade after a family member's house was eaten through by termites no one caught. Every program we sell is one we'd put on our own home — nothing more, nothing less.
          </p>
          <p style={{fontSize:17,color:"rgba(14,26,20,.65)",maxWidth:"54ch",margin:"0 0 32px"}}>
            Transparent quotes, IPM-first treatment plans, and a guarantee that doesn't need a lawyer to read.
          </p>
          <a href="about.html" className="btn btn--dark">Meet the team <ArrIcon /></a>
          <div className="stats">
            <div className="why-stat"><div className="v">98%</div><div className="l">First-visit knock-down rate on roach &amp; ant treatments</div></div>
            <div className="why-stat"><div className="v">2.1k</div><div className="l">Homes under quarterly protection across Franklin County</div></div>
            <div className="why-stat"><div className="v">24h</div><div className="l">Emergency response window — most calls dispatched same-day</div></div>
            <div className="why-stat"><div className="v">$0</div><div className="l">Charged for inspections, re-treats, or follow-up reports</div></div>
          </div>
        </div>
        <div className="why-right">
          <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=85" alt="Hugo technician inspecting a home" />
          <div className="badge">
            <h5>Justin Hugo · Owner, Lead Tech</h5>
            <p>Licensed Ohio PCO since 2014 · Sentricon Certified Specialist · Lives in Clintonville with his wife, two kids, and (most days) a very smug Labrador.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

function App() {
  return (
    <PageShell active="home">
      {(t) => (
        <>
          <Hero companyName={t.companyName} city={t.city} phone={t.phone} />
          <TrustStrip />
          <ServicesTeaser />
          <ProcessTeaser />
          <WhyTeaser />
          <ReviewsTeaser />
          <CTABanner phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
