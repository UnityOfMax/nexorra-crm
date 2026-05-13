// FAQ PAGE
const { useState } = React;

const FAQList = () => {
  const [open,setOpen] = useState(0);
  return (
    <section style={{background:"var(--cream)"}}>
      <div className="wrap">
        <div className="faq-list">
          {FAQS.map((f,i)=>(
            <div key={i} className={`faq-item ${open===i?"open":""}`}>
              <button className="faq-q" onClick={()=>setOpen(open===i?-1:i)}>
                <span>{f.q}</span>
                <span className="ico"><PlusIcon /></span>
              </button>
              <div className="faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

function App() {
  return (
    <PageShell active="faq">
      {(t)=>(
        <>
          <PageHero
            eyebrow="Frequently asked"
            title={<>Before you call,<br/></>}
            swash="a few common questions."
            lede={`Still stuck? Text us at ${t.phone} — we answer evenings and weekends too.`}
            crumbs={[{href:"index.html",label:"Home"},{label:"FAQ"}]}
          />
          <FAQList />
          <CTABanner phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
