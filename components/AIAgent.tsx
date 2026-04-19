'use client';

import { useState, useEffect, useRef } from 'react';
import AITestChat from './ai/AITestChat';

interface AIAgentProps {
  accountId: string;
}

interface AIConfig {
  enabled: boolean;
  mode: 'suggest' | 'auto';
  tone: string;
  business_context: string;
  channels: { sms: boolean; email: boolean };
  agent_name: string;
  agent_represents: string;
  system_prompt: string;
  max_tokens: number;
  email_agent_name: string;
  email_agent_represents: string;
  email_system_prompt: string;
  email_max_tokens: number;
  knowledge_base: string;
}

const DEFAULT_CONFIG: AIConfig = {
  enabled: false,
  mode: 'auto',
  tone: 'friendly',
  business_context: '',
  channels: { sms: true, email: true },
  agent_name: '',
  agent_represents: '',
  system_prompt: '',
  max_tokens: 300,
  email_agent_name: '',
  email_agent_represents: '',
  email_system_prompt: '',
  email_max_tokens: 500,
  knowledge_base: '',
};

const DAN_SMS_CONFIG: Partial<AIConfig> = {
  agent_name: 'Dan',
  agent_represents: 'Ben',
  channels: { sms: true, email: false },
  max_tokens: 300,
  enabled: true,
  mode: 'auto',
  system_prompt: `Your name is Dan. You are 27 years old and work as a text-based assistant to Ben, a licensed real estate agent operating in Florida. Your job is to handle inbound and outbound text conversations on Ben's behalf. You book appointments, answer questions about listings and the buying/selling process, qualify leads, and keep things moving so Ben can focus on his clients.

You are not a robot. You are Dan — a real person (as far as the conversation is concerned). Never reveal that you are an AI. If someone directly and sincerely asks if you're a bot or AI, deflect naturally: "Nope, just Dan — I handle all of Ben's texts. What can I help you with?"

TONE & COMMUNICATION STYLE:
Text like a real 27-year-old professional — casual enough to feel human, professional enough to be taken seriously.

Do:
- Be direct and to the point
- Match the energy of the person you're texting — brief if they're brief, looser if they're chatty
- Use natural, conversational language
- Show empathy when someone is stressed or overwhelmed (buying/selling a home is emotional)
- Use short sentences and natural texting rhythm — no walls of text
- Use contractions: "we've got," "I'll check on that," "sounds good"

Never say: "Certainly!", "Absolutely!", "Great question!", "That's a smart move!", "Of course!", or anything sycophantic. No corporate language. No walls of text.

Example of what NOT to sound like:
"That's a fantastic question! Buying a home is such an exciting journey and it's really smart of you to be thinking about this early..."

Example of what Dan sounds like:
"Yeah, totally makes sense to start early. Ben's got a few spots open this week — does Thursday or Friday work better for you?"

PRIMARY OBJECTIVES:
1. Book appointments — get leads scheduled with Ben. Always offer specific times, not open-ended availability.
2. Answer questions — address real estate questions clearly. If it needs Ben's specific input, say you'll check and follow up.
3. Qualify leads — understand where they are in their journey (buying/selling/browsing, pre-approved, timeline) without making it feel like an interrogation. Ask one or two questions, then move toward a next step.
4. Keep things moving — always end with a clear next step or question.

APPOINTMENT BOOKING PROTOCOL:
- Always offer two specific time options: "Ben's got Thursday at 10am or Friday at 2pm — either of those work for you?"
- Once confirmed: "Perfect. I've got you down for Thursday at 10am with Ben. He'll give you a call then. Anything specific you want him to come prepared with?"

HANDLING COMMON SCENARIOS:
New lead / first contact: "Hey, this is Dan — I help Ben with his client communication. Are you looking to buy, sell, or just exploring right now?"
Buyer: naturally work in timeline, pre-approval status, area/budget.
Seller: get property address, timeline, whether they've spoken to other agents. Move toward getting Ben in front of them.
Someone frustrated: "Yeah, the market's been a lot to deal with lately. Let's get you some time with Ben — he can walk you through what actually makes sense for your situation."
Someone not ready: "No worries at all. When you're closer to being ready, just shoot a text and we'll get Ben on it."

WHAT YOU DON'T KNOW / ESCALATION:
For legal questions, mortgage details, pricing strategy, inspection issues: "Good question — that one's better coming straight from Ben. I'll flag it for him and he'll follow up with you directly. Should be within a few hours."

KEY REMINDERS:
- You represent Ben professionally at all times
- Florida real estate context — seasonal buyers, snowbirds, hurricane season where relevant
- Every conversation ends with a clear next step
- Keep it human. Keep it real. Keep it moving.`,
  business_context: "Ben is a licensed real estate agent in Florida helping buyers and sellers navigate the local market. Dan handles all text communication on Ben's behalf.",
};

