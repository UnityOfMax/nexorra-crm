import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Public endpoint – no auth required, used by the client-side landing page renderer.
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

  // Normalise content: some records have it double-serialised as a JSON string.
  if (typeof data.content === 'string') {
    try { (data as any).content = JSON.parse(data.content as string); } catch { /* leave as-is */ }
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
