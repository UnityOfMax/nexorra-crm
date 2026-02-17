'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Plus, X } from 'lucide-react';

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ConditionConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function ConditionConfig({ node, onUpdate }: ConditionConfigProps) {
  const [logic, setLogic] = useState(node.data.config?.logic || 'and');
  const [conditions, setConditions] = useState<Condition[]>(
    node.data.config?.conditions || [
      { id: '1', field: 'contact.email', operator: 'is_not_empty', value: '' },
    ]
  );

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        logic,
        conditions,
      },
    });
  }, [logic, conditions]);

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: Date.now().toString(), field: 'contact.email', operator: 'is_not_empty', value: '' },
    ]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const fieldOptions = [
    { value: 'contact.email', label: 'Contact Email' },
    { value: 'contact.phone', label: 'Contact Phone' },
    { value: 'contact.first_name', label: 'Contact First Name' },
    { value: 'contact.last_name', label: 'Contact Last Name' },
    { value: 'contact.status', label: 'Contact Status' },
    { value: 'deal.value', label: 'Deal Value' },
    { value: 'deal.status', label: 'Deal Status' },
    { value: 'deal.probability', label: 'Deal Probability' },
  ];

  const operatorOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_or_equal', label: 'Greater or Equal' },
    { value: 'less_or_equal', label: 'Less or Equal' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Match Logic
        </label>
        <select
          value={logic}
          onChange={(e) => setLogic(e.target.value)}
          className="input w-full"
        >
          <option value="and">Match ALL conditions (AND)</option>
          <option value="or">Match ANY condition (OR)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {logic === 'and'
            ? 'All conditions must be true for the TRUE path'
            : 'At least one condition must be true for the TRUE path'}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Conditions
          </label>
          <button
            onClick={addCondition}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Condition
          </button>
        </div>

        {conditions.map((condition, index) => (
          <div key={condition.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                Condition {index + 1}
              </span>
              {conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(condition.id)}
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
                value={condition.field}
                onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
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
                Operator
              </label>
              <select
                value={condition.operator}
                onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                className="input w-full text-sm"
              >
                {operatorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  className="input w-full text-sm"
                  placeholder="Enter value"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-yellow-900 mb-2">
          Condition Paths
        </h4>
        <div className="text-xs text-yellow-700 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span><strong>TRUE (Right):</strong> When conditions match</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span><strong>FALSE (Left):</strong> When conditions don't match</span>
          </div>
        </div>
      </div>
    </div>
  );
}
