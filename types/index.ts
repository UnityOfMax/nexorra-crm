export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  name: string;
  slug: string;
  type: 'agency' | 'client';
  parent_account_id?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  settings?: AccountSettings;
}

export interface AccountSettings {
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  email_config?: {
    from_name?: string;
    from_email?: string;
    smtp_host?: string;
    smtp_port?: number;
  };
  sms_config?: {
    twilio_account_sid?: string;
    twilio_auth_token?: string;
    twilio_phone_number?: string;
  };
  google_calendar?: {
    enabled: boolean;
    user_email: string;
    access_token: string;
    refresh_token: string;
    token_expiry: string;
    calendar_id: string;
    last_sync_at?: string;
  };
}

export interface Contact {
  id: string;
  account_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  status: 'lead' | 'customer' | 'lost';
  source?: string;
  tags?: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  account_id: string;
  contact_id?: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date?: string;
  status: 'open' | 'won' | 'lost';
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  account_id: string;
  contact_id?: string;
  deal_id?: string;
  type: 'email' | 'call' | 'sms' | 'meeting' | 'note';
  subject?: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LandingPage {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  content: any; // JSON structure for page builder
  published: boolean;
  meta_title?: string;
  meta_description?: string;
  tracking_pixels?: TrackingPixel[];
  created_at: string;
  updated_at: string;
}

export interface TrackingPixel {
  id: string;
  name: string;
  type: 'facebook' | 'google' | 'linkedin' | 'custom';
  code: string;
}

export interface EmailCampaign {
  id: string;
  account_id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  html_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountMember {
  id: string;
  account_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

// ============================================================================
// PIPELINE & WORKFLOW AUTOMATION TYPES
// ============================================================================

// Pipeline Types
export interface Pipeline {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  type: 'sales' | 'hiring' | 'support' | 'custom';
  is_default: boolean;
  position: number;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  probability: number;
  is_closed: boolean;
  is_won: boolean;
  created_at: string;
  updated_at: string;
}

// Extended Deal interface with new pipeline fields
export interface DealExtended extends Deal {
  pipeline_id?: string;
  pipeline_stage_id?: string;
  assigned_to?: string;
  lost_reason?: string;
  won_at?: string;
  lost_at?: string;
}

// Workflow Types
export type WorkflowTriggerType =
  | 'contact_created'
  | 'contact_updated'
  | 'contact_status_changed'
  | 'deal_created'
  | 'deal_updated'
  | 'deal_stage_changed'
  | 'tag_added'
  | 'tag_removed'
  | 'form_submitted'
  | 'manual';

export type WorkflowStepType =
  | 'send_email'
  | 'send_sms'
  | 'add_tag'
  | 'remove_tag'
  | 'update_contact'
  | 'update_deal'
  | 'move_deal_stage'
  | 'assign_user'
  | 'create_task'
  | 'wait_delay'
  | 'wait_until'
  | 'condition'
  | 'webhook';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  position: { x: number; y: number };
  data: {
    label: string;
    stepType: WorkflowTriggerType | WorkflowStepType;
    config: Record<string, any>;
    icon?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'true' | 'false'; // For condition branches
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface Workflow {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, any>;
  workflow_definition: WorkflowDefinition;
  version: number;
  last_triggered_at?: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  account_id: string;
  contact_id?: string;
  deal_id?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  trigger_data: Record<string, any>;
  current_step_index: number;
  steps_completed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface WorkflowStepExecution {
  id: string;
  execution_id: string;
  step_id: string;
  step_type: WorkflowStepType;
  step_config: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result: Record<string, any>;
  error_message?: string;
  retry_count: number;
  execute_at: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface WorkflowDelayedJob {
  id: string;
  execution_id: string;
  step_execution_id?: string;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: Record<string, any>;
  error_message?: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  updated_at: string;
}

// Message interface for conversations (SMS/Email)
export interface Message {
  id: string;
  account_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  type: 'sms' | 'email' | 'call' | 'voicemail';
  content: string;
  from_address: string;
  to_address: string;
  status: string;
  external_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Google Calendar Integration
export interface GoogleCalendarSyncMapping {
  id: string;
  account_id: string;
  activity_id: string;
  google_event_id: string;
  last_synced_at: string;
  sync_direction: 'crm_to_google' | 'google_to_crm';
}
