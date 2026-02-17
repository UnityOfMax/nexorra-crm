-- ============================================================================
-- AUTOMATION WORKFLOWS & PIPELINE SYSTEM MIGRATION
-- ============================================================================
-- This migration adds complete workflow automation and pipeline management
-- Features: Visual workflow builder, pipeline Kanban boards, triggers, actions,
-- conditional branching, delayed jobs, and execution logging
-- ============================================================================

-- ============================================================================
-- PHASE 1: PIPELINE SYSTEM
-- ============================================================================

-- Pipelines Table - Define custom sales/hiring/support pipelines per account
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'sales' CHECK (type IN ('sales', 'hiring', 'support', 'custom')),
  is_default BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0, -- For ordering multiple pipelines
  settings JSONB DEFAULT '{}'::jsonb, -- For future pipeline-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(account_id, name)
);

-- Pipeline Stages Table - Stages within each pipeline (e.g., Lead, Qualified, Won)
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Hex color for visual representation
  position INTEGER NOT NULL, -- Order within the pipeline
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  is_closed BOOLEAN DEFAULT FALSE, -- Whether this stage represents a closed deal
  is_won BOOLEAN DEFAULT FALSE, -- If is_closed, whether it's won or lost
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(pipeline_id, position)
);

-- Refactor Deals Table to use pipeline_stage_id instead of freeform stage
-- We'll keep the old stage column temporarily for backward compatibility
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='pipeline_id') THEN
    ALTER TABLE public.deals ADD COLUMN pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='pipeline_stage_id') THEN
    ALTER TABLE public.deals ADD COLUMN pipeline_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='assigned_to') THEN
    ALTER TABLE public.deals ADD COLUMN assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='lost_reason') THEN
    ALTER TABLE public.deals ADD COLUMN lost_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='won_at') THEN
    ALTER TABLE public.deals ADD COLUMN won_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deals' AND column_name='lost_at') THEN
    ALTER TABLE public.deals ADD COLUMN lost_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create indexes for pipeline queries
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_stage ON public.deals(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON public.deals(assigned_to);

-- ============================================================================
-- PHASE 2: WORKFLOW AUTOMATION SYSTEM
-- ============================================================================

-- Workflows Table - The automation definitions
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'contact_created',
    'contact_updated',
    'contact_status_changed',
    'deal_created',
    'deal_updated',
    'deal_stage_changed',
    'tag_added',
    'tag_removed',
    'form_submitted',
    'manual'
  )),
  trigger_config JSONB DEFAULT '{}'::jsonb, -- Specific trigger conditions (e.g., which stage)
  workflow_definition JSONB NOT NULL, -- The visual workflow structure (nodes and edges)
  version INTEGER DEFAULT 1,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Workflow Executions - Log every time a workflow runs
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  trigger_data JSONB DEFAULT '{}'::jsonb, -- What triggered this execution
  current_step_index INTEGER DEFAULT 0,
  steps_completed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Workflow Step Executions - Log each step/action in a workflow
