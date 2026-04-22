'use client';

import { useState, useEffect, useCallback } from 'react';
import { AGENT_DEFINITIONS, DEPARTMENTS } from '@/lib/agents/definitions';
import type { AgentConfig } from './types';

const DEPT_ORDER = ['executive', 'research', 'marketing', 'client', 'delivery', 'engineering', 'experiments', 'council'];

const DEPT_COLORS: Record<string, string> = {
  research: '#3b82f6',
  marketing: '#a855f7',
  client: '#22c55e',
  engineering: '#6366f1',
  experiments: '#ef4444',
  delivery: '#f59e0b',
  executive: '#8b5cf6',
  council: '#d97706',
};

function getDeptColor(dept: string): string {
  return DEPT_COLORS[dept] || '#6b7280';
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTokens(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

// ─── Pulse dot ───
function Pulse({ color }: { color: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, opacity: 0.5,
        animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: color }} />
    </span>
  );
}

// ─── Agent row ───
function AgentRow({ agentId, config, idx }: { agentId: string; config: AgentConfig | undefined; idx: number }) {
  const def = AGENT_DEFINITIONS[agentId];
  if (!def) return null;

  const isRunning = config?.latest_run?.status === 'running';
  const lastRunAt = config?.latest_run?.started_at;
  const dept = DEPARTMENTS[def.department as keyof typeof DEPARTMENTS];
  const deptColor = getDeptColor(def.department);

  const initials = def.displayName.split(/[\s-]/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
      borderBottom: '1px solid var(--line)',
      background: isRunning ? `color-mix(in srgb, ${deptColor} 4%, transparent)` : 'transparent',
      transition: 'background 0.2s',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: deptColor, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
        opacity: isRunning ? 1 : 0.72,
        position: 'relative',
      }}>
        {initials}
        {isRunning && (
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 9, height: 9,
            borderRadius: '50%', background: 'var(--green)',
            border: '2px solid var(--paper)',
          }} />
        )}
      </div>

      {/* Name + role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 7 }}>
          {def.displayName}
          {def.alwaysOn && !isRunning && (
            <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 99, background: 'var(--paper-3)', color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>24/7</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 1.5 }}>
          {def.schedule || 'Manual'}
        </div>
      </div>

      {/* Department */}
      <div style={{
        flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
        background: `color-mix(in srgb, ${deptColor} 14%, transparent)`,
        color: deptColor,
        display: 'none',
      }} className="dept-label">
        {dept?.label || def.department}
      </div>

      {/* Status */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {isRunning ? (
          <>
            <Pulse color="var(--green)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Running</span>
          </>
        ) : (
          <>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-3)', opacity: 0.4, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Idle</span>
          </>
        )}
      </div>

      {/* Last run */}
      <div style={{
        flexShrink: 0, fontSize: 11.5, color: 'var(--ink-3)',
        fontFamily: 'Geist Mono, monospace', minWidth: 60, textAlign: 'right',
      }}>
        {timeAgo(lastRunAt)}
      </div>
    </div>
  );
}

