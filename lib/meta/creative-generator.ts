/**
 * Ad creative generation: Claude Haiku (copy) + Google AI Imagen 3 (image).
 *
 * Flow:
 *   1. Claude Haiku generates imagePrompt, headline, bodyText using humanizer rules
 *   2. Google AI Imagen 3 generates image from prompt (aspect 1.91:1 for FB feed)
 *
 * Env vars:
 *   ANTHROPIC_API_KEY   — Claude Haiku
 *   GOOGLE_AI_API_KEY   — Google AI Studio (Imagen 3)
 */

import { generateText } from '@/lib/ai/daemon-client';

const IMAGEN_MODEL = 'imagen-3.0-generate-002';
const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdCreativeParams {
  agentName: string;          // e.g. "Sarah with Coastal Realty"
  location: string;           // e.g. "Miami, FL"
  targetType: string;         // "home buyers" | "home sellers" | "real estate investors"
  propertyType?: string;      // e.g. "luxury condos", "single-family homes"
  uniqueAngle?: string;       // from ai_agent_configs.business_context
}

export interface AdCreativeResult {
  headline: string;           // < 40 chars
  bodyText: string;           // < 125 chars
  imagePrompt: string;        // the prompt sent to Imagen
  imageBase64: string;        // base64-encoded PNG (no data URI prefix)
  imageMimeType: string;      // "image/png"
}

// ─── Claude Haiku copy generation ────────────────────────────────────────────

const COPY_SYSTEM = `You generate Facebook ad copy for real estate agents. Output ONLY valid JSON — no markdown, no explanation.

Rules:
- headline: under 40 characters, punchy, specific to location and target
- bodyText: under 125 characters, addresses a real pain point, ends with a soft CTA
- imagePrompt: detailed visual description for Imagen 3, photorealistic, no text in image, 1.91:1 landscape

Writing style:
- No filler words: "crucial", "vital", "essential", "transformative", "leverage", "navigate", "foster"
- No hedging: "I think", "perhaps", "might be worth considering"
- No sycophancy, no em-dash overuse, no generic conclusions
- Active verbs. Short sentences. Be specific.
- Sound like a local expert, not a corporate ad`;

async function generateAdCopy(params: AdCreativeParams): Promise<{
  headline: string;
  bodyText: string;
  imagePrompt: string;
}> {
  const userPrompt = `Generate Facebook ad copy for:
Agent: ${params.agentName}
Location: ${params.location}
Target audience: ${params.targetType}
${params.propertyType ? `Property type: ${params.propertyType}` : ''}
${params.uniqueAngle ? `Unique angle: ${params.uniqueAngle}` : ''}

Return JSON: { "headline": "...", "bodyText": "...", "imagePrompt": "..." }`;

  const result = await generateText({
    model: 'claude-haiku-4-5-20251001',
    system: COPY_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 400,
  });

  const text = result.text;

  // Extract JSON — strip markdown fences if present
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Claude did not return valid JSON: ${text}`);

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.headline || !parsed.bodyText || !parsed.imagePrompt) {
    throw new Error(`Missing fields in Claude response: ${text}`);
  }

  // Enforce length limits
  return {
    headline: parsed.headline.slice(0, 40),
    bodyText: parsed.bodyText.slice(0, 125),
    imagePrompt: parsed.imagePrompt,
  };
}

// ─── Google AI Imagen 3 image generation ─────────────────────────────────────

async function generateImage(imagePrompt: string): Promise<{ base64: string; mimeType: string }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured');

  const url = `${GOOGLE_AI_BASE}/${IMAGEN_MODEL}:predict?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: imagePrompt }],
      parameters: {
        aspectRatio: '1.91:1',
        sampleCount: 1,
      },
    }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Imagen API error: ${data?.error?.message || res.status}`);
  }

  const prediction = data?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    throw new Error('No image returned from Imagen API');
  }

  return {
    base64: prediction.bytesBase64Encoded,
    mimeType: prediction.mimeType || 'image/png',
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateAdCreative(params: AdCreativeParams): Promise<AdCreativeResult> {
  // Step 1: Claude generates copy + image prompt
  const copy = await generateAdCopy(params);

  // Step 2: Imagen generates image from the prompt
  const image = await generateImage(copy.imagePrompt);

  return {
    headline: copy.headline,
    bodyText: copy.bodyText,
    imagePrompt: copy.imagePrompt,
    imageBase64: image.base64,
    imageMimeType: image.mimeType,
  };
}
