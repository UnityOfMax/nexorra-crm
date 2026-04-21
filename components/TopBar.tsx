'use client';
import React from 'react';
import { Avatar, Button } from './ui/primitives';
import { Icons } from './Icons';
import type { SubAccount } from './Sidebar';

interface TopBarProps {
  sub: SubAccount;
  isMobile: boolean;
  onMenu?: () => void;
}

export function TopBar({ sub, isMobile, onMenu }: TopBarProps) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20, background: 'var(--paper)',
      borderBottom: '1px solid var(--line)',
      padding: isMobile ? 'max(env(safe-area-inset-top), 10px) 16px 10px' : '10px 32px',
      display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
    }}>
      {isMobile && (
        <button
          onClick={onMenu}
          style={{
            width: 34, height: 34, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)',
            color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <Avatar tag={sub.tag} color={sub.color} size={26} />
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sub.name}
          </div>
        </div>
      )}
      {!isMobile && (
        <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
            <Icons.search size={14} />
          </span>
          <input
            placeholder={`Search ${sub.name}...  ⌘K`}
            style={{
              width: '100%', padding: '7px 12px 7px 34px', border: '1px solid var(--line)',
              background: 'var(--paper-2)', borderRadius: 8, fontSize: 13, outline: 'none',
              fontFamily: 'inherit', color: 'var(--ink)',
            }}
          />
        </div>
      )}
      <div style={{ flex: 1 }} />
      {!isMobile && (
        <Button variant="ghost" size="sm" icon={<Icons.sparkle size={14} />} style={{ color: 'var(--blue)' }}>
          Ask Nexorra AI
        </Button>
      )}
      <button style={{
        width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)',
        color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'pointer',
      }}>
        <Icons.bell size={15} />
        <span style={{
          position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 999, background: 'var(--rose)',
        }} />
      </button>
      {!isMobile && (
        <Button variant="grad" size="sm" icon={<Icons.plus size={13} />}>Create</Button>
      )}
    </div>
  );
}

export default TopBar;
