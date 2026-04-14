'use client';

import { useState, useEffect } from 'react';
import { X, ArrowLeft, Loader } from 'lucide-react';
import CalendarBooking from './CalendarBooking';
import type { LandingPageContent, QuestionnaireConfig, QuestionnaireOption } from '@/lib/landing-page-templates';

interface HomeSearchFormProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accentColor?: string;
  agentName?: string;
  agentPhoto?: string;
  pageId?: string;
  slug?: string;
  pixelIds?: string[];
  calendarSettings?: LandingPageContent['calendarSettings'];
  questionnaireConfig?: QuestionnaireConfig;
}

type QuestionStep = 'intent' | 'situation' | 'timeline' | 'budget' | 'wishlist' | 'sell_also' | 'employment' | 'income' | 'call_time' | 'serious';
type Step = QuestionStep | 'contact' | 'calendar' | 'confirmed';

const ALL_QUESTION_STEPS: QuestionStep[] = [
  'intent', 'situation', 'timeline', 'budget', 'wishlist',
  'sell_also', 'employment', 'income', 'call_time', 'serious',
];

// Default options for each choice-based step
const DEFAULT_OPTS: Partial<Record<QuestionStep, QuestionnaireOption[]>> = {
  intent: [
    { emoji: '🏠', label: 'Buy a Home', sub: 'Find my perfect property', value: 'Buy' },
    { emoji: '💰', label: 'Sell My Home', sub: 'Get the best price', value: 'Sell' },
    { emoji: '🔄', label: 'Buy & Sell', sub: 'I need to do both', value: 'Buy & Sell' },
  ],
  situation: [
    { emoji: '🏡', label: 'I own a home', value: 'Own a Home' },
    { emoji: '🏢', label: "I'm renting", value: 'Renting' },
    { emoji: '🔍', label: 'Other', value: 'Other' },
  ],
  timeline: [
    { emoji: '🔥', label: 'Within 30 days', sub: "I'm ready to move fast", value: 'Within 30 Days' },
    { emoji: '📅', label: '1–2 months', value: '1–2 Months' },
    { emoji: '🗓️', label: '2–4 months', value: '2–4 Months' },
    { emoji: '📆', label: '4+ months', sub: 'Planning ahead', value: '4+ Months' },
  ],
  budget: [
    { label: 'Under $300K', sub: 'Starter / entry-level', value: 'Under $300K' },
    { label: '$300K – $500K', sub: 'Mid-range family homes', value: '$300K – $500K' },
    { label: '$500K – $750K', sub: 'Larger or premium locations', value: '$500K – $750K' },
    { label: '$750K – $1M', sub: 'Upscale properties', value: '$750K – $1M' },
    { label: 'Over $1M', sub: 'Luxury & estates', value: 'Over $1M' },
  ],
  sell_also: [
    { emoji: '✅', label: 'Yes, I need to sell as well', value: 'Yes' },
    { emoji: '❌', label: 'No, just looking to buy', value: 'No' },
  ],
  income: [
    { label: '$0 – $50K', value: '$0 – $50K' },
    { label: '$50K – $80K', value: '$50K – $80K' },
    { label: '$80K – $100K', value: '$80K – $100K' },
    { label: '$100K – $150K', value: '$100K – $150K' },
    { label: '$150K+', value: '$150K+' },
  ],
  call_time: [
    { emoji: '🌅', label: 'Morning', value: 'Morning' },
    { emoji: '☀️', label: 'Afternoon', value: 'Afternoon' },
    { emoji: '🌙', label: 'Evening', value: 'Evening' },
  ],
  serious: [
    { emoji: '💯', label: 'Yes, absolutely', sub: "I'm ready to take action", value: 'Yes' },
    { emoji: '🤔', label: 'Still exploring', sub: 'Not fully decided yet', value: 'Still Exploring' },
  ],
};

