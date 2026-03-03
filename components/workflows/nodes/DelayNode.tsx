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
  const isBeforeEvent = data.config?.delayType === 'before_event';

  const formatDelayConfig = () => {
    if (!data.config) return null;
    const { days, hours, minutes, unit, value, delayType } = data.config;
    // Before-event format
    if (delayType === 'before_event') {
      const parts: string[] = [];
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (minutes) parts.push(`${minutes}m`);
      const dur = parts.join(' ') || '0m';
      return `${dur} before`;
    }
    // Format B: { unit, value }
    if (unit && value !== undefined) return `${value} ${unit}`;
    // Format A: { days, hours, minutes }
    const parts: string[] = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(' ') || null;
  };

  const delayStr = formatDelayConfig();

  return (
    <div className="relative flex flex-col items-center">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />

      <div
        className={`px-4 py-2 rounded-full border bg-orange-50 min-w-[120px] text-center ${
          selected ? 'border-orange-500 shadow-md ring-1 ring-orange-300' : 'border-orange-300 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3 text-orange-500 shrink-0" />
          <div>
            <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide leading-none">
              {isBeforeEvent ? 'Before Event' : 'Wait'}
            </div>
            {delayStr && (
              <div className="text-xs font-semibold text-gray-800">{delayStr}</div>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-orange-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
}
