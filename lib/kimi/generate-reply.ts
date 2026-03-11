/**
 * Claude Haiku 4.5 reply generation helper with prompt caching.
 * Shared by cold email and client reply agents.
 *
 * Previously Kimi K2.5 (Moonshot). Now Claude Haiku 4.5 via Anthropic SDK.
 */

import { callKimi } from './client';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GenerateReplyParams {
  systemPrompt: string;
  conversationHistory: ConversationMessage[];
  contactContext?: string;
  maxTokens?: number;
  temperature?: number;
}

interface GenerateReplyResult {
  reply: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Build context and call Claude Haiku 4.5 to generate a reply.
 * Injects contactContext into the system prompt if provided.
 * System prompt is cached via Anthropic prompt caching.
 */
export async function generateKimiReply(
  params: GenerateReplyParams
): Promise<GenerateReplyResult> {
  const { systemPrompt, conversationHistory, contactContext, maxTokens, temperature } = params;

  // Build system message with optional contact context
  let fullSystemPrompt = systemPrompt;
  if (contactContext) {
    fullSystemPrompt += `\n\n<contact_context>\n${contactContext}\n</contact_context>`;
  }

  // Build messages array
  const messages = [
    { role: 'system' as const, content: fullSystemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
  ];

  // Ensure there's at least one user message
  if (conversationHistory.length === 0) {
    messages.push({ role: 'user' as const, content: 'Hello' });
  }

  const result = await callKimi({
    messages,
    maxTokens: maxTokens || 500,
    temperature: temperature ?? 0.7,
  });

  return {
    reply: result.reply,
    tokensUsed: result.tokensUsed,
  };
}

// Alias for cleaner imports
export const generateReply = generateKimiReply;
