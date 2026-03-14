'use client';

import React, { useEffect, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export default function Modal({
  open,
  onClose,
  children,
  title,
  description,
  maxWidth = 'lg',
}: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className={`modal-content w-full ${maxWidthClasses[maxWidth]} mx-4 max-h-[90vh] overflow-y-auto`}
        style={{ animation: 'modalIn 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {title && (
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
