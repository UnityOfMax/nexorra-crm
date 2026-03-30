'use client';

import { useState, useEffect } from 'react';
import LandingPageRenderer from './LandingPageRenderer';
import HomeSearchForm from './HomeSearchForm';
import { fbPixelScriptBody, fbPixelNoscript } from '@/lib/pixel';
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
      })
      .catch(() => setNotFound(true));
  }, [slug, pageId]);

  // Override PWA shell styles that block scrolling on public landing pages
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    targets.forEach(el => {
      el.style.overflow = 'auto';
      el.style.position = 'static';
      el.style.height = 'auto';
      el.style.width = '100%';
      el.style.overscrollBehavior = 'auto';
      el.style.touchAction = 'auto';
    });
    return () => {
      targets.forEach(el => {
        el.style.overflow = '';
        el.style.position = '';
        el.style.height = '';
        el.style.width = '';
        el.style.overscrollBehavior = '';
        el.style.touchAction = '';
      });
    };
  }, []);

  // Inject Meta Pixel on every landing page (hardcoded pixel ID, always active)
  useEffect(() => {
    if (document.getElementById('fb-pixel')) return;
    // Inject pixel script into <head>
    const s = document.createElement('script');
    s.id = 'fb-pixel';
    s.innerHTML = fbPixelScriptBody();
    document.head.appendChild(s);
    // Inject noscript fallback
    const ns = document.createElement('noscript');
    ns.id = 'fb-pixel-ns';
    ns.innerHTML = fbPixelNoscript();
    document.head.appendChild(ns);
  }, []);

  // Set dynamic favicon and page title from landing page content
  const heroBlock = content?.blocks.find((b) => b.type === 're_hero');
  const agentName = heroBlock?.data?.agentName || 'Your Agent';
  const faviconUrl = content?.styles?.faviconUrl || heroBlock?.data?.logoUrl || '';

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
        calendarSettings={content.calendarSettings}
        questionnaireConfig={content.questionnaireConfig}
      />
    </>
  );
}
