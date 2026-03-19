'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, Square, Clock, Activity, TrendingUp, ChevronRight, X, RefreshCw } from 'lucide-react';
import { PANode } from './nodes/PANode';
import { DepartmentNode } from './nodes/DepartmentNode';
import { AgentNode } from './nodes/AgentNode';
import { OrgEdge } from './edges/OrgEdge';
import { buildOrgGraph } from './hooks/useOrgLayout';
import { AGENT_DEFINITIONS, DEPARTMENTS, type DepartmentKey } from '@/lib/agents/definitions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentRun {
  id: string;
  agent_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error_message: string | null;
}

interface AgentConfig {
  id: string;
  name: string;
  display_name: string | null;
  department: string | null;
  role: string | null;
  is_enabled: boolean;
  latest_run: AgentRun | null;
}

interface LogEvent {
  type: string;
  text?: string;
  content?: string;
  timestamp?: string;
}

// ─── Node Types ───────────────────────────────────────────────────────────────

const nodeTypes = {
  paNode: PANode,
  departmentNode: DepartmentNode,
  agentNode: AgentNode,
};

const edgeTypes = {
  orgEdge: OrgEdge,
};

// ─── Usage Bar ────────────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Daily</span>
        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor(dailyPct)}`} style={{ width: `${dailyPct}%` }} />
        </div>
        <span className="text-gray-600 dark:text-gray-300 font-mono">{dailyPct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">Weekly</span>
        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor(weeklyPct)}`} style={{ width: `${weeklyPct}%` }} />
        </div>
        <span className="text-gray-600 dark:text-gray-300 font-mono">{weeklyPct}%</span>
      </div>
    </div>
  );
}

// ─── Agent Detail Panel ───────────────────────────────────────────────────────

