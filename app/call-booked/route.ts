import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  noStore();

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/landing_pages?slug=eq.nexorra-call-booked&select=content,published`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  const rows: Array<{ content: any; published: boolean }> = await res.json();
  const page = rows[0];

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
