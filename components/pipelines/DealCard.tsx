'use client';

import { DealExtended } from '@/types';
import { Calendar, GripVertical } from 'lucide-react';

interface DealCardProps {
  deal: DealExtended;
  isDragging?: boolean;
}

const STAGE_PILL: Record<string, string> = {
  'won':  'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  'lost': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

export default function DealCard({ deal, isDragging }: DealCardProps) {
  const isWon  = deal.status === 'won';
  const isLost = deal.status === 'lost';

  const formatDate = (s?: string) => {
    if (!s) return null;
    const d = new Date(s);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const closeDate = formatDate(deal.expected_close_date);

  return (
    <div
      className={`group bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/8 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging
          ? 'shadow-xl ring-2 ring-primary-500 rotate-1 scale-[1.02]'
          : 'shadow-sm hover:shadow-md hover:-translate-y-px'
      }`}
    >
      {/* Drag handle + title row */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 flex-1 min-w-0">
          {deal.title}
        </p>
      </div>


      {/* Value + metadata row */}
      <div className="flex items-center justify-between mt-2 pl-5">
        <span className={`text-[13px] font-bold tabular-nums ${
          isWon ? 'text-emerald-600 dark:text-emerald-400' :
          isLost ? 'text-red-500 dark:text-red-400' :
          'text-emerald-600 dark:text-emerald-400'
        }`}>
          ${(deal.value || 0).toLocaleString()}
        </span>

        <div className="flex items-center gap-2">
          {/* Probability */}
          {deal.probability !== undefined && deal.probability > 0 && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums">
              {deal.probability}%
            </span>
          )}
          {/* Close date */}
          {closeDate && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500">
              <Calendar className="w-3 h-3" />
              {closeDate}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      {deal.status !== 'open' && (
        <div className="mt-2 pl-5">
          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${STAGE_PILL[deal.status] || STAGE_PILL.lost}`}>
            {isWon ? 'Won' : 'Lost'}
          </span>
        </div>
      )}
    </div>
  );
}
