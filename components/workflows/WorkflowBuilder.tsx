'use client';

import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Play, Power, ArrowLeft, History, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, AlertCircle, Users, Trash2, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Workflow } from '@/types';

// Import custom nodes
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import DelayNode from './nodes/DelayNode';

// Import other components
import WorkflowSidebar from './WorkflowSidebar';
import NodeConfigPanel from './panels/NodeConfigPanel';
import WorkflowExecutionLog from './WorkflowExecutionLog';
import ErrorBoundary from '@/components/ErrorBoundary';

// Built-in automation support
import {
  automationToWorkflowDefinition,
  workflowDefinitionToTemplates,
  getAutomationMeta,
} from '@/lib/automations/to-workflow-definition';
import {
  NEW_LEAD_TEMPLATES,
  BOOKING_TEMPLATES,
  NURTURING_TEMPLATES,
} from '@/lib/automations/templates';

interface WorkflowBuilderProps {
  workflowId?: string;
  /** When set, loads/saves a built-in automation instead of a custom workflow */
  builtinAutomationId?: string;
  accountId: string;
  userId: string;
  onBack: () => void;
}

// Define custom node types for ReactFlow
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

const BUILTIN_DEFAULT_TEMPLATES: Record<string, any[]> = {
  new_lead: NEW_LEAD_TEMPLATES,
  booking_reminders: BOOKING_TEMPLATES,
  nurturing: NURTURING_TEMPLATES,
};

