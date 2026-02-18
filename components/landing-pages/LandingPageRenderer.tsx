'use client';

import type { LandingPageContent, LandingPageBlock } from '@/lib/landing-page-templates';

interface LandingPageRendererProps {
  content: LandingPageContent;
  isPreview?: boolean;
  onBlockClick?: (blockId: string) => void;
  selectedBlockId?: string;
  accountId?: string;
}

export default function LandingPageRenderer({
  content,
  isPreview = false,
  onBlockClick,
  selectedBlockId,
  accountId,
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
      case 'hero':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{
              backgroundColor: block.data.bgColor || '#1a1a2e',
              color: block.data.textColor || '#ffffff',
              padding: '80px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px', lineHeight: 1.2 }}>
                {block.data.heading || 'Your Headline Here'}
              </h1>
              <p style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '32px' }}>
                {block.data.subheading || 'Your subheading goes here'}
              </p>
              {block.data.ctaText && (
                <a
                  href={block.data.ctaLink || '#'}
                  style={{
                    display: 'inline-block',
                    padding: '14px 32px',
                    backgroundColor: styles.primaryColor,
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                  }}
                >
                  {block.data.ctaText}
                </a>
              )}
            </div>
          </div>
        );

      case 'text':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}
          >
            <div
              style={{ fontSize: '1rem', lineHeight: 1.7, color: '#374151' }}
              dangerouslySetInnerHTML={{ __html: block.data.content || '<p>Enter your text here...</p>' }}
            />
          </div>
        );

      case 'image':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ padding: '24px', textAlign: block.data.alignment || 'center' }}
          >
            {block.data.url ? (
              <img
                src={block.data.url}
                alt={block.data.alt || ''}
                style={{ maxWidth: '100%', borderRadius: '8px', display: 'inline-block' }}
              />
            ) : (
              <div style={{
                width: '100%', maxWidth: '600px', height: '300px',
                backgroundColor: '#f3f4f6', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#9ca3af', margin: '0 auto',
              }}>
                Image placeholder
              </div>
            )}
          </div>
        );

      case 'cta':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ padding: '40px 24px', textAlign: 'center' }}
          >
            <a
              href={block.data.link || '#'}
              style={{
                display: 'inline-block',
                padding: block.data.size === 'large' ? '18px 48px' : '12px 32px',
                backgroundColor: block.data.color || styles.primaryColor,
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: block.data.size === 'large' ? '1.25rem' : '1rem',
                textDecoration: 'none',
              }}
            >
              {block.data.text || 'Click Here'}
            </a>
          </div>
        );

      case 'form':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ padding: '40px 24px' }}
          >
            <div style={{
              maxWidth: '500px', margin: '0 auto',
              backgroundColor: '#ffffff', borderRadius: '12px',
              padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
            }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center', color: '#111827' }}>
                {block.data.heading || 'Get in Touch'}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isPreview) return;
                  // In public mode, submit to API
                  const formData = new FormData(e.target as HTMLFormElement);
                  const data: Record<string, string> = {};
                  formData.forEach((val, key) => { data[key] = val as string; });
                  if (accountId) {
                    fetch('/api/landing-pages/form-submit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ accountId, ...data }),
                    });
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {(block.data.fields || ['name', 'email']).map((field: string) => (
                  <input
                    key={field}
                    name={field}
                    type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                    placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                    required={field === 'email'}
                    disabled={isPreview}
                    style={{
                      width: '100%', padding: '12px 16px',
                      border: '1px solid #d1d5db', borderRadius: '8px',
                      fontSize: '1rem', boxSizing: 'border-box',
                    }}
                  />
                ))}
                <button
                  type="submit"
                  disabled={isPreview}
                  style={{
                    width: '100%', padding: '14px',
                    backgroundColor: block.data.buttonColor || styles.primaryColor,
                    color: '#ffffff', borderRadius: '8px',
                    fontWeight: '600', fontSize: '1rem',
                    border: 'none', cursor: isPreview ? 'default' : 'pointer',
                  }}
                >
                  {block.data.buttonText || 'Submit'}
                </button>
              </form>
            </div>
          </div>
        );

      case 'video':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ padding: '40px 24px', textAlign: 'center' }}
          >
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {block.data.url ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={block.data.url}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%', borderRadius: '12px', border: 'none',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div style={{
                  width: '100%', paddingBottom: '56.25%', position: 'relative',
                  backgroundColor: '#1f2937', borderRadius: '12px',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#9ca3af',
                  }}>
                    Video placeholder
                  </div>
                </div>
              )}
              {block.data.caption && (
                <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '0.875rem' }}>
                  {block.data.caption}
                </p>
              )}
            </div>
          </div>
        );

      case 'testimonial':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ padding: '32px 24px' }}
          >
            <div style={{
              maxWidth: '600px', margin: '0 auto',
              backgroundColor: '#f9fafb', borderRadius: '12px', padding: '32px',
              borderLeft: `4px solid ${styles.primaryColor}`,
            }}>
              <p style={{ fontSize: '1.1rem', fontStyle: 'italic', color: '#374151', marginBottom: '16px', lineHeight: 1.6 }}>
                &ldquo;{block.data.quote || 'Customer testimonial goes here...'}&rdquo;
              </p>
              <div>
                <p style={{ fontWeight: '600', color: '#111827' }}>
                  {block.data.author || 'Customer Name'}
                </p>
                {block.data.role && (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {block.data.role}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ padding: '60px 24px' }}
          >
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {block.data.heading && (
                <h2 style={{
                  fontSize: '2rem', fontWeight: 'bold',
                  textAlign: 'center', marginBottom: '40px', color: '#111827',
                }}>
                  {block.data.heading}
                </h2>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '32px',
              }}>
                {(block.data.items || []).map((item: any, i: number) => (
                  <div key={i} style={{
                    padding: '24px', backgroundColor: '#f9fafb',
                    borderRadius: '12px', textAlign: 'center',
                  }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
                      {item.title}
                    </h3>
                    <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div
            key={block.id}
            className={wrapperClass}
            onClick={handleClick}
            style={{ height: block.data.height || 40 }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      fontFamily: styles.fontFamily || 'Inter, sans-serif',
      backgroundColor: styles.backgroundColor || '#ffffff',
      minHeight: isPreview ? '100%' : '100vh',
    }}>
      {sortedBlocks.length === 0 && isPreview && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '400px', color: '#9ca3af', fontSize: '1.1rem',
        }}>
          Drag blocks here to start building your page
        </div>
      )}
      {sortedBlocks.map(renderBlock)}
    </div>
  );
}
