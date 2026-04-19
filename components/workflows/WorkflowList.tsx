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
    description: '5-step SMS + email sequence starting the moment a lead submits the form. Escalates to nurturing after 5 days if no response.',
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
    description: '30-day long-term follow-up (12 emails + 4 SMS) for leads who never responded to the initial sequence.',
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

// ── Workflow icon (blue box with lightning bolt) ──
function WorkflowIcon({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: 'rgba(59,130,246,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none"
        stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </div>
  );
}

// ── Status badge ──
function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  const dot = active ? 'var(--green)' : 'var(--amber)';
  const text = label || (active ? 'Active' : 'Paused');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '3px 9px',
      background: active ? 'rgba(20,184,166,0.1)' : 'rgba(245,158,11,0.1)',
      color: active ? 'var(--green)' : 'var(--amber)',
      border: `1px solid ${active ? 'rgba(20,184,166,0.2)' : 'rgba(245,158,11,0.2)'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block' }} />
      {text}
    </span>
  );
}

// ── Built-in label ──
function BuiltinBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, borderRadius: 99, padding: '2px 7px',
      background: 'rgba(79,70,229,0.1)', color: 'var(--violet)',
      border: '1px solid rgba(79,70,229,0.2)',
    }}>
      Built-in
    </span>
  );
}

// ── Trigger pill ──
function TriggerPill({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: 'var(--ink-3)',
      background: 'var(--paper-3)', border: '1px solid var(--line)',
      borderRadius: 99, padding: '3px 9px',
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
        stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      {label}
    </span>
  );
}

export default function WorkflowList({ accountId, userId }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<BuiltinAutomationId | null>(null);
  const [workflowStats, setWorkflowStats] = useState<Record<string, WorkflowStats>>({});
  const [trackingWorkflow, setTrackingWorkflow] = useState<Workflow | null>(null);

  // Built-in automation enabled states
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
      <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonWorkflowCard />
        <SkeletonWorkflowCard />
        <SkeletonWorkflowCard />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: 1480, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', marginBottom: 8, fontFamily: 'Geist Mono, monospace' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Workflows
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>Workflows</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '4px 0 0' }}>Trigger-based automations that run in the background.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Executions
          </button>
          <button onClick={handleCreateWorkflow} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--grad)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New workflow
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* ── Built-in automations ── */}
        {BUILTIN_AUTOMATIONS.map((auto) => {
          const enabled = builtinEnabled[auto.id] ?? true;
          return (
            <div
              key={auto.id}
              style={{
                background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
                padding: '14px 16px', opacity: enabled ? 1 : 0.55,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <WorkflowIcon size={38} />

                {/* Name + meta */}
                <div
                  style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                  onClick={() => setEditingAutomationId(auto.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {auto.name}
                    </span>
                    <BuiltinBadge />
                    <StatusBadge active={enabled} label={enabled ? 'Active' : 'Paused'} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <TriggerPill label={auto.trigger} />
                    <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{auto.description.slice(0, 60)}…</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {/* Toggle power */}
                  <button
                    onClick={() => handleToggleBuiltin(auto.id, enabled)}
                    title={enabled ? 'Disable automation' : 'Enable automation'}
                    style={{
                      width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: enabled ? 'rgba(239,68,68,0.1)' : 'rgba(20,184,166,0.1)',
                      color: enabled ? 'var(--rose)' : 'var(--green)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
                    </svg>
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => setEditingAutomationId(auto.id)}
                    title="Edit automation"
                    style={{
                      width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(59,130,246,0.1)', color: 'var(--blue)',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {/* Reset */}
                  <button
                    onClick={() => handleResetBuiltin(auto.id)}
                    title="Reset to default templates"
                    style={{
                      width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--paper-3)', color: 'var(--ink-4)',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Custom workflows ── */}
        {workflows.map((workflow) => {
          const stats = workflowStats[workflow.id];
          return (
            <div
              key={workflow.id}
              style={{
                background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
                padding: '14px 16px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <WorkflowIcon size={38} />

                {/* Name + stats */}
                <div
                  style={{ flex: 1, minWidth: 0 }}
                  onClick={() => handleEditWorkflow(workflow.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      {workflow.name}
                    </span>
                    <StatusBadge active={workflow.is_active} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <TriggerPill label={getTriggerLabel(workflow.trigger_type)} />
                    {stats && (
                      <>
                        <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>
                          {stats.in_progress} in progress
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                          {stats.completed} completed
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {/* Track */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setTrackingWorkflow(workflow); }}
                    title="Track contacts"
                    style={{
                      width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(124,58,237,0.1)', color: 'var(--violet)',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => handleEditWorkflow(workflow.id)}
                    title="Edit workflow"
                    style={{
                      width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(59,130,246,0.1)', color: 'var(--blue)',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {/* Toggle active / pause */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(workflow.id, workflow.is_active); }}
                    title={workflow.is_active ? 'Pause workflow' : 'Activate workflow'}
                    style={{
                      width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: workflow.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(20,184,166,0.1)',
                      color: workflow.is_active ? 'var(--rose)' : 'var(--green)',
                    }}
                  >
                    {workflow.is_active ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Empty state — custom workflows only ── */}
        {workflows.length === 0 && (
          <div style={{
            background: 'var(--paper)', border: '1px dashed var(--line-2)', borderRadius: 12,
            padding: '40px 24px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', margin: '0 0 14px' }}>
              No custom workflows yet.
            </p>
            <button
              onClick={handleCreateWorkflow}
              style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'transparent', border: '1px solid var(--line-2)',
                color: 'var(--ink-3)', cursor: 'pointer',
              }}
            >
              Create a Workflow
            </button>
          </div>
        )}
        </div>

      {/* ── Contact Tracking Modal ── */}
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
