'use client';

import { useState, useEffect, useCallback } from 'react';
import { AGENT_DEFINITIONS } from '@/lib/agents/definitions';
import type { AgentConfig, TabKey } from './types';
import CompanyLayout from './tabs/CompanyLayout';
import ClockedIn from './tabs/ClockedIn';
import ClockedOut from './tabs/ClockedOut';
import TasksTab from './tabs/TasksTab';

// ─── Tab Definitions ───
const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'layout', label: 'Company Layout' },
  { key: 'clocked-in', label: 'Clocked In' },
  { key: 'clocked-out', label: 'Clocked Out' },
  { key: 'tasks', label: 'Tasks' },
];

// ─── Usage Bar ───
function UsageBar() {
  const [usage, setUsage] = useState<any>({
    window: 0, windowLimit: 2000000, daily: 0, dailyLimit: 5000000,
    windowRunCount: 0, dailyRunCount: 0,
  });

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

  const windowPct = Math.min(100, Math.round((usage.window / Math.max(1, usage.windowLimit)) * 100));
  const dailyPct = Math.min(100, Math.round((usage.daily / Math.max(1, usage.dailyLimit)) * 100));

  const barColor = (pct: number) =>
    pct > 80 ? 'var(--rose)' : pct > 60 ? 'var(--amber)' : 'var(--green)';

  const fmt = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` :
    n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      {/* 5h window */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
          5h window
        </span>
        <div style={{ width: 80, height: 4, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: barColor(windowPct),
            width: `${Math.max(windowPct, usage.windowRunCount > 0 ? 3 : 0)}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace' }}>
          {fmt(usage.window)} ({usage.windowRunCount || 0} runs)
        </span>
      </div>
      {/* Today */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontVariantNumeric: 'tabular-nums' }}>
          Today
        </span>
        <div style={{ width: 64, height: 4, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: barColor(dailyPct),
            width: `${Math.max(dailyPct, usage.dailyRunCount > 0 ? 3 : 0)}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace' }}>
          {fmt(usage.daily)} ({usage.dailyRunCount || 0} runs)
        </span>
      </div>
    </div>
  );
}

// ─── KPI Card ───
function KpiCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      background: 'var(--paper)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '16px 20px',
      flex: '1 1 0',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || 'var(--ink)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

// ─── Main Command Center V2 ───
export default function CommandCenterV2() {
  const [activeTab, setActiveTab] = useState<TabKey>('layout');
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>({
    daily: 0, dailyLimit: 5000000, dailyRunCount: 0,
  });

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

  // Fetch usage for KPI cards
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

  const successRuns = agents.filter(a => a.latest_run?.status === 'completed').length;
  const completedRuns = agents.filter(a => a.latest_run?.status === 'completed' || a.latest_run?.status === 'failed').length;
  const successRate = completedRuns > 0 ? Math.round((successRuns / completedRuns) * 100) : 100;

  const fmtTokens = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` :
    n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--paper)', borderRadius: 12,
      border: '1px solid var(--line)', overflow: 'hidden',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '24px 28px 0',
        background: 'var(--paper-2)',
        borderBottom: '1px solid var(--line)',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0, lineHeight: 1.2 }}>
          Command Center
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '4px 0 20px' }}>
          Orchestrate AI agents across the delivery stack.
        </p>

        {/* KPI Cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <KpiCard
            label="Active agents"
            value={`${runningCount} active`}
            accent={runningCount > 0 ? 'var(--green)' : 'var(--ink-3)'}
          />
          <KpiCard
            label="Runs today"
            value={String(usage.dailyRunCount || todayRuns)}
          />
          <KpiCard
            label="Token usage"
            value={fmtTokens(usage.daily || 0)}
          />
          <KpiCard
            label="Success rate"
            value={`${successRate}%`}
            accent={successRate >= 90 ? 'var(--green)' : successRate >= 70 ? 'var(--amber)' : 'var(--rose)'}
          />
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const badge = tab.key === 'clocked-in' ? runningCount : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px',
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  border: isActive ? '1px solid var(--ink)' : '1px solid transparent',
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--paper)' : 'var(--ink-3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
                {badge != null && badge > 0 && (
                  <span style={{
                    background: 'var(--green)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 99,
                    padding: '1px 5px',
                    minWidth: 16,
                    textAlign: 'center',
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Usage Bar */}
        <div style={{ padding: '10px 0 14px' }}>
          <UsageBar />
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                </path>
              </svg>
              <span style={{ fontSize: 13 }}>Loading agents...</span>
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
