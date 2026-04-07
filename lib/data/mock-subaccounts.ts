// Mock subaccount data — purely frontend, no backend implications
// All 119 CLIENT_STATS entries appear in the dropdown; first 5 (in SHUFFLED order)
// get full mock calendar/conversations/pipeline treatment.

import { SHUFFLED_STATS } from './client-stats';

// First 5 in shuffled order get full mock treatment
export const FEATURED_SLUGS: Set<string> = new Set(
  SHUFFLED_STATS.filter(s => s.dealsPerMonth > 0).slice(0, 5).map(s => s.slug)
);

// ── Seeded deterministic RNG (LCG) ─────────────────────────────────────────
function seededRng(seed: string) {
  let h = Array.from(seed).reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0);
  return () => {
    h = ((h * 1664525) + 1013904223) & 0xffffffff;
    return (h >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}
function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ── Name pools ──────────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Sarah', 'James', 'Emily', 'Robert', 'Amanda', 'Christopher', 'Patricia',
  'David', 'Rachel', 'Michael', 'Jennifer', 'Kevin', 'Laura', 'Steven', 'Michelle',
  'Brian', 'Lisa', 'Andrew', 'Stephanie', 'Joshua', 'Karen', 'Daniel', 'Sandra',
  'Matthew', 'Donna', 'Anthony', 'Carol', 'Mark', 'Ruth', 'Donald', 'Sharon',
  'Jason', 'Dorothy', 'Jeff', 'Anna', 'Ryan', 'Betty', 'Gary', 'Deborah',
  'Timothy', 'Barbara', 'Jose', 'Susan', 'Larry', 'Jessica', 'Joe', 'Mary',
  'Thomas', 'Linda', 'Charles', 'Nancy', 'William', 'Elizabeth', 'Richard', 'Pamela',
  'John', 'Kathleen', 'Paul', 'Helen', 'George', 'Diane',
];
const LAST_NAMES = [
  'Mitchell', 'Thornton', 'Chen', 'Garcia', 'Foster', 'Lee', 'Nguyen', 'Kim',
  'Torres', 'Brown', 'Lopez', 'Wu', 'Davis', 'Park', 'White', 'Anderson',
  'Jackson', 'Harris', 'Martin', 'Thompson', 'Robinson', 'Clark', 'Lewis', 'Walker',
  'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Scott', 'Green',
  'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner',
  'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris',
  'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper',
  'Richardson', 'Cox', 'Howard', 'Ward',
];
const STREET_NAMES = [
  'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Willow', 'Birch', 'Walnut',
  'Highland', 'Sunset', 'Meadow', 'Lakeview', 'Hillside', 'Riverside', 'Parkway',
  'Main', 'Washington', 'Lincoln', 'Jefferson', 'Madison', 'Monroe', 'Adams',
];
const STREET_TYPES = ['St', 'Ave', 'Dr', 'Ln', 'Blvd', 'Way', 'Ct', 'Pl'];

// ── Conversation message templates ──────────────────────────────────────────
interface MsgTemplate { from: 'agent' | 'contact'; texts: string[] }