const DAN_EMAIL_CONFIG: Partial<AIConfig> = {
  email_agent_name: 'Dan',
  email_agent_represents: 'Ben',
  email_max_tokens: 500,
  email_system_prompt: `Your name is Dan. You are 27 years old and work as an email assistant to Ben, a licensed real estate agent operating in Florida. Your job is to handle email correspondence on Ben's behalf — responding to inquiries, following up on leads, and keeping conversations moving so Ben can focus on his clients.

You are not a robot. You are Dan — a real person (as far as the email is concerned). Never reveal that you are an AI. If someone directly and sincerely asks, deflect naturally: "Nope, just Dan — I handle Ben's email. What can I help you with?"

TONE & COMMUNICATION STYLE:
Write emails that feel human — professional enough to be taken seriously, warm enough that people actually want to respond.

Do:
- Open with a brief, warm greeting using first name if you have it
- Get to the point quickly — no waffling
- Match the formality of whoever you're responding to
- Use short paragraphs (2-3 sentences max each)
- Always end with a clear call to action or next step
- Sign off as "Dan | Ben's Team" or just "— Dan"

Never: walls of text, excessive pleasantries, corporate jargon, sycophantic openers like "I hope this email finds you well" or "Thank you so much for reaching out!"

Example of what NOT to sound like:
"Thank you so much for your email! I hope this message finds you in great spirits. It's truly wonderful to hear from you and I'm so excited to assist you with your real estate journey today!"

Example of what Dan sounds like:
"Hey Sarah — thanks for reaching out. Ben's got a couple of spots open this week for a quick call. Thursday at 10am or Friday at 2pm — either of those work?"

PRIMARY OBJECTIVES:
1. Book calls/meetings — get leads scheduled with Ben. Offer two specific times.
2. Answer questions — address real estate questions clearly and concisely.
3. Qualify leads — understand buying/selling intent, timeline, and situation through natural conversation.
4. Follow up — if a lead goes quiet, re-engage with a brief, non-pushy email.
5. Keep things moving — every email ends with a clear next step.

EMAIL STRUCTURE:
- Greeting: "Hey [First Name]," or "Hi [First Name],"
- Body: 1-3 short paragraphs
- CTA: One clear action (reply, pick a time, answer a question)
- Sign-off: "Dan | Ben's Team" or "— Dan"

FLORIDA REAL ESTATE CONTEXT:
Ben works in Florida — seasonal buyers (snowbirds), waterfront properties, hurricane considerations where relevant.
Buyer leads: work in timeline, pre-approval status, area/budget.
Seller leads: get property address, timeline, whether they've spoken to other agents. Move toward getting Ben in front of them.

WHAT YOU DON'T KNOW / ESCALATION:
For legal questions, mortgage details, pricing strategy, inspection issues: "Good question — I'll flag that for Ben and he'll get back to you directly within a few hours."

KEY REMINDERS:
- You represent Ben professionally at all times
- Keep emails short — if it won't fit in 3 paragraphs, it's too long
- Every email ends with a clear next step
- Keep it human. Keep it real. Keep it moving.`,
};

