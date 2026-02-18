'use client';

import { LayoutDashboard, Users, Settings, LogOut, MessageSquare, Workflow, KanbanSquare, Calendar, Building2, FileText } from 'lucide-react';
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
  { id: 'settings', label: 'Settings', icon: Settings, agencyOnly: false },
  { id: 'sub-accounts', label: 'Sub-Accounts', icon: Building2, agencyOnly: true },
];

export default function Sidebar({
  activeView,
  onViewChange,
  onSignOut,
  currentAccount,
  accounts,
  clientAccounts,
  onAccountSwitch,
  isViewingClient = false
}: SidebarProps) {
  // Hide "Sub-Accounts" when viewing a sub-account (sub-accounts don't have their own sub-accounts)
  const menuItems = allMenuItems.filter(item => {
    if (item.agencyOnly && isViewingClient) return false;
    return true;
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Account Switcher at top */}
      <div className="p-4 border-b border-gray-200">
        <AccountSwitcherDropdown
          currentAccount={currentAccount}
          accounts={accounts}
          clientAccounts={clientAccounts}
          onAccountSwitch={onAccountSwitch}
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
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
