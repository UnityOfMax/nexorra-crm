/**
 * Email Personalization System
 *
 * Template-based personalization for cold email leads.
 * Zero LLM calls — picks the best available personal detail
 * and generates first_line, email_body, ps_line, and custom_variables.
 */

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source_brokerage: string;
  city: string;
  state_province?: string;
  personal_research?: {
    linkedin_url?: string;
    social_media?: { instagram?: string; facebook?: string; twitter?: string };
    birthday?: string;
    family?: string;
    pets?: string;
    schools?: string[];
    hobbies?: string[];
    website?: string;
    bio_excerpt?: string;
  };
}

export interface PersonalizedCopy {
  first_line: string;
  email_body: string;
  ps_line: string;
  custom_variables: Record<string, string>;
}

// --- Detail ranking (highest priority first) ---

interface PersonalDetail {
  type: 'hobby' | 'pet' | 'family' | 'school' | 'bio' | 'website' | 'brokerage';
  value: string;
}

function pickBestDetail(lead: Lead): PersonalDetail {
  const r = lead.personal_research;

  if (r?.hobbies?.length) {
    return { type: 'hobby', value: r.hobbies[0] };
  }
  if (r?.pets) {
    return { type: 'pet', value: r.pets };
  }
  if (r?.family) {
    return { type: 'family', value: r.family };
  }
  if (r?.schools?.length) {
    return { type: 'school', value: r.schools[0] };
  }
  if (r?.bio_excerpt) {
    return { type: 'bio', value: r.bio_excerpt };
  }
  if (r?.website) {
    return { type: 'website', value: r.website };
  }
  return { type: 'brokerage', value: lead.source_brokerage };
}

// --- First line generators ---

const firstLineGenerators: Record<string, (detail: PersonalDetail, lead: Lead) => string> = {
  hobby: (d, lead) =>
    `I saw you're into ${d.value} — always cool to meet a ${lead.city} agent with interests outside the grind.`,
  pet: (d, lead) =>
    `Noticed you've got ${d.value} — bet they keep things interesting between showings in ${lead.city}.`,
  family: (d, lead) =>
    `Saw a bit about your family (${d.value}) — juggling real estate and family life in ${lead.city} is no joke.`,
  school: (d) =>
    `Fellow ${d.value} grad here — small world.`,
  bio: (d) =>
    `Read a bit about you: "${truncate(d.value, 60)}" — that stood out.`,
  website: (d, lead) =>
    `Checked out your site and your ${lead.city} listings look solid.`,
  brokerage: (d, lead) =>
    `Saw you're with ${d.value} in ${lead.city} — you all have been putting up solid numbers.`,
};

// --- Email body generators ---

const cityPitchVariants = [
  (lead: Lead) =>
    `We help agents in ${lead.city} add 8-30 appointments per month using AI — ` +
    `no cold calling, no chasing leads. The system runs in the background while you focus on closings.`,
  (lead: Lead) =>
    `${lead.city}'s market moves fast. We set up an AI system that books appointments for agents automatically — ` +
    `most of our clients pick up 8-30 extra appointments a month without lifting a finger.`,
  (lead: Lead) =>
    `We built an AI appointment-setting system specifically for agents in markets like ${lead.city}. ` +
    `It runs 24/7 and books qualified appointments directly onto your calendar — on average 8-30 per month.`,
];

function pickBodyVariant(lead: Lead): string {
  // Deterministic pick based on lead id to keep it consistent across re-runs
  const hash = simpleHash(lead.id);
  const variant = cityPitchVariants[hash % cityPitchVariants.length];
  return variant(lead);
}

// --- PS line generators ---

const psLineGenerators: Record<string, (detail: PersonalDetail, lead: Lead) => string> = {
  hobby: (d) =>
    `PS: Hope the ${d.value} is going well — talk soon.`,
  pet: (d) =>
    `PS: Give ${d.value} a treat for me.`,
  family: (_d, lead) =>
    `PS: ${lead.city} is a great place to raise a family — hope business is matching the lifestyle.`,
  school: (d) =>
    `PS: ${d.value} alumni gotta look out for each other.`,
  bio: (_d, lead) =>
    `PS: ${lead.city} market is heating up — good time to be in the game.`,
  website: (_d, lead) =>
    `PS: Your online presence is sharp — imagine pairing that with a system that books appointments while you sleep.`,
  brokerage: (_d, lead) =>
    `PS: ${lead.city} market is heating up — perfect time to add a few more appointments to the calendar.`,
};

// --- Helpers ---

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3).trimEnd() + '...';
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// --- Main export ---

export function personalizeLead(lead: Lead): PersonalizedCopy {
  const detail = pickBestDetail(lead);

  const firstLineGen = firstLineGenerators[detail.type];
  const psLineGen = psLineGenerators[detail.type];

  const first_line = firstLineGen(detail, lead);
  const email_body = pickBodyVariant(lead);
  const ps_line = psLineGen(detail, lead);

  return {
    first_line,
    email_body,
    ps_line,
    custom_variables: {
      first_line,
      email_body,
      ps_line,
      first_name: lead.first_name,
      city: lead.city,
      brokerage: lead.source_brokerage,
      state: lead.state_province || '',
    },
  };
}
