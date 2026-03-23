'use client';

import { useState, useEffect, useRef } from 'react';
import { Square, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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

function getElapsedStr(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const totalSec = Math.floor(diff / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// ─── Live Log Panel ───
function LiveLogPanel({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchLogs, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [runId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-gray-800">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111113]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500">Terminal</span>
          <span className="text-[10px] text-green-500 animate-pulse">LIVE</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-[10px]">
          Close
        </button>
      </div>
      <div className="bg-[#0a0a0b] p-3 max-h-[240px] overflow-y-auto font-mono text-[11px] leading-relaxed">
        {loading && events.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-gray-600">Waiting for output...</p>
        ) : (
          events.map((event, i) => {
            const isRecent = i >= events.length - 5;
            if (event.type === 'assistant' && event.blocks) {
              return event.blocks.map((block, j) => {
                if (block.type === 'text') {
                  return (
                    <div key={`${i}-${j}`} className={`${isRecent ? 'text-[#22c55e]' : 'text-[#22c55e]/40'}`}>
                      {block.text}
                    </div>
                  );
                }
                if (block.type === 'tool_use') {
                  return (
                    <div key={`${i}-${j}`} className={`${isRecent ? 'text-blue-400' : 'text-blue-400/40'}`}>
                      <span className="text-gray-500">{'\u25B6'} </span>{block.tool}: {block.input}
                    </div>
                  );
                }
                return null;
              });
            }
            if (event.type === 'tool_results' && event.blocks) {
              return event.blocks.map((block, j) => (
                <div key={`${i}-${j}`} className={`${block.is_error ? 'text-red-400/70' : 'text-gray-500'} truncate`}>
                  {(block.output || '').slice(0, 120)}
                </div>
              ));
            }
            if (event.type === 'system') {
              return (
                <div key={i} className="text-gray-600">
                  [session started]
                </div>
              );
            }
            if (event.type === 'stderr') {
              return (
                <div key={i} className="text-yellow-500/60">
                  {event.text}
                </div>
              );
            }
            return null;
          })
        )}
        <span className="text-[#22c55e] animate-pulse">{'\u2588'}</span>
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

// ─── Running Agent Card ───
function RunningAgentCard({
  agentId,
  config,
  onStop,
}: {
  agentId: string;
  config: AgentConfig;
  onStop: (runId: string) => void;
}) {
  const def = AGENT_DEFINITIONS[agentId];
  if (!def) return null;

  const run = config.latest_run;
  const color = getDeptColor(def.department);
  const dept = DEPARTMENTS[def.department as DepartmentKey];
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(run?.started_at ? getElapsedStr(run.started_at) : '0s');

  // Tick the elapsed counter every second
  useEffect(() => {
    if (!run?.started_at) return;
    const t = setInterval(() => {
      setElapsed(getElapsedStr(run.started_at));
    }, 1000);
    return () => clearInterval(t);
  }, [run?.started_at]);

  return (
    <div className="rounded-xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex">
        {/* Colored left strip with vertical department name */}
        <div
          className="w-7 flex-shrink-0 flex items-center justify-center relative"
          style={{ backgroundColor: color }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/90"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            {dept?.label?.split(' ')[0] || def.department}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {def.displayName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {/* Animated pulse dot */}
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-green-500" />
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Working for <span className="font-mono font-medium text-gray-700 dark:text-gray-200">{elapsed}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {run && (
                <button
                  onClick={() => onStop(run.id)}
                  className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Square className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Model + max turns */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
            <span>{def.model}</span>
            <span>{'\u00B7'}</span>
            <span>{def.maxTurns} turns</span>
          </div>

          {/* Expanded: live logs */}
          {expanded && run && (
            <LiveLogPanel runId={run.id} onClose={() => setExpanded(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function ClockedIn({
  agents,
  onStop,
}: {
  agents: AgentConfig[];
  onStop: (runId: string) => void;
}) {
  // Also poll daemon directly for running agents (catches Telegram-spawned runs)
  const [daemonAgents, setDaemonAgents] = useState<Array<{ agentId: string; runId: string; uptime: number }>>([]);
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/agents/daemon-status');
        if (res.ok) {
          const data = await res.json();
          setDaemonAgents(data.agents || []);
        }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  // Merge: DB running agents + daemon running agents
  const dbRunning = agents.filter(a => a.latest_run?.status === 'running');
  const daemonOnlyIds = new Set(daemonAgents.map(a => a.agentId));
  // Remove IDs already in dbRunning
  for (const a of dbRunning) daemonOnlyIds.delete(a.id);

  // Create synthetic configs for daemon-only agents
  const syntheticAgents: AgentConfig[] = Array.from(daemonOnlyIds).map(id => {
    const daemon = daemonAgents.find(a => a.agentId === id);
    const def = AGENT_DEFINITIONS[id];
    return {
      id,
      name: def?.displayName || id,
      latest_run: {
        id: daemon?.runId || 'daemon',
        agent_id: id,
        status: 'running' as const,
        started_at: new Date(Date.now() - (daemon?.uptime || 0) * 1000).toISOString(),
      },
    } as AgentConfig;
  });

  const runningAgents = [...dbRunning, ...syntheticAgents];

  if (runningAgents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-[#2c2c2e] flex items-center justify-center mb-3">
            <span className="text-lg text-gray-400">Zzz</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All agents clocked out</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No agents currently running</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {runningAgents.map(config => {
          const agentId = config.name || config.id;
          return (
            <RunningAgentCard
              key={config.id}
              agentId={agentId}
              config={config}
              onStop={onStop}
            />
          );
        })}
      </div>
    </div>
  );
}
