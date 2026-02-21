'use client';

import { useState, useEffect } from 'react';
import LandingPageRenderer from './LandingPageRenderer';
import HomeSearchForm from './HomeSearchForm';
import type { LandingPageContent } from '@/lib/landing-page-templates';

interface PublicPageClientProps {
  slug: string;
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export default function PublicPageClient({ slug }: PublicPageClientProps) {
  const [content, setContent] = useState<LandingPageContent | null>(null);
  const [accountId, setAccountId] = useState('');
  const [trackingPixels, setTrackingPixels] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Fetch from uncached API endpoint — timestamp param busts any residual CDN cache
    fetch(`/api/landing-pages/public/${slug}?t=${Date.now()}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); return; }
        const data = await r.json();
        setContent(data.content);
        setAccountId(data.account_id);
        setTrackingPixels(data.tracking_pixels || []);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  // Inject tracking pixel scripts once content is loaded
  useEffect(() => {
    if (!trackingPixels.length) return;
    trackingPixels.forEach((pixel: any) => {
      if (!pixel.code) return;
      const el = document.createElement('script');
      el.id = `pixel-${pixel.id}`;
      el.innerHTML = pixel.code.replace(/<\/?script[^>]*>/gi, '');
      document.head.appendChild(el);
    });
  }, [trackingPixels]);

  // Fire ViewContent pixel after content loads
  useEffect(() => {
    if (!content) return;
    const heroBlock = content.blocks.find((b) => b.type === 're_hero');
    const agentName = heroBlock?.data?.agentName || 'Your Agent';
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: agentName,
        content_type: 'landing_page',
      });
    }
  }, [content]);

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#6b7280' }}>
        Page not found.
      </div>
    );
  }

  if (!content) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const heroBlock = content.blocks.find((b) => b.type === 're_hero');
  const agentName = heroBlock?.data?.agentName || 'Your Agent';
  const agentPhoto = heroBlock?.data?.profileImageUrl || '';
  const accentColor = heroBlock?.data?.accentColor || content.styles?.primaryColor || '#f59e0b';

  return (
    <>
      <LandingPageRenderer
        content={content}
        accountId={accountId}
        onCtaClick={() => setFormOpen(true)}
      />
      <HomeSearchForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        accountId={accountId}
        accentColor={accentColor}
        agentName={agentName}
        agentPhoto={agentPhoto}
      />
    </>
  );
}
