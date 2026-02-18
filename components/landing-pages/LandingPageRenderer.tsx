'use client';

import type { LandingPageContent, LandingPageBlock } from '@/lib/landing-page-templates';

interface LandingPageRendererProps {
  content: LandingPageContent;
  isPreview?: boolean;
  onBlockClick?: (blockId: string) => void;
  selectedBlockId?: string;
  accountId?: string;
  onCtaClick?: () => void;
}

export default function LandingPageRenderer({
  content,
  isPreview = false,
  onBlockClick,
  selectedBlockId,
  accountId,
  onCtaClick,
}: LandingPageRendererProps) {
  const { blocks, styles } = content;
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  const renderBlock = (block: LandingPageBlock) => {
    const isSelected = selectedBlockId === block.id;
    const wrapperClass = isPreview && onBlockClick
      ? `relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-1'}`
      : '';

    const handleClick = (e: React.MouseEvent) => {
      if (onBlockClick) {
        e.stopPropagation();
        onBlockClick(block.id);
      }
    };

    switch (block.type) {

      case 're_hero': {
        const accent = block.data.accentColor || styles.primaryColor;
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick}
            style={{ backgroundColor: block.data.bgColor || '#0f172a', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(48px, 8vw, 80px) 24px clamp(56px, 10vw, 88px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {block.data.profileImageUrl ? (
                <img src={block.data.profileImageUrl} alt={block.data.agentName}
                  style={{ width: 'clamp(96px,15vw,130px)', height: 'clamp(96px,15vw,130px)', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${accent}`, marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} />
              ) : (
                <div style={{ width: 'clamp(96px,15vw,130px)', height: 'clamp(96px,15vw,130px)', borderRadius: '50%', background: `${accent}33`, border: `4px solid ${accent}`, marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                  👤
                </div>
              )}
              <p style={{ color: accent, fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: '10px' }}>
                {block.data.title || 'Licensed Real Estate Agent'}
              </p>
              <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', fontWeight: '800', marginBottom: '16px', lineHeight: 1.15 }}>
                {block.data.agentName || 'Your Agent Name'}
              </h1>
              <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', opacity: 0.8, marginBottom: '40px', maxWidth: '560px', lineHeight: 1.65 }}>
                {block.data.subtitle || 'Your subtitle goes here'}
              </p>
              <button
                onClick={isPreview ? undefined : (onCtaClick || undefined)}
                style={{ padding: 'clamp(12px,2vw,16px) clamp(24px,4vw,40px)', background: accent, color: '#111827', border: 'none', borderRadius: '50px', fontWeight: '700', fontSize: 'clamp(0.95rem,2vw,1.05rem)', cursor: isPreview ? 'default' : 'pointer', boxShadow: `0 4px 20px ${accent}66`, transition: 'transform 0.15s', letterSpacing: '0.02em' }}
                onMouseEnter={e => { if (!isPreview) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                {block.data.ctaText || 'View Available Homes'}
              </button>
            </div>
          </div>
        );
      }

      case 're_about': {
        const accent = block.data.accentColor || styles.primaryColor;
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ backgroundColor: '#fff', padding: 'clamp(48px,8vw,72px) 24px' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(24px,4vw,48px)', alignItems: 'center' }}>
                <div style={{ flex: '0 0 auto', margin: '0 auto' }}>
                  {block.data.agentPhotoUrl ? (
                    <img src={block.data.agentPhotoUrl} alt="Agent" style={{ width: 'clamp(160px,30vw,220px)', height: 'clamp(200px,36vw,260px)', objectFit: 'cover', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
                  ) : (
                    <div style={{ width: 'clamp(160px,30vw,220px)', height: 'clamp(180px,32vw,260px)', background: '#f3f4f6', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>👤</div>
                  )}
                </div>
                <div style={{ flex: '1 1 260px' }}>
                  <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.8rem', marginBottom: '12px' }}>About Me</p>
                  <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '800', color: '#111827', marginBottom: '16px', lineHeight: 1.2 }}>{block.data.heading || 'About Your Agent'}</h2>
                  <p style={{ color: '#4b5563', lineHeight: 1.75, marginBottom: '28px', fontSize: '1rem' }}>{block.data.bio}</p>
                  <div style={{ display: 'flex', gap: '32px', marginBottom: '28px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: accent }}>{block.data.yearsExperience}+</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>Years Experience</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: accent }}>{block.data.dealsClosed}+</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>Homes Closed</div>
                    </div>
                  </div>
                  {block.data.specialties?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {block.data.specialties.map((s: string) => (
                        <span key={s} style={{ padding: '6px 14px', background: `${accent}18`, color: accent, borderRadius: '50px', fontWeight: '600', fontSize: '0.8rem' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 're_reviews': {
        const accent = block.data.accentColor || styles.primaryColor;
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ backgroundColor: '#f9fafb', padding: 'clamp(48px,8vw,72px) 24px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: '40px' }}>
                {block.data.heading || 'What My Clients Say'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {(block.data.reviews || []).map((review: any, i: number) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '16px', padding: 'clamp(20px,3vw,28px)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', borderTop: `4px solid ${accent}` }}>
                    <div style={{ marginBottom: '14px' }}>
                      {Array.from({ length: review.rating || 5 }).map((_, si) => (
                        <span key={si} style={{ color: accent, fontSize: '1.1rem' }}>★</span>
                      ))}
                    </div>
                    <p style={{ color: '#374151', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '16px', fontSize: '0.95rem' }}>
                      &ldquo;{review.text}&rdquo;
                    </p>
                    <div>
                      <p style={{ fontWeight: '700', color: '#111827', fontSize: '0.9rem' }}>{review.author}</p>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{review.location}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={isPreview ? undefined : (onCtaClick || undefined)}
                  style={{ padding: 'clamp(12px,2vw,16px) clamp(28px,5vw,40px)', background: accent, color: '#111827', border: 'none', borderRadius: '50px', fontWeight: '700', fontSize: 'clamp(0.95rem,2vw,1.05rem)', cursor: isPreview ? 'default' : 'pointer', boxShadow: `0 4px 20px ${accent}55`, transition: 'transform 0.15s' }}
                  onMouseEnter={e => { if (!isPreview) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  {block.data.ctaText || 'Find Your Dream Home'}
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 're_location': {
        const accent = block.data.accentColor || styles.primaryColor;
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ backgroundColor: '#fff', padding: 'clamp(48px,8vw,72px) 24px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: '40px' }}>
                {block.data.heading || 'Find Me'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'stretch' }}>
                <div style={{ flex: '1 1 280px', minHeight: '280px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
                  {block.data.mapEmbedUrl ? (
                    <iframe src={block.data.mapEmbedUrl} width="100%" height="100%" style={{ border: 'none', display: 'block', minHeight: '280px' }} loading="lazy" allowFullScreen />
                  ) : (
                    <div style={{ height: '280px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', textAlign: 'center', padding: '16px', fontSize: '0.9rem' }}>
                      Add Google Maps embed URL to show map
                    </div>
                  )}
                </div>
                <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
                  {block.data.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '1.4rem' }}>📍</span>
                      <div>
                        <p style={{ fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Office Address</p>
                        <p style={{ color: '#4b5563' }}>{block.data.address}</p>
                      </div>
                    </div>
                  )}
                  {block.data.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.4rem' }}>📞</span>
                      <div>
                        <p style={{ fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Phone</p>
                        <a href={`tel:${block.data.phone}`} style={{ color: accent, fontWeight: '600', textDecoration: 'none' }}>{block.data.phone}</a>
                      </div>
                    </div>
                  )}
                  {block.data.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.4rem' }}>✉️</span>
                      <div>
                        <p style={{ fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Email</p>
                        <a href={`mailto:${block.data.email}`} style={{ color: accent, fontWeight: '600', textDecoration: 'none' }}>{block.data.email}</a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 're_footer': {
        const accent = block.data.accentColor || styles.primaryColor;
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ backgroundColor: '#0f172a', color: '#fff', padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
              <p style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '4px' }}>{block.data.agentName}</p>
              <p style={{ color: accent, fontSize: '0.875rem', marginBottom: '16px' }}>{block.data.brokerage}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {block.data.phone && <a href={`tel:${block.data.phone}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>{block.data.phone}</a>}
                {block.data.email && <a href={`mailto:${block.data.email}`} style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>{block.data.email}</a>}
              </div>
              {block.data.license && <p style={{ color: '#475569', fontSize: '0.75rem', marginBottom: '8px' }}>{block.data.license}</p>}
              <p style={{ color: '#334155', fontSize: '0.7rem' }}>© {new Date().getFullYear()} {block.data.agentName}. All rights reserved.</p>
            </div>
          </div>
        );
      }

      case 'hero':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick}
            style={{ backgroundColor: block.data.bgColor || '#1a1a2e', color: block.data.textColor || '#ffffff', padding: 'clamp(40px,8vw,80px) 24px', textAlign: 'center' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', fontWeight: 'bold', marginBottom: '16px', lineHeight: 1.2 }}>{block.data.heading || 'Your Headline Here'}</h1>
              <p style={{ fontSize: 'clamp(1rem,2vw,1.25rem)', opacity: 0.9, marginBottom: '32px' }}>{block.data.subheading || 'Your subheading goes here'}</p>
              {block.data.ctaText && (
                <a href={block.data.ctaLink || '#'} style={{ display: 'inline-block', padding: '14px 32px', backgroundColor: styles.primaryColor, color: '#ffffff', borderRadius: '8px', fontWeight: '600', fontSize: '1.1rem', textDecoration: 'none' }}>{block.data.ctaText}</a>
              )}
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ fontSize: '1rem', lineHeight: 1.7, color: '#374151' }} dangerouslySetInnerHTML={{ __html: block.data.content || '<p>Enter your text here...</p>' }} />
          </div>
        );

      case 'image':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ padding: '24px', textAlign: block.data.alignment || 'center' }}>
            {block.data.url ? (
              <img src={block.data.url} alt={block.data.alt || ''} style={{ maxWidth: '100%', borderRadius: '8px', display: 'inline-block' }} />
            ) : (
              <div style={{ width: '100%', maxWidth: '600px', height: '300px', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', margin: '0 auto' }}>Image placeholder</div>
            )}
          </div>
        );

      case 'cta':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ padding: '40px 24px', textAlign: 'center' }}>
            <a href={block.data.link || '#'} style={{ display: 'inline-block', padding: block.data.size === 'large' ? '18px 48px' : '12px 32px', backgroundColor: block.data.color || styles.primaryColor, color: '#ffffff', borderRadius: '8px', fontWeight: '600', fontSize: block.data.size === 'large' ? '1.25rem' : '1rem', textDecoration: 'none' }}>{block.data.text || 'Click Here'}</a>
          </div>
        );

      case 'form':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ padding: '40px 24px' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', padding: 'clamp(20px,4vw,32px)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center', color: '#111827' }}>{block.data.heading || 'Get in Touch'}</h3>
              <form onSubmit={(e) => { e.preventDefault(); if (isPreview) return; const fd = new FormData(e.target as HTMLFormElement); const data: Record<string, string> = {}; fd.forEach((v, k) => { data[k] = v as string; }); if (accountId) { fetch('/api/landing-pages/form-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, ...data }) }); } }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(block.data.fields || ['name', 'email']).map((field: string) => (
                  <input key={field} name={field} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} required={field === 'email'} disabled={isPreview} style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }} />
                ))}
                <button type="submit" disabled={isPreview} style={{ width: '100%', padding: '14px', backgroundColor: block.data.buttonColor || styles.primaryColor, color: '#ffffff', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', border: 'none', cursor: isPreview ? 'default' : 'pointer' }}>{block.data.buttonText || 'Submit'}</button>
              </form>
            </div>
          </div>
        );

      case 'video':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {block.data.url ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe src={block.data.url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '12px', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative', backgroundColor: '#1f2937', borderRadius: '12px' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Video placeholder</div>
                </div>
              )}
              {block.data.caption && <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '0.875rem' }}>{block.data.caption}</p>}
            </div>
          </div>
        );

      case 'testimonial':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ padding: '32px 24px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#f9fafb', borderRadius: '12px', padding: 'clamp(20px,4vw,32px)', borderLeft: `4px solid ${styles.primaryColor}` }}>
              <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#374151', marginBottom: '16px', lineHeight: 1.6 }}>&ldquo;{block.data.quote || 'Customer testimonial goes here...'}&rdquo;</p>
              <div>
                <p style={{ fontWeight: '600', color: '#111827' }}>{block.data.author || 'Customer Name'}</p>
                {block.data.role && <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{block.data.role}</p>}
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ padding: '60px 24px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {block.data.heading && <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 'bold', textAlign: 'center', marginBottom: '40px', color: '#111827' }}>{block.data.heading}</h2>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
                {(block.data.items || []).map((item: any, i: number) => (
                  <div key={i} style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '12px', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>{item.title}</h3>
                    <p style={{ color: '#6b7280', lineHeight: 1.6 }}>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'spacer':
        return <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ height: block.data.height || 40 }} />;

      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: styles.fontFamily || 'Inter, sans-serif', backgroundColor: styles.backgroundColor || '#ffffff', minHeight: isPreview ? '100%' : '100vh' }}>
      {sortedBlocks.length === 0 && isPreview && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#9ca3af', fontSize: '1.1rem' }}>
          Add blocks to start building your page
        </div>
      )}
      {sortedBlocks.map(renderBlock)}
    </div>
  );
}
