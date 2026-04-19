'use client';

import { useState, useRef, useEffect } from 'react';
import type { Account } from '@/types';
import type { UserRole } from '@/types/agency';

// ── Inline SVG icons ───────────────────────────────────────────────────────
function IcoHome({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IcoGrid({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function IcoUsers({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function IcoInbox({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
}
function IcoCalendar({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function IcoPipeline({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>;
}
function IcoZap({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
}
function IcoFile({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
function IcoChart({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function IcoBot({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8.5" cy="16" r="0.5" fill="currentColor"/><circle cx="15.5" cy="16" r="0.5" fill="currentColor"/></svg>;
}
function IcoTarget({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function IcoMail({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function IcoInstagram({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
}
function IcoTerminal({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
}
function IcoSettings({ s = 17 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function IcoChevDown({ s = 16 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function IcoChevRight({ s = 11 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function IcoChevLeft({ s = 11 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function IcoSearch({ s = 14 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function IcoPlus({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function IcoCheck({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IcoLogOut({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function IcoTrend({ s = 20 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}

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
    blue:   { bg: 'var(--blue-soft)',   fg: 'var(--blue)' },
    violet: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
    amber:  { bg: 'var(--amber-soft)',  fg: 'var(--amber)' },
    green:  { bg: 'var(--green-soft)',  fg: 'var(--green)' },
    rose:   { bg: 'var(--rose-soft)',   fg: 'var(--rose)' },
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allClients = clientAccounts.filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase())
  );
  const allAgency = agencyAccounts.filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        !anchor.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) setOpen(false);
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
        cursor: 'pointer',
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
            <span style={{ color: 'var(--ink-3)', flexShrink: 0 }}><IcoChevDown /></span>
          </>
        )}
      </button>

      {open && (
        <div ref={dropdownRef} style={{
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
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
                <IcoSearch />
              </span>
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search workspaces..."
                style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--line)', background: 'var(--paper-2)', borderRadius: 6, fontSize: 13, outline: 'none', color: 'var(--ink)', boxSizing: 'border-box' }}
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
                {allClients.map((a) => (
                  <WorkspaceRow key={a.id} account={a} isCurrent={a.id === current.id}
                    tag={accountTag(a.name)} color={stringToColor(a.id)}
                    sub=""
                    onClick={() => { onSwitch(a.id); setOpen(false); }} />
                ))}
              </div>
            </>
          )}

          {/* Footer actions */}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, padding: '6px 4px 2px' }}>
            <MenuRow icon={<IcoPlus />} label="Add client subaccount" onClick={() => { onNewClient(); setOpen(false); }} />
            <MenuRow icon={<IcoSettings />} label="Workspace settings" onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function WorkspaceRow({ account, isCurrent, tag, color, sub, onClick }: {
  account: Account; isCurrent: boolean; tag: string; color: AvatarColor | string;
  sub: string; onClick: () => void;
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
      {isCurrent && <span style={{ color: 'var(--blue)', flexShrink: 0 }}><IcoCheck /></span>}
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

// ── Nav item definitions ───────────────────────────────────────────────────
const AGENCY_CRM = [
  { id: 'sub-accounts',  label: 'Subaccounts',   icon: <IcoGrid /> },
  { id: 'dashboard',     label: 'Dashboard',     icon: <IcoHome /> },
  { id: 'contacts',      label: 'Contacts',      icon: <IcoUsers /> },
  { id: 'conversations', label: 'Conversations', icon: <IcoInbox />, badge: { label: '4', tone: 'blue' } },
  { id: 'calendar',      label: 'Calendar',      icon: <IcoCalendar /> },
  { id: 'pipelines',     label: 'Opportunities', icon: <IcoPipeline /> },
];
const AGENCY_TOOLS = [
  { id: 'workflows',        label: 'Workflows',     icon: <IcoZap /> },
  { id: 'pages',            label: 'Landing Pages', icon: <IcoFile /> },
  { id: 'agency-analytics', label: 'Analytics',     icon: <IcoChart /> },
  { id: 'ai-agent',         label: 'AI Agent',      icon: <IcoBot />, badge: { label: 'NEW', tone: 'violet' } },
];
const AGENCY_SECTION = [
  { id: 'leads',          label: 'Leads',           icon: <IcoTarget /> },
  { id: 'campaigns',      label: 'Email Campaigns', icon: <IcoMail /> },
  { id: 'instagram-dms',  label: 'Instagram',       icon: <IcoInstagram />, badge: { label: '3', tone: 'rose' } },
  { id: 'command-center', label: 'Command Center',  icon: <IcoTerminal /> },
];

const CLIENT_CRM = [
  { id: 'dashboard',     label: 'Dashboard',     icon: <IcoHome /> },
  { id: 'contacts',      label: 'Contacts',      icon: <IcoUsers /> },
  { id: 'conversations', label: 'Conversations', icon: <IcoInbox /> },
  { id: 'calendar',      label: 'Calendar',      icon: <IcoCalendar /> },
  { id: 'pipelines',     label: 'Opportunities', icon: <IcoPipeline /> },
];
const CLIENT_TOOLS = [
  { id: 'workflows', label: 'Workflows',     icon: <IcoZap /> },
  { id: 'pages',     label: 'Landing Pages', icon: <IcoFile /> },
  { id: 'analytics', label: 'Analytics',     icon: <IcoChart /> },
  { id: 'ai-agent',  label: 'AI Agent',      icon: <IcoBot />, badge: { label: 'NEW', tone: 'violet' } },
];

// ── Sidebar props ──────────────────────────────────────────────────────────
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

// ── Sidebar ────────────────────────────────────────────────────────────────
export default function Sidebar({
  activeView, onViewChange, onSignOut, currentAccount, accounts,
  clientAccounts, onAccountSwitch, isViewingClient, userRole,
  collapsed, onCollapsedChange, userName,
}: SidebarProps) {
  const isAgency = currentAccount.account_type === 'agency' && !isViewingClient;
  const agencyAccounts = accounts.filter(a => a.account_type === 'agency');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); };
  }, [userMenuOpen]);

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
            <NavSection label="Tools" items={AGENCY_TOOLS} activeView={activeView} onViewChange={onViewChange} collapsed={collapsed} />
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
          icon={<IcoSettings />}
          label="Settings"
          active={activeView === 'settings'}
          onClick={() => onViewChange('settings')}
          collapsed={collapsed}
        />
      </div>

      {/* User block */}
      <div ref={userRef} style={{ position: 'relative' }}>
        <div
          onClick={() => setUserMenuOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? 6 : 8, borderRadius: 10,
            background: userMenuOpen ? 'var(--paper-3)' : 'var(--paper)',
            border: '1px solid var(--line)',
            cursor: 'pointer', transition: 'background 100ms',
          }}>
          <div style={{
            width: collapsed ? 28 : 30, height: collapsed ? 28 : 30, borderRadius: 8,
            background: 'var(--paper-3)', color: 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Geist Mono, monospace', fontWeight: 600, fontSize: 12, flexShrink: 0,
          }}>{userTag}</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName || currentAccount.name.split(' ')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{userRoleLabel}</div>
            </div>
          )}
        </div>
        {userMenuOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6,
            background: 'var(--paper)', border: '1px solid var(--line-2)',
            borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 6,
            animation: 'nxMenuIn 140ms cubic-bezier(0.2,0.8,0.2,1)',
          }}>
            <MenuRow icon={<IcoLogOut />} label="Sign out" onClick={() => { setUserMenuOpen(false); onSignOut(); }} />
          </div>
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
        {collapsed ? <IcoChevRight /> : <IcoChevLeft />}
      </button>

      <style>{`
        @keyframes nxMenuIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
        @keyframes nxFadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </aside>
  );
}

// ── MobileBottomNav ────────────────────────────────────────────────────────
export function MobileBottomNav({ activeView, onViewChange, isAgencyAccount }: {
  activeView: string;
  onViewChange: (view: string) => void;
  isAgencyAccount?: boolean;
}) {
  const agencyTabs = [
    { id: 'dashboard',     label: 'Dashboard', icon: <IcoHome s={20} /> },
    { id: 'pipelines',     label: 'Opps',      icon: <IcoTrend s={20} /> },
    { id: 'command-center',label: 'Command',   icon: <IcoTerminal s={20} /> },
    { id: 'leads',         label: 'Leads',     icon: <IcoTarget s={20} /> },
    { id: 'campaigns',     label: 'Emails',    icon: <IcoMail s={20} /> },
  ];
  const clientTabs = [
    { id: 'dashboard',     label: 'Dashboard', icon: <IcoHome s={20} /> },
    { id: 'contacts',      label: 'Contacts',  icon: <IcoUsers s={20} /> },
    { id: 'pipelines',     label: 'Pipeline',  icon: <IcoPipeline s={20} /> },
    { id: 'calendar',      label: 'Calendar',  icon: <IcoCalendar s={20} /> },
    { id: 'conversations', label: 'Messages',  icon: <IcoInbox s={20} /> },
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
        const active = activeView === t.id;
        return (
          <button key={t.id} onClick={() => onViewChange(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, padding: '8px 0', minHeight: 58, position: 'relative',
            color: active ? 'var(--blue)' : 'var(--ink-3)',
            border: 'none', background: 'transparent', cursor: 'pointer',
          }}>
            {active && <span style={{ position: 'absolute', top: 0, width: 28, height: 2, borderRadius: 2, background: 'var(--grad)' }} />}
            {t.icon}
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '-0.005em' }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
