'use client';

import { useState } from 'react';
import { LayoutDashboard, Users, Settings, MessageSquare, Workflow, KanbanSquare, Calendar, Building2, FileText, Menu, X, Bot, Target, Mail, Terminal, BarChart2, Instagram } from 'lucide-react';
import AccountSwitcherDropdown from './AccountSwitcherDropdown';
import type { Account } from '@/types';
import type { UserRole } from '@/types/agency';

const OWNER_ADMIN_ROLES: UserRole[] = ['agency_owner', 'agency_admin', 'client_owner', 'client_admin'];

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  agencyOnly: boolean;
  ownerAdminOnly: boolean;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

const allSections: MenuSection[] = [
  {
    label: 'CRM',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, agencyOnly: false, ownerAdminOnly: false },
      { id: 'contacts', label: 'Contacts', icon: Users, agencyOnly: false, ownerAdminOnly: false },
      { id: 'conversations', label: 'Conversations', icon: MessageSquare, agencyOnly: false, ownerAdminOnly: false },
      { id: 'calendar', label: 'Calendar', icon: Calendar, agencyOnly: false, ownerAdminOnly: false },
      { id: 'pipelines', label: 'Opportunities', icon: KanbanSquare, agencyOnly: false, ownerAdminOnly: false },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'workflows', label: 'Workflows', icon: Workflow, agencyOnly: false, ownerAdminOnly: false },
      { id: 'pages', label: 'Landing Pages', icon: FileText, agencyOnly: false, ownerAdminOnly: false },
      { id: 'analytics', label: 'Analytics', icon: BarChart2, agencyOnly: false, ownerAdminOnly: true },
      { id: 'ai-agent', label: 'AI Agent', icon: Bot, agencyOnly: false, ownerAdminOnly: true },
    ],
  },
  {
    label: 'Agency',
    items: [
      { id: 'leads', label: 'Leads', icon: Target, agencyOnly: true, ownerAdminOnly: false },
      { id: 'campaigns', label: 'Email Campaigns', icon: Mail, agencyOnly: true, ownerAdminOnly: false },
      { id: 'instagram-conversations', label: 'Instagram DMs', icon: Instagram, agencyOnly: true, ownerAdminOnly: false },
      { id: 'agency-analytics', label: 'Analytics', icon: BarChart2, agencyOnly: true, ownerAdminOnly: true },
      { id: 'command-center', label: 'Command Center', icon: Terminal, agencyOnly: true, ownerAdminOnly: true },
      { id: 'sub-accounts', label: 'Sub-Accounts', icon: Building2, agencyOnly: true, ownerAdminOnly: false },
    ],
  },
];

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onSignOut: () => void;
  currentAccount: Account;
  accounts: Account[];
  clientAccounts: Account[];
  onAccountSwitch: (accountId: string) => void;
  isViewingClient?: boolean;
  userRole?: UserRole | null;
}

function SidebarContent({
  sections,
  activeView,
  onViewChange,
  onSignOut,
  currentAccount,
  accounts,
  clientAccounts,
  onAccountSwitch,
  onClose,
}: {
  sections: MenuSection[];
  activeView: string;
  onViewChange: (view: string) => void;
  onSignOut: () => void;
  currentAccount: Account;
  accounts: Account[];
  clientAccounts: Account[];
  onAccountSwitch: (accountId: string) => void;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Account switcher */}
      <div className="p-4 border-b border-gray-200/40 dark:border-white/5">
        <AccountSwitcherDropdown
          currentAccount={currentAccount}
          accounts={accounts}
          clientAccounts={clientAccounts}
          onAccountSwitch={(id) => { onAccountSwitch(id); onClose?.(); }}
          onSignOut={onSignOut}
        />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {sections.map((section, idx) => (
          <div key={section.label} className={idx > 0 ? 'mt-5' : 'mt-1'}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 select-none">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => { onViewChange(item.id); onClose?.(); }}
                      className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[var(--nx-primary)]/12 text-[var(--nx-primary)] dark:bg-[var(--nx-primary)]/18'
                          : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                        isActive ? 'text-[var(--nx-primary)]' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                      }`} />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--nx-primary)]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: Settings */}
      <div className="p-3 border-t border-gray-200/40 dark:border-white/5">
        <button
          onClick={() => { onViewChange('settings'); onClose?.(); }}
          className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            activeView === 'settings'
              ? 'bg-[var(--nx-primary)]/12 text-[var(--nx-primary)] dark:bg-[var(--nx-primary)]/18'
              : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-gray-200'
          }`}
        >
          <Settings className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
            activeView === 'settings' ? 'text-[var(--nx-primary)]' : 'text-gray-400 dark:text-gray-500'
          }`} />
          <span>Settings</span>
        </button>
      </div>
    </>
  );
}

export default function Sidebar({
  activeView,
  onViewChange,
  onSignOut,
  currentAccount,
  accounts,
  clientAccounts,
  onAccountSwitch,
  isViewingClient = false,
  userRole,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter sections based on role/account type, removing empty sections
  const sections = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.agencyOnly && isViewingClient) return false;
        if (item.ownerAdminOnly && userRole && !OWNER_ADMIN_ROLES.includes(userRole)) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const sharedProps = {
    sections,
    activeView,
    onViewChange,
    onSignOut,
    currentAccount,
    accounts,
    clientAccounts,
    onAccountSwitch,
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/90 dark:bg-[#2c2c2e]/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60 dark:border-white/8"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#1c1c1e] flex flex-col"
            style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/40 dark:border-white/5">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 transition-colors">
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <SidebarContent {...sharedProps} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col flex-shrink-0 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5">
        <SidebarContent {...sharedProps} />
      </aside>
    </>
  );
}
