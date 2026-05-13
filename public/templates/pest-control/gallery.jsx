// GALLERY PAGE
const { useState } = React;

const HeroGallery = () => (
  <section id="gallery" style={{background:"var(--moss)",color:"var(--cream)"}}>
    <div className="wrap">
      <div className="gallery-grid">
        {GALLERY.map((g,i)=>(
          <div key={i} className={`gcell g${i+1}`}>
            <img src={g.src} alt={g.label}/>
            <div className="lbl">{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ExtraGrid = () => (
  <section style={{background:"var(--paper)"}}>
    <div className="wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow">More from the field</span>
          <h2 className="display">A few hundred<br/><i className="serif">more like these.</i></h2>
        </div>
        <div className="right">
          A rolling sample from our crews' phones — submitted by techs, screened by Justin, posted with the customer's permission.
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {GALLERY_EXTRA.map((g,i)=>(
          <div key={i} style={{aspectRatio:"1/1",borderRadius:14,overflow:"hidden",position:"relative",background:"var(--cream)"}}>
            <img src={g.src} alt={g.label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div className="lbl" style={{position:"absolute",left:14,bottom:14,background:"rgba(10,20,14,.7)",backdropFilter:"blur(8px)",padding:"6px 10px",borderRadius:999,fontSize:11,letterSpacing:".04em",color:"var(--cream)"}}>{g.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

function App() {
  return (
    <PageShell active="gallery">
      {(t)=>(
        <>
          <PageHero
            eyebrow="Recent work"
            title={<>Real homes,<br/></>}
            swash="real treatments."
            lede="Bait stations, crawlspaces, soffits, the occasional surprised opossum. A few hundred shots a year — these are some recent favorites."
            crumbs={[{href:"index.html",label:"Home"},{label:"Gallery"}]}
          />
          <HeroGallery />
          <ExtraGrid />
          <CTABanner phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
