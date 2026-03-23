import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { buildColdEmailPage } from '@/lib/landing-pages/cold-email-builder';

export const dynamic = 'force-dynamic';

const AGENCY_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

function randomChars(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// POST /api/landing-pages/cold-email
// Body: { lead_id: string }
// Creates a personalized cold email landing page for a lead
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  let body: { lead_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { lead_id } = body;
  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
  }

  // Fetch the lead
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .select('id, full_name, video_url, personal_research, city, source_brokerage')
    .eq('id', lead_id)
    .single();

  if (leadError || !lead) {
    console.error('Lead fetch error:', leadError);
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  // Parse name
  const nameParts = (lead.full_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || 'there';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  // Build the slug
  const slug = `${slugify(firstName)}${lastName ? `-${slugify(lastName)}` : ''}-${randomChars(4)}`;

  // Get Calendly URL from env
  const calendlyUrl = process.env.CALENDLY_EVENT_TYPE_URI || 'https://calendly.com/nexorra/discovery';

  // Build the page HTML
  const html = buildColdEmailPage({
    leadName: lead.full_name || firstName,
    firstName,
    videoUrl: lead.video_url || '',
    calendlyUrl,
    personalNote: lead.personal_research || undefined,
    city: lead.city || undefined,
    brokerage: lead.source_brokerage || undefined,
  });

  // Insert into landing_pages
  const { data: page, error: insertError } = await supabaseAdmin
    .from('landing_pages')
    .insert({
      account_id: AGENCY_ACCOUNT_ID,
      name: `Cold Email — ${lead.full_name || firstName}`,
      slug,
      page_type: 'cold-email',
      lead_id: lead.id,
      content: html,
      published: true,
    })
    .select('id, slug')
    .single();

  if (insertError) {
    console.error('Landing page insert error:', insertError);
    return NextResponse.json({ error: 'Failed to create landing page' }, { status: 500 });
  }

  // Build the public URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.nexorra.com';
  const url = `${baseUrl}/p/${slug}`;

  return NextResponse.json({ slug: page.slug, url, page_id: page.id });
}
