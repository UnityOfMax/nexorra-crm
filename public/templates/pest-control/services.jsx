// SERVICES PAGE — full grid + per-service detail blocks
const { useState, useEffect, useRef } = React;

const SERVICE_DETAILS = {
  "termites": {
    img: "https://picsum.photos/seed/hugo-detail-termites/900/1100",
    headline: "Termite protection,",
    swash: "warranted.",
    body: [
      "Subterranean termites cost Ohio homeowners millions in repairs every year — and most colonies are discovered only after they've eaten through structural framing. We install Sentricon® bait stations around the perimeter of your home and monitor them quarterly until the colony is eliminated.",
      "Every install includes a transferable $250,000 damage-repair warranty and a free annual re-inspection for the life of the home.",
    ],
    checklist: ["Sentricon® Always Active™ bait","Quarterly station monitoring","Damage-repair warranty up to $250k","Free annual re-inspection","WDIR letters for real-estate closings","Transferable to new owners"],
  },
  "rodents": {
    img: "https://picsum.photos/seed/hugo-detail-rodents/900/1100",
    headline: "Rodent removal,",
    swash: "and exclusion.",
    body: [
      "Killing the mice is the easy part — keeping them out is the trade. We start with a full exterior audit, seal every quarter-inch gap with copper mesh, hardware cloth, and elastomeric foam, then deploy interior snap and bait stations until the activity stops.",
      "For attics with droppings or chewed insulation, we coordinate cleanup and replacement so you start from a clean baseline.",
    ],
    checklist: ["Full perimeter exclusion","Attic & crawlspace seal-up","Tamper-resistant bait stations","Insulation removal & replacement","Sanitation & odor treatment","Quarterly maintenance available"],
  },
  "mosquitoes": {
    img: "https://picsum.photos/seed/hugo-detail-mosquitoes/900/1100",
    headline: "Take back",
    swash: "your backyard.",
    body: [
      "Our seasonal mosquito programs cut populations 80–95% across the treated yard. Choose between a barrier spray every 21 days from April through October, or a permanent automated misting system that runs at dawn and dusk.",
      "Every program starts with a standing-water audit — gutters, downspouts, planters, kids' toys — because no spray beats removing the breeding source.",
    ],
    checklist: ["Barrier spray, 21-day cycle","Automated misting installs","Standing-water audit","Tick & flea co-treatment","Pet- and pollinator-safe","Pause service for events"],
  },
  "bed-bugs": {
    img: "https://picsum.photos/seed/hugo-detail-bedbugs/900/1100",
    headline: "Bed bugs?",
    swash: "Sleep easy.",
    body: [
      "Bed bug calls are scary. We walk you through every step — K-9 detection to confirm activity, your choice of heat (one visit, no chemicals) or chemical (lower cost, two visits), and a 60-day re-treat guarantee on whichever path you pick.",
      "We've cleared infestations in everything from studio apartments to 18-unit multifamily buildings. Discretion guaranteed — unmarked vehicles available.",
    ],
    checklist: ["K-9 detection","Whole-room heat treatment","Targeted chemical option","Discreet, unmarked vehicles","60-day guarantee","Multi-unit experience"],
  },
  "roaches-ants": {
    img: "https://picsum.photos/seed/hugo-detail-roaches/900/1100",
    headline: "Roaches and ants,",
    swash: "out for good.",
    body: [
      "We don't carpet-bomb your kitchen. Our roach and ant programs use targeted gel baits inside cracks, crevices, voids, and under appliances — where the colony actually lives — and a perimeter band outside to interrupt the highway.",
      "Most kitchens go quiet within 72 hours. Tough cases get a free second visit at the 2-week mark.",
    ],
    checklist: ["Gel bait, no kitchen sprays","Crack & crevice flush","Perimeter exterior band","Free 2-week follow-up","Pet- and kid-safe placements","Apartment-friendly protocol"],
  },
  "spiders": {
    img: "https://picsum.photos/seed/hugo-detail-spiders/900/1100",
    headline: "Spider sweep,",
    swash: "every season.",
    body: [
      "Most spider calls are spring and fall, when the weather pushes them indoors. We sweep every web from the exterior, dust voids and overhangs, and apply a perimeter barrier band that lasts 90 days.",
      "Quarterly customers rarely see spiders again — and never see the ones that would scare the kids.",
    ],
    checklist: ["Full exterior web sweep","Eave & soffit dust","90-day perimeter band","Brown-recluse focused option","Quarterly schedule available","Garage & shed included"],
  },
  "wasps": {
    img: "https://picsum.photos/seed/hugo-detail-wasps/900/1100",
    headline: "Stinging insects?",
    swash: "Gone today.",
    body: [
      "Same-day removal for wasps, hornets, yellow jackets, and honey bees. We suit up, treat the nest, and clean the debris — you don't have to be home if you don't want to be.",
      "For honey bees, we coordinate with local apiarists for live relocation whenever the colony is accessible.",
    ],
    checklist: ["Same-day dispatch","Full PPE & ladder work","Nest removal & cleanup","Honey-bee relocation when possible","30-day re-treat guarantee","Quarterly preventive option"],
  },
};

