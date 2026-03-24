import { Metadata } from 'next';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import ColdEmailPageShell from '@/components/landing-pages/ColdEmailPageShell';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  void headers(); // force dynamic
  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('name, meta_title, meta_description')
    .eq('id', params.id)
    .eq('page_type', 'cold-email')
    .single();

  return {
    title: page?.meta_title || page?.name || 'Video | Nexorra',
    description: page?.meta_description || 'Personalized video from Nexorra',
    robots: 'noindex',
  };
}

export default async function VideoPage({ params }: { params: { id: string } }) {
  void headers();
  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('id, content, page_type, published')
    .eq('id', params.id)
    .eq('page_type', 'cold-email')
    .single();

  if (!page || !page.published) notFound();

  return <ColdEmailPageShell html={page.content} />;
}
