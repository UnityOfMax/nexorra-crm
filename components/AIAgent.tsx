'use client';

import { useState, useEffect } from 'react';
import { Bot, MessageSquare, Mail, Zap, Save, ToggleLeft, ToggleRight, Info } from 'lucide-react';

interface AIAgentProps {
  accountId: string;
}

interface AIConfig {
  enabled: boolean;
  mode: 'suggest' | 'auto';
  system_prompt: string;
  tone: string;
  max_tokens: number;
  channels: { sms: boolean; email: boolean };
  business_context: string;
}

const DEFAULT_CONFIG: AIConfig = {
  enabled: false,
  mode: 'auto',
  system_prompt: '',
  tone: 'friendly',
  max_tokens: 500,
  channels: { sms: true, email: true },
  business_context: '',
};

export default function AIAgent({ accountId }: AIAgentProps) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Bot className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Agent</h2>
          <p className="text-sm text-gray-500">Configure your AI agent's behaviour for this account</p>
        </div>
      </div>

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
          <button
            onClick={() => set('enabled', !config.enabled)}
            className="flex-shrink-0"
            aria-label="Toggle AI"
          >
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
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
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

      {/* Channels */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary-500" /> Active Channels
        </h3>
        <div className="space-y-4">
          {/* SMS */}
          <div className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50">
            <MessageSquare className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 text-sm">SMS Agent</p>
                <button onClick={() => setChannel('sms', !config.channels.sms)}>
                  {config.channels.sms
                    ? <ToggleRight className="w-8 h-8 text-green-600" />
                    : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                </button>
              </div>
              {config.channels.sms && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Inbound SMS are batched for 15 seconds — if multiple messages arrive quickly, the AI responds to all of them together.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900 text-sm">Email Agent</p>
                <button onClick={() => setChannel('email', !config.channels.email)}>
                  {config.channels.email
                    ? <ToggleRight className="w-8 h-8 text-blue-600" />
                    : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                </button>
              </div>
              {config.channels.email && (
                <p className="text-xs text-gray-500">
                  Responds to inbound emails received via Resend inbound routing.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personality */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Personality & Instructions</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System prompt
            </label>
            <textarea
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="You are a friendly real estate assistant helping leads find their perfect home. You work for [Agent Name] and your goal is to qualify leads and book calls..."
              value={config.system_prompt}
              onChange={e => set('system_prompt', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              This is the core instruction the AI follows. Be specific about your role, goals, and what you want it to do.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={config.tone}
              onChange={e => set('tone', e.target.value)}
            >
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="formal">Formal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business context
            </label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="We're a boutique real estate team in Miami specialising in luxury condos and waterfront homes. Our target buyers are..."
              value={config.business_context}
              onChange={e => set('business_context', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Context about your business that helps the AI give more relevant responses.
            </p>
          </div>
        </div>
      </div>

      {/* Behaviour */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Behaviour</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max response length — {config.max_tokens} tokens (~{Math.round(config.max_tokens * 0.75)} words)
          </label>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={config.max_tokens}
            onChange={e => set('max_tokens', parseInt(e.target.value))}
            className="w-full accent-primary-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Short (100)</span>
            <span>Long (1000)</span>
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

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
