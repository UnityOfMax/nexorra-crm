'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuestionnaireOption {
  emoji?: string;
  label: string;
  sub?: string;
  value: string;
}

interface StepConfig {
  enabled?: boolean;
  heading?: string;
  subheading?: string;
  options?: QuestionnaireOption[];
}

interface QuestionnaireConfig {
  intent?: StepConfig;
  situation?: StepConfig;
  timeline?: StepConfig;
  budget?: StepConfig;
  wishlist?: StepConfig;
  sell_also?: StepConfig;
  employment?: StepConfig;
  income?: StepConfig;
  call_time?: StepConfig;
  serious?: StepConfig;
}

interface PageData {
  accountId: string;
  agentName?: string;
  accentColor?: string;
  questionnaireConfig?: QuestionnaireConfig;
  slug: string;
}

type QuestionStep = 'intent' | 'situation' | 'timeline' | 'budget' | 'wishlist' | 'sell_also' | 'employment' | 'income' | 'call_time' | 'serious';
type Step = QuestionStep | 'contact' | 'success';

const ALL_STEPS: QuestionStep[] = ['intent', 'situation', 'timeline', 'budget', 'wishlist', 'sell_also', 'employment', 'income', 'call_time', 'serious'];

const DEFAULT_HEADINGS: Record<QuestionStep, { heading: string; subheading: string }> = {
  intent:     { heading: 'What are you looking to do?', subheading: "Let's get started" },
  situation:  { heading: "What's your current situation?", subheading: 'This helps us understand your needs' },
  timeline:   { heading: "What's your timeline?", subheading: 'When are you looking to move?' },
  budget:     { heading: "What's your price point?", subheading: 'Approximate budget range' },
  wishlist:   { heading: 'Tell us more', subheading: 'Any details that would help' },
  sell_also:  { heading: 'Do you also need to sell?', subheading: '' },
  employment: { heading: 'Where are you employed?', subheading: '' },
  income:     { heading: "What's your yearly income?", subheading: '' },
  call_time:  { heading: "Best time to call?", subheading: "So we reach you when it's convenient" },
  serious:    { heading: 'Are you ready to move forward?', subheading: "We'll be calling you to discuss" },
};

