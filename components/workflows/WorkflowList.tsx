'use client';

import { useState, useEffect } from 'react';
import { SkeletonWorkflowCard } from '@/components/ui/SkeletonLoader';
import { toast } from 'sonner';
import { Workflow } from '@/types';
import WorkflowBuilder from './WorkflowBuilder';
import WorkflowTrackingView from './WorkflowTrackingView';

type BuiltinAutomationId = 'new_lead' | 'booking_reminders' | 'nurturing';

const BUILTIN_AUTOMATIONS: { id: BuiltinAutomationId; name: string; description: string; trigger: string }[] = [
  {
    id: 'new_lead',
    name: 'New Lead Follow-up',
    description: '5-step SMS + email sequence starting the moment a lead submits the form.',
    trigger: 'Form Submitted',
  },
  {
    id: 'booking_reminders',
    name: 'Booking Reminders',
    description: 'Confirmation message on booking + reminders at −48h, −24h, and −1h before the call.',
    trigger: 'Booking Created',
  },
  {
    id: 'nurturing',
    name: 'Nurturing Sequence',
    description: '30-day long-term follow-up for leads who never responded to the initial sequence.',
    trigger: 'Tag Added',
  },
];

interface WorkflowStats {
  in_progress: number;
  completed: number;
  failed: number;
}

interface WorkflowListProps {
  accountId: string;
  userId: string;
}

// Trigger icon colors
const TRIGGER_COLORS: Record<string, string> = {
  'Form Submitted': 'var(--blue)',
  'Booking Created': 'var(--green)',
  'Tag Added': 'var(--amber)',
  'Contact Created': 'var(--violet)',
  'Contact Updated': 'var(--violet)',
  'Deal Stage Changed': 'var(--blue)',
  'Manual Trigger': 'var(--ink-3)',
};

