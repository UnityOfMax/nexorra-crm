import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  pauseAdSet,
  activateAdSet,
  updateAdSetBudget,
  uploadAdImage,
  createAdCreative,
  createAd,
  pauseAd,
} from '@/lib/meta/marketing-api';
import { generateAdCreative } from '@/lib/meta/creative-generator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/meta/manage
 *
 * Executes a pre-approved optimizer_action against the Meta API.
 * Auth: CRON_SECRET bearer token.
 *
 * Body: { actionId: string }   — the optimizer_actions.id to execute
 *
 * IMPORTANT: This route only executes actions that have been explicitly
 * approved by an account admin/owner (approved=true in optimizer_actions).
 * It does NOT auto-approve anything.
 */
export async function POST(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { actionId } = body;
  if (!actionId) {
    return NextResponse.json({ error: 'actionId required' }, { status: 400 });
  }

  // Load the action — must be approved, not yet applied, not rejected
  const { data: action, error: loadErr } = await supabaseAdmin
    .from('optimizer_actions')
    .select('*')
    .eq('id', actionId)
    .single();

  if (loadErr || !action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  if (!action.approved) {
    return NextResponse.json({ error: 'Action not approved' }, { status: 403 });
  }

  if (action.applied) {
    return NextResponse.json({ error: 'Action already applied' }, { status: 409 });
  }

  if (action.rejected) {
    return NextResponse.json({ error: 'Action was rejected' }, { status: 409 });
  }

  // Load account campaign settings for context
  const { data: account } = await supabaseAdmin
    .from('accounts')
    .select('settings')
    .eq('id', action.account_id)
    .single();

  const campaignSettings = account?.settings?.campaign || {};

  try {
    let metaResponse: any = {};

    switch (action.action_type) {
      case 'pause_adset': {
        await pauseAdSet(action.target_id);
        metaResponse = { status: 'PAUSED' };
        break;
      }

      case 'activate_adset': {
        await activateAdSet(action.target_id);
        metaResponse = { status: 'ACTIVE' };
        break;
      }

      case 'increase_budget':
      case 'decrease_budget': {
        // after_state.daily_budget is in cents
        const newBudgetCents = action.after_state?.daily_budget;
        if (!newBudgetCents) throw new Error('Missing daily_budget in after_state');
        await updateAdSetBudget(action.target_id, newBudgetCents);
        metaResponse = { daily_budget: newBudgetCents };
        break;
      }

      case 'pause_ad': {
        await pauseAd(action.target_id);
        metaResponse = { status: 'PAUSED' };
        break;
      }

      case 'creative_refresh': {
        // Generate new creative using Nano Banana + Claude, then create ad
        const adAccountId = campaignSettings.meta_ad_account_id || process.env.META_AD_ACCOUNT_ID;
        const pageId = campaignSettings.facebook_page_id || process.env.META_PAGE_ID;
        const landingPageUrl = action.after_state?.landing_page_url;

        if (!adAccountId || !pageId || !landingPageUrl) {
          throw new Error('Missing adAccountId, pageId, or landing_page_url for creative_refresh');
        }

        // Load account details for creative context
        const { data: accountDetails } = await supabaseAdmin
          .from('accounts')
          .select('name, settings')
          .eq('id', action.account_id)
          .single();

        const creative = await generateAdCreative({
          agentName: accountDetails?.settings?.agent_name || accountDetails?.name || 'Your Agent',
          location: Array.from(campaignSettings.target_locations || ['your area'])[0] as string,
          targetType: Array.from(campaignSettings.target_client_type || ['buyers'])[0] as string,
          uniqueAngle: accountDetails?.settings?.business_context || undefined,
        });

        // Upload image to Meta
        const imageHash = await uploadAdImage(adAccountId, creative.imageBase64);

        // Create creative
        const creativeId = await createAdCreative({
          adAccountId,
          pageId,
          imageHash,
          headline: creative.headline,
          bodyText: creative.bodyText,
          link: landingPageUrl,
        });

        // Create new ad in the existing adset
        const adId = await createAd({
          adAccountId,
          adSetId: action.target_id,
          creativeId,
          name: `AI Creative ${new Date().toISOString().slice(0, 10)}`,
        });

        metaResponse = { creativeId, adId, headline: creative.headline };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action_type: ${action.action_type}` },
          { status: 400 }
        );
    }

    // Mark applied
    await supabaseAdmin
      .from('optimizer_actions')
      .update({
        applied: true,
        applied_at: new Date().toISOString(),
        meta_response: metaResponse,
      })
      .eq('id', actionId);

    return NextResponse.json({ success: true, metaResponse });
  } catch (err: any) {
    console.error('[meta/manage] execution error:', err.message);

    // Record failure on action
    await supabaseAdmin
      .from('optimizer_actions')
      .update({
        meta_response: { error: err.message },
      })
      .eq('id', actionId);

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/meta/manage
 *
 * Approve or reject a pending optimizer_action.
 * Auth: Requires account owner/admin session.
 *
 * Body: { actionId: string, decision: 'approve' | 'reject' }
 */
export async function PATCH(request: NextRequest) {
  const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs');
  const { cookies } = await import('next/headers');
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { actionId, decision } = body;
  if (!actionId || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json(
      { error: 'actionId and decision (approve|reject) required' },
      { status: 400 }
    );
  }

  // Load action + verify user is owner/admin of the account
  const { data: action } = await supabaseAdmin
    .from('optimizer_actions')
    .select('id, account_id, applied, rejected')
    .eq('id', actionId)
    .single();

  if (!action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  if (action.applied || action.rejected) {
    return NextResponse.json({ error: 'Action already finalized' }, { status: 409 });
  }

  // Check membership
  const { data: membership } = await supabaseAdmin
    .from('account_members')
    .select('role')
    .eq('account_id', action.account_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (decision === 'approve') {
    await supabaseAdmin
      .from('optimizer_actions')
      .update({ approved: true })
      .eq('id', actionId);
  } else {
    await supabaseAdmin
      .from('optimizer_actions')
      .update({
        rejected: true,
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
      })
      .eq('id', actionId);
  }

  return NextResponse.json({ success: true, decision });
}
