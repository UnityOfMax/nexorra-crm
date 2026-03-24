// MiroFish-style A/B Simulation Engine
// Deterministic copy scoring — zero LLM tokens
// Used by Mira (Experiment Simulator) to predict variant performance before live deployment

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimulationInput {
  variant: {
    name: string;
    first_line: string;
    body: string;
    ps_line: string;
  };
  historicalData: {
    avgOpenRate: number;       // from email_campaign_metrics
    avgReplyRate: number;
    avgBookingRate: number;
    topVariantRate: number;    // best performing variant's booking_rate
  };
  sampleSize: number;          // simulated send count (default 100)
}

export interface SimulationResult {
  variantName: string;
  predictedOpenRate: number;
  predictedReplyRate: number;
  predictedBookingRate: number;
  confidence: number;           // 0-1 based on how much historical data exists
  reasoning: string;            // Why this prediction
  recommendation: 'deploy' | 'refine' | 'reject';
}

// ---------------------------------------------------------------------------
// Scoring Helpers
// ---------------------------------------------------------------------------

interface ScoreBreakdown {
  personalization: number;
  clarity: number;
  ctaStrength: number;
  socialProof: number;
  brevity: number;
  total: number;
  reasons: string[];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  // Split on sentence-ending punctuation followed by space or end-of-string
  return text.split(/[.!?]+(?:\s|$)/).filter(s => s.trim().length > 0).length;
}

