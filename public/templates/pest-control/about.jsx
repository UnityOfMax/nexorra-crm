// ABOUT PAGE
const { useState, useEffect, useRef } = React;

const Story = () => (
  <section id="story">
    <div className="wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow">Our story</span>
          <h2 className="display">Started after<br/><i className="serif">a bad inspection.</i></h2>
        </div>
        <div className="right">
          In 2013, Justin Hugo's grandmother's house was condemned after subterranean termites ate through a load-bearing beam undetected for almost a decade. Three different pest companies had inspected it and missed it. He started Hugo Pest &amp; Termite the next year with one rule: every inspection ends in a written, photographed report — whether or not you book us.
        </div>
      </div>
      <div className="why-grid">
        <div className="why-right" style={{minHeight:560}}>
          <img src="https://picsum.photos/seed/hugo-story/1400/1600" alt="Justin in the field"/>
          <div className="badge">
            <h5>Justin Hugo, founder</h5>
            <p>"If our inspector tells you you don't need a treatment, that's the inspection working. We're not trying to sell you something. We're trying to be the company we wished my grandmother had called."</p>
          </div>
        </div>
        <div className="why-left">
          <p style={{fontSize:18,color:"rgba(14,26,20,.7)",maxWidth:"54ch",lineHeight:1.6,margin:"0 0 16px"}}>
            We started out of a garage in Clintonville with one truck and a borrowed termite probe. Eleven years later, we run six trucks, six full-time techs, and a small office on N High Street — but the rules haven't changed.
          </p>
          <p style={{fontSize:18,color:"rgba(14,26,20,.7)",maxWidth:"54ch",lineHeight:1.6,margin:"0 0 16px"}}>
            Inspections are free. Reports are written. Quotes are flat-rate, not commission-based. The technician who shows up is the one who'll come back if something isn't right — we don't subcontract.
          </p>
          <p style={{fontSize:18,color:"rgba(14,26,20,.7)",maxWidth:"54ch",lineHeight:1.6,margin:"0 0 32px"}}>
            We treat about 2,100 homes a year now. Most are repeat customers on quarterly plans. The rest find us through their neighbors — which is exactly how we like it.
          </p>
          <div className="stats" style={{marginTop:0}}>
            <div className="why-stat"><div className="v">2014</div><div className="l">Year founded — still family-owned</div></div>
            <div className="why-stat"><div className="v">2.1k</div><div className="l">Active customers across Franklin County</div></div>
            <div className="why-stat"><div className="v">6</div><div className="l">Full-time licensed technicians</div></div>
            <div className="why-stat"><div className="v">0</div><div className="l">Subcontractors — every tech is on payroll</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const TeamGrid = () => (
  <section style={{background:"var(--paper)"}}>
    <div className="wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow">The crew</span>
          <h2 className="display">Six humans.<br/><i className="serif">One truck each.</i></h2>
        </div>
        <div className="right">
          You'll meet the same technician each visit — they know your house, your dogs, and where the spider keeps coming back. No round-robin scheduling, no rotating subcontractors.
        </div>
      </div>
      <div className="team-grid">
        {TEAM.map((m,i)=>(
          <div key={i} className="team-card">
            <div className="ph" style={{backgroundImage:`url(${m.img})`}}></div>
            <div className="body">
              <h4>{m.name}</h4>
              <div className="role">{m.role}</div>
              <p>{m.bio}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Certs = () => (
  <section className="cert-strip">
    <div className="wrap">
      <div className="cert-grid">
        {[
          ["Ohio Department of Agriculture","Licensed PCO #14-PCO-2244"],
          ["Sentricon® Specialist","Certified installer & monitor"],
          ["NPMA Member","National Pest Management Assn."],
          ["BBB A+","Accredited since 2016"],
          ["GreenPro","Eco-friendly IPM certified"],
        ].map(([t,sub],i)=>(
          <div key={i} className="cert">
            <div className="cert-mark">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <div>
              <small style={{display:"block",fontWeight:600,color:"var(--ink)",letterSpacing:".02em",fontSize:13,textTransform:"none"}}>{t}</small>
              <small>{sub}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

function App() {
  return (
    <PageShell active="about">
      {(t)=>(
        <>
          <PageHero
            eyebrow={`About ${t.companyName.split(" ")[0]}`}
            title={<>Family-owned,<br/></>}
            swash="Columbus-built."
            lede={`Eleven years, six trucks, and one stubborn rule: every inspection ends in a written, photographed report — whether or not you book us.`}
            crumbs={[{href:"index.html",label:"Home"},{label:"About"}]}
          />
          <TrustStrip />
          <Story />
          <TeamGrid />
          <Certs />
          <CTABanner phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
