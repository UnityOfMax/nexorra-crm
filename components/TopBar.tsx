'use client';

import { useState } from 'react';
import { Search, Bell, Plus, Sparkles } from 'lucide-react';
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
  'agency-analytics': 'Reports',
  'command-center': 'Command Center',
  'pipelines': 'Pipeline',
  'contacts': 'Contacts',
  'conversations': 'Inbox',
  'calendar': 'Calendar',
  'workflows': 'Automations',
  'pages': 'Pages',
  'analytics': 'Reports',
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
      {/* Mobile menu button */}
      {isMobile && (
        <button onClick={onMenu} style={{
          width: 34, height: 34, borderRadius: 8, border: '1px solid var(--line)',
          background: 'var(--paper-2)', color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      {/* Mobile account name */}
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, background: 'var(--blue-soft)', color: 'var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Geist Mono, monospace', fontWeight: 600, fontSize: 11,
          }}>{accountTag(currentAccount.name)}</div>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>
            {viewLabel}
          </div>
        </div>
      )}

      {/* Desktop search */}
      {!isMobile && (
        <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
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

      {/* Ask AI button */}
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
          <Sparkles size={14} />
          Ask Nexorra AI
        </button>
      )}

      {/* Bell */}
      <button style={{
        width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
        background: 'var(--paper-2)', color: 'var(--ink-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', cursor: 'pointer',
      }}>
        <Bell size={15} />
        <span style={{ position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 999, background: 'var(--rose)' }} />
      </button>

      {/* Create button */}
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
          <Plus size={13} />
          Create
        </button>
      )}
    </div>
  );
}