function scoreVariant(variant: SimulationInput['variant']): ScoreBreakdown {
  const reasons: string[] = [];
  let personalization = 0;
  let clarity = 0;
  let ctaStrength = 0;
  let socialProof = 0;
  let brevity = 0;

  const fullCopy = `${variant.first_line} ${variant.body} ${variant.ps_line}`;

  // --- Personalization (0-10) ---
  // +3 if {detail} placeholder used (deep personalization)
  // +1 if just {city} used
  // +1 if {first_name} used
  // +1 if {brokerage} used
  // Additional +1 for each specific-sounding phrase
  if (variant.first_line.includes('{detail}') || variant.first_line.includes('detail')) {
    personalization += 3;
    reasons.push('Personalization: +3 (specific detail reference in opener)');
  }
  if (fullCopy.includes('{city}') || fullCopy.includes('your city') || fullCopy.includes('your market')) {
    personalization += 1;
    reasons.push('Personalization: +1 (city/market reference)');
  }
  if (fullCopy.includes('{first_name}') || fullCopy.includes('first_name')) {
    personalization += 1;
    reasons.push('Personalization: +1 (first name token)');
  }
  if (fullCopy.includes('{brokerage}') || fullCopy.includes('your brokerage')) {
    personalization += 1;
    reasons.push('Personalization: +1 (brokerage reference)');
  }
  // Bonus: opener references something specific ("I saw", "Noticed", "Read about", "Checked out")
  const specificPhrases = /\b(i saw|noticed|read about|checked out|looked at|came across)\b/i;
  if (specificPhrases.test(variant.first_line)) {
    personalization += 2;
    reasons.push('Personalization: +2 (specific observation in opener)');
  }
  personalization = Math.min(personalization, 10);

  // --- Clarity (0-10) ---
  // +2 if body is ≤3 sentences
  // +2 if body has a clear value prop (mentions "appointments", "book", "calendar", "system")
  // +2 if no jargon/fluff words
  // +1 if PS line exists and is under 15 words
  const bodySentences = countSentences(variant.body);
  if (bodySentences <= 3) {
    clarity += 2;
    reasons.push(`Clarity: +2 (body is ${bodySentences} sentences, ≤3)`) ;
  } else {
    reasons.push(`Clarity: +0 (body is ${bodySentences} sentences, >3)`);
  }

  const valuePropWords = /\b(appointment|booking|calendar|system|automat)/i;
  if (valuePropWords.test(variant.body)) {
    clarity += 2;
    reasons.push('Clarity: +2 (clear value prop — mentions appointments/booking/system)');
  }

  const fluffWords = /\b(synergy|leverage|paradigm|holistic|ecosystem|revolutionary|game.?changer|cutting.?edge)\b/i;
  if (!fluffWords.test(fullCopy)) {
    clarity += 2;
    reasons.push('Clarity: +2 (no jargon/fluff)');
  } else {
    reasons.push('Clarity: -0 (contains jargon)');
  }

  if (variant.ps_line && countWords(variant.ps_line) <= 15) {
    clarity += 1;
    reasons.push('Clarity: +1 (PS line concise, ≤15 words)');
  }

  // Bonus: numerical specificity (e.g., "8-30", "15+", "24/7")
  const hasNumbers = /\d+[\-–+]?\d*/;
  if (hasNumbers.test(variant.body)) {
    clarity += 2;
    reasons.push('Clarity: +2 (specific numbers in body)');
  }
  clarity = Math.min(clarity, 10);

  // --- CTA Strength (0-10) ---
  // +2 if mentions booking/calendar
  // +2 if mentions a time commitment ("2 min", "quick", "short")
  // +2 if uses low-friction ask ("worth a look", "check it out", "thumbs up")
  // +1 if CTA is in PS line (strong closer position)
  const bookingCTA = /\b(book|calendar|schedule|call|meeting|chat)\b/i;
  if (bookingCTA.test(fullCopy)) {
    ctaStrength += 2;
    reasons.push('CTA: +2 (mentions booking/calendar/call)');
  }

  const timeCommitment = /\b(\d+\s*min|quick|short|brief|worth\s+(a\s+)?look)\b/i;
  if (timeCommitment.test(fullCopy)) {
    ctaStrength += 2;
    reasons.push('CTA: +2 (low time commitment ask)');
  }

  const lowFriction = /\b(worth|check.?it.?out|take.?a.?look|thumbs.?up|no.?pressure|no.?rush|interested|curious)\b/i;
  if (lowFriction.test(fullCopy)) {
    ctaStrength += 2;
    reasons.push('CTA: +2 (low-friction language)');
  }

  if (bookingCTA.test(variant.ps_line) || lowFriction.test(variant.ps_line)) {
    ctaStrength += 1;
    reasons.push('CTA: +1 (CTA positioned in PS line)');
  }

  // Question-based CTA
  if (/\?/.test(variant.body) || /\?/.test(variant.ps_line)) {
    ctaStrength += 1;
    reasons.push('CTA: +1 (question-based CTA)');
  }
  ctaStrength = Math.min(ctaStrength, 10);

  // --- Social Proof (0-10) ---
  // +2 if mentions numbers (agents, deals, volume)
  // +2 if mentions "clients" or "agents we work with"
  // +2 if mentions specific results ("8-30 appointments")
  // +1 if mentions market/location credibility
  const numbersInContext = /\b\d+[\-–+]?\s*\d*\s*(agent|client|appointment|deal|month|market)/i;
  if (numbersInContext.test(fullCopy)) {
    socialProof += 2;
    reasons.push('Social proof: +2 (specific numbers with context)');
  }

  const clientMention = /\b(our\s+client|agents?\s+(we|like\s+you)|most\s+of\s+our)\b/i;
  if (clientMention.test(fullCopy)) {
    socialProof += 2;
    reasons.push('Social proof: +2 (mentions working with other agents)');
  }

  const specificResults = /\b\d+[\-–]\d+\s*(appointment|booking|deal|meeting)/i;
  if (specificResults.test(fullCopy)) {
    socialProof += 2;
    reasons.push('Social proof: +2 (specific result range)');
  }

  const marketCred = /\b(market|markets?\s+like|your\s+(city|area|market))\b/i;
  if (marketCred.test(fullCopy)) {
    socialProof += 1;
    reasons.push('Social proof: +1 (market/location credibility)');
  }
  socialProof = Math.min(socialProof, 10);

  // --- Brevity (0-10) ---
  // +1 if total word count under 80
  // +2 if total word count under 60
  // +2 if first_line under 20 words
  // +2 if no paragraph is >2 sentences
  // +1 if PS line under 10 words
  const totalWords = countWords(fullCopy);
  if (totalWords < 60) {
    brevity += 2;
    reasons.push(`Brevity: +2 (total ${totalWords} words, under 60)`);
  } else if (totalWords < 80) {
    brevity += 1;
    reasons.push(`Brevity: +1 (total ${totalWords} words, under 80)`);
  } else {
    reasons.push(`Brevity: +0 (total ${totalWords} words, ≥80)`);
  }

  const firstLineWords = countWords(variant.first_line);
  if (firstLineWords <= 20) {
    brevity += 2;
    reasons.push(`Brevity: +2 (opener ${firstLineWords} words, ≤20)`);
  }

  // Check no paragraph exceeds 2 sentences
  const paragraphs = variant.body.split(/\n+/).filter(p => p.trim());
  const allShort = paragraphs.every(p => countSentences(p) <= 2);
  if (allShort) {
    brevity += 2;
    reasons.push('Brevity: +2 (all body paragraphs ≤2 sentences)');
  }

  if (variant.ps_line && countWords(variant.ps_line) <= 10) {
    brevity += 1;
    reasons.push('Brevity: +1 (PS line ≤10 words)');
  }

  // Penalty: very long copy
  if (totalWords > 120) {
    brevity -= 2;
    reasons.push(`Brevity: -2 (${totalWords} words, too long)`);
  }
  brevity = Math.max(0, Math.min(brevity, 10));

  const total = personalization + clarity + ctaStrength + socialProof + brevity;

  return { personalization, clarity, ctaStrength, socialProof, brevity, total, reasons };
}