CREATE TABLE IF NOT EXISTS public.workflow_step_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE NOT NULL,
  step_id TEXT NOT NULL, -- The node ID from workflow_definition
  step_type TEXT NOT NULL CHECK (step_type IN (
    'send_email',
    'send_sms',
    'add_tag',
    'remove_tag',
    'update_contact',
    'update_deal',
    'move_deal_stage',
    'assign_user',
    'create_task',
    'wait_delay',
    'wait_until',
    'condition',
    'webhook'
  )),
  step_config JSONB NOT NULL, -- The action configuration
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  result JSONB DEFAULT '{}'::jsonb, -- Output from the action
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  execute_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()), -- For delayed steps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Delayed Jobs Table - For wait steps and scheduled actions
CREATE TABLE IF NOT EXISTS public.workflow_delayed_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE NOT NULL,
  step_execution_id UUID REFERENCES public.workflow_step_executions(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload JSONB NOT NULL,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pipelines_account ON public.pipelines(account_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON public.pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_workflows_account ON public.workflows(account_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON public.workflows(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_contact ON public.workflow_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_deal ON public.workflow_executions(deal_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution ON public.workflow_step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execute_at ON public.workflow_step_executions(execute_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_workflow_delayed_jobs_scheduled ON public.workflow_delayed_jobs(scheduled_at, status) WHERE status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_delayed_jobs ENABLE ROW LEVEL SECURITY;

-- Pipelines policies
DROP POLICY IF EXISTS "Users can view pipelines in their accounts" ON public.pipelines;
CREATE POLICY "Users can view pipelines in their accounts" ON public.pipelines
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create pipelines in their accounts" ON public.pipelines;
CREATE POLICY "Users can create pipelines in their accounts" ON public.pipelines
  FOR INSERT WITH CHECK (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update pipelines in their accounts" ON public.pipelines;
CREATE POLICY "Users can update pipelines in their accounts" ON public.pipelines
  FOR UPDATE USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete pipelines in their accounts" ON public.pipelines;
CREATE POLICY "Users can delete pipelines in their accounts" ON public.pipelines
  FOR DELETE USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

-- Pipeline stages inherit pipeline permissions
DROP POLICY IF EXISTS "Users can view pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can view pipeline stages" ON public.pipeline_stages
  FOR SELECT USING (
    pipeline_id IN (SELECT id FROM public.pipelines WHERE account_id IN
      (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can create pipeline stages" ON public.pipeline_stages
  FOR INSERT WITH CHECK (
    pipeline_id IN (SELECT id FROM public.pipelines WHERE account_id IN
      (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can update pipeline stages" ON public.pipeline_stages
  FOR UPDATE USING (
    pipeline_id IN (SELECT id FROM public.pipelines WHERE account_id IN
      (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can delete pipeline stages" ON public.pipeline_stages
  FOR DELETE USING (
    pipeline_id IN (SELECT id FROM public.pipelines WHERE account_id IN
      (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

-- Workflows policies
DROP POLICY IF EXISTS "Users can view workflows in their accounts" ON public.workflows;
CREATE POLICY "Users can view workflows in their accounts" ON public.workflows
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create workflows in their accounts" ON public.workflows;
CREATE POLICY "Users can create workflows in their accounts" ON public.workflows
  FOR INSERT WITH CHECK (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update workflows in their accounts" ON public.workflows;
CREATE POLICY "Users can update workflows in their accounts" ON public.workflows
  FOR UPDATE USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete workflows in their accounts" ON public.workflows;
CREATE POLICY "Users can delete workflows in their accounts" ON public.workflows
  FOR DELETE USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

-- Workflow execution policies (read-only for users, system manages these)
DROP POLICY IF EXISTS "Users can view workflow executions in their accounts" ON public.workflow_executions;
CREATE POLICY "Users can view workflow executions in their accounts" ON public.workflow_executions
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
  );

-- Step executions inherit execution permissions
DROP POLICY IF EXISTS "Users can view workflow step executions" ON public.workflow_step_executions;
CREATE POLICY "Users can view workflow step executions" ON public.workflow_step_executions
  FOR SELECT USING (
    execution_id IN (SELECT id FROM public.workflow_executions WHERE account_id IN
      (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

-- Delayed jobs inherit execution permissions
DROP POLICY IF EXISTS "Users can view delayed jobs" ON public.workflow_delayed_jobs;
CREATE POLICY "Users can view delayed jobs" ON public.workflow_delayed_jobs
  FOR SELECT USING (
    execution_id IN (SELECT id FROM public.workflow_executions WHERE account_id IN
      (SELECT account_id FROM public.account_members WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_pipelines_updated_at ON public.pipelines;
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_executions_updated_at ON public.workflow_executions;
CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON public.workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_delayed_jobs_updated_at ON public.workflow_delayed_jobs;
CREATE TRIGGER update_workflow_delayed_jobs_updated_at BEFORE UPDATE ON public.workflow_delayed_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update workflow execution stats
CREATE OR REPLACE FUNCTION update_workflow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.workflows
    SET
      total_executions = total_executions + 1,
      successful_executions = successful_executions + 1,
      last_triggered_at = NEW.started_at
    WHERE id = NEW.workflow_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.workflows
    SET
      total_executions = total_executions + 1,
      failed_executions = failed_executions + 1,
      last_triggered_at = NEW.started_at
    WHERE id = NEW.workflow_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_execution_stats_trigger ON public.workflow_executions;
CREATE TRIGGER workflow_execution_stats_trigger
  AFTER UPDATE ON public.workflow_executions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION update_workflow_stats();

-- Function to get next pending delayed job (for cron processing)
CREATE OR REPLACE FUNCTION get_pending_delayed_jobs(batch_size INTEGER DEFAULT 10)
RETURNS SETOF public.workflow_delayed_jobs AS $$
BEGIN
  RETURN QUERY
  UPDATE public.workflow_delayed_jobs
  SET status = 'processing', updated_at = NOW()
  WHERE id IN (
    SELECT id FROM public.workflow_delayed_jobs
    WHERE status = 'pending'
      AND scheduled_at <= NOW()
      AND attempts < max_attempts
    ORDER BY scheduled_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA MIGRATION: CONVERT EXISTING DEALS TO USE PIPELINES
-- ============================================================================

-- Step 1: Create default pipeline for each account that has deals
INSERT INTO public.pipelines (account_id, name, type, is_default, position)
SELECT DISTINCT
  d.account_id,
  'Default Sales Pipeline',
  'sales',
  true,
  0
FROM public.deals d
WHERE NOT EXISTS (
  SELECT 1 FROM public.pipelines p
  WHERE p.account_id = d.account_id AND p.is_default = true
)
ON CONFLICT (account_id, name) DO NOTHING;

-- Step 2: Create stages based on existing deal.stage values
WITH distinct_stages AS (
  SELECT DISTINCT
    d.account_id,
    COALESCE(d.stage, 'New') as stage,
    ROW_NUMBER() OVER (PARTITION BY d.account_id ORDER BY d.stage) as position
  FROM public.deals d
  WHERE d.stage IS NOT NULL OR d.stage IS NULL
)
INSERT INTO public.pipeline_stages (pipeline_id, name, position, color)
SELECT
  p.id as pipeline_id,
  ds.stage as name,
  ds.position,
  CASE (ds.position - 1) % 5
    WHEN 0 THEN '#3B82F6'  -- Blue
    WHEN 1 THEN '#10B981'  -- Green
    WHEN 2 THEN '#F59E0B'  -- Amber
    WHEN 3 THEN '#8B5CF6'  -- Purple
    ELSE '#EC4899'          -- Pink
  END as color
FROM distinct_stages ds
JOIN public.pipelines p ON p.account_id = ds.account_id AND p.is_default = true
WHERE NOT EXISTS (
  SELECT 1 FROM public.pipeline_stages ps
  WHERE ps.pipeline_id = p.id AND ps.name = ds.stage
);

-- Step 3: Link deals to pipeline and stage
UPDATE public.deals d
SET
  pipeline_id = p.id,
  pipeline_stage_id = ps.id
FROM public.pipelines p
JOIN public.pipeline_stages ps ON ps.pipeline_id = p.id
WHERE d.account_id = p.account_id
  AND p.is_default = true
  AND (ps.name = COALESCE(d.stage, 'New') OR (d.stage IS NULL AND ps.position = 1))
  AND d.pipeline_id IS NULL;  -- Only update if not already set

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- ✅ Created pipelines table for custom sales/hiring/support pipelines
-- ✅ Created pipeline_stages table for stage definitions
-- ✅ Extended deals table with pipeline_id, pipeline_stage_id, assigned_to
-- ✅ Created workflows table for automation definitions
-- ✅ Created workflow_executions table for execution logging
-- ✅ Created workflow_step_executions table for step-level logging
-- ✅ Created workflow_delayed_jobs table for scheduled actions
-- ✅ Added all necessary indexes for performance
-- ✅ Implemented Row Level Security policies
-- ✅ Added triggers for updated_at columns
-- ✅ Created helper functions for workflow stats and job processing
-- ✅ Migrated existing deals to default pipeline structure

-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Add TypeScript types to types/index.ts
-- 3. Create API routes for pipelines and workflows
-- 4. Build the UI components (PipelineBoard, WorkflowBuilder)
