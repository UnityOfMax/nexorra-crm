'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className = '',
  header,
  footer,
  noPadding = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={`card ${noPadding ? '!p-0' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {header && (
        <div className={`${noPadding ? 'px-6 pt-6' : ''} pb-4 border-b border-gray-100 dark:border-gray-700/50 mb-4`}>
          {header}
        </div>
      )}
      {noPadding ? children : children}
      {footer && (
        <div className={`${noPadding ? 'px-6 pb-6' : ''} pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-4`}>
          {footer}
        </div>
      )}
    </div>
  );
}
