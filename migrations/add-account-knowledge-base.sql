-- Add knowledge_base column to ai_agent_configs for per-account RAG context
ALTER TABLE ai_agent_configs ADD COLUMN IF NOT EXISTS knowledge_base TEXT;
-- Add persona_prompt to cleanly separate the "who you are" prompt from business_context
ALTER TABLE ai_agent_configs ADD COLUMN IF NOT EXISTS persona_prompt TEXT;
