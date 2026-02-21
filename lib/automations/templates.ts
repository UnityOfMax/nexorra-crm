// ============================================================
// Automation message templates
// Tokens: {{name}}, {{agentName}}, {{callTime}}
// ============================================================

export interface MessageTemplate {
  type: 'sms' | 'email' | 'nurturing_escalation';
  delayMs: number;
  subject?: string; // email only
  body: string;
}

// ── Helpers ──────────────────────────────────────────────────
const H = 60 * 60 * 1000;
const D = 24 * H;

// Apply token replacements
export function applyTokens(
  text: string,
  tokens: { name: string; agentName: string; callTime?: string }
): string {
  return text
    .replace(/{{name}}/g, tokens.name)
    .replace(/{{agentName}}/g, tokens.agentName)
    .replace(/{{callTime}}/g, tokens.callTime || '');
}

// ── New Lead ──────────────────────────────────────────────────
export const NEW_LEAD_TEMPLATES: MessageTemplate[] = [
  // Step 1 — immediate
  {
    type: 'sms',
    delayMs: 0,
    body: `Hey {{name}}! Just saw your request come through — I'm already pulling together some homes you'll love. When's a good time for a quick call? 😊`,
  },
  {
    type: 'email',
    delayMs: 0,
    subject: 'Got your request! 🏡',
    body: `Hey {{name}}!

Just saw you pop up — super exciting! I'm already starting to put together a list of homes based on what you're looking for.

When would work for a quick 10-minute call? Doesn't have to be long, I just want to make sure I've got the right homes on the list for you.

Hit reply whenever works!

{{agentName}}`,
  },

  // Step 2 — +2h
  {
    type: 'sms',
    delayMs: 2 * H,
    body: `Hey, just checking in! Happy to chat whenever works for you — even a quick 5 minutes is great 📞`,
  },
  {
    type: 'email',
    delayMs: 2 * H,
    subject: `Still here!`,
    body: `Hey {{name}},

Just making sure my last message didn't get lost! Totally get it, life gets busy.

Whenever you're ready for a quick chat, just hit reply 😊

{{agentName}}`,
  },

  // Step 3 — +1 day
  {
    type: 'sms',
    delayMs: 1 * D,
    body: `Still got homes to show you {{name}} 🏡 What does your schedule look like this week?`,
  },
  {
    type: 'email',
    delayMs: 1 * D,
    subject: `Still got homes for you...`,
    body: `Hey {{name}},

I've been keeping an eye out and honestly some really good stuff is coming up that matches what you're looking for.

Would love to jump on a quick call — even just 10 minutes. When works?

{{agentName}}`,
  },

  // Step 4 — +2 days
  {
    type: 'sms',
    delayMs: 2 * D,
    body: `Hey! Found some great homes I'd hate for you to miss. Any chance we could connect today? 🙌`,
  },
  {
    type: 'email',
    delayMs: 2 * D,
    subject: `Don't want you to miss this...`,
    body: `Hey {{name}},

Just keeping this on your radar — I've got some homes that I think are a really good fit and I don't want them to slip past you.

If now's a better time, just reply or we can keep it super short. Happy to work around your schedule!

{{agentName}}`,
  },

  // Step 5 — +3 days
  {
    type: 'sms',
    delayMs: 3 * D,
    body: `Hey {{name}}, last check-in from me for a while! No worries if timing isn't right — I'll be in touch soon 🏡`,
  },
  {
    type: 'email',
    delayMs: 3 * D,
    subject: `My last check-in for now`,
    body: `Hey {{name}},

I promise I won't keep bugging you! Just wanted to do one last check-in before I give you some breathing room.

If anything changes or you're ready to chat, I'm always here. You can reach out anytime — no pressure at all.

Hope to connect soon!
{{agentName}}`,
  },

  // Nurturing escalation at +5 days (not a real message — triggers escalation)
  {
    type: 'nurturing_escalation',
    delayMs: 5 * D,
    body: '__escalate__',
  },
];

