import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAccountAccess } from '@/lib/auth/require-account-access';

/**
 * GET /api/integrations/facebook/lead-forms?accountId=...
 * Returns all active lead forms on the connected page, with their questions.
 * Also returns the current selection + field mappings stored in facebook_integrations.
 *
 * POST /api/integrations/facebook/lead-forms
 * Body: { accountId, selectedFormIds: string[], fieldMappings: Record<string, string> }
 * Saves the selection and field mappings.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { data: integration, error } = await supabaseAdmin
    .from('facebook_integrations')
    .select('access_token, page_id, selected_form_ids, field_mappings')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error || !integration?.page_id) {
    return NextResponse.json({ error: 'Facebook page not connected' }, { status: 404 });
  }

  const { access_token, page_id, selected_form_ids, field_mappings } = integration;

  // Get page-scoped token
  const pageTokenRes = await fetch(
    `https://graph.facebook.com/v21.0/${page_id}?fields=access_token&access_token=${access_token}`
  );
  const pageTokenData = await pageTokenRes.json();
  if (pageTokenData.error || !pageTokenData.access_token) {
    return NextResponse.json({ error: 'Could not get page token: ' + pageTokenData.error?.message }, { status: 502 });
  }
  const pageToken = pageTokenData.access_token;

  // Fetch all lead forms (active + archived so user can see all)
  const formsRes = await fetch(
    `https://graph.facebook.com/v21.0/${page_id}/leadgen_forms?fields=id,name,status,leads_count,questions&limit=100&access_token=${pageToken}`
  );
  const formsData = await formsRes.json();
  if (formsData.error) {
    return NextResponse.json({ error: formsData.error.message }, { status: 502 });
  }

  // Annotate with local lead counts
  const formIds = (formsData.data || []).map((f: any) => f.id);
  const { data: localCounts } = await supabaseAdmin
    .from('facebook_ad_leads')
    .select('form_id')
    .eq('account_id', accountId)
    .in('form_id', formIds);

  const countMap: Record<string, number> = {};
  for (const row of localCounts || []) {
    countMap[row.form_id] = (countMap[row.form_id] || 0) + 1;
  }

  const forms = (formsData.data || []).map((form: any) => ({
    id: form.id,
    name: form.name,
    status: form.status,
    leads_count_meta: form.leads_count || 0,
    leads_count_local: countMap[form.id] || 0,
    questions: (form.questions || []).map((q: any) => ({
      key: q.key,
      label: q.label || q.key,
      type: q.type,
    })),
  }));

  return NextResponse.json({
    forms,
    selectedFormIds: selected_form_ids || [],
    fieldMappings: field_mappings || {},
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accountId, selectedFormIds, fieldMappings } = body;
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const auth = await requireAccountAccess(request, accountId);
  if (auth instanceof NextResponse) return auth;

  const { error } = await supabaseAdmin
    .from('facebook_integrations')
    .update({
      selected_form_ids: selectedFormIds || [],
      field_mappings: fieldMappings || {},
    })
    .eq('account_id', accountId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
