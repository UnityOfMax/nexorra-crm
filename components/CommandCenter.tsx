'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Terminal, Play, Clock, Brain, ChevronDown, ChevronUp,
  RefreshCw, Power, PowerOff, Zap, Users, Code, BarChart3,
  X, AlertTriangle, Radio, Send, FileText, Loader2,
  DollarSign, Hash, Wrench, MessageSquare, Eye, EyeOff,
  ChevronRight, ArrowRight, Square, StopCircle, Search, Bot,
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

// --- Persona Config ---

type PersonaKey = 'jeff' | 'stacey' | 'barny' | 'ops';

const PERSONAS: Record<PersonaKey, { label: string; icon: string; gradient: string; description: string }> = {
  jeff: { label: 'Jeff', icon: '🔍', gradient: 'from-blue-500 to-cyan-500', description: 'Lead Generation' },
  stacey: { label: 'Stacey', icon: '✉️', gradient: 'from-purple-500 to-pink-500', description: 'Cold Email Outreach' },
  barny: { label: 'Barny', icon: '🛠️', gradient: 'from-amber-500 to-orange-500', description: 'Development' },
  ops: { label: 'Ops', icon: '📊', gradient: 'from-green-500 to-emerald-500', description: 'Operations & Client' },
};

const TABS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'jeff', label: 'Jeff' },
  { key: 'stacey', label: 'Stacey' },
  { key: 'barny', label: 'Barny' },
  { key: 'ops', label: 'Ops' },
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

