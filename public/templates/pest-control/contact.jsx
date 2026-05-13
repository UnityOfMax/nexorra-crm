// CONTACT PAGE
const { useState } = React;

const ContactSection = ({ companyName, phone }) => {
  const [pests,setPests] = useState(["Termites"]);
  const [submitted,setSubmitted] = useState(false);
  const PESTS = ["Termites","Roaches","Ants","Mice/Rats","Mosquitoes","Bed bugs","Wasps","Spiders","Not sure"];
  const toggle = (p) => setPests(s => s.includes(p) ? s.filter(x=>x!==p) : [...s,p]);
  const submit = (e) => { e.preventDefault(); setSubmitted(true); setTimeout(()=>setSubmitted(false),6000); };

  return (
    <section id="contact" style={{background:"var(--ink)",color:"var(--cream)"}}>
      <div className="wrap">
        <div className="contact-grid">
          <div className="contact-left">
            <span className="eyebrow on-dark">Get a quote</span>
            <h3 className="display">No obligation, <span className="swash">no pressure.</span></h3>
            <p>Whether you need a one-time treatment, a quarterly plan, or just a second opinion on someone else's quote — the inspection is on us.</p>
            <a href={`tel:${phone}`} className="big-phone mono-num">{phone}</a>
            <p style={{margin:0}}>Or fill out the form. We respond within an hour during business days.</p>
            <div className="contact-meta">
              <div className="m">
                <strong>Hours</strong>
                <p>Mon–Fri 7am–7pm<br/>Sat 8am–4pm · Sun closed<br/>Emergency line 24/7</p>
              </div>
              <div className="m">
                <strong>Office</strong>
                <p>2410 N High Street<br/>Columbus, OH 43202</p>
              </div>
            </div>
          </div>
          <form className="form" onSubmit={submit}>
            <h3>Book a free inspection</h3>
            <p className="sub">Takes 45 seconds. We'll call within the hour.</p>
            <div className="form-row">
              <div className="field"><label>First name</label><input type="text" placeholder="Justin" required /></div>
              <div className="field"><label>Last name</label><input type="text" placeholder="Hugo" required /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Phone</label><input type="tel" placeholder="(614) 555-0148" required /></div>
              <div className="field"><label>Email</label><input type="email" placeholder="you@email.com" required /></div>
            </div>
            <div className="form-row">
              <div className="field full"><label>Address</label><input type="text" placeholder="123 W 3rd Ave, Columbus, OH 43212" /></div>
            </div>
            <div className="field full" style={{marginBottom:14}}>
              <label>What are you dealing with? (select any)</label>
              <div className="pests-pills">
                {PESTS.map(p=>(
                  <button type="button" key={p} className={`pill ${pests.includes(p)?"active":""}`} onClick={()=>toggle(p)}>{p}</button>
                ))}
              </div>
            </div>
            <div className="field full">
              <label>Anything else?</label>
              <textarea placeholder="Found some droppings in the attic, possibly a nest in the soffit..."></textarea>
            </div>
            <div className="submit-row">
              <small>By submitting, you agree to a follow-up call or text.<br/>We never share your info.</small>
              <button type="submit" className="btn btn--primary">Request inspection <ArrIcon /></button>
            </div>
            {submitted && (
              <div className="toast">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
                <span>Thanks — a member of the {companyName.split(" ")[0]} team will be in touch shortly.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

function App() {
  return (
    <PageShell active="contact">
      {(t)=>(
        <>
          <PageHero
            eyebrow="Contact"
            title={<>Let's see what<br/></>}
            swash="we're dealing with."
            lede="Inspection's free. Quote's flat-rate. Same-day callbacks during business hours, and a 24/7 emergency line for the stinging stuff."
            crumbs={[{href:"index.html",label:"Home"},{label:"Contact"}]}
          />
          <ContactSection companyName={t.companyName} phone={t.phone} />
        </>
      )}
    </PageShell>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
