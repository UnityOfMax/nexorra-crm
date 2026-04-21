'use client';
import React, { useState, useEffect, useRef, RefObject } from 'react';

// ─── Menu ─────────────────────────────────────────────────────────────────────

interface MenuProps {
  open: boolean;
  onClose?: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
  width?: number;
  align?: 'left' | 'right';
}

export function Menu({ open, onClose, anchorRef, children, width = 240, align = 'left' }: MenuProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: align === 'right' ? r.right - width : r.left });
    const onDoc = (e: MouseEvent) => {
      if (
        !anchorRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        onClose?.();
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div ref={menuRef} style={{
      position: 'fixed', top: pos.top, left: pos.left, width,
      background: 'var(--paper)', border: '1px solid var(--line-2)', borderRadius: 10,
      boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 100,
      animation: 'menuIn 140ms cubic-bezier(0.2,0.8,0.2,1)',
    }}>
      {children}
    </div>
  );
}

// ─── MenuItem ─────────────────────────────────────────────────────────────────

interface MenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  icon?: React.ReactNode;
  meta?: string;
  danger?: boolean;
}

export function MenuItem({ children, onClick, active, icon, meta, danger }: MenuItemProps) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
        borderRadius: 6, cursor: 'pointer',
        background: h || active ? 'var(--paper-3)' : 'transparent',
        color: danger ? 'var(--rose)' : 'var(--ink)',
        fontSize: 13.5,
      }}
    >
      {icon && <span style={{ display: 'flex', color: danger ? 'var(--rose)' : 'var(--ink-3)' }}>{icon}</span>}
      <span style={{ flex: 1 }}>{children}</span>
      {meta && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meta}</span>}
    </div>
  );
}