// ─── Department Section ───
function DeptSection({ deptKey, agents }: { deptKey: string; agents: AgentConfig[] }) {
  const agentIds = Object.entries(AGENT_DEFINITIONS)
    .filter(([, d]) => d.department === deptKey)
    .map(([id]) => id);

  if (agentIds.length === 0) return null;

  const dept = DEPARTMENTS[deptKey as keyof typeof DEPARTMENTS];
  const color = getDeptColor(deptKey);
  const runningCount = agentIds.filter(id => {
    const cfg = agents.find(a => a.id === id || a.name === id);
    return cfg?.latest_run?.status === 'running';
  }).length;

  return (
    <div>
      {/* Dept header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
        background: 'var(--paper-3)', borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, zIndex: 1,
      }}>
        <div style={{ width: 3, height: 14, borderRadius: 99, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {dept?.label || deptKey}
        </span>
        {runningCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
            background: 'var(--green)', color: '#fff', fontFamily: 'Geist Mono, monospace',
          }}>
            {runningCount} running
          </span>
        )}
      </div>

      {agentIds.map((id, idx) => {
        const cfg = agents.find(a => a.id === id || a.name === id);
        return <AgentRow key={id} agentId={id} config={cfg} idx={idx} />;
      })}
    </div>
  );
}

// ─── Usage Bar ───
function UsageBar({ usage }: { usage: any }) {
  const windowPct = Math.min(100, Math.round((usage.window / Math.max(1, usage.windowLimit)) * 100));
  const dailyPct = Math.min(100, Math.round((usage.daily / Math.max(1, usage.dailyLimit)) * 100));
  const barColor = (pct: number) => pct > 80 ? 'var(--rose)' : pct > 60 ? 'var(--amber)' : 'var(--blue)';
  const isSessionActive = (usage.window || 0) > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      {isSessionActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Pulse color="var(--blue)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>Session active</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>5h window</span>
        <div style={{ width: 64, height: 3, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: barColor(windowPct), width: `${Math.max(windowPct, isSessionActive ? 3 : 0)}%`, transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
          {fmtTokens(usage.window || 0)} / {fmtTokens(usage.windowLimit || 2000000)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>Today</span>
        <div style={{ width: 64, height: 3, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: barColor(dailyPct), width: `${Math.max(dailyPct, usage.dailyRunCount > 0 ? 3 : 0)}%`, transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
          {usage.dailyRunCount || 0} runs · {fmtTokens(usage.daily || 0)} tokens
        </span>
      </div>
    </div>
  );
}

// ─── Main ───
export default function CommandCenterV2() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>({
    window: 0, windowLimit: 2000000, daily: 0, dailyLimit: 5000000,
    windowRunCount: 0, dailyRunCount: 0,
  });

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

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/usage/stats');
      if (res.ok) setUsage(await res.json());
    } catch {}
  }, []);

  const hasRunning = agents.some(a => a.latest_run?.status === 'running');
  const runningCount = agents.filter(a => a.latest_run?.status === 'running').length;

  useEffect(() => {
    fetchAgents();
    fetchUsage();
    const agentInterval = setInterval(fetchAgents, hasRunning ? 5000 : 15000);
    const usageInterval = setInterval(fetchUsage, hasRunning ? 10000 : 60000);
    return () => { clearInterval(agentInterval); clearInterval(usageInterval); };
  }, [fetchAgents, fetchUsage, hasRunning]);

  return (
    <>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @media (min-width: 640px) {
          .dept-label { display: flex !important; }
        }
      `}</style>

      <div className="nx-pad-mobile" style={{
        maxWidth: 1100, margin: '0 auto', padding: '24px 32px 48px',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace', marginBottom: 6, letterSpacing: '0.02em' }}>
              Nexorra › Command Center
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              Command Center
            </h1>
          </div>
          <UsageBar usage={usage} />
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="nx-2col-mobile">
          {[
            { label: 'Active Now', value: String(runningCount), accent: runningCount > 0 ? 'var(--green)' : undefined },
            { label: 'Runs Today', value: String(usage.dailyRunCount || 0) },
            { label: 'Tokens Today', value: fmtTokens(usage.daily || 0) },
            { label: 'Total Agents', value: String(Object.keys(AGENT_DEFINITIONS).length) },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{
              background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14,
              padding: '16px 18px',
            }}>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Geist Mono, monospace', fontWeight: 600, marginBottom: 8 }}>
                {label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: accent || 'var(--ink)', lineHeight: 1, fontFamily: 'Geist Mono, monospace' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Agent roster */}
        <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Roster header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Agent Roster</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {hasRunning && <Pulse color="var(--green)" />}
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono, monospace' }}>
                {Object.keys(AGENT_DEFINITIONS).length} agents
              </span>
            </div>
          </div>

          {/* Column labels */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', background: 'var(--paper-3)', borderBottom: '1px solid var(--line)' }}>
            <div style={{ width: 34, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Geist Mono, monospace' }}>Agent</div>
            <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Geist Mono, monospace', minWidth: 80 }}>Status</div>
            <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Geist Mono, monospace', minWidth: 60, textAlign: 'right' }}>Last run</div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--ink-3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                </path>
              </svg>
              <span style={{ fontSize: 13, fontFamily: 'Geist Mono, monospace' }}>Loading roster…</span>
            </div>
          ) : (
            DEPT_ORDER.map(deptKey => (
              <DeptSection key={deptKey} deptKey={deptKey} agents={agents} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
