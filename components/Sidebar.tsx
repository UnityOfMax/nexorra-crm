'use client';
import React, { useState, useRef } from 'react';
import { Avatar, Badge } from './ui/primitives';
import { Menu } from './ui/menu';
import { Icons } from './Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubAccount {
  id: string;
  name: string;
  kind: 'agency' | 'client';
  tag: string;
  color: string;
  location?: string;
  markets?: number;
  leads30?: number;
  status?: string;
  since?: string;
}

// ─── WorkspaceSwitcher ────────────────────────────────────────────────────────

interface WorkspaceSwitcherProps {
  subaccounts: SubAccount[];
  current: string;
  onChange: (id: string) => void;
  collapsed: boolean;
}

function WorkspaceSwitcher({ subaccounts, current, onChange, collapsed }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const anchor = useRef<HTMLButtonElement>(null);
  const safeAccounts = subaccounts || [];
  const cur = safeAccounts.find(s => s.id === current) || safeAccounts[0];
  if (!cur) return null;
  const filtered = safeAccounts.filter(s =>
    s.name.toLowerCase().includes(q.toLowerCase()) ||
    (s.location || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <button
        ref={anchor}
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: collapsed ? '6px' : '8px 10px', borderRadius: 10,
          background: open ? 'var(--paper-3)' : 'var(--paper-2)',
          border: '1px solid var(--line)', transition: 'background 120ms',
        }}
      >
        {cur.kind === 'agency' ? (
          <img
            src="https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-assets/nexorra-logo.png"
            alt="Nexorra"
            className="nx-logo-mark"
            style={{ width: collapsed ? 30 : 32, height: collapsed ? 30 : 32, objectFit: 'contain', flexShrink: 0 }}
          />
        ) : (
          <Avatar tag={cur.tag} color={cur.color} size={collapsed ? 30 : 32} />
        )}
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{
                fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{cur.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1, fontFamily: 'Geist Mono, monospace' }}>
                {cur.kind === 'agency' ? 'AGENCY ROLLUP' : (cur.location || '').toUpperCase()}
              </div>
            </div>
            <span style={{ color: 'var(--ink-3)' }}><Icons.chev size={16} /></span>
          </>
        )}
      </button>
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={anchor} width={300}>
        <div style={{ padding: '4px 6px 8px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
              <Icons.search size={14} />
            </span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search workspaces..."
              style={{
                width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--line)',
                background: 'var(--paper-2)', borderRadius: 6, fontSize: 13, outline: 'none',
                fontFamily: 'inherit', color: 'var(--ink)',
              }}
            />
          </div>
        </div>
        <div style={{ padding: '4px 10px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
          Agency
        </div>
        {filtered.filter(s => s.kind === 'agency').map(s => (
          <div key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
              borderRadius: 6, cursor: 'pointer',
              background: s.id === current ? 'var(--paper-3)' : 'transparent',
            }}>
            <img
              src="https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-assets/nexorra-logo.png"
              alt="Nexorra"
              className="nx-logo-mark"
              style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                {s.markets} markets · {(s.leads30 || 0).toLocaleString()} leads / 30d
              </div>
            </div>
            {s.id === current && <span style={{ color: 'var(--blue)' }}><Icons.check size={15} /></span>}
          </div>
        ))}
        <div style={{ padding: '10px 10px 4px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
          Client subaccounts
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {filtered.filter(s => s.kind === 'client').map(s => (
            <div key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                borderRadius: 6, cursor: 'pointer',
                background: s.id === current ? 'var(--paper-3)' : 'transparent',
              }}>
              <Avatar tag={s.tag} color={s.color} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </span>
                  {s.status === 'attention' && <Badge tone="amber" dot style={{ padding: '1px 6px', fontSize: 10.5 }}>Attention</Badge>}
                  {s.status === 'onboarding' && <Badge tone="blue" dot style={{ padding: '1px 6px', fontSize: 10.5 }}>Onboarding</Badge>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                  {s.location} · {(s.leads30 || 0).toLocaleString()} leads
                </div>
              </div>
              {s.id === current && <span style={{ color: 'var(--blue)' }}><Icons.check size={15} /></span>}
            </div>
          ))}
        </div>
      </Menu>
    </>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: { label: string; tone?: 'blue' | 'violet' | 'green' | 'amber' | 'rose' };
}

interface NavItemProps extends NavItemDef {
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

function NavItem({ icon, label, active, onClick, collapsed, badge }: NavItemProps) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
        padding: collapsed ? '9px' : '7px 10px', borderRadius: 8,
        color: active ? 'var(--ink)' : 'var(--ink-2)',
        background: active ? 'var(--paper-3)' : h ? 'var(--paper-2)' : 'transparent',
        fontSize: 13.5, fontWeight: active ? 500 : 400,
        transition: 'background 100ms', position: 'relative',
        justifyContent: collapsed ? 'center' : 'flex-start',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 18, borderRadius: 3, background: 'var(--grad)',
        }} />
      )}
      <span style={{ color: active ? 'var(--ink)' : 'var(--ink-3)', display: 'flex' }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>}
      {!collapsed && badge && (
        <Badge tone={badge.tone || 'blue'} style={{ padding: '1px 7px', fontSize: 11 }}>{badge.label}</Badge>
      )}
    </button>
  );
}

