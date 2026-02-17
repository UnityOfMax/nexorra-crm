'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Plus, X } from 'lucide-react';

interface FieldUpdate {
  id: string;
  field: string;
  value: string;
}

interface UpdateContactConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function UpdateContactConfig({ node, onUpdate }: UpdateContactConfigProps) {
  const [updates, setUpdates] = useState<FieldUpdate[]>(
    node.data.config?.updates || [{ id: '1', field: 'status', value: '' }]
  );

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        updates,
      },
    });
  }, [updates]);

  const addUpdate = () => {
    setUpdates([
      ...updates,
      { id: Date.now().toString(), field: 'status', value: '' },
    ]);
  };

  const removeUpdate = (id: string) => {
    if (updates.length <= 1) return;
    setUpdates(updates.filter((u) => u.id !== id));
  };

  const updateField = (id: string, updates_partial: Partial<FieldUpdate>) => {
    setUpdates(
      updates.map((u) => (u.id === id ? { ...u, ...updates_partial } : u))
    );
  };

  const fieldOptions = [
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'status', label: 'Status' },
    { value: 'company', label: 'Company' },
    { value: 'job_title', label: 'Job Title' },
    { value: 'address', label: 'Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zip', label: 'ZIP Code' },
    { value: 'country', label: 'Country' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Field Updates
        </label>
        <button
          onClick={addUpdate}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Field
        </button>
      </div>

      <div className="space-y-3">
        {updates.map((update, index) => (
          <div key={update.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                Update {index + 1}
              </span>
              {updates.length > 1 && (
                <button
                  onClick={() => removeUpdate(update.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Field
              </label>
              <select
                value={update.field}
                onChange={(e) => updateField(update.id, { field: e.target.value })}
                className="input w-full text-sm"
              >
                {fieldOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                New Value
              </label>
              <input
                type="text"
                value={update.value}
                onChange={(e) => updateField(update.id, { value: e.target.value })}
                className="input w-full text-sm"
                placeholder="Enter new value"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 mb-2">
          Dynamic Values
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p>You can use variables in the value field:</p>
          <div className="mt-2 space-y-0.5">
            <div><code>{'{{contact.first_name}}'}</code> - Contact's first name</div>
            <div><code>{'{{contact.email}}'}</code> - Contact's email</div>
            <div><code>{'{{deal.title}}'}</code> - Deal title</div>
            <div><code>{'{{today}}'}</code> - Current date</div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-purple-900 mb-1">
          Update Notes
        </h4>
        <ul className="text-xs text-purple-700 space-y-1 list-disc list-inside">
          <li>Updates will overwrite existing values</li>
          <li>An activity will be logged for the update</li>
          <li>Empty values will clear the field</li>
          <li>Invalid emails or phone numbers will be rejected</li>
        </ul>
      </div>
    </div>
  );
}
