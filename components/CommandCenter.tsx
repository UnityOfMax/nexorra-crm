'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Terminal, Play, Clock, Brain, ChevronDown, ChevronUp,
  RefreshCw, Power, PowerOff, Zap, Code, BarChart3,
  X, AlertTriangle, Radio, Send, FileText, Loader2,
  DollarSign, Hash, Wrench, MessageSquare, Eye, EyeOff,
  ChevronRight, Square, Bot, Activity, Cpu, Wifi,
  WifiOff, Database, Circle, TrendingUp, ChevronLeft,
  LayoutGrid, Monitor, Layers, Search,
} from 'lucide-react';
import { toast } from 'sonner';

// --- Types ---

interface AgentConfig {
  id: string;
  category: string;
  name: string;
  description: string | null;
  schedule: string | null;
  model: string;
  max_turns: number;
  is_enabled: boolean;
  prompt_file: string | null;
  cron_script: string | null;
  memory_file: string | null;
  latest_run: AgentRun | null;
  avg_duration: number;
}

interface AgentRun {
  id: string;
  agent_id: string;
  status: string;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  summary: string | null;
  error_message: string | null;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  num_turns: number | null;
  log_file: string | null;
}

interface LogEvent {
  type: string;
  subtype?: string;
  blocks?: ContentBlock[];
  text?: string;
  cost_usd?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  duration_ms?: number | null;
  num_turns?: number | null;
  is_error?: boolean;
  result_text?: string | null;
  model?: string;
  raw?: any;
}

interface ContentBlock {
  type: string;
  text?: string;
  tool?: string;
  tool_id?: string;
  input?: string;
  raw_input?: any;
  output?: string;
  is_error?: boolean;
  tool_use_id?: string;
}

interface SystemStatus {
  daemon: ServiceStatus;
  chrome: ServiceStatus;
  cloudflared: ServiceStatus;
  supabase: ServiceStatus;
  runsToday: number;
  activeCount: number;
  monthlyCost: number;
}

interface ServiceStatus {
  online: boolean;
  uptime?: string;
  label: string;
}

// --- Persona Config ---

type PersonaKey = 'jeff' | 'stacey' | 'barny' | 'ops' | 'shannon';

const PERSONAS: Record<PersonaKey, { label: string; icon: string; color: string; accent: string; description: string }> = {
  jeff: {
    label: 'Jeff',
    icon: '🔍',
    color: '#3b82f6',
    accent: 'border-blue-500/40',
    description: 'Lead Generation',
  },
  stacey: {
    label: 'Stacey',
    icon: '✉️',
    color: '#a855f7',
    accent: 'border-purple-500/40',
    description: 'Cold Email Outreach',
  },
  barny: {
    label: 'Barny',
    icon: '🛠️',
    color: '#f59e0b',
    accent: 'border-amber-500/40',
    description: 'Development',
  },
  ops: {
    label: 'Ops',
    icon: '📊',
    color: '#22c55e',
    accent: 'border-green-500/40',
    description: 'Operations & Client',
  },
  shannon: {
    label: 'Shannon',
    icon: '🤖',
    color: '#3b82f6',
    accent: 'border-blue-500/40',
    description: 'Orchestrator',
  },
};

const TABS: Array<{ key: string; label: string; icon: any }> = [
  { key: 'jeff', label: 'Jeff', icon: '🔍' },
  { key: 'stacey', label: 'Stacey', icon: '✉️' },
  { key: 'barny', label: 'Barny', icon: '🛠️' },
  { key: 'ops', label: 'Ops', icon: '📊' },
  { key: 'shannon', label: 'Shannon', icon: '🤖' },
];

// --- Formatters ---

