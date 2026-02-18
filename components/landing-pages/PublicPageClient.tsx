'use client';

import { useState } from 'react';
import LandingPageRenderer from './LandingPageRenderer';
import HomeSearchForm from './HomeSearchForm';
import type { LandingPageContent } from '@/lib/landing-page-templates';

interface PublicPageClientProps {
  content: LandingPageContent;
  accountId: string;
}

export default function PublicPageClient({ content, accountId }: PublicPageClientProps) {
  const [formOpen, setFormOpen] = useState(false);

  // Pull agent name from first re_hero block for the form greeting
  const heroBlock = content.blocks.find(b => b.type === 're_hero');
  const agentName = heroBlock?.data?.agentName || 'Your Agent';
  const accentColor = heroBlock?.data?.accentColor || content.styles.primaryColor || '#f59e0b';

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
      />
    </>
  );
}
