'use client';

import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Edit } from 'lucide-react';
import { Workflow } from '@/types';
import WorkflowBuilder from './WorkflowBuilder';

interface WorkflowListProps {
  accountId: string;
  userId: string;
}

export default function WorkflowList({ accountId, userId }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, [accountId]);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows?accountId=${accountId}`);
      const data = await response.json();
      if (data.workflows) {
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
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
    loadWorkflows(); // Reload workflows after closing builder
  };

  const handleToggleActive = async (workflowId: string, currentState: boolean) => {
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          isActive: !currentState,
        }),
      });

      // Update local state
      setWorkflows(workflows.map(w =>
        w.id === workflowId ? { ...w, is_active: !currentState } : w
      ));
    } catch (error) {
      console.error('Error toggling workflow:', error);
      alert('Failed to update workflow status');
    }
  };

  // Show workflow builder if a workflow is selected
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
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflows</h2>
          <p className="text-gray-600 mt-1">Automate your processes with visual workflows</p>
        </div>
        <button onClick={handleCreateWorkflow} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plus className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first workflow to start automating your business processes.
          </p>
          <button onClick={handleCreateWorkflow} className="btn btn-primary">
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1" onClick={() => handleEditWorkflow(workflow.id)}>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      workflow.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {workflow.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Trigger:</span>
                      {getTriggerLabel(workflow.trigger_type)}
                    </span>
                    <span>•</span>
                    <span>{workflow.total_executions} executions</span>
                    {workflow.total_executions > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">
                          {Math.round((workflow.successful_executions / workflow.total_executions) * 100)}% success rate
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    {workflow.is_active ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
