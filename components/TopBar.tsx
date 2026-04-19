'use client';

import { useState } from 'react';
import type { Account } from '@/types';

interface TopBarProps {
  currentAccount: Account;
  activeView: string;
  isMobile?: boolean;
  onMenu?: () => void;
  onCreateClick?: () => void;
}

function accountTag(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'N';
}

const VIEW_LABELS: Record<string, string> = {
  'sub-accounts': 'Subaccounts',
  'dashboard': 'Dashboard',
  'leads': 'Leads',
  'campaigns': 'Campaigns',
  'instagram-dms': 'Instagram DMs',
  'agency-analytics': 'Analytics',
  'command-center': 'Command Center',
  'pipelines': 'Opportunities',
  'contacts': 'Contacts',
  'conversations': 'Conversations',
  'calendar': 'Calendar',
  'workflows': 'Workflows',
  'pages': 'Landing Pages',
  'analytics': 'Analytics',
  'ai-agent': 'AI Agent',
  'settings': 'Settings',
};

export default function TopBar({ currentAccount, activeView, isMobile, onMenu, onCreateClick }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const viewLabel = VIEW_LABELS[activeView] || activeView;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'var(--paper)',
      borderBottom: '1px solid var(--line)',
      padding: isMobile ? '10px 16px' : '10px 32px',
      display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12,
    }}>
      {/* Mobile hamburger */}
      {isMobile && (
        <button onClick={onMenu} style={{
          width: 34, height: 34, borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--paper-2)', color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      {/* Mobile: account avatar + view label */}
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, background: 'var(--blue-soft)', color: 'var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Geist Mono, monospace', fontWeight: 600, fontSize: 11, flexShrink: 0,
          }}>{accountTag(currentAccount.name)}</div>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>
            {viewLabel}
          </div>
        </div>
      )}

      {/* Desktop search */}
      {!isMobile && (
        <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            placeholder={`Search ${currentAccount.name}…  ⌘K`}
            style={{
              width: '100%', padding: '7px 12px 7px 34px',
              border: '1px solid var(--line)', background: 'var(--paper-2)',
              borderRadius: 8, fontSize: 13, outline: 'none', color: 'var(--ink)',
            }}
          />
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Desktop: Ask AI */}
      {!isMobile && (
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 28, padding: '0 10px', fontSize: 12.5, fontWeight: 500,
          background: 'transparent', color: 'var(--blue)', border: '1px solid transparent',
          borderRadius: 8, cursor: 'pointer', transition: 'background 120ms',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-soft)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          Ask Nexorra AI
        </button>
      )}

      {/* Bell notification */}
      <button style={{
        width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
        background: 'var(--paper-2)', color: 'var(--ink-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'pointer',
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span style={{ position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 999, background: 'var(--rose)' }} />
      </button>

      {/* Desktop: Create */}
      {!isMobile && (
        <button
          onClick={onCreateClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 34, padding: '0 12px', fontSize: 13.5, fontWeight: 500,
            background: 'var(--grad)', color: 'white', border: '1px solid transparent',
            borderRadius: 8, cursor: 'pointer',
            transition: 'transform 80ms, opacity 100ms',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create
        </button>
      )}
    </div>
  );
}
