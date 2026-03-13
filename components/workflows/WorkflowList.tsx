'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Edit, Users, Activity, MapPin, Power, RotateCcw } from 'lucide-react';
import { SkeletonWorkflowCard } from '@/components/ui/SkeletonLoader';
import { toast } from 'sonner';
import { Workflow } from '@/types';
import WorkflowBuilder from './WorkflowBuilder';
import WorkflowTrackingView from './WorkflowTrackingView';

type BuiltinAutomationId = 'new_lead' | 'booking_reminders' | 'nurturing';

const BUILTIN_AUTOMATIONS: { id: BuiltinAutomationId; name: string; description: string }[] = [
  {
    id: 'new_lead',
    name: 'New Lead Follow-up',
    description: '5-step SMS + email sequence starting the moment a lead submits the form. Escalates to nurturing after 5 days if no response.',
  },
  {
    id: 'booking_reminders',
    name: 'Booking Reminders',
    description: 'Confirmation message on booking + reminders at −48h, −24h, and −1h before the call.',
  },
  {
    id: 'nurturing',
    name: 'Nurturing Sequence',
    description: '30-day long-term follow-up (12 emails + 4 SMS) for leads who never responded to the initial sequence.',
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
      <div className="space-y-3 py-4">
        <SkeletonWorkflowCard />
        <SkeletonWorkflowCard />
        <SkeletonWorkflowCard />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workflows</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Automate your processes with visual workflows</p>
        </div>
        <button onClick={handleCreateWorkflow} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Workflow
        </button>
      </div>

      <div className="space-y-4">
        {/* ── Built-in automations (always shown first) ── */}
        {BUILTIN_AUTOMATIONS.map((auto) => {
          const enabled = builtinEnabled[auto.id] ?? true;
          return (
            <div key={auto.id} className={`card hover:shadow-lg transition-shadow ${!enabled ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => setEditingAutomationId(auto.id)}>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{auto.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      Default
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                    }`}>
                      {enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{auto.description}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleToggleBuiltin(auto.id, enabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      enabled
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                    }`}
                    title={enabled ? 'Disable automation' : 'Enable automation'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingAutomationId(auto.id)}
                    className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Edit automation"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleResetBuiltin(auto.id)}
                    className="p-2 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="Reset to default templates"
                  >
                    <RotateCcw className="w-4 h-4" />
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
            <div key={workflow.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1" onClick={() => handleEditWorkflow(workflow.id)}>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{workflow.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      workflow.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                    }`}>
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{workflow.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    <span>
                      <span className="font-medium">Trigger:</span>{' '}
                      {getTriggerLabel(workflow.trigger_type)}
                    </span>
                    {stats && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <Activity className="w-3.5 h-3.5" />
                          {stats.in_progress} in progress
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <Users className="w-3.5 h-3.5" />
                          {stats.completed} completed
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrackingWorkflow(workflow);
                    }}
                    className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                    title="Track contacts"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditWorkflow(workflow.id)}
                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit workflow"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(workflow.id, workflow.is_active);
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      workflow.is_active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                    title={workflow.is_active ? 'Pause workflow' : 'Activate workflow'}
                  >
                    {workflow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state — only shown when no custom workflows exist */}
        {workflows.length === 0 && (
          <div className="card text-center py-10 border-dashed">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No custom workflows yet.</p>
            <button onClick={handleCreateWorkflow} className="btn btn-secondary">
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
