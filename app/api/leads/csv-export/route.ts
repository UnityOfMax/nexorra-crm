import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/require-account-access';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/leads/csv-export — generate and download a CSV batch of calling leads
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const batchId = randomUUID();

  // Fetch up to 150 calling leads not yet batched, ordered by timezone (EST→PST)
  const timezoneOrder = ['EST', 'CST', 'MST', 'PST'];
  const allLeads: any[] = [];

  for (const tz of timezoneOrder) {
    if (allLeads.length >= 150) break;
    const remaining = Math.min(50, 150 - allLeads.length);

    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('lead_category', 'calling')
      .is('csv_batch_id', null)
      .eq('timezone', tz)
      .order('scraped_at', { ascending: false })
      .limit(remaining);

    if (data) allLeads.push(...data);
  }

  // If we didn't hit 150, fill from any timezone
  if (allLeads.length < 150) {
    const existingIds = allLeads.map(l => l.id);
    const { data } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('lead_category', 'calling')
      .is('csv_batch_id', null)
      .order('scraped_at', { ascending: false })
      .limit(150 - allLeads.length);

    if (data) {
      for (const lead of data) {
        if (!existingIds.includes(lead.id)) allLeads.push(lead);
      }
    }
  }

  if (allLeads.length === 0) {
    return NextResponse.json({ error: 'No calling leads available for export' }, { status: 404 });
  }

  // Mark all leads as batched + downloaded
  const leadIds = allLeads.map(l => l.id);
  await supabaseAdmin
    .from('leads')
    .update({
      csv_batch_id: batchId,
      csv_downloaded_at: new Date().toISOString(),
    })
    .in('id', leadIds);

  // Build CSV
  const header = 'First Name,Last Name,Phone Number,Address,City,State,Zip Code,Country,Email,Company,Role,Website';

  const brokerageNames: Record<string, string> = {
    remax: 'RE/MAX',
    century21: 'Century 21',
    kw: 'Keller Williams',
    exp: 'eXp Realty',
    coldwellbanker: 'Coldwell Banker',
    bhhs: 'Berkshire Hathaway',
    compass: 'Compass',
    sothebys: "Sotheby's",
  };

  const rows = allLeads.map(lead => {
    const fields = [
      csvEscape(lead.first_name || ''),
      csvEscape(lead.last_name || ''),
      csvEscape(lead.mobile_phone || lead.phone || ''),
      '', // Address — not available
      csvEscape(lead.city || ''),
      csvEscape(lead.state_province || ''),
      '', // Zip Code — not available
      csvEscape(lead.country || ''),
      csvEscape(lead.email || ''),
      csvEscape(brokerageNames[lead.source_brokerage] || lead.source_brokerage || ''),
      'Real Estate Agent',
      csvEscape(lead.profile_url || ''),
    ];
    return fields.join(',');
  });

  const csv = [header, ...rows].join('\n');
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=calling-leads-${date}.csv`,
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
