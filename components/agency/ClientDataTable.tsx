'use client';

import { useState, useMemo } from 'react';
import { CLIENT_STATS, computeAverages, ClientStat } from '@/lib/data/client-stats';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';

type SortKey = keyof ClientStat;
type SortDir = 'asc' | 'desc';

const fmt = {
  days: (n: number) => `${n}d`,
  money: (n: number) => `$${n.toLocaleString()}`,
  num: (n: number) => n.toLocaleString(),
};

const COLUMNS: { key: SortKey; label: string; format: (v: any) => string; mobile?: boolean }[] = [
  { key: 'name',            label: 'Name',           format: String,          mobile: true },
  { key: 'startDate',       label: 'Since',          format: String,          mobile: true },
  { key: 'dealsPerMonth',   label: 'Deals/Mo',       format: fmt.num,         mobile: true },
  { key: 'timeToClient1',   label: '→Client 1',      format: fmt.days },
  { key: 'timeToClient2',   label: '→Client 2',      format: fmt.days },
  { key: 'timeToDeal1',     label: '→Deal 1',        format: fmt.days },
  { key: 'timeToDeal2',     label: '→Deal 2',        format: fmt.days },
  { key: 'apptsPerMonth',   label: 'Appts/Mo',       format: fmt.num },
  { key: 'textsTotal',      label: 'Texts',          format: fmt.num },
  { key: 'emailsTotal',     label: 'Emails',         format: fmt.num },
  { key: 'adSpendPerMonth', label: 'Ad Spend/Mo',    format: fmt.money },
  { key: 'avgGCI',          label: 'Avg GCI',        format: fmt.money },
  { key: 'avgSalesVolume',  label: 'Avg Vol',        format: fmt.money },
];

function exportCSV(data: ClientStat[], avgs: Record<string, number>) {
  const headers = COLUMNS.map(c => c.label).join(',');
  const avgRow = COLUMNS.map(c => {
    if (c.key === 'name') return '"AVERAGES"';
    if (c.key === 'startDate') return '""';
    return avgs[c.key] !== undefined ? String(Math.round(avgs[c.key] * 100) / 100) : '""';
  }).join(',');
  const rows = data.map(s =>
    COLUMNS.map(c => {
      const v = s[c.key];
      return typeof v === 'string' ? `"${v}"` : String(v);
    }).join(',')
  );
  const csv = [headers, avgRow, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'client-stats.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientDataTable() {
  const [sortKey, setSortKey] = useState<SortKey>('dealsPerMonth');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const avgs = useMemo(() => computeAverages(CLIENT_STATS), []);

  const sorted = useMemo(() => {
    return [...CLIENT_STATS].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-indigo-400" />
      : <ChevronDown className="w-3 h-3 text-indigo-400" />;
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden bg-white dark:bg-[#111113]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{CLIENT_STATS.length}</span> clients
        </p>
        <button
          onClick={() => exportCSV(CLIENT_STATS, avgs as any)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/8 rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/8 bg-gray-50/80 dark:bg-white/3">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none whitespace-nowrap ${col.key === 'name' ? 'sticky left-0 z-10 bg-gray-50/80 dark:bg-[#111113]' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </div>
                </th>
              ))}
            </tr>
            {/* Averages row */}
            <tr className="border-b border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/8">
              {COLUMNS.map(col => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 text-[12px] font-bold whitespace-nowrap ${col.key === 'name' ? 'sticky left-0 z-10 bg-indigo-50/80 dark:bg-[#111113] text-indigo-700 dark:text-indigo-400' : 'text-indigo-700 dark:text-indigo-400'}`}
                >
                  {col.key === 'name'
                    ? 'AVG'
                    : col.key === 'startDate'
                    ? '—'
                    : col.format((avgs as any)[col.key])}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr
                key={s.slug}
                className={`border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/2'}`}
              >
                {COLUMNS.map(col => (
                  <td
                    key={col.key}
                    className={`px-3 py-2.5 whitespace-nowrap text-[13px] ${col.key === 'name' ? 'sticky left-0 z-10 bg-white dark:bg-[#111113] font-medium text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {col.format(s[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