// ── Booking Reminders ────────────────────────────────────────
// Delays are relative to callTimeUtc (negative = before call)
export interface BookingTemplate {
  type: 'sms' | 'email';
  offsetMs: number; // relative to callTimeUtc. 0 = send now. negative = before call
  isImmediate?: boolean; // send_at = now (not callTime + offset)
  subject?: string;
  body: string;
}

export const BOOKING_TEMPLATES: BookingTemplate[] = [
  // Immediate confirmation
  {
    type: 'sms',
    offsetMs: 0,
    isImmediate: true,
    body: `You're booked! 🎉 Looking forward to our call on {{callTime}}, {{name}}. I'll have a list of homes ready just for you!`,
  },
  {
    type: 'email',
    offsetMs: 0,
    isImmediate: true,
    subject: `Call confirmed 📅`,
    body: `Hey {{name}}!

You're all booked — so excited to connect with you!

Your call is scheduled for:
📅 {{callTime}}

I'm going to spend some time before our call pulling together homes that match exactly what you're looking for. You're going to love what I've found.

Talk soon!
{{agentName}}`,
  },

  // 48h before
  {
    type: 'sms',
    offsetMs: -48 * H,
    body: `Quick heads up {{name}} — our call is in 2 days on {{callTime}}. Can't wait to show you what I've found! 🏡`,
  },
  {
    type: 'email',
    offsetMs: -48 * H,
    subject: `2 days to go!`,
    body: `Hey {{name}},

Just a quick reminder that our call is coming up in 2 days:
📅 {{callTime}}

I've been doing some prep work and I think you're going to love what I've put together. See you then!

{{agentName}}`,
  },

  // 24h before
  {
    type: 'sms',
    offsetMs: -24 * H,
    body: `Tomorrow's the day! 😊 Our call is at {{callTime}}, {{name}}. Can't wait to chat!`,
  },
  {
    type: 'email',
    offsetMs: -24 * H,
    subject: `Tomorrow's your call!`,
    body: `Hey {{name}},

Just a reminder — our call is tomorrow!

📅 {{callTime}}

Looking forward to going through everything with you. See you then!

{{agentName}}`,
  },

  // 1h before
  {
    type: 'sms',
    offsetMs: -1 * H,
    body: `One hour to go ⏰ Our call starts at {{callTime}}, {{name}}. Talk soon!`,
  },
  {
    type: 'email',
    offsetMs: -1 * H,
    subject: `1 hour away!`,
    body: `Hey {{name}},

We're almost there — just one hour until our call!

📅 {{callTime}}

I'll be ready to go. Talk soon!

{{agentName}}`,
  },
];

// Switch message when contact books while in new_lead
export const BOOKING_SWITCH_SMS = `Oh nice! Just saw you pop up in my calendar 😄 Looking forward to our call on {{callTime}}, {{name}}!`;

// ── Nurturing (30-day) ────────────────────────────────────────
export interface NurturingTemplate {
  type: 'sms' | 'email';
  dayOffset: number;
  subject?: string;
  body: string;
}