const CONV_STAGES: Record<string, MsgTemplate[][]> = {
  new_lead: [[
    { from: 'contact', texts: ["Hi! I saw your listing on Zillow and I'm interested in learning more.", "Hey, I got your info from my friend. Are you still taking new clients?", "Hello! I've been thinking about buying a home in this area. Do you have availability?"] },
    { from: 'agent',   texts: ["Hi! Thanks for reaching out — I'd love to help. Are you looking to buy, sell, or both?", "Great to hear from you! Happy to help. What area are you looking in?", "Hi there! Absolutely, I'm currently working with a few buyers. What's your timeline?"] },
    { from: 'contact', texts: ["Mostly buying. We've been renting for 3 years and think it's time.", "Looking to buy — our lease is up in June so we need to move by then.", "We want to buy in the next 3-4 months. Budget around $450-500k."] },
    { from: 'agent',   texts: ["That's a great place to be! Let me ask — have you been pre-approved yet?", "Perfect timing. June gives us good runway. Have you spoken to a lender yet?", "Awesome. That's a solid budget for this market. Have you gotten pre-approved?"] },
    { from: 'contact', texts: ["Not yet, we're just starting the process.", "We're in the middle of that now, should be done this week.", "Yes, we got pre-approved for $490k last month."] },
    { from: 'agent',   texts: ["No problem! I can connect you with a great local lender. Want their info?", "Perfect. Once that's done, let's schedule a call to go over what you're looking for.", "Excellent! That puts you in a strong position. Want to schedule a consultation this week?"] },
  ]],
  scheduling: [[
    { from: 'contact', texts: ["When are you available this week for a showing?", "Can we see the house on Oak Street this weekend?", "We'd love to schedule a walkthrough whenever you're free."] },
    { from: 'agent',   texts: ["I have openings Tuesday at 11am or Thursday at 2pm — which works better?", "Saturday at 10am works great! I'll send you the address and a reminder.", "Absolutely! How does Wednesday at 4pm sound?"] },
    { from: 'contact', texts: ["Thursday at 2pm is perfect.", "Saturday works! See you then.", "Wednesday 4pm is great for us."] },
    { from: 'agent',   texts: ["Great, I'll send a calendar invite. The property is at 847 Maple Ave — parking on the street is easy.", "Perfect! I'll send the details. It's a beautiful home, I think you'll love it.", "Confirmed! I'll meet you at the front door. Text me if you need directions."] },
    { from: 'contact', texts: ["We just finished the showing. Really liked it!", "That was amazing, we love the kitchen and the backyard.", "The house was nice but the living room felt a bit small."] },
    { from: 'agent',   texts: ["Glad you liked it! Should we discuss next steps? The sellers are motivated.", "Wonderful! It won't last long at that price. Are you thinking of putting in an offer?", "I understand — let's look at a couple more this week that might be a better fit."] },
  ]],
  offer: [[
    { from: 'agent',   texts: ["Good news — I spoke with the listing agent. They're willing to consider offers starting at $465k.", "Hey, wanted to update you — another offer just came in. If you're serious, now's the time to move.", "How are you feeling about 1284 Highland Dr? The sellers are ready to negotiate."] },
    { from: 'contact', texts: ["We'd like to offer $455k. Is that too low?", "We're ready to go to $480k. What do you think?", "Honestly we love it. Let's offer asking price to be safe."] },
    { from: 'agent',   texts: ["$455k is a reasonable opening. Let me draft the offer — I'll have it to you in an hour.", "I love it. $480k with an escalation clause to $495k if needed. I'll structure this to win.", "Smart move! I'll include a personal letter from you too — sellers often appreciate that."] },
    { from: 'contact', texts: ["Great, what do we need to sign?", "Okay, let's do it! What's the next step?", "How long does the offer process take?"] },
    { from: 'agent',   texts: ["I'll send the docs via DocuSign in the next 20 minutes. Just need your signatures.", "I'll email you the purchase agreement. Takes about 10 minutes to sign electronically.", "Usually 24-48 hours for a response. I'll call you the moment I hear anything."] },
  ]],
  under_contract: [[
    { from: 'agent',   texts: ["Amazing news — your offer was accepted! Congratulations, you're under contract! 🎉", "Just got word — they accepted! You're officially under contract on 847 Maple Ave!", "They took our offer! Congrats — let's get the inspection scheduled."] },
    { from: 'contact', texts: ["OMG that's incredible news!! What happens next?", "We're so excited! This is our dream home. Thank you so much!", "That's amazing! What do we do now?"] },
    { from: 'agent',   texts: ["Next: inspection within 10 days, then appraisal, then final walkthrough before closing. I'll guide you through each step.", "Now we get the inspection done — I'll coordinate that. Closing is set for May 14th.", "I'll book the inspector today. In the meantime, your lender will order the appraisal."] },
    { from: 'contact', texts: ["When can we get the keys?", "How long until closing?", "Should we start packing?"] },
    { from: 'agent',   texts: ["Closing is scheduled for May 14th — about 30 days from now. Closer to the date I'll walk you through the final steps.", "30 days if everything goes smoothly. I'll keep you posted on each milestone.", "You can start planning! I'll confirm the exact date once the appraisal comes back."] },
  ]],
  post_close: [[
    { from: 'contact', texts: ["We just got the keys!! THANK YOU for everything 🏠", "We moved in last weekend. The house is perfect, we love it.", "Hey, just wanted to say we couldn't have done this without you. Thank you!"] },
    { from: 'agent',   texts: ["Congratulations!! Enjoy every moment in your new home 🎉 Reach out anytime!", "So happy for you! It was a pleasure working with you. Enjoy it!", "That's what I'm here for! Enjoy your new home. Don't hesitate to reach out if you need anything."] },
    { from: 'contact', texts: ["We'll definitely refer you to our friends!", "Already told 3 people about you. Hope to work with you again someday.", "You were amazing. 5 stars doesn't cover it!"] },
    { from: 'agent',   texts: ["That means the world to me, thank you! Hope you love the neighborhood.", "So grateful! Enjoy your new home 🏡", "Thank you so much! It was truly my pleasure."] },
  ]],
};

