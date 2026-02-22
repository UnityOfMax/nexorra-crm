import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import PublicPageClient from '@/components/landing-pages/PublicPageClient';

// Always render fresh so edits appear immediately — no CDN or Full Route Cache.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  // Accessing request headers forces dynamic rendering and disables CDN caching
  headers();

  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('meta_title, meta_description, name')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();

  if (!page) return { title: 'Page Not Found' };

  return {
    title: page.meta_title || page.name || 'Landing Page',
    description: page.meta_description || '',
    viewport: 'width=device-width, initial-scale=1',
    other: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  };
}

export default function PublicLandingPage({ params }: { params: { slug: string } }) {
  // Calling headers() here marks this route as dynamic and prevents edge caching
  headers();
  return <PublicPageClient slug={params.slug} />;
}
