'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const MODEL_BADGES: Record<string, { label: string; color: string }> = {
  haiku:  { label: 'H', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  sonnet: { label: 'S', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  opus:   { label: 'O', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
};

function DepartmentNodeComponent({ data }: { data: any }) {
  const isRunning = data.status === 'running';
  const badge = MODEL_BADGES[data.model] || MODEL_BADGES.sonnet;

  return (
    <div
      className={`relative px-4 py-3 rounded-xl border-2 shadow-md min-w-[180px] transition-all
        bg-white dark:bg-[#161618]
        ${isRunning ? 'ring-2 ring-green-400/40 shadow-green-400/10' : ''}
      `}
      style={{ borderColor: data.deptColor + '80' }}
    >
      {isRunning && (
        <div className="absolute -top-px left-0 right-0 h-0.5 animate-pulse" style={{ background: `linear-gradient(90deg, transparent, ${data.deptColor}, transparent)` }} />
      )}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-2 !border-white dark:!border-gray-900" style={{ background: data.deptColor }} />
      <div className="flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0"
          style={{ background: data.deptColor }}
        >
          {data.displayName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[13px] text-gray-900 dark:text-gray-100">{data.displayName}</span>
            <span className={`text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold ${badge.color}`}>{badge.label}</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{data.deptLabel}</p>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isRunning ? 'bg-green-400 animate-pulse' :
          data.status === 'failed' ? 'bg-red-400' :
          data.status === 'completed' ? 'bg-blue-400' :
          'bg-gray-300 dark:bg-gray-600'
        }`} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-2 !border-white dark:!border-gray-900" style={{ background: data.deptColor }} />
    </div>
  );
}

export const DepartmentNode = memo(DepartmentNodeComponent);
