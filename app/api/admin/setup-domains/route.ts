import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { addVercelDomain, removeWildcardDomain } from '@/lib/vercel-domains';

// POST /api/admin/setup-domains
// One-time migration: removes *.ourlimitedoffer.com wildcard from Vercel and
// registers every currently published landing page as its own subdomain.
// Protect with CRON_SECRET so it can't be called by anyone.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Remove the wildcard domain (no-op if it never existed)
  await removeWildcardDomain().catch((e) =>
    console.warn('[setup-domains] Wildcard removal error (non-fatal):', e)
  );

  // 2. Fetch all published pages
  const { data: pages, error } = await supabaseAdmin
    .from('landing_pages')
    .select('slug')
    .eq('published', true);

  if (error) {
    return NextResponse.json({ error: 'Failed to load pages' }, { status: 500 });
  }

  const slugs = (pages ?? []).map((p) => p.slug).filter(Boolean);

  // 3. Register each slug as an individual Vercel domain
  const results = await Promise.allSettled(slugs.map((slug) => addVercelDomain(slug)));

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ ok: true, total: slugs.length, succeeded, failed });
}
