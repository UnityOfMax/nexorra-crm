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

export default function EditorPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('dog-grooming');
  const [name, setName]   = useState<string>(TEMPLATES['dog-grooming'].defaults.name);
  const [phone, setPhone] = useState<string>(TEMPLATES['dog-grooming'].defaults.phone);
  const [city, setCity]   = useState<string>(TEMPLATES['dog-grooming'].defaults.city);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewWin = useRef<Window | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const getCurrentUrl = useCallback(() => {
    return buildUrl(activeTemplate, name, phone, city);
  }, [activeTemplate, name, phone, city]);

  // When values change, update the popup if it's already open
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (previewWin.current && !previewWin.current.closed) {
        previewWin.current.location.href = getCurrentUrl();
      } else if (previewWin.current?.closed) {
        setPreviewOpen(false);
      }
    }, 600);
  }, [activeTemplate, name, phone, city, getCurrentUrl]);

  const handleTemplateSwitch = (id: TemplateId) => {
    const t = TEMPLATES[id];
    setActiveTemplate(id);
    setName(t.defaults.name);
    setPhone(t.defaults.phone);
    setCity(t.defaults.city);
  };

  const launchPreview = () => {
    const url = getCurrentUrl();
    if (previewWin.current && !previewWin.current.closed) {
      previewWin.current.location.href = url;
      previewWin.current.focus();
    } else {
      previewWin.current = window.open(url, 'nexorra_demo', 'width=1400,height=900,menubar=no,toolbar=no');
      setPreviewOpen(true);
    }
  };

  const openInNewTab = () => {
    window.open(getCurrentUrl(), '_blank');
  };

  const copyUrl = () => {
    const url = new URL(getCurrentUrl(), window.location.origin).href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const email = computeEmail(name);
  const template = TEMPLATES[activeTemplate];

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
          <a href="/" style={{ color: '#555', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>← Back</a>
          <span style={{ color: '#222' }}>|</span>
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
          }}
        >
          Open in new tab
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left panel — form */}
        <div style={{
          width: 300, flexShrink: 0, background: '#111114',
          borderRight: '1px solid #1e1e26',
          display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: 28,
          overflowY: 'auto',
        }}>
          {/* Template switcher */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', margin: '0 0 10px' }}>Template</p>
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
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.emoji} {t.label}</div>
                  <div style={{ fontSize: 12, marginTop: 3, opacity: 0.6 }}>{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', margin: '0 0 14px' }}>Business Details</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Business Name</span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={template.defaults.name} style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Phone Number</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={template.defaults.phone} style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Location</span>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder={template.defaults.city} style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Email (auto)</span>
                <input value={email} readOnly style={{ ...inputStyle, color: '#555', background: '#14141a', cursor: 'default', border: '1px solid #1e1e26' }} />
              </label>
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#444', lineHeight: 1.6 }}>
              Fill in the details, launch the preview to see it live, then use <strong style={{ color: '#888' }}>Open in new tab</strong> to present to the client.
            </p>
          </div>
        </div>

        {/* Right panel — preview launcher */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 24, padding: 40,
        }}>

          {/* Browser mockup */}
          <div style={{
            width: '100%', maxWidth: 680,
            background: '#111114', border: '1px solid #1e1e26',
            borderRadius: 12, overflow: 'hidden',
          }}>
            {/* Browser chrome */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderBottom: '1px solid #1e1e26',
              background: '#0f0f12',
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3a3a3e', display: 'block' }}/>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3a3a3e', display: 'block' }}/>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3a3a3e', display: 'block' }}/>
              </div>
              <div style={{
                flex: 1, background: '#1a1a1e', borderRadius: 6,
                padding: '5px 10px', fontSize: 11, color: '#555',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'monospace',
              }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1z" stroke="#555" strokeWidth="1.3" fill="none"/>
                  <path d="M8 1c-2 0-3.5 3.13-3.5 7S6 15 8 15s3.5-3.13 3.5-7S10 1 8 1z" stroke="#555" strokeWidth="1.3" fill="none"/>
                  <path d="M1 8h14" stroke="#555" strokeWidth="1.3"/>
                </svg>
                <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  app.ainexorra.com{template.path}
                </span>
              </div>
            </div>
            {/* Content area */}
            <div style={{
              height: 320, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'repeating-linear-gradient(45deg, #0f0f12, #0f0f12 10px, #111114 10px, #111114 20px)',
              position: 'relative', gap: 16,
            }}>
              {previewOpen ? (
                <>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(91,106,248,0.15)', border: '1px solid rgba(91,106,248,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {template.emoji}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 15, color: '#c0c0c0' }}>Preview is open</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#555' }}>Changes update automatically in the preview window</p>
                  </div>
                  <button
                    onClick={launchPreview}
                    style={{
                      background: 'transparent', color: '#8890f8',
                      border: '1px solid rgba(91,106,248,0.35)', borderRadius: 8,
                      padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Focus preview window
                  </button>
                </>
              ) : (
                <>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'rgba(91,106,248,0.1)', border: '1px solid rgba(91,106,248,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                  }}>
                    {template.emoji}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 15, color: '#888' }}>{name || template.defaults.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#444' }}>{template.label} template ready</p>
                  </div>
                  <button
                    onClick={launchPreview}
                    style={{
                      background: 'linear-gradient(135deg, #5b6af8, #7c57f4)',
                      color: '#fff', border: 'none', borderRadius: 8,
                      padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M8 3l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Launch Preview
                  </button>
                </>
              )}
            </div>
          </div>

          {/* URL copy row */}
          <div style={{
            width: '100%', maxWidth: 680,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <div style={{
              flex: 1, background: '#111114', border: '1px solid #1e1e26', borderRadius: 8,
              padding: '8px 12px', fontSize: 12, color: '#444',
              fontFamily: 'monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
              {typeof window !== 'undefined' ? new URL(getCurrentUrl(), window.location.origin).href : getCurrentUrl()}
            </div>
            <button
              onClick={copyUrl}
              style={{
                background: copied ? '#1a2e1a' : '#1a1a1e',
                border: `1px solid ${copied ? '#2a4a2a' : '#2a2a30'}`,
                color: copied ? '#4caf50' : '#888',
                borderRadius: 8, padding: '8px 14px',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copied' : 'Copy URL'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
