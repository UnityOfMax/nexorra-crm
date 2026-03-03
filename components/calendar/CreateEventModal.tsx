'use client';

import { useState } from 'react';
import { X, Clock, FileText } from 'lucide-react';

interface CreateEventModalProps {
  accountId: string;
  userId: string;
  onClose: () => void;
  onEventCreated: () => void;
  preselectedDate?: Date;
}

function defaultStart(preselectedDate?: Date): string {
  const d = preselectedDate ? new Date(preselectedDate) : new Date();
  // Round to nearest 30 min
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  return d.toISOString().slice(0, 16);
}

function addHour(dateTimeLocal: string): string {
  const d = new Date(dateTimeLocal);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}

export default function CreateEventModal({
  accountId,
  userId,
  onClose,
  onEventCreated,
  preselectedDate
}: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const startDefault = defaultStart(preselectedDate);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    startDate: startDefault,
    endDate: addHour(startDefault),
  });

  const handleStartChange = (val: string) => {
    const newEnd = addHour(val);
    setFormData(prev => ({
      ...prev,
      startDate: val,
      // Only auto-adjust end if it was previously exactly start+1h (user hasn't customised it)
      endDate: prev.endDate === addHour(prev.startDate) ? newEnd : prev.endDate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const startMs = new Date(formData.startDate).getTime();
    const endMs = new Date(formData.endDate).getTime();
    if (endMs <= startMs) {
      setError('End time must be after start time.');
      setLoading(false);
      return;
    }
    const durationMinutes = Math.round((endMs - startMs) / 60000);

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          type: 'meeting',
          subject: formData.subject,
          description: formData.description,
          dueDate: new Date(formData.startDate).toISOString(),
          durationMinutes,
          createdBy: userId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create event');
      }

      onEventCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#2c2c2e] rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Meeting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meeting Title *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input pl-10"
                placeholder="e.g., Client Meeting"
                required
              />
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Time *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleStartChange(e.target.value)}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Time *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="datetime-local"
                value={formData.endDate}
                min={formData.startDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Add meeting details..."
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Auto-sync:</strong> This meeting will automatically sync to your Google Calendar if connected.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
