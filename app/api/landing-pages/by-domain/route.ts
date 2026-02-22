import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Used by middleware to resolve a custom domain to a landing page + account slug.
// GET /api/landing-pages/by-domain?domain=lori.ourlimitedoffer.com
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain required' }, { status: 400 });
  }

  const { data } = await supabaseAdmin
    .from('landing_pages')
    .select('id, accounts(slug)')
    .eq('custom_domain', domain)
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