function AgentDetailPanel({
  agentId,
  agents,
  onClose,
  onRun,
  onStop,
}: {
  agentId: string;
  agents: AgentConfig[];
  onClose: () => void;
  onRun: (id: string) => void;
  onStop: (runId: string) => void;
}) {
  const def = AGENT_DEFINITIONS[agentId];
  const config = agents.find(a => a.id === agentId || a.name === agentId);
  const run = config?.latest_run;
  const isRunning = run?.status === 'running';
  const dept = def ? DEPARTMENTS[def.department as DepartmentKey] : null;

  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);

  // Fetch logs — append-only, never clear while running
  useEffect(() => {
    if (!run?.id) { setLogs([]); return; }

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/agents/runs?id=${run.id}&logs=true`);
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean);
        const parsed: LogEvent[] = [];
        for (const line of lines) {
          try { parsed.push(JSON.parse(line)); } catch { parsed.push({ type: 'text', text: line }); }
        }
        // Only append new events, never shrink
        if (parsed.length > prevLogCountRef.current) {
          setLogs(parsed);
          prevLogCountRef.current = parsed.length;
        }
      } catch {}
    };

    setLogLoading(true);
    fetchLogs().then(() => setLogLoading(false));

    if (isRunning) {
      const t = setInterval(fetchLogs, 2000);
      return () => clearInterval(t);
    }
  }, [run?.id, isRunning]);

  // Auto-scroll on new logs
  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  // Reset log count when agent changes
  useEffect(() => { prevLogCountRef.current = 0; }, [agentId]);

  if (!def) return null;

  return (
    <div className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111113] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: dept?.color || '#666' }}>
            {def.displayName[0]}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{def.displayName}</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{dept?.label} · {def.model}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/8 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        {isRunning ? (
          <button onClick={() => run && onStop(run.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors">
            <Square className="w-3 h-3" /> Stop
          </button>
        ) : (
          <button onClick={() => onRun(agentId)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition-colors">
            <Play className="w-3 h-3" /> Run
          </button>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ml-auto">
          <Clock className="w-3 h-3" />
          {run?.started_at ? new Date(run.started_at).toLocaleTimeString() : 'Never run'}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 text-xs space-y-1.5">
        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Schedule</span><span className="text-gray-900 dark:text-gray-100">{def.schedule || 'Manual'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Max turns</span><span className="text-gray-900 dark:text-gray-100">{def.maxTurns}</span></div>
        {def.skills && def.skills.length > 0 && (
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Skills</span><span className="text-gray-900 dark:text-gray-100">{def.skills.join(', ')}</span></div>
        )}
        {run?.status && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Status</span>
            <span className={`font-medium ${run.status === 'running' ? 'text-green-500' : run.status === 'failed' ? 'text-red-500' : 'text-blue-500'}`}>
              {run.status}
            </span>
          </div>
        )}
        {run?.duration_seconds != null && (
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Duration</span><span className="text-gray-900 dark:text-gray-100">{run.duration_seconds}s</span></div>
        )}
        {run?.input_tokens != null && (
          <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Tokens</span><span className="text-gray-900 dark:text-gray-100">{((run.input_tokens || 0) + (run.output_tokens || 0)).toLocaleString()}</span></div>
        )}
      </div>

      {/* Logs — always dark terminal style, append-only */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Logs</span>
          {isRunning && <span className="text-[10px] text-green-500 animate-pulse">LIVE</span>}
        </div>
        <div className="flex-1 overflow-y-auto bg-[#0a0a0b] p-3 font-mono text-xs">
          {logLoading && logs.length === 0 ? (
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Waiting for output...</span>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-gray-600">No logs yet. Run the agent to see output.</p>
          ) : (
            logs.map((event, i) => {
              const text = event.text || event.content || JSON.stringify(event);
              const isOld = i < logs.length - 5;
              return (
                <div key={i} className={`leading-relaxed ${isOld ? 'text-[#22c55e]/40' : 'text-[#22c55e]'}`}>
                  {text}
                </div>
              );
            })
          )}
          {isRunning && logs.length > 0 && (
            <span className="text-[#22c55e] animate-pulse">█</span>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Command Center V2 ──────────────────────────────────────────────────

export default function CommandCenterV2() {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildOrgGraph(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  const hasRunning = agents.some(a => a.latest_run?.status === 'running');

  useEffect(() => {
    fetchAgents();
    const t = setInterval(fetchAgents, hasRunning ? 3000 : 10000);
    return () => clearInterval(t);
  }, [fetchAgents, hasRunning]);

  // Update node statuses from agent data
  useEffect(() => {
    setNodes(prev => prev.map(node => {
      const config = agents.find(a => a.id === node.id || a.name === node.id);
      const status = config?.latest_run?.status || 'idle';
      if (node.data.status === status) return node;
      return { ...node, data: { ...node.data, status } };
    }));

    // Animate edges for running agents
    setEdges(prev => prev.map(edge => {
      const targetConfig = agents.find(a => a.id === edge.target || a.name === edge.target);
      const isTargetRunning = targetConfig?.latest_run?.status === 'running';
      if (edge.animated === isTargetRunning) return edge;
      return { ...edge, animated: isTargetRunning };
    }));
  }, [agents, setNodes, setEdges]);

  // Run / Stop
  const runAgent = async (agentId: string) => {
    await fetch('/api/agents/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    fetchAgents();
    setSelectedAgent(agentId);
  };

  const stopAgent = async (runId: string) => {
    await fetch(`/api/agents/runs?id=${runId}`, { method: 'DELETE' });
    fetchAgents();
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedAgent(node.id);
  }, []);

  const runningCount = agents.filter(a => a.latest_run?.status === 'running').length;
  const todayRuns = agents.filter(a => {
    const run = a.latest_run;
    if (!run) return false;
    const today = new Date().toDateString();
    return new Date(run.started_at).toDateString() === today;
  }).length;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-[#0d0d0e] border-b border-gray-200 dark:border-gray-800 rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
            <span className={`text-xs font-bold ${runningCount > 0 ? 'text-green-500' : 'text-gray-400'}`}>{runningCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{todayRuns}</span>
          </div>
        </div>
        <UsageBar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-800">
        {/* ReactFlow Canvas */}
        <div className="flex-1 bg-gray-50 dark:bg-[#0a0a0b]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              className="!bg-gray-50 dark:!bg-[#0a0a0b]"
              color="#d1d5db"
            />
            <Controls
              className="!bg-white dark:!bg-[#1a1a1c] !border-gray-200 dark:!border-gray-700 !shadow-sm [&>button]:!bg-white dark:[&>button]:!bg-[#1a1a1c] [&>button]:!border-gray-200 dark:[&>button]:!border-gray-700 [&>button]:!text-gray-600 dark:[&>button]:!text-gray-400"
            />
            <MiniMap
              className="!bg-white dark:!bg-[#1a1a1c] !border-gray-200 dark:!border-gray-700"
              nodeColor={(node) => {
                const dept = node.data?.department as DepartmentKey;
                return DEPARTMENTS[dept]?.color || '#888';
              }}
              maskColor="rgba(0,0,0,0.08)"
            />
          </ReactFlow>
        </div>

        {/* Detail Panel */}
        {selectedAgent && (
          <AgentDetailPanel
            agentId={selectedAgent}
            agents={agents}
            onClose={() => setSelectedAgent(null)}
            onRun={runAgent}
            onStop={stopAgent}
          />
        )}
      </div>
    </div>
  );
}
