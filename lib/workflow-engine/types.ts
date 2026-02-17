// Workflow execution types

export interface WorkflowContext {
  accountId: string;
  contactId?: string;
  dealId?: string;
  userId?: string;
  triggerType: string;
  triggerData: Record<string, any>;
  variables: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  data?: any;
  nextNodeId?: string;
  shouldStop?: boolean;
}

export interface ActionHandler {
  (context: WorkflowContext, config: Record<string, any>): Promise<ExecutionResult>;
}

export interface ConditionEvaluator {
  (context: WorkflowContext, config: Record<string, any>): Promise<boolean>;
}

export interface WorkflowExecutionLog {
  executionId: string;
  workflowId: string;
  accountId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  steps: StepExecutionLog[];
}

export interface StepExecutionLog {
  stepId: string;
  stepType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  output?: any;
}

export interface DelayedJob {
  id: string;
  workflowExecutionId: string;
  workflowId: string;
  accountId: string;
  nodeId: string;
  scheduledAt: Date;
  context: WorkflowContext;
  status: 'pending' | 'completed' | 'failed';
}
