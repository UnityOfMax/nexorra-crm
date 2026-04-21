'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-browser';
import { Sidebar, SubAccount } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { TopBar } from './TopBar';
import { Icons } from './Icons';

// Heavy views — loaded on demand
const SubaccountsOverview = dynamic(() => import('./views/SubaccountsOverview'), { ssr: false });
const DashboardView = dynamic(() => import('./views/DashboardView'), { ssr: false });
const ContactsView = dynamic(() => import('./views/ContactsView'), { ssr: false });
const InboxView = dynamic(() => import('./views/InboxView'), { ssr: false });
const PipelineView = dynamic(() => import('./views/PipelineView'), { ssr: false });
const ReportsView = dynamic(() => import('./views/ReportsView'), { ssr: false });
const SettingsView = dynamic(() => import('./views/SettingsView'), { ssr: false });
const CalendarView = dynamic(() => import('./calendar/CalendarView'), { ssr: false });
const LeadsView = dynamic(() => import('./views/LeadsView'), { ssr: false });
const CampaignsView = dynamic(() => import('./views/CampaignsView'), { ssr: false });
const WorkflowsView = dynamic(() => import('./views/WorkflowsView'), { ssr: false });
const LandingPagesView = dynamic(() => import('./views/LandingPagesView'), { ssr: false });
const AIAgentView = dynamic(() => import('./views/AIAgentView'), { ssr: false });
const InstagramView = dynamic(() => import('./views/InstagramView'), { ssr: false });
const CommandCenterView = dynamic(() => import('./views/CommandCenterView'), { ssr: false });

// ─── Nexorra Agency account ID ─────────────────────────────────────────────
const AGENCY_ACCOUNT_ID = 'da99b768-79dd-48f8-af86-abf95e61a69f';

// ─── Color rotation for client subaccounts ─────────────────────────────────
const COLORS = ['blue', 'violet', 'green', 'amber', 'rose'];

