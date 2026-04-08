import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('content, published')
    .eq('slug', params.id)
    .eq('page_type', 'website-demo')
    .single();

  if (!page || !page.published) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(page.content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
}
