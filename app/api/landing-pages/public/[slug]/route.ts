import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Public endpoint – no auth required, used by the client-side landing page renderer.
// Always returns fresh data (Cache-Control: no-store) so CDN caching is bypassed entirely.
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { data, error } = await supabaseAdmin
    .from('landing_pages')
    .select('content, account_id, connect_pixel')
    .eq('slug', params.slug)
    .eq('published', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
