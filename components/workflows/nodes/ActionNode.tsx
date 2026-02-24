'use client';

import { Handle, Position } from 'reactflow';
import { Mail, MessageSquare, Tag, User, TrendingUp, Plus, Target } from 'lucide-react';

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
    create_opportunity: Target,
  };
  return icons[stepType] || Plus;
};

// Show one key config value as a subtitle
const getConfigPreview = (stepType: string, config?: Record<string, any>): string | null => {
  if (!config) return null;
  if (stepType === 'send_email') return config.subject ? `"${String(config.subject).slice(0, 28)}"` : null;
  if (stepType === 'send_sms') return config.message ? `"${String(config.message).slice(0, 28)}"` : null;
  if (stepType === 'add_tag') return config.tags?.length ? config.tags.slice(0, 2).join(', ') : null;
  if (stepType === 'assign_user') return config.assignmentType || null;
  if (stepType === 'move_deal_stage') return config.stageId ? `Stage configured` : null;
  if (stepType === 'create_opportunity') return config.pipelineId ? `Pipeline set` : null;
  return null;
};

export default function ActionNode({ data, selected }: ActionNodeProps) {
  const Icon = getActionIcon(data.stepType);
  const preview = getConfigPreview(data.stepType, data.config);

  return (
    <div
      className={`px-3 py-2 rounded-lg border bg-blue-50 min-w-[160px] max-w-[220px] ${
        selected ? 'border-blue-500 shadow-md ring-1 ring-blue-300' : 'border-blue-300 shadow-sm'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />

      <div className="flex items-center gap-2">
        <div className="p-1 bg-blue-500 rounded shrink-0">
          <Icon className="w-3 h-3 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide leading-none mb-0.5">
            Action
          </div>
          <div className="text-xs font-semibold text-gray-800 truncate">{data.label}</div>
          {preview && (
            <div className="text-[10px] text-gray-500 truncate mt-0.5">{preview}</div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
}
