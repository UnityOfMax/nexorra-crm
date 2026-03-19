import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { AGENT_DEFINITIONS, DEPARTMENTS, type DepartmentKey } from '@/lib/agents/definitions';

export interface OrgNode {
  id: string;
  type: 'pa' | 'department' | 'agent';
  data: {
    agentId: string;
    displayName: string;
    model: string;
    department: DepartmentKey;
    role: 'head' | 'agent';
    schedule?: string;
    status?: 'running' | 'completed' | 'failed' | 'idle';
    deptColor: string;
    deptIcon: string;
    deptLabel: string;
  };
  position: { x: number; y: number };
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 72;
const DEPT_NODE_WIDTH = 180;
const DEPT_NODE_HEIGHT = 80;
const PA_NODE_WIDTH = 200;
const PA_NODE_HEIGHT = 88;

export function buildOrgGraph(): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40, edgesep: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Add Lena (PA) at top
  const lenaDef = AGENT_DEFINITIONS['lena'];
  if (lenaDef) {
    g.setNode('lena', { width: PA_NODE_WIDTH, height: PA_NODE_HEIGHT });
    nodes.push({
      id: 'lena',
      type: 'paNode',
      position: { x: 0, y: 0 },
      data: {
        agentId: 'lena',
        displayName: 'Lena',
        model: 'sonnet',
        department: 'executive' as DepartmentKey,
        role: 'head',
        schedule: 'Always-on',
        deptColor: DEPARTMENTS.executive.color,
        deptIcon: DEPARTMENTS.executive.icon,
        deptLabel: DEPARTMENTS.executive.label,
      },
    });
  }

  // Add department heads and their agents
  const deptKeys = Object.keys(DEPARTMENTS).filter(d => d !== 'executive') as DepartmentKey[];

  for (const deptKey of deptKeys) {
    const dept = DEPARTMENTS[deptKey];
    const deptAgents = Object.entries(AGENT_DEFINITIONS)
      .filter(([, def]) => def.department === deptKey);

    const head = deptAgents.find(([, def]) => def.role === 'head');
    const agents = deptAgents.filter(([, def]) => def.role === 'agent');

    if (head) {
      const [headId, headDef] = head;
      g.setNode(headId, { width: DEPT_NODE_WIDTH, height: DEPT_NODE_HEIGHT });
      nodes.push({
        id: headId,
        type: 'departmentNode',
        position: { x: 0, y: 0 },
        data: {
          agentId: headId,
          displayName: headDef.displayName,
          model: headDef.model,
          department: deptKey,
          role: 'head',
          schedule: headDef.schedule,
          deptColor: dept.color,
          deptIcon: dept.icon,
          deptLabel: dept.label,
        },
      });

      // Edge from Lena to head
      g.setEdge('lena', headId);
      edges.push({
        id: `lena-${headId}`,
        source: 'lena',
        target: headId,
        type: 'orgEdge',
        animated: false,
      });

      // Add sub-agents
      for (const [agentId, agentDef] of agents) {
        g.setNode(agentId, { width: NODE_WIDTH, height: NODE_HEIGHT });
        nodes.push({
          id: agentId,
          type: 'agentNode',
          position: { x: 0, y: 0 },
          data: {
            agentId: agentId,
            displayName: agentDef.displayName,
            model: agentDef.model,
            department: deptKey,
            role: 'agent',
            schedule: agentDef.schedule,
            deptColor: dept.color,
            deptIcon: dept.icon,
            deptLabel: dept.label,
          },
        });

        g.setEdge(headId, agentId);
        edges.push({
          id: `${headId}-${agentId}`,
          source: headId,
          target: agentId,
          type: 'orgEdge',
          animated: false,
        });
      }
    }
  }

  // Run dagre layout
  dagre.layout(g);

  // Apply computed positions
  for (const node of nodes) {
    const gNode = g.node(node.id);
    if (gNode) {
      node.position = {
        x: gNode.x - (gNode.width || NODE_WIDTH) / 2,
        y: gNode.y - (gNode.height || NODE_HEIGHT) / 2,
      };
    }
  }

  return { nodes, edges };
}