const FullServicesGrid = () => (
  <section style={{paddingBottom:48}}>
    <div className="wrap">
      <div className="svc-grid">
        {SERVICES.map((s,i)=>(
          <a key={i} href={`#${s.slug}`} className={`svc ${s.feature?"feature":""}`}>
            <div className="svc-arr"><ArrIcon size={14}/></div>
            <div className="svc-icon">{s.icon}</div>
            <h3>{s.name}</h3>
            <ul className="svc-bullets">{s.bullets.map((b,j)=><li key={j}>{b}</li>)}</ul>
            {s.feature && <div className="feature-img" style={{backgroundImage:`url(${s.img})`}}></div>}
          </a>
        ))}
      </div>
    </div>
  </section>
);

const ServiceDetail = ({ slug, eyebrow }) => {
  const d = SERVICE_DETAILS[slug];
  if (!d) return null;
  const svc = SERVICES.find(s=>s.slug===slug);
  return (
    <section id={slug} style={{paddingTop:64,paddingBottom:64,background:slug==="termites"||slug==="mosquitoes"||slug==="wasps"?"var(--cream)":"var(--paper)"}}>
      <div className="wrap">
        <div className="service-detail">
          <div className="left">
            <span className="eyebrow">{eyebrow} · {svc.icon} {svc.name}</span>
            <h2 className="display">{d.headline} <span style={{fontFamily:"'Instrument Serif',serif",fontStyle:"italic",color:"var(--moss)",fontWeight:400}}>{d.swash}</span></h2>
            {d.body.map((p,i)=><p key={i}>{p}</p>)}
            <ul className="checklist">
              {d.checklist.map((c,i)=>(
                <li key={i}><Check size={18}/>{c}</li>
              ))}
            </ul>
            <a href="contact.html" className="btn btn--dark">Book free {svc.name.toLowerCase()} inspection <ArrIcon /></a>
          </div>
          <div className="right">
            <div className="hero-img" style={{backgroundImage:`url(${d.img})`}}></div>
          </div>
        </div>
      </div>
    </section>
  );
};

function App() {
  return (
    <PageShell active="services">
      {(t)=>(
        <>
          <PageHero
            eyebrow="What we treat"
            title={<>Pest control,<br/></>}
            swash="end to end."
            lede="Seven core programs and a long tail of one-off treatments — built for Central Ohio homes, businesses, and the occasional very old barn."
            crumbs={[{href:"index.html",label:"Home"},{label:"Services"}]}
          />
          <FullServicesGrid />
          {Object.keys(SERVICE_DETAILS).map((slug,i)=>(
            <ServiceDetail key={slug} slug={slug} eyebrow={`Service ${String(i+1).padStart(2,"0")}`} />
          ))}
          <CTABanner phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
