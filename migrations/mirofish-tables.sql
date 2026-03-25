-- MiroFish pgvector tables (replaces Zep Cloud)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS mirofish_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mirofish_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES mirofish_graphs(id),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mirofish_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES mirofish_graphs(id),
  name TEXT NOT NULL,
  entity_type TEXT,
  description TEXT,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mirofish_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES mirofish_graphs(id),
  source_entity_id UUID REFERENCES mirofish_entities(id),
  target_entity_id UUID REFERENCES mirofish_entities(id),
  relationship_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
