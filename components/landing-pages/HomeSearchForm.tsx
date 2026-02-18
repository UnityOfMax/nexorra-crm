'use client';

import { useState } from 'react';
import { X, ArrowLeft, CheckCircle, Loader } from 'lucide-react';

interface HomeSearchFormProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accentColor?: string;
  agentName?: string;
}

type Step = 'intent' | 'type' | 'budget' | 'timeline' | 'contact' | 'done';

interface FormData {
  intent: string;
  propertyType: string;
  budget: string;
  timeline: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

const STEPS: Step[] = ['intent', 'type', 'budget', 'timeline', 'contact', 'done'];

export default function HomeSearchForm({ isOpen, onClose, accountId, accentColor = '#f59e0b', agentName = 'Your Agent' }: HomeSearchFormProps) {
  const [step, setStep] = useState<Step>('intent');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    intent: '', propertyType: '', budget: '', timeline: '',
    firstName: '', lastName: '', phone: '', email: '',
  });

  if (!isOpen) return null;

  const accent = accentColor;
  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length - 1; // don't count 'done'
  const progress = Math.min((stepIndex / (totalSteps - 1)) * 100, 100);

  const select = (field: keyof FormData, value: string, nextStep: Step) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setStep(nextStep);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/landing-pages/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          source: 'Real Estate Landing Page',
          custom_fields: {
            intent: formData.intent,
            property_type: formData.propertyType,
            budget: formData.budget,
            timeline: formData.timeline,
          },
        }),
      });
    } catch (err) {
      console.error('Form submit error:', err);
    } finally {
      setSubmitting(false);
      setStep('done');
    }
  };

  const OptionButton = ({ label, sublabel, onClick }: { label: string; sublabel?: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '16px 20px',
        border: '2px solid #e5e7eb', borderRadius: '12px',
        background: '#fff', cursor: 'pointer',
        textAlign: 'left', transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: '2px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = accent;
        (e.currentTarget as HTMLElement).style.background = `${accent}10`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
        (e.currentTarget as HTMLElement).style.background = '#fff';
      }}
    >
      <span style={{ fontWeight: '600', fontSize: '1rem', color: '#111827' }}>{label}</span>
      {sublabel && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{sublabel}</span>}
    </button>
  );

  const renderStep = () => {
    switch (step) {
      case 'intent':
        return (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              What are you looking to do?
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Let's find the right fit for you</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <OptionButton label="🏠  Buy a Home" sublabel="Find my perfect property" onClick={() => select('intent', 'buy', 'type')} />
              <OptionButton label="💰  Sell My Home" sublabel="Get the best price for my property" onClick={() => select('intent', 'sell', 'timeline')} />
              <OptionButton label="🔄  Buy & Sell" sublabel="I need to do both" onClick={() => select('intent', 'both', 'type')} />
              <OptionButton label="🔍  Just Browsing" sublabel="Exploring my options" onClick={() => select('intent', 'browse', 'contact')} />
            </div>
          </>
        );

      case 'type':
        return (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              What type of property?
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Select all that interest you</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: '🏡', sub: 'Single Family' },
                { label: '🏢', sub: 'Condo' },
                { label: '🏘️', sub: 'Townhouse' },
                { label: '🏗️', sub: 'Multi-Family' },
                { label: '🌳', sub: 'Land' },
                { label: '💎', sub: 'Luxury / Estate' },
              ].map(({ label, sub }) => (
                <button
                  key={sub}
                  onClick={() => select('propertyType', sub, 'budget')}
                  style={{
                    padding: '20px 12px', border: '2px solid #e5e7eb', borderRadius: '12px',
                    background: '#fff', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = accent;
                    (e.currentTarget as HTMLElement).style.background = `${accent}10`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                  }}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>{sub}</div>
                </button>
              ))}
            </div>
          </>
        );

      case 'budget':
        return (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              What's your budget?
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Approximate range is fine</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Under $300K', sub: 'Affordable entry-level homes' },
                { label: '$300K – $500K', sub: 'Mid-range family homes' },
                { label: '$500K – $750K', sub: 'Larger or premium locations' },
                { label: '$750K – $1M', sub: 'Upscale properties' },
                { label: 'Over $1M', sub: 'Luxury & estates' },
              ].map(({ label, sub }) => (
                <OptionButton key={label} label={label} sublabel={sub} onClick={() => select('budget', label, 'timeline')} />
              ))}
            </div>
          </>
        );

      case 'timeline':
        return (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              When are you looking to move?
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>This helps us prioritize your search</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: '🔥  ASAP', sub: "I'm ready to move now" },
                { label: '📅  1–3 Months', sub: 'Actively searching' },
                { label: '🗓️  3–6 Months', sub: 'Planning ahead' },
                { label: '📆  6+ Months', sub: 'Early stages, no rush' },
                { label: '🧭  Just Exploring', sub: 'No timeline yet' },
              ].map(({ label, sub }) => (
                <OptionButton key={label} label={label} sublabel={sub} onClick={() => select('timeline', label, 'contact')} />
              ))}
            </div>
          </>
        );

      case 'contact':
        return (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              Last step — how do we reach you?
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              {agentName} will contact you within 24 hours
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="First Name *"
                  value={formData.firstName}
                  onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <input
                type="tel"
                placeholder="Phone Number *"
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                style={inputStyle}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.firstName || !formData.phone}
                style={{
                  width: '100%', padding: '16px',
                  background: !formData.firstName || !formData.phone ? '#d1d5db' : accent,
                  color: '#fff', border: 'none', borderRadius: '12px',
                  fontWeight: '700', fontSize: '1rem', cursor: !formData.firstName || !formData.phone ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.15s',
                }}
              >
                {submitting ? <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : 'Get My Free Consultation'}
              </button>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
                No spam. We respect your privacy.
              </p>
            </div>
          </>
        );

      case 'done':
        return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle style={{ width: '64px', height: '64px', color: accent, margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
              You're all set!
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '8px', lineHeight: 1.6 }}>
              Thanks! {agentName} will reach out to you within 24 hours to discuss your needs.
            </p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '32px' }}>
              Keep an eye on your phone and email.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '14px 32px', background: accent, color: '#fff',
                border: 'none', borderRadius: '12px', fontWeight: '700',
                fontSize: '1rem', cursor: 'pointer',
              }}
            >
              Back to Page
            </button>
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff', width: '100%', maxWidth: '520px',
          borderRadius: '24px 24px 0 0',
          maxHeight: '90vh', overflowY: 'auto',
          padding: '0',
        }}
        // On wider screens, center the modal
        className="sm-modal"
      >
        {/* Progress bar */}
        {step !== 'done' && (
          <div style={{ height: '4px', background: '#f3f4f6', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: accent, transition: 'width 0.3s ease' }} />
          </div>
        )}

        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            {step !== 'intent' && step !== 'done' ? (
              <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ArrowLeft style={{ width: '20px', height: '20px' }} />
                <span style={{ fontSize: '0.875rem' }}>Back</span>
              </button>
            ) : <div />}
            <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}>
              <X style={{ width: '20px', height: '20px', color: '#6b7280' }} />
            </button>
          </div>

          {/* Step content */}
          {renderStep()}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 640px) {
          .sm-modal {
            border-radius: 24px !important;
            margin: 20px !important;
            align-self: center !important;
          }
        }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  border: '2px solid #e5e7eb', borderRadius: '10px',
  fontSize: '1rem', boxSizing: 'border-box',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.15s',
};
