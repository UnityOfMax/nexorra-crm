'use client';
import React from 'react';

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  width?: number;
}

export function Modal({ open, onClose, children, width = 620 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'oklch(18% 0.012 260 / 0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        animation: 'fadeIn 160ms ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width, maxHeight: '88vh', overflow: 'auto',
          background: 'var(--paper)', border: '1px solid var(--line-2)',
          borderRadius: 16, boxShadow: 'var(--shadow-lg)',
          animation: 'modalIn 180ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, children, width = 520 }: DrawerProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'oklch(18% 0.012 260 / 0.3)', backdropFilter: 'blur(2px)',
        zIndex: 200, animation: 'fadeIn 160ms ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width,
          background: 'var(--paper)', borderLeft: '1px solid var(--line-2)', boxShadow: 'var(--shadow-lg)',
          animation: 'drawerIn 220ms cubic-bezier(0.2,0.8,0.2,1)', overflow: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
