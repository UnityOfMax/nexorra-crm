'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Account, Contact } from '@/types';
import Sidebar from './Sidebar';
import ClientSidebar from './client/ClientSidebar';
import SubAccountsView from './agency/SubAccountsView';
import ContactsList from './ContactsList';
import { Users, TrendingUp, Mail, Phone, Building2, MessageSquare } from 'lucide-react';
import Settings from './Settings';
import Conversations from './Conversations';
import PipelineManager from './pipelines/PipelineManager';
import WorkflowList from './workflows/WorkflowList';
import CalendarView from './calendar/CalendarView';
import LandingPageList from './landing-pages/LandingPageList';
import AIAgent from './AIAgent';
import type { UserRole } from '@/types/agency';

interface DashboardProps {
  user: User;
  initialView?: string;
  initialAccountId?: string;
  initialAccountSlug?: string;
}

export default function Dashboard({ user, initialView, initialAccountId, initialAccountSlug }: DashboardProps) {
  const router = useRouter();
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
  });
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
  // Track whether initial URL state has been restored (prevent overwriting URL on first load)
  const urlRestoredRef = useRef(false);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  useEffect(() => {
    if (currentAccount) {
      loadContacts();
      loadStats();
    }
  }, [currentAccount]);

  useEffect(() => {
    if (agencyAccount && isAgencyUser) {
      loadClientAccounts();
    }
  }, [agencyAccount, isAgencyUser]);

  // Persist view + account in URL so page refresh restores state
  useEffect(() => {
    if (!urlRestoredRef.current) return; // don't overwrite URL during initial load
    if (!currentAccount) return;

    const slug = (currentAccount as any).slug;
    if (isViewingClient && slug) {
      // Sub-account: use /account/[slug]?view=...
      const params = new URLSearchParams();
      if (activeView && activeView !== 'dashboard') params.set('view', activeView);
      const query = params.toString();
      router.replace(query ? `/account/${slug}?${query}` : `/account/${slug}`);
    } else {
      // Agency account: use /?view=...
      const params = new URLSearchParams();
      if (activeView && activeView !== 'dashboard') params.set('view', activeView);
      const query = params.toString();
      router.replace(query ? `/?${query}` : '/');
    }
  }, [activeView, currentAccount, isViewingClient]);

  const loadAccounts = async () => {
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
        // If URL has an account param, try to find it in the user's own accounts first
        const urlAccount = initialAccountId
          ? accountsList.find((a: Account) => a.id === initialAccountId)
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
          // initialView will be applied after client accounts load (see loadClientAccounts)
          if ((!initialAccountId && !initialAccountSlug) || urlAccount) {
            setActiveView(initialView || 'dashboard');
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
        setClientAccounts(clients);

        // If URL had a sub-account ID or slug, switch to it now that we have the list
        if (!urlRestoredRef.current) {
          const subAccount = initialAccountSlug
            ? clients.find((c) => (c as any).slug === initialAccountSlug)
            : initialAccountId
            ? clients.find((c) => c.id === initialAccountId)
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
      setActiveView('dashboard');
      router.push('/');
    } else {
      // Agency owner viewing a sub-account — navigate to slug URL for persistence
      setIsViewingClient(true);
      setActiveView('dashboard');
      const slug = (selectedAccount as any).slug;
      if (slug) {
        router.push(`/account/${slug}`);
      }
    }
  };

  const loadStats = async () => {
    if (!currentAccount) return;

    // Use admin-backed API for the same RLS bypass reason as loadContacts
    const contactsRes = await fetch(`/api/contacts?accountId=${currentAccount.id}`);
    const contactsJson = contactsRes.ok ? await contactsRes.json() : {};
    const contactsData: { id: string; status: string }[] = contactsJson.contacts || [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('contact_id')
      .eq('account_id', currentAccount.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    const activeContactIds = new Set(recentMessages?.map(m => m.contact_id) || []);

    const activeLeads = contactsData?.filter(c =>
      c.status === 'lead' && activeContactIds.has(c.id)
    ).length || 0;

    const { data: dealsData } = await supabase
      .from('deals')
      .select('status')
      .eq('account_id', currentAccount.id)
      .eq('status', 'open');

    if (contactsData) {
      setStats({
        totalContacts: contactsData.length,
        totalLeads: activeLeads,
        totalCustomers: contactsData.filter((c) => c.status === 'customer').length,
        activeDeals: dealsData?.length || 0,
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    switch (activeView) {
      case 'sub-accounts':
        if (isAgencyUser && agencyAccount) {
          return (
            <SubAccountsView
              agencyId={agencyAccount.id}
              userId={user.id}
              onRefreshClientAccounts={loadClientAccounts}
            />
          );
        }
        return null;
      case 'contacts':
        return (
          <ContactsList
            contacts={contacts}
            accountId={currentAccount?.id || ''}
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
        return (
          <Conversations
            accountId={currentAccount?.id || ''}
            contacts={contacts}
            selectedContactId={selectedContactId}
          />
        );
      case 'calendar':
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
          />
        );
      case 'pipelines':
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
          <LandingPageList accountId={currentAccount?.id || ''} isAgencyUser={isAgencyUser} />
        );
      case 'ai-agent':
        return (
          <AIAgent accountId={currentAccount?.id || ''} />
        );
      default:
        // Unified dashboard
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

            {/* Viewing sub-account banner */}
            {isViewingClient && isAgencyUser && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Viewing: {currentAccount?.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    You are managing this sub-account as an agency owner
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (agencyAccount) {
                      setCurrentAccount(agencyAccount);
                      setIsViewingClient(false);
                      setActiveView('dashboard');
                    }
                  }}
                  className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                >
                  Back to Agency
                </button>
              </div>
            )}

            {/* Sub-accounts summary — only on agency account */}
            {isAgencyUser && !isViewingClient && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Sub-Accounts</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{clientAccounts.length}</p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        {clientAccounts.reduce((sum: number, c: any) => sum + (c.members?.[0]?.count || 0), 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView('sub-accounts')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Manage Accounts</p>
                      <p className="text-sm font-medium text-primary-600 mt-2">View Sub-Accounts →</p>
                    </div>
                    <div className="p-3 bg-primary-100 rounded-lg">
                      <Building2 className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Contacts</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalContacts}</p>
                  </div>
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Leads</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalLeads}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Customers</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCustomers}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Deals</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeDeals}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Contacts */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Contacts</h3>
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No contacts yet. Add your first contact to get started!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.slice(0, 5).map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-sm text-gray-600">{contact.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        contact.status === 'customer' ? 'bg-green-100 text-green-700' :
                        contact.status === 'lead' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {contact.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  if (!currentAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">No Account Access</h2>
          <p className="text-gray-600 mb-6">
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
    <div className="flex h-screen bg-gray-50">
      {isAgencyUser ? (
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
        />
      ) : (
        <ClientSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          onSignOut={handleSignOut}
          accountName={currentAccount?.name}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header — add left padding on mobile for hamburger button */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 pl-16 md:pl-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
                {activeView === 'dashboard' ? 'Dashboard' :
                 activeView === 'sub-accounts' ? 'Sub-Accounts' :
                 activeView === 'pipelines' ? 'Opportunities' :
                 activeView === 'pages' ? 'Landing Pages' :
                 activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5 truncate">
                {isViewingClient && isAgencyUser ? (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{currentAccount.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">Owner View</span>
                  </span>
                ) : (
                  currentAccount.name
                )}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
