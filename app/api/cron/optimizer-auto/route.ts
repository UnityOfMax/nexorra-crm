import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  pauseAdSet,
  activateAdSet,
  updateAdSetBudget,
  pauseAd,
} from '@/lib/meta/marketing-api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/optimizer-auto
 *
 * Auto-executes optimizer_actions where tier='auto' without requiring manual approval.
 * Only handles low-risk action types (pause, budget adjustments within bounds).
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find pending auto-tier actions created within the last 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: actions, error } = await supabaseAdmin
    .from('optimizer_actions')
    .select('*')
    .eq('tier', 'auto')
    .eq('applied', false)
    .eq('rejected', false)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!actions || actions.length === 0) {
    return NextResponse.json({ ok: true, executed: 0, message: 'No auto-tier actions pending' });
  }

  const results: Array<{ id: string; action_type: string; success: boolean; error?: string }> = [];

  for (const action of actions) {
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
        default:
          // creative_refresh and other heavy operations require manual approval even if tier='auto'
          await supabaseAdmin
            .from('optimizer_actions')
            .update({ tier: 'review' })
            .eq('id', action.id);
          results.push({ id: action.id, action_type: action.action_type, success: false, error: 'Elevated to review tier — action type requires approval' });
          continue;
      }

      await supabaseAdmin
        .from('optimizer_actions')
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
          meta_response: metaResponse,
        })
        .eq('id', action.id);

      results.push({ id: action.id, action_type: action.action_type, success: true });
    } catch (err: any) {
      await supabaseAdmin
        .from('optimizer_actions')
        .update({ meta_response: { error: err.message } })
        .eq('id', action.id);
      results.push({ id: action.id, action_type: action.action_type, success: false, error: err.message });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  return NextResponse.json({ ok: true, executed: succeeded, total: actions.length, results });
}