// ─── Build tag from account name ──────────────────────────────────────────
function makeTag(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface ShellProps {
  user: User;
  initialView?: string;
  initialAccountId?: string;
}

export default function Shell({ user, initialView, initialAccountId }: ShellProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [subaccounts, setSubaccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Member');

  const [current, setCurrent] = useState<string>(() => {
    if (initialAccountId) return initialAccountId;
    try { return localStorage.getItem('nx.current') || 'agency'; } catch { return 'agency'; }
  });

  const [route, setRoute] = useState<string>(() => {
    if (initialView) return initialView;
    try { return localStorage.getItem('nx.route') || 'overview'; } catch { return 'overview'; }
  });

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('nx.sidebar') === 'collapsed'; } catch { return false; }
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [realMobile, setRealMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );

  // ─── Mobile detection ────────────────────────────────────────────────────
  useEffect(() => {
    const on = () => setRealMobile(window.innerWidth < 900);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const isMobile = realMobile;

  // ─── Close mobile nav on route change ───────────────────────────────────
  useEffect(() => { setMobileNavOpen(false); }, [route, current]);

  // ─── Persist state ───────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('nx.current', current); } catch {}
  }, [current]);

  useEffect(() => {
    try { localStorage.setItem('nx.route', route); } catch {}
  }, [route]);

  useEffect(() => {
    try { localStorage.setItem('nx.sidebar', collapsed ? 'collapsed' : 'expanded'); } catch {}
  }, [collapsed]);

  // ─── Route guard: agency vs client routes ───────────────────────────────
  const currentSub = subaccounts.find(s => s.id === current);
  useEffect(() => {
    if (!currentSub) return;
    const agencyOnlyRoutes = ['overview', 'leads', 'campaigns', 'instagram', 'command'];
    if (currentSub.kind === 'client' && agencyOnlyRoutes.includes(route)) {
      setRoute('dashboard');
    }
    if (currentSub.kind === 'agency' && route === 'overview') {
      // agency can see overview — that's fine
    }
  }, [current, currentSub]);

  // ─── Load accounts ───────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAccounts() {
      try {
        const { data: memberships } = await supabase
          .from('account_members')
          .select('role, accounts(*)')
          .eq('user_id', user.id);

        if (!memberships || memberships.length === 0) {
          setLoading(false);
          return;
        }

        // Build user name from email
        setUserName(user.email?.split('@')[0]?.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User');

        const built: SubAccount[] = [];
        let colorIdx = 0;
        let agencyId: string | null = null;
        let agencyUserId: string | null = null;

        for (const m of memberships) {
          const acc = m.accounts as Record<string, unknown> | null;
          if (!acc || typeof acc !== 'object') continue;
          const id = acc.id as string;
          const name = (acc.name as string) || 'Account';
          const isAgency = id === AGENCY_ACCOUNT_ID || (acc.account_type as string) === 'agency';

          if (isAgency) {
            agencyId = id;
            agencyUserId = user.id;
            built.unshift({
              id,
              name,
              kind: 'agency',
              tag: 'NX',
              color: 'grad',
              location: 'All markets',
              markets: 6,
              leads30: 0,
              status: 'healthy',
            });
            setUserRole((m.role as string) || 'admin');
          } else {
            const settings = (acc.settings as Record<string, unknown>) || {};
            const loc = settings.location as Record<string, unknown> | string | undefined;
            const locStr = typeof loc === 'object' && loc
              ? [loc.first_name, loc.last_name].filter(Boolean).join(' ')
              : (typeof loc === 'string' ? loc : '');
            built.push({
              id,
              name,
              kind: 'client',
              tag: makeTag(name),
              color: COLORS[colorIdx % COLORS.length],
              location: locStr,
              leads30: 0,
              status: 'healthy',
              since: acc.created_at ? new Date(acc.created_at as string).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
            });
            colorIdx++;
          }
        }

        // For agency users, also load all client sub-accounts via the agency API
        if (agencyId && agencyUserId) {
          try {
            const res = await fetch(`/api/agency/clients?agencyId=${agencyId}&userId=${agencyUserId}`);
            if (res.ok) {
              const data = await res.json();
              const clients: Record<string, unknown>[] = Array.isArray(data) ? data : (data.clients || []);
              for (const c of clients) {
                if (built.find(s => s.id === (c.id as string))) continue; // skip dupes
                const settings = (c.settings as Record<string, unknown>) || {};
                const loc = settings.location as Record<string, unknown> | string | undefined;
                const locStr = typeof loc === 'object' && loc
                  ? [loc.first_name, loc.last_name].filter(Boolean).join(' ')
                  : (typeof loc === 'string' ? loc : '');
                built.push({
                  id: c.id as string,
                  name: (c.name as string) || 'Client',
                  kind: 'client',
                  tag: makeTag((c.name as string) || 'CL'),
                  color: COLORS[colorIdx % COLORS.length],
                  location: locStr,
                  leads30: 0,
                  status: 'healthy',
                  since: c.created_at ? new Date(c.created_at as string).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined,
                });
                colorIdx++;
              }
            }
          } catch {
            // Non-fatal — agency client load failed, continue with direct memberships
          }
        }

        if (built.length > 0) {
          setSubaccounts(built);
          // If stored current doesn't match loaded accounts, fall back to first
          const stored = current;
          if (!built.find(s => s.id === stored)) {
            setCurrent(built[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAccounts();
  }, [user.id]);

  // ─── Skeleton while loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid var(--line-2)', borderTopColor: 'var(--blue)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Fallback if no accounts ──────────────────────────────────────────────
  if (subaccounts.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <Icons.building size={40} style={{ color: 'var(--ink-3)' }} />
        <div style={{ fontSize: 18, fontWeight: 600 }}>No accounts found</div>
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Contact your administrator to get access.</div>
      </div>
    );
  }

  const sub = currentSub || subaccounts[0];
  const isAgency = sub.kind === 'agency';

  // ─── View content ─────────────────────────────────────────────────────────
  const viewProps = { sub, accountId: sub.id, userId: user.id };

  const renderView = () => {
    switch (route) {
      case 'overview':     return <SubaccountsOverview {...viewProps} onOpen={(id) => { setCurrent(id); setRoute('dashboard'); }} />;
      case 'dashboard':    return <DashboardView {...viewProps} />;
      case 'contacts':     return <ContactsView {...viewProps} />;
      case 'inbox':        return <InboxView {...viewProps} />;
      case 'pipeline':     return <PipelineView {...viewProps} />;
      case 'reports':      return <ReportsView {...viewProps} />;
      case 'settings':     return <SettingsView {...viewProps} />;
      case 'calendar':     return <CalendarView accountId={sub.id} userId={user.id} />;
      case 'leads':        return <LeadsView {...viewProps} />;
      case 'campaigns':    return <CampaignsView {...viewProps} />;
      case 'workflows':    return <WorkflowsView {...viewProps} />;
      case 'pages':        return <LandingPagesView {...viewProps} />;
      case 'ai-agent':     return <AIAgentView {...viewProps} />;
      case 'instagram':    return <InstagramView {...viewProps} />;
      case 'command':      return <CommandCenterView {...viewProps} />;
      default:             return <DashboardView {...viewProps} />;
    }
  };

  // ─── Shell ────────────────────────────────────────────────────────────────
  return (
    <div
      data-nx-mobile={isMobile ? 'true' : 'false'}
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)', position: 'relative' }}
    >
      {/* Sidebar — slide-in overlay on mobile */}
      {isMobile ? (
        <>
          {mobileNavOpen && (
            <div
              onClick={() => setMobileNavOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'oklch(18% 0.012 260 / 0.5)',
                backdropFilter: 'blur(2px)', zIndex: 100, animation: 'fadeIn 160ms ease',
              }}
            />
          )}
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, zIndex: 101,
            transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 220ms cubic-bezier(0.2,0.8,0.2,1)',
          }}>
            <Sidebar
              route={route} setRoute={setRoute}
              subaccounts={subaccounts}
              current={current} setCurrent={setCurrent}
              collapsed={false} setCollapsed={() => {}}
              userName={userName} userRole={userRole}
            />
          </div>
        </>
      ) : (
        <Sidebar
          route={route} setRoute={setRoute}
          subaccounts={subaccounts}
          current={current} setCurrent={setCurrent}
          collapsed={collapsed} setCollapsed={setCollapsed}
          userName={userName} userRole={userRole}
        />
      )}

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, paddingBottom: isMobile ? 64 : 0, overflow: 'visible' }}>
        <TopBar sub={sub} isMobile={isMobile} onMenu={() => setMobileNavOpen(true)} />
        {renderView()}
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <MobileBottomNav route={route} setRoute={setRoute} isAgencyAccount={isAgency} />
      )}
    </div>
  );
}
