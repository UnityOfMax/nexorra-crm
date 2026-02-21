'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PipelineStage } from '@/types';
import type { Contact } from '@/types';

interface AddOpportunityModalProps {
  accountId: string;
  pipelineId: string;
  stages: PipelineStage[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddOpportunityModal({
  accountId,
  pipelineId,
  stages,
  onClose,
  onSuccess,
}: AddOpportunityModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  const [form, setForm] = useState({
    title: '',
    contactId: '',
    value: '',
    stageId: sortedStages[0]?.id || '',
  });

  useEffect(() => {
    fetch(`/api/contacts?accountId=${accountId}`)
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts || []))
      .catch(console.error);
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Name is required'); return; }
    if (!form.stageId) { setError('Please select a stage'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          pipelineId,
          pipelineStageId: form.stageId,
          title: form.title.trim(),
          contactId: form.contactId || undefined,
          value: form.value ? parseFloat(form.value) : 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to create opportunity');
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create opportunity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Opportunity</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opportunity Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="e.g. Smith Family — 3BR Condo"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Related Contact</label>
            <select
              value={form.contactId}
              onChange={(e) => setForm({ ...form, contactId: e.target.value })}
              className="input"
            >
              <option value="">— No contact —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                  {c.email ? ` (${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline Stage <span className="text-red-500">*</span>
            </label>
            <select
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value })}
              className="input"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Adding...' : 'Add Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
