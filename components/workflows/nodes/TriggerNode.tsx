'use client';

import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

interface TriggerNodeProps {
  data: {
    label: string;
    stepType: string;
    config?: Record<string, any>;
  };
  selected?: boolean;
}

export default function TriggerNode({ data, selected }: TriggerNodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-green-50 to-emerald-50 min-w-[200px] transition-shadow ${
        selected
          ? 'border-green-500 shadow-lg ring-2 ring-green-200'
          : 'border-green-400 shadow-md'
      }`}
    >
      {/* Icon and Label */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-green-500 rounded-md">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-green-700 uppercase tracking-wide">
            Trigger
          </div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
        </div>
      </div>

      {/* Config Preview */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="mt-2 pt-2 border-t border-green-200">
          <div className="text-xs text-gray-600 space-y-1">
            {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="truncate">
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}
