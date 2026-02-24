import Anthropic from '@anthropic-ai/sdk';

// Module-level singleton: constructed once per container lifetime
export const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
