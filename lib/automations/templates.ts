// ============================================================
// Automation message templates
// Tokens: {{contact.first_name}}, {{user.firstname}}, {{callTime}}
// ============================================================

export interface MessageTemplate {
  type: 'sms' | 'email' | 'nurturing_escalation';
  delayMs: number;
  subject?: string; // email only
  body: string;
}

// -- Helpers --------------------------------------------------
const H = 60 * 60 * 1000;
const D = 24 * H;

// Apply token replacements
export function applyTokens(
  text: string,
  tokens: { contactFirstName: string; userFirstName: string; callTime?: string }
): string {
  return text
    .replace(/\{\{contact\.first_name\}\}/g, tokens.contactFirstName)
    .replace(/\{\{user\.firstname\}\}/g, tokens.userFirstName)
    .replace(/\{\{callTime\}\}/g, tokens.callTime || '');
}

// -- New Lead -------------------------------------------------
export const NEW_LEAD_TEMPLATES: MessageTemplate[] = [
  // Step 1 -- immediate
  {
    type: 'sms',
    delayMs: 0,
    body: `Hi {{contact.first_name}}, I saw your request come in. I am putting together some options for you now. When is a good time for a quick call?`,
  },
  {
    type: 'email',
    delayMs: 0,
    subject: 'Got your request',
    body: `Hi {{contact.first_name}},

I saw your request come through and I am already putting together a list of homes based on what you are looking for.

Do you have 10 minutes for a quick call? I want to make sure I have the right properties lined up for you.

Just reply with a time that works.

{{user.firstname}}`,
  },

  // Step 2 -- +1 day
  {
    type: 'sms',
    delayMs: 1 * D,
    body: `Hi {{contact.first_name}}, just following up. Even a quick 5-minute call works — let me know when you're free.`,
  },
  {
    type: 'email',
    delayMs: 1 * D,
    subject: `Following up`,
    body: `Hi {{contact.first_name}},

Wanted to make sure my earlier message didn't slip through. I know things get busy.

Whenever you have a moment, just reply and we can set up a quick call.

{{user.firstname}}`,
  },

  // Step 3 -- +2 days
  {
    type: 'sms',
    delayMs: 2 * D,
    body: `Hi {{contact.first_name}}, I still have some properties to show you. What does your schedule look like this week?`,
  },
  {
    type: 'email',
    delayMs: 2 * D,
    subject: `Properties matching your search`,
    body: `Hi {{contact.first_name}},

I have been keeping an eye on listings and there are some strong options coming up that match what you described.

Would you be available for a quick call this week? Even 10 minutes would be enough to go over them.

{{user.firstname}}`,
  },

  // Step 4 -- +3 days
  {
    type: 'sms',
    delayMs: 3 * D,
    body: `Hi {{contact.first_name}}, I found some homes I think you would like. Any chance we could connect today?`,
  },
  {
    type: 'email',
    delayMs: 3 * D,
    subject: `A few homes worth seeing`,
    body: `Hi {{contact.first_name}},

Just keeping this on your radar. I have a few properties that look like a strong fit and I would hate for them to go before you get a chance to see them.

If now works better, just reply and I will work around your schedule.

{{user.firstname}}`,
  },

  // Step 5 -- +4 days
  {
    type: 'sms',
    delayMs: 4 * D,
    body: `Hi {{contact.first_name}}, this is my last check-in for a bit. No worries if the timing is not right. I will be around when you are ready.`,
  },
  {
    type: 'email',
    delayMs: 4 * D,
    subject: `Last check-in for now`,
    body: `Hi {{contact.first_name}},

I will give you some space after this one. Just wanted to reach out one more time in case the timing works better now.

If anything changes or you are ready to talk, I am here. No pressure at all.

Talk soon,
{{user.firstname}}`,
  },

  // Nurturing escalation at +5 days (not a real message -- triggers escalation)
  {
    type: 'nurturing_escalation',
    delayMs: 5 * D,
    body: '__escalate__',
  },
];

// -- Booking Reminders ----------------------------------------
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
    body: `Call confirmed for {{callTime}}, {{contact.first_name}}. I will have a list of homes ready for you.`,
  },
  {
    type: 'email',
    offsetMs: 0,
    isImmediate: true,
    subject: `Call confirmed`,
    body: `Hi {{contact.first_name}},

You are all set. Your call is scheduled for:
{{callTime}}

I will spend some time before our call putting together properties that match what you are looking for.

Talk soon,
{{user.firstname}}`,
  },

  // 48h before
  {
    type: 'sms',
    offsetMs: -48 * H,
    body: `Hi {{contact.first_name}}, just a reminder that our call is in 2 days on {{callTime}}.`,
  },
  {
    type: 'email',
    offsetMs: -48 * H,
    subject: `Your call is in 2 days`,
    body: `Hi {{contact.first_name}},

Quick reminder that our call is coming up in 2 days:
{{callTime}}

I have been doing some prep work and have some good options to go over with you. See you then.

{{user.firstname}}`,
  },

  // 24h before
  {
    type: 'sms',
    offsetMs: -24 * H,
    body: `Hi {{contact.first_name}}, our call is tomorrow at {{callTime}}. Looking forward to it.`,
  },
  {
    type: 'email',
    offsetMs: -24 * H,
    subject: `Call tomorrow`,
    body: `Hi {{contact.first_name}},

Just a reminder that our call is tomorrow:
{{callTime}}

Looking forward to going through everything with you.

{{user.firstname}}`,
  },

  // 1h before
  {
    type: 'sms',
    offsetMs: -1 * H,
    body: `Hi {{contact.first_name}}, our call starts in one hour at {{callTime}}. Talk soon.`,
  },
  {
    type: 'email',
    offsetMs: -1 * H,
    subject: `Call in 1 hour`,
    body: `Hi {{contact.first_name}},

Just a heads up, our call is in one hour:
{{callTime}}

I will be ready to go. Talk soon.

{{user.firstname}}`,
  },
];

