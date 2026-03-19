'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, Calendar, Settings, Target,
  BarChart2, Building2, Mail, Instagram, Terminal, KanbanSquare,
  Workflow, FileText, Bot, MoreHorizontal, X, ChevronRight,
} from 'lucide-react';

interface MobileNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isAgencyUser: boolean;
  isViewingClient?: boolean;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Primary bottom tabs (max 5 shown, rest in "More" menu)
const agencyPrimaryTabs: TabItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'campaigns', label: 'Email', icon: Mail },
  { id: 'instagram-dms', label: 'Instagram', icon: Instagram },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

const agencyMoreItems: TabItem[] = [
  { id: 'sub-accounts', label: 'Sub-Accounts', icon: Building2 },
  { id: 'pipelines', label: 'Opportunities', icon: KanbanSquare },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'command-center', label: 'Command Center', icon: Terminal },
  { id: 'agency-analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'pages', label: 'Landing Pages', icon: FileText },
  { id: 'ai-agent', label: 'AI Agent', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const clientPrimaryTabs: TabItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'conversations', label: 'Messages', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

const clientMoreItems: TabItem[] = [
  { id: 'pipelines', label: 'Opportunities', icon: KanbanSquare },
  { id: 'workflows', label: 'Workflows', icon: Workflow },
  { id: 'pages', label: 'Landing Pages', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'ai-agent', label: 'AI Agent', icon: Bot },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileNav({ activeView, onViewChange, isAgencyUser, isViewingClient }: MobileNavProps) {
  const [showMore, setShowMore] = useState(false);

  const primaryTabs = (isAgencyUser && !isViewingClient) ? agencyPrimaryTabs : clientPrimaryTabs;
  const moreItems = (isAgencyUser && !isViewingClient) ? agencyMoreItems : clientMoreItems;

  // Check if active view is in "more" menu
  const isActiveInMore = moreItems.some(item => item.id === activeView);

  const handleTabClick = (id: string) => {
    if (id === 'more') {
      setShowMore(!showMore);
    } else {
      setShowMore(false);
      onViewChange(id);
    }
  };

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMore(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#2c2c2e] rounded-t-2xl max-h-[70vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">More</h3>
              <button onClick={() => setShowMore(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-2 pb-4">
              {moreItems.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button key={item.id} onClick={() => handleTabClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--nx-primary)]/10 text-[var(--nx-primary)]'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/6'
                    }`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-gray-300 dark:text-gray-600" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#2c2c2e] border-t border-gray-200/60 dark:border-white/8"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch">
          {primaryTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = tab.id === 'more'
              ? (showMore || isActiveInMore)
              : activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors duration-150 active:bg-gray-100/80 dark:active:bg-white/6"
                aria-label={tab.label}
              >
                <Icon className={`w-5 h-5 transition-colors duration-150 ${
                  isActive ? 'text-[var(--nx-primary)]' : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span className={`text-[10px] font-medium truncate max-w-[56px] leading-tight transition-colors duration-150 ${
                  isActive ? 'text-[var(--nx-primary)]' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {tab.label}
                </span>
                {isActive && tab.id !== 'more' && (
                  <span className="absolute top-0 w-8 h-[2px] rounded-full bg-[var(--nx-primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
