'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Loader, Check, ChevronRight, FileText, AlertCircle } from 'lucide-react';

// Standard CRM contact fields that form questions can be mapped to
const CRM_FIELDS = [
  { value: '', label: '— Skip this field —' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'custom:address', label: 'Address' },
  { value: 'custom:city', label: 'City' },
  { value: 'custom:state', label: 'State / Province' },
  { value: 'custom:zip', label: 'Zip / Postal Code' },
  { value: 'custom:message', label: 'Message / Notes' },
  { value: 'custom:property_address', label: 'Property Address' },
  { value: 'custom:budget', label: 'Budget' },
  { value: 'custom:timeline', label: 'Timeline' },
  { value: 'custom:bedrooms', label: 'Bedrooms' },
  { value: 'custom:pre_approved', label: 'Pre-Approved?' },
  { value: 'custom:agent_name', label: 'Current Agent' },
  { value: 'custom:referral_source', label: 'Referral Source' },
];

interface Question {
  key: string;
  label: string;
  type: string;
}

interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count_meta: number;
  leads_count_local: number;
  questions: Question[];
}

interface FacebookLeadFormsProps {
  accountId: string;
  onBack: () => void;
}

export default function FacebookLeadForms({ accountId, onBack }: FacebookLeadFormsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/integrations/facebook/lead-forms?accountId=${accountId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load forms');
      setForms(data.forms || []);
      setSelectedFormIds(data.selectedFormIds || []);
      setFieldMappings(data.fieldMappings || {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = (id: string) => {
    setSelectedFormIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const setMapping = (questionKey: string, crmField: string) => {
    setFieldMappings(prev => ({ ...prev, [questionKey]: crmField }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/integrations/facebook/lead-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, selectedFormIds, fieldMappings }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      setMessage('Saved');
      setTimeout(() => setMessage(''), 2500);
    } catch (e: any) {
      setMessage('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Collect all unique questions from selected forms for the mapping view
  const allQuestions: Question[] = [];
  const seen = new Set<string>();
  for (const form of forms) {
    if (!selectedFormIds.includes(form.id)) continue;
    for (const q of form.questions) {
      if (!seen.has(q.key)) {
        allQuestions.push(q);
        seen.add(q.key);
      }
    }
  }

  const activeForm = forms.find(f => f.id === activeFormId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={activeForm ? () => setActiveFormId(null) : onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            {activeForm ? activeForm.name : 'Lead Forms'}
          </h5>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeForm
              ? 'Map form questions to contact fields'
              : 'Select which forms to sync leads from'}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-6 justify-center text-gray-400">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading forms…</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Form Question Mapping (drill-in) */}
          {activeForm ? (
            <div className="space-y-3">
              {activeForm.questions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No custom questions on this form — standard fields (name, email, phone) are mapped automatically.
                </p>
              ) : (
                activeForm.questions.map(q => (
                  <div key={q.key} className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{q.label}</p>
                      <p className="text-xs text-gray-400 font-mono">{q.key}</p>
                    </div>
                    <select
                      value={fieldMappings[q.key] || ''}
                      onChange={e => setMapping(q.key, e.target.value)}
                      className="input text-sm py-1.5"
                    >
                      {CRM_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}

              <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Standard fields (first_name, last_name, email, phone_number) are always mapped automatically and don't need to be configured here.
                </p>
              </div>
            </div>
          ) : (
            /* Form List */
            <div className="space-y-2">
              {forms.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No lead forms found on this page.
                </p>
              )}
              {forms.map(form => {
                const isSelected = selectedFormIds.includes(form.id);
                return (
                  <div
                    key={form.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-400/60 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'border-gray-200/60 dark:border-white/5 bg-white dark:bg-white/[0.02]'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleForm(form.id)}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>

                    {/* Form info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{form.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          form.status === 'ACTIVE'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                        }`}>
                          {form.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {form.leads_count_local} synced
                        </span>
                      </div>
                    </div>

                    {/* Map fields button — only shown when selected */}
                    {isSelected && (
                      <button
                        onClick={() => setActiveFormId(form.id)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex-shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Map fields
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Save + status */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2 text-sm"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
            {message && (
              <span className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                {message}
              </span>
            )}
          </div>

          {!activeForm && selectedFormIds.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {selectedFormIds.length} form{selectedFormIds.length > 1 ? 's' : ''} selected — leads will sync every 5 minutes.
            </p>
          )}
        </>
      )}
    </div>
  );
}
