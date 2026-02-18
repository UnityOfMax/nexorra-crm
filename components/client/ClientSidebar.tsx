'use client';

import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, MessageSquare, Calendar, KanbanSquare, Settings, ChevronDown, Check, LogOut, Building2 } from 'lucide-react';

interface ClientSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onSignOut: () => void;
  accountName?: string;
}

const clientMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Building2 className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <div className="text-left min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate">{accountName}</div>
            <div className="text-xs text-gray-500">Client Account</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
            MY ACCOUNT
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary-700">
                  {accountName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900 truncate">{accountName}</span>
            </div>
            <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
          </div>
          <div className="border-t border-gray-200">
            <button
              onClick={() => { setIsOpen(false); onSignOut(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <ClientAccountDropdown accountName={accountName} onSignOut={onSignOut} />
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {clientMenuItems.map((item) => {
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

      {/* Settings pinned at bottom */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => onViewChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            activeView === 'settings'
              ? 'bg-primary-50 text-primary-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
