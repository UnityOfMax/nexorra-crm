import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/landing-pages/[id]/publish
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { published } = await request.json();

    const { data, error } = await supabaseAdmin
      .from('landing_pages')
      .update({ published: !!published })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling publish:', error);
      return NextResponse.json({ error: 'Failed to update publish status' }, { status: 500 });
    }

    // Purge Vercel Edge Network cache so publish/unpublish takes effect immediately
    if (data?.slug) {
      revalidatePath(`/p/${data.slug}`);
    }

    return NextResponse.json({ page: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