function WorkflowRowIcon({ trigger }: { trigger: string }) {
  const color = TRIGGER_COLORS[trigger] || 'var(--blue)';
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: `color-mix(in oklch, ${color} 14%, transparent)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'paused' | 'draft' | boolean }) {
  let label: string;
  let bg: string;
  let color: string;

  if (status === true || status === 'active') {
    label = 'Active'; bg = 'var(--green-soft)'; color = 'var(--green)';
  } else if (status === 'draft') {
    label = 'Draft'; bg = 'var(--paper-3)'; color = 'var(--ink-3)';
  } else {
    label = 'Paused'; bg = 'var(--amber-soft)'; color = 'var(--amber)';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '3px 9px',
      background: bg, color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

const MONO: React.CSSProperties = { fontFamily: 'Geist Mono, monospace' };

function successColor(rate: number): string {
  if (rate >= 90) return 'var(--green)';
  if (rate >= 70) return 'var(--amber)';
  return 'var(--rose)';
}

export default function WorkflowList({ accountId, userId }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<BuiltinAutomationId | null>(null);
  const [workflowStats, setWorkflowStats] = useState<Record<string, WorkflowStats>>({});
  const [trackingWorkflow, setTrackingWorkflow] = useState<Workflow | null>(null);

  const [builtinEnabled, setBuiltinEnabled] = useState<Record<string, boolean>>({
    new_lead: true, booking_reminders: true, nurturing: true,
  });

  useEffect(() => {
    loadWorkflows();
    loadBuiltinStates();
  }, [accountId]);

  const loadBuiltinStates = async () => {
    const states: Record<string, boolean> = {};
    await Promise.all(
      BUILTIN_AUTOMATIONS.map(async (auto) => {
        try {
          const res = await fetch(`/api/automations/configs?accountId=${accountId}&automationId=${auto.id}`);
          const data = await res.json();
          states[auto.id] = data.is_enabled ?? true;
        } catch {
          states[auto.id] = true;
        }
      })
    );
    setBuiltinEnabled(states);
  };

  const handleToggleBuiltin = async (automationId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setBuiltinEnabled(prev => ({ ...prev, [automationId]: newEnabled }));
    try {
      const res = await fetch('/api/automations/configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, automationId, is_enabled: newEnabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Automation ${newEnabled ? 'enabled' : 'disabled'}`);
    } catch {
      setBuiltinEnabled(prev => ({ ...prev, [automationId]: currentEnabled }));
      toast.error('Failed to update automation');
    }
  };

  const handleResetBuiltin = async (automationId: string) => {
    if (!window.confirm('Reset this automation to default templates?')) return;
    try {
      const res = await fetch(
        `/api/automations/configs?accountId=${accountId}&automationId=${automationId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      setBuiltinEnabled(prev => ({ ...prev, [automationId]: true }));
      toast.success('Automation reset to defaults');
    } catch {
      toast.error('Failed to reset automation');
    }
  };

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows?accountId=${accountId}`);
      const data = await response.json();
      if (data.workflows) {
        setWorkflows(data.workflows);
        fetchAllStats(data.workflows);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStats = async (wfs: Workflow[]) => {
    const results = await Promise.allSettled(
      wfs.map(async (w) => {
        const res = await fetch(`/api/workflows/${w.id}/stats`);
        const d = await res.json();
        return { id: w.id, stats: d as WorkflowStats };
      })
    );
    const statsMap: Record<string, WorkflowStats> = {};
    for (const r of results) {
      if (r.status === 'fulfilled') statsMap[r.value.id] = r.value.stats;
    }
    setWorkflowStats(statsMap);
  };

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      contact_created: 'Contact Created',
      contact_updated: 'Contact Updated',
      contact_status_changed: 'Contact Status Changed',
      deal_created: 'Deal Created',
      deal_updated: 'Deal Updated',
      deal_stage_changed: 'Deal Stage Changed',
      tag_added: 'Tag Added',
      tag_removed: 'Tag Removed',
      form_submitted: 'Form Submitted',
      booking_created: 'Booking Created',
      manual: 'Manual Trigger',
    };
    return labels[triggerType] || triggerType;
  };

  const handleCreateWorkflow = () => {
    setSelectedWorkflowId(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setShowBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setSelectedWorkflowId(null);
    loadWorkflows();
  };

  const handleToggleActive = async (workflowId: string, currentState: boolean) => {
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, isActive: !currentState }),
      });
      setWorkflows(workflows.map(w =>
        w.id === workflowId ? { ...w, is_active: !currentState } : w
      ));
    } catch (error) {
      console.error('Error toggling workflow:', error);
      toast.error('Failed to update workflow status');
    }
  };

  if (editingAutomationId) {
    return (
      <WorkflowBuilder
        builtinAutomationId={editingAutomationId}
        accountId={accountId}
        userId={userId}
        onBack={() => setEditingAutomationId(null)}
      />
    );
  }

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflowId={selectedWorkflowId || undefined}
        accountId={accountId}
        userId={userId}
        onBack={handleCloseBuilder}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }} className="nx-pad-mobile">
        <SkeletonWorkflowCard />
        <SkeletonWorkflowCard />
        <SkeletonWorkflowCard />
      </div>
    );
  }

  // Column header style
  const colHead: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, color: 'var(--ink-3)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    ...MONO,
    padding: '10px 20px',
  };

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }} className="nx-pad-mobile">
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10, ...MONO, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Nexorra</span>
        <span style={{ color: 'var(--line-2)' }}>›</span>
        <span>Workflows</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>Workflows</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: 'transparent', border: '1px solid var(--line)',
            color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Executions
          </button>
          <button
            onClick={handleCreateWorkflow}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--grad)', border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Workflow
          </button>
        </div>
      </div>

      {/* Workflow table card */}
      <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 0, overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--paper-3)' }}>
          <div style={{ width: 40, flexShrink: 0 }} />
          <div style={{ flex: 1, ...colHead, padding: 0 }}>Workflow</div>
          <div style={{ width: 140, ...colHead, padding: 0 }}>Trigger</div>
          <div style={{ width: 90, ...colHead, padding: 0, textAlign: 'right' }}>Runs 30d</div>
          <div style={{ width: 90, ...colHead, padding: 0, textAlign: 'right' }}>Success %</div>
          <div style={{ width: 80, ...colHead, padding: 0 }}>Status</div>
          <div style={{ width: 96, flexShrink: 0 }} />
        </div>

        {/* Built-in automations */}
        {BUILTIN_AUTOMATIONS.map((auto, i) => {
          const enabled = builtinEnabled[auto.id] ?? true;
          const isLast = i === BUILTIN_AUTOMATIONS.length - 1 && workflows.length === 0;
          return (
            <div
              key={auto.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                borderBottom: isLast ? 'none' : '1px solid var(--line)',
                opacity: enabled ? 1 : 0.5, transition: 'opacity 0.2s',
              }}
            >
              <WorkflowRowIcon trigger={auto.trigger} />

              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditingAutomationId(auto.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)' }}>{auto.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                    background: 'var(--violet-soft)', color: 'var(--violet)',
                  }}>Built-in</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {auto.description}
                </div>
              </div>

              <div style={{ width: 140, fontSize: 13, color: 'var(--ink-3)', ...MONO, flexShrink: 0 }}>
                {auto.trigger}
              </div>

              <div style={{ width: 90, textAlign: 'right', fontSize: 13, color: 'var(--ink)', ...MONO, flexShrink: 0 }}>
                —
              </div>

              <div style={{ width: 90, textAlign: 'right', fontSize: 13, ...MONO, flexShrink: 0, color: 'var(--ink-3)' }}>
                —
              </div>

              <div style={{ width: 80, flexShrink: 0 }}>
                <StatusBadge status={enabled ? 'active' : 'paused'} />
              </div>

              <div style={{ width: 96, display: 'flex', gap: 4, justifyContent: 'flex-end', flexShrink: 0 }}>
                <button
                  onClick={() => handleToggleBuiltin(auto.id, enabled)}
                  title={enabled ? 'Disable' : 'Enable'}
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: enabled ? 'var(--rose-soft)' : 'var(--green-soft)',
                    color: enabled ? 'var(--rose)' : 'var(--green)',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingAutomationId(auto.id)}
                  title="Edit"
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--blue-soft)', color: 'var(--blue)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleResetBuiltin(auto.id)}
                  title="Reset to defaults"
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--paper-3)', color: 'var(--ink-3)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}

        {/* Custom workflows */}
        {workflows.map((workflow, i) => {
          const stats = workflowStats[workflow.id];
          const runs30d = stats ? (stats.in_progress + stats.completed + stats.failed) : 0;
          const successRate = stats && (stats.completed + stats.failed) > 0
            ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100)
            : null;
          const isLast = i === workflows.length - 1;
          const triggerLabel = getTriggerLabel(workflow.trigger_type);

          return (
            <div
              key={workflow.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                borderBottom: isLast ? 'none' : '1px solid var(--line)',
                cursor: 'pointer',
              }}
            >
              <WorkflowRowIcon trigger={triggerLabel} />

              <div style={{ flex: 1, minWidth: 0 }} onClick={() => handleEditWorkflow(workflow.id)}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {workflow.name}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  Custom workflow
                </div>
              </div>

              <div style={{ width: 140, fontSize: 13, color: 'var(--ink-3)', ...MONO, flexShrink: 0 }}>
                {triggerLabel}
              </div>

              <div style={{ width: 90, textAlign: 'right', fontSize: 13, color: 'var(--ink)', ...MONO, flexShrink: 0 }}>
                {runs30d > 0 ? runs30d.toLocaleString() : '—'}
              </div>

              <div style={{ width: 90, textAlign: 'right', fontSize: 13, ...MONO, flexShrink: 0, fontWeight: 600, color: successRate != null ? successColor(successRate) : 'var(--ink-3)' }}>
                {successRate != null ? `${successRate}%` : '—'}
              </div>

              <div style={{ width: 80, flexShrink: 0 }}>
                <StatusBadge status={workflow.is_active ? 'active' : 'paused'} />
              </div>

              <div style={{ width: 96, display: 'flex', gap: 4, justifyContent: 'flex-end', flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setTrackingWorkflow(workflow); }}
                  title="Track contacts"
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--violet-soft)', color: 'var(--violet)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEditWorkflow(workflow.id)}
                  title="Edit"
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--blue-soft)', color: 'var(--blue)',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleActive(workflow.id, workflow.is_active); }}
                  title={workflow.is_active ? 'Pause' : 'Activate'}
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: workflow.is_active ? 'var(--rose-soft)' : 'var(--green-soft)',
                    color: workflow.is_active ? 'var(--rose)' : 'var(--green)',
                  }}
                >
                  {workflow.is_active ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {workflows.length === 0 && (
          <div style={{
            padding: '32px 24px', textAlign: 'center',
            borderTop: '1px solid var(--line)',
          }}>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 14px' }}>
              No custom workflows yet.
            </p>
            <button
              onClick={handleCreateWorkflow}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'transparent', border: '1px solid var(--line)',
                color: 'var(--ink-3)', cursor: 'pointer',
              }}
            >
              Create a Workflow
            </button>
          </div>
        )}
      </div>

      {/* Contact Tracking Modal */}
      {trackingWorkflow && (
        <WorkflowTrackingView
          workflowId={trackingWorkflow.id}
          workflowName={trackingWorkflow.name}
          accountId={accountId}
          onClose={() => setTrackingWorkflow(null)}
        />
      )}
    </div>
  );
}
