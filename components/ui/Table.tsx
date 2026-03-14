'use client';

import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  keyExtractor?: (row: T) => string;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
  compact = false,
  keyExtractor,
}: TableProps<T>) {
  const cellPadding = compact ? 'px-4 py-2' : 'px-6 py-3.5';
  const headerPadding = compact ? 'px-4 py-2' : 'px-6 py-3';

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${headerPadding} text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={`${cellPadding} text-center text-gray-400 dark:text-gray-500`}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={keyExtractor ? keyExtractor(row) : row.id || i}
                className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' : ''} transition-colors`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`${cellPadding} text-sm text-gray-700 dark:text-gray-300 ${col.className || ''}`}>
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
