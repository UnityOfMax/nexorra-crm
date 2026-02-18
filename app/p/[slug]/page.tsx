import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import LandingPageRenderer from '@/components/landing-pages/LandingPageRenderer';
import Script from 'next/script';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('meta_title, meta_description')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();

  if (!page) return { title: 'Page Not Found' };

  return {
    title: page.meta_title || 'Landing Page',
    description: page.meta_description || '',
  };
}

export default async function PublicLandingPage({ params }: { params: { slug: string } }) {
  const { data: page, error } = await supabaseAdmin
    .from('landing_pages')
    .select('*')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();

  if (error || !page) {
    notFound();
  }

  const trackingPixels = page.tracking_pixels || [];

  return (
    <>
      <LandingPageRenderer
        content={page.content}
        accountId={page.account_id}
      />
      {/* Inject tracking pixels */}
      {trackingPixels.map((pixel: any) => (
        <Script
          key={pixel.id}
          id={`pixel-${pixel.id}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: pixel.code.replace(/<\/?script[^>]*>/gi, ''),
          }}
        />
      ))}
    </>
  );
}
