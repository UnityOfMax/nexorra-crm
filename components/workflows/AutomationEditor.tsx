'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import {
  NEW_LEAD_TEMPLATES,
  BOOKING_TEMPLATES,
  NURTURING_TEMPLATES,
  MessageTemplate,
  BookingTemplate,
  NurturingTemplate,
} from '@/lib/automations/templates';

type AutomationId = 'new_lead' | 'booking_reminders' | 'nurturing';

interface AutomationEditorProps {
  accountId: string;
  automationId: AutomationId;
  onBack: () => void;
}

type AnyTemplate = MessageTemplate | BookingTemplate | NurturingTemplate;

const H = 60 * 60 * 1000;
const D = 24 * H;

function stepLabel(automationId: AutomationId, t: AnyTemplate): string {
  if (automationId === 'new_lead') {
    const m = t as MessageTemplate;
    if (m.delayMs === 0) return 'Immediate';
    if (m.delayMs < D) return `+${m.delayMs / H}h`;
    return `+${m.delayMs / D}d`;
  }
  if (automationId === 'booking_reminders') {
    const b = t as BookingTemplate;
    if (b.isImmediate) return 'On booking';
    const h = b.offsetMs / H;
    return `${Math.abs(h)}h before call`;
  }
  // nurturing
  return `Day ${(t as NurturingTemplate).dayOffset}`;
}

const AUTOMATION_NAMES: Record<AutomationId, string> = {
  new_lead: 'New Lead Follow-up',
  booking_reminders: 'Booking Reminders',
  nurturing: 'Nurturing Sequence',
};

const AUTOMATION_DESCRIPTIONS: Record<AutomationId, string> = {
  new_lead: '5-day follow-up sequence triggered when a lead submits the contact form.',
  booking_reminders: 'Confirmation + reminders sent around the booked call time.',
  nurturing: '30-day long-term nurturing sequence for unresponsive leads.',
};

function getDefaults(automationId: AutomationId): AnyTemplate[] {
  if (automationId === 'new_lead') {
    return NEW_LEAD_TEMPLATES.filter((t) => t.type !== 'nurturing_escalation');
  }
  if (automationId === 'booking_reminders') return BOOKING_TEMPLATES;
  return NURTURING_TEMPLATES;
}

export default function AutomationEditor({ accountId, automationId, onBack }: AutomationEditorProps) {
  const [templates, setTemplates] = useState<AnyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const defaults = getDefaults(automationId);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/automations/configs?accountId=${accountId}&automationId=${automationId}`)
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.templates ?? defaults);
      })
      .catch(() => setTemplates(defaults))
      .finally(() => setLoading(false));
  }, [accountId, automationId]);

  const handleBodyChange = (index: number, value: string) => {
    setTemplates((prev) => prev.map((t, i) => (i === index ? { ...t, body: value } : t)));
    setSaved(false);
  };

  const handleSubjectChange = (index: number, value: string) => {
    setTemplates((prev) => prev.map((t, i) => (i === index ? { ...t, subject: value } : t)));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/automations/configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, automationId, templates }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all messages to the default templates?')) return;
    await fetch(
      `/api/automations/configs?accountId=${accountId}&automationId=${automationId}`,
      { method: 'DELETE' }
    );
    setTemplates(defaults);
    setSaved(false);
  };

  const hasCallTimeToken = automationId === 'booking_reminders';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{AUTOMATION_NAMES[automationId]}</h2>
            <p className="text-gray-600 mt-1">{AUTOMATION_DESCRIPTIONS[automationId]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Token hint */}
      <div className="mb-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        Available tokens:{' '}
        <code className="font-mono">{'{{name}}'}</code> (contact first name),{' '}
        <code className="font-mono">{'{{agentName}}'}</code>
        {hasCallTimeToken && (
          <>, <code className="font-mono">{'{{callTime}}'}</code> (booked call time)</>
        )}
      </div>

      {/* Message steps */}
      <div className="space-y-4">
        {templates.map((t, index) => (
          <div key={index} className="card">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                {stepLabel(automationId, t)}
              </span>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  t.type === 'sms'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {t.type === 'sms' ? 'SMS' : 'Email'}
              </span>
            </div>

            {t.type === 'email' && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={(t as any).subject ?? ''}
                  onChange={(e) => handleSubjectChange(index, e.target.value)}
                  className="input w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={t.body}
                onChange={(e) => handleBodyChange(index, e.target.value)}
                rows={t.type === 'email' ? 6 : 3}
                className="input w-full resize-y font-mono text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
