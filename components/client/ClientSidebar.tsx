'use client';

import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, MessageSquare, Calendar, KanbanSquare, Settings, ChevronDown, Check, LogOut, Building2, BarChart2 } from 'lucide-react';
interface ClientSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onSignOut: () => void;
  accountName?: string;
}

const clientMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'pipelines', label: 'Opportunities', icon: KanbanSquare },
];

function ClientAccountDropdown({ accountName, onSignOut }: { accountName: string; onSignOut: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-100/70 dark:bg-white/8 hover:bg-gray-100 dark:hover:bg-white/12 rounded-xl transition-all duration-150 border border-gray-200/60 dark:border-white/8"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Building2 className="w-4 h-4 text-[var(--nx-primary)] flex-shrink-0" />
          <div className="text-left min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{accountName}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">Client Account</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#2c2c2e] border border-gray-200/60 dark:border-white/8 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/4 border-b border-gray-200/60 dark:border-white/5">
            MY ACCOUNT
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/60 dark:border-white/5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/50 dark:to-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
                  {accountName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{accountName}</span>
            </div>
            <Check className="w-4 h-4 text-[var(--nx-primary)] flex-shrink-0" />
          </div>
          <div>
            <button
              onClick={() => { setIsOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientSidebar({
  activeView,
  onViewChange,
  onSignOut,
  accountName = 'CRM',
}: ClientSidebarProps) {
  return (
    // Desktop-only sidebar — mobile nav is handled by MobileNav bottom tabs
    <aside className="hidden md:flex w-60 flex-col flex-shrink-0 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5">
      <div className="p-4 border-b border-gray-200/40 dark:border-white/5">
        <ClientAccountDropdown accountName={accountName} onSignOut={onSignOut} />
      </div>

      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-0.5">
          {clientMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
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
      </nav>

      <div className="p-3 border-t border-gray-200/40 dark:border-white/5">
        <button
          onClick={() => onViewChange('settings')}
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
    </aside>
  );
}
