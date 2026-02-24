import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/landing-pages?accountId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    const { data, error } = await supabaseAdmin
      .from('landing_pages')
      .select('*')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching landing pages:', error);
      return NextResponse.json({ error: 'Failed to fetch landing pages' }, { status: 500 });
    }

    return NextResponse.json({ pages: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/landing-pages
export async function POST(request: NextRequest) {
  try {
    const { accountId, name, slug, content, meta_title, meta_description, connect_pixel } = await request.json();

    const auth = await requireAccountAccess(request, accountId);
    if (auth instanceof NextResponse) return auth;

    if (!accountId || !name || !slug) {
      return NextResponse.json({ error: 'accountId, name, and slug are required' }, { status: 400 });
    }

    // Check slug uniqueness within account
    const { data: existing } = await supabaseAdmin
      .from('landing_pages')
      .select('id')
      .eq('account_id', accountId)
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'A page with this slug already exists in this account' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('landing_pages')
      .insert({
        account_id: accountId,
        name,
        slug,
        content: content || { blocks: [], styles: { fontFamily: 'Inter', primaryColor: '#0ea5e9' } },
        published: false,
        meta_title: meta_title || name,
        meta_description: meta_description || '',
        connect_pixel: connect_pixel === true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating landing page:', error);
      return NextResponse.json({ error: 'Failed to create landing page' }, { status: 500 });
    }

    return NextResponse.json({ page: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
