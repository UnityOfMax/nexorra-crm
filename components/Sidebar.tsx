'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Home, LayoutGrid, KanbanSquare, Users, Inbox, BarChart2, Calendar,
  CheckSquare, FileText, Zap, Settings, ChevronDown, ChevronRight,
  ChevronLeft, Search, Plus, MapPin, MoreHorizontal, Bell, Sparkles,
  Download, Check, Mail, Phone, Bot, Target, Instagram, Terminal,
  MessageSquare, Layers,
} from 'lucide-react';
import type { Account } from '@/types';
import type { UserRole } from '@/types/agency';

// ── Color palette cycling ──────────────────────────────────────────────────
const COLOR_CYCLE = ['blue', 'violet', 'green', 'amber', 'rose'] as const;
type AvatarColor = typeof COLOR_CYCLE[number] | 'grad';

function stringToColor(s: string): AvatarColor {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return COLOR_CYCLE[Math.abs(h) % COLOR_CYCLE.length];
}

function accountTag(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'N';
}

// ── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ tag, size = 28, color = 'blue' }: { tag: string; size?: number; color?: AvatarColor | string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    blue:   { bg: 'var(--blue-soft)',   fg: 'var(--blue)' },
    violet: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
    green:  { bg: 'var(--green-soft)',  fg: 'var(--green)' },
    amber:  { bg: 'var(--amber-soft)',  fg: 'var(--amber)' },
    rose:   { bg: 'var(--rose-soft)',   fg: 'var(--rose)' },
    grad:   { bg: 'var(--grad)',        fg: 'white' },
  };
  const c = colors[color] || { bg: 'var(--paper-3)', fg: 'var(--ink-2)' };
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: c.bg, color: c.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: size * 0.42, letterSpacing: '0.02em',
      flexShrink: 0, fontFamily: 'Geist Mono, monospace',
    }}>
      {tag.slice(0, 2)}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────
function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, { bg: string; fg: string }> = {
    blue:   { bg: 'var(--blue-soft)',  fg: 'var(--blue)' },
    violet: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
    amber:  { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    green:  { bg: 'var(--green-soft)', fg: 'var(--green)' },
  };
  const t = tones[tone] || tones.blue;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '1px 7px',
      borderRadius: 999, background: t.bg, color: t.fg,
      fontSize: 11, fontWeight: 500, lineHeight: '18px',
    }}>{children}</span>
  );
}

// ── WorkspaceSwitcher ──────────────────────────────────────────────────────
interface WorkspaceSwitcherProps {
  current: Account;
  agencyAccounts: Account[];
  clientAccounts: Account[];
  onSwitch: (id: string) => void;
  onNewClient: () => void;
  collapsed: boolean;
}

function WorkspaceSwitcher({ current, agencyAccounts, clientAccounts, onSwitch, onNewClient, collapsed }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const anchor = useRef<HTMLButtonElement>(null);

  const allClients = clientAccounts.filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase())
  );
  const allAgency = agencyAccounts.filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!anchor.current?.contains(e.target as Node)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); };
  }, [open]);

  const curTag = current.account_type === 'agency' ? 'NX' : accountTag(current.name);
  const curColor: AvatarColor = current.account_type === 'agency' ? 'grad' : stringToColor(current.id);
  const isAgency = current.account_type === 'agency';

  return (
    <>
      <button ref={anchor} onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: collapsed ? 6 : '8px 10px', borderRadius: 10,
        background: open ? 'var(--paper-3)' : 'var(--paper-2)',
        border: '1px solid var(--line)', transition: 'background 120ms',
      }}>
        <Avatar tag={curTag} color={curColor} size={collapsed ? 30 : 32} />
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>
                {current.name}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1, fontFamily: 'Geist Mono, monospace' }}>
                {isAgency ? 'AGENCY ROLLUP' : 'CLIENT WORKSPACE'}
              </div>
            </div>
            <ChevronDown size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          </>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', zIndex: 300,
          top: (() => { const r = anchor.current?.getBoundingClientRect(); return (r?.bottom ?? 0) + 6; })(),
          left: (() => { const r = anchor.current?.getBoundingClientRect(); return r?.left ?? 0; })(),
          width: 300,
          background: 'var(--paper)', border: '1px solid var(--line-2)',
          borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 6,
          animation: 'nxMenuIn 140ms cubic-bezier(0.2,0.8,0.2,1)',
        }}>
          {/* Search */}
          <div style={{ padding: '4px 6px 8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search workspaces..."
                style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--line)', background: 'var(--paper-2)', borderRadius: 6, fontSize: 13, outline: 'none', color: 'var(--ink)' }}
              />
            </div>
          </div>

          {/* Agency section */}
          {allAgency.length > 0 && (
            <>
              <div style={{ padding: '4px 10px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Agency</div>
              {allAgency.map(a => (
                <WorkspaceRow key={a.id} account={a} isCurrent={a.id === current.id} tag="NX" color="grad" sub="AGENCY ROLLUP" onClick={() => { onSwitch(a.id); setOpen(false); }} />
              ))}
            </>
          )}

          {/* Client section */}
          {allClients.length > 0 && (
            <>
              <div style={{ padding: '10px 10px 4px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Client subaccounts</div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {allClients.map((a, i) => (
                  <WorkspaceRow key={a.id} account={a} isCurrent={a.id === current.id}
                    tag={accountTag(a.name)} color={stringToColor(a.id)}
                    sub={(a as any).slug ? '' : 'CLIENT'} index={i}
                    onClick={() => { onSwitch(a.id); setOpen(false); }} />
                ))}
              </div>
            </>
          )}

          {/* Footer actions */}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, padding: '6px 4px 2px' }}>
            <MenuRow icon={<Plus size={15} />} label="Add client subaccount" onClick={() => { onNewClient(); setOpen(false); }} />
            <MenuRow icon={<Settings size={15} />} label="Workspace settings" onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function WorkspaceRow({ account, isCurrent, tag, color, sub, index = 0, onClick }: {
  account: Account; isCurrent: boolean; tag: string; color: AvatarColor | string;
  sub: string; index?: number; onClick: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', background: isCurrent || h ? 'var(--paper-3)' : 'transparent' }}>
      <Avatar tag={tag} color={color} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--ink)' }}>{account.name}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{sub}</div>}
      </div>
      {isCurrent && <Check size={15} style={{ color: 'var(--blue)', flexShrink: 0 }} />}
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', background: h ? 'var(--paper-3)' : 'transparent', color: 'var(--ink)', fontSize: 13.5 }}>
      <span style={{ display: 'flex', color: 'var(--ink-3)' }}>{icon}</span>
      {label}
    </div>
  );
}

