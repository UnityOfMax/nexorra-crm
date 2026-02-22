import { headers } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import PublicPageClient from '@/components/landing-pages/PublicPageClient';

// Always render fresh — no CDN or Full Route Cache
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  noStore();
  headers();

  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('meta_title, meta_description, name')
    .eq('id', params.id)
    .eq('published', true)
    .single();

  if (!page) return { title: 'Page Not Found' };

  return {
    title: page.meta_title || page.name || 'Landing Page',
    description: page.meta_description || '',
    viewport: 'width=device-width, initial-scale=1',
  };
}

export default function LandingPageByIdPage({ params }: { params: { id: string } }) {
  noStore();
  headers();
  return <PublicPageClient pageId={params.id} />;
}
