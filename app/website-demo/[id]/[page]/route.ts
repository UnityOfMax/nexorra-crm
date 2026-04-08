import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; page: string } },
) {
  // Subpages stored as {base-slug}-{page}, e.g. demo-a-hair-sensation-abc123-services
  const subpageSlug = `${params.id}-${params.page}`;

  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('content, published')
    .eq('slug', subpageSlug)
    .eq('page_type', 'website-demo')
    .single();

  if (!page || !page.published) {
    // Fallback: redirect to home if subpage doesn't exist (legacy single-page demos)
    return NextResponse.redirect(new URL(`/website-demo/${params.id}`, 'https://app.ainexorra.com'));
  }

  return new NextResponse(page.content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
}
