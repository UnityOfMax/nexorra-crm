'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Clock, RefreshCw } from 'lucide-react';
import { AGENT_DEFINITIONS, DEPARTMENTS, type DepartmentKey } from '@/lib/agents/definitions';
import type { AgentConfig, LogEvent } from '../types';

// ─── Department colors ───
const DEPT_COLORS: Record<string, string> = {
  research: '#3b82f6',
  marketing: '#a855f7',
  client: '#22c55e',
  engineering: '#f97316',
  experiments: '#14b8a6',
  delivery: '#f59e0b',
  executive: '#ec4899',
};

function getDeptColor(dept: string): string {
  return DEPT_COLORS[dept] || DEPARTMENTS[dept as DepartmentKey]?.color || '#6b7280';
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Last Run Log Panel ───
function LastRunLogPanel({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/agents/logs?runId=${runId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setEvents(data.events || []);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLogs();
    return () => { cancelled = true; };
  }, [runId]);

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-[#111113]">
        <span className="text-[10px] font-mono text-gray-500">Last run log</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-[10px]">
          Close
        </button>
      </div>
      <div className="bg-[#0a0a0b] p-3 max-h-[200px] overflow-y-auto font-mono text-[11px] leading-relaxed">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-gray-600">No log data available.</p>
        ) : (
          events.slice(-30).map((event, i) => {
            if (event.type === 'assistant' && event.blocks) {
              return event.blocks.map((block, j) => {
                if (block.type === 'text') {
                  return <div key={`${i}-${j}`} className="text-[#22c55e]/60">{block.text}</div>;
                }
                if (block.type === 'tool_use') {
                  return (
                    <div key={`${i}-${j}`} className="text-blue-400/50">
                      <span className="text-gray-600">{'\u25B6'} </span>{block.tool}: {block.input}
                    </div>
                  );
                }
                return null;
              });
            }
            if (event.type === 'result') {
              return (
                <div key={i} className="text-amber-400/60 mt-1">
                  {event.result_text || 'Completed'}
                  {event.cost_usd != null && ` ($${event.cost_usd.toFixed(4)})`}
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    </div>
  );
}

// ─── Inactive Agent Card ───
function InactiveAgentCard({
  agentId,
  config,
  onRun,
}: {
  agentId: string;
  config: AgentConfig;
  onRun: (id: string) => void;
}) {
  const def = AGENT_DEFINITIONS[agentId];
  if (!def) return null;

  const run = config.latest_run;
  const color = getDeptColor(def.department);
  const dept = DEPARTMENTS[def.department as DepartmentKey];
  const [showLog, setShowLog] = useState(false);
  const isFailed = run?.status === 'failed';

  return (
    <div className="rounded-xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700/60 overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
      <div className="flex">
        {/* Muted left strip */}
        <div
          className="w-7 flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: color, opacity: 0.35 }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/70"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            {dept?.label?.split(' ')[0] || def.department}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate">
                {def.displayName}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  {run?.started_at ? formatTimeAgo(run.finished_at || run.started_at) : 'Never run'}
                </span>
                {run?.duration_seconds != null && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">{'\u00B7'}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                      {formatDuration(run.duration_seconds)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => onRun(agentId)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-colors flex-shrink-0"
            >
              <Play className="w-3 h-3" /> Start
            </button>
          </div>

          {/* Status + summary */}
          <div className="mt-2 flex items-center gap-2">
            {isFailed ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-medium">
                Failed
              </span>
            ) : run?.status === 'completed' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium">
                Completed
              </span>
            ) : null}
            {run?.summary && (
              <span className="text-[10px] text-gray-400 truncate">{run.summary}</span>
            )}
            {run?.error_message && isFailed && (
              <span className="text-[10px] text-red-400 truncate">{run.error_message}</span>
            )}
          </div>

          {/* Click for last run log */}
          {run && (
            <button
              onClick={() => setShowLog(!showLog)}
              className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showLog ? 'Hide log' : 'Show last log'}
            </button>
          )}

          {showLog && run && (
            <LastRunLogPanel runId={run.id} onClose={() => setShowLog(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function ClockedOut({
  agents,
  onRun,
}: {
  agents: AgentConfig[];
  onRun: (agentId: string) => void;
}) {
  // Filter to non-running agents, sorted by most recently active first
  const inactiveAgents = useMemo(() => {
    return agents
      .filter(a => a.latest_run?.status !== 'running')
      .sort((a, b) => {
        const aTime = a.latest_run?.started_at ? new Date(a.latest_run.started_at).getTime() : 0;
        const bTime = b.latest_run?.started_at ? new Date(b.latest_run.started_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [agents]);

  // Also show agents that have definitions but no config yet
  const agentIdsWithConfigs = new Set(agents.map(a => a.name || a.id));
  const unregisteredAgents = useMemo(() => {
    return Object.entries(AGENT_DEFINITIONS)
      .filter(([id]) => !agentIdsWithConfigs.has(id))
      .map(([id, def]) => ({ id, def }));
  }, [agentIdsWithConfigs]);

  if (inactiveAgents.length === 0 && unregisteredAgents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Everyone is working</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All agents are currently clocked in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {inactiveAgents.map(config => {
          const agentId = config.name || config.id;
          return (
            <InactiveAgentCard
              key={config.id}
              agentId={agentId}
              config={config}
              onRun={onRun}
            />
          );
        })}

        {/* Unregistered agents (in definitions but not in DB) */}
        {unregisteredAgents.map(({ id, def }) => {
          const color = getDeptColor(def.department);
          const dept = DEPARTMENTS[def.department as DepartmentKey];
          return (
            <div
              key={id}
              className="rounded-xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700/60 overflow-hidden opacity-50"
            >
              <div className="flex">
                <div
                  className="w-7 flex-shrink-0"
                  style={{ backgroundColor: color, opacity: 0.2 }}
                />
                <div className="flex-1 p-3">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{def.displayName}</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {dept?.label} {'\u00B7'} Not registered
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">{def.schedule || 'Manual'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
