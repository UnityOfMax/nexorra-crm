// SERVICE AREA PAGE
const { useState } = React;

const MapSection = () => (
  <section style={{background:"var(--paper)"}}>
    <div className="wrap">
      <div className="area-grid">
        <div className="area-map">
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="rgba(14,26,20,.12)"/>
              </pattern>
            </defs>
            <rect width="400" height="400" fill="url(#dots)"/>
            <path d="M80,120 L160,80 L240,90 L320,140 L340,220 L300,300 L220,330 L130,310 L70,240 Z"
              fill="rgba(31,58,44,.08)" stroke="rgba(31,58,44,.5)" strokeWidth="1.5" strokeDasharray="4 6"/>
            <path d="M120,160 L180,140 L240,150 L280,180 L290,230 L260,270 L200,280 L150,260 L120,210 Z"
              fill="rgba(31,58,44,.18)" stroke="var(--moss)" strokeWidth="2"/>
            {[
              [200,210,"Columbus","HQ"],
              [165,150,"Worthington",""],
              [240,140,"Westerville",""],
              [140,210,"UA",""],
              [120,170,"Dublin",""],
              [240,235,"Bexley",""],
              [105,255,"Hilliard",""],
              [195,265,"Grandview",""],
            ].map(([x,y,name,tag],i)=>(
              <g key={i} transform={`translate(${x},${y})`}>
                <circle r={tag==="HQ"?9:5} fill={tag==="HQ"?"var(--citrus)":"var(--moss)"} stroke={tag==="HQ"?"var(--moss)":"none"} strokeWidth="2"/>
                <text x="10" y="4" fontSize="11" fontFamily="Inter,sans-serif" fontWeight="500" fill="var(--ink)">{name}</text>
              </g>
            ))}
            <g transform="translate(350,40)">
              <text fontSize="11" fontFamily="Bricolage Grotesque" fontWeight="600" fill="var(--moss)" textAnchor="middle">N</text>
              <path d="M0,6 L0,22 M-4,12 L0,6 L4,12" fill="none" stroke="var(--moss)" strokeWidth="1.5"/>
            </g>
          </svg>
        </div>
        <div>
          <span className="eyebrow">Coverage</span>
          <h2 className="display" style={{fontSize:"clamp(32px,4vw,56px)",margin:"14px 0 18px"}}>
            All of Franklin County —<br/><i className="serif">and most of the next one over.</i>
          </h2>
          <p style={{fontSize:17,color:"rgba(14,26,20,.65)",maxWidth:"54ch",lineHeight:1.6,margin:"0 0 14px"}}>
            <strong>Same-day dispatch inside I-270.</strong> Two-day window for outer-ring suburbs. Emergency stinging-insect and rodent calls are 24/7 anywhere in our footprint.
          </p>
          <p style={{fontSize:17,color:"rgba(14,26,20,.65)",maxWidth:"54ch",lineHeight:1.6,margin:"0 0 24px"}}>
            Not sure if we cover you? Call — we probably do, or we'll refer you to someone we trust.
          </p>
          <a href="contact.html" className="btn btn--dark">Check my address <ArrIcon /></a>
        </div>
      </div>
    </div>
  </section>
);

const NeighborhoodCards = () => (
  <section style={{background:"var(--cream)"}}>
    <div className="wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow">Neighborhoods we know</span>
          <h2 className="display">Twelve zip codes,<br/><i className="serif">eleven years.</i></h2>
        </div>
        <div className="right">
          We know the architecture, the pest pressure, and the quirks of every neighborhood we work in. Here's a sample.
        </div>
      </div>
      <div className="area-cards">
        {AREAS.map(([city,zip,note],i)=>(
          <div key={i} className="area-card">
            <h5>{city}</h5>
            <div className="zip">ZIP {zip}</div>
            <p>{note}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

function App() {
  return (
    <PageShell active="area">
      {(t)=>(
        <>
          <PageHero
            eyebrow="Service area"
            title={<>Twelve zip codes,<br/></>}
            swash="one promise."
            lede="Same-day inside I-270. Two-day window for the outer ring. Emergency line 24/7 anywhere in Franklin County."
            crumbs={[{href:"index.html",label:"Home"},{label:"Service area"}]}
          />
          <MapSection />
          <NeighborhoodCards />
          <CTABanner phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