const KB_TEMPLATE = `## Markets I Serve
[Markets and areas where you operate]

## My Commission Structure
[How your commission works — buyer side, seller side, typical rates]

## Common Objections & How I Handle Them
[e.g. "I already have an agent" → ...]

## About Me
[Brief bio: years of experience, specialties, what makes you different]

## Frequently Asked Questions
[Questions leads commonly ask and your answers]`;

type Tab = 'general' | 'sms' | 'email' | 'test' | 'kb';

// ─── Shared style helpers ───
const MONO: React.CSSProperties = { fontFamily: 'Geist Mono, monospace' };

const card: React.CSSProperties = {
  background: 'var(--paper-2)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '16px 18px',
};

const cardTitle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  fontFamily: 'Geist Mono, monospace',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ink-2)',
  fontFamily: 'Geist Mono, monospace',
  marginBottom: 6,
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  background: 'var(--paper-3)',
  border: '1px solid var(--line)',
  borderRadius: 7,
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const textareaStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  background: 'var(--paper-3)',
  border: '1px solid var(--line)',
  borderRadius: 7,
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  lineHeight: 1.5,
};

const selectStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  background: 'var(--paper-3)',
  border: '1px solid var(--line)',
  borderRadius: 7,
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-3)',
  marginTop: 4,
};

const mainCard: React.CSSProperties = {
  background: 'var(--paper-2)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '20px 22px',
};

const sectionTitle: React.CSSProperties = {
  margin: '0 0 2px',
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--ink)',
};

const sectionSub: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 13,
  color: 'var(--ink-3)',
};

const divider: React.CSSProperties = {
  height: 1,
  background: 'var(--line)',
  margin: '14px 0',
};

const toggleTrackOn: React.CSSProperties = {
  position: 'relative',
  width: 44,
  height: 24,
  borderRadius: 12,
  background: 'var(--green)',
  border: 'none',
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
};

const toggleTrackOff: React.CSSProperties = {
  ...toggleTrackOn,
  background: 'var(--line)',
};

const toggleThumbOn: React.CSSProperties = {
  position: 'absolute',
  top: 3,
  left: 'calc(100% - 21px)',
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
};

const toggleThumbOff: React.CSSProperties = {
  ...toggleThumbOn,
  left: 3,
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={on ? toggleTrackOn : toggleTrackOff} aria-label="Toggle">
      <span style={on ? toggleThumbOn : toggleThumbOff} />
    </button>
  );
}

function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 7,
    border: 'none',
    background: active ? 'var(--paper-3)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--ink-3)',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, color 0.15s',
  };
}

// ─── Checkmark icon for capabilities ───
function CheckIcon() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
      background: 'color-mix(in srgb, var(--green) 15%, transparent)',
      border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2 6l3 3 5-5" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Sparkle SVG for agent avatar ───
function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="white" opacity="0.9" />
    </svg>
  );
}

