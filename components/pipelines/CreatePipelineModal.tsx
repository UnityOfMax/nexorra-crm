'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePipelineModalProps {
  accountId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface StageInput {
  id: string;
  name: string;
  color: string;
}

const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];

export default function CreatePipelineModal({ accountId, onClose, onSuccess }: CreatePipelineModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'sales' | 'hiring' | 'support' | 'custom'>('sales');
  const [isDefault, setIsDefault] = useState(false);
  const [stages, setStages] = useState<StageInput[]>([
    { id: '1', name: 'New Lead', color: '#3B82F6' },
    { id: '2', name: 'Qualified', color: '#10B981' },
    { id: '3', name: 'Proposal', color: '#F59E0B' },
    { id: '4', name: 'Closed Won', color: '#8B5CF6' },
  ]);
  const [loading, setLoading] = useState(false);

  const addStage = () => {
    const newStage: StageInput = {
      id: Date.now().toString(),
      name: `Stage ${stages.length + 1}`,
      color: defaultColors[stages.length % defaultColors.length],
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (id: string) => {
    if (stages.length <= 2) {
      toast.error('You must have at least 2 stages');
      return;
    }
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStage = (id: string, field: 'name' | 'color', value: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a pipeline name');
      return;
    }

    if (stages.length < 2) {
      toast.error('You must have at least 2 stages');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          name,
          description,
          type,
          isDefault,
          stages: stages.map((stage, index) => ({
            name: stage.name,
            color: stage.color,
            position: index,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create pipeline');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating pipeline:', error);
      toast.error('Failed to create pipeline. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay p-4">
      <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create New Pipeline</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pipeline Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipeline Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="e.g., Sales Pipeline"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pipeline Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="input w-full"
                >
                  <option value="sales">Sales</option>
                  <option value="hiring">Hiring</option>
                  <option value="support">Support</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Set as default pipeline</span>
                </label>
              </div>
            </div>
          </div>

          {/* Stages */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Pipeline Stages * (min 2)
              </label>
              <button
                type="button"
                onClick={addStage}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Stage
              </button>
            </div>

            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={stage.id} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                    className="input flex-1"
                    placeholder="Stage name"
                    required
                  />
                  <input
                    type="color"
                    value={stage.color}
                    onChange={(e) => updateStage(stage.id, 'color', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    title="Stage color"
                  />
                  <button
                    type="button"
                    onClick={() => removeStage(stage.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    disabled={stages.length <= 2}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
