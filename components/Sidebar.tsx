'use client';

import { useState } from 'react';
import { LayoutDashboard, Users, Settings, MessageSquare, Workflow, KanbanSquare, Calendar, Building2, FileText, Menu, X } from 'lucide-react';
import AccountSwitcherDropdown from './AccountSwitcherDropdown';
import type { Account } from '@/types';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onSignOut: () => void;
  currentAccount: Account;
  accounts: Account[];
  clientAccounts: Account[];
  onAccountSwitch: (accountId: string) => void;
  isViewingClient?: boolean;
}

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, agencyOnly: false },
  { id: 'contacts', label: 'Contacts', icon: Users, agencyOnly: false },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare, agencyOnly: false },
  { id: 'calendar', label: 'Calendar', icon: Calendar, agencyOnly: false },
  { id: 'pipelines', label: 'Pipelines', icon: KanbanSquare, agencyOnly: false },
  { id: 'workflows', label: 'Workflows', icon: Workflow, agencyOnly: false },
  { id: 'pages', label: 'Landing Pages', icon: FileText, agencyOnly: false },
  { id: 'sub-accounts', label: 'Sub-Accounts', icon: Building2, agencyOnly: true },
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
  menuItems: typeof allMenuItems;
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
      <div className="p-4 border-b border-gray-200">
        <AccountSwitcherDropdown
          currentAccount={currentAccount}
          accounts={accounts}
          clientAccounts={clientAccounts}
          onAccountSwitch={(id) => { onAccountSwitch(id); onClose?.(); }}
          onSignOut={onSignOut}
        />
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => { onViewChange(item.id); onClose?.(); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings pinned at bottom */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => { onViewChange('settings'); onClose?.(); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            activeView === 'settings'
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
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
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = allMenuItems.filter(item => {
    if (item.agencyOnly && isViewingClient) return false;
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
      {/* Mobile hamburger button — shown only on small screens */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="font-semibold text-gray-900">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <SidebarContent {...sharedProps} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0">
        <SidebarContent {...sharedProps} />
      </aside>
    </>
  );
}
