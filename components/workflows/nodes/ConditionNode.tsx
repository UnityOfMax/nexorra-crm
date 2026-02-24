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
    <div className="relative flex flex-col items-center">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />

      {/* Diamond shape */}
      <div
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
        className={`px-8 py-5 bg-amber-50 min-w-[140px] ${
          selected ? 'outline outline-2 outline-amber-500' : 'outline outline-1 outline-amber-300'
        }`}
      >
        <div className="flex flex-col items-center gap-1">
          <GitBranch className="w-3.5 h-3.5 text-amber-600" />
          <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide text-center">
            Condition
          </div>
          <div className="text-xs font-semibold text-gray-800 text-center leading-tight">
            {data.label}
          </div>
        </div>
      </div>

      {/* True/False labels */}
      <div className="flex justify-between w-full px-2 mt-0.5">
        <span className="text-[9px] text-red-500 font-semibold">No</span>
        <span className="text-[9px] text-green-600 font-semibold">Yes</span>
      </div>

      <Handle
        type="source"
        position={Position.Left}
        id="false"
        className="!bg-red-500 !w-2.5 !h-2.5 !border-2 !border-white !-left-1"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white !-right-1"
      />
    </div>
  );
}