export const NURTURING_TEMPLATES: NurturingTemplate[] = [
  // Day 1 — email + SMS
  {
    type: 'email',
    dayOffset: 1,
    subject: `Still thinking about that home? 🏡`,
    body: `Hey {{name}}!

Just popping in to say hi. Still here whenever you're ready to take a look at some homes.

No pressure — your timeline, your pace.

{{agentName}}`,
  },
  {
    type: 'sms',
    dayOffset: 1,
    body: `Hey {{name}}! Still here whenever you're ready to find your home 🏡 No rush, just wanted to check in!`,
  },

  // Day 2 — email only
  {
    type: 'email',
    dayOffset: 2,
    subject: `Quick question... 🤔`,
    body: `Hey {{name}},

If you could describe your perfect home in 3 words, what would they be?

I ask everyone and the answers always surprise me. (It also helps me know exactly what to look for!)

Just hit reply — I'm curious 😊

{{agentName}}`,
  },

  // Day 3 — email only
  {
    type: 'email',
    dayOffset: 3,
    subject: `Real talk 🙏`,
    body: `Hey {{name}},

I know home-buying can feel overwhelming. There's so much to figure out — finances, timing, what you actually want.

But honestly? That's exactly what I'm here for. You don't need to have it all figured out before we talk.

Whenever you're ready, just reply. I'm happy to listen first, help second.

{{agentName}}`,
  },

  // Day 5 — email only
  {
    type: 'email',
    dayOffset: 5,
    subject: `Did you know... 👀`,
    body: `Hey {{name}},

Most buyers I work with say the biggest thing they regret is waiting too long.

I'm not saying jump in before you're ready — I'm saying don't let hesitation be the only thing holding you back.

If you ever want to just talk through where you're at, I'm happy to listen. No agenda.

{{agentName}}`,
  },

  // Day 10 — email + SMS
  {
    type: 'email',
    dayOffset: 10,
    subject: `Still in your corner 🙌`,
    body: `Hey {{name}}!

Just a quick note to let you know I'm still thinking about finding you the right home.

Market's been interesting lately — some really good stuff popping up. Worth a quick chat if you're even a little curious.

{{agentName}}`,
  },
  {
    type: 'sms',
    dayOffset: 10,
    body: `Hey {{name}}! Just a quick check-in — still got my eyes open for homes that'd be perfect for you 🏡 Whenever you're ready!`,
  },

  // Day 15 — email only
  {
    type: 'email',
    dayOffset: 15,
    subject: `Half a month later... 👀`,
    body: `Hey {{name}},

Can't believe it's been a couple of weeks! Life moves fast.

I'm still here, still got my eyes open for you. Whenever the timing feels right, just say the word.

{{agentName}}`,
  },

  // Day 20 — email + SMS
  {
    type: 'email',
    dayOffset: 20,
    subject: `Something to think about 🏡`,
    body: `Hey {{name}},

Here's a question I love asking people who are on the fence:

"Where do you see yourself in a year?"

For a lot of people, the answer involves a home of their own. If that's you — let's make it happen.

{{agentName}}`,
  },
  {
    type: 'sms',
    dayOffset: 20,
    body: `Hey {{name}}! Where do you see yourself in a year? Still happy to help you find your home whenever you're ready 🏡`,
  },

  // Day 25 — email only
  {
    type: 'email',
    dayOffset: 25,
    subject: `Quick check-in ✌️`,
    body: `Hey {{name}}!

Hope you've been well. Just a quick hello from me.

Still here if you ever want to revisit the home search. No agenda — just genuinely want to help when you're ready.

{{agentName}}`,
  },

  // Day 27 — email only
  {
    type: 'email',
    dayOffset: 27,
    subject: `Good feeling about this 🎯`,
    body: `Hey {{name}},

I've got a good feeling you're going to find something you love — it just might need a little more time.

When that day comes, I want to be the one who helps you get there. Reach out anytime!

{{agentName}}`,
  },

  // Day 28 — email only
  {
    type: 'email',
    dayOffset: 28,
    subject: `Real quick... 🙏`,
    body: `Hey {{name}},

Is there anything specific that's been holding you back? Sometimes just talking it through makes all the difference.

Feel free to reply and let me know what's going on. I promise I won't bite! 😄

{{agentName}}`,
  },

  // Day 29 — email only
  {
    type: 'email',
    dayOffset: 29,
    subject: `Almost done bugging you 😴`,
    body: `Hey {{name}},

Tomorrow's the last time I'll check in for this round — I want to respect your space!

But if you're even a little curious about what's available right now, just say the word.

{{agentName}}`,
  },

  // Day 30 — email + SMS
  {
    type: 'email',
    dayOffset: 30,
    subject: `Last one, I promise 👋`,
    body: `Hey {{name}},

This is my last scheduled check-in! I've genuinely enjoyed keeping your search in mind.

Whenever you're ready — whether it's tomorrow or next year — I'll be here.

Take care!
{{agentName}}`,
  },
  {
    type: 'sms',
    dayOffset: 30,
    body: `Hey {{name}}, last message from me for now! Whenever you're ready to find your home, I'm here 🏡 Take care!`,
  },
];
