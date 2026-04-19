import { generateText } from '@/lib/ai/daemon-client';

export type LeadIntent =
  | 'interested'      // "yes", "tell me more", "I'm looking at..."
  | 'qualifying'      // "how much", "what's the process", "do you cover..."
  | 'objection'       // "not right now", "too expensive", "already have an agent"
  | 'booking_signal'  // "when can we talk", "I'm free Thursday"
  | 'stop_request'    // "stop", "unsubscribe", "don't contact me"
  | 'neutral';        // single word, "ok", "thanks", unclear

const VALID_INTENTS: LeadIntent[] = [
  'interested', 'qualifying', 'objection', 'booking_signal', 'stop_request', 'neutral',
];

export async function classifyIntent(message: string): Promise<LeadIntent> {
  try {
    const result = await generateText({
      system: `Classify this inbound message from a real estate lead into exactly one label:
interested - positive engagement ("yes", "tell me more", "I'm looking at buying", "sounds good")
qualifying - asking about process/price/area ("how much", "do you cover", "what's the timeline", "how does it work")
objection - pushback or hesitation ("not right now", "too expensive", "already have an agent", "not interested")
booking_signal - wants to schedule or stating availability ("when can we talk", "I'm free Thursday", "let's meet", "call me")
stop_request - opting out ("stop", "unsubscribe", "don't contact me", "remove me", "leave me alone")
neutral - casual, unclear, or one-word replies ("ok", "thanks", "sure", "k")

Reply with ONLY the label. Nothing else.`,
      messages: [{ role: 'user', content: message.slice(0, 500) }],
      maxTokens: 10,
    });

    const label = result.text.trim().toLowerCase() as LeadIntent;
    return VALID_INTENTS.includes(label) ? label : 'neutral';
  } catch {
    return 'neutral';
  }
}
