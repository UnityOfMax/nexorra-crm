'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

const MODEL_BADGES: Record<string, { label: string; color: string }> = {
  haiku:  { label: 'H', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
  sonnet: { label: 'S', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  opus:   { label: 'O', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
};

function AgentNodeComponent({ data }: { data: any }) {
  const isRunning = data.status === 'running';
  const badge = MODEL_BADGES[data.model] || MODEL_BADGES.sonnet;

  return (
    <div
      className={`relative px-3 py-2.5 rounded-lg border shadow-sm min-w-[140px] transition-all
        bg-white dark:bg-[#1a1a1c]
        border-gray-200 dark:border-gray-700/60
        hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
        ${isRunning ? 'ring-1 ring-green-400/40 border-green-300 dark:border-green-700' : ''}
      `}
    >
      {isRunning && (
        <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse" />
      )}
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-2 !border-white dark:!border-gray-900" style={{ background: data.deptColor }} />
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: data.deptColor + 'cc' }}
        >
          {data.displayName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-medium text-xs text-gray-900 dark:text-gray-100">{data.displayName}</span>
            <span className={`text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold ${badge.color}`}>{badge.label}</span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{data.schedule || 'Manual'}</p>
        </div>
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isRunning ? 'bg-green-400 animate-pulse' :
          data.status === 'failed' ? 'bg-red-400' :
          data.status === 'completed' ? 'bg-blue-400' :
          'bg-gray-300 dark:bg-gray-600'
        }`} />
      </div>
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