const DEFAULT_OPTS: Partial<Record<QuestionStep, QuestionnaireOption[]>> = {
  intent:    [{ emoji: '🏠', label: 'Buy a Home', value: 'Buy' }, { emoji: '💰', label: 'Sell My Home', value: 'Sell' }],
  situation: [{ emoji: '🏡', label: 'I own a home', value: 'Own' }, { emoji: '🏢', label: "I'm renting", value: 'Renting' }],
  timeline:  [{ emoji: '🔥', label: 'Within 30 days', value: 'Within 30 Days' }, { emoji: '📅', label: '1–2 months', value: '1–2 Months' }, { emoji: '🗓️', label: '2–4 months', value: '2–4 Months' }, { emoji: '📆', label: '4+ months', value: '4+ Months' }],
  budget:    [{ label: 'Under $300K', value: 'Under $300K' }, { label: '$300K–$500K', value: '$300K–$500K' }, { label: '$500K–$750K', value: '$500K–$750K' }, { label: '$750K–$1M', value: '$750K–$1M' }, { label: 'Over $1M', value: 'Over $1M' }],
  call_time: [{ emoji: '🌅', label: 'Morning', value: 'Morning' }, { emoji: '☀️', label: 'Afternoon', value: 'Afternoon' }, { emoji: '🌙', label: 'Evening', value: 'Evening' }],
  serious:   [{ emoji: '💯', label: 'Yes, absolutely', value: 'Yes' }, { emoji: '🤔', label: 'Still exploring', value: 'Still Exploring' }],
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function QuestionsPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeSteps, setActiveSteps] = useState<QuestionStep[]>([]);
  const [step, setStep] = useState<Step>('intent');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ first_name: '', last_name: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/landing-pages/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(d => {
        const config: QuestionnaireConfig = d.content?.questionnaireConfig || {};
        const active = ALL_STEPS.filter(s => config[s]?.enabled !== false);
        setActiveSteps(active);
        setStep(active[0] || 'contact');
        setPageData({
          accountId: d.account_id,
          agentName: d.content?.blocks?.find((b: any) => b.data?.agentName)?.data?.agentName,
          accentColor: d.content?.blocks?.find((b: any) => b.data?.accentColor)?.data?.accentColor || d.content?.styles?.primaryColor || '#DC5A2A',
          questionnaireConfig: config,
          slug,
        });
      })
      .catch(() => setError('Page not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const accent = pageData?.accentColor || '#DC5A2A';
  const cfg = useCallback((s: QuestionStep) => pageData?.questionnaireConfig?.[s], [pageData]);
  const heading = (s: QuestionStep) => cfg(s)?.heading || DEFAULT_HEADINGS[s].heading;
  const subheading = (s: QuestionStep) => cfg(s)?.subheading || DEFAULT_HEADINGS[s].subheading;
  const opts = (s: QuestionStep): QuestionnaireOption[] => cfg(s)?.options || DEFAULT_OPTS[s] || [];
  const isTextStep = (s: QuestionStep) => s === 'wishlist' || s === 'employment';

  const stepIndex = activeSteps.indexOf(step as QuestionStep);
  const totalSteps = activeSteps.length + 1; // +1 for contact
  const progress = step === 'contact' ? 100 : step === 'success' ? 100 : Math.round(((stepIndex) / totalSteps) * 100);

  const nextAfter = (current: QuestionStep): Step => {
    const idx = activeSteps.indexOf(current);
    if (idx < activeSteps.length - 1) return activeSteps[idx + 1];
    return 'contact';
  };

  const goBack = () => {
    if (step === 'contact') {
      advance(activeSteps[activeSteps.length - 1] || 'intent', 'back');
    } else {
      const idx = activeSteps.indexOf(step as QuestionStep);
      if (idx > 0) advance(activeSteps[idx - 1], 'back');
    }
  };

  function advance(next: Step, dir: 'forward' | 'back' = 'forward') {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 200);
  }

  function select(field: string, value: string, current: QuestionStep) {
    setAnswers(a => ({ ...a, [field]: value }));
    setTimeout(() => advance(nextAfter(current)), 120);
  }

  async function submit() {
    if (!contact.first_name.trim() || !contact.phone.trim()) return;
    if (!pageData) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/landing-pages/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: pageData.accountId,
          first_name: contact.first_name.trim(),
          last_name: contact.last_name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim(),
          source: 'Questions Page',
          slug,
          custom_fields: {
            'Type of Work': answers.intent,
            'Property Type': answers.situation,
            'Timeline': answers.timeline,
            'Budget': answers.budget,
            'Details': answers.wishlist,
            'Employer': answers.employment,
            'Income': answers.income,
            'Best Call Time': answers.call_time,
            'Ready': answers.serious,
          },
        }),
      });
      if (res.ok) {
        advance('success');
      } else {
        const d = await res.json();
        setSubmitError(d.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100dvh', background: '#0F1923', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Page not found</div>
      </div>
    </div>
  );

  const canBack = step !== activeSteps[0] && step !== 'success';
  const slideOut = animating ? (direction === 'forward' ? '-60px' : '60px') : '0';
  const slideOpacity = animating ? 0 : 1;

  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 16px', fontSize: 16, border: '2px solid rgba(255,255,255,0.12)',
    borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#fff', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#0F1923', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.08)', zIndex: 10 }}>
        <div style={{ height: '100%', background: accent, width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 680, margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.04em' }}>
          {step === 'success' ? 'Complete' : step === 'contact' ? `Step ${activeSteps.length + 1} of ${totalSteps}` : stepIndex >= 0 ? `Step ${stepIndex + 1} of ${totalSteps}` : ''}
        </div>
        {canBack && (
          <button onClick={goBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 48px' }}>
        <div style={{
          width: '100%', maxWidth: 620,
          transform: `translateX(${slideOut})`,
          opacity: slideOpacity,
          transition: animating ? 'transform 0.2s ease, opacity 0.2s ease' : 'none',
        }}>

          {/* Question steps */}
          {activeSteps.includes(step as QuestionStep) && (() => {
            const s = step as QuestionStep;
            const options = opts(s);
            const isText = isTextStep(s);

            return (
              <div>
                <div style={{ marginBottom: 32 }}>
                  <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.02em' }}>
                    {heading(s)}
                  </h1>
                  {subheading(s) && (
                    <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{subheading(s)}</p>
                  )}
                </div>

                {isText ? (
                  <div>
                    <textarea
                      autoFocus
                      rows={4}
                      value={answers[s] || ''}
                      onChange={e => setAnswers(a => ({ ...a, [s]: e.target.value }))}
                      placeholder="Type your answer here…"
                      style={{ ...inp, resize: 'vertical', minHeight: 120 }}
                      onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    />
                    <button
                      onClick={() => advance(nextAfter(s))}
                      style={{ marginTop: 16, padding: '14px 32px', background: accent, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Continue →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: options.length <= 2 ? '1fr 1fr' : options.length === 5 ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {options.map(opt => {
                      const isSelected = answers[s] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => select(s, opt.value, s)}
                          style={{
                            padding: '18px 20px', textAlign: 'left', cursor: 'pointer',
                            border: `2px solid ${isSelected ? accent : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 14, background: isSelected ? `${accent}22` : 'rgba(255,255,255,0.04)',
                            color: '#fff', fontFamily: 'inherit', transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = `${accent}80`; }}
                          onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                          {opt.emoji && <div style={{ fontSize: 24, marginBottom: 8 }}>{opt.emoji}</div>}
                          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{opt.label}</div>
                          {opt.sub && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{opt.sub}</div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Contact step */}
          {step === 'contact' && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.02em' }}>
                  Almost done — where should we send your quote?
                </h1>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>We'll call you within the hour to confirm your free estimate.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input style={inp} placeholder="First name *" value={contact.first_name}
                    onChange={e => setContact(c => ({ ...c, first_name: e.target.value }))}
                    onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }} />
                  <input style={inp} placeholder="Last name" value={contact.last_name}
                    onChange={e => setContact(c => ({ ...c, last_name: e.target.value }))}
                    onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }} />
                </div>
                <input style={inp} type="tel" placeholder="Phone number *" value={contact.phone}
                  onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
                  onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }} />
                <input style={inp} type="email" placeholder="Email address" value={contact.email}
                  onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                  onFocus={e => { e.currentTarget.style.borderColor = accent; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }} />

                {submitError && (
                  <div style={{ fontSize: 13.5, color: '#ff6b6b', padding: '10px 14px', background: 'rgba(255,100,100,0.1)', borderRadius: 8 }}>{submitError}</div>
                )}

                <button
                  onClick={submit}
                  disabled={submitting || !contact.first_name.trim() || !contact.phone.trim()}
                  style={{
                    padding: '16px', background: accent, color: '#fff', border: 'none', borderRadius: 14,
                    fontSize: 17, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
                    opacity: submitting || !contact.first_name.trim() || !contact.phone.trim() ? 0.6 : 1,
                    fontFamily: 'inherit', marginTop: 4, transition: 'opacity 0.2s',
                  }}>
                  {submitting ? 'Sending…' : 'Get My Free Quote →'}
                </button>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>No spam. No obligation. We hate pushy sales tactics.</p>
              </div>
            </div>
          )}

          {/* Success step */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${accent}22`, border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: 36 }}>
                ✓
              </div>
              <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 700, marginBottom: 14, letterSpacing: '-0.02em' }}>
                You're all set, {contact.first_name}!
              </h1>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 440, margin: '0 auto 32px' }}>
                We received your request and will call you within the hour to schedule your free roof inspection.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { icon: '📞', text: 'Expect a call shortly' },
                  { icon: '🏠', text: 'Free on-site estimate' },
                  { icon: '✅', text: 'No obligation' },
                ].map((b, i) => (
                  <div key={i} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span>{b.icon}</span>{b.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {step !== 'success' && (
        <div style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
            Your information is secure and will never be shared with third parties.
          </p>
        </div>
      )}
    </div>
  );
}
