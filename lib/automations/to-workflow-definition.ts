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
    triggerStepType: 'contact_created',
  },
  booking_reminders: {
    name: 'Booking Reminders',
    triggerLabel: 'Booking Confirmed',
    triggerStepType: 'booking_created',
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

// Normalize any template format (MessageTemplate / BookingTemplate / NurturingTemplate)
// into a flat shape the converter can iterate uniformly.
interface NormalizedStep {
  type: 'sms' | 'email';
  delayMs: number;
  subject?: string;
  body: string;
}

function normalizeTemplates(templates: any[]): NormalizedStep[] {
  const out: NormalizedStep[] = [];
  for (const t of templates) {
    // Skip escalation markers
    if (t.type === 'nurturing_escalation') continue;

    let delayMs: number;
    if (typeof t.delayMs === 'number') {
      // MessageTemplate — delayMs is relative to enrollment start
      delayMs = t.delayMs;
    } else if (typeof t.offsetMs === 'number') {
      // BookingTemplate — isImmediate means 0, negative offset = before call
      delayMs = t.isImmediate ? 0 : Math.abs(t.offsetMs);
    } else if (typeof t.dayOffset === 'number') {
      // NurturingTemplate — dayOffset is days from enrollment start
      delayMs = t.dayOffset * D;
    } else {
      delayMs = 0;
    }

    out.push({
      type: t.type as 'sms' | 'email',
      delayMs,
      subject: t.subject,
      body: t.body ?? '',
    });
  }
  return out;
}

/**
 * Convert a flat template array (any supported format) into ReactFlow nodes + edges.
 * Layout: vertical column, trigger at top.
 * A Delay node is inserted when the delay value changes between consecutive steps.
 */
export function automationToWorkflowDefinition(
  automationId: string,
  templates: any[]
): WorkflowDefinitionShape {
  const meta = getAutomationMeta(automationId);
  const steps = normalizeTemplates(templates);
  const nodes: any[] = [];
  const edges: any[] = [];
  const x = 300;
  let y = 0;

  // Trigger node
  nodes.push({
    id: 'trigger-1',
    type: 'trigger',
    position: { x, y },
    data: { label: meta.triggerLabel, stepType: meta.triggerStepType, config: {} },
  });
  let prevId = 'trigger-1';
  let lastDelayMs = -1;
  y += 150;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Insert a Delay node when delay changes and is > 0
    if (step.delayMs !== lastDelayMs && step.delayMs > 0) {
      const delayId = `delay-${i}`;
      const d = step.delayMs / D;
      const h = step.delayMs / H;
      const isDays = Number.isInteger(d) && d >= 1;

      nodes.push({
        id: delayId,
        type: 'delay',
        position: { x, y },
        data: {
          label: isDays ? `Wait ${d}d` : `Wait ${h}h`,
          stepType: 'wait_delay',
          config: {
            delayType: 'duration',
            days: isDays ? d : 0,
            hours: isDays ? 0 : h,
            minutes: 0,
          },
        },
      });
      edges.push({ id: `e-${prevId}-${delayId}`, source: prevId, target: delayId });
      prevId = delayId;
      y += 120;
    }

    lastDelayMs = step.delayMs;

    const actionId = `action-${i}`;
    const isSMS = step.type === 'sms';

    nodes.push({
      id: actionId,
      type: 'action',
      position: { x, y },
      data: {
        label: isSMS ? 'Send SMS' : 'Send Email',
        stepType: isSMS ? 'send_sms' : 'send_email',
        config: isSMS
          ? { message: step.body }
          : { body: step.body, subject: step.subject ?? '' },
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
      const cfg = node.data?.config ?? {};
      // Support both { delayType, days, hours, minutes } and { unit, value } formats
      if (cfg.unit && cfg.value !== undefined) {
        currentDelayMs =
          cfg.unit === 'days' ? cfg.value * D :
          cfg.unit === 'hours' ? cfg.value * H :
          cfg.value * 60 * 1000;
      } else {
        currentDelayMs =
          ((cfg.days || 0) * 24 * 60 + (cfg.hours || 0) * 60 + (cfg.minutes || 0)) * 60 * 1000;
      }
    } else if (node.type === 'action') {
      const { stepType, config } = node.data ?? {};
      if (stepType === 'send_sms') {
        templates.push({ type: 'sms', delayMs: currentDelayMs, body: config?.message ?? '' });
      } else if (stepType === 'send_email') {
        templates.push({
          type: 'email',
          delayMs: currentDelayMs,
          subject: config?.subject ?? '',
          // Support both 'body' key (from EmailActionConfig) and legacy 'message' key
          body: config?.body ?? config?.message ?? '',
        });
      }
    }

    currentId = nextId;
  }

  return templates;
}
