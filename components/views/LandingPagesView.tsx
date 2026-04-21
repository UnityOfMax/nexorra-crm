'use client';
import dynamic from 'next/dynamic';
import type { SubAccount } from '../Sidebar';
const LandingPageList = dynamic(() => import('../landing-pages/LandingPageList'), { ssr: false });

interface LandingPagesViewProps {
  sub: SubAccount;
  accountId: string;
  userId: string;
}

export default function LandingPagesView({ sub, accountId, userId }: LandingPagesViewProps) {
  // Derive slug from account name if not available in settings
  const slug = sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return <LandingPageList accountId={accountId} accountSlug={slug} />;
}
