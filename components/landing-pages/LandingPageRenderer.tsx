'use client';

import type { LandingPageContent, LandingPageBlock, LandingPageSection, LandingPageColumn } from '@/lib/landing-page-templates';

interface LandingPageRendererProps {
  content: LandingPageContent;
  isPreview?: boolean;
  onBlockClick?: (blockId: string) => void;
  selectedBlockId?: string;
  accountId?: string;
  onCtaClick?: () => void;
  onSectionClick?: (sectionId: string) => void;
  selectedSectionId?: string;
}

export default function LandingPageRenderer({
  content,
  isPreview = false,
  onBlockClick,
  selectedBlockId,
  accountId,
  onCtaClick,
  onSectionClick,
  selectedSectionId,
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
        const accent = block.data.accentColor || styles.primaryColor || '#C4804A';
        const bg = block.data.bgColor || '#1A0F0A';
        const noiseTexture = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")";
        return (
          <div key={block.id} className={`${wrapperClass} re-font`} onClick={handleClick}
            style={{ backgroundColor: bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: 'clamp(48px,8vh,80px) clamp(16px,4vw,32px)' }}>
            {/* Noise texture */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: noiseTexture, pointerEvents: 'none', opacity: 0.7 }} />
            {/* Radial warm glow */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '120%', height: '120%', background: `radial-gradient(ellipse at 30% 50%, ${accent}12 0%, transparent 60%)`, pointerEvents: 'none' }} />

            {/* Floating card */}
            <div className="re-hero-card" style={{ background: `rgba(44,24,16,0.96)`, border: `1px solid ${accent}33`, borderRadius: '20px', maxWidth: '940px', width: '100%', boxShadow: `0 60px 120px rgba(0,0,0,0.7), inset 0 1px 0 ${accent}22`, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
              {/* Photo side */}
              {block.data.profileImageUrl && (
                <div className="re-hero-photo-side" style={{ flex: '0 0 340px', position: 'relative', overflow: 'hidden' }}>
                  <img src={block.data.profileImageUrl} alt={block.data.agentName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: '520px' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, transparent 60%, rgba(44,24,16,0.98))` }} />
                </div>
              )}

              {/* Text side */}
              <div style={{ flex: '1 1 0', padding: 'clamp(36px,5vw,64px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {block.data.title && (
                  <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.63rem', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '28px', height: '1px', background: accent, display: 'inline-block', opacity: 0.7 }} />
                    {block.data.title}
                  </p>
                )}
                <h1 className="re-serif" style={{ fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: '400', color: '#F5EAD8', lineHeight: 1.04, letterSpacing: '-0.01em', marginBottom: '14px', fontFamily: '"DM Serif Display", Georgia, serif' }}>
                  {block.data.agentName || 'Your Agent'}
                </h1>
                {block.data.corporationText && (
                  <p style={{ color: `${accent}cc`, fontSize: '0.82rem', fontWeight: '500', letterSpacing: '0.06em', marginBottom: '28px' }}>
                    {block.data.corporationText}
                  </p>
                )}
                <div style={{ width: '48px', height: '1px', background: `${accent}77`, marginBottom: '28px' }} />
                <p style={{ color: 'rgba(245,234,216,0.6)', fontSize: '0.97rem', lineHeight: 1.8, marginBottom: '38px', maxWidth: '340px', fontWeight: '400' }}
                  dangerouslySetInnerHTML={{ __html: block.data.subtitle || '' }} />
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="re-hero-cta"
                    onClick={isPreview ? undefined : (onCtaClick || undefined)}
                    style={{ padding: '16px 36px', background: accent, color: '#1A0F0A', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: isPreview ? 'default' : 'pointer', letterSpacing: '0.02em', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: `0 8px 28px ${accent}44`, fontFamily: 'inherit' }}
                    onMouseEnter={e => { if (!isPreview) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 36px ${accent}66`; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${accent}44`; }}
                  >
                    {block.data.ctaText || 'Schedule a Consultation'}
                  </button>
                  {block.data.ctaSubtext && (
                    <p style={{ color: `rgba(245,234,216,0.28)`, fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '500' }}>
                      {block.data.ctaSubtext}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 're_about': {
        const accent = block.data.accentColor || styles.primaryColor || '#C4804A';
        const bg = block.data.bgColor || '#1A0F0A';
        const statsItems: { value: string; label: string }[] = block.data.stats?.length
          ? block.data.stats
          : [
              ...(block.data.yearsExperience ? [{ value: `${block.data.yearsExperience}+`, label: 'Years Experience' }] : []),
              ...(block.data.dealsClosed ? [{ value: `${block.data.dealsClosed}+`, label: 'Homes Closed' }] : []),
            ];
        return (
          <div key={block.id} className={`${wrapperClass} re-font`} onClick={handleClick}
            style={{ backgroundColor: '#2C1810', padding: 'clamp(72px,10vw,100px) clamp(20px,4vw,32px)' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '56px' }}>
                <div style={{ flex: 1, height: '1px', background: `${accent}33` }} />
                <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.62rem', whiteSpace: 'nowrap' }}>About</p>
                <div style={{ flex: 1, height: '1px', background: `${accent}33` }} />
              </div>

              <div className="re-about-layout" style={{ display: 'flex', gap: 'clamp(40px,6vw,80px)', alignItems: 'flex-start' }}>
                {/* Photo */}
                <div className="re-about-photo" style={{ flex: '0 0 280px' }}>
                  {block.data.agentPhotoUrl ? (
                    <img src={block.data.agentPhotoUrl} alt="Agent"
                      style={{ width: '100%', height: '360px', objectFit: 'cover', objectPosition: 'top', borderRadius: '16px', display: 'block', boxShadow: `0 32px 80px rgba(0,0,0,0.6)`, border: `1px solid ${accent}33` }} />
                  ) : null}
                </div>
                {/* Text */}
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                  <h2 className="re-serif" style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: '400', color: '#F5EAD8', marginBottom: '24px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                    {block.data.heading || 'Your Trusted Real Estate Partner'}
                  </h2>
                  <p style={{ color: 'rgba(245,234,216,0.58)', lineHeight: 1.88, marginBottom: '40px', fontSize: '1rem', whiteSpace: 'pre-line' }}>{block.data.bio}</p>

                  {statsItems.length > 0 && (
                    <div style={{ display: 'flex', gap: '0', marginBottom: '36px', borderTop: `1px solid ${accent}22`, borderBottom: `1px solid ${accent}22` }}>
                      {statsItems.map((stat, i) => (
                        <div key={i} style={{ flex: 1, padding: '20px 0', borderRight: i < statsItems.length - 1 ? `1px solid ${accent}22` : 'none', paddingLeft: i === 0 ? 0 : '24px', paddingRight: i === statsItems.length - 1 ? 0 : '24px' }}>
                          <div className="re-serif" style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: '400', color: accent, lineHeight: 1, letterSpacing: '-0.01em' }}>{stat.value}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(245,234,216,0.38)', fontWeight: '500', marginTop: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {block.data.specialties?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {block.data.specialties.map((s: string) => (
                        <span key={s} style={{ padding: '5px 14px', background: `${accent}14`, border: `1px solid ${accent}44`, color: `${accent}dd`, borderRadius: '6px', fontWeight: '500', fontSize: '0.78rem', letterSpacing: '0.02em' }}>{s}</span>
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
        const accent = block.data.accentColor || styles.primaryColor || '#C4804A';
        const reviews = block.data.reviews || [];
        const doubled = [...reviews, ...reviews];
        const cardW = 340;
        const cardGap = 20;
        return (
          <div key={block.id} className={`${wrapperClass} re-font`} onClick={handleClick}
            style={{ backgroundColor: '#1A0F0A', padding: 'clamp(72px,10vw,100px) 0', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ maxWidth: '800px', margin: '0 auto 52px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center' }}>
              <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.62rem', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span style={{ flex: 1, height: '1px', background: `${accent}44`, display: 'inline-block', maxWidth: '60px' }} />
                Client Stories
                <span style={{ flex: 1, height: '1px', background: `${accent}44`, display: 'inline-block', maxWidth: '60px' }} />
              </p>
              <h2 className="re-serif" style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: '400', color: '#F5EAD8', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                {block.data.heading || 'What My Clients Say'}
              </h2>
            </div>

            {/* Scrolling marquee */}
            <div style={{ overflow: 'hidden', width: '100%', marginBottom: '52px' }}>
              <div
                style={{ display: 'flex', gap: `${cardGap}px`, width: 'max-content', animation: 're-scroll-left 60s linear infinite', paddingLeft: '24px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = 'paused'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = 'running'; }}
              >
                {doubled.map((review: any, i: number) => (
                  <div key={i} style={{ background: '#2C1810', borderRadius: '16px', padding: '32px', border: `1px solid ${accent}22`, borderLeft: `3px solid ${accent}`, width: `${cardW}px`, flexShrink: 0 }}>
                    <div style={{ marginBottom: '12px', display: 'flex', gap: '2px' }}>
                      {Array.from({ length: review.rating || 5 }).map((_, si) => (
                        <span key={si} style={{ color: accent, fontSize: '0.78rem' }}>★</span>
                      ))}
                    </div>
                    <p className="re-serif" style={{ fontFamily: '"DM Serif Display", Georgia, serif', color: 'rgba(245,234,216,0.85)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '24px', fontSize: '1.05rem' }}>
                      &ldquo;{review.text}&rdquo;
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: '700', color: accent, flexShrink: 0 }}>
                        {(review.author || 'A')[0]}
                      </div>
                      <div>
                        <p style={{ fontWeight: '600', color: '#F5EAD8', fontSize: '0.82rem', letterSpacing: '0.03em' }}>{review.author}</p>
                        {review.location && <p style={{ color: `${accent}77`, fontSize: '0.72rem', letterSpacing: '0.04em' }}>{review.location}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', paddingLeft: '24px', paddingRight: '24px' }}>
              <button
                onClick={isPreview ? undefined : (onCtaClick || undefined)}
                style={{ padding: '16px 44px', background: accent, color: '#1A0F0A', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.95rem', cursor: isPreview ? 'default' : 'pointer', boxShadow: `0 8px 28px ${accent}44`, transition: 'transform 0.15s', letterSpacing: '0.02em', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!isPreview) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                {block.data.ctaText || 'Work With Katie'}
              </button>
            </div>
          </div>
        );
      }

      case 're_properties': {
        const accent = block.data.accentColor || styles.primaryColor;
        const properties = block.data.properties || [];
        const doubled = [...properties, ...properties];
        const propW = 240;
        const propGap = 16;
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ backgroundColor: '#fff', padding: 'clamp(48px,8vw,72px) 0' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
                {block.data.heading || 'Recent Sales'}
              </h2>
              {block.data.subheading && (
                <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '1rem' }}>{block.data.subheading}</p>
              )}
            </div>
            <div style={{ overflow: 'hidden', width: '100%', paddingBottom: '8px' }}>
              <div
                style={{ display: 'flex', gap: `${propGap}px`, width: 'max-content', animation: `re-scroll-left ${Math.max(30, properties.length * 6)}s linear infinite` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.animationPlayState = 'paused'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.animationPlayState = 'running'; }}
              >
                {doubled.map((prop: any, i: number) => (
                  <div key={i} style={{ width: `${propW}px`, flexShrink: 0, background: '#f9fafb', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    {prop.imageUrl ? (
                      <img src={prop.imageUrl} alt={prop.address} style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '150px', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏠</div>
                    )}
                    <div style={{ padding: '14px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', background: accent, color: '#111827', borderRadius: '50px', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        {prop.status || 'Sold'}
                      </span>
                      {prop.price && <p style={{ fontWeight: '800', color: '#111827', fontSize: '1rem', marginBottom: '4px' }}>{prop.price}</p>}
                      <p style={{ color: '#374151', fontSize: '0.8rem', lineHeight: 1.4, marginBottom: '8px' }}>{prop.address}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {[prop.beds && `${prop.beds} bd`, prop.baths && `${prop.baths} ba`, prop.sqft && `${prop.sqft.toLocaleString()} sqft`].filter(Boolean).join(' · ')}
                      </p>
                      {prop.date && <p style={{ color: '#9ca3af', fontSize: '0.72rem', marginTop: '4px' }}>{prop.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 're_team': {
        const accent = block.data.accentColor || styles.primaryColor;
        const members = block.data.members || [];
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick} style={{ backgroundColor: '#fff', padding: 'clamp(48px,8vw,72px) 24px' }}>
            <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
              {block.data.logoUrl && (
                <img src={block.data.logoUrl} alt="Team Logo" style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain', margin: '0 auto 20px', display: 'block' }} />
              )}
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: '800', color: '#111827', marginBottom: '40px' }}>
                {block.data.heading || 'Meet The Team'}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(24px,4vw,48px)' }}>
                {members.map((member: any, i: number) => (
                  <div key={i} style={{ flex: '0 1 280px', textAlign: 'center' }}>
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} style={{ width: 'clamp(120px,20vw,160px)', height: 'clamp(120px,20vw,160px)', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${accent}`, margin: '0 auto 16px', display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    ) : (
                      <div style={{ width: 'clamp(120px,20vw,160px)', height: 'clamp(120px,20vw,160px)', borderRadius: '50%', background: `${accent}18`, border: `4px solid ${accent}`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                        👤
                      </div>
                    )}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{member.name}</h3>
                    {member.title && (
                      <p style={{ color: accent, fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>{member.title}</p>
                    )}
                    {member.bio && (
                      <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.65, maxWidth: '280px', margin: '0 auto' }}>{member.bio}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 're_location': {
        const accent = block.data.accentColor || styles.primaryColor || '#C4804A';
        return (
          <div key={block.id} className={`${wrapperClass} re-font`} onClick={handleClick}
            style={{ backgroundColor: '#2C1810', padding: 'clamp(72px,10vw,100px) clamp(20px,4vw,32px)' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '56px' }}>
                <div style={{ flex: 1, height: '1px', background: `${accent}33` }} />
                <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.62rem', whiteSpace: 'nowrap' }}>Contact</p>
                <div style={{ flex: 1, height: '1px', background: `${accent}33` }} />
              </div>
              <h2 className="re-serif" style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: '400', color: '#F5EAD8', textAlign: 'center', marginBottom: '52px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                {block.data.heading || "Let's Talk"}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'stretch' }}>
                {block.data.mapEmbedUrl && (
                  <div style={{ flex: '1 1 280px', minHeight: '320px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', border: `1px solid ${accent}22` }}>
                    <iframe src={block.data.mapEmbedUrl} width="100%" height="100%" style={{ border: 'none', display: 'block', minHeight: '320px' }} loading="lazy" allowFullScreen />
                  </div>
                )}
                <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '28px' }}>
                  {block.data.address && (
                    <div>
                      <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.6rem', marginBottom: '8px' }}>Office</p>
                      <p style={{ color: 'rgba(245,234,216,0.6)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{block.data.address}</p>
                    </div>
                  )}
                  {block.data.phone && (
                    <div>
                      <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.6rem', marginBottom: '8px' }}>Phone</p>
                      <a href={`tel:${block.data.phone}`} style={{ color: '#F5EAD8', fontWeight: '600', textDecoration: 'none', fontSize: '1.1rem', letterSpacing: '0.02em' }}>{block.data.phone}</a>
                    </div>
                  )}
                  {block.data.email && (
                    <div>
                      <p style={{ color: accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.6rem', marginBottom: '8px' }}>Email</p>
                      <a href={`mailto:${block.data.email}`} style={{ color: '#F5EAD8', fontWeight: '500', textDecoration: 'none', fontSize: '0.95rem' }}>{block.data.email}</a>
                    </div>
                  )}
                  <div style={{ paddingTop: '8px' }}>
                    <button
                      onClick={isPreview ? undefined : (onCtaClick || undefined)}
                      style={{ padding: '15px 32px', background: accent, color: '#1A0F0A', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.92rem', cursor: isPreview ? 'default' : 'pointer', letterSpacing: '0.02em', fontFamily: 'inherit' }}>
                      Book a Free Call
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 're_footer': {
        const accent = block.data.accentColor || styles.primaryColor || '#C4804A';
        return (
          <div key={block.id} className={`${wrapperClass} re-font`} onClick={handleClick}
            style={{ backgroundColor: '#0F0806', padding: '56px 24px 44px', textAlign: 'center', borderTop: `1px solid ${accent}22` }}>
            <div style={{ maxWidth: '560px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <div style={{ flex: 1, height: '1px', background: `${accent}33` }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent, display: 'inline-block', opacity: 0.7 }} />
                <div style={{ flex: 1, height: '1px', background: `${accent}33` }} />
              </div>
              <p className="re-serif" style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: '400', fontSize: '1.5rem', marginBottom: '6px', color: '#F5EAD8', letterSpacing: '-0.01em' }}>{block.data.agentName}</p>
              <p style={{ color: `${accent}cc`, fontSize: '0.8rem', marginBottom: '4px', fontWeight: '500', letterSpacing: '0.04em' }}>{block.data.brokerage}</p>
              {block.data.corporationText && (
                <p style={{ color: 'rgba(245,234,216,0.35)', fontSize: '0.72rem', marginBottom: '28px', letterSpacing: '0.04em' }}>{block.data.corporationText}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {block.data.phone && <a href={`tel:${block.data.phone}`} style={{ color: 'rgba(245,234,216,0.45)', textDecoration: 'none', fontSize: '0.84rem' }}>{block.data.phone}</a>}
                {block.data.email && <a href={`mailto:${block.data.email}`} style={{ color: 'rgba(245,234,216,0.45)', textDecoration: 'none', fontSize: '0.84rem' }}>{block.data.email}</a>}
              </div>
              {block.data.license && <p style={{ color: 'rgba(245,234,216,0.2)', fontSize: '0.68rem', marginBottom: '10px', letterSpacing: '0.04em' }}>{block.data.license}</p>}
              <p style={{ color: 'rgba(245,234,216,0.15)', fontSize: '0.65rem' }}>© {new Date().getFullYear()} {block.data.agentName}. All rights reserved.</p>
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
              <form onSubmit={(e) => { e.preventDefault(); if (isPreview) return; const fd = new FormData(e.target as HTMLFormElement); const formData: Record<string, string> = {}; fd.forEach((v, k) => { formData[k] = v as string; }); if (accountId) { fetch('/api/landing-pages/form-submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, ...formData }) }); } }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {block.data.customFields
                  ? block.data.customFields.map((field: { key: string; label: string; type: string; placeholder?: string; required?: boolean; options?: string[] }) => (
                      field.type === 'textarea'
                        ? <textarea key={field.key} name={field.key} placeholder={field.placeholder || field.label} required={field.required} disabled={isPreview} rows={3} style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box', resize: 'vertical' }} />
                        : field.type === 'select'
                          ? <select key={field.key} name={field.key} required={field.required} disabled={isPreview} style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}>
                              <option value="">{field.placeholder || field.label}</option>
                              {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          : <input key={field.key} name={field.key} type={field.type} placeholder={field.placeholder || field.label} required={field.required} disabled={isPreview} style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }} />
                    ))
                  : (block.data.fields || ['name', 'email']).map((field: string) => (
                      <input key={field} name={field} type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} required={field === 'email'} disabled={isPreview} style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }} />
                    ))
                }
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

      case 'raw_html':
        return (
          <div key={block.id} className={wrapperClass} onClick={handleClick}
            dangerouslySetInnerHTML={{ __html: block.data.html || '' }} />
        );

      default:
        return null;
    }
  };

  const globalStyles = (
    <style dangerouslySetInnerHTML={{ __html: `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
      @keyframes re-scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      @keyframes re-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
      .re-font { font-family: 'DM Sans', system-ui, sans-serif !important; }
      .re-serif { font-family: 'DM Serif Display', Georgia, serif !important; }
      @media (max-width: 700px) {
        .re-hero-card { flex-direction: column !important; }
        .re-hero-photo-side { flex: 0 0 280px !important; min-height: 280px !important; max-height: 360px !important; }
        .re-hero-photo-side img { min-height: 280px !important; max-height: 360px !important; object-position: top !important; }
        .re-hero-cta { width: 100% !important; }
        .re-about-layout { flex-direction: column !important; }
        .re-about-photo { display: none !important; }
      }
    `}} />
  );

  // Sections mode — render section → column → block hierarchy
  if (content.sections && content.sections.length > 0) {
    return (
      <div style={{ fontFamily: styles.fontFamily || "'DM Sans', system-ui, -apple-system, sans-serif", backgroundColor: styles.backgroundColor || '#ffffff', minHeight: isPreview ? '100%' : '100vh' }}>
        {globalStyles}
        {content.sections.map((section: LandingPageSection) => {
          const isSelected = selectedSectionId === section.id;
          return (
            <div
              key={section.id}
              onClick={onSectionClick ? () => onSectionClick(section.id) : undefined}
              style={{
                paddingTop: section.style?.paddingTop ?? 0,
                paddingBottom: section.style?.paddingBottom ?? 0,
                marginBottom: section.style?.marginBottom ?? 0,
                backgroundColor: section.style?.backgroundColor || undefined,
                outline: isSelected ? '2px solid #3b82f6' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                {section.columns.map((col: LandingPageColumn) => {
                  const sortedColBlocks = [...col.blocks].sort((a, b) => a.order - b.order);
                  return (
                    <div key={col.id} style={{ flex: `0 0 ${(col.width / 12) * 100}%`, minWidth: 0 }}>
                      {sortedColBlocks.map(renderBlock)}
                      {col.blocks.length === 0 && isPreview && (
                        <div style={{ minHeight: 80, border: '2px dashed #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem', margin: 8 }}>
                          Empty column — add an element
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Flat blocks mode (legacy / fallback)
  return (
    <div style={{ fontFamily: styles.fontFamily || "'DM Sans', system-ui, -apple-system, sans-serif", backgroundColor: styles.backgroundColor || '#ffffff', minHeight: isPreview ? '100%' : '100vh' }}>
      {globalStyles}
      {sortedBlocks.length === 0 && isPreview && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#9ca3af', fontSize: '1.1rem' }}>
          Add blocks to start building your page
        </div>
      )}
      {sortedBlocks.map(renderBlock)}
    </div>
  );
}
