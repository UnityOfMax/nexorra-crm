'use client';

interface MobileNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isAgencyUser: boolean;
  isViewingClient?: boolean;
}

const agencyTabs = [
  { id: 'dashboard',      label: 'Dashboard', icon: HomeIcon },
  { id: 'pipelines',      label: 'Opps',      icon: TrendIcon },
  { id: 'command-center', label: 'Command',   icon: TerminalIcon },
  { id: 'leads',          label: 'Leads',     icon: TargetIcon },
  { id: 'campaigns',      label: 'Emails',    icon: MailIcon },
  { id: 'instagram-dms',  label: 'Instagram', icon: InstagramIcon },
] as const;

const clientTabs = [
  { id: 'dashboard',      label: 'Dashboard', icon: HomeIcon },
  { id: 'contacts',       label: 'Contacts',  icon: UsersIcon },
  { id: 'pipelines',      label: 'Pipeline',  icon: PipelineIcon },
  { id: 'calendar',       label: 'Calendar',  icon: CalendarIcon },
  { id: 'conversations',  label: 'Messages',  icon: InboxIcon },
] as const;

// Inline SVG icons using CSS variables
function HomeIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function TrendIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function TerminalIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
}
function TargetIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function MailIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}
function InstagramIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
}
function UsersIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function PipelineIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18"/><rect x="9.5" y="7" width="5" height="14"/><rect x="16" y="11" width="5" height="10"/></svg>;
}
function CalendarIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function InboxIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
}

export default function MobileNav({ activeView, onViewChange, isAgencyUser, isViewingClient }: MobileNavProps) {
  const tabs = (isAgencyUser && !isViewingClient) ? agencyTabs : clientTabs;
  return (
    <nav className="nx-mobile-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: 'var(--paper)', borderTop: '1px solid var(--line)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      alignItems: 'stretch',
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2, padding: '8px 0', minHeight: 58,
              position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
              color: active ? 'var(--blue)' : 'var(--ink-3)',
            }}
          >
            {active && (
              <span style={{ position: 'absolute', top: 0, width: 28, height: 2, borderRadius: 2, background: 'var(--grad)' }} />
            )}
            <Icon active={active} />
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '-0.005em' }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
