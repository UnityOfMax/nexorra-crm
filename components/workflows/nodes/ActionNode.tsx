'use client';

import { Handle, Position } from 'reactflow';
import { Mail, MessageSquare, Tag, User, TrendingUp, Plus } from 'lucide-react';

interface ActionNodeProps {
  data: {
    label: string;
    stepType: string;
    config?: Record<string, any>;
  };
  selected?: boolean;
}

const getActionIcon = (stepType: string) => {
  const icons: Record<string, any> = {
    send_email: Mail,
    send_sms: MessageSquare,
    add_tag: Tag,
    remove_tag: Tag,
    assign_user: User,
    move_deal_stage: TrendingUp,
    update_contact: User,
    update_deal: TrendingUp,
    create_task: Plus,
  };
  return icons[stepType] || Plus;
};

export default function ActionNode({ data, selected }: ActionNodeProps) {
  const Icon = getActionIcon(data.stepType);

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-blue-50 to-sky-50 min-w-[200px] transition-shadow ${
        selected
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
          : 'border-blue-400 shadow-md'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Icon and Label */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-blue-500 rounded-md">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">
            Action
          </div>
          <div className="text-sm font-semibold text-gray-900">{data.label}</div>
        </div>
      </div>

      {/* Config Preview */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <div className="text-xs text-gray-600 space-y-1">
            {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="truncate">
                <span className="font-medium">{key}:</span> {String(value).substring(0, 30)}
                {String(value).length > 30 && '...'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}
