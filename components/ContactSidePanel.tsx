'use client';

import { useState, useEffect } from 'react';
import { X, Mail, MessageSquare, Phone, Building2, Tag, Save, Loader, Trash2 } from 'lucide-react';
import { Contact } from '@/types';

interface ContactSidePanelProps {
  contact: Contact | null;
  accountId: string;
  onClose: () => void;
  onSave: (updated: Contact) => void;
  onDelete?: (contactId: string) => void;
  onSmsClick: (contact: Contact) => void;
  onEmailClick: (contact: Contact) => void;
}

const STATUS_OPTIONS = ['lead', 'customer', 'lost'] as const;

export default function ContactSidePanel({
  contact,
  accountId,
  onClose,
  onSave,
  onDelete,
  onSmsClick,
  onEmailClick,
}: ContactSidePanelProps) {
  const [form, setForm] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        status: contact.status,
      });
      setSaveError('');
    }
  }, [contact]);

  if (!contact) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/contacts?id=${contact.id}&accountId=${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSaveError(data.error || 'Failed to save');
      } else {
        onSave(data.contact);
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts?id=${contact.id}&accountId=${accountId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      onDelete?.(contact.id);
      onClose();
    } catch {
      setSaveError('Failed to delete contact.');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const customFields = contact.custom_fields
    ? Object.entries(contact.custom_fields).filter(
        ([k]) => !['first_name', 'last_name', 'email', 'phone'].includes(k)
      )
    : [];

  return (
    <>
      {/* Backdrop (mobile + tablet) */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
        style={{ borderLeft: '1px solid #e5e7eb' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {contact.first_name} {contact.last_name}
            </h2>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                contact.status === 'customer'
                  ? 'bg-green-100 text-green-700'
                  : contact.status === 'lead'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {contact.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-5 py-4 border-b border-gray-100">
          <button
            onClick={() => onSmsClick(contact)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            title="Send SMS"
          >
            <MessageSquare className="w-4 h-4 text-primary-600" />
            SMS
          </button>
          <button
            onClick={() => onEmailClick(contact)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            title="Send Email"
          >
            <Mail className="w-4 h-4 text-primary-600" />
            Email
          </button>
        </div>

        {/* Editable fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
              <input
                className="input text-sm"
                value={form.first_name || ''}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
              <input
                className="input text-sm"
                value={form.last_name || ''}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </label>
            <input
              type="email"
              className="input text-sm"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </label>
            <input
              type="tel"
              className="input text-sm"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Company
            </label>
            <input
              type="text"
              className="input text-sm"
              value={form.company || ''}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Status
            </label>
            <select
              className="input text-sm"
              value={form.status || 'lead'}
              onChange={(e) => setForm({ ...form, status: e.target.value as Contact['status'] })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Lead form answers (read-only) */}
          {customFields.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">
                Form Answers
              </h3>
              <div className="space-y-2">
                {customFields.map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-800">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-2">
            Created {new Date(contact.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Footer: save + delete */}
        <div className="px-5 py-4 border-t border-gray-200 space-y-2">
          {saveError && (
            <p className="text-xs text-red-600 mb-1">{saveError}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete contact
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-danger flex-1 text-sm"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
