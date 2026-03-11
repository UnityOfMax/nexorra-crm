'use client';

import { useState } from 'react';
import { Check, X, Clock, ChevronRight } from 'lucide-react';

export interface OptimizerAction {
  id: string;
  action_type: string;
  target_name?: string;
  reason: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  approved: boolean;
  applied: boolean;
  rejected: boolean;
  applied_at?: string;
  created_at: string;
}

interface OptimizerFeedProps {
  actions: OptimizerAction[];
  onApprove?: (actionId: string) => void;
  onReject?: (actionId: string) => void;
  isLoading?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  pause_adset:     'Pause Ad Set',
  activate_adset:  'Activate Ad Set',
  increase_budget: 'Increase Budget',
  decrease_budget: 'Decrease Budget',
  creative_refresh:'New Creative',
  pause_ad:        'Pause Ad',
  update_ai_tone:  'Update AI Tone',
};

const ACTION_COLORS: Record<string, string> = {
  pause_adset:     'text-amber-400 bg-amber-500/10 ring-amber-500/20',
  activate_adset:  'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
  increase_budget: 'text-emerald-400 bg-emerald-500/10 ring-emerald-500/20',
  decrease_budget: 'text-amber-400 bg-amber-500/10 ring-amber-500/20',
  creative_refresh:'text-violet-400 bg-violet-500/10 ring-violet-500/20',
  pause_ad:        'text-amber-400 bg-amber-500/10 ring-amber-500/20',
  update_ai_tone:  'text-sky-400 bg-sky-500/10 ring-sky-500/20',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OptimizerFeed({ actions, onApprove, onReject, isLoading }: OptimizerFeedProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--analytics-muted)] text-sm">
        No optimizer actions yet. Runs nightly.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const isPending = !action.approved && !action.applied && !action.rejected;
        const colorClass = ACTION_COLORS[action.action_type] || 'text-slate-400 bg-slate-500/10 ring-slate-500/20';
        const isExpanded = expanded === action.id;

        return (
          <div
            key={action.id}
            className="rounded-lg bg-white/[0.04] ring-1 ring-white/10 overflow-hidden"
          >
            <div
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : action.id)}
            >
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {action.applied && <Check className="w-4 h-4 text-emerald-400" />}
                {action.rejected && <X className="w-4 h-4 text-red-400" />}
                {action.approved && !action.applied && <Clock className="w-4 h-4 text-amber-400 animate-pulse" />}
                {isPending && <Clock className="w-4 h-4 text-[var(--analytics-muted)]" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${colorClass}`}>
                    {ACTION_LABELS[action.action_type] || action.action_type}
                  </span>
                  {action.target_name && (
                    <span className="text-xs text-white/70 truncate">{action.target_name}</span>
                  )}
                </div>
                <p className="text-xs text-[var(--analytics-muted)] mt-1 line-clamp-1">{action.reason}</p>
              </div>

              {/* Time + expand */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--analytics-muted)] tabular-nums">{timeAgo(action.created_at)}</span>
                <ChevronRight className={`w-3.5 h-3.5 text-[var(--analytics-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-0 border-t border-white/5">
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {action.before_state && (
                    <div>
                      <p className="text-[10px] text-[var(--analytics-muted)] uppercase tracking-widest mb-1">Before</p>
                      <pre className="text-xs text-white/60 font-mono bg-black/20 rounded p-2 overflow-auto max-h-24">
                        {JSON.stringify(action.before_state, null, 2)}
                      </pre>
                    </div>
                  )}
                  {action.after_state && (
                    <div>
                      <p className="text-[10px] text-[var(--analytics-muted)] uppercase tracking-widest mb-1">After</p>
                      <pre className="text-xs text-white/60 font-mono bg-black/20 rounded p-2 overflow-auto max-h-24">
                        {JSON.stringify(action.after_state, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Approve / reject buttons for pending actions */}
                {isPending && (onApprove || onReject) && (
                  <div className="flex gap-2 mt-3">
                    {onApprove && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onApprove(action.id); }}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-md bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {onReject && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onReject(action.id); }}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-md bg-red-500/15 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/25 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
