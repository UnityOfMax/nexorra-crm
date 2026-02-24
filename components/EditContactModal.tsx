'use client';

import { useState } from 'react';
import { Contact } from '@/types';
import { supabase } from '@/lib/supabase-browser';
import { X, Save } from 'lucide-react';

interface EditContactModalProps {
  contact: Contact;
  onClose: () => void;
  onSave: () => void;
}

export default function EditContactModal({ contact, onClose, onSave }: EditContactModalProps) {
  const [formData, setFormData] = useState({
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    company: contact.company || '',
    status: contact.status || 'lead',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('contacts')
        .update(formData)
        .eq('id', contact.id);

      if (updateError) throw updateError;

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Contact</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'lead' | 'customer' | 'lost' })}
              className="input"
            >
              <option value="lead">Lead</option>
              <option value="customer">Customer</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Form answers from landing page lead capture */}
          {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Lead Answers</h4>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto">
                {Object.entries(contact.custom_fields).map(([key, value]) => (
                  <div key={key}>
                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{key}</span>
                    <span className="block text-sm text-gray-900 dark:text-gray-100 mt-0.5">{String(value || '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
