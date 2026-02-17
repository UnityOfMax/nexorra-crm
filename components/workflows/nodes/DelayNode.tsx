'use client';

import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';

interface DelayNodeProps {
  data: {
    label: string;
    stepType: string;
    config?: Record<string, any>;
  };
  selected?: boolean;
}

export default function DelayNode({ data, selected }: DelayNodeProps) {
  const formatDelayConfig = () => {
    if (!data.config) return null;

    const { days, hours, minutes } = data.config;
    const parts: string[] = [];

    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);

    return parts.join(' ') || 'Configure delay';
  };

  return (
    <div className="relative">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Circular container */}
      <div
        className={`relative px-6 py-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-full min-w-[160px] transition-shadow ${
          selected ? 'shadow-lg' : 'shadow-md'
        }`}
        style={{
          border: selected ? '3px solid #f97316' : '2px solid #fb923c',
        }}
      >
        {/* Content */}
        <div className="flex flex-col items-center gap-2">
          <div className="p-2 bg-orange-500 rounded-full">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-center">
            <div className="text-xs font-medium text-orange-700 uppercase tracking-wide">
              Wait
            </div>
            <div className="text-sm font-semibold text-gray-900">{data.label}</div>
            {data.config && (
              <div className="text-xs text-orange-600 mt-1">
                {formatDelayConfig()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}