// ── Contact + conversation generators ──────────────────────────────────────
export interface MockContactItem {
  id: string;
  name: string;
  stage: 'new_lead' | 'scheduling' | 'offer' | 'under_contract' | 'post_close' | 'inactive';
  lastText: string;
  lastTime: string;
  unread: number;
}
export interface MockMessage {
  id: string;
  from: 'agent' | 'contact';
  text: string;
  time: string; // HH:MM
  daysAgo: number;
}

const STAGES: MockContactItem['stage'][] = ['new_lead', 'scheduling', 'offer', 'under_contract', 'post_close', 'inactive'];
const STAGE_WEIGHTS = [0.30, 0.25, 0.15, 0.12, 0.10, 0.08]; // probabilities

function weightedStage(rng: () => number): MockContactItem['stage'] {
  const r = rng();
  let cum = 0;
  for (let i = 0; i < STAGES.length; i++) {
    cum += STAGE_WEIGHTS[i];
    if (r < cum) return STAGES[i];
  }
  return 'inactive';
}

function timeLabel(daysAgo: number, hour: number, min: number): string {
  if (daysAgo === 0) return `${hour % 12 || 12}:${String(min).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return `${daysAgo}d ago`;
  return `${Math.floor(daysAgo / 7)}w ago`;
}

export function generateMockContacts(slug: string, count = 35): MockContactItem[] {
  const rng = seededRng(slug + '-contacts');
  const usedNames = new Set<string>();
  const contacts: MockContactItem[] = [];

  for (let i = 0; i < count; i++) {
    let name = '';
    let attempts = 0;
    while (!name || usedNames.has(name)) {
      name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
      if (++attempts > 20) { name += ` ${i}`; break; }
    }
    usedNames.add(name);

    const stage = weightedStage(rng);
    const daysAgo = randInt(rng, 0, 21);
    const hour = randInt(rng, 8, 20);
    const min = pick(rng, [0, 15, 30, 45]);

    const stageTexts: Record<string, string[]> = {
      new_lead: ["Hi! I saw your listing on Zillow...", "Interested in buying in this area", "A friend referred me to you", "Just starting my home search"],
      scheduling: ["Can we schedule a showing this week?", "When are you free for a walkthrough?", "Thursday at 2pm is perfect!", "We finished the showing — really liked it!"],
      offer: ["We'd like to offer $455k", "We're ready to move forward", "What's our chances of getting accepted?", "Let's do it!"],
      under_contract: ["We're so excited!! 🎉", "When do we get the keys?", "Inspection went great!", "We signed the docs"],
      post_close: ["We love our new home! Thank you!", "We moved in last weekend 🏠", "Already told friends about you!", "You were amazing, 5 stars!"],
      inactive: ["I'll think about it and get back to you", "Not quite ready yet", "We decided to wait a bit", "Maybe next quarter"],
    };

    const lastText = pick(rng, stageTexts[stage] || stageTexts.inactive);

    contacts.push({
      id: `mock-contact-${slug}-${i}`,
      name,
      stage,
      lastText,
      lastTime: timeLabel(daysAgo, hour, min),
      unread: stage === 'new_lead' && daysAgo < 3 ? randInt(rng, 1, 3) : 0,
    });
  }

  return contacts;
}

export function generateMockMessages(slug: string, contactId: string, stage: MockContactItem['stage']): MockMessage[] {
  const rng = seededRng(slug + '-msgs-' + contactId);
  const stageKey = stage === 'inactive' ? 'new_lead' : stage;
  const templates = CONV_STAGES[stageKey] || CONV_STAGES.new_lead;
  const thread = pick(rng, templates);

  const msgs: MockMessage[] = [];
  let daysAgo = randInt(rng, 3, 14);

  for (let i = 0; i < thread.length; i++) {
    const t = thread[i];
    const text = pick(rng, t.texts);
    const hour = randInt(rng, 8, 20);
    const min = pick(rng, [0, 5, 10, 15, 20, 30, 45]);

    msgs.push({
      id: `msg-${contactId}-${i}`,
      from: t.from,
      text,
      time: `${hour % 12 || 12}:${String(min).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`,
      daysAgo,
    });

    // Each message a bit later in time
    if (rng() > 0.6) daysAgo = Math.max(0, daysAgo - 1);
  }

  return msgs;
}

// ── Calendar event generator ─────────────────────────────────────────────────
export interface MockCalendarEvent {
  id: string;
  title: string;
  type: 'crm' | 'personal' | 'blocked';
  date: string;    // YYYY-MM-DD
  startHour: number;
  startMin: number;
  durationMins: number;
  contact?: string;
}

// Week of Apr 7–13, 2026
const WEEK_DATES = ['2026-04-07','2026-04-08','2026-04-09','2026-04-10','2026-04-11','2026-04-12','2026-04-13'];

const CRM_EVENT_TEMPLATES = [
  'Discovery Call: {name}', 'Buyer Consultation: {name}', 'Property Showing: {name}',
  'Offer Review: {name}', 'Contract Review: {name}', 'Closing: {name}',
  'Follow-up Call: {name}', 'Listing Presentation: {name}', 'Negotiation Call: {name}',
  'Walkthrough: {name}', 'Open House Prep: {name}', 'Inspection Review: {name}',
];
const PERSONAL_EVENT_TEMPLATES = [
  'Team Standup', 'Gym', 'Dentist', 'Kids Pickup', 'Lunch with Broker',
  'Yoga', 'Family Dinner', 'Weekly Review', 'Coffee with Mentor',
  'Doctor Appointment', 'School Pick-up', 'Grocery Run',
];
const BLOCKED_TEMPLATES = [
  'Open House: {addr}', 'Admin Block', 'Deep Work — No Calls', 'Lead Follow-up Block',
  'Email/Text Review', 'Marketing Session',
];

export function generateMockCalendarEvents(slug: string): MockCalendarEvent[] {
  const rng = seededRng(slug + '-calendar');
  const contacts = generateMockContacts(slug, 18);
  const events: MockCalendarEvent[] = [];

  // Add 3-5 blocked/personal recurring slots
  const personalEvts = [
    { title: 'Team Standup', type: 'personal' as const, days: [0, 1, 2, 3, 4], hour: 9, min: 0, dur: 30 },
    { title: 'Gym', type: 'blocked' as const, days: [0, 2, 4], hour: 7, min: 0, dur: 60 },
    { title: 'Weekly Review', type: 'blocked' as const, days: [4], hour: 8, min: 30, dur: 90 },
    { title: 'Family Dinner', type: 'personal' as const, days: [6], hour: 18, min: 0, dur: 120 },
    { title: 'Open House: ' + randInt(rng, 100, 999) + ' ' + pick(rng, STREET_NAMES) + ' ' + pick(rng, STREET_TYPES), type: 'blocked' as const, days: [5], hour: 10, min: 0, dur: 180 },
  ];

  personalEvts.forEach((e, ei) => {
    e.days.forEach(d => {
      events.push({ id: `evt-static-${ei}-${d}`, title: e.title, type: e.type, date: WEEK_DATES[d], startHour: e.hour, startMin: e.min, durationMins: e.dur });
    });
  });

  // Add CRM events (showings, calls) across the week
  const crmDays = [0, 1, 2, 3, 4, 5]; // Mon-Sat
  let eventId = 0;
  for (const day of crmDays) {
    const numEvts = randInt(rng, 1, 3);
    const usedHours = new Set<number>();

    for (let n = 0; n < numEvts; n++) {
      let hour = randInt(rng, 10, 17);
      let tries = 0;
      while (usedHours.has(hour) && tries < 10) { hour = randInt(rng, 10, 17); tries++; }
      usedHours.add(hour);

      const contact = pick(rng, contacts);
      const template = pick(rng, CRM_EVENT_TEMPLATES);
      const title = template.replace('{name}', contact.name);
      const dur = pick(rng, [30, 45, 60, 90]);

      events.push({
        id: `evt-crm-${eventId++}`,
        title,
        type: 'crm',
        date: WEEK_DATES[day],
        startHour: hour,
        startMin: pick(rng, [0, 30]),
        durationMins: dur,
        contact: contact.name,
      });
    }
  }

  // Add 2-3 personal events mid-week
  const personalExtras = pickN(rng, PERSONAL_EVENT_TEMPLATES.slice(3), 3);
  const personalDays = pickN(rng, [1, 2, 3], 3);
  personalExtras.forEach((title, i) => {
    events.push({
      id: `evt-personal-${i}`,
      title,
      type: 'personal',
      date: WEEK_DATES[personalDays[i]],
      startHour: pick(rng, [12, 13, 16, 17]),
      startMin: 0,
      durationMins: 60,
    });
  });

  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin);
  });
}

// ── Pipeline data generator ──────────────────────────────────────────────────
export interface MockDeal {
  id: string;
  name: string;
  address: string;
  value: number;
  stage: string;
  daysInStage: number;
  contact: string;
}

const PIPELINE_STAGES = ['New Lead', 'Qualified', 'Appointment Set', 'Under Contract', 'Closed Won', 'Closed Lost'];
const STAGE_COLORS: Record<string, string> = {
  'New Lead':        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'Qualified':       'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'Appointment Set': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'Under Contract':  'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  'Closed Won':      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  'Closed Lost':     'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};
export { PIPELINE_STAGES, STAGE_COLORS };

export function generateMockPipeline(slug: string, dealsPerMonth: number, avgGCI: number, apptsPerMonth = 25): Record<string, MockDeal[]> {
  const rng = seededRng(slug + '-pipeline');
  const contacts = generateMockContacts(slug, 35);

  // Stage counts derived from both dealsPerMonth and apptsPerMonth
  const won      = Math.max(1, dealsPerMonth);
  const lost     = Math.max(1, Math.round(dealsPerMonth * 0.7));
  const contract = Math.max(1, Math.round(dealsPerMonth * 1.3));
  const apptSet  = Math.max(2, Math.round(apptsPerMonth * 0.85));
  const qualified = Math.max(3, Math.round(apptsPerMonth * 1.6));
  const newLead  = Math.max(5, Math.round(apptsPerMonth * 3.2));

  const stageCounts: Record<string, number> = {
    'New Lead': newLead, 'Qualified': qualified, 'Appointment Set': apptSet,
    'Under Contract': contract, 'Closed Won': won, 'Closed Lost': lost,
  };

  const result: Record<string, MockDeal[]> = {};
  let contactIdx = 0;

  for (const stage of PIPELINE_STAGES) {
    const count = stageCounts[stage];
    result[stage] = [];

    for (let i = 0; i < count; i++) {
      const contact = contacts[contactIdx % contacts.length];
      contactIdx++;

      const addr = `${randInt(rng, 100, 9999)} ${pick(rng, STREET_NAMES)} ${pick(rng, STREET_TYPES)}`;
      const variance = 0.7 + rng() * 0.6; // 70%–130% of avgGCI
      const value = Math.round((avgGCI * variance) / 1000) * 1000;

      result[stage].push({
        id: `deal-${slug}-${stage}-${i}`,
        name: `${contact.name} — ${addr}`,
        address: addr,
        value,
        stage,
        daysInStage: randInt(rng, 1, 28),
        contact: contact.name,
      });
    }
  }

  return result;
}

// ── Funnel numbers from CLIENT_STATS metrics ─────────────────────────────────
export interface FunnelData {
  leads: number;
  appointments: number;
  contactedAppts: number;
  clientsClosed: number;
  dealsClosed: number;
}

export function computeFunnelFromStats(dealsPerMonth: number, apptsPerMonth: number, multiplier = 1): FunnelData {
  if (dealsPerMonth === 0) return { leads: 0, appointments: 0, contactedAppts: 0, clientsClosed: 0, dealsClosed: 0 };
  const deals = Math.round(dealsPerMonth * multiplier);
  const clients = Math.round(deals * 1.65);
  const contacted = Math.max(clients + Math.round(multiplier), Math.round(apptsPerMonth * multiplier * 0.82));
  const appts = Math.max(contacted + Math.round(multiplier), Math.round(apptsPerMonth * multiplier));
  const leads = Math.round(appts * 2.4);
  return { leads, appointments: appts, contactedAppts: contacted, clientsClosed: clients, dealsClosed: deals };
}

// ── All-time cumulative stats ─────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthsSinceStart(startDate: string): number {
  const [mon, year] = startDate.split(' ');
  const monthIdx = MONTH_NAMES.indexOf(mon);
  if (monthIdx < 0 || !year) return 12;
  const startMs = new Date(parseInt(year), monthIdx, 1).getTime();
  const nowMs = new Date(2026, 3, 1).getTime(); // Apr 2026
  return Math.max(1, Math.floor((nowMs - startMs) / (30.44 * 24 * 3600 * 1000)));
}

export interface AllTimeStats {
  months: number;
  totalContacts: number;
  totalDeals: number;
  totalRevenue: number;
  totalTexts: number;
  totalEmails: number;
  totalBookings: number;
  totalClosings: number;
}

export function computeAllTimeStats(slug: string, startDate: string, dealsPerMonth: number, apptsPerMonth: number, textsPerMonth: number, emailsPerMonth: number, avgGCI: number): AllTimeStats {
  const months = monthsSinceStart(startDate);
  const rng = seededRng(slug + '-alltime');
  // variance band: ±max(1, 40% of monthly rate)
  const variance = Math.max(1, Math.round(dealsPerMonth * 0.4));
  const apptVariance = Math.max(2, Math.round(apptsPerMonth * 0.35));

  let totalDeals = 0;
  let totalRevenue = 0;
  let totalBookings = 0;

  for (let m = 0; m < months; m++) {
    const monthDeals = Math.max(0, dealsPerMonth + Math.round((rng() * 2 - 1) * variance));
    const monthAppts = Math.max(0, apptsPerMonth + Math.round((rng() * 2 - 1) * apptVariance));
    totalDeals += monthDeals;
    totalBookings += monthAppts;
    for (let d = 0; d < monthDeals; d++) {
      // GCI variance ±25% per deal
      totalRevenue += Math.round(avgGCI * (0.75 + rng() * 0.5));
    }
  }

  return {
    months,
    totalContacts: Math.round(totalBookings * 3.8),
    totalDeals,
    totalRevenue,
    totalTexts: Math.round(textsPerMonth * months * (0.85 + rng() * 0.3)),
    totalEmails: Math.round(emailsPerMonth * months * (0.85 + rng() * 0.3)),
    totalBookings,
    totalClosings: totalDeals,
  };
}
