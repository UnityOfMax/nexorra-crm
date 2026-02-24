'use client';

import { useState, useEffect } from 'react';
import LandingPageRenderer from './LandingPageRenderer';
import HomeSearchForm from './HomeSearchForm';
import { fbPixelScriptBody } from '@/lib/pixel';
import type { LandingPageContent } from '@/lib/landing-page-templates';

// Pass either slug (legacy /p/[slug] route) or pageId (new /account/[s]/landing-pages/[id] route)
interface PublicPageClientProps {
  slug?: string;
  pageId?: string;
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export default function PublicPageClient({ slug, pageId }: PublicPageClientProps) {
  const [content, setContent] = useState<LandingPageContent | null>(null);
  const [accountId, setAccountId] = useState('');
  const [connectPixel, setConnectPixel] = useState(false);
  const [pixelId, setPixelId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const url = pageId
      ? `/api/landing-pages/public-by-id/${pageId}?t=${Date.now()}`
      : `/api/landing-pages/public/${slug}?t=${Date.now()}`;

    fetch(url, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); return; }
        const data = await r.json();
        setContent(data.content);
        setAccountId(data.account_id);
        setConnectPixel(data.connect_pixel === true);
        if (data.pixel_id) setPixelId(data.pixel_id);
      })
      .catch(() => setNotFound(true));
  }, [slug, pageId]);

  // Inject Facebook Pixel when connect_pixel is enabled and a pixel ID is available
  useEffect(() => {
    if (!connectPixel || !pixelId) return;
    if (document.getElementById('fb-pixel')) return;
    const s = document.createElement('script');
    s.id = 'fb-pixel';
    s.innerHTML = fbPixelScriptBody(pixelId);
    document.head.appendChild(s);
  }, [connectPixel, pixelId]);

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
  const faviconUrl = content.styles?.faviconUrl || heroBlock?.data?.logoUrl || '';

  // Set dynamic favicon and page title from landing page content
  useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = faviconUrl;
    }
    if (agentName && agentName !== 'Your Agent') {
      document.title = agentName;
    }
  }, [faviconUrl, agentName]);

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
