'use client';

import { LayoutDashboard, MessageSquare, Calendar, KanbanSquare, Settings, LogOut } from 'lucide-react';

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
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function ClientSidebar({
  activeView,
  onViewChange,
  onSignOut,
  accountName
}: ClientSidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-600">
          {accountName || 'CRM'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">Client Portal</p>
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
