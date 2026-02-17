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

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-primary-500' : 'hover:shadow-md'
      }`}
    >
      {/* Deal Title */}
      <h5 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {deal.title}
      </h5>

      {/* Deal Value */}
      <div className="flex items-center gap-1 text-primary-600 font-semibold mb-2">
        <DollarSign className="w-4 h-4" />
        <span>{formatCurrency(deal.value || 0)}</span>
      </div>

      {/* Deal Metadata */}
      <div className="space-y-1 text-xs text-gray-600">
        {/* Probability */}
        {deal.probability !== undefined && (
          <div className="flex items-center justify-between">
            <span>Probability</span>
            <span className="font-medium">{deal.probability}%</span>
          </div>
        )}

        {/* Close Date */}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Close: {formatDate(deal.expected_close_date)}</span>
          </div>
        )}

        {/* Assigned To */}
        {deal.assigned_to && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate">Assigned</span>
          </div>
        )}
      </div>

      {/* Status Badge (for won/lost deals) */}
      {deal.status !== 'open' && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span
            className={`inline-block px-2 py-1 text-xs font-medium rounded ${
              deal.status === 'won'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {deal.status === 'won' ? 'Won' : 'Lost'}
          </span>
        </div>
      )}
    </div>
  );
}