const DEFAULT_HEADINGS: Record<QuestionStep, { heading: string; subheading: string }> = {
  intent: { heading: 'What are you looking to do?', subheading: "Let's get started" },
  situation: { heading: "What's your current situation?", subheading: 'This helps us understand your needs' },
  timeline: { heading: "What's your timeline?", subheading: 'When are you looking to move?' },
  budget: { heading: "What's your price point?", subheading: 'Approximate budget range' },
  wishlist: { heading: 'Describe your wishlist', subheading: 'Beds, bathrooms, garage, ensuite, neighbourhood — anything goes' },
  sell_also: { heading: 'Do you also need to sell a home?', subheading: 'We can help with both sides of the transaction' },
  employment: { heading: 'Where are you currently employed?', subheading: 'Company name or industry is fine' },
  income: { heading: "What's your yearly income?", subheading: 'Used to help assess your buying power' },
  call_time: { heading: "When's the best time to call?", subheading: "So we reach you when it's convenient" },
  serious: { heading: 'Are you serious about making a move?', subheading: "We'll be calling you to discuss — just want to set expectations" },
};

interface FormData {
  intent: string;
  situation: string;
  timeline: string;
  budget: string;
  wishlist: string;
  sell_also: string;
  employment: string;
  income: string;
  call_time: string;
  serious: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

function fireFbq(event: string, params?: Record<string, any>) {
  try {
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', event, params);
    }
  } catch (_) {}
}

function trackEvent(pageId: string | undefined, slug: string | undefined, event_type: string, metadata?: Record<string, any>) {
  if (!pageId && !slug) return;
  fetch('/api/landing-pages/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_id: pageId, slug, event_type, metadata: metadata || {} }),
  }).catch(() => {});
}

