/**
 * Shared types for Command Center V2.
 */

export interface AgentRun {
  id: string;
  agent_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  num_turns: number | null;
  error_message: string | null;
  summary: string | null;
}

export interface AgentConfig {
  id: string;
  name: string;
  display_name: string | null;
  department: string | null;
  role: string | null;
  is_enabled: boolean;
  latest_run: AgentRun | null;
  avg_duration: number;
}

export interface LogEvent {
  type: string;
  subtype?: string;
  text?: string;
  content?: string;
  blocks?: Array<{
    type: string;
    text?: string;
    tool?: string;
    input?: string;
    output?: string;
    is_error?: boolean;
  }>;
  result_text?: string;
  cost_usd?: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  assigned_agent: string | null;
  assigned_department: string | null;
  created_at: string;
}

export type TabKey = 'layout' | 'clocked-in' | 'clocked-out' | 'tasks';
