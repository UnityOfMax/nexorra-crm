import { supabaseAdmin } from '@/lib/supabase';
import PublicPageClient from '@/components/landing-pages/PublicPageClient';

// Always render fresh so edits appear immediately — no CDN or Full Route Cache.
export const dynamic = 'force-dynamic';

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
