'use client';

import { useState, useEffect, useCallback } from 'react';
import { AGENT_DEFINITIONS, DEPARTMENTS } from '@/lib/agents/definitions';
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

// ─── Avatar color palette (cycles by index) ───
const AVATAR_COLORS: Array<{ bg: string; fg: string }> = [
  { bg: 'var(--blue)', fg: '#fff' },
  { bg: 'var(--violet)', fg: '#fff' },
  { bg: 'var(--amber)', fg: '#000' },
  { bg: 'var(--rose)', fg: '#fff' },
  { bg: 'var(--green)', fg: '#fff' },
  { bg: 'var(--paper-3)', fg: 'var(--ink)' },
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
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
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
          {fmt(usage.window)} ({usage.windowRunCount || 0} runs)
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
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
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
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
      background: 'var(--paper-2)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: '18px 20px',
      flex: '1 1 0',
      minWidth: 120,
    }}>
      <div style={{
        fontSize: 10,
        color: 'var(--ink-3)',
        marginBottom: 8,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        fontFamily: 'Geist Mono, monospace',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: accent || 'var(--ink)',
        lineHeight: 1,
        fontFamily: 'Geist Mono, monospace',
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Agent Card ───
function AgentCard({
  agent,
  colorIdx,
}: {
  agent: AgentConfig;
  colorIdx: number;
}) {
  const def = AGENT_DEFINITIONS[agent.id];
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  const isRunning = agent.latest_run?.status === 'running';

  const runs24h = agent.latest_run ? 1 : 0;
  const cost24h = agent.latest_run?.cost_usd
    ? `$${agent.latest_run.cost_usd.toFixed(2)}`
    : '$0.00';

  const initials = (agent.display_name || agent.name || agent.id)
    .split(/[\s-_]/)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: 18,
    }}>
      {/* Top row: avatar + name + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: color.bg, color: color.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14.5, fontWeight: 600, color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {agent.display_name || agent.name || agent.id}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--ink-3)', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {agent.role || def?.department || '—'}
          </div>
        </div>
        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 20, flexShrink: 0,
          background: isRunning
            ? 'color-mix(in srgb, var(--green) 14%, transparent)'
            : 'var(--paper-3)',
          border: `1px solid ${isRunning ? 'color-mix(in srgb, var(--green) 30%, transparent)' : 'var(--line)'}`,
          fontSize: 11, fontWeight: 600,
          color: isRunning ? 'var(--green)' : 'var(--ink-3)',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isRunning ? 'var(--green)' : 'var(--ink-3)',
            flexShrink: 0,
          }} />
          {isRunning ? 'Running' : 'Idle'}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 0 }}>
        <div style={{
          flex: 1,
          borderRight: '1px solid var(--line)',
          paddingRight: 12,
        }}>
          <div style={{
            fontSize: 9, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace',
            textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 3,
          }}>
            RUNS 24H
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: 'var(--ink)',
            fontFamily: 'Geist Mono, monospace',
          }}>
            {runs24h}
          </div>
        </div>
        <div style={{ flex: 1, paddingLeft: 12 }}>
          <div style={{
            fontSize: 9, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace',
            textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 3,
          }}>
            COST 24H
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: 'var(--ink)',
            fontFamily: 'Geist Mono, monospace',
          }}>
            {cost24h}
          </div>
        </div>
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
  const completedRuns = agents.filter(a =>
    a.latest_run?.status === 'completed' || a.latest_run?.status === 'failed'
  ).length;
  const successRate = completedRuns > 0
    ? Math.round((successRuns / completedRuns) * 100)
    : 100;

  const fmtCost = (n: number) => {
    const total = agents.reduce((s, a) => s + (a.latest_run?.cost_usd || 0), 0);
    return `$${total.toFixed(2)}`;
  };

  return (
    <div
      className="nx-pad-mobile"
      style={{
        maxWidth: 1480,
        margin: '0 auto',
        padding: '24px 32px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* ── Page Header ── */}
      <div>
        <div style={{
          fontSize: 12,
          color: 'var(--ink-3)',
          fontFamily: 'Geist Mono, monospace',
          marginBottom: 6,
          letterSpacing: '0.02em',
        }}>
          Nexorra › Command Center
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 700,
          color: 'var(--ink)',
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
        }}>
          Command Center
        </h1>
      </div>

      {/* ── KPI Cards ── */}
      <div
        className="nx-2col-mobile"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}
      >
        <KpiCard
          label="Active Agents"
          value={String(runningCount)}
          accent={runningCount > 0 ? 'var(--green)' : undefined}
        />
        <KpiCard
          label="Runs Today"
          value={String(usage.dailyRunCount || todayRuns)}
        />
        <KpiCard
          label="Cost Today"
          value={fmtCost(usage.daily || 0)}
        />
        <KpiCard
          label="Success Rate"
          value={`${successRate}%`}
          accent={
            successRate >= 90 ? 'var(--green)' :
            successRate >= 70 ? 'var(--amber)' : 'var(--rose)'
          }
        />
      </div>

      {/* ── Agent Cards Grid ── */}
      {!loading && agents.length > 0 && (
        <div
          className="nx-stack-mobile"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}
        >
          {agents.map((agent, idx) => (
            <AgentCard key={agent.id} agent={agent} colorIdx={idx} />
          ))}
        </div>
      )}

      {/* ── Tab System ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Tab pill bar + usage */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 16,
        }}>
          <div style={{
            display: 'flex', gap: 4,
            background: 'var(--paper-2)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: 4,
            flexWrap: 'wrap',
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const badge = tab.key === 'clocked-in' ? runningCount : null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    border: isActive ? '1px solid var(--line)' : '1px solid transparent',
                    background: isActive ? 'var(--paper)' : 'transparent',
                    color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {tab.label}
                  {badge != null && badge > 0 && (
                    <span style={{
                      background: 'var(--green)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'Geist Mono, monospace',
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
          <UsageBar />
        </div>

        {/* Tab Content Area */}
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          overflow: 'hidden',
          minHeight: 300,
        }}>
          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 300, gap: 10, color: 'var(--ink-3)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                </path>
              </svg>
              <span style={{ fontSize: 13, fontFamily: 'Geist Mono, monospace' }}>Loading agents…</span>
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
    </div>
  );
}