function categoryColor(category: string): string {
  switch (category) {
    case 'jeff': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'stacey': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'barny': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'ops': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'client': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'nexorra': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'dev': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

// Map any category to a persona key for grouping
function getPersonaKey(category: string): PersonaKey {
  if (category === 'jeff') return 'jeff';
  if (category === 'stacey' || category === 'nexorra') return 'stacey';
  if (category === 'barny' || category === 'dev') return 'barny';
  return 'ops'; // ops, client, anything else
}

// Short display name: strip persona prefix (e.g. "Stacey — Upload" -> "Upload")
function shortName(agent: AgentConfig): string {
  const parts = agent.name.split(' — ');
  return parts.length > 1 ? parts[1] : agent.name;
}

// --- Tool icon for log events ---
function ToolIcon({ tool }: { tool: string }) {
  const cls = 'w-3.5 h-3.5 flex-shrink-0';
  switch (tool) {
    case 'Bash': return <Terminal className={`${cls} text-amber-500`} />;
    case 'Read': return <Eye className={`${cls} text-blue-500`} />;
    case 'Write': return <FileText className={`${cls} text-green-500`} />;
    case 'Edit': return <FileText className={`${cls} text-purple-500`} />;
    case 'Grep': return <Hash className={`${cls} text-pink-500`} />;
    case 'Glob': return <Hash className={`${cls} text-cyan-500`} />;
    default: return <Wrench className={`${cls} text-gray-500`} />;
  }
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
      <div className="flex items-center gap-2 py-4 text-xs text-gray-500 dark:text-gray-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for output...
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={`overflow-y-auto space-y-1 ${maxHeight || 'max-h-96'}`}>
      {events.map((event, i) => {
        if (event.type === 'system') return (
          <div key={i} className="text-[10px] text-gray-400 dark:text-gray-600 font-mono py-0.5">Session started</div>
        );
        if (event.type === 'stderr') return (
          <div key={i} className="text-xs text-red-500 dark:text-red-400 font-mono py-0.5 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span className="break-all">{event.text}</span>
          </div>
        );
        if (event.type === 'assistant' && event.blocks) return (
          <div key={i} className="space-y-1">
            {event.blocks.map((block, j) => {
              if (block.type === 'text' && block.text) return (
                <div key={j} className="flex items-start gap-1.5 py-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap line-clamp-4 hover:line-clamp-none cursor-pointer">{block.text}</div>
                </div>
              );
              if (block.type === 'tool_use') return (
                <div key={j} className="flex items-start gap-1.5 py-0.5 pl-0.5">
                  <ToolIcon tool={block.tool || ''} />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{block.tool}</span>
                    {block.input && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-1.5 break-all">
                        {block.input.length > 120 ? block.input.slice(0, 120) + '...' : block.input}
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
                <div key={j} className="pl-5">
                  <button
                    onClick={() => output.length > 0 && toggleResult(resultId)}
                    className={`flex items-center gap-1 text-[10px] ${block.is_error ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-500'} ${output.length > 0 ? 'cursor-pointer hover:underline' : ''}`}
                  >
                    {output.length > 0 && <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />}
                    {block.is_error ? 'Error' : 'OK'}
                    {output.length > 0 && ` (${output.split('\n').length} lines)`}
                  </button>
                  {!isCollapsed && output.length > 0 && (
                    <pre className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-500 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-50 dark:bg-[#1c1c1e] rounded p-1.5 break-all">{output.slice(0, 2000)}</pre>
                  )}
                </div>
              );
            })}
          </div>
        );
        if (event.type === 'result') return (
          <div key={i} className={`flex items-center gap-3 py-2 mt-1 border-t text-xs font-medium ${event.is_error ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30' : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30'}`}>
            <span>{event.is_error ? 'Failed' : 'Completed'}</span>
            {event.cost_usd != null && <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3" />{event.cost_usd.toFixed(4)}</span>}
            {(event.input_tokens || event.output_tokens) && <span className="text-gray-500 dark:text-gray-400">{formatTokens(event.input_tokens)}in / {formatTokens(event.output_tokens)}out</span>}
            {event.num_turns != null && <span className="text-gray-500 dark:text-gray-400">{event.num_turns} turns</span>}
          </div>
        );
        return null;
      })}
      {!isComplete && isActive && (
        <div className="flex items-center gap-2 py-1 text-[10px] text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Running...</div>
      )}
    </div>
  );
}

// --- Shannon Chat Section ---

function ShannonChat() {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
  const [history, setHistory] = useState<Array<{ prompt: string; runId: string; status: string; run?: AgentRun }>>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const pollForStatus = useCallback((runId: string, promptText: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/agents/chat?runId=${runId}`);
        if (!res.ok) return;
        const data = await res.json();
        setActiveRun(data.run);
        if (data.run?.status === 'completed' || data.run?.status === 'failed') {
          stopPolling();
          setSending(false);
          setHistory(prev => [...prev, { prompt: promptText, runId, status: data.run.status, run: data.run }]);
          setExpandedRun(runId);
          setActiveRunId(null);
          setActiveRun(null);
        }
      } catch { /* ignore */ }
    }, 3000);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const sendPrompt = async () => {
    if (!prompt.trim() || sending) return;
    const text = prompt.trim();
    setPrompt('');
    setSending(true);
    setActiveRun(null);
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
        toast.success('Shannon is on it');
        pollForStatus(data.runId, text);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to send');
        setSending(false);
      }
    } catch {
      toast.error('Failed to send');
      setSending(false);
    }
  };

  return (
    <div className="card mb-6 border-l-2 border-l-primary-500">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <Terminal className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Shannon</h3>
          <p className="text-xs text-gray-500 dark:text-gray-500">Orchestrator</p>
        </div>
        {sending && <span className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working...</span>}
      </div>
      {history.map((h, i) => (
        <div key={i} className="mb-3">
          <div className="flex items-start gap-2 mb-1">
            <ArrowRight className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-800 dark:text-gray-200">{h.prompt}</p>
          </div>
          {h.run && (
            <div className="flex items-center gap-3 ml-6 mb-1 text-[10px] text-gray-500 dark:text-gray-500">
              <span className={h.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{h.status}</span>
              {h.run.cost_usd != null && <span>{formatCost(h.run.cost_usd)}</span>}
              {h.run.input_tokens != null && <span>{formatTokens(h.run.input_tokens)}in / {formatTokens(h.run.output_tokens)}out</span>}
              {h.run.duration_seconds != null && <span>{formatDuration(h.run.duration_seconds)}</span>}
            </div>
          )}
          <div className="ml-6">
            <button onClick={() => setExpandedRun(expandedRun === h.runId ? null : h.runId)} className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5 mb-1">
              <ChevronRight className={`w-2.5 h-2.5 transition-transform ${expandedRun === h.runId ? 'rotate-90' : ''}`} />
              {expandedRun === h.runId ? 'Hide' : 'Show'} thinking logs
            </button>
            {expandedRun === h.runId && (
              <div className="bg-gray-50 dark:bg-[#1c1c1e] rounded-lg p-3 border border-gray-200 dark:border-gray-700/50">
                <LiveLogViewer runId={h.runId} isActive={false} maxHeight="max-h-80" />
              </div>
            )}
          </div>
        </div>
      ))}
      {activeRunId && (
        <div className="mb-3">
          <div className="bg-gray-50 dark:bg-[#1c1c1e] rounded-lg p-3 border border-gray-200 dark:border-gray-700/50">
            <LiveLogViewer runId={activeRunId} isActive={true} maxHeight="max-h-96" />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(); } }}
          placeholder="Ask Shannon to do something..."
          disabled={sending}
          className="input flex-1 text-sm"
        />
        <button onClick={sendPrompt} disabled={!prompt.trim() || sending} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-sm font-medium">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Progress Bar ---

function ProgressBar({ agent }: { agent: AgentConfig }) {
  const run = agent.latest_run;
  if (!run || run.status !== 'running') return null;

  const elapsed = (Date.now() - new Date(run.started_at).getTime()) / 1000;
  const estimated = agent.avg_duration || 120;
  const progress = Math.min(99, Math.round((elapsed / estimated) * 100));
  const overEstimate = elapsed > estimated;

  return (
    <div className="w-full mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-500 dark:text-gray-400">{formatDuration(Math.round(elapsed))}</span>
        <span className={`text-[10px] font-medium ${overEstimate ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>{progress}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${overEstimate ? 'bg-amber-400 animate-pulse' : 'bg-gradient-to-r from-blue-400 to-blue-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// --- Agent Card ---

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
  const webhook = agent.schedule === 'webhook';

  return (
    <div className="bg-white dark:bg-[#2c2c2e] rounded-xl border border-gray-200 dark:border-gray-700/50 p-3 shadow-sm">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            !agent.is_enabled ? 'bg-gray-400 dark:bg-gray-600' :
            isRunning ? 'bg-yellow-400 animate-pulse' :
            webhook ? 'bg-green-500' :
            run?.status === 'completed' ? 'bg-green-500' :
            run?.status === 'failed' ? 'bg-red-500' :
            'bg-gray-300 dark:bg-gray-600'
          }`} />
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{shortName(agent)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">{formatSchedule(agent.schedule)}</span>
          {agent.schedule && (
            <button onClick={onToggle} className={`p-1 rounded transition-colors ${agent.is_enabled ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
              {agent.is_enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-gray-500 dark:text-gray-500">{agent.model}</span>
        {run && run.started_at && <span className="text-[10px] text-gray-400">{timeAgo(run.started_at)}</span>}
        {run && run.duration_seconds != null && !isRunning && <span className="text-[10px] text-gray-400">{formatDuration(run.duration_seconds)}</span>}
        {run && run.cost_usd != null && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5" />{run.cost_usd.toFixed(4)}</span>}
      </div>

      {/* Progress bar for running */}
      <ProgressBar agent={agent} />

      {/* Error */}
      {run?.status === 'failed' && run.error_message && (
        <div className="flex items-start gap-1.5 p-1.5 mb-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-[10px] text-red-700 dark:text-red-300">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">{run.error_message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100 dark:border-gray-700/50 flex-wrap">
        {agent.prompt_file && !isRunning && (
          <button onClick={onTrigger} disabled={isTriggering || !agent.is_enabled}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-primary-500/10 text-primary-700 dark:text-primary-400 hover:bg-primary-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Play className="w-3 h-3" /> Run
          </button>
        )}
        {isRunning && (
          <button onClick={onStop}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 transition-colors">
            <Square className="w-3 h-3" /> Stop
          </button>
        )}
        {run?.id && (
          <button onClick={onViewLogs} className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${showLogs ? 'bg-primary-500/20 text-primary-700 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3a3c]'}`}>
            {showLogs ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} Logs
          </button>
        )}
        <button onClick={onViewHistory} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} History
        </button>
        {agent.memory_file && (
          <button onClick={onViewMemory} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3a3c] transition-colors">
            <Brain className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Inline logs */}
      {showLogs && run?.id && (
        <div className="mt-2 bg-gray-50 dark:bg-[#1c1c1e] rounded-lg p-2 border border-gray-200 dark:border-gray-700/50">
          <LiveLogViewer runId={run.id} isActive={isRunning} maxHeight="max-h-48" />
        </div>
      )}

      {/* History */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
          {runHistory.length === 0 ? (
            <p className="text-[10px] text-gray-500 py-1">No history</p>
          ) : (
            <div className="space-y-0.5">
              {runHistory.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400 py-0.5">
                  <span className={`font-medium ${r.status === 'completed' ? 'text-green-600 dark:text-green-400' : r.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600'}`}>
                    {r.status === 'completed' ? 'OK' : r.status === 'failed' ? 'Fail' : 'Run'}
                  </span>
                  <span>{new Date(r.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  <span>{formatDuration(r.duration_seconds)}</span>
                  {r.cost_usd != null && <span>{formatCost(r.cost_usd)}</span>}
                  <button onClick={() => logModal(r.id, `${agent.name} — ${new Date(r.started_at).toLocaleString()}`)} className="text-primary-600 dark:text-primary-400 hover:underline ml-auto">View</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Log Viewer Modal ---

function LogViewerModal({ runId, title, onClose }: { runId: string; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Run Logs</h3>
            <p className="text-xs text-gray-500 mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <LiveLogViewer runId={runId} isActive={false} maxHeight="max-h-none" />
        </div>
      </div>
    </div>
  );
}

// --- Persona Section ---

function PersonaSection({
  personaKey,
  agents,
  renderCard,
}: {
  personaKey: PersonaKey;
  agents: AgentConfig[];
  renderCard: (agent: AgentConfig) => React.ReactNode;
}) {
  const persona = PERSONAS[personaKey];
  if (agents.length === 0) return null;

  const runningCount = agents.filter(a => a.latest_run?.status === 'running').length;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${persona.gradient} flex items-center justify-center text-base`}>
          {persona.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{persona.label}</h3>
            <span className="text-xs text-gray-500 dark:text-gray-500">{persona.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          {runningCount > 0 && (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              {runningCount} active
            </span>
          )}
          <span>{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {agents.map(agent => renderCard(agent))}
      </div>
    </div>
  );
}

// --- Main Command Center ---

export default function CommandCenter() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<Record<string, AgentRun[]>>({});
  const [memoryModal, setMemoryModal] = useState<{ agentId: string; file: string; content: string } | null>(null);
  const [logModal, setLogModal] = useState<{ runId: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggeringAgent, setTriggeringAgent] = useState<string | null>(null);
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);

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

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

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

  // Filter out shannon (separate section) and group by persona
  const nonShannon = agents.filter(a => a.id !== 'shannon');
  const activeCount = nonShannon.filter(a => a.latest_run?.status === 'running').length;

  // Group agents by persona
  const grouped: Record<PersonaKey, AgentConfig[]> = { jeff: [], stacey: [], barny: [], ops: [] };
  for (const agent of nonShannon) {
    const key = getPersonaKey(agent.category);
    grouped[key].push(agent);
  }

  // Filter by active tab
  const visiblePersonas: PersonaKey[] = activeTab === 'all'
    ? (['jeff', 'stacey', 'barny', 'ops'] as PersonaKey[])
    : [activeTab as PersonaKey];

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
    return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Command Center</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {activeCount > 0 && <span className="text-yellow-600 dark:text-yellow-400 font-medium">{activeCount} active</span>}
            {activeCount > 0 && ' · '}
            {nonShannon.length} agents
          </p>
        </div>
        <button onClick={() => { setLoading(true); fetchAgents(); }} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#3a3a3c] dark:hover:bg-[#4a4a4c] text-gray-700 dark:text-gray-300 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Shannon */}
      <ShannonChat />

      {/* Persona Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const tabAgents = tab.key === 'all' ? nonShannon : grouped[tab.key as PersonaKey] || [];
          const tabRunning = tabAgents.filter(a => a.latest_run?.status === 'running').length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
                isActive
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1.5 text-[10px] text-gray-400">{(grouped[tab.key as PersonaKey] || []).length}</span>
              )}
              {tabRunning > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Persona Sections */}
      {visiblePersonas.map(key => (
        <PersonaSection
          key={key}
          personaKey={key}
          agents={grouped[key]}
          renderCard={renderCard}
        />
      ))}

      {/* Memory modal */}
      {memoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setMemoryModal(null)}>
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Agent Memory</h3>
                <p className="text-xs text-gray-500 mt-0.5">{memoryModal.file}</p>
              </div>
              <button onClick={() => setMemoryModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">{memoryModal.content}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Log viewer modal */}
      {logModal && <LogViewerModal runId={logModal.runId} title={logModal.title} onClose={() => setLogModal(null)} />}
    </div>
  );
}