// ── NavItem ────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, collapsed, badge }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
  collapsed: boolean; badge?: { label: string; tone?: string };
}) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
        padding: collapsed ? '9px' : '7px 10px', borderRadius: 8,
        color: active ? 'var(--ink)' : 'var(--ink-2)',
        background: active ? 'var(--paper-3)' : h ? 'var(--paper-2)' : 'transparent',
        fontSize: 13.5, fontWeight: active ? 500 : 400,
        transition: 'background 100ms', position: 'relative',
        justifyContent: collapsed ? 'center' : 'flex-start',
        border: 'none', cursor: 'pointer',
      }}>
      {active && (
        <span style={{
          position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 18, borderRadius: 3, background: 'var(--grad)',
        }} />
      )}
      <span style={{ color: active ? 'var(--ink)' : 'var(--ink-3)', display: 'flex', flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>}
      {!collapsed && badge && <Badge tone={badge.tone || 'blue'}>{badge.label}</Badge>}
    </button>
  );
}

// ── NavSection ─────────────────────────────────────────────────────────────
function NavSection({ label, items, activeView, onViewChange, collapsed }: {
  label: string;
  items: Array<{ id: string; label: string; icon: React.ReactNode; badge?: { label: string; tone?: string } }>;
  activeView: string;
  onViewChange: (id: string) => void;
  collapsed: boolean;
}) {
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
        <NavItem key={n.id} icon={n.icon} label={n.label} badge={n.badge}
          active={activeView === n.id}
          onClick={() => onViewChange(n.id)}
          collapsed={collapsed} />
      ))}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
export interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onSignOut: () => void;
  currentAccount: Account;
  accounts: Account[];
  clientAccounts: Account[];
  onAccountSwitch: (accountId: string) => void;
  isViewingClient?: boolean;
  userRole?: UserRole | null;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  userName?: string;
}

const AGENCY_CRM = [
  { id: 'sub-accounts', label: 'Subaccounts', icon: <LayoutGrid size={17} /> },
  { id: 'dashboard',    label: 'Dashboard',   icon: <Home size={17} /> },
];
const AGENCY_SECTION = [
  { id: 'leads',            label: 'Leads',          icon: <Target size={17} /> },
  { id: 'campaigns',        label: 'Campaigns',      icon: <Mail size={17} /> },
  { id: 'instagram-dms',    label: 'Instagram DMs',  icon: <Instagram size={17} /> },
  { id: 'agency-analytics', label: 'Reports',        icon: <BarChart2 size={17} /> },
  { id: 'command-center',   label: 'Command Center', icon: <Terminal size={17} /> },
];