// ─── NavSection ───────────────────────────────────────────────────────────────

interface NavSectionProps {
  label: string;
  items: NavItemDef[];
  route: string;
  setRoute: (r: string) => void;
  collapsed?: boolean;
}

function NavSection({ label, items, route, setRoute, collapsed }: NavSectionProps) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      {!collapsed && (
        <div style={{
          fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: 500, padding: '4px 10px 4px',
        }}>{label}</div>
      )}
      {items.map(n => (
        <NavItem
          key={n.id}
          {...n}
          active={route === n.id}
          onClick={() => setRoute(n.id)}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  route: string;
  setRoute: (r: string) => void;
  subaccounts: SubAccount[];
  current: string;
  setCurrent: (id: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  userName?: string;
  userRole?: string;
}

export function Sidebar({
  route, setRoute, subaccounts, current, setCurrent, collapsed, setCollapsed, userName, userRole,
}: SidebarProps) {
  const isAgency = subaccounts.find(s => s.id === current)?.kind === 'agency';
  const isPrivileged = ['owner', 'admin', 'agency_owner', 'agency_admin'].includes(userRole || '');

  const crm: NavItemDef[] = isAgency
    ? [
        { id: 'overview', label: 'Subaccounts', icon: <Icons.grid size={17} /> },
        { id: 'dashboard', label: 'Dashboard', icon: <Icons.home size={17} /> },
        { id: 'contacts', label: 'Contacts', icon: <Icons.contacts size={17} /> },
        { id: 'inbox', label: 'Conversations', icon: <Icons.inbox size={17} /> },
        { id: 'calendar', label: 'Calendar', icon: <Icons.calendar size={17} /> },
        { id: 'pipeline', label: 'Opportunities', icon: <Icons.pipeline size={17} /> },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: <Icons.home size={17} /> },
        { id: 'contacts', label: 'Contacts', icon: <Icons.contacts size={17} /> },
        { id: 'inbox', label: 'Conversations', icon: <Icons.inbox size={17} /> },
        { id: 'calendar', label: 'Calendar', icon: <Icons.calendar size={17} /> },
        { id: 'pipeline', label: 'Opportunities', icon: <Icons.pipeline size={17} /> },
      ];

  // Tools section: only visible to owners/admins
  const tools: NavItemDef[] = isPrivileged
    ? isAgency
      ? [
          { id: 'workflows', label: 'Workflows', icon: <Icons.workflow size={17} /> },
          { id: 'pages', label: 'Landing Pages', icon: <Icons.pages size={17} /> },
          { id: 'reports', label: 'Analytics', icon: <Icons.chart size={17} /> },
          { id: 'ai-agent', label: 'AI Agent', icon: <Icons.bot size={17} />, badge: { label: 'NEW', tone: 'violet' } },
        ]
      : [
          { id: 'workflows', label: 'Workflows', icon: <Icons.workflow size={17} /> },
          { id: 'pages', label: 'Landing Pages', icon: <Icons.pages size={17} /> },
          { id: 'ai-agent', label: 'AI Agent', icon: <Icons.bot size={17} /> },
        ]
    : [];

  const agency: NavItemDef[] = isAgency ? [
    { id: 'leads', label: 'Leads', icon: <Icons.target size={17} /> },
    { id: 'openphone', label: 'OpenPhone Outreach', icon: <Icons.phone size={17} /> },
    { id: 'command', label: 'Command Center', icon: <Icons.terminal size={17} /> },
  ] : [];

  const initials = userName ? userName.split(' ').map(x => x[0]).slice(0, 2).join('') : 'JA';

  return (
    <aside style={{
      width: collapsed ? 64 : 248,
      flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      borderRight: '1px solid var(--line)', background: 'var(--paper-2)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
      paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
      paddingLeft: 12, paddingRight: 12, gap: 6,
      transition: 'width 220ms cubic-bezier(0.2,0.8,0.2,1)',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '6px 0' : '4px 6px 6px',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        {collapsed ? (
          <img
            src="https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-assets/nexorra-logo.png"
            alt="Nexorra"
            className="nx-logo-mark"
            style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.1em', color: 'var(--ink)', lineHeight: 1 }}>NEX</span>
            <img
              src="https://nhflmisklsanfiiywrfo.supabase.co/storage/v1/object/public/landing-assets/nexorra-logo.png"
              alt="O"
              className="nx-logo-mark"
              style={{ width: 19, height: 19, objectFit: 'contain', margin: '0 1px 0 -3px', verticalAlign: 'middle' }}
            />
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.1em', color: 'var(--ink)', lineHeight: 1 }}>RRA</span>
          </div>
        )}
      </div>

      <WorkspaceSwitcher subaccounts={subaccounts} current={current} onChange={setCurrent} collapsed={collapsed} />

      <div style={{ height: 1, background: 'var(--line)', margin: '8px -12px' }} />

      <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
        <NavSection label="CRM" items={crm} route={route} setRoute={setRoute} collapsed={collapsed} />
        <NavSection label="Tools" items={tools} route={route} setRoute={setRoute} collapsed={collapsed} />
        {agency.length > 0 && (
          <NavSection label="Agency" items={agency} route={route} setRoute={setRoute} collapsed={collapsed} />
        )}
      </nav>

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <NavItem id="settings" icon={<Icons.settings size={17} />} label="Settings"
          active={route === 'settings'} onClick={() => setRoute('settings')} collapsed={collapsed} />
      </div>

      {/* User block */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? 6 : 8,
        borderRadius: 10, background: 'var(--paper)', border: '1px solid var(--line)',
      }}>
        <div style={{
          width: collapsed ? 28 : 30, height: collapsed ? 28 : 30, borderRadius: 8,
          background: 'var(--paper-3)', color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Geist Mono, monospace', fontWeight: 600, fontSize: 12, flexShrink: 0,
        }}>{initials}</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{userName || 'Jess Alvarez'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{userRole || 'Agency admin'}</div>
          </div>
        )}
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expand' : 'Collapse'}
        style={{
          position: 'absolute', top: 28, right: -10, width: 20, height: 20,
          borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--line-2)',
          color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)', zIndex: 10, cursor: 'pointer',
        }}
      >
        {collapsed ? <Icons.chevR size={11} /> : <Icons.chevL size={11} />}
      </button>
    </aside>
  );
}

export default Sidebar;
