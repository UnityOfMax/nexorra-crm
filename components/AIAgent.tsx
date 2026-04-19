'use client';

import { useState, useEffect } from 'react';
import { Bot, MessageSquare, Mail, Zap, Save, ToggleLeft, ToggleRight, Info, FlaskConical, Settings, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
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
  // SMS agent
  agent_name: string;
  agent_represents: string;
  system_prompt: string;
  max_tokens: number;
  // Email agent
  email_agent_name: string;
  email_agent_represents: string;
  email_system_prompt: string;
  email_max_tokens: number;
  // Knowledge base
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

// Test preset: "Dan" — SMS assistant for Ben (Florida realtor)
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

// Test preset: "Dan" — Email assistant for Ben (Florida realtor)
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const inputClass = 'input text-sm';
  const tabClass = (t: Tab) =>
    `flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
    }`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Bot className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Agent</h2>
          <p className="text-sm text-gray-500">Configure your AI agents for SMS and email</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button onClick={() => setActiveTab('general')} className={tabClass('general')}>
          <Settings className="w-4 h-4" />
          General
        </button>
        <button onClick={() => setActiveTab('sms')} className={tabClass('sms')}>
          <MessageSquare className="w-4 h-4" />
          SMS Agent
        </button>
        <button onClick={() => setActiveTab('email')} className={tabClass('email')}>
          <Mail className="w-4 h-4" />
          Email Agent
        </button>
        <button onClick={() => setActiveTab('test')} className={tabClass('test')}>
          <FlaskConical className="w-4 h-4" />
          Test Chat
        </button>
        <button onClick={() => setActiveTab('kb')} className={tabClass('kb')}>
          <BookOpen className="w-4 h-4" />
          Knowledge Base
        </button>
      </div>

      {/* ── GENERAL TAB ── */}
      {activeTab === 'general' && (<>
        {/* Master toggle */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">AI Agent {config.enabled ? 'Enabled' : 'Disabled'}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {config.enabled
                  ? 'The AI is actively responding to inbound messages.'
                  : 'The AI is off. No automatic replies will be sent.'}
              </p>
            </div>
            <button onClick={() => set('enabled', !config.enabled)} className="flex-shrink-0" aria-label="Toggle AI">
              {config.enabled
                ? <ToggleRight className="w-12 h-12 text-primary-600" />
                : <ToggleLeft className="w-12 h-12 text-gray-400" />}
            </button>
          </div>
          {config.enabled && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-2">Response mode</p>
              <div className="flex gap-3">
                {(['auto', 'suggest'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => set('mode', m)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      config.mode === m
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200/60 dark:border-white/5 text-gray-600 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {m === 'auto' ? '⚡ Auto-reply' : '💡 Suggest only'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {config.mode === 'auto'
                  ? 'Auto-reply: the AI sends responses automatically to inbound messages.'
                  : 'Suggest: the AI drafts responses in Conversations for you to review before sending.'}
              </p>
            </div>
          )}
        </div>

        {/* Active channels */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-500" /> Active Channels
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">SMS Agent</p>
                  <p className="text-xs text-gray-500">Responds to inbound text messages</p>
                </div>
              </div>
              <button onClick={() => setChannel('sms', !config.channels.sms)}>
                {config.channels.sms
                  ? <ToggleRight className="w-8 h-8 text-green-600" />
                  : <ToggleLeft className="w-8 h-8 text-gray-400" />}
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Email Agent</p>
                  <p className="text-xs text-gray-500">Responds to inbound emails via Resend routing</p>
                </div>
              </div>
              <button onClick={() => setChannel('email', !config.channels.email)}>
                {config.channels.email
                  ? <ToggleRight className="w-8 h-8 text-blue-600" />
                  : <ToggleLeft className="w-8 h-8 text-gray-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Shared tone + context */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Shared Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
              <select className={inputClass} value={config.tone} onChange={e => set('tone', e.target.value)}>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="professional">Professional</option>
                <option value="formal">Formal</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Applied to both SMS and email agents.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business context</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="We're a real estate team in Miami specialising in luxury condos..."
                value={config.business_context}
                onChange={e => set('business_context', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Shared context injected into both agents' prompts.</p>
            </div>
          </div>
        </div>

        {/* Follow-ups info */}
        <div className="card bg-blue-50 border-blue-100">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 text-sm">Automatic Follow-ups</p>
              <p className="text-sm text-blue-700 mt-1">
                When the AI sends a message and the contact doesn't reply within 24 hours, the AI will
                automatically send a dynamic, context-aware follow-up. This repeats up to 3 times over
                3 days. Follow-ups stop immediately when the contact replies.
              </p>
            </div>
          </div>
        </div>
      </>)}

      {/* ── SMS AGENT TAB ── */}
      {activeTab === 'sms' && (<>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">SMS Agent</h3>
              <p className="text-sm text-gray-500 mt-0.5">Handles inbound text conversations on your behalf.</p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, ...DAN_SMS_CONFIG }))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
              title="Load Dan SMS preset (test config for Ben's real estate team)"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Load Dan (test)
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Dan"
                  value={config.agent_name}
                  onChange={e => set('agent_name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Represents</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Ben (the agent)"
                  value={config.agent_represents}
                  onChange={e => set('agent_represents', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System prompt</label>
              <textarea
                rows={8}
                className={`${inputClass} resize-none`}
                placeholder="You are a friendly real estate assistant. You handle text conversations on behalf of [Agent Name] and your goal is to qualify leads and book calls..."
                value={config.system_prompt}
                onChange={e => set('system_prompt', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Core instruction for the SMS agent. Keep it SMS-appropriate — concise, human, direct.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max response length — {config.max_tokens} tokens (~{Math.round(config.max_tokens * 0.75)} words)
              </label>
              <input
                type="range" min={50} max={500} step={25}
                value={config.max_tokens}
                onChange={e => set('max_tokens', parseInt(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Short (50)</span><span>Long (500)</span>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ── EMAIL AGENT TAB ── */}
      {activeTab === 'email' && (<>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Email Agent</h3>
              <p className="text-sm text-gray-500 mt-0.5">Handles inbound email conversations on your behalf.</p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, ...DAN_EMAIL_CONFIG }))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
              title="Load Dan email preset (test config for Ben's real estate team)"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Load Dan (test)
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Dan"
                  value={config.email_agent_name}
                  onChange={e => set('email_agent_name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Represents</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Ben (the agent)"
                  value={config.email_agent_represents}
                  onChange={e => set('email_agent_represents', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System prompt</label>
              <textarea
                rows={8}
                className={`${inputClass} resize-none`}
                placeholder="You handle email correspondence on behalf of [Agent Name]. Write professional, concise emails that feel human. Always end with a clear next step..."
                value={config.email_system_prompt}
                onChange={e => set('email_system_prompt', e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Core instruction for the email agent. Can be longer than SMS — emails allow more context.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max response length — {config.email_max_tokens} tokens (~{Math.round(config.email_max_tokens * 0.75)} words)
              </label>
              <input
                type="range" min={100} max={1000} step={50}
                value={config.email_max_tokens}
                onChange={e => set('email_max_tokens', parseInt(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Short (100)</span><span>Long (1000)</span>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ── TEST CHAT TAB ── */}
      {activeTab === 'test' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">
            Simulate inbound conversations to see how each agent responds. No real messages are sent.
          </p>
          {/* Channel picker */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-4">
            <button
              onClick={() => setTestChannel('sms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                testChannel === 'sms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              SMS — {config.agent_name || 'Agent'}
            </button>
            <button
              onClick={() => setTestChannel('email')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                testChannel === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
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

      {/* ── KNOWLEDGE BASE TAB ── */}
      {activeTab === 'kb' && (<>
        <div className="card">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Knowledge Base</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Facts the AI always has access to — markets, commissions, FAQs, objection handling.
            </p>
          </div>
          <textarea
            rows={20}
            className={`${inputClass} resize-y w-full`}
            placeholder={KB_TEMPLATE}
            value={config.knowledge_base || ''}
            onChange={e => set('knowledge_base', e.target.value)}
            onFocus={() => {
              if (!config.knowledge_base) set('knowledge_base', KB_TEMPLATE);
            }}
          />
          <p className="text-xs text-gray-400 mt-2">
            Use plain text or Markdown. This is injected into every AI prompt so keep it factual and concise.
          </p>
        </div>

        <div className="card">
          <button
            onClick={() => setKbLearningsOpen(v => !v)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              Conversation Learnings
              <span className="text-xs font-normal text-gray-400">(auto-accumulated)</span>
            </span>
            {kbLearningsOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          {kbLearningsOpen && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
              <p className="text-xs text-gray-400 italic">
                Learnings from past conversations will appear here automatically as the AI processes replies.
              </p>
            </div>
          )}
        </div>
      </>)}

      {/* Save button — shown on all non-test tabs */}
      {activeTab !== 'test' && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        </div>
      )}
    </div>
  );
}
