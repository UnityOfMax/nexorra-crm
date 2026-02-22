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
import { Save, Play, Power, ArrowLeft, History } from 'lucide-react';
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

  // Load existing workflow or built-in automation
  useEffect(() => {
    if (builtinAutomationId) {
      loadBuiltinAutomation();
    } else if (workflowId) {
      loadWorkflow();
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
      const customTemplates = data?.config?.templates;
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
      const { data } = await response.json();

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
      alert('Failed to load workflow');
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
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
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    if (nodes.length === 0) {
      alert('Please add at least one node to the workflow');
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
        alert('Automation saved!');
      } catch (error) {
        console.error('Error saving automation:', error);
        alert('Failed to save automation. Please try again.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // ── Custom workflow ──
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      alert('Workflow must have a trigger node');
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
      };

      const url = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows';
      const method = workflowId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) throw new Error('Failed to save workflow');

      const { data } = await response.json();
      alert(`Workflow ${workflowId ? 'updated' : 'created'} successfully!`);

      if (!workflowId && data?.id) {
        window.location.href = `?workflow=${data.id}`;
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const testWorkflow = async () => {
    if (!workflowId) {
      alert('Please save the workflow before testing');
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
      alert(`Workflow test completed! Execution ID: ${data.executionId}`);
    } catch (error) {
      console.error('Error testing workflow:', error);
      alert('Failed to test workflow. Make sure it is saved first.');
    } finally {
      setIsTesting(false);
    }
  };

  const toggleActive = async () => {
    if (!workflowId) {
      alert('Please save the workflow before activating');
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

      alert(`Workflow ${newActiveState ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling workflow:', error);
      setIsActive(!newActiveState); // Revert on error
      alert('Failed to update workflow status');
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Node Palette */}
      <WorkflowSidebar />

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to workflows"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              {isBuiltin ? (
                <>
                  <p className="text-lg font-semibold text-gray-900">{workflowName}</p>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    Always On
                  </span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="text-lg font-semibold text-gray-900 border-none focus:outline-none focus:ring-0 bg-transparent"
                    placeholder="Workflow name"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <label className="text-xs text-gray-600">Trigger:</label>
                    <select
                      value={workflowTriggerType}
                      onChange={(e) => setWorkflowTriggerType(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
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
        <div className="flex-1 bg-gray-50" onDragOver={onDragOver} onDrop={onDrop}>
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
        </div>
      </div>

      {/* Right Sidebar - Node Configuration */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
          onDelete={() => deleteNode(selectedNode.id)}
          onClose={() => setSelectedNode(null)}
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
