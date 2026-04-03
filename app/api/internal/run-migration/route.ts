import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// One-shot migration runner — DELETE THIS FILE after use
// Auth: requires CRON_SECRET as Bearer token
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  // 1. Add meta columns to accounts (uses rpc trick: insert dummy, let it fail, catch the column existence)
  // Actually use the admin client which has DDL rights via service role
  // PostgREST doesn't support DDL, but we can use a Supabase Edge Function approach
  // Instead: manually update Charlie's account using the existing columns if migration was already done
  // First check if columns exist
  const { error: checkError } = await supabaseAdmin
    .from('accounts')
    .select('meta_page_id')
    .limit(1);

  if (checkError?.message?.includes('column')) {
    results.push('Columns not yet added — run migration manually in Supabase SQL editor');
    results.push('SQL: ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS meta_page_id TEXT, ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT;');
  } else {
    results.push('Columns exist ✓');

    // Save Charlie Kiers config
    const { error } = await supabaseAdmin
      .from('accounts')
      .update({
        meta_page_id: '187715877269',
        meta_ad_account_id: '1294610199160889',
      })
      .eq('id', '1b025168-ce2c-4baa-9aca-d77fc1d01f0e');

    if (error) {
      results.push(`Charlie update error: ${error.message}`);
    } else {
      results.push('Charlie Kiers meta config saved ✓');
    }
  }

  return NextResponse.json({ results });
}
