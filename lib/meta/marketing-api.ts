/**
 * Meta Marketing API client.
 *
 * READ operations: fetch campaign/adset performance metrics.
 * WRITE operations: pause/activate adsets, update budgets, upload images,
 *   create creatives and ads.
 *
 * Write operations are ONLY called after explicit admin/owner approval
 * via the optimizer_actions approval flow in the dashboard.
 * The optimizer agent writes proposals; the dashboard executes them.
 */

const META_API_VERSION = 'v19.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdSetMetric {
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  date_start: string;
  date_stop: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  leads: number;
  page_views: number;
  cpl: number | null;
  cpm: number | null;
  status?: string;
}

export interface CreateAdCreativeParams {
  adAccountId: string; // act_XXXXXXX
  pageId: string;
  imageHash: string;
  headline: string;
  bodyText: string;
  link: string;
  callToAction?: 'LEARN_MORE' | 'SIGN_UP' | 'BOOK_TRAVEL' | 'GET_QUOTE';
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN not configured');
  return token;
}

async function metaGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const token = getToken();
  const qs = new URLSearchParams({ access_token: token, ...params });
  const url = `${META_BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const data = await res.json();
  if (!res.ok) throw new Error(`Meta API GET error: ${data?.error?.message || res.status}`);
  return data;
}

async function metaPost(path: string, body: Record<string, any>): Promise<any> {
  const token = getToken();
  const url = `${META_BASE}${path}?access_token=${token}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Meta API POST error: ${data?.error?.message || res.status}`);
  return data;
}

// ─── READ operations ──────────────────────────────────────────────────────────

export async function fetchAdSetInsights(params: {
  adAccountId: string;
  datePreset?: 'yesterday' | 'last_7d' | 'last_30d' | 'last_14d';
  since?: string; // YYYY-MM-DD
  until?: string;
  accessToken?: string; // override global META_ACCESS_TOKEN for per-account OAuth tokens
}): Promise<AdSetMetric[]> {
  const fields = [
    'campaign_id', 'campaign_name', 'adset_id', 'adset_name',
    'impressions', 'reach', 'clicks', 'spend', 'cpm',
    'actions', 'date_start', 'date_stop',
  ].join(',');

  const queryParams: Record<string, string> = {
    level: 'adset',
    fields,
  };

  if (params.datePreset) {
    queryParams.date_preset = params.datePreset;
  } else if (params.since && params.until) {
    queryParams.time_range = JSON.stringify({ since: params.since, until: params.until });
  } else {
    queryParams.date_preset = 'last_7d';
  }

  const results: AdSetMetric[] = [];
  let cursor: string | null = null;
  const token = params.accessToken || getToken();

  do {
    if (cursor) queryParams.after = cursor;

    const qs = new URLSearchParams({ access_token: token, ...queryParams });
    const url = `${META_BASE}/act_${params.adAccountId.replace('act_', '')}/insights?${qs.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const data = await res.json();
    if (!res.ok) throw new Error(`Meta API GET error: ${data?.error?.message || res.status}`);

    for (const row of (data.data || [])) {
      const actions: Array<{ action_type: string; value: string }> = row.actions || [];
      const leadAction = actions.find((a) => a.action_type === 'lead');
      const pageViewAction = actions.find((a) => a.action_type === 'landing_page_view');
      const leads = leadAction ? parseInt(leadAction.value, 10) : 0;
      const pageViews = pageViewAction ? parseInt(pageViewAction.value, 10) : 0;
      const spend = parseFloat(row.spend || '0');
      const impressions = parseInt(row.impressions || '0', 10);
      const cpm = impressions > 0 ? parseFloat(row.cpm || String((spend / impressions) * 1000)) : null;

      results.push({
        campaign_id: row.campaign_id || '',
        campaign_name: row.campaign_name || '',
        adset_id: row.adset_id || '',
        adset_name: row.adset_name || '',
        date_start: row.date_start || '',
        date_stop: row.date_stop || '',
        impressions,
        reach: parseInt(row.reach || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        spend,
        leads,
        page_views: pageViews,
        cpl: leads > 0 ? spend / leads : null,
        cpm: cpm != null ? Math.round(cpm * 100) / 100 : null,
      });
    }

    cursor = data.paging?.cursors?.after || null;
    // Stop if no next page
    if (!data.paging?.next) cursor = null;
  } while (cursor);

  return results;
}

