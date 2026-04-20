import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';

// GET: tracking pixel — returns 1x1 transparent GIF
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('s');
  const eventType = searchParams.get('t') || 'page_view';

  if (slug) {
    // Look up landing page
    const { data: page } = await supabaseAdmin
      .from('landing_pages')
      .select('id, lead_id')
      .eq('slug', slug)
      .single();

    if (page) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
      const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16);

      await supabaseAdmin.from('landing_page_events').insert({
        landing_page_id: page.id,
        lead_id: page.lead_id,
        event_type: eventType,
        visitor_ip_hash: ipHash,
        metadata: {},
      });
    }
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// POST: JavaScript events from the landing page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, page_id, event_type, metadata } = body;

    if ((!slug && !page_id) || !event_type) {
      return NextResponse.json({ error: 'Missing slug/page_id or event_type' }, { status: 400 });
    }

    // Rate limit by IP (simple: max 100 per hour)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16);

    const query = supabaseAdmin.from('landing_pages').select('id, lead_id');
    const { data: page } = await (page_id ? query.eq('id', page_id) : query.eq('slug', slug)).single();

    if (!page) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const sessionId = body.metadata?.session_id || null;

    await supabaseAdmin.from('landing_page_events').insert({
      landing_page_id: page.id,
      lead_id: page.lead_id,
      event_type,
      visitor_ip_hash: ipHash,
      metadata: { ...(metadata || {}), session_id: sessionId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
