'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

export interface AdSetRow {
  adset_id: string;
  adset_name: string;
  campaign_name?: string;
  date: string;
  impressions: number;
  reach?: number;
  clicks: number;
  spend: number;
  leads: number;
  page_views?: number;
  appointments?: number;
  cpl: number | null;
  cpm?: number | null;
  cpa: number | null;
}

interface MetaCampaignTableProps {
  rows: AdSetRow[];
  currency?: string;
}

type SortField = 'spend' | 'leads' | 'cpl' | 'cpm' | 'page_views' | 'appointments';

function fmt(n: number | undefined | null, decimals = 0): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function money(n: number | null | undefined, currency = 'USD'): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function cplColor(cpl: number | null): string {
  if (cpl == null) return 'text-white/35';
  if (cpl < 40) return 'text-[var(--analytics-positive)]';
  if (cpl > 80) return 'text-[var(--analytics-negative)]';
  return 'text-white/80';
}

export default function MetaCampaignTable({ rows, currency = 'USD' }: MetaCampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortAsc, setSortAsc] = useState(false);

  // Collapse rows by adset_id (aggregate across dates) for a cleaner view
  const aggregated = Object.values(
    rows.reduce<Record<string, AdSetRow>>((acc, r) => {
      const key = r.adset_id;
      if (!acc[key]) {
        acc[key] = { ...r };
      } else {
        acc[key].impressions += r.impressions;
        acc[key].reach = (acc[key].reach ?? 0) + (r.reach ?? 0);
        acc[key].clicks += r.clicks;
        acc[key].spend += r.spend;
        acc[key].leads += r.leads;
        acc[key].page_views = (acc[key].page_views ?? 0) + (r.page_views ?? 0);
        acc[key].appointments = (acc[key].appointments ?? 0) + (r.appointments ?? 0);
      }
      return acc;
    }, {})
  ).map((r) => ({
    ...r,
    cpl: r.leads > 0 ? Math.round((r.spend / r.leads) * 100) / 100 : null,
    cpm: r.impressions > 0 ? Math.round((r.spend / r.impressions) * 1000 * 100) / 100 : null,
    cpa: (r.appointments ?? 0) > 0 ? Math.round((r.spend / r.appointments!) * 100) / 100 : null,
  }));

  const sorted = [...aggregated].sort((a, b) => {
    const av = (a[sortField] as number | null | undefined) ?? Infinity;
    const bv = (b[sortField] as number | null | undefined) ?? Infinity;
    return sortAsc ? av - bv : bv - av;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc((p) => !p);
    else { setSortField(field); setSortAsc(false); }
  };

  const Th = ({ field, label, right = true }: { field: SortField; label: string; right?: boolean }) => (
    <th className={`py-2.5 px-3 ${right ? 'text-right' : 'text-left'}`}>
      <button
        onClick={() => toggleSort(field)}
        className={`inline-flex items-center gap-1 text-[11px] font-medium text-white/35 hover:text-white/70 uppercase tracking-wider transition-colors ${right ? 'flex-row-reverse' : ''}`}
      >
        <ArrowUpDown className={`w-3 h-3 flex-shrink-0 ${sortField === field ? 'text-[var(--analytics-accent)]' : ''}`} />
        {label}
      </button>
    </th>
  );

  if (rows.length === 0) {
    return (
      <div className="text-center py-14 text-white/25 text-sm">
        No ad metrics yet. Hit <span className="text-white/50 font-medium">Sync Now</span> or wait for the 6 AM daily sync.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className="text-left py-2.5 pl-1 pr-4 text-[11px] font-medium text-white/35 uppercase tracking-wider">Ad Set</th>
            <Th field="spend"        label="Spend" />
            <Th field="page_views"   label="Page Views" />
            <Th field="leads"        label="Leads" />
            <Th field="cpl"          label="CPL" />
            <Th field="cpm"          label="CPM" />
            <Th field="appointments" label="Booked" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.adset_id}
              className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group"
            >
              <td className="py-3 pl-1 pr-4">
                <p className="font-medium text-white/85 truncate max-w-[220px] group-hover:text-white transition-colors">{row.adset_name}</p>
                {row.campaign_name && (
                  <p className="text-[11px] text-white/30 truncate max-w-[220px] mt-0.5">{row.campaign_name}</p>
                )}
              </td>
              <td className="text-right py-3 px-3 font-mono text-white/75 tabular-nums text-[13px]">
                {money(row.spend, currency)}
              </td>
              <td className="text-right py-3 px-3 font-mono text-white/75 tabular-nums text-[13px]">
                <span>{fmt(row.page_views)}</span>
                {(row.reach ?? 0) > 0 && (
                  <span className="block text-[11px] text-white/30">{fmt(row.reach)} reach</span>
                )}
              </td>
              <td className="text-right py-3 px-3 font-mono text-white/75 tabular-nums text-[13px]">
                {fmt(row.leads)}
              </td>
              <td className={`text-right py-3 px-3 font-mono tabular-nums text-[13px] font-semibold ${cplColor(row.cpl)}`}>
                {money(row.cpl, currency)}
              </td>
              <td className="text-right py-3 px-3 font-mono text-white/55 tabular-nums text-[13px]">
                {money(row.cpm, currency)}
              </td>
              <td className="text-right py-3 px-3 font-mono tabular-nums text-[13px]">
                <span className={(row.appointments ?? 0) > 0 ? 'text-[var(--analytics-positive)] font-semibold' : 'text-white/35'}>
                  {row.appointments != null ? fmt(row.appointments) : '—'}
                </span>
                {row.cpa != null && (
                  <span className="block text-[11px] text-white/30">{money(row.cpa, currency)} ea</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
