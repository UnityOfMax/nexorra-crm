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
      className={`px-3 py-2 rounded-lg border bg-green-50 min-w-[160px] max-w-[220px] ${
        selected ? 'border-green-500 shadow-md ring-1 ring-green-300' : 'border-green-300 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="p-1 bg-green-500 rounded shrink-0">
          <Zap className="w-3 h-3 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wide leading-none mb-0.5">
            Trigger
          </div>
          <div className="text-xs font-semibold text-gray-800 truncate">{data.label}</div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
}
