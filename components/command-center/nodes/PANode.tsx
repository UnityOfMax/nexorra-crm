'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';

function PANodeComponent({ data }: { data: any }) {
  const isRunning = data.status === 'running';

  return (
    <div
      className={`relative px-5 py-4 rounded-2xl border-2 shadow-lg min-w-[200px] transition-all
        bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300
        dark:from-violet-950/40 dark:to-purple-950/40 dark:border-violet-600
        ${isRunning ? 'ring-2 ring-green-400/50 shadow-green-400/20' : ''}
      `}
    >
      {isRunning && (
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse" />
      )}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
          {data.deptIcon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{data.displayName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 font-medium uppercase tracking-wide">PA</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Personal Assistant</p>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ml-auto flex-shrink-0 ${
          isRunning ? 'bg-green-400 animate-pulse' :
          data.status === 'failed' ? 'bg-red-400' :
          data.status === 'completed' ? 'bg-blue-400' :
          'bg-gray-300 dark:bg-gray-600'
        }`} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-2 !h-2 !border-2 !border-white dark:!border-gray-900" />
    </div>
  );
}

export const PANode = memo(PANodeComponent);
