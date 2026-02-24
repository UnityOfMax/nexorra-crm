'use client';

import { useState } from 'react';
import { LayoutDashboard, Users, Settings, MessageSquare, Workflow, KanbanSquare, Calendar, Building2, FileText, Menu, X, Bot } from 'lucide-react';
import AccountSwitcherDropdown from './AccountSwitcherDropdown';
import type { Account } from '@/types';
import type { UserRole } from '@/types/agency';

const OWNER_ADMIN_ROLES: UserRole[] = ['agency_owner', 'agency_admin', 'client_owner', 'client_admin'];

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

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, agencyOnly: false, ownerAdminOnly: false },
  { id: 'contacts', label: 'Contacts', icon: Users, agencyOnly: false, ownerAdminOnly: false },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare, agencyOnly: false, ownerAdminOnly: false },
  { id: 'calendar', label: 'Calendar', icon: Calendar, agencyOnly: false, ownerAdminOnly: false },
  { id: 'pipelines', label: 'Opportunities', icon: KanbanSquare, agencyOnly: false, ownerAdminOnly: false },
  { id: 'workflows', label: 'Workflows', icon: Workflow, agencyOnly: false, ownerAdminOnly: false },
  { id: 'pages', label: 'Landing Pages', icon: FileText, agencyOnly: false, ownerAdminOnly: false },
  { id: 'ai-agent', label: 'AI Agent', icon: Bot, agencyOnly: false, ownerAdminOnly: true },
  { id: 'sub-accounts', label: 'Sub-Accounts', icon: Building2, agencyOnly: true, ownerAdminOnly: false },
];

function SidebarContent({
  menuItems,
  activeView,
  onViewChange,
  onSignOut,
  currentAccount,
  accounts,
  clientAccounts,
  onAccountSwitch,
  onClose,
}: {
  menuItems: (typeof allMenuItems)[number][];
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
      <div className="p-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <AccountSwitcherDropdown
          currentAccount={currentAccount}
          accounts={accounts}
          clientAccounts={clientAccounts}
          onAccountSwitch={(id) => { onAccountSwitch(id); onClose?.(); }}
          onSignOut={onSignOut}
        />
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => { onViewChange(item.id); onClose?.(); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-700 font-semibold dark:bg-primary-500/20 dark:text-primary-400'
                      : 'text-gray-600 hover:bg-gray-500/8 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/8 dark:hover:text-gray-100'
                  }`}
                  style={isActive ? { boxShadow: '0 1px 4px rgba(2,132,199,0.15)' } : undefined}
                >
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: Settings + ThemeToggle */}
      <div className="p-3 border-t border-gray-200/60 dark:border-gray-700/60">
        <button
          onClick={() => { onViewChange('settings'); onClose?.(); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm mb-1 ${
            activeView === 'settings'
              ? 'bg-primary-500/10 text-primary-700 font-semibold dark:bg-primary-500/20 dark:text-primary-400'
              : 'text-gray-600 hover:bg-gray-500/8 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/8 dark:hover:text-gray-100'
          }`}
        >
          <Settings className={`w-[18px] h-[18px] flex-shrink-0 ${activeView === 'settings' ? 'text-primary-600 dark:text-primary-400' : ''}`} />
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

  const menuItems = allMenuItems.filter(item => {
    if (item.agencyOnly && isViewingClient) return false;
    if (item.ownerAdminOnly && userRole && !OWNER_ADMIN_ROLES.includes(userRole)) return false;
    return true;
  });

  const sharedProps = {
    menuItems,
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
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-card border border-gray-200/60 dark:border-gray-700/60"
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
            className="absolute left-0 top-0 bottom-0 w-72 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl flex flex-col"
            style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-700/60">
              <span className="font-semibold text-gray-900 dark:text-gray-100">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <SidebarContent {...sharedProps} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 flex-col flex-shrink-0 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50"
      >
        <SidebarContent {...sharedProps} />
      </aside>
    </>
  );
}