export default function WorkflowBuilder({ workflowId, builtinAutomationId, accountId, userId, onBack }: WorkflowBuilderProps) {
  const isBuiltin = !!builtinAutomationId;
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowTriggerType, setWorkflowTriggerType] = useState<string>('contact_created');
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showExecutionLog, setShowExecutionLog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Inline execution logs panel
  const [showInlineLogs, setShowInlineLogs] = useState(false);
  const [inlineExecutions, setInlineExecutions] = useState<any[]>([]);
  const [inlineLogsLoading, setInlineLogsLoading] = useState(false);
  const [expandedInlineId, setExpandedInlineId] = useState<string | null>(null);

  // Enrollments panel (built-in automations only)
  const [showEnrollments, setShowEnrollments] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollmentMessages, setEnrollmentMessages] = useState<any[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  const loadEnrollments = async () => {
    if (!builtinAutomationId) return;
    setEnrollmentsLoading(true);
    try {
      const res = await fetch(
        `/api/automations/enrollments?accountId=${accountId}&automationId=${builtinAutomationId}`
      );
      const data = await res.json();
      setEnrollments(data.enrollments || []);
      setEnrollmentMessages(data.recentMessages || []);
    } catch {
      // silently fail
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const removeEnrollment = async (contactId: string) => {
    if (!window.confirm('Remove this contact from the automation? They will stop receiving messages.')) return;
    try {
      const res = await fetch(
        `/api/automations/enrollments?accountId=${accountId}&contactId=${contactId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      setEnrollments((prev) => prev.filter((e) => e.contact_id !== contactId));
      toast.success('Contact removed from automation');
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  const loadInlineLogs = async () => {
    if (!workflowId) return;
    setInlineLogsLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/executions?accountId=${accountId}`);
      const data = await res.json();
      setInlineExecutions((data.executions || []).slice(0, 10));
    } catch {
      // silently fail
    } finally {
      setInlineLogsLoading(false);
    }
  };

  const inlineStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
    if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-600" />;
    if (status === 'running') return <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />;
    return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
  };

  const inlineStatusBadge = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'failed') return 'bg-red-100 text-red-700';
    if (status === 'running') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmtDuration = (start: string, end?: string) => {
    const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  // Load existing workflow or built-in automation; initialise defaults for new workflows
  useEffect(() => {
    if (builtinAutomationId) {
      loadBuiltinAutomation();
    } else if (workflowId) {
      loadWorkflow();
    } else {
      // New custom workflow — pre-populate trigger + assign_user + create_opportunity
      const triggerNode: Node = {
        id: 'trigger-default',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Contact Created', stepType: 'contact_created', config: {} },
      };
      const assignNode: Node = {
        id: 'action-assign-default',
        type: 'action',
        position: { x: 250, y: 180 },
        data: { label: 'Assign User', stepType: 'assign_user', config: { assignmentType: 'specific', userId } },
      };
      const opportunityNode: Node = {
        id: 'action-opportunity-default',
        type: 'action',
        position: { x: 250, y: 310 },
        data: { label: 'Create Opportunity', stepType: 'create_opportunity', config: {} },
      };
      setNodes([triggerNode, assignNode, opportunityNode]);
      setEdges([
        { id: 'e-trigger-assign', source: 'trigger-default', target: 'action-assign-default', type: 'smoothstep' },
        { id: 'e-assign-opportunity', source: 'action-assign-default', target: 'action-opportunity-default', type: 'smoothstep' },
      ]);
    }
  }, [workflowId, builtinAutomationId]);

  const loadBuiltinAutomation = async () => {
    const meta = getAutomationMeta(builtinAutomationId!);
    setWorkflowName(meta.name);
    setWorkflowTriggerType(meta.triggerStepType);

    try {
      const res = await fetch(
        `/api/automations/configs?accountId=${accountId}&automationId=${builtinAutomationId}`
      );
      const data = await res.json();
      const customTemplates = data?.templates;
      const templates =
        Array.isArray(customTemplates) && customTemplates.length > 0
          ? customTemplates
          : BUILTIN_DEFAULT_TEMPLATES[builtinAutomationId!] ?? [];

      const { nodes: n, edges: e } = automationToWorkflowDefinition(builtinAutomationId!, templates);
      setNodes(n);
      setEdges(e);
    } catch {
      // Fall back to defaults
      const defaults = BUILTIN_DEFAULT_TEMPLATES[builtinAutomationId!] ?? [];
      const { nodes: n, edges: e } = automationToWorkflowDefinition(builtinAutomationId!, defaults);
      setNodes(n);
      setEdges(e);
    }
  };

  const loadWorkflow = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}?accountId=${accountId}`);
      const { workflow: data } = await response.json();

      if (data) {
        setWorkflowName(data.name);
        setWorkflowTriggerType(data.trigger_type);
        setIsActive(data.is_active);

        if (data.workflow_definition) {
          setNodes(data.workflow_definition.nodes || []);
          setEdges(data.workflow_definition.edges || []);
        }
      }
    } catch (error) {
      console.error('Error loading workflow:', error);
      toast.error('Failed to load workflow');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      setIsDirty(true);
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle drag from sidebar to add new nodes
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const stepType = event.dataTransfer.getData('stepType');
      const label = event.dataTransfer.getData('label');

      if (!type || !stepType) return;

      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: label || stepType,
          stepType,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, newData: any) => {
      setIsDirty(true);
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...newData,
              },
            };
          }
          return node;
        })
      );

      // Update selected node if it's the one being edited
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode({
          ...selectedNode,
          data: {
            ...selectedNode.data,
            ...newData,
          },
        });
      }
    },
    [setNodes, selectedNode]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setIsDirty(true);
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }

    if (nodes.length === 0) {
      toast.error('Please add at least one node to the workflow');
      return;
    }

    setIsSaving(true);

    // ── Built-in automation: save templates extracted from the graph ──
    if (isBuiltin) {
      try {
        const templates = workflowDefinitionToTemplates({ nodes, edges });
        const res = await fetch('/api/automations/configs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            automationId: builtinAutomationId,
            templates,
          }),
        });
        if (!res.ok) throw new Error('Failed to save');
        setIsDirty(false);
        toast.success('Automation saved!');
      } catch (error) {
        console.error('Error saving automation:', error);
        toast.error('Failed to save automation. Please try again.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // ── Custom workflow ──
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      toast.error('Workflow must have a trigger node');
      setIsSaving(false);
      return;
    }

    try {
      const workflowData = {
        accountId,
        name: workflowName,
        triggerType: workflowTriggerType,
        workflowDefinition: { nodes, edges },
        isActive,
        createdBy: userId,
      };

      const url = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows';
      const method = workflowId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) throw new Error('Failed to save workflow');

      const { workflow: data } = await response.json();
      setIsDirty(false);
      toast.success(`Workflow ${workflowId ? 'updated' : 'created'} successfully!`);

      if (!workflowId && data?.id) {
        window.location.href = `?workflow=${data.id}`;
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const testWorkflow = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow before testing');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`/api/workflows/${workflowId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        throw new Error('Failed to test workflow');
      }

      const { data } = await response.json();
      toast.success(`Test triggered — execution ID: ${data.executionId}`);
    } catch (error) {
      console.error('Error testing workflow:', error);
      toast.error('Failed to test workflow. Make sure it is saved first.');
    } finally {
      setIsTesting(false);
    }
  };

  const toggleActive = async () => {
    if (!workflowId) {
      toast.error('Please save the workflow before activating');
      return;
    }

    const newActiveState = !isActive;
    setIsActive(newActiveState);

    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          isActive: newActiveState,
        }),
      });

      toast.success(`Workflow ${newActiveState ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling workflow:', error);
      setIsActive(!newActiveState); // Revert on error
      toast.error('Failed to update workflow status');
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Node Palette */}
      <WorkflowSidebar />

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
                onBack();
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Back to workflows"
              aria-label="Back to workflows"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              {isBuiltin ? (
                <>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{workflowName}</p>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                    Built-in
                  </span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-none focus:outline-none focus:ring-0 bg-transparent"
                    placeholder="Workflow name"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">Trigger:</label>
                    <select
                      value={workflowTriggerType}
                      onChange={(e) => setWorkflowTriggerType(e.target.value)}
                      className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-[#3a3a3c] dark:text-gray-200"
                    >
                      <option value="contact_created">Contact Created</option>
                      <option value="contact_updated">Contact Updated</option>
                      <option value="booking_created">Booking Created</option>
                      <option value="deal_created">Deal Created</option>
                      <option value="deal_stage_changed">Deal Stage Changed</option>
                      <option value="deal_won">Deal Won</option>
                      <option value="deal_lost">Deal Lost</option>
                      <option value="manual">Manual Trigger</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isBuiltin && (
              <>
                <button
                  onClick={() => setShowExecutionLog(true)}
                  disabled={!workflowId}
                  className="btn btn-secondary flex items-center gap-2"
                  title="View execution history"
                >
                  <History className="w-4 h-4" />
                  History
                </button>
                <button
                  onClick={testWorkflow}
                  disabled={isTesting || !workflowId}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {isTesting ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={toggleActive}
                  disabled={!workflowId}
                  className={`btn flex items-center gap-2 ${
                    isActive
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'btn-secondary'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </>
            )}
            {isDirty && (
              <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
            )}
            <button
              onClick={saveWorkflow}
              disabled={isSaving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div className="flex-1 bg-gray-50 dark:bg-[#1c1c1e]" onDragOver={onDragOver} onDrop={onDrop}>
          <ErrorBoundary label="ReactFlow canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger':
                    return '#10b981';
                  case 'action':
                    return '#3b82f6';
                  case 'condition':
                    return '#f59e0b';
                  case 'delay':
                    return '#f97316';
                  default:
                    return '#6b7280';
                }
              }}
            />
          </ReactFlow>
          </ErrorBoundary>
        </div>

        {/* Enrollments Panel (built-in automations only) */}
        {isBuiltin && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c2c2e] shrink-0">
            <button
              onClick={() => {
                const next = !showEnrollments;
                setShowEnrollments(next);
                if (next && enrollments.length === 0) loadEnrollments();
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span>Enrollments</span>
                {enrollments.length > 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                    {enrollments.length} active
                  </span>
                )}
              </div>
              {showEnrollments
                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {showEnrollments && (
              <div className="border-t border-gray-100 dark:border-gray-700" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {enrollmentsLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                ) : (
                  <div className="p-3 space-y-4">
                    {/* Active contacts */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Active Contacts ({enrollments.length})</p>
                      {enrollments.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No contacts currently enrolled.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {enrollments.map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg text-sm">
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-gray-800 dark:text-gray-200">{e.contact_name}</span>
                                {e.next_message_at && (
                                  <span className="ml-2 text-xs text-gray-400">
                                    Next: {new Date(e.next_message_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 shrink-0">
                                {new Date(e.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <button
                                onClick={() => removeEnrollment(e.contact_id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors shrink-0"
                                title="Remove from automation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent messages */}
                    {enrollmentMessages.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Recent Messages</p>
                        <div className="space-y-1.5">
                          {enrollmentMessages.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg text-xs">
                              {m.type === 'email'
                                ? <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                : <MessageSquare className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                              <span className="font-medium text-gray-800 dark:text-gray-200 shrink-0">{m.contact_name}</span>
                              <span className="text-gray-400 truncate flex-1">{m.subject || m.body?.slice(0, 60)}</span>
                              <span className={`px-1.5 py-0.5 rounded shrink-0 font-medium ${
                                m.status === 'sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : m.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                : m.status === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                              }`}>
                                {m.status}
                              </span>
                              {m.sent_at && (
                                <span className="text-gray-400 shrink-0">
                                  {new Date(m.sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Inline Execution Logs Panel */}
        {!isBuiltin && workflowId && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2c2c2e] shrink-0">
            <button
              onClick={() => {
                const next = !showInlineLogs;
                setShowInlineLogs(next);
                if (next && inlineExecutions.length === 0) loadInlineLogs();
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <span>Execution Logs</span>
                {inlineExecutions.length > 0 && (
                  <span className="text-xs text-gray-400">({inlineExecutions.length})</span>
                )}
              </div>
              {showInlineLogs
                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {showInlineLogs && (
              <div className="h-56 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
                {inlineLogsLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
                ) : inlineExecutions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">No executions yet. Test or trigger this workflow to see logs.</div>
                ) : (
                  <div className="p-3 space-y-2">
                    {inlineExecutions.map((ex) => (
                      <div key={ex.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-sm">
                        <div
                          className="px-3 py-2 bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-between"
                          onClick={() => setExpandedInlineId(expandedInlineId === ex.id ? null : ex.id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {inlineStatusIcon(ex.status)}
                            <span className="font-medium text-gray-800 dark:text-gray-200 shrink-0">{fmtDate(ex.started_at)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${inlineStatusBadge(ex.status)}`}>
                              {ex.status}
                            </span>
                            <span className="text-gray-400 text-xs shrink-0">{fmtDuration(ex.started_at, ex.completed_at)}</span>
                          </div>
                          {expandedInlineId === ex.id
                            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        </div>
                        {expandedInlineId === ex.id && (
                          <div className="px-3 py-2 space-y-1.5 bg-white dark:bg-[#2c2c2e] border-t border-gray-100 dark:border-gray-700">
                            {ex.workflow_step_executions?.length === 0 ? (
                              <p className="text-xs text-gray-500">No steps recorded.</p>
                            ) : (
                              ex.workflow_step_executions?.map((step: any, i: number) => (
                                <div key={`${step.step_id}-${i}`} className="flex items-start gap-2 p-1.5 bg-gray-50 dark:bg-white/5 rounded">
                                  <div className="mt-0.5 shrink-0">
                                    {step.status === 'completed'
                                      ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                      : step.status === 'failed'
                                      ? <XCircle className="w-3.5 h-3.5 text-red-600" />
                                      : <Clock className="w-3.5 h-3.5 text-gray-400" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize">
                                      {step.step_type?.replace(/_/g, ' ')}
                                    </div>
                                    {step.error && (
                                      <div className="text-xs text-red-600 mt-0.5">{step.error}</div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar - Node Configuration */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
          onDelete={() => deleteNode(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
          accountId={accountId}
        />
      )}

      {/* Execution History Modal */}
      {showExecutionLog && workflowId && (
        <WorkflowExecutionLog
          workflowId={workflowId}
          accountId={accountId}
          onClose={() => setShowExecutionLog(false)}
        />
      )}
    </div>
  );
}
