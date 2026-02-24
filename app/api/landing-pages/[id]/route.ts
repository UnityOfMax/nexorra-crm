import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { addVercelDomain, removeVercelDomain } from '@/lib/vercel-domains';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

// GET /api/landing-pages/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('landing_pages')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const auth = await requireAccountAccess(request, data.account_id);
    if (auth instanceof NextResponse) return auth;

    return NextResponse.json({ page: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/landing-pages/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: existing } = await supabaseAdmin
      .from('landing_pages')
      .select('account_id')
      .eq('id', params.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const auth = await requireAccountAccess(request, existing.account_id);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, slug, content, meta_title, meta_description, connect_pixel, custom_domain, published } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (connect_pixel !== undefined) updateData.connect_pixel = connect_pixel === true;
    if (custom_domain !== undefined) updateData.custom_domain = custom_domain;
    if (published !== undefined) updateData.published = published;

    const { data, error } = await supabaseAdmin
      .from('landing_pages')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating landing page:', error);
      return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
    }

    // Register [slug].ourlimitedoffer.com in Vercel when publishing
    if (published && data?.slug) {
      addVercelDomain(data.slug).catch(err =>
        console.error('[publish] addVercelDomain failed:', err)
      );
    }

    // Revalidate the public API route so new content is always served fresh
    revalidatePath(`/api/landing-pages/public-by-id/${params.id}`);

    return NextResponse.json({ page: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/landing-pages/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch account_id and slug before deleting
    const { data: existing } = await supabaseAdmin
      .from('landing_pages')
      .select('account_id, slug, published')
      .eq('id', params.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const auth = await requireAccountAccess(request, existing.account_id);
    if (auth instanceof NextResponse) return auth;

    const { error } = await supabaseAdmin
      .from('landing_pages')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting landing page:', error);
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
    }

    // Remove domain from Vercel if it was published
    if (existing?.published && existing?.slug) {
      removeVercelDomain(existing.slug).catch(err =>
        console.error('[delete] removeVercelDomain failed:', err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
