'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const TEMPLATES = {
  'dog-grooming': {
    label: 'Dog Grooming',
    emoji: '🐾',
    description: 'Boutique grooming studio',
    path: '/templates/dog-grooming/index.html',
    defaults: {
      name: 'Wagsworth & Co.',
      phone: '(614) 555-0142',
      city: 'Clintonville, Columbus, Ohio',
    },
  },
  'pest-control': {
    label: 'Pest Control',
    emoji: '🐛',
    description: 'Local pest & termite service',
    path: '/templates/pest-control/index.html',
    defaults: {
      name: 'Hugo Pest & Termite',
      phone: '(614) 555-0148',
      city: 'Columbus, Ohio',
    },
  },
} as const;

type TemplateId = keyof typeof TEMPLATES;

function toEmailSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function computeEmail(name: string): string {
  const slug = toEmailSlug(name);
  return slug ? `info@${slug}.com` : '';
}

function buildUrl(templateId: TemplateId, name: string, phone: string, city: string): string {
  const t = TEMPLATES[templateId];
  const params = new URLSearchParams();
  if (name)  params.set('name', name);
  if (phone) params.set('phone', phone);
  if (city)  params.set('city', city);
  const email = computeEmail(name);
  if (email) params.set('email', email);
  return `${t.path}?${params.toString()}`;
}

const inputStyle: React.CSSProperties = {
  background: '#1a1a1e',
  border: '1px solid #2a2a30',
  borderRadius: 8,
  padding: '9px 12px',
  color: '#f0f0f0',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  fontWeight: 500,
};

export default function EditorPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('dog-grooming');
  const [name, setName]   = useState<string>(TEMPLATES['dog-grooming'].defaults.name);
  const [phone, setPhone] = useState<string>(TEMPLATES['dog-grooming'].defaults.phone);
  const [city, setCity]   = useState<string>(TEMPLATES['dog-grooming'].defaults.city);
  const [iframeSrc, setIframeSrc] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const scheduleUpdate = useCallback((tpl: TemplateId, n: string, p: string, c: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIframeSrc(buildUrl(tpl, n, p, c));
    }, 500);
  }, []);

  useEffect(() => {
    scheduleUpdate(activeTemplate, name, phone, city);
  }, [activeTemplate, name, phone, city, scheduleUpdate]);

  const handleTemplateSwitch = (id: TemplateId) => {
    const t = TEMPLATES[id];
    setActiveTemplate(id);
    setName(t.defaults.name);
    setPhone(t.defaults.phone);
    setCity(t.defaults.city);
  };

  const openInNewTab = () => {
    window.open(buildUrl(activeTemplate, name, phone, city), '_blank');
  };

  const email = computeEmail(name);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#0c0c0e', color: '#f0f0f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 52,
        borderBottom: '1px solid #1e1e26', flexShrink: 0,
        background: '#111114',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: '#555', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
            ← Back
          </a>
          <span style={{ color: '#2a2a2a' }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#c0c0c0', letterSpacing: '0.01em' }}>
            Website Demo Editor
          </span>
        </div>

        <button
          onClick={openInNewTab}
          style={{
            background: 'linear-gradient(135deg, #5b6af8, #7c57f4)',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '7px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            letterSpacing: '0.01em',
          }}
        >
          Open in new tab
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel */}
        <div style={{
          width: 300, flexShrink: 0, background: '#111114',
          borderRight: '1px solid #1e1e26',
          display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: 28,
          overflowY: 'auto',
        }}>

          {/* Template switcher */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', margin: '0 0 10px' }}>
              Template
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.entries(TEMPLATES) as [TemplateId, typeof TEMPLATES[TemplateId]][]).map(([id, t]) => (
                <button
                  key={id}
                  onClick={() => handleTemplateSwitch(id)}
                  style={{
                    background: activeTemplate === id ? 'rgba(91,106,248,0.12)' : 'transparent',
                    border: `1px solid ${activeTemplate === id ? 'rgba(91,106,248,0.4)' : '#1e1e26'}`,
                    borderRadius: 10, padding: '10px 14px',
                    cursor: 'pointer', textAlign: 'left',
                    color: activeTemplate === id ? '#e0e0f0' : '#666',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {t.emoji} {t.label}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 3, opacity: 0.6 }}>{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Business details */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', margin: '0 0 14px' }}>
              Business Details
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Business Name</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={TEMPLATES[activeTemplate].defaults.name}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Phone Number</span>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={TEMPLATES[activeTemplate].defaults.phone}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Location</span>
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder={TEMPLATES[activeTemplate].defaults.city}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Email (auto-generated)</span>
                <input
                  value={email}
                  readOnly
                  style={{ ...inputStyle, color: '#555', background: '#14141a', cursor: 'default', border: '1px solid #1e1e26' }}
                />
              </label>

            </div>
          </div>

          {/* Hint */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{
              padding: '12px 14px', background: '#0f0f14',
              border: '1px solid #1e1e26', borderRadius: 10,
            }}>
              <p style={{ margin: 0, fontSize: 12, color: '#444', lineHeight: 1.7 }}>
                Preview updates as you type.<br/>
                Hit <span style={{ color: '#8890f8', fontWeight: 600 }}>Open in new tab</span> to present to the client — the URL carries all the details.
              </p>
            </div>
          </div>

        </div>

        {/* Preview pane */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {iframeSrc ? (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              title="Website preview"
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#2a2a2a', fontSize: 14,
            }}>
              Loading preview…
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
