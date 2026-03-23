'use client';

import { DealExtended } from '@/types';
import { DollarSign, Calendar, User } from 'lucide-react';

interface DealCardProps {
  deal: DealExtended;
  isDragging?: boolean;
}

export default function DealCard({ deal, isDragging }: DealCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const stageName = deal.stage || '';
  const isWon = stageName === 'Deal Closed' || deal.status === 'won';
  const isLost = stageName === 'Not Interested' || (deal.status === 'lost' && stageName !== 'Deal Closed');

  const borderClass = isWon
    ? 'border-emerald-400 dark:border-emerald-500'
    : isLost
    ? 'border-red-400 dark:border-red-500'
    : 'border-gray-200 dark:border-white/8';

  const accentColor = isWon ? '#10b981' : isLost ? '#ef4444' : undefined;

  return (
    <div
      className={`relative bg-white dark:bg-[#2c2c2e] border rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow overflow-hidden ${borderClass} ${
        isDragging ? 'shadow-lg ring-2 ring-primary-500' : 'hover:shadow-md'
      }`}
    >
      {/* Stage color left accent bar */}
      {accentColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Deal Title */}
      <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2 pl-1 min-w-0 truncate">
        {deal.title}
      </h5>

      {/* Deal Value */}
      <div className={`flex items-center gap-1 font-semibold mb-2 pl-1 min-w-0 ${isWon ? 'text-emerald-600 dark:text-emerald-400' : isLost ? 'text-red-500 dark:text-red-400' : 'text-primary-600'}`}>
        <DollarSign className="w-4 h-4 flex-shrink-0" />
        <span className="truncate tabular-nums">{formatCurrency(deal.value || 0)}</span>
      </div>

      {/* Deal Metadata */}
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 pl-1 min-w-0">
        {/* Probability */}
        {deal.probability !== undefined && (
          <div className="flex items-center justify-between min-w-0">
            <span className="truncate">Probability</span>
            <span className="font-medium tabular-nums flex-shrink-0">{deal.probability}%</span>
          </div>
        )}

        {/* Close Date */}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1 min-w-0">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Close: {formatDate(deal.expected_close_date)}</span>
          </div>
        )}

        {/* Assigned To */}
        {deal.assigned_to && (
          <div className="flex items-center gap-1 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Assigned</span>
          </div>
        )}
      </div>

      {/* Status Badge (for won/lost deals) */}
      {deal.status !== 'open' && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 pl-1">
          <span
            className={`inline-block px-2 py-1 text-xs font-medium rounded ${
              deal.status === 'won'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {deal.status === 'won' ? 'Won' : 'Lost'}
          </span>
        </div>
      )}
    </div>
  );
}
