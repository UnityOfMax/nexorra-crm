'use client';

import { Users, CalendarCheck, Phone, Star, Award } from 'lucide-react';
import type { FunnelData } from '@/lib/data/mock-subaccounts';

interface Props {
  data: FunnelData;
  className?: string;
}

const STAGES = [
  { key: 'leads' as const,          label: 'Total Leads',           icon: Users,         color: 'from-blue-500 to-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800/50' },
  { key: 'appointments' as const,   label: 'Appointments',          icon: CalendarCheck, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50' },
  { key: 'contactedAppts' as const, label: 'Appointments Called',   icon: Phone,         color: 'from-amber-500 to-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/40',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800/50' },
  { key: 'clientsClosed' as const,  label: 'Clients Closed',        icon: Star,          color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/50' },
  { key: 'dealsClosed' as const,    label: 'Deals Closed',          icon: Award,         color: 'from-lime-500 to-lime-600',     bg: 'bg-lime-50 dark:bg-lime-950/40',     text: 'text-lime-700 dark:text-lime-400',     border: 'border-lime-200 dark:border-lime-800/50' },
];

export default function FunnelDiagram({ data, className = '' }: Props) {
  const max = data.leads || 1;

  return (
    <div className={`card ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sales Funnel</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Lead-to-deal conversion overview</p>
      </div>

      <div className="space-y-2.5">
        {STAGES.map((stage, i) => {
          const value = data[stage.key];
          const prev = i > 0 ? data[STAGES[i - 1].key] : null;
          const pct = Math.round((value / max) * 100);
          const conversion = prev && prev > 0 ? Math.round((value / prev) * 100) : null;
          const Icon = stage.icon;

          return (
            <div key={stage.key}>
              {/* Conversion label between stages */}
              {conversion !== null && (
                <div className="flex items-center gap-2 mb-1.5 pl-1">
                  <div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 px-2">
                    {conversion}% conversion ↓
                  </span>
                  <div className="h-px flex-1 bg-gray-100 dark:bg-white/8" />
                </div>
              )}

              {/* Stage row */}
              <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${stage.bg} ${stage.border}`}>
                {/* Icon */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>

                {/* Label + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${stage.text} text-center flex-1`}>{stage.label}</span>
                    <span className={`text-sm font-bold tabular-nums ${stage.text} ml-2`}>{value.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${stage.color} rounded-full transition-all duration-500 mx-auto`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