// ---------------------------------------------------------------------------
// Rate Prediction
// ---------------------------------------------------------------------------

function predictRates(
  score: number,
  historical: SimulationInput['historicalData']
): { openRate: number; replyRate: number; bookingRate: number } {
  // Map composite score to predicted rates using historical baselines
  // Score range: 0-50, midpoint = 25
  // Each point above/below 25 adjusts the rate by 2%/3%/4% respectively
  const deviation = score - 25;

  const openRate = Math.max(0, Math.min(1,
    historical.avgOpenRate * (1 + deviation * 0.02)
  ));
  const replyRate = Math.max(0, Math.min(1,
    historical.avgReplyRate * (1 + deviation * 0.03)
  ));
  const bookingRate = Math.max(0, Math.min(1,
    historical.avgBookingRate * (1 + deviation * 0.04)
  ));

  return { openRate, replyRate, bookingRate };
}

// ---------------------------------------------------------------------------
// Recommendation Logic
// ---------------------------------------------------------------------------

function getRecommendation(
  predictedBookingRate: number,
  topVariantRate: number
): 'deploy' | 'refine' | 'reject' {
  if (topVariantRate === 0) {
    // No baseline data — default to refine
    return predictedBookingRate > 0 ? 'deploy' : 'refine';
  }

  const ratio = predictedBookingRate / topVariantRate;

  if (ratio >= 0.8) return 'deploy';
  if (ratio >= 0.5) return 'refine';
  return 'reject';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function simulateVariant(input: SimulationInput): Promise<SimulationResult> {
  const { variant, historicalData, sampleSize } = input;
  const breakdown = scoreVariant(variant);
  const predicted = predictRates(breakdown.total, historicalData);

  // Confidence = min(1, historical sample / 500)
  // Use sampleSize as a proxy for how much data backs the baseline
  const confidence = Math.min(1, sampleSize / 500);

  const recommendation = getRecommendation(predicted.bookingRate, historicalData.topVariantRate);

  // Build reasoning string
  const reasoningParts = [
    `Composite score: ${breakdown.total}/50`,
    `  Personalization: ${breakdown.personalization}/10`,
    `  Clarity: ${breakdown.clarity}/10`,
    `  CTA strength: ${breakdown.ctaStrength}/10`,
    `  Social proof: ${breakdown.socialProof}/10`,
    `  Brevity: ${breakdown.brevity}/10`,
    '',
    'Score breakdown:',
    ...breakdown.reasons,
    '',
    `Predicted vs baseline: open ${(predicted.openRate * 100).toFixed(1)}% (avg ${(historicalData.avgOpenRate * 100).toFixed(1)}%), ` +
    `reply ${(predicted.replyRate * 100).toFixed(1)}% (avg ${(historicalData.avgReplyRate * 100).toFixed(1)}%), ` +
    `booking ${(predicted.bookingRate * 100).toFixed(1)}% (avg ${(historicalData.avgBookingRate * 100).toFixed(1)}%)`,
    `Top variant booking rate: ${(historicalData.topVariantRate * 100).toFixed(1)}%`,
    `Recommendation: ${recommendation} (predicted/top ratio: ${historicalData.topVariantRate > 0 ? (predicted.bookingRate / historicalData.topVariantRate * 100).toFixed(0) : 'N/A'}%)`,
  ];

  return {
    variantName: variant.name,
    predictedOpenRate: Math.round(predicted.openRate * 10000) / 10000,
    predictedReplyRate: Math.round(predicted.replyRate * 10000) / 10000,
    predictedBookingRate: Math.round(predicted.bookingRate * 10000) / 10000,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: reasoningParts.join('\n'),
    recommendation,
  };
}

export async function simulateBatch(
  variants: SimulationInput[]
): Promise<SimulationResult[]> {
  // Run all simulations (deterministic, no async needed but kept for interface compat)
  const results = await Promise.all(variants.map(v => simulateVariant(v)));

  // Rank by predicted booking rate descending
  results.sort((a, b) => b.predictedBookingRate - a.predictedBookingRate);

  return results;
}
