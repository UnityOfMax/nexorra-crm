'use client';

import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

interface ConditionNodeProps {
  data: {
    label: string;
    stepType: string;
    config?: Record<string, any>;
  };
  selected?: boolean;
}

export default function ConditionNode({ data, selected }: ConditionNodeProps) {
  return (
    <div className="relative">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Diamond-shaped container */}
      <div
        className={`relative px-6 py-4 bg-gradient-to-br from-amber-50 to-yellow-50 min-w-[180px] transition-shadow ${
          selected ? 'shadow-lg' : 'shadow-md'
        }`}
        style={{
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          border: selected ? '3px solid #f59e0b' : '2px solid #fbbf24',
        }}
      >
        {/* Content */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="p-1.5 bg-amber-500 rounded-md">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">
              Condition
            </div>
            <div className="text-sm font-semibold text-gray-900">{data.label}</div>
          </div>
        </div>
      </div>

      {/* Output Handles - True (left) and False (right) */}
      <Handle
        type="source"
        position={Position.Left}
        id="false"
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white !-right-1.5"
      />
    </div>
  );
}