export default function AIAgent({ accountId }: AIAgentProps) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [testChannel, setTestChannel] = useState<'sms' | 'email'>('sms');
  const [kbLearningsOpen, setKbLearningsOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/ai/config?accountId=${accountId}`)
      .then(r => r.json())
      .then(({ config: c }) => {
        if (c) setConfig({ ...DEFAULT_CONFIG, ...c });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accountId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, ...config }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof AIConfig>(key: K, value: AIConfig[K]) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const setChannel = (ch: 'sms' | 'email', value: boolean) =>
    setConfig(prev => ({ ...prev, channels: { ...prev.channels, [ch]: value } }));

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 200, color: 'var(--ink-3)', fontSize: 13, ...MONO,
      }}>
        Loading configuration…
      </div>
    );
  }

  const activeChs = [
    config.channels.sms && 'SMS',
    config.channels.email && 'Email',
  ].filter(Boolean);

  const CAPABILITIES = [
    'Smart reply generation',
    'Sentiment detection',
    'Lead scoring',
    'Follow-up scheduling',
    'Multi-channel support',
  ];

  return (
    <div
      style={{
        maxWidth: 1480,
        margin: '0 auto',
        padding: '24px 32px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            AI Agent
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
            Configure AI auto-reply for SMS and email.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Online/Offline badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: config.enabled
              ? 'color-mix(in srgb, var(--green) 12%, transparent)'
              : 'color-mix(in srgb, var(--ink-3) 10%, transparent)',
            color: config.enabled ? 'var(--green)' : 'var(--ink-3)',
            fontSize: 12, fontWeight: 600, ...MONO,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: config.enabled ? 'var(--green)' : 'var(--ink-3)',
              display: 'inline-block',
            }} />
            {config.enabled ? 'Online' : 'Offline'}
          </span>
          {/* Configure button */}
          <button
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--paper-2)', color: 'var(--ink-2)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
            onClick={() => setActiveTab('general')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13.3 6.4l-.8-.5a5 5 0 0 0 0-1.8l.8-.5a.8.8 0 0 0 .3-1L13 2a.8.8 0 0 0-1-.3l-.8.5a5.2 5.2 0 0 0-1.6-.9V.8A.8.8 0 0 0 8.8 0H7.2a.8.8 0 0 0-.8.8v.9A5.2 5.2 0 0 0 4.8 2.6L4 2.1A.8.8 0 0 0 3 2.4L2.4 3.5a.8.8 0 0 0 .3 1l.8.5a5 5 0 0 0 0 1.8l-.8.5a.8.8 0 0 0-.3 1l.6 1.1a.8.8 0 0 0 1 .3l.8-.5c.5.4 1 .7 1.6.9v.9a.8.8 0 0 0 .8.8h1.6a.8.8 0 0 0 .8-.8v-.9a5.2 5.2 0 0 0 1.6-.9l.8.5a.8.8 0 0 0 1-.3l.6-1.1a.8.8 0 0 0-.3-1Z" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Configure
          </button>
        </div>
      </div>

      {/* ── Body: 260px sidebar + right panel ── */}
      <div
        className="nx-stack-mobile"
        style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'flex-start' }}
      >
        {/* ── Left Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Capabilities card */}
          <div style={card}>
            <p style={cardTitle}>Capabilities</p>
            {CAPABILITIES.map((cap, i) => (
              <div
                key={cap}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < CAPABILITIES.length - 1 ? '1px solid var(--line)' : 'none',
                  fontSize: 13, color: 'var(--ink-2)',
                }}
              >
                <CheckIcon />
                {cap}
              </div>
            ))}
          </div>

          {/* Today's Activity card */}
          <div style={card}>
            <p style={cardTitle}>Today's Activity</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { label: 'Messages', value: String(activeChs.length > 0 ? '—' : '0') },
                { label: 'Drafts', value: '—' },
                { label: 'Actions', value: '—' },
                { label: 'Cost', value: '$0.00' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--paper-3)',
                    borderRight: i % 2 === 0 ? '1px solid var(--line)' : 'none',
                    borderBottom: i < 2 ? '1px solid var(--line)' : 'none',
                  }}
                >
                  <div style={{
                    fontSize: 10, color: 'var(--ink-3)', ...MONO,
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
                  }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: 'var(--ink)', ...MONO,
                  }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          height: 'calc(100vh - 57px)',
          background: 'var(--paper-2)',
          borderLeft: '1px solid var(--line)',
          borderRadius: 12,
          border: '1px solid var(--line)',
          overflow: 'hidden',
          minHeight: 500,
        }}>
          {/* Right panel header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--paper-2)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Agent avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: 'var(--grad)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <SparkleIcon />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>AI Agent</span>
              {/* Online dot */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--green)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                Online
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Toggle on={config.enabled} onToggle={() => set('enabled', !config.enabled)} />
            </div>
          </div>

          {/* Tab bar within right panel */}
          <div style={{
            display: 'flex', gap: 2, padding: 4,
            background: 'var(--paper-2)',
            borderBottom: '1px solid var(--line)',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}>
            {(['general', 'sms', 'email', 'test', 'kb'] as Tab[]).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={tabBtnStyle(activeTab === t)}>
                {t === 'general' ? 'General'
                  : t === 'sms' ? 'SMS Agent'
                  : t === 'email' ? 'Email Agent'
                  : t === 'test' ? 'Test Chat'
                  : 'Knowledge Base'}
              </button>
            ))}
          </div>

          {/* Scrollable content area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── General tab ── */}
            {activeTab === 'general' && (
              <>
                {/* Master toggle card */}
                <div style={mainCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ ...sectionTitle, margin: '0 0 2px' }}>
                        AI Agent {config.enabled ? 'Enabled' : 'Disabled'}
                      </p>
                      <p style={{ ...sectionSub, margin: 0 }}>
                        {config.enabled
                          ? 'The AI is actively responding to inbound messages.'
                          : 'The AI is off. No automatic replies will be sent.'}
                      </p>
                    </div>
                    <Toggle on={config.enabled} onToggle={() => set('enabled', !config.enabled)} />
                  </div>
                  {config.enabled && (
                    <>
                      <div style={divider} />
                      <p style={{ ...labelStyle, marginBottom: 8 }}>Response mode</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 0 }}>
                        {(['auto', 'suggest'] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => set('mode', m)}
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                              fontSize: 13, fontWeight: config.mode === m ? 600 : 500,
                              border: config.mode === m ? '1px solid var(--blue)' : '1px solid var(--line)',
                              background: config.mode === m
                                ? 'color-mix(in srgb, var(--blue) 10%, var(--paper-2))'
                                : 'transparent',
                              color: config.mode === m ? 'var(--blue)' : 'var(--ink-3)',
                            }}
                          >
                            {m === 'auto' ? 'Auto-reply' : 'Suggest only'}
                          </button>
                        ))}
                      </div>
                      <p style={{ ...hintStyle, marginTop: 8 }}>
                        {config.mode === 'auto'
                          ? 'Auto-reply: the AI sends responses automatically to inbound messages.'
                          : 'Suggest: the AI drafts responses in Conversations for you to review before sending.'}
                      </p>
                    </>
                  )}
                </div>

                {/* Active Channels */}
                <div style={mainCard}>
                  <p style={cardTitle}>Active Channels</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      {
                        key: 'sms' as const,
                        name: 'SMS Agent',
                        desc: 'Responds to inbound text messages',
                        iconColor: 'var(--green)',
                        icon: (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                            <rect x="1" y="2" width="14" height="10" rx="2" stroke="var(--green)" strokeWidth="1.5" />
                            <path d="M4 14l2-2h4l2 2" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        ),
                      },
                      {
                        key: 'email' as const,
                        name: 'Email Agent',
                        desc: 'Responds to inbound emails via Resend routing',
                        iconColor: 'var(--blue)',
                        icon: (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                            <rect x="1" y="3" width="14" height="10" rx="2" stroke="var(--blue)" strokeWidth="1.5" />
                            <path d="M1 5l7 5 7-5" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        ),
                      },
                    ].map(ch => (
                      <div
                        key={ch.key}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', background: 'var(--paper-3)',
                          borderRadius: 8, border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {ch.icon}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                              {ch.name}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1, margin: 0 }}>
                              {ch.desc}
                            </p>
                          </div>
                        </div>
                        <Toggle
                          on={config.channels[ch.key]}
                          onToggle={() => setChannel(ch.key, !config.channels[ch.key])}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shared Settings */}
                <div style={mainCard}>
                  <p style={cardTitle}>Shared Settings</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Tone</label>
                      <select style={selectStyle} value={config.tone} onChange={e => set('tone', e.target.value)}>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                        <option value="professional">Professional</option>
                        <option value="formal">Formal</option>
                      </select>
                      <p style={hintStyle}>Applied to both SMS and email agents.</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Business context</label>
                      <textarea
                        rows={3}
                        style={textareaStyle}
                        placeholder="We're a real estate team in Miami specialising in luxury condos..."
                        value={config.business_context}
                        onChange={e => set('business_context', e.target.value)}
                      />
                      <p style={hintStyle}>Shared context injected into both agents' prompts.</p>
                    </div>
                  </div>
                </div>

                {/* Follow-ups info banner */}
                <div style={{
                  display: 'flex', gap: 10, padding: '12px 14px',
                  background: 'color-mix(in srgb, var(--blue) 8%, var(--paper-2))',
                  border: '1px solid color-mix(in srgb, var(--blue) 20%, var(--line))',
                  borderRadius: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="8" cy="8" r="7" stroke="var(--blue)" strokeWidth="1.5" />
                    <path d="M8 7v4" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="5" r="0.75" fill="var(--blue)" />
                  </svg>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', margin: '0 0 4px' }}>
                      Automatic Follow-ups
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>
                      When the AI sends a message and the contact doesn't reply within 24 hours, the AI will
                      automatically send a dynamic, context-aware follow-up. This repeats up to 3 times over
                      3 days. Follow-ups stop immediately when the contact replies.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ── SMS Agent tab ── */}
            {activeTab === 'sms' && (
              <div style={mainCard}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <p style={{ ...sectionTitle, margin: '0 0 2px' }}>SMS Agent</p>
                    <p style={{ ...sectionSub, margin: 0 }}>Handles inbound text conversations on your behalf.</p>
                  </div>
                  <button
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid color-mix(in srgb, var(--violet) 30%, var(--line))',
                      background: 'color-mix(in srgb, var(--violet) 8%, var(--paper-2))',
                      color: 'var(--violet)', fontSize: 12, fontWeight: 600,
                    }}
                    onClick={() => setConfig(prev => ({ ...prev, ...DAN_SMS_CONFIG }))}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Load Dan (test)
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Agent name</label>
                      <input type="text" style={inputStyle} placeholder="e.g. Dan" value={config.agent_name} onChange={e => set('agent_name', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Represents</label>
                      <input type="text" style={inputStyle} placeholder="e.g. Ben (the agent)" value={config.agent_represents} onChange={e => set('agent_represents', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>System prompt</label>
                    <textarea
                      rows={8}
                      style={textareaStyle}
                      placeholder="You are a friendly real estate assistant. You handle text conversations on behalf of [Agent Name] and your goal is to qualify leads and book calls..."
                      value={config.system_prompt}
                      onChange={e => set('system_prompt', e.target.value)}
                    />
                    <p style={hintStyle}>Core instruction for the SMS agent. Keep it SMS-appropriate — concise, human, direct.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>
                      Max response length —{' '}
                      <span style={{ color: 'var(--ink)', ...MONO }}>{config.max_tokens} tokens</span>
                      {' '}(~{Math.round(config.max_tokens * 0.75)} words)
                    </label>
                    <input
                      type="range" min={50} max={500} step={25}
                      value={config.max_tokens}
                      onChange={e => set('max_tokens', parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--blue)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', ...MONO }}>
                      <span>Short (50)</span><span>Long (500)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Email Agent tab ── */}
            {activeTab === 'email' && (
              <div style={mainCard}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <p style={{ ...sectionTitle, margin: '0 0 2px' }}>Email Agent</p>
                    <p style={{ ...sectionSub, margin: 0 }}>Handles inbound email conversations on your behalf.</p>
                  </div>
                  <button
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid color-mix(in srgb, var(--violet) 30%, var(--line))',
                      background: 'color-mix(in srgb, var(--violet) 8%, var(--paper-2))',
                      color: 'var(--violet)', fontSize: 12, fontWeight: 600,
                    }}
                    onClick={() => setConfig(prev => ({ ...prev, ...DAN_EMAIL_CONFIG }))}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Load Dan (test)
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Agent name</label>
                      <input type="text" style={inputStyle} placeholder="e.g. Dan" value={config.email_agent_name} onChange={e => set('email_agent_name', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Represents</label>
                      <input type="text" style={inputStyle} placeholder="e.g. Ben (the agent)" value={config.email_agent_represents} onChange={e => set('email_agent_represents', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>System prompt</label>
                    <textarea
                      rows={8}
                      style={textareaStyle}
                      placeholder="You handle email correspondence on behalf of [Agent Name]. Write professional, concise emails that feel human. Always end with a clear next step..."
                      value={config.email_system_prompt}
                      onChange={e => set('email_system_prompt', e.target.value)}
                    />
                    <p style={hintStyle}>Core instruction for the email agent. Can be longer than SMS — emails allow more context.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>
                      Max response length —{' '}
                      <span style={{ color: 'var(--ink)', ...MONO }}>{config.email_max_tokens} tokens</span>
                      {' '}(~{Math.round(config.email_max_tokens * 0.75)} words)
                    </label>
                    <input
                      type="range" min={100} max={1000} step={50}
                      value={config.email_max_tokens}
                      onChange={e => set('email_max_tokens', parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--blue)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', ...MONO }}>
                      <span>Short (100)</span><span>Long (1000)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Test Chat tab ── */}
            {activeTab === 'test' && (
              <div>
                <p style={{ ...sectionSub, marginBottom: 12 }}>
                  Simulate inbound conversations to see how each agent responds. No real messages are sent.
                </p>
                <div style={{
                  display: 'flex', gap: 2, padding: 4,
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  marginBottom: 16,
                  width: 'fit-content',
                }}>
                  <button onClick={() => setTestChannel('sms')} style={tabBtnStyle(testChannel === 'sms')}>
                    SMS — {config.agent_name || 'Agent'}
                  </button>
                  <button onClick={() => setTestChannel('email')} style={tabBtnStyle(testChannel === 'email')}>
                    Email — {config.email_agent_name || 'Agent'}
                  </button>
                </div>
                <AITestChat
                  key={testChannel}
                  accountId={accountId}
                  agentName={testChannel === 'sms' ? (config.agent_name || 'SMS Agent') : (config.email_agent_name || 'Email Agent')}
                  agentRepresents={testChannel === 'sms' ? config.agent_represents : config.email_agent_represents}
                  channel={testChannel}
                />
              </div>
            )}

            {/* ── Knowledge Base tab ── */}
            {activeTab === 'kb' && (
              <>
                <div style={mainCard}>
                  <p style={{ ...sectionTitle, margin: '0 0 2px' }}>Knowledge Base</p>
                  <p style={{ ...sectionSub, margin: '0 0 14px' }}>
                    Facts the AI always has access to — markets, commissions, FAQs, objection handling.
                  </p>
                  <textarea
                    rows={20}
                    style={{ ...textareaStyle, resize: 'vertical' }}
                    placeholder={KB_TEMPLATE}
                    value={config.knowledge_base || ''}
                    onChange={e => set('knowledge_base', e.target.value)}
                    onFocus={() => {
                      if (!config.knowledge_base) set('knowledge_base', KB_TEMPLATE);
                    }}
                  />
                  <p style={{ ...hintStyle, marginTop: 6 }}>
                    Use plain text or Markdown. This is injected into every AI prompt so keep it factual and concise.
                  </p>
                </div>
                <div style={mainCard}>
                  <button
                    onClick={() => setKbLearningsOpen(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      padding: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M2 4l6 4 6-4" stroke="var(--violet)" strokeWidth="1.5" strokeLinecap="round" />
                        <rect x="1" y="3" width="14" height="10" rx="2" stroke="var(--violet)" strokeWidth="1.5" />
                      </svg>
                      Conversation Learnings
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 400 }}>(auto-accumulated)</span>
                    </span>
                    <svg
                      width="14" height="14" viewBox="0 0 16 16" fill="none"
                      style={{ transform: kbLearningsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <path d="M4 6l4 4 4-4" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  {kbLearningsOpen && (
                    <div style={{
                      marginTop: 12, paddingTop: 12,
                      borderTop: '1px solid var(--line)',
                      fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic',
                    }}>
                      Learnings from past conversations will appear here automatically as the AI processes replies.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Save button */}
            {activeTab !== 'test' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '9px 18px', borderRadius: 8, border: 'none',
                    background: saving ? 'var(--line)' : 'var(--ink)',
                    color: saving ? 'var(--ink-3)' : 'var(--paper)',
                    fontSize: 13, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20 18" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Save changes
                    </>
                  )}
                </button>
                {saved && (
                  <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                    Saved
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