// Switch message when contact books while in new_lead
export const BOOKING_SWITCH_SMS = `Got it — you're booked for {{callTime}}, {{contact.first_name}}. Looking forward to it.`;

// -- Nurturing (30-day) ---------------------------------------
export interface NurturingTemplate {
  type: 'sms' | 'email';
  dayOffset: number;
  subject?: string;
  body: string;
}

export const NURTURING_TEMPLATES: NurturingTemplate[] = [
  // Day 1 -- email + SMS
  {
    type: 'email',
    dayOffset: 1,
    subject: `Still thinking about finding a home?`,
    body: `Hi {{contact.first_name}},

Just checking in. I am still here whenever you are ready to take a look at some properties.

No pressure at all -- your timeline, your pace.

{{user.firstname}}`,
  },
  {
    type: 'sms',
    dayOffset: 1,
    body: `Hi {{contact.first_name}}, just checking in. Still here whenever you are ready to start your home search. No rush.`,
  },

  // Day 2 -- email only
  {
    type: 'email',
    dayOffset: 2,
    subject: `Quick question`,
    body: `Hi {{contact.first_name}},

If you could describe your ideal home in three words, what would they be?

I ask everyone this and it really helps me narrow down what to look for. Just hit reply -- I am curious to hear.

{{user.firstname}}`,
  },

  // Day 3 -- email only
  {
    type: 'email',
    dayOffset: 3,
    subject: `No need to have it all figured out`,
    body: `Hi {{contact.first_name}},

I know the home-buying process can feel like a lot. There is a lot to think about -- finances, timing, what you actually want.

That is exactly what I am here to help with. You do not need to have it all sorted before we talk.

Whenever you are ready, just reply. We can start wherever makes sense for you.

{{user.firstname}}`,
  },

  // Day 5 -- email only
  {
    type: 'email',
    dayOffset: 5,
    subject: `Something worth thinking about`,
    body: `Hi {{contact.first_name}},

Most buyers I work with say the biggest thing they regret is waiting too long.

I am not saying rush into anything -- just that hesitation alone is not a great reason to hold off.

If you ever want to talk through where you are at, I am happy to listen. No agenda.

{{user.firstname}}`,
  },

  // Day 10 -- email + SMS
  {
    type: 'email',
    dayOffset: 10,
    subject: `Still keeping an eye out for you`,
    body: `Hi {{contact.first_name}},

Just a quick note to let you know I am still watching for properties that match what you are looking for.

The market has been active lately and there are some solid options. Worth a quick chat if you are even a little curious.

{{user.firstname}}`,
  },
  {
    type: 'sms',
    dayOffset: 10,
    body: `Hi {{contact.first_name}}, just a quick check-in. Still keeping an eye on listings for you. Let me know when you are ready to take a look.`,
  },

  // Day 15 -- email only
  {
    type: 'email',
    dayOffset: 15,
    subject: `Checking in`,
    body: `Hi {{contact.first_name}},

Hard to believe it has been a couple of weeks already.

I am still here and still watching the market for you. Whenever the timing feels right, just say the word.

{{user.firstname}}`,
  },

  // Day 20 -- email + SMS
  {
    type: 'email',
    dayOffset: 20,
    subject: `Where do you see yourself in a year?`,
    body: `Hi {{contact.first_name}},

Here is a question I like to ask: where do you see yourself in a year?

For a lot of people, the answer involves a place of their own. If that sounds like you, let's make it happen.

{{user.firstname}}`,
  },
  {
    type: 'sms',
    dayOffset: 20,
    body: `Hi {{contact.first_name}}, where do you see yourself in a year? If owning a home is part of the plan, I am here to help whenever you are ready.`,
  },

  // Day 25 -- email only
  {
    type: 'email',
    dayOffset: 25,
    subject: `Quick hello`,
    body: `Hi {{contact.first_name}},

Hope you have been well. Just a quick hello from me.

Still here if you ever want to revisit your home search. No agenda -- just genuinely want to help when you are ready.

{{user.firstname}}`,
  },

  // Day 27 -- email only
  {
    type: 'email',
    dayOffset: 27,
    subject: `The right home is out there`,
    body: `Hi {{contact.first_name}},

I have a feeling you are going to find something you love. It might just need a little more time.

When that day comes, I want to be the one helping you get there. Reach out anytime.

{{user.firstname}}`,
  },

  // Day 28 -- email only
  {
    type: 'email',
    dayOffset: 28,
    subject: `Anything holding you back?`,
    body: `Hi {{contact.first_name}},

Is there anything specific that has been holding you back? Sometimes just talking it through makes all the difference.

Feel free to reply and let me know what is going on. I am here to help.

{{user.firstname}}`,
  },

  // Day 29 -- email only
  {
    type: 'email',
    dayOffset: 29,
    subject: `One more check-in`,
    body: `Hi {{contact.first_name}},

Tomorrow will be my last message for this round. I want to respect your space.

But if you are even a little curious about what is available right now, just say the word.

{{user.firstname}}`,
  },

  // Day 30 -- email + SMS
  {
    type: 'email',
    dayOffset: 30,
    subject: `Last message for now`,
    body: `Hi {{contact.first_name}},

This is my last scheduled check-in. I have enjoyed keeping your search in mind.

Whenever you are ready -- whether it is next week or next year -- I will be here.

Take care,
{{user.firstname}}`,
  },
  {
    type: 'sms',
    dayOffset: 30,
    body: `Hi {{contact.first_name}}, last message from me for now. Whenever you are ready to find your home, I am here. Take care.`,
  },
];
