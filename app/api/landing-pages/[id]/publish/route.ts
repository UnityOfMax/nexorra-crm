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

    // Fetch with account slug so we can revalidate the correct route
    const { data, error } = await supabaseAdmin
      .from('landing_pages')
      .update({ published: !!published })
      .eq('id', params.id)
      .select('*, accounts(slug)')
      .single();

    if (error) {
      console.error('Error toggling publish:', error);
      return NextResponse.json({ error: 'Failed to update publish status' }, { status: 500 });
    }

    // Revalidate the ID-based public landing page route
    const accountSlug = (data as any)?.accounts?.slug;
    if (accountSlug) {
      revalidatePath(`/account/${accountSlug}/landing-pages/${params.id}`);
    }
    // Also revalidate the API route so the public-by-id endpoint serves fresh content
    revalidatePath(`/api/landing-pages/public-by-id/${params.id}`);

    // Strip the joined accounts field from the response
    const { accounts: _accounts, ...pageData } = data as any;
    return NextResponse.json({ page: pageData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
