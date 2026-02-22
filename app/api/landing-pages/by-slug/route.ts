import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Used by middleware to resolve a subdomain slug to a landing page + account slug.
// GET /api/landing-pages/by-slug?slug=lori
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('landing_pages')
    .select('id, accounts(slug)')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const accountSlug = (data as any).accounts?.slug;
  if (!accountSlug) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return NextResponse.json({ pageId: data.id, accountSlug }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
