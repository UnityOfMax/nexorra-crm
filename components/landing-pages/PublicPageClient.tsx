'use client';

import { useState, useEffect } from 'react';
import LandingPageRenderer from './LandingPageRenderer';
import HomeSearchForm from './HomeSearchForm';
import type { LandingPageContent } from '@/lib/landing-page-templates';

interface PublicPageClientProps {
  content: LandingPageContent;
  accountId: string;
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export default function PublicPageClient({ content, accountId }: PublicPageClientProps) {
  const [formOpen, setFormOpen] = useState(false);

  // Pull agent info from first re_hero block for the form greeting
  const heroBlock = content.blocks.find(b => b.type === 're_hero');
  const agentName = heroBlock?.data?.agentName || 'Your Agent';
  const agentPhoto = heroBlock?.data?.profileImageUrl || '';
  const accentColor = heroBlock?.data?.accentColor || content.styles.primaryColor || '#f59e0b';

  // Fire ViewContent pixel when lead lands on the page
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: agentName,
        content_type: 'landing_page',
      });
    }
  }, [agentName]);

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
