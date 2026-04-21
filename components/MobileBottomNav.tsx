'use client';
import React from 'react';
import { Icons } from './Icons';

interface MobileBottomNavProps {
  route: string;
  setRoute: (r: string) => void;
  isAgencyAccount: boolean;
}

export function MobileBottomNav({ route, setRoute, isAgencyAccount }: MobileBottomNavProps) {
  const agencyTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.home size={20} /> },
    { id: 'pipeline', label: 'Opps', icon: <Icons.trend size={20} /> },
    { id: 'command', label: 'Command', icon: <Icons.terminal size={20} /> },
    { id: 'leads', label: 'Leads', icon: <Icons.target size={20} /> },
    { id: 'campaigns', label: 'Emails', icon: <Icons.mail size={20} /> },
    { id: 'instagram', label: 'Instagram', icon: <Icons.instagram size={20} /> },
  ];
  const clientTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Icons.home size={20} /> },
    { id: 'contacts', label: 'Contacts', icon: <Icons.contacts size={20} /> },
    { id: 'pipeline', label: 'Pipeline', icon: <Icons.pipeline size={20} /> },
    { id: 'calendar', label: 'Calendar', icon: <Icons.calendar size={20} /> },
    { id: 'inbox', label: 'Messages', icon: <Icons.inbox size={20} /> },
  ];
  const tabs = isAgencyAccount ? agencyTabs : clientTabs;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'var(--paper)', borderTop: '1px solid var(--line)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      display: 'flex', alignItems: 'stretch',
    }}>
      {tabs.map(t => {
        const active = route === t.id;
        return (
          <button key={t.id} onClick={() => setRoute(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, padding: '8px 0', minHeight: 58, position: 'relative',
            color: active ? 'var(--blue)' : 'var(--ink-3)',
            border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit',
          }}>
            {active && (
              <span style={{
                position: 'absolute', top: 0, width: 28, height: 2, borderRadius: 2, background: 'var(--grad)',
              }} />
            )}
            {t.icon}
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '-0.005em' }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
