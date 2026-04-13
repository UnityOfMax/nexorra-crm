'use client';

import {
  LayoutDashboard, TrendingUp, Mail, Instagram, Target, Cpu,
  Users, CalendarDays, MessageSquare,
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

const agencyTabs: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipelines', label: 'Opportunities', icon: TrendingUp },
  { id: 'command-center', label: 'Command', icon: Cpu },
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'campaigns', label: 'Emails', icon: Mail },
  { id: 'instagram-dms', label: 'Instagram', icon: Instagram },
];

const clientTabs: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'pipelines', label: 'Pipeline', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'conversations', label: 'Messages', icon: MessageSquare },
];

export default function MobileNav({ activeView, onViewChange, isAgencyUser, isViewingClient }: MobileNavProps) {
  const tabs = (isAgencyUser && !isViewingClient) ? agencyTabs : clientTabs;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#2c2c2e] border-t border-gray-200/60 dark:border-white/8"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
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
              {isActive && (
                <span className="absolute top-0 w-8 h-[2px] rounded-full bg-[var(--nx-primary)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