function formatSchedule(schedule: string | null): string {
  if (!schedule) return 'Manual';
  if (schedule === 'webhook') return 'Webhook';
  if (schedule === '*/5 * * * *') return 'Every 5 min';
  if (schedule === '*/15 * * * *') return 'Every 15 min';
  const match = schedule.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
  if (match) {
    const hour = parseInt(match[2]);
    const min = match[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${h}:${min.padStart(2, '0')} ${ampm}`;
  }
  return schedule;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return '';
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens: number | null | undefined): string {
  if (tokens === null || tokens === undefined) return '';
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return String(tokens);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getPersonaKey(category: string): PersonaKey {
  if (category === 'jeff') return 'jeff';
  if (category === 'stacey' || category === 'nexorra') return 'stacey';
  if (category === 'barny' || category === 'dev') return 'barny';
  return 'ops';
}

function shortName(agent: AgentConfig): string {
  const parts = agent.name.split(' — ');
  return parts.length > 1 ? parts[1] : agent.name;
}

// --- Tool icon ---
function ToolIcon({ tool }: { tool: string }) {
  const cls = 'w-3 h-3 flex-shrink-0';
  switch (tool) {
    case 'Bash': return <Terminal className={`${cls} text-amber-400`} />;
    case 'Read': return <Eye className={`${cls} text-blue-400`} />;
    case 'Write': return <FileText className={`${cls} text-green-400`} />;
    case 'Edit': return <FileText className={`${cls} text-purple-400`} />;
    case 'Grep': return <Hash className={`${cls} text-pink-400`} />;
    case 'Glob': return <Hash className={`${cls} text-cyan-400`} />;
    default: return <Wrench className={`${cls} text-zinc-500`} />;
  }
}

// --- Elapsed timer ---
function useElapsed(startedAt: string | null, running: boolean): string {
  const [elapsed, setElapsed] = useState('0s');
  useEffect(() => {
    if (!startedAt || !running) {
      setElapsed('0s');
      return;
    }
    const tick = () => {
      const secs = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
      if (secs < 60) setElapsed(`${secs}s`);
      else {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        setElapsed(`${m}m ${s}s`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, running]);
  return elapsed;
}

// --- Live Log Viewer ---

function LiveLogViewer({ runId, isActive, maxHeight }: { runId: string; isActive: boolean; maxHeight?: string }) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [collapsedResults, setCollapsedResults] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/logs?runId=${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events || []);
      setIsComplete(data.isComplete);
    } catch { /* ignore */ }
  }, [runId]);

  useEffect(() => {
    fetchEvents();
    if (isActive) {
      pollRef.current = setInterval(fetchEvents, 2000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [fetchEvents, isActive]);

  useEffect(() => {
    if (scrollRef.current && isActive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isActive]);

  const toggleResult = (id: string) => {
    setCollapsedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (events.length === 0 && !isComplete) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-zinc-500 font-mono">
        <Loader2 className="w-3 h-3 animate-spin text-zinc-600" /> Awaiting output...
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={`overflow-y-auto space-y-0.5 ${maxHeight || 'max-h-96'}`} style={{ background: '#0a0a0a' }}>
      {events.map((event, i) => {
        if (event.type === 'system') return (
          <div key={i} className="text-[10px] text-[#22c55e]/40 font-mono py-0.5">// session init</div>
        );
        if (event.type === 'stderr') return (
          <div key={i} className="text-xs text-red-400 font-mono py-0.5 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="break-all">{event.text}</span>
          </div>
        );
        if (event.type === 'assistant' && event.blocks) return (
          <div key={i} className="space-y-0.5">
            {event.blocks.map((block, j) => {
              if (block.type === 'text' && block.text) return (
                <div key={j} className="flex items-start gap-1.5 py-0.5">
                  <MessageSquare className="w-3 h-3 text-zinc-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-[#22c55e] font-mono whitespace-pre-wrap line-clamp-4 hover:line-clamp-none cursor-pointer leading-relaxed">{block.text}</div>
                </div>
              );
              if (block.type === 'tool_use') return (
                <div key={j} className="flex items-start gap-1.5 py-0.5 pl-0.5">
                  <ToolIcon tool={block.tool || ''} />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-[#22c55e] font-mono">{block.tool}</span>
                    {block.input && (
                      <span className="text-[11px] text-[#22c55e]/40 font-mono ml-1.5 break-all">
                        {block.input.length > 120 ? block.input.slice(0, 120) + '…' : block.input}
                      </span>
                    )}
                  </div>
                </div>
              );
              return null;
            })}
          </div>
        );
        if (event.type === 'tool_results' && event.blocks) return (
          <div key={i} className="space-y-0.5">
            {event.blocks.map((block, j) => {
              const resultId = `${i}-${j}`;
              const isCollapsed = !collapsedResults.has(resultId);
              const output = block.output || '';
              return (
                <div key={j} className="pl-4">
                  <button
                    onClick={() => output.length > 0 && toggleResult(resultId)}
                    className={`flex items-center gap-1 text-[10px] font-mono ${block.is_error ? 'text-red-400' : 'text-green-500/70'} ${output.length > 0 ? 'cursor-pointer hover:underline' : ''}`}
                  >
                    {output.length > 0 && <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />}
                    {block.is_error ? '✗ error' : '✓ ok'}
                    {output.length > 0 && ` (${output.split('\n').length} lines)`}
                  </button>
                  {!isCollapsed && output.length > 0 && (
                    <pre className="mt-0.5 text-[10px] text-zinc-500 font-mono whitespace-pre-wrap max-h-28 overflow-y-auto bg-black/60 rounded p-1.5 break-all border border-white/5">{output.slice(0, 2000)}</pre>
                  )}
                </div>
              );
            })}
          </div>
        );
        if (event.type === 'result') return (
          <div key={i} className={`flex items-center gap-3 py-2 mt-1 border-t text-[11px] font-mono font-medium ${event.is_error ? 'text-red-400 border-red-900/40' : 'text-green-400 border-green-900/30'}`}>
            <span>{event.is_error ? '✗ failed' : '✓ complete'}</span>
            {event.cost_usd != null && <span className="text-zinc-500">${event.cost_usd.toFixed(4)}</span>}
            {(event.input_tokens || event.output_tokens) && <span className="text-zinc-600">{formatTokens(event.input_tokens)}↑ {formatTokens(event.output_tokens)}↓</span>}
            {event.num_turns != null && <span className="text-zinc-600">{event.num_turns} turns</span>}
          </div>
        );
        return null;
      })}
      {!isComplete && isActive && (
        <div className="py-1 text-[10px] font-mono text-[#22c55e]">
          <span className="animate-pulse">█</span>
        </div>
      )}
    </div>
  );
}

// --- System Status Bar ---

function SystemStatusBar({ agents }: { agents: AgentConfig[] }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const activeCount = agents.filter(a => a.latest_run?.status === 'running').length;

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) setStatus(await res.json());
      } catch { /* graceful */ }
    };
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => clearInterval(id);
  }, []);

  const services = [
    { key: 'daemon', label: 'Daemon', online: status?.daemon?.online },
    { key: 'chrome', label: 'Chrome', online: status?.chrome?.online },
    { key: 'cloudflared', label: 'Tunnel', online: status?.cloudflared?.online },
    { key: 'supabase', label: 'Supabase', online: status?.supabase?.online },
  ];

  return (
    <div className="flex items-center gap-0 overflow-x-auto bg-gray-50 dark:bg-[#0d0d0e] border-b border-gray-200 dark:border-white/5">
      {/* Left: brand */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-r border-gray-200 dark:border-white/5 shrink-0">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[11px] font-semibold tracking-widest uppercase text-zinc-300 font-mono">Mission Control</span>
      </div>

      {/* Services */}
      {services.map((svc) => (
        <div
          key={svc.key}
          className="flex items-center gap-2 px-4 py-2.5 border-r border-gray-200 dark:border-white/5 shrink-0"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              svc.online === undefined ? 'bg-zinc-600' :
              svc.online ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={svc.online ? { boxShadow: '0 0 6px #22c55e' } : {}}
          />
          <span className="text-[11px] text-zinc-400 font-mono">{svc.label}</span>
          <span className={`text-[10px] font-mono ${
            svc.online === undefined ? 'text-zinc-700' :
            svc.online ? 'text-green-500/70' : 'text-red-500/70'
          }`}>
            {svc.online === undefined ? 'unknown' : svc.online ? 'online' : 'offline'}
          </span>
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: vitals */}
      <div className="flex items-center gap-0 shrink-0">
        <div className="flex items-center gap-2 px-4 py-2.5 border-l border-gray-200 dark:border-white/5">
          <Activity className="w-3 h-3 text-zinc-600" />
          <span className="text-[11px] font-mono text-zinc-400">Active</span>
          <span className={`text-[11px] font-mono font-semibold ${activeCount > 0 ? 'text-green-400' : 'text-zinc-600'}`}>{activeCount}</span>
        </div>
        {status?.runsToday !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-l border-gray-200 dark:border-white/5">
            <TrendingUp className="w-3 h-3 text-zinc-600" />
            <span className="text-[11px] font-mono text-zinc-400">Runs today</span>
            <span className="text-[11px] font-mono font-semibold text-zinc-300">{status.runsToday}</span>
          </div>
        )}
        {status?.monthlyCost !== undefined && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-l border-gray-200 dark:border-white/5">
            <DollarSign className="w-3 h-3 text-zinc-600" />
            <span className="text-[11px] font-mono text-zinc-400">Month</span>
            <span className="text-[11px] font-mono font-semibold text-zinc-300">${status.monthlyCost.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Active Agent Card (large, prominent) ---

function ActiveAgentCard({
  agent,
  onStop,
  onViewLogs,
  showLogs,
}: {
  agent: AgentConfig;
  onStop: () => void;
  onViewLogs: () => void;
  showLogs: boolean;
}) {
  const run = agent.latest_run!;
  const elapsed = useElapsed(run.started_at, true);

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-white dark:bg-[#111113]"
      style={{
        border: '1px solid rgba(34, 197, 94, 0.25)',
        boxShadow: '0 0 24px rgba(34, 197, 94, 0.06), inset 0 0 0 1px rgba(34, 197, 94, 0.08)',
      }}
    >
      {/* Green glow top edge */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #22c55e60, transparent)' }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                {PERSONAS[getPersonaKey(agent.category)].icon}
              </div>
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500"
                style={{ boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{shortName(agent)}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>RUNNING</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">{agent.description || agent.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-lg font-mono font-bold text-green-400">{elapsed}</span>
          </div>
        </div>

        {/* Live mini-log preview */}
        <div
          className="rounded-lg p-2.5 mb-3 font-mono text-[10px] leading-relaxed overflow-hidden"
          style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.04)', maxHeight: 60 }}
        >
          <LiveLogPreview runId={run.id} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <Square className="w-3 h-3" /> Stop
          </button>
          <button
            onClick={onViewLogs}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${showLogs ? 'text-blue-300' : 'text-zinc-400'}`}
            style={{
              background: showLogs ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
              border: showLogs ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Eye className="w-3 h-3" /> {showLogs ? 'Hide logs' : 'Live logs'}
          </button>
        </div>

        {/* Expanded log viewer */}
        {showLogs && (
          <div
            className="mt-3 rounded-lg p-3"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <LiveLogViewer runId={run.id} isActive={true} maxHeight="max-h-64" />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Live log preview (last 2 lines) ---
function LiveLogPreview({ runId }: { runId: string }) {
  const [lastLines, setLastLines] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/logs?runId=${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      const events: LogEvent[] = data.events || [];
      const lines: string[] = [];
      for (let i = events.length - 1; i >= 0 && lines.length < 2; i--) {
        const ev = events[i];
        if (ev.type === 'assistant' && ev.blocks) {
          for (let j = ev.blocks.length - 1; j >= 0 && lines.length < 2; j--) {
            const b = ev.blocks[j];
            if (b.type === 'tool_use') {
              lines.unshift(`  ${b.tool} ${(b.input || '').slice(0, 60)}`);
            } else if (b.type === 'text' && b.text) {
              lines.unshift(`> ${b.text.slice(0, 80).replace(/\n/g, ' ')}`);
            }
          }
        }
      }
      setLastLines(lines.length > 0 ? lines : ['…']);
    } catch { /* ignore */ }
  }, [runId]);

  useEffect(() => {
    fetch_();
    pollRef.current = setInterval(fetch_, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetch_]);

  return (
    <>
      {lastLines.map((l, i) => (
        <div key={i} className={`truncate ${i === lastLines.length - 1 ? 'text-zinc-300' : 'text-zinc-600'}`}>{l}</div>
      ))}
    </>
  );
}

// --- Idle panel ---
function AllIdlePanel() {
  return (
    <div
      className="rounded-xl flex items-center justify-center py-8 bg-gray-50 dark:bg-[#111113]"
      style={{ border: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center gap-3 text-zinc-600">
        <span className="w-2 h-2 rounded-full bg-zinc-700 animate-pulse" style={{ animationDuration: '3s' }} />
        <span className="text-sm font-mono">All systems idle</span>
      </div>
    </div>
  );
}

// --- Agent Card (grid) ---

function AgentCard({
  agent,
  onToggle,
  onTrigger,
  onStop,
  onViewLogs,
  onViewHistory,
  onViewMemory,
  isTriggering,
  showLogs,
  expanded,
  runHistory,
  logModal,
}: {
  agent: AgentConfig;
  onToggle: () => void;
  onTrigger: () => void;
  onStop: () => void;
  onViewLogs: () => void;
  onViewHistory: () => void;
  onViewMemory: () => void;
  isTriggering: boolean;
  showLogs: boolean;
  expanded: boolean;
  runHistory: AgentRun[];
  logModal: (runId: string, title: string) => void;
}) {
  const run = agent.latest_run;
  const isRunning = run?.status === 'running';
  const isFailed = run?.status === 'failed';
  const webhook = agent.schedule === 'webhook';
  const persona = PERSONAS[getPersonaKey(agent.category)];

  // Left accent bar color
  const accentColor = !agent.is_enabled
    ? '#3f3f46'
    : isRunning
    ? '#22c55e'
    : isFailed
    ? '#ef4444'
    : webhook || run?.status === 'completed'
    ? '#3b82f6'
    : '#3f3f46';

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex bg-white dark:bg-[#111113] border border-gray-200 dark:border-white/5 ${isRunning ? 'cc-scan-overlay' : ''}`}
      style={{
        boxShadow: isRunning ? '0 0 16px rgba(34,197,94,0.08)' : 'none',
        ...(isRunning ? { borderColor: 'rgba(34,197,94,0.3)' } : {}),
      }}
    >
      {isRunning && <div className="absolute top-0 left-0 right-0 h-px cc-shimmer-line" />}
      {/* Left accent bar */}
      <div className="w-0.5 shrink-0 rounded-l-full" style={{ background: accentColor, opacity: agent.is_enabled ? 1 : 0.4 }} />

      <div className="flex-1 p-3 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" style={{ boxShadow: '0 0 5px #22c55e', animation: 'pulse 2s infinite' }} />
              )}
              <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate">{shortName(agent)}</span>
            </div>
            {agent.description && (
              <p className="text-[11px] text-zinc-600 truncate">{agent.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {formatSchedule(agent.schedule)}
            </span>
            {agent.schedule && (
              <button
                onClick={onToggle}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                style={{
                  color: agent.is_enabled ? '#22c55e' : '#52525b',
                  background: agent.is_enabled ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                }}
                title={agent.is_enabled ? 'Disable' : 'Enable'}
              >
                {agent.is_enabled ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center gap-3 mb-2">
          {run?.started_at && (
            <span className="text-[10px] text-zinc-600 font-mono">{timeAgo(run.started_at)}</span>
          )}
          {run?.duration_seconds != null && !isRunning && (
            <span className="text-[10px] text-zinc-600 font-mono">{formatDuration(run.duration_seconds)}</span>
          )}
          {run?.cost_usd != null && (
            <span className="text-[10px] text-zinc-600 font-mono">${run.cost_usd.toFixed(4)}</span>
          )}
          {run?.status === 'failed' && (
            <span className="text-[10px] text-red-500 font-mono">failed</span>
          )}
          {run?.status === 'completed' && !isRunning && (
            <span className="text-[10px] text-green-600 font-mono">ok</span>
          )}
        </div>

        {/* Error */}
        {isFailed && run?.error_message && (
          <div
            className="flex items-start gap-1.5 p-1.5 mb-2 rounded text-[10px] text-red-400 font-mono"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
          >
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{run.error_message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t flex-wrap" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {agent.prompt_file && !isRunning && (
            <button
              onClick={onTrigger}
              disabled={isTriggering || !agent.is_enabled}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              {isTriggering ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
              Run
            </button>
          )}
          {isRunning && (
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <Square className="w-2.5 h-2.5" /> Stop
            </button>
          )}
          {run?.id && (
            <button
              onClick={onViewLogs}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all"
              style={{
                background: showLogs ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                color: showLogs ? '#60a5fa' : '#71717a',
                border: `1px solid ${showLogs ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <Eye className="w-2.5 h-2.5" />
              Logs
            </button>
          )}
          <button
            onClick={onViewHistory}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', color: '#71717a', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            History
          </button>
          {agent.memory_file && (
            <button
              onClick={onViewMemory}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', color: '#71717a', border: '1px solid rgba(255,255,255,0.06)' }}
              title="View memory"
            >
              <Brain className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Inline logs */}
        {showLogs && run?.id && (
          <div
            className="mt-2.5 rounded-lg p-2.5"
            style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <LiveLogViewer runId={run.id} isActive={isRunning} maxHeight="max-h-48" />
          </div>
        )}

        {/* History */}
        {expanded && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {runHistory.length === 0 ? (
              <p className="text-[10px] text-zinc-700 font-mono py-1">no history</p>
            ) : (
              <div className="space-y-0.5">
                {runHistory.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center gap-2.5 text-[10px] text-zinc-600 font-mono py-0.5">
                    <span className={`${r.status === 'completed' ? 'text-green-500' : r.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                      {r.status === 'completed' ? '✓' : r.status === 'failed' ? '✗' : '~'}
                    </span>
                    <span>{new Date(r.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span>{formatDuration(r.duration_seconds)}</span>
                    {r.cost_usd != null && <span>{formatCost(r.cost_usd)}</span>}
                    <button
                      onClick={() => logModal(r.id, `${agent.name} — ${new Date(r.started_at).toLocaleString()}`)}
                      className="ml-auto text-blue-500 hover:underline"
                    >
                      view
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Log Viewer Modal ---

function LogViewerModal({ runId, title, onClose }: { runId: string; title: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-4xl w-full mx-4 flex flex-col"
        style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '85vh', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Run Logs</h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#71717a', background: 'rgba(255,255,255,0.04)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <LiveLogViewer runId={runId} isActive={false} maxHeight="max-h-none" />
        </div>
      </div>
    </div>
  );
}

// --- Shannon Panel ---

interface ChatMessage {
  role: 'user' | 'shannon';
  text: string;
  timestamp: Date;
  runId?: string;
  run?: AgentRun;
  status?: string;
}

function ShannonPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pollForStatus = useCallback((runId: string, userText: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/agents/chat?runId=${runId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.run?.status === 'completed' || data.run?.status === 'failed') {
          stopPolling();
          setSending(false);
          setActiveRunId(null);
          setMessages(prev => [...prev, {
            role: 'shannon',
            text: data.run.status === 'completed' ? 'Done.' : 'Failed.',
            timestamp: new Date(),
            runId,
            run: data.run,
            status: data.run.status,
          }]);
          setExpandedRun(runId);
          setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }, 50);
        }
      } catch { /* ignore */ }
    }, 3000);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', text, timestamp: new Date() }]);
    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRunId(data.runId);
        setExpandedRun(data.runId);
        toast.success('Shannon is working on it');
        pollForStatus(data.runId, text);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send');
        setSending(false);
        setMessages(prev => [...prev, { role: 'shannon', text: 'Error: ' + (err.error || 'Failed'), timestamp: new Date() }]);
      }
    } catch {
      toast.error('Failed to send');
      setSending(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: '#0f0f11', borderLeft: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 0 16px rgba(59,130,246,0.3)' }}
        >
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">Shannon</span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded tracking-wider"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              ORCHESTRATOR
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 4px #22c55e' }} />
            <span className="text-[10px] text-zinc-500">available</span>
          </div>
        </div>
        {sending && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span className="text-[10px] text-blue-400 font-mono">working…</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
            >
              <MessageSquare className="w-5 h-5 text-blue-500/50" />
            </div>
            <p className="text-[12px] text-zinc-700 text-center font-mono leading-relaxed">
              Ask Shannon to run an agent,<br />review the pipeline, or analyze data.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed"
                style={
                  msg.role === 'user'
                    ? { background: 'rgba(59,130,246,0.18)', color: '#bfdbfe', border: '1px solid rgba(59,130,246,0.2)' }
                    : { background: 'rgba(255,255,255,0.05)', color: '#d4d4d8', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {msg.text}
              </div>
            </div>
            {/* Run stats for shannon messages */}
            {msg.role === 'shannon' && msg.run && (
              <div className="mt-1 ml-0">
                <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono mb-1">
                  <span className={msg.status === 'completed' ? 'text-green-500' : 'text-red-500'}>{msg.status}</span>
                  {msg.run.cost_usd != null && <span>${msg.run.cost_usd.toFixed(4)}</span>}
                  {msg.run.duration_seconds != null && <span>{formatDuration(msg.run.duration_seconds)}</span>}
                  {msg.runId && (
                    <button
                      onClick={() => setExpandedRun(expandedRun === msg.runId ? null : msg.runId!)}
                      className="flex items-center gap-0.5 text-blue-500 hover:underline ml-auto"
                    >
                      <ChevronRight className={`w-2.5 h-2.5 transition-transform ${expandedRun === msg.runId ? 'rotate-90' : ''}`} />
                      {expandedRun === msg.runId ? 'hide' : 'show'} logs
                    </button>
                  )}
                </div>
                {expandedRun === msg.runId && msg.runId && (
                  <div
                    className="rounded-lg p-2.5 mt-1"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <LiveLogViewer runId={msg.runId} isActive={false} maxHeight="max-h-64" />
                  </div>
                )}
              </div>
            )}
            {/* Active run logs */}
            {msg.role === 'user' && activeRunId && i === messages.length - 1 && (
              <div className="mt-2">
                <div
                  className="rounded-lg p-2.5"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <LiveLogViewer runId={activeRunId} isActive={true} maxHeight="max-h-64" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 shrink-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div
          className="flex items-end gap-2 rounded-xl p-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask Shannon…"
            disabled={sending}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-700 resize-none outline-none leading-relaxed font-mono disabled:opacity-50"
            style={{ maxHeight: 100 }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'rgba(59,130,246,0.8)', color: 'white' }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-zinc-800 font-mono text-center mt-1.5">shift+enter for newline</p>
      </div>
    </div>
  );
}

// --- Main Command Center ---

export default function CommandCenter() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [activeTab, setActiveTab] = useState<PersonaKey>('jeff');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<Record<string, AgentRun[]>>({});
  const [memoryModal, setMemoryModal] = useState<{ agentId: string; file: string; content: string } | null>(null);
  const [logModal, setLogModal] = useState<{ runId: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringAgent, setTriggeringAgent] = useState<string | null>(null);
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);
  const [agentModes, setAgentModes] = useState<Record<string, 'email' | 'both' | 'instagram'>>({});

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll faster (3s) when agents are running, slower (10s) when idle
  const hasRunning = agents.some(a => a.latest_run?.status === 'running');
  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, hasRunning ? 3000 : 10000);
    return () => clearInterval(interval);
  }, [fetchAgents, hasRunning]);

  const toggleAgent = async (agentId: string, currentEnabled: boolean) => {
    const res = await fetch(`/api/agents?id=${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: !currentEnabled }),
    });
    if (res.ok) {
      toast.success(`Agent ${!currentEnabled ? 'enabled' : 'disabled'}`);
      fetchAgents();
    }
  };

  const triggerRun = async (agentId: string) => {
    setTriggeringAgent(agentId);
    try {
      const res = await fetch('/api/agents/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      if (res.ok) {
        toast.success('Agent triggered');
        setViewingLogs(agentId);
        fetchAgents();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed');
      }
    } catch {
      toast.error('Failed');
    } finally {
      setTriggeringAgent(null);
    }
  };

  const stopRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/agents/runs?id=${runId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Agent stopped');
        fetchAgents();
      } else {
        toast.error('Failed to stop');
      }
    } catch {
      toast.error('Failed to stop');
    }
  };

  const loadHistory = async (agentId: string) => {
    if (expandedAgent === agentId) { setExpandedAgent(null); return; }
    setExpandedAgent(agentId);
    const res = await fetch(`/api/agents/runs?agentId=${agentId}&limit=10`);
    if (res.ok) {
      const data = await res.json();
      setRunHistory(prev => ({ ...prev, [agentId]: data.runs || [] }));
    }
  };

  const loadMemory = async (agentId: string, file: string) => {
    const res = await fetch(`/api/agents/memory?file=${encodeURIComponent(file)}`);
    if (res.ok) {
      const data = await res.json();
      setMemoryModal({ agentId, file, content: data.content || 'Empty' });
    }
  };

  const setAgentMode = async (personaId: 'jeff' | 'stacey', mode: 'email' | 'both' | 'instagram') => {
    setAgentModes(prev => ({ ...prev, [personaId]: mode }));
    try {
      await fetch('/api/agents/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: personaId, mode }),
      });
    } catch { /* graceful — endpoint may not exist */ }
  };

  const nonShannon = agents.filter(a => a.id !== 'shannon');
  const runningAgents = nonShannon.filter(a => a.latest_run?.status === 'running');

  const grouped: Record<PersonaKey, AgentConfig[]> = { jeff: [], stacey: [], barny: [], ops: [], shannon: [] };
  for (const agent of nonShannon) {
    const key = getPersonaKey(agent.category);
    grouped[key].push(agent);
  }

  const renderCard = (agent: AgentConfig) => (
    <AgentCard
      key={agent.id}
      agent={agent}
      onToggle={() => toggleAgent(agent.id, agent.is_enabled)}
      onTrigger={() => triggerRun(agent.id)}
      onStop={() => agent.latest_run && stopRun(agent.latest_run.id)}
      onViewLogs={() => setViewingLogs(viewingLogs === agent.id ? null : agent.id)}
      onViewHistory={() => loadHistory(agent.id)}
      onViewMemory={() => agent.memory_file && loadMemory(agent.id, agent.memory_file)}
      isTriggering={triggeringAgent === agent.id}
      showLogs={viewingLogs === agent.id}
      expanded={expandedAgent === agent.id}
      runHistory={runHistory[agent.id] || []}
      logModal={(runId, title) => setLogModal({ runId, title })}
    />
  );

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-white dark:bg-[#0a0a0b]"
        style={{ height: '100%' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          <span className="text-[11px] text-zinc-600 font-mono tracking-wider">INITIALIZING</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0a0a0b] cc-dot-grid">
      {/* Status Bar */}
      <SystemStatusBar agents={nonShannon} />

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {activeTab === 'shannon' ? (
          <div className="flex-1 overflow-hidden">
            <ShannonPanel />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Active Agents Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-600">Active Now</span>
                    {runningAgents.length > 0 && (
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}
                      >
                        {runningAgents.length} running
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setLoading(true); fetchAgents(); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-colors"
                    style={{ color: '#52525b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {runningAgents.length === 0 ? (
                  <AllIdlePanel />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {runningAgents.map(agent => (
                      <ActiveAgentCard
                        key={agent.id}
                        agent={agent}
                        onStop={() => agent.latest_run && stopRun(agent.latest_run.id)}
                        onViewLogs={() => setViewingLogs(viewingLogs === agent.id ? null : agent.id)}
                        showLogs={viewingLogs === agent.id}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Agent Grid */}
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-600 block mb-3">Agent Roster</span>

                {/* Tabs */}
                <div
                  className="flex items-center gap-1 p-1 rounded-xl mb-4 inline-flex"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {TABS.map(tab => {
                    const isActive = activeTab === tab.key;
                    const isShannon = tab.key === 'shannon';
                    const tabRunning = isShannon ? 0 : (grouped[tab.key as PersonaKey] || []).filter(a => a.latest_run?.status === 'running').length;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as PersonaKey)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                          color: isActive ? '#f4f4f5' : '#71717a',
                          border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                        }}
                      >
                        <span className="text-[13px]">{tab.icon}</span>
                        <span>{tab.label}</span>
                        {!isShannon && (
                          <span
                            className="text-[9px] font-mono"
                            style={{ color: isActive ? '#71717a' : '#3f3f46' }}
                          >
                            {(grouped[tab.key as PersonaKey] || []).length}
                          </span>
                        )}
                        {tabRunning > 0 && (
                          <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500"
                            style={{ boxShadow: '0 0 6px #22c55e' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Mode toggle for jeff/stacey */}
                {(activeTab === 'jeff' || activeTab === 'stacey') && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] text-zinc-600 font-mono">Mode</span>
                    <div
                      className="flex items-center rounded-lg p-0.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {(['email', 'both', 'instagram'] as const).map(mode => {
                        const isSelected = (agentModes[activeTab] || 'email') === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => setAgentMode(activeTab as 'jeff' | 'stacey', mode)}
                            className="px-3 py-1 rounded-md text-[11px] font-semibold transition-all capitalize font-mono"
                            style={{
                              background: isSelected ? 'rgba(59,130,246,0.2)' : 'transparent',
                              color: isSelected ? '#60a5fa' : '#52525b',
                              border: isSelected ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                            }}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Agent cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {(grouped[activeTab] || []).map(agent => renderCard(agent))}
                  {(grouped[activeTab] || []).length === 0 && (
                    <div
                      className="col-span-full rounded-xl py-8 flex items-center justify-center text-[12px] text-zinc-700 font-mono"
                      style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      no agents in this group
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Memory modal */}
      {memoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setMemoryModal(null)}
        >
          <div
            className="rounded-2xl max-w-2xl w-full mx-4 flex flex-col"
            style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', maxHeight: '80vh', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <h3 className="font-semibold text-zinc-100 text-sm">Agent Memory</h3>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{memoryModal.file}</p>
              </div>
              <button
                onClick={() => setMemoryModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: '#71717a', background: 'rgba(255,255,255,0.04)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap text-[12px] text-zinc-300 font-mono leading-relaxed">{memoryModal.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Log viewer modal */}
      {logModal && (
        <LogViewerModal runId={logModal.runId} title={logModal.title} onClose={() => setLogModal(null)} />
      )}
    </div>
  );
}