// ─── WRITE operations (require approved optimizer_action) ─────────────────────

export async function pauseAdSet(adSetId: string): Promise<void> {
  await metaPost(`/${adSetId}`, { status: 'PAUSED' });
}

export async function activateAdSet(adSetId: string): Promise<void> {
  await metaPost(`/${adSetId}`, { status: 'ACTIVE' });
}

/**
 * Update daily budget for an ad set.
 * @param dailyBudgetCents Budget in cents (e.g. $10 = 1000)
 */
export async function updateAdSetBudget(adSetId: string, dailyBudgetCents: number): Promise<void> {
  await metaPost(`/${adSetId}`, { daily_budget: String(Math.round(dailyBudgetCents)) });
}

/**
 * Upload an image to Meta ad account.
 * @param imageBase64 Base64-encoded image data (no data URI prefix)
 * @returns image_hash to use in creative creation
 */
export async function uploadAdImage(adAccountId: string, imageBase64: string): Promise<string> {
  const acctId = adAccountId.replace('act_', '');
  const data = await metaPost(`/act_${acctId}/adimages`, { bytes: imageBase64 });
  // Response: { images: { untitled: { hash: "...", url: "..." } } }
  const images = data.images;
  const firstKey = Object.keys(images || {})[0];
  const hash = images?.[firstKey]?.hash;
  if (!hash) throw new Error('No image hash in Meta response');
  return hash;
}

/**
 * Create an ad creative (image + copy) in Meta.
 * @returns creative_id
 */
export async function createAdCreative(params: CreateAdCreativeParams): Promise<string> {
  const acctId = params.adAccountId.replace('act_', '');
  const data = await metaPost(`/act_${acctId}/adcreatives`, {
    name: `Creative-${Date.now()}`,
    object_story_spec: {
      page_id: params.pageId,
      link_data: {
        image_hash: params.imageHash,
        message: params.bodyText,
        headline: params.headline,
        link: params.link,
        call_to_action: {
          type: params.callToAction || 'LEARN_MORE',
          value: { link: params.link },
        },
      },
    },
  });

  if (!data.id) throw new Error('No creative_id in Meta response');
  return data.id;
}

/**
 * Create a new ad in an ad set using an existing creative.
 * @returns ad_id
 */
export async function createAd(params: {
  adAccountId: string;
  adSetId: string;
  creativeId: string;
  name: string;
}): Promise<string> {
  const acctId = params.adAccountId.replace('act_', '');
  const data = await metaPost(`/act_${acctId}/ads`, {
    name: params.name,
    adset_id: params.adSetId,
    creative: { creative_id: params.creativeId },
    status: 'ACTIVE',
  });

  if (!data.id) throw new Error('No ad_id in Meta response');
  return data.id;
}

/**
 * Pause a specific ad (not the whole adset).
 */
export async function pauseAd(adId: string): Promise<void> {
  await metaPost(`/${adId}`, { status: 'PAUSED' });
}

/**
 * Batch multiple Meta API operations in a single request (up to 50).
 * Used to bulk-update multiple adsets efficiently.
 */
export interface MetaBatchOp {
  method: 'GET' | 'POST';
  relative_url: string;
  body?: Record<string, any>;
}

export async function batchOperations(ops: MetaBatchOp[]): Promise<any[]> {
  if (ops.length === 0) return [];
  if (ops.length > 50) throw new Error('Meta batch limit is 50 operations');

  const token = getToken();
  const formattedOps = ops.map((op) => ({
    method: op.method,
    relative_url: op.relative_url,
    body: op.body ? Object.entries(op.body).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : undefined,
  }));

  const res = await fetch(`${META_BASE}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: formattedOps }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Meta batch error: ${JSON.stringify(data)}`);
  return Array.isArray(data) ? data.map((r: any) => JSON.parse(r.body || '{}')) : [];
}
