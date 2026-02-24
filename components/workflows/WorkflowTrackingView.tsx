'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Zap, Settings, Clock, GitBranch, Users, Activity } from 'lucide-react';

interface ContactPosition {
  executionId: string;
  contactId?: string;
  contactName: string;
  stepId: string | null;
}

interface WorkflowNode {
  id: string;
  type: string;
  data: { label: string; stepType: string; config?: any };
  position: { x: number; y: number };
}

interface WorkflowTrackingViewProps {
  workflowId: string;
  workflowName: string;
  accountId: string;
  onClose: () => void;
}

// Each colour represents a different contact — cycles through 5 colours
const FIGURE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function StickFigure({ name, colorIndex }: { name: string; colorIndex: number }) {
  const color = FIGURE_COLORS[colorIndex % FIGURE_COLORS.length];
  const delayMs = (colorIndex * 220) % 900;

  return (
    <div className="relative group cursor-default select-none">
      <svg
        viewBox="0 0 22 34"
        width="22"
        height="34"
        style={{
          animation: 'wfBob 1.3s ease-in-out infinite',
          animationDelay: `${delayMs}ms`,
        }}
      >
        {/* Head */}
        <circle cx="11" cy="5.5" r="4.5" fill={color} />
        {/* Body */}
        <line x1="11" y1="10" x2="11" y2="22" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* Arms */}
        <line x1="11" y1="14" x2="2"  y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="11" y1="14" x2="20" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
        {/* Legs */}
        <line x1="11" y1="22" x2="4"  y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="11" y1="22" x2="18" y2="32" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
      {/* Name tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {name}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

function getStepIcon(type: string) {
  if (type === 'trigger') return <Zap className="w-4 h-4 text-green-600" />;
  if (type === 'condition') return <GitBranch className="w-4 h-4 text-amber-600" />;
  if (type === 'delay') return <Clock className="w-4 h-4 text-orange-500" />;
  return <Settings className="w-4 h-4 text-blue-600" />;
}

function getStepStyle(type: string) {
  if (type === 'trigger') return 'border-green-200 bg-green-50';
  if (type === 'condition') return 'border-amber-200 bg-amber-50';
  if (type === 'delay') return 'border-orange-200 bg-orange-50';
  return 'border-blue-100 bg-blue-50';
}

export default function WorkflowTrackingView({
  workflowId,
  workflowName,
  accountId,
  onClose,
}: WorkflowTrackingViewProps) {
  const [steps, setSteps] = useState<WorkflowNode[]>([]);
  const [positions, setPositions] = useState<ContactPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      await Promise.all([
        loadSteps(cancelled),
        loadPositions(cancelled),
      ]);
      if (!cancelled) setLoading(false);
    };

    init();

    // Auto-refresh contact positions every 10 s
    const timer = setInterval(() => loadPositions(false), 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [workflowId, accountId]);

  const loadSteps = async (cancelled: boolean) => {
    try {
      const res = await fetch(`/api/workflows/${workflowId}?accountId=${accountId}`);
      const { data } = await res.json();
      if (cancelled) return;
      if (data?.workflow_definition?.nodes) {
        const sorted = [...(data.workflow_definition.nodes as WorkflowNode[])].sort(
          (a, b) => a.position.y - b.position.y
        );
        setSteps(sorted);
      }
    } catch {
      // handled silently
    }
  };

  const loadPositions = async (cancelled: boolean | false) => {
    try {
      const res = await fetch(
        `/api/workflows/${workflowId}/contact-positions?accountId=${accountId}`
      );
      const data = await res.json();
      if (cancelled) return;
      setPositions((data.positions || []).slice(0, 20));
    } catch {
      // handled silently
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPositions(false);
    setRefreshing(false);
  };

  const contactsAtStep = (stepId: string) =>
    positions.filter((p) => p.stepId === stepId);

  const unplaced = positions.filter((p) => !p.stepId);
  const totalActive = positions.length;

  // Assign a stable colour index per execution so it doesn't flicker on refresh
  const colorMap: Record<string, number> = {};
  positions.forEach((p, i) => {
    colorMap[p.executionId] = i;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Inject the bobbing keyframe once */}
      <style>{`
        @keyframes wfBob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Contact Tracking</h2>
            <p className="text-sm text-gray-400 mt-0.5 truncate max-w-[280px]">{workflowName}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {/* Live count badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold">
              <Activity className="w-3.5 h-3.5" />
              {totalActive} active
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh now"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading…
            </div>
          ) : steps.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No workflow steps found. Save the workflow first.
            </div>
          ) : (
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const all = contactsAtStep(step.id);
                const visible = all.slice(0, 5);
                const overflow = all.length - visible.length;

                return (
                  <div key={step.id}>
                    {/* Connector */}
                    {idx > 0 && (
                      <div className="flex justify-center">
                        <div className="w-px h-4 bg-gray-200" />
                      </div>
                    )}

                    {/* Step card */}
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${getStepStyle(step.type)}`}
                    >
                      {/* Icon + label */}
                      <div className="shrink-0">{getStepIcon(step.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                          {step.data?.label || step.type}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">
                          {step.data?.stepType?.replace(/_/g, ' ') || step.type}
                        </div>
                      </div>

                      {/* Stick figures */}
                      <div className="flex items-end gap-1 shrink-0">
                        {visible.length === 0 ? (
                          <span className="text-xs text-gray-300 italic mr-1">—</span>
                        ) : (
                          <>
                            {visible.map((c) => (
                              <StickFigure
                                key={c.executionId}
                                name={c.contactName}
                                colorIndex={colorMap[c.executionId] ?? 0}
                              />
                            ))}
                            {overflow > 0 && (
                              <span className="text-xs font-semibold text-gray-500 self-center ml-0.5">
                                +{overflow}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Count badge */}
                      {all.length > 0 && (
                        <div className="shrink-0 min-w-[24px] text-center px-2 py-0.5 bg-white/70 border border-gray-200 rounded-full text-xs font-bold text-gray-600">
                          {all.length}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Contacts not yet at a known step (just triggered) */}
              {unplaced.length > 0 && (
                <div className="mt-3 px-4 py-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                  <div className="text-xs text-gray-400 font-medium mb-2">Starting…</div>
                  <div className="flex flex-wrap gap-1">
                    {unplaced.map((c) => (
                      <StickFigure
                        key={c.executionId}
                        name={c.contactName}
                        colorIndex={colorMap[c.executionId] ?? 0}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {totalActive === 0 && (
                <div className="flex flex-col items-center py-14 text-center">
                  <Users className="w-14 h-14 text-gray-150 mb-4 text-gray-200" />
                  <p className="text-sm font-semibold text-gray-500">
                    No contacts in this workflow right now
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Contacts appear here as soon as the workflow is triggered
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-2.5 border-t border-gray-100 text-center text-xs text-gray-300">
          Auto-refreshes every 10 s &nbsp;·&nbsp; Max 5 contacts shown per step, 20 total
        </div>
      </div>
    </div>
  );
}
