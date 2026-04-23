'use client';

import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import dynamic from 'next/dynamic';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-browser';
import { Account, Contact } from '@/types';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SubaccountsOverview from './agency/SubaccountsOverview';
import ContactsList from './ContactsList';
import { Building2 } from 'lucide-react';
import DashboardHome from './DashboardHome';
import Settings from './Settings';
import type { UserRole } from '@/types/agency';
import PushNotificationSetup from './PushNotificationSetup';
import ErrorBoundary from './ErrorBoundary';
import MockSubAccountContent from './agency/MockSubAccountContent';
import { SHUFFLED_STATS } from '@/lib/data/client-stats';

// Heavy views loaded on demand — reduces initial JS bundle
const Conversations = dynamic(() => import('./Conversations'), { ssr: false });
const PipelineManager = dynamic(() => import('./pipelines/PipelineManager'), { ssr: false });
const CalendarView = dynamic(() => import('./calendar/CalendarView'), { ssr: false });
const WorkflowList = dynamic(() => import('./workflows/WorkflowList'), { ssr: false });
const LandingPageList = dynamic(() => import('./landing-pages/LandingPageList'), { ssr: false });
const AIAgent = dynamic(() => import('./AIAgent'), { ssr: false });
const LeadsList = dynamic(() => import('./LeadsList'), { ssr: false });
const StaceyConversations = dynamic(() => import('./StaceyConversations'), { ssr: false });
const CommandCenterV2 = dynamic(() => import('./command-center/CommandCenterV2'), { ssr: false });
const AnalyticsDashboard = dynamic(() => import('./analytics/AnalyticsDashboard'), { ssr: false });
const InstagramDMs = dynamic(() => import('./InstagramDMs'), { ssr: false });
const ClientDataTable = dynamic(() => import('./agency/ClientDataTable'), { ssr: false });
const SubAccountsView = dynamic(() => import('./agency/SubAccountsView'), { ssr: false });
const AccountSwitcherDropdown = dynamic(() => import('./AccountSwitcherDropdown'), { ssr: false });

// Mock accounts built from CLIENT_STATS in shuffled (random) order
const MOCK_CLIENT_ACCOUNTS: Account[] = SHUFFLED_STATS.map(stat => ({
  id: `mock-${stat.slug}`,
  name: stat.name,
  slug: stat.slug,
  account_type: 'client' as const,
  settings: {},
  created_at: new Date().toISOString(),
} as Account & { slug: string }));

function isMockId(id: string) { return id.startsWith('mock-'); }

interface DashboardProps {
  user: User;
  initialView?: string;
  initialAccountId?: string;
  initialAccountSlug?: string;
}

