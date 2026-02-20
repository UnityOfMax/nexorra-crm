import { supabaseAdmin } from '@/lib/supabase';
import PublicPageClient from '@/components/landing-pages/PublicPageClient';

// Page shell is cacheable – actual content is fetched client-side from
// /api/landing-pages/public/[slug] which always bypasses the CDN.
// This means edits appear immediately without any cache invalidation.

export async function generateMetadata({ params }: { params: { slug: string } }) {
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
  };
}

export default function PublicLandingPage({ params }: { params: { slug: string } }) {
  return <PublicPageClient slug={params.slug} />;
}
