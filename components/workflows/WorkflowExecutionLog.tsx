'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface WorkflowExecutionLogProps {
  workflowId: string;
  accountId: string;
  onClose: () => void;
}

interface StepExecution {
  step_id: string;
  step_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  output?: any;
  started_at?: string;
  completed_at?: string;
}

interface Execution {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  started_at: string;
  completed_at?: string;
  error?: string;
  trigger_type: string;
  trigger_data?: any;
  workflow_step_executions: StepExecution[];
}

export default function WorkflowExecutionLog({ workflowId, accountId, onClose }: WorkflowExecutionLogProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
  }, [workflowId]);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/executions?accountId=${accountId}`);
      const data = await response.json();

      if (data.executions) {
        setExecutions(data.executions);
      }
    } catch (error) {
      console.error('Error loading executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'paused':
        return <Clock className="w-5 h-5 text-orange-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'running':
        return 'bg-blue-100 text-blue-700';
      case 'paused':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ${diffSec % 60}s`;
    return `${Math.floor(diffSec / 3600)}h ${Math.floor((diffSec % 3600) / 60)}m`;
  };

  const toggleExpanded = (executionId: string) => {
    setExpandedExecution(expandedExecution === executionId ? null : executionId);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-8 text-center">
            <div className="text-gray-500">Loading executions...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Execution History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No executions yet</h3>
              <p className="text-gray-600">
                This workflow hasn't been executed yet. Trigger it manually or wait for the trigger event.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map((execution) => (
                <div key={execution.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Execution Header */}
                  <div
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleExpanded(execution.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(execution.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {formatDate(execution.started_at)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                              {execution.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Trigger: {execution.trigger_type.replace(/_/g, ' ')} •
                            Duration: {getDuration(execution.started_at, execution.completed_at)}
                          </div>
                        </div>
                      </div>
                      <div>
                        {expandedExecution === execution.id ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {execution.error && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Error:</strong> {execution.error}
                      </div>
                    )}
                  </div>

                  {/* Execution Steps */}
                  {expandedExecution === execution.id && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Execution Steps</h4>
                      {execution.workflow_step_executions.length === 0 ? (
                        <p className="text-sm text-gray-600">No steps executed</p>
                      ) : (
                        <div className="space-y-2">
                          {execution.workflow_step_executions.map((step, index) => (
                            <div
                              key={`${step.step_id}-${index}`}
                              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="mt-0.5">
                                {step.status === 'completed' ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : step.status === 'failed' ? (
                                  <XCircle className="w-4 h-4 text-red-600" />
                                ) : (
                                  <Clock className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900">
                                    {step.step_type.replace(/_/g, ' ')}
                                  </span>
                                  {step.started_at && step.completed_at && (
                                    <span className="text-xs text-gray-500">
                                      {getDuration(step.started_at, step.completed_at)}
                                    </span>
                                  )}
                                </div>
                                {step.error && (
                                  <div className="mt-1 text-xs text-red-600">
                                    Error: {step.error}
                                  </div>
                                )}
                                {step.output && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    <details className="cursor-pointer">
                                      <summary className="font-medium">Output</summary>
                                      <pre className="mt-1 p-2 bg-white rounded border border-gray-200 overflow-x-auto">
                                        {JSON.stringify(step.output, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="btn btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
