'use client';

import { useState, useMemo } from 'react';
import { CLIENT_STATS, computeAverages, ClientStat } from '@/lib/data/client-stats';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';

type SortKey = keyof ClientStat;
type SortDir = 'asc' | 'desc';
type Timeframe = '30d' | '7d';

const fmt = {
  days: (n: number) => n === 0 ? '—' : `${n}d`,
  money: (n: number) => n === 0 ? '—' : `$${n.toLocaleString()}`,
  num: (n: number) => n.toLocaleString(),
  users: (n: number) => String(n),
};

// Scale activity metrics for timeframe (time-based fields stay the same, counts scale)
function scaleForTimeframe(s: ClientStat, tf: Timeframe): ClientStat {
  if (tf === '30d') return s;
  // 7d: scale deals/appts down proportionally, some drop to 0; texts/emails scale similarly
  const factor = 7 / 30;
  return {
    ...s,
    dealsPerMonth:   Math.floor(s.dealsPerMonth * factor),
    apptsPerMonth:   Math.floor(s.apptsPerMonth * factor),
    textsTotal:      Math.floor(s.textsTotal * factor),
    emailsTotal:     Math.floor(s.emailsTotal * factor),
    adSpendPerMonth: Math.floor(s.adSpendPerMonth * factor),
  };
}

const COLUMNS: { key: SortKey; label: string; format: (v: any) => string; isTime?: boolean }[] = [
  { key: 'name',            label: 'Name',        format: String },
  { key: 'startDate',       label: 'Since',       format: String },
  { key: 'users',           label: 'Users',       format: fmt.users },
  { key: 'dealsPerMonth',   label: 'Deals',       format: fmt.num },
  { key: 'apptsPerMonth',   label: 'Appts',       format: fmt.num },
  { key: 'timeToClient1',   label: '→Client 1',   format: fmt.days, isTime: true },
  { key: 'timeToClient2',   label: '→Client 2',   format: fmt.days, isTime: true },
  { key: 'timeToDeal1',     label: '→Deal 1',     format: fmt.days, isTime: true },
  { key: 'timeToDeal2',     label: '→Deal 2',     format: fmt.days, isTime: true },
  { key: 'textsTotal',      label: 'Texts',       format: fmt.num },
  { key: 'emailsTotal',     label: 'Emails',      format: fmt.num },
  { key: 'adSpendPerMonth', label: 'Ad Spend',    format: fmt.money },
  { key: 'avgGCI',          label: 'Avg GCI',     format: fmt.money },
  { key: 'avgSalesVolume',  label: 'Avg Vol',     format: fmt.money },
];

// Stable pseudo-random shuffle (seeded by index so it's consistent across renders)
const SHUFFLED_STATS = [...CLIENT_STATS].sort((a, b) => {
  const ha = Array.from(a.slug).reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0);
  const hb = Array.from(b.slug).reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0);
  return ha - hb;
});

function exportCSV(data: ClientStat[], avgs: Record<string, number>, tf: Timeframe) {
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
  a.download = `client-stats-${tf}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientDataTable() {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');

  const scaledStats = useMemo(
    () => SHUFFLED_STATS.map(s => scaleForTimeframe(s, timeframe)),
    [timeframe]
  );

  const avgs = useMemo(() => computeAverages(scaledStats), [scaledStats]);

  const totalUsers = useMemo(
    () => CLIENT_STATS.reduce((sum, s) => sum + s.users, 0),
    []
  );

  const sorted = useMemo(() => {
    if (!sortKey) return scaledStats;
    return [...scaledStats].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [scaledStats, sortKey, sortDir]);

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
      ? <ChevronUp className="w-3 h-3 text-[var(--nx-primary)]" />
      : <ChevronDown className="w-3 h-3 text-[var(--nx-primary)]" />;
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden bg-white dark:bg-[#111113]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/3">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{CLIENT_STATS.length}</span> clients
            &nbsp;·&nbsp;
            <span className="font-semibold text-gray-900 dark:text-gray-100">{totalUsers}</span> users
          </p>
          {/* Timeframe toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-white/5 rounded-lg">
            {(['30d', '7d'] as Timeframe[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeframe === tf
                    ? 'bg-white dark:bg-white/12 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tf === '30d' ? 'Last 30d' : 'Last 7d'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => exportCSV(sorted, avgs as any, timeframe)}
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
                  className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none whitespace-nowrap ${''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.key === 'dealsPerMonth' || col.key === 'apptsPerMonth' || col.key === 'textsTotal' || col.key === 'emailsTotal' || col.key === 'adSpendPerMonth'
                      ? <>{col.label} <span className="text-[9px] text-gray-400 dark:text-gray-500 normal-case tracking-normal font-normal">/{timeframe}</span></>
                      : col.label
                    }
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
                  className={`px-3 py-2.5 text-[12px] font-bold whitespace-nowrap ${col.key === 'name' ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-700 dark:text-indigo-400'}`}
                >
                  {col.key === 'name'
                    ? 'AVG'
                    : col.key === 'startDate'
                    ? '—'
                    : col.key === 'users'
                    ? '—'
                    : col.format((avgs as any)[col.key])}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const isNew = s.dealsPerMonth === 0 && s.apptsPerMonth === 0 && s.textsTotal === 0;
              return (
                <tr
                  key={s.slug}
                  className={`border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/2'}`}
                >
                  {COLUMNS.map(col => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 whitespace-nowrap text-[13px] ${
                        col.key === 'name'
                          ? 'font-medium text-gray-900 dark:text-gray-100'
                          : isNew && col.key !== 'startDate' && col.key !== 'users'
                          ? 'text-gray-300 dark:text-gray-600'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {col.key === 'name' && isNew
                        ? <span className="flex items-center gap-2">{s.name}<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded">New</span></span>
                        : col.format(s[col.key])
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
