/**
 * Bidirectional converter between automation MessageTemplate[] and
 * ReactFlow WorkflowDefinition (nodes + edges).
 *
 * templates  →  automationToWorkflowDefinition()  →  ReactFlow nodes/edges
 * ReactFlow nodes/edges  →  workflowDefinitionToTemplates()  →  templates
 */

import type { MessageTemplate } from './templates';

export interface WorkflowDefinitionShape {
  nodes: any[];
  edges: any[];
}

const H = 60 * 60 * 1000;
const D = 24 * H;

const AUTOMATION_META: Record<string, { name: string; triggerLabel: string; triggerStepType: string }> = {
  new_lead: {
    name: 'New Lead Follow-up',
    triggerLabel: 'New Lead Form Submitted',
    triggerStepType: 'form_submitted',
  },
  booking_reminders: {
    name: 'Booking Reminders',
    triggerLabel: 'Booking Confirmed',
    triggerStepType: 'deal_stage_changed',
  },
  nurturing: {
    name: 'Nurturing Sequence',
    triggerLabel: 'Start Nurturing Sequence',
    triggerStepType: 'manual',
  },
};

export function getAutomationMeta(automationId: string) {
  return AUTOMATION_META[automationId] ?? AUTOMATION_META.new_lead;
}

/**
 * Convert a flat MessageTemplate array into ReactFlow nodes + edges.
 * Layout: vertical column, trigger at top.
 * A Delay node is inserted when the delay value changes between consecutive templates.
 * nurturing_escalation entries are rendered as a special action node.
 */
export function automationToWorkflowDefinition(
  automationId: string,
  templates: MessageTemplate[]
): WorkflowDefinitionShape {
  const meta = getAutomationMeta(automationId);
  const nodes: any[] = [];
  const edges: any[] = [];
  const x = 300;
  let y = 0;

  // Trigger
  nodes.push({
    id: 'trigger-1',
    type: 'trigger',
    position: { x, y },
    data: { label: meta.triggerLabel, stepType: meta.triggerStepType, config: {} },
  });
  let prevId = 'trigger-1';
  let lastDelayMs = -1;
  y += 150;

  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];

    // Skip nurturing_escalation in the visual (it's a control flow signal, not a message)
    if (tmpl.type === 'nurturing_escalation') continue;

    // Insert a Delay node when delay changes and is > 0
    if (tmpl.delayMs !== lastDelayMs && tmpl.delayMs > 0) {
      const delayId = `delay-${i}`;
      const d = tmpl.delayMs / D;
      const h = tmpl.delayMs / H;
      const isDays = Number.isInteger(d) && d >= 1;

      nodes.push({
        id: delayId,
        type: 'delay',
        position: { x, y },
        data: {
          label: isDays ? `Wait ${d}d` : `Wait ${h}h`,
          stepType: 'wait_delay',
          config: { unit: isDays ? 'days' : 'hours', value: isDays ? d : h },
        },
      });
      edges.push({ id: `e-${prevId}-${delayId}`, source: prevId, target: delayId });
      prevId = delayId;
      y += 120;
    }

    lastDelayMs = tmpl.delayMs;

    const actionId = `action-${i}`;
    const isSMS = tmpl.type === 'sms';

    nodes.push({
      id: actionId,
      type: 'action',
      position: { x, y },
      data: {
        label: isSMS ? 'Send SMS' : 'Send Email',
        stepType: isSMS ? 'send_sms' : 'send_email',
        config: { message: tmpl.body, subject: tmpl.subject ?? '' },
      },
    });
    edges.push({ id: `e-${prevId}-${actionId}`, source: prevId, target: actionId });
    prevId = actionId;
    y += 120;
  }

  return { nodes, edges };
}

/**
 * Walk the ReactFlow graph linearly and reconstruct MessageTemplate[].
 * Assumes a linear (non-branching) flow.
 */
export function workflowDefinitionToTemplates(
  definition: WorkflowDefinitionShape
): MessageTemplate[] {
  const { nodes, edges } = definition;
  const templates: MessageTemplate[] = [];

  // Build simple adjacency (source → first target)
  const adj = new Map<string, string>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, edge.target);
  }

  const trigger = nodes.find((n: any) => n.type === 'trigger');
  if (!trigger) return templates;

  let currentId: string = trigger.id;
  let currentDelayMs = 0;
  const visited = new Set<string>();

  while (true) {
    visited.add(currentId);
    const nextId = adj.get(currentId);
    if (!nextId || visited.has(nextId)) break;

    const node = nodes.find((n: any) => n.id === nextId);
    if (!node) break;

    if (node.type === 'delay') {
      const { value = 0, unit = 'hours' } = node.data?.config ?? {};
      currentDelayMs =
        unit === 'days' ? value * D :
        unit === 'hours' ? value * H :
        value * 60 * 1000;
    } else if (node.type === 'action') {
      const { stepType, config } = node.data ?? {};
      if (stepType === 'send_sms') {
        templates.push({ type: 'sms', delayMs: currentDelayMs, body: config?.message ?? '' });
      } else if (stepType === 'send_email') {
        templates.push({
          type: 'email',
          delayMs: currentDelayMs,
          subject: config?.subject ?? '',
          body: config?.message ?? '',
        });
      }
    }

    currentId = nextId;
  }

  return templates;
}
