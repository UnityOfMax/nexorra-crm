export interface MulchEntry {
  id: string;
  agent: string;
  domain: string;
  content: string;
  tags: string[];
  classification: 'foundational' | 'tactical' | 'observational';
  timestamp: string;
  score?: number; // BM25 relevance score (populated on query)
}

export interface MulchConfig {
  version: number;
  dataFile: string;
  lockFile: string;
  maxEntries: number;
  domains: string[];
}

export interface MulchQueryResult {
  entries: MulchEntry[];
  total: number;
  query: string;
}
