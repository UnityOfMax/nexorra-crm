'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

export interface AdSetRow {
  adset_id: string;
  adset_name: string;
  campaign_name?: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  appointments?: number;
  cpl: number | null;
  cpa: number | null;
}

interface MetaCampaignTableProps {
  rows: AdSetRow[];
  currency?: string;
}

type SortField = 'spend' | 'leads' | 'cpl' | 'appointments';

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function money(n: number | null, currency = 'USD'): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function rowClass(row: AdSetRow): string {
  if (row.cpl == null || row.leads === 0) return '';
  // Compute a rough benchmark: if only one row, no comparison available
  // We use heuristic: CPL < $40 and leads > 0 = good; CPL > $80 = bad
  if (row.cpl < 40 && row.leads >= 3) return 'bg-emerald-500/5';
  if (row.cpl > 80 || row.leads === 0) return 'bg-red-500/5';
  return '';
}

export default function MetaCampaignTable({ rows, currency = 'USD' }: MetaCampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortField] ?? Infinity;
    const bv = b[sortField] ?? Infinity;
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc((p) => !p);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs text-[var(--analytics-muted)] hover:text-white transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-[var(--analytics-accent)]' : ''}`} />
    </button>
  );

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--analytics-muted)] text-sm">
        No ad metrics yet. Data syncs daily at 6 AM.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 pr-4 text-xs text-[var(--analytics-muted)] font-medium tracking-wider">Ad Set</th>
            <th className="text-right py-2 px-3"><SortBtn field="spend" label="Spend" /></th>
            <th className="text-right py-2 px-3"><SortBtn field="leads" label="Leads" /></th>
            <th className="text-right py-2 px-3"><SortBtn field="cpl" label="CPL" /></th>
            <th className="text-right py-2 px-3"><SortBtn field="appointments" label="Appts" /></th>
            <th className="text-right py-2 pl-3 text-xs text-[var(--analytics-muted)] font-medium">CPA</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={`${row.adset_id}-${row.date}`}
              className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${rowClass(row)}`}
            >
              <td className="py-2.5 pr-4">
                <p className="font-medium text-white/90 truncate max-w-[200px]">{row.adset_name}</p>
                {row.campaign_name && (
                  <p className="text-xs text-[var(--analytics-muted)] truncate max-w-[200px]">{row.campaign_name}</p>
                )}
              </td>
              <td className="text-right py-2.5 px-3 font-mono text-white/80 tabular-nums">
                {money(row.spend, currency)}
              </td>
              <td className="text-right py-2.5 px-3 font-mono text-white/80 tabular-nums">
                {fmt(row.leads)}
              </td>
              <td className={`text-right py-2.5 px-3 font-mono tabular-nums font-semibold ${
                row.cpl == null ? 'text-[var(--analytics-muted)]'
                : row.cpl < 40 ? 'text-[var(--analytics-positive)]'
                : row.cpl > 80 ? 'text-[var(--analytics-negative)]'
                : 'text-white/80'
              }`}>
                {money(row.cpl, currency)}
              </td>
              <td className="text-right py-2.5 px-3 font-mono text-white/80 tabular-nums">
                {row.appointments != null ? fmt(row.appointments) : '—'}
              </td>
              <td className="text-right py-2.5 pl-3 font-mono text-white/80 tabular-nums">
                {money(row.cpa, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
