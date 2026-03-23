-- Hindsight Vector Memory for Nexorra Agents
CREATE EXTENSION IF NOT EXISTS vector;

-- Agent memory entries with vector embeddings
CREATE TABLE IF NOT EXISTS agent_memory (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  accessed_at TIMESTAMPTZ DEFAULT now(),
  access_count INTEGER DEFAULT 0
);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding ON agent_memory
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 200);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_domain ON agent_memory(domain);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created ON agent_memory(created_at DESC);

-- Behavioral patterns learned across sessions
CREATE TABLE IF NOT EXISTS behavioral_patterns (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL,  -- 'success', 'failure', 'preference', 'optimization'
  description TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  occurrences INTEGER DEFAULT 1,
  last_seen TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_patterns_agent ON behavioral_patterns(agent_id);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON behavioral_patterns(confidence DESC);

-- Session summaries for cross-session context
CREATE TABLE IF NOT EXISTS session_summaries (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  key_decisions JSONB DEFAULT '[]',
  duration_seconds INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_agent ON session_summaries(agent_id, created_at DESC);
