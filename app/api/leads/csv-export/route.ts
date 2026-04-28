import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const TIMEZONES = ['EST', 'CST', 'MST', 'PST'] as const;

// GET /api/leads/csv-export?EST=50&CST=30&MST=20&PST=50&category=calling
// or legacy: ?count=150  (equally distributed)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const category = sp.get('category') || 'calling';

  // Per-timezone mode: EST=N&CST=N&MST=N&PST=N
  const perTz: Partial<Record<typeof TIMEZONES[number], number>> = {};
  for (const tz of TIMEZONES) {
    const v = Number(sp.get(tz) || 0);
    if (v > 0) perTz[tz] = Math.min(v, 500);
  }

  const hasPerTz = Object.keys(perTz).length > 0;

  // Legacy fallback: ?count=N evenly split
  if (!hasPerTz) {
    const total = Math.min(Math.max(Number(sp.get('count') || 150), 1), 2000);
    const each = Math.ceil(total / TIMEZONES.length);
    for (const tz of TIMEZONES) perTz[tz] = each;
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const batchId = `${date}-${randomUUID().slice(0, 8)}`;

  const allLeads: any[] = [];
  const seenIds = new Set<string>();

  for (const tz of TIMEZONES) {
    const want = perTz[tz] || 0;
    if (!want) continue;

    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('lead_category', category)
      .is('csv_batch_id', null)
      .eq('timezone', tz)
      .order('scraped_at', { ascending: false })
      .limit(want);

    if (data) {
      for (const lead of data) {
        if (!seenIds.has(lead.id)) {
          seenIds.add(lead.id);
          allLeads.push(lead);
        }
      }
    }
  }

  if (allLeads.length === 0) {
    return NextResponse.json({ error: 'No leads available for export' }, { status: 404 });
  }

  // Mark batch
  const leadIds = allLeads.map(l => l.id);
  await supabaseAdmin
    .from('leads')
    .update({ csv_batch_id: batchId, csv_downloaded_at: new Date().toISOString() })
    .in('id', leadIds);

  // Build CSV — Company = unique batch ID (e.g. 20260416-a3f2c1b0)
  const header = 'First Name,Last Name,Phone Number,Address,City,State,Zip Code,Country,Email,Company,Role,Website';

  const rows = allLeads.map(lead => {
    // Role: for website leads → "{reviewer name} - {business type}"
    //       for calling leads → "Real Estate Agent"
    let role = 'Real Estate Agent';
    if (category === 'website') {
      const reviewer = lead.reviewer_name || '';
      const bizType = lead.source_brokerage || '';
      role = reviewer && bizType ? `${reviewer} - ${bizType}`
           : reviewer ? reviewer
           : bizType || 'Local Business';
    }

    return [
      csvEscape(lead.first_name || ''),
      csvEscape(lead.last_name || ''),
      csvEscape(lead.mobile_phone || lead.phone || ''),
      '',
      csvEscape(lead.city || ''),
      csvEscape(lead.state_province || ''),
      '',
      csvEscape(lead.country || ''),
      csvEscape(lead.email || ''),
      batchId,
      csvEscape(role),
      csvEscape(lead.profile_url || ''),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');
  const fileName = `${category}-leads-${date}-${allLeads.length}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=${fileName}`,
    },
  });
}

// HEAD /api/leads/csv-export?category=calling|website — available leads per timezone
export async function HEAD(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const category = request.nextUrl.searchParams.get('category') || 'calling';

  const counts: Record<string, number> = {};
  for (const tz of TIMEZONES) {
    const { count } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('lead_category', category)
      .is('csv_batch_id', null)
      .eq('timezone', tz);
    counts[tz] = count || 0;
  }

  return new NextResponse(null, {
    headers: {
      'X-TZ-Counts': JSON.stringify(counts),
    },
  });
}

function csvEscape(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
