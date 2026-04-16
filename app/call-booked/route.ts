import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('content, published')
    .eq('slug', 'nexorra-call-booked')
    .single();

  if (!page || !page.published) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Content may be stored as raw HTML string or as JSON blocks
  let html: string;
  const raw = page.content as string;

  if (typeof raw === 'string' && raw.trimStart().startsWith('<')) {
    html = raw;
  } else {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const blocks: Array<{ type: string; data?: { html?: string } }> =
        parsed?.blocks ?? [];
      html = blocks
        .filter((b) => b.type === 'raw_html' && b.data?.html)
        .map((b) => b.data!.html!)
        .join('\n');
    } catch {
      html = raw ?? '';
    }
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'no-store',
    },
  });
}
