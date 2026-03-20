'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  Network,
  CircleDot,
  CircleOff,
  ListTodo,
} from 'lucide-react';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';
import type { AgentConfig, TabKey } from './types';
import CompanyLayout from './tabs/CompanyLayout';
import ClockedIn from './tabs/ClockedIn';
import ClockedOut from './tabs/ClockedOut';
import TasksTab from './tabs/TasksTab';

// ─── Tab Definitions ───
const TABS: Array<{ key: TabKey; label: string; icon: typeof Activity }> = [
  { key: 'layout', label: 'Company Layout', icon: Network },
  { key: 'clocked-in', label: 'Clocked In', icon: CircleDot },
  { key: 'clocked-out', label: 'Clocked Out', icon: CircleOff },
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
];

// ─── Usage Bar ───
function UsageBar() {
  const [usage, setUsage] = useState({ daily: 0, weekly: 0, dailyLimit: 100, weeklyLimit: 100 });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/usage/stats');
        if (res.ok) setUsage(await res.json());
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const dailyPct = Math.min(100, Math.round((usage.daily / Math.max(1, usage.dailyLimit)) * 100));
  const weeklyPct = Math.min(100, Math.round((usage.weekly / Math.max(1, usage.weeklyLimit)) * 100));
  const barColor = (pct: number) => pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="hidden sm:flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Daily</span>
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor(dailyPct)}`} style={{ width: `${dailyPct}%` }} />
        </div>
        <span className="text-gray-600 dark:text-gray-300 font-mono">{dailyPct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Weekly</span>
        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor(weeklyPct)}`} style={{ width: `${weeklyPct}%` }} />
        </div>
        <span className="text-gray-600 dark:text-gray-300 font-mono">{weeklyPct}%</span>
      </div>
    </div>
  );
}

// ─── Main Command Center V2 ───
export default function CommandCenterV2() {
  const [activeTab, setActiveTab] = useState<TabKey>('layout');
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const hasRunning = agents.some(a => a.latest_run?.status === 'running');
  const runningCount = agents.filter(a => a.latest_run?.status === 'running').length;

  useEffect(() => {
    fetchAgents();
    const t = setInterval(fetchAgents, hasRunning ? 5000 : 15000);
    return () => clearInterval(t);
  }, [fetchAgents, hasRunning]);

  // Run / Stop handlers
  const runAgent = async (agentId: string) => {
    await fetch('/api/agents/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    fetchAgents();
  };

  const stopAgent = async (runId: string) => {
    await fetch(`/api/agents/runs?id=${runId}`, { method: 'DELETE' });
    fetchAgents();
  };

  // Stats
  const todayRuns = agents.filter(a => {
    const run = a.latest_run;
    if (!run) return false;
    const today = new Date().toDateString();
    return new Date(run.started_at).toDateString() === today;
  }).length;

  const totalAgents = Object.keys(AGENT_DEFINITIONS).length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1c1c1e] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* Top Bar: Stats + Usage */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-[#0d0d0e] border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
            <span className={`text-xs font-bold ${runningCount > 0 ? 'text-green-500' : 'text-gray-400'}`}>
              {runningCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{todayRuns}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Agents</span>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{totalAgents}</span>
          </div>
        </div>
        <UsageBar />
      </div>

      {/* Tab Switcher: pill-style */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1c1c1e] overflow-x-auto mobile-scroll">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const badge = tab.key === 'clocked-in' ? runningCount : null;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-[#2c2c2e]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {badge != null && badge > 0 && (
                <span className={`min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${
                  isActive
                    ? 'bg-green-500 text-white dark:bg-green-500 dark:text-white'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading agents...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'layout' && <CompanyLayout agents={agents} />}
            {activeTab === 'clocked-in' && <ClockedIn agents={agents} onStop={stopAgent} />}
            {activeTab === 'clocked-out' && <ClockedOut agents={agents} onRun={runAgent} />}
            {activeTab === 'tasks' && <TasksTab />}
          </>
        )}
      </div>
    </div>
  );
}
