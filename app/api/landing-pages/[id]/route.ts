import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

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
    const body = await request.json();
    const { name, slug, content, meta_title, meta_description, tracking_pixels, published } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;
    if (tracking_pixels !== undefined) updateData.tracking_pixels = tracking_pixels;
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

    // Purge Vercel's Edge Network cache for this page so changes appear immediately.
    // revalidatePath clears both Next.js's Full Route Cache and the Vercel CDN cache
    // for the path, including requests rewritten from wildcard subdomains.
    if (data?.slug) {
      revalidatePath(`/p/${data.slug}`);
    }
    // If the slug was changed, also purge the old slug so the old domain 404s cleanly.
    if (slug && data?.slug !== slug) {
      revalidatePath(`/p/${slug}`);
    }

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
    const { error } = await supabaseAdmin
      .from('landing_pages')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting landing page:', error);
      return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