const CLIENT_CRM = [
  { id: 'dashboard',     label: 'Dashboard',  icon: <Home size={17} /> },
  { id: 'pipelines',     label: 'Pipeline',   icon: <KanbanSquare size={17} /> },
  { id: 'contacts',      label: 'Contacts',   icon: <Users size={17} /> },
  { id: 'conversations', label: 'Inbox',      icon: <Inbox size={17} /> },
  { id: 'calendar',      label: 'Calendar',   icon: <Calendar size={17} /> },
];
const CLIENT_TOOLS = [
  { id: 'workflows', label: 'Automations', icon: <Zap size={17} /> },
  { id: 'pages',     label: 'Pages',       icon: <FileText size={17} /> },
  { id: 'analytics', label: 'Reports',     icon: <BarChart2 size={17} /> },
  { id: 'ai-agent',  label: 'AI Agent',    icon: <Bot size={17} /> },
];

export default function Sidebar({
  activeView, onViewChange, onSignOut, currentAccount, accounts,
  clientAccounts, onAccountSwitch, isViewingClient, userRole,
  collapsed, onCollapsedChange, userName,
}: SidebarProps) {
  const isAgency = currentAccount.account_type === 'agency' && !isViewingClient;
  const agencyAccounts = accounts.filter(a => a.account_type === 'agency');

  const userTag = userName
    ? userName.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : userRole?.includes('agency') ? 'AG' : 'U';
  const userRoleLabel = userRole?.includes('owner') ? 'Agency owner' : userRole?.includes('admin') ? 'Agency admin' : 'Member';

  return (
    <aside style={{
      width: collapsed ? 64 : 248,
      flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      borderRight: '1px solid var(--line)',
      background: 'var(--paper-2)',
      display: 'flex', flexDirection: 'column',
      padding: 12, gap: 8,
      transition: 'width 220ms cubic-bezier(0.2,0.8,0.2,1)',
      overflow: 'visible',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '6px 0' : '4px 6px 6px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: 'var(--grad)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 14, fontFamily: 'Geist, sans-serif',
          letterSpacing: '-0.04em', boxShadow: '0 2px 10px -2px oklch(58% 0.18 258 / 0.4)',
          flexShrink: 0,
        }}>N</div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Nexorra</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', letterSpacing: '0.08em' }}>CRM · v2.4</div>
          </div>
        )}
      </div>

      {/* Workspace switcher */}
      <WorkspaceSwitcher
        current={currentAccount}
        agencyAccounts={agencyAccounts}
        clientAccounts={clientAccounts}
        onSwitch={onAccountSwitch}
        onNewClient={() => {}}
        collapsed={collapsed}
      />

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--line)', margin: '0 -12px' }} />

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflowY: 'auto', overflowX: 'visible' }}>
        {isAgency ? (
          <>
            <NavSection label="CRM" items={AGENCY_CRM} activeView={activeView} onViewChange={onViewChange} collapsed={collapsed} />
            <NavSection label="Agency" items={AGENCY_SECTION} activeView={activeView} onViewChange={onViewChange} collapsed={collapsed} />
          </>
        ) : (
          <>
            <NavSection label="CRM" items={CLIENT_CRM} activeView={activeView} onViewChange={onViewChange} collapsed={collapsed} />
            <NavSection label="Tools" items={CLIENT_TOOLS} activeView={activeView} onViewChange={onViewChange} collapsed={collapsed} />
          </>
        )}
      </nav>

      {/* Settings */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        <NavItem
          icon={<Settings size={17} />}
          label="Settings"
          active={activeView === 'settings'}
          onClick={() => onViewChange('settings')}
          collapsed={collapsed}
        />
      </div>

      {/* User block */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? 6 : 8, borderRadius: 10,
        background: 'var(--paper)', border: '1px solid var(--line)',
      }}>
        <div style={{
          width: collapsed ? 28 : 30, height: collapsed ? 28 : 30, borderRadius: 8,
          background: 'var(--paper-3)', color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Geist Mono, monospace', fontWeight: 600, fontSize: 12, flexShrink: 0,
        }}>{userTag}</div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName || currentAccount.name.split(' ')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{userRoleLabel}</div>
            </div>
            <button onClick={() => onViewChange('settings')}
              style={{ padding: 4, borderRadius: 6, color: 'var(--ink-3)', border: 'none', background: 'transparent', cursor: 'pointer' }} title="Settings">
              <Settings size={14} />
            </button>
          </>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        style={{
          position: 'absolute', top: 28, right: -10, width: 20, height: 20,
          borderRadius: 999, background: 'var(--paper)', border: '1px solid var(--line-2)',
          color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)', zIndex: 10, cursor: 'pointer',
        }} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Animations */}
      <style>{`
        @keyframes nxMenuIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
        @keyframes nxFadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </aside>
  );
}