export default function HomeSearchForm({
  isOpen, onClose, accountId, accentColor = '#f59e0b',
  agentName = 'Your Agent', agentPhoto, pageId, slug, pixelIds, calendarSettings, questionnaireConfig,
}: HomeSearchFormProps) {
  // Build active steps from config (skip disabled)
  const activeQuestionSteps: QuestionStep[] = ALL_QUESTION_STEPS.filter(
    s => questionnaireConfig?.[s]?.enabled !== false
  );
  const QUESTION_STEPS: Step[] = [...activeQuestionSteps, 'contact'];
  const TOTAL_QUESTIONS = QUESTION_STEPS.length;

  const [step, setStep] = useState<Step>(() => activeQuestionSteps[0] || 'contact');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedContactId, setSubmittedContactId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    intent: '', situation: '', timeline: '', budget: '', wishlist: '',
    sell_also: '', employment: '', income: '', call_time: '', serious: '',
    first_name: '', last_name: '', phone: '', email: '',
  });

  // Meta attribution state — captured once on open
  const [metaEventId] = useState(() => crypto.randomUUID());
  const [metaFbp, setMetaFbp] = useState<string | null>(null);
  const [metaFbc, setMetaFbc] = useState<string | null>(null);

  // Track step views whenever step changes
  useEffect(() => {
    if (isOpen && step) {
      trackEvent(pageId, slug, 'step_view', { step });
    }
  }, [step, isOpen]);

  // Reset when opened; capture fbp/fbc
  useEffect(() => {
    if (isOpen) {
      setStep(activeQuestionSteps[0] || 'contact');
      setSubmittedContactId(null);
      setSubmitError('');
      setFormData({
        intent: '', situation: '', timeline: '', budget: '', wishlist: '',
        sell_also: '', employment: '', income: '', call_time: '', serious: '',
        first_name: '', last_name: '', phone: '', email: '',
      });
      trackEvent(pageId, slug, 'cta_click');

      // Capture _fbp cookie (Meta browser pixel cookie)
      const fbpCookie = document.cookie
        .split('; ')
        .find((c) => c.startsWith('_fbp='))
        ?.split('=')?.[1] || null;
      setMetaFbp(fbpCookie);

      // Capture fbclid from URL and format as fbc
      const fbclid = new URLSearchParams(window.location.search).get('fbclid');
      if (fbclid) {
        setMetaFbc(`fb.1.${Date.now()}.${fbclid}`);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const accent = accentColor;
  const stepIndex = QUESTION_STEPS.indexOf(step);
  const progressPct = stepIndex < 0 ? 100 : Math.round(((stepIndex) / TOTAL_QUESTIONS) * 100);

  const next = (nextStep: Step) => setStep(nextStep);
  const goBack = () => {
    const idx = QUESTION_STEPS.indexOf(step);
    if (idx > 0) setStep(QUESTION_STEPS[idx - 1]);
  };

  // Get the next step after the current question step (or 'contact' if last)
  const nextAfter = (current: QuestionStep): Step => {
    const idx = activeQuestionSteps.indexOf(current);
    if (idx < activeQuestionSteps.length - 1) return activeQuestionSteps[idx + 1];
    return 'contact';
  };

  const select = (field: keyof FormData, value: string, current: QuestionStep) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    next(nextAfter(current));
  };

  // Config helpers
  const cfg = (s: QuestionStep) => questionnaireConfig?.[s];
  const heading = (s: QuestionStep) => cfg(s)?.heading || DEFAULT_HEADINGS[s].heading;
  const subheading = (s: QuestionStep) => cfg(s)?.subheading || DEFAULT_HEADINGS[s].subheading;
  const opts = (s: QuestionStep): QuestionnaireOption[] => cfg(s)?.options || DEFAULT_OPTS[s] || [];

  const handleSubmit = async () => {
    if (!formData.first_name.trim() || !formData.phone.trim() || !formData.email.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/landing-pages/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          agentName,
          source: 'Real Estate Landing Page',
          fbc: metaFbc || undefined,
          fbp: metaFbp || undefined,
          event_id: metaEventId,
          custom_fields: {
            'Intent': formData.intent,
            'Current Situation': formData.situation,
            'Timeline': formData.timeline,
            'Budget': formData.budget,
            'Wishlist': formData.wishlist,
            'Also Selling': formData.sell_also,
            'Employer': formData.employment,
            'Annual Income': formData.income,
            'Best Call Time': formData.call_time,
            'Serious Buyer': formData.serious,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.contactId) {
        setSubmittedContactId(data.contactId);
        trackEvent(pageId, slug, 'form_submit', { contact_id: data.contactId });
        // Fire browser-side Lead pixel event with matching eventID for CAPI deduplication
        fireFbq('Lead', { content_name: 'Real Estate Form', eventID: metaEventId });
        setStep('calendar');
      } else {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingConfirmed = () => {
    trackEvent(pageId, slug, 'booking_confirmed');
    // Fire Schedule pixel event
    fireFbq('Schedule', { content_name: 'Call Booked' });
    setStep('confirmed');
  };

  // ── UI helpers ───────────────────────────────────────────────────────────────

  const BtnOption = ({ emoji, label, sub, onClick }: { emoji?: string; label: string; sub?: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="re-form-btn"
      style={{ width: '100%', textAlign: 'left', padding: '20px 22px', border: `1.5px solid rgba(37,99,235,0.14)`, borderRadius: '16px', background: 'rgba(37,99,235,0.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.15s', minHeight: '76px' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; (e.currentTarget as HTMLElement).style.background = `${accent}12`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.14)'; (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.03)'; }}
    >
      {emoji && <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: '600', fontSize: '1rem', color: '#1E3A6E' }}>{label}</span>
        {sub && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{sub}</span>}
      </div>
    </button>
  );

  const GridBtn = ({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="re-form-btn"
      style={{ padding: '24px 12px', border: `1.5px solid rgba(37,99,235,0.14)`, borderRadius: '16px', background: 'rgba(37,99,235,0.03)', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.15s', minHeight: '96px', justifyContent: 'center' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accent; (e.currentTarget as HTMLElement).style.background = `${accent}12`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.14)'; (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.03)'; }}
    >
      <span style={{ fontSize: '2rem', lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1E3A6E' }}>{label}</span>
    </button>
  );

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '16px 18px', border: '1.5px solid #CBD5E1',
    borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit', color: '#1E3A6E',
    background: '#FFFFFF',
  };

  const isQuestion = QUESTION_STEPS.includes(step);

  // ── Step content ─────────────────────────────────────────────────────────────

  const renderStep = () => {
    // Generic choice step renderer
    const choiceStep = (key: QuestionStep, gridCols?: string) => {
      const stepOpts = opts(key);
      const isGrid = gridCols != null;
      return (
        <>
          <h2 style={headStyle}>{heading(key)}</h2>
          <p style={subStyle}>{subheading(key)}</p>
          <div style={{ display: isGrid ? 'grid' : 'flex', gridTemplateColumns: gridCols, flexDirection: isGrid ? undefined : 'column', gap: '10px' }}>
            {stepOpts.map(o => (
              isGrid
                ? <GridBtn key={o.value} emoji={o.emoji || ''} label={o.label} onClick={() => select(key, o.value, key)} />
                : <BtnOption key={o.value} emoji={o.emoji} label={o.label} sub={o.sub} onClick={() => select(key, o.value, key)} />
            ))}
          </div>
        </>
      );
    };

    switch (step) {
      case 'intent':      return choiceStep('intent');
      case 'situation':   return choiceStep('situation');
      case 'timeline':    return choiceStep('timeline');
      case 'budget':      return choiceStep('budget');
      case 'sell_also':   return choiceStep('sell_also');
      case 'income':      return choiceStep('income');
      case 'serious':     return choiceStep('serious');

      case 'call_time':   return choiceStep('call_time', '1fr 1fr 1fr');

      case 'wishlist':
        return (
          <>
            <h2 style={headStyle}>{heading('wishlist')}</h2>
            <p style={subStyle}>{subheading('wishlist')}</p>
            <textarea
              value={formData.wishlist}
              onChange={e => setFormData(p => ({ ...p, wishlist: e.target.value }))}
              placeholder="e.g. 3 beds, 2 baths, double garage, ensuite master, quiet street, near good schools..."
              style={{ ...inputSt, minHeight: '130px', resize: 'vertical', lineHeight: 1.65 }}
              autoFocus
            />
            <button
              onClick={() => next(nextAfter('wishlist'))}
              disabled={!formData.wishlist.trim()}
              style={{ ...ctaBtnStyle(accent), marginTop: '12px', opacity: formData.wishlist.trim() ? 1 : 0.4 }}
            >
              Continue
            </button>
          </>
        );

      case 'employment':
        return (
          <>
            <h2 style={headStyle}>{heading('employment')}</h2>
            <p style={subStyle}>{subheading('employment')}</p>
            <input
              type="text"
              value={formData.employment}
              onChange={e => setFormData(p => ({ ...p, employment: e.target.value }))}
              placeholder="e.g. Google, Self-employed, Healthcare..."
              style={inputSt}
              autoFocus
            />
            <button
              onClick={() => next(nextAfter('employment'))}
              disabled={!formData.employment.trim()}
              style={{ ...ctaBtnStyle(accent), marginTop: '12px', opacity: formData.employment.trim() ? 1 : 0.4 }}
            >
              Continue
            </button>
          </>
        );

      case 'contact':
        return (
          <>
            <h2 style={headStyle}>Last step — your contact info</h2>
            <p style={subStyle}>{agentName} will reach out to confirm your call</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" placeholder="First Name *" value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} style={inputSt} autoFocus />
                <input type="text" placeholder="Last Name" value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} style={inputSt} />
              </div>
              <input type="tel" placeholder="Phone Number *" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} style={inputSt} />
              <input type="email" placeholder="Email Address *" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={inputSt} />
              {submitError && (
                <div style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '10px', padding: '12px 16px', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {submitError}
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.first_name.trim() || !formData.phone.trim() || !formData.email.trim()}
                style={{ ...ctaBtnStyle(accent), marginTop: '4px', opacity: !formData.first_name.trim() || !formData.phone.trim() || !formData.email.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {submitting ? <Loader style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : 'See Available Times →'}
              </button>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>No spam. Your information is kept private.</p>
            </div>
          </>
        );

      case 'calendar':
        return (
          <CalendarBooking
            accountId={accountId}
            contactId={submittedContactId}
            contactName={formData.first_name}
            agentName={agentName}
            agentPhoto={agentPhoto}
            accentColor={accent}
            formAnswers={formData as unknown as Record<string, string>}
            onBooked={handleBookingConfirmed}
            calendarSettings={calendarSettings}
          />
        );

      case 'confirmed':
        return (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ width: '72px', height: '72px', background: `${accent}12`, border: `2px solid ${accent}33`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 24px' }}>📅</div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#1E3A6E', marginBottom: '12px', letterSpacing: '-0.02em' }}>Call Confirmed!</h2>
            <p style={{ color: '#475569', lineHeight: 1.65, marginBottom: '8px' }}>
              Your call with <strong style={{ color: '#1E3A6E' }}>{agentName}</strong> is booked.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '36px' }}>
              Keep an eye on your phone — we'll see you then!
            </p>
            <button onClick={onClose} style={ctaBtnStyle(accent)}>Done</button>
          </div>
        );
    }
  };

  const showBack = isQuestion && QUESTION_STEPS.indexOf(step) > 0;

  return (
    <div
      className="re-form-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ background: '#FFFFFF', width: '100%', maxWidth: '520px', borderRadius: '28px 28px 0 0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        className="re-modal"
      >
        {/* Progress bar */}
        {isQuestion && (
          <div style={{ height: '3px', background: 'rgba(37,99,235,0.08)', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: accent, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)', borderRadius: '0 3px 3px 0' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '18px 24px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(30,58,110,0.07)' }}>
          {showBack ? (
            <button onClick={goBack} style={{ background: 'rgba(37,99,235,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', padding: '8px 12px', borderRadius: '10px' }}>
              <ArrowLeft style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Back</span>
            </button>
          ) : <div />}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isQuestion && (
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: accent, background: `${accent}12`, border: `1px solid ${accent}22`, padding: '4px 10px', borderRadius: '50px', letterSpacing: '0.05em' }}>
                {progressPct}%
              </span>
            )}
            <button onClick={onClose} style={{ background: 'rgba(37,99,235,0.06)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex', color: '#475569' }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        <div style={{ padding: '28px 24px 44px', overflowY: 'auto', flexGrow: 1 }}>
          {renderStep()}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .re-form-overlay { background: rgba(15,23,42,0.6); backdrop-filter: blur(16px); }
        .re-modal { font-family: 'DM Sans', system-ui, sans-serif; height: 100dvh; }
        .re-form-btn:active { transform: scale(0.97); }
        .re-modal input::placeholder { color: #94a3b8; }
        .re-modal textarea::placeholder { color: #94a3b8; }
        @media (max-width: 599px) {
          .re-form-overlay { align-items: flex-end !important; }
          .re-modal { border-radius: 28px 28px 0 0 !important; height: 100dvh !important; }
        }
        @media (min-width: 600px) {
          .re-form-overlay { align-items: center !important; }
          .re-modal { border-radius: 28px !important; height: auto !important; max-height: 92vh !important; }
        }
      `}</style>
    </div>
  );
}

const headStyle: React.CSSProperties = { fontSize: 'clamp(1.3rem, 4vw, 1.6rem)', fontWeight: '800', color: '#1E3A6E', marginBottom: '8px', letterSpacing: '-0.02em', lineHeight: 1.2 };
const subStyle: React.CSSProperties = { color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' };
const ctaBtnStyle = (accent: string): React.CSSProperties => ({
  width: '100%', padding: '18px', background: accent, color: '#ffffff',
  border: 'none', borderRadius: '14px', fontWeight: '700', fontSize: '1.05rem',
  cursor: 'pointer', transition: 'opacity 0.15s', letterSpacing: '0.01em',
});
