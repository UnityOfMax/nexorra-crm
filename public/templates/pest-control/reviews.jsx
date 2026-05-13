// REVIEWS PAGE
const { useState } = React;

const Wall = () => (
  <section style={{background:"var(--paper)"}}>
    <div className="wrap">
      <div className="rev-stats">
        <div className="rev-stat"><div className="v">4.9</div><div className="l">Average Google rating · 312 reviews</div></div>
        <div className="rev-stat"><div className="v">96%</div><div className="l">5-star reviews — unfiltered, unprompted</div></div>
        <div className="rev-stat"><div className="v">72%</div><div className="l">Customers who refer at least one neighbor</div></div>
        <div className="rev-stat"><div className="v">11 yrs</div><div className="l">Of word-of-mouth growth in Columbus</div></div>
      </div>
      <div className="reviews-wall">
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
      <div style={{marginTop:48,textAlign:"center"}}>
        <a href="#" className="btn btn--dark">See all 312 on Google <ArrIcon /></a>
      </div>
    </div>
  </section>
);

function App() {
  return (
    <PageShell active="reviews">
      {(t)=>(
        <>
          <PageHero
            eyebrow="In their words"
            title={<>312 reviews,<br/></>}
            swash="4.9 average."
            lede="We don't filter, prompt, or trade discounts for reviews. Every word here is from a real customer in a real neighborhood — pulled straight from Google."
            crumbs={[{href:"index.html",label:"Home"},{label:"Reviews"}]}
          />
          <Wall />
          <CTABanner phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