export default function Dashboard({ user, initialView, initialAccountId, initialAccountSlug }: DashboardProps) {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [agencyAccount, setAgencyAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clientAccounts, setClientAccounts] = useState<Account[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAgencyUser, setIsAgencyUser] = useState(false);
  const [isViewingClient, setIsViewingClient] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalLeads: 0,
    totalCustomers: 0,
    activeDeals: 0,
    emailsSent: 0,
    textsSent: 0,
    bookings: 0,
    closings: 0,
    revenue: 0,
    adSpend: 0,
    textsTotal: 0,
    textReplies: 0,
    textBookingIntent: 0,
    textBooked: 0,
  });
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('nx.sidebar') === 'collapsed'; } catch { return false; }
  });
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
  const [hotLeads, setHotLeads] = useState<Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    lead_score: number | null;
    funnel_stage: string | null;
    last_intent: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
  }>>([]);
  const [todayActivities, setTodayActivities] = useState<Array<{
    id: string; title: string; type: string | null; scheduled_at: string | null; description: string | null;
  }>>([]);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Track whether initial URL state has been restored (prevent overwriting URL on first load)
  const urlRestoredRef = useRef(false);

  const handleSidebarCollapse = (v: boolean) => {
    setSidebarCollapsed(v);
    try { localStorage.setItem('nx.sidebar', v ? 'collapsed' : 'expanded'); } catch {}
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeView]);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    if (currentAccount && !isMockId(currentAccount.id)) {
      loadContacts();
      loadStats();
      fetch(`/api/contacts/hot?accountId=${currentAccount.id}&limit=5`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.contacts) setHotLeads(data.contacts); })
        .catch(() => {});
    } else if (currentAccount && isMockId(currentAccount.id)) {
      setContacts([]);
      setHotLeads([]);
      setStats({ totalContacts: 0, totalLeads: 0, totalCustomers: 0, activeDeals: 0, emailsSent: 0, textsSent: 0, bookings: 0, closings: 0, revenue: 0, adSpend: 0, textsTotal: 0, textReplies: 0, textBookingIntent: 0, textBooked: 0 });
    }
  }, [currentAccount]);

  useEffect(() => {
    if (agencyAccount && isAgencyUser) {
      loadClientAccounts();
    }
  }, [agencyAccount, isAgencyUser]);

  // Persist view + account in URL so page refresh restores state.
  // Uses window.history.replaceState instead of router.replace to avoid Next.js
  // page navigations that would remount Dashboard and reset all state.
  useEffect(() => {
    if (!urlRestoredRef.current) return; // don't overwrite URL during initial load
    if (!currentAccount) return;

    const slug = (currentAccount as any).slug;
    const params = new URLSearchParams();
    if (activeView && activeView !== 'dashboard') params.set('view', activeView);
    const query = params.toString();

    if (isViewingClient && slug) {
      // Sub-account: use /account/[slug]?view=...
      const url = query ? `/account/${slug}?${query}` : `/account/${slug}`;
      window.history.replaceState(null, '', url);
    } else if (!isViewingClient) {
      // Agency account: use /?view=...
      const url = query ? `/?${query}` : '/';
      window.history.replaceState(null, '', url);
    }
    // If isViewingClient but no slug, don't touch the URL
  }, [activeView, currentAccount, isViewingClient]);

  const loadAccounts = async () => {
    // Suppress URL persistence while loading to avoid flickering to wrong URL mid-load
    urlRestoredRef.current = false;

    // Read actual current URL (handles window.history.pushState after initial load),
    // so re-auth on tab focus restores the correct subaccount.
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const urlSlug = pathname.startsWith('/account/')
      ? pathname.replace('/account/', '').split('?')[0].split('/')[0]
      : null;
    const effectiveSlug = urlSlug || initialAccountSlug;
    const effectiveId = initialAccountId;

    const { data, error } = await supabase
      .from('account_members')
      .select('account_id, role, status, accounts(*)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to load accounts:', error);
      return;
    }

    if (data && data.length > 0) {
      const accountsList = data
        .map((item: any) => item.accounts)
        .filter((acc: any) => acc !== null);

      setAccounts(accountsList);

      if (accountsList.length > 0) {
        const urlAccount = effectiveId
          ? accountsList.find((a: Account) => a.id === effectiveId)
          : null;

        const firstAccount = urlAccount || accountsList[0];
        const membership = data.find((item: any) => item.account_id === firstAccount.id);

        setUserRole(membership?.role as UserRole);
        const userIsAgency = firstAccount.account_type === 'agency' &&
                   (membership?.role === 'agency_owner' || membership?.role === 'agency_admin');
        setIsAgencyUser(userIsAgency);
        setCurrentAccount(firstAccount);

        if (userIsAgency) {
          setAgencyAccount(firstAccount);
          // If no subaccount to restore, mark as ready now; loadClientAccounts handles it otherwise
          if ((!effectiveId && !effectiveSlug) || urlAccount) {
            setActiveView(initialView || 'sub-accounts');
            urlRestoredRef.current = true;
          }
        } else {
          if (initialView) setActiveView(initialView);
          urlRestoredRef.current = true;
        }
      }
    }
  };

  const loadContacts = async () => {
    if (!currentAccount) return;

    // Use supabaseAdmin-backed API route so agency users can see sub-account contacts
    // (direct supabase client is blocked by RLS for accounts the user isn't a member of)
    const res = await fetch(`/api/contacts?accountId=${currentAccount.id}`);
    if (res.ok) {
      const { contacts: data } = await res.json();
      setContacts(data || []);
    }
  };

  const loadClientAccounts = async () => {
    const agencyId = agencyAccount?.id;
    if (!agencyId || !isAgencyUser) return;

    try {
      const response = await fetch(
        `/api/agency/clients?agencyId=${agencyId}&userId=${user.id}`
      );

      if (response.ok) {
        const data = await response.json();
        const clients: Account[] = data.clients || [];

        // Merge in all mock accounts (exclude any whose slug matches a real account)
        const realSlugs = new Set(clients.map((c: any) => c.slug).filter(Boolean));
        const mockClients = MOCK_CLIENT_ACCOUNTS.filter(m => !realSlugs.has((m as any).slug));
        const allClients = [...clients, ...mockClients];
        setClientAccounts(allClients);

        // If URL had a sub-account slug/id, switch to it now that we have the list
        if (!urlRestoredRef.current) {
          // Read actual current URL in case pushState updated it since initial render
          const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
          const urlSlug = pathname.startsWith('/account/')
            ? pathname.replace('/account/', '').split('?')[0].split('/')[0]
            : null;
          const effectiveSlug = urlSlug || initialAccountSlug;

          const subAccount = effectiveSlug
            ? allClients.find((c) => (c as any).slug === effectiveSlug)
            : initialAccountId
            ? allClients.find((c) => c.id === initialAccountId)
            : null;
          if (subAccount) {
            setCurrentAccount(subAccount);
            setIsViewingClient(true);
          }
          if (initialView) setActiveView(initialView);
          urlRestoredRef.current = true;
        }
      }
    } catch (error) {
      console.error('Error loading client accounts:', error);
    }
  };

  const handleAccountSwitch = async (accountId: string) => {
    const selectedAccount = [...accounts, ...clientAccounts].find(
      (acc) => acc.id === accountId
    );

    if (!selectedAccount) {
      console.error('Account not found:', accountId);
      return;
    }

    setCurrentAccount(selectedAccount);

    if (selectedAccount.account_type === 'agency') {
      setIsViewingClient(false);
      setActiveView('sub-accounts');
      window.history.pushState(null, '', '/');
    } else {
      setIsViewingClient(true);
      setActiveView('dashboard');
      // Only persist URL for real (non-mock) accounts
      if (!isMockId(selectedAccount.id)) {
        const slug = (selectedAccount as any).slug;
        if (slug) window.history.pushState(null, '', `/account/${slug}`);
      } else {
        // Reset to agency URL so mock accounts don't 404 on refresh
        window.history.pushState(null, '', '/');
      }
    }
  };

  const loadStats = async () => {
    if (!currentAccount) return;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      contactsJson,
      { data: dealsData },
      { count: emailsSent },
      { count: textsSent },
      { count: bookingsCount },
      { data: wonDeals },
      { data: metaRows },
      { data: todayActivitiesData },
      { count: textsTotalCount },
      { count: textRepliesCount },
      { count: textBookingIntentCount },
      { count: textBookedCount },
    ] = await Promise.all([
      fetch(`/api/contacts?accountId=${currentAccount.id}`).then(r => r.ok ? r.json() : {}),
      supabase.from('deals').select('status').eq('account_id', currentAccount.id).eq('status', 'open'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('account_id', currentAccount.id).eq('type', 'email').eq('direction', 'outbound'),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('account_id', currentAccount.id).eq('type', 'sms').eq('direction', 'outbound'),
      supabase.from('activities').select('*', { count: 'exact', head: true }).eq('account_id', currentAccount.id).eq('type', 'meeting'),
      supabase.from('deals').select('value').eq('account_id', currentAccount.id).eq('status', 'won'),
      supabase.from('meta_ad_metrics').select('spend').eq('account_id', currentAccount.id).gte('date', thirtyDaysAgo.toISOString().slice(0, 10)),
      supabase.from('activities').select('id, title, type, scheduled_at, description').eq('account_id', currentAccount.id).gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString()).order('scheduled_at', { ascending: true }).limit(10),
      // Texting stats from leads table (agency-only, global table)
      supabase.from('leads').select('*', { count: 'exact', head: true }).not('text_status', 'is', null).gte('last_texted_at', thirtyDaysAgo.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('text_reply_received', true).gte('last_texted_at', thirtyDaysAgo.toISOString()),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('text_booking_intent', true),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('text_booked', true),
    ]);

    const contactsData: { id: string; status: string }[] = contactsJson.contacts || [];
    const closingsCount = wonDeals?.length || 0;
    const totalRevenue = wonDeals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
    const adSpend = metaRows?.reduce((s, r) => s + (r.spend || 0), 0) || 0;

    setTodayActivities(todayActivitiesData || []);
    setStats({
      totalContacts: contactsData.length,
      totalLeads: contactsData.filter(c => c.status === 'lead').length,
      totalCustomers: contactsData.filter(c => c.status === 'customer').length,
      activeDeals: dealsData?.length || 0,
      emailsSent: emailsSent || 0,
      textsSent: textsSent || 0,
      bookings: bookingsCount || 0,
      closings: closingsCount,
      revenue: totalRevenue,
      adSpend,
      textsTotal: textsTotalCount || 0,
      textReplies: textRepliesCount || 0,
      textBookingIntent: textBookingIntentCount || 0,
      textBooked: textBookedCount || 0,
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    switch (activeView) {
      case 'sub-accounts':
        if (isAgencyUser && agencyAccount) {
          return (
            <SubaccountsOverview
              agencyAccount={agencyAccount}
              userId={user.id}
              clientAccounts={clientAccounts}
              onEnterClient={(id) => handleAccountSwitch(id)}
              onRefreshClients={loadClientAccounts}
            />
          );
        }
        return null;
      case 'contacts':
        if (isMockId(currentAccount?.id || '')) {
          return <MockSubAccountContent slug={(currentAccount as any)?.slug || ''} activeView="contacts" />;
        }
        return (
          <ContactsList
            contacts={contacts}
            accountId={currentAccount?.id || ''}
            accountName={currentAccount?.name || ''}
            onRefresh={loadContacts}
            onContactClick={(contactId) => {
              setSelectedContactId(contactId);
              setActiveView('conversations');
            }}
            onSmsClick={(contact) => {
              setSelectedContactId(contact.id);
              setActiveView('conversations');
            }}
            onEmailClick={(contact) => {
              setSelectedContactId(contact.id);
              setActiveView('conversations');
            }}
          />
        );
      case 'conversations':
        if (isMockId(currentAccount?.id || '')) {
          return <MockSubAccountContent slug={(currentAccount as any)?.slug || ''} activeView="conversations" />;
        }
        return (
          <Conversations
            accountId={currentAccount?.id || ''}
            contacts={contacts}
            selectedContactId={selectedContactId}
          />
        );
      case 'calendar':
        if (isMockId(currentAccount?.id || '')) {
          return <MockSubAccountContent slug={(currentAccount as any)?.slug || ''} activeView="calendar" />;
        }
        return (
          <CalendarView
            accountId={currentAccount?.id || ''}
            userId={user.id}
            defaultTimezone={currentAccount?.settings?.timezone}
          />
        );
      case 'settings':
        return (
          <Settings
            account={currentAccount!}
            onUpdate={loadAccounts}
            isAgencyUser={isAgencyUser}
            userId={user.id}
            userRole={userRole}
          />
        );
      case 'pipelines':
        if (isMockId(currentAccount?.id || '')) {
          return <MockSubAccountContent slug={(currentAccount as any)?.slug || ''} activeView="pipelines" />;
        }
        return (
          <PipelineManager accountId={currentAccount?.id || ''} />
        );
      case 'workflows':
        return (
          <WorkflowList
            accountId={currentAccount?.id || ''}
            userId={user.id}
          />
        );
      case 'pages':
        return (
          <LandingPageList accountId={currentAccount?.id || ''} accountSlug={(currentAccount as any)?.slug || ''} isAgencyUser={isAgencyUser} />
        );
      case 'ai-agent':
        return (
          <AIAgent accountId={currentAccount?.id || ''} />
        );
      case 'leads':
        return <LeadsList />;
      case 'campaigns':
        return <StaceyConversations />;
      case 'command-center':
        return <CommandCenterV2 />;
      case 'analytics':
        return <AnalyticsDashboard accountId={currentAccount?.id || ''} />;
      case 'instagram-dms':
        return <InstagramDMs />;
      case 'agency-analytics':
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Client Performance</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">All sub-accounts</p>
            </div>
            <ClientDataTable />
          </div>
        );
      default:
        // Mock sub-account dashboard
        if (isMockId(currentAccount?.id || '') && isViewingClient) {
          const mockSlug = (currentAccount as any)?.slug || '';
          return (
            <div>
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Viewing: {currentAccount?.name}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400">Demo sub-account — display only</p>
                </div>
                <button
                  onClick={() => { if (agencyAccount) { setCurrentAccount(agencyAccount); setIsViewingClient(false); setActiveView('dashboard'); } }}
                  className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium"
                >Back to Agency</button>
              </div>
              <MockSubAccountContent slug={mockSlug} activeView="dashboard" />
            </div>
          );
        }

        // Unified dashboard
        return (
          <DashboardHome
            user={user}
            currentAccount={currentAccount!}
            agencyAccount={agencyAccount}
            clientAccounts={clientAccounts}
            isAgencyUser={isAgencyUser}
            isViewingClient={isViewingClient}
            stats={stats}
            hotLeads={hotLeads}
            todayActivities={todayActivities}
            onViewChange={setActiveView}
            onSelectContact={setSelectedContactId}
            onNavigateBack={() => {
              if (agencyAccount) {
                setCurrentAccount(agencyAccount);
                setIsViewingClient(false);
                setActiveView('dashboard');
              }
            }}
          />
        );
    }
  };

  if (!currentAccount) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <div className="card max-w-md text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">No Account Access</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your user account is not associated with any accounts. Please contact your administrator to be invited to an account.
          </p>
          <button
            onClick={handleSignOut}
            className="btn btn-secondary w-full"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-nx-mobile={isMobile ? 'true' : 'false'} style={{ display: 'flex', height: '100dvh', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }}>
      {currentAccount && <PushNotificationSetup accountId={currentAccount.id} />}

      {/* Desktop sidebar — only rendered on desktop */}
      {!isMobile && (
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          onSignOut={handleSignOut}
          currentAccount={currentAccount!}
          accounts={accounts}
          clientAccounts={clientAccounts}
          onAccountSwitch={handleAccountSwitch}
          isViewingClient={isViewingClient}
          userRole={userRole}
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapse}
        />
      )}

      {/* Mobile overlay backdrop */}
      {mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)} style={{
          position: 'fixed', inset: 0,
          background: 'oklch(18% 0.012 260 / 0.5)',
          backdropFilter: 'blur(2px)', zIndex: 100,
        }} />
      )}

      {/* Mobile slide-in sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 280, zIndex: 101,
        transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 220ms cubic-bezier(0.2,0.8,0.2,1)',
        display: isMobile ? 'block' : 'none',
      }}>
        <Sidebar
          activeView={activeView}
          onViewChange={(v) => { setActiveView(v); setMobileNavOpen(false); }}
          onSignOut={handleSignOut}
          currentAccount={currentAccount!}
          accounts={accounts}
          clientAccounts={clientAccounts}
          onAccountSwitch={(id) => { handleAccountSwitch(id); setMobileNavOpen(false); }}
          isViewingClient={isViewingClient}
          userRole={userRole}
          collapsed={false}
          onCollapsedChange={() => {}}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar
          currentAccount={currentAccount!}
          activeView={activeView}
          isMobile={isMobile}
          onMenu={() => setMobileNavOpen(v => !v)}
        />

        <main style={{ flex: 1, overflowY: 'auto', color: 'var(--ink)' }}>
          <ErrorBoundary key={activeView} label={activeView}>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
