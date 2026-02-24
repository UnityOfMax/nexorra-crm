'use client';

import { Zap, Mail, MessageSquare, Tag, User, ArrowRight, Clock, GitBranch, UserPlus, Target } from 'lucide-react';

interface NodePaletteItem {
  type: 'trigger' | 'action' | 'condition' | 'delay';
  stepType: string;
  label: string;
  icon: any;
  description: string;
  color: string;
}

const nodePaletteItems: NodePaletteItem[] = [
  // Triggers
  {
    type: 'trigger',
    stepType: 'contact_created',
    label: 'Contact Created',
    icon: Zap,
    description: 'When a new contact is created',
    color: 'green',
  },
  {
    type: 'trigger',
    stepType: 'deal_created',
    label: 'Deal Created',
    icon: Zap,
    description: 'When a new deal is created',
    color: 'green',
  },
  {
    type: 'trigger',
    stepType: 'deal_stage_changed',
    label: 'Deal Stage Changed',
    icon: Zap,
    description: 'When a deal moves to a different stage',
    color: 'green',
  },

  // Actions
  {
    type: 'action',
    stepType: 'send_email',
    label: 'Send Email',
    icon: Mail,
    description: 'Send an email to the contact',
    color: 'blue',
  },
  {
    type: 'action',
    stepType: 'send_sms',
    label: 'Send SMS',
    icon: MessageSquare,
    description: 'Send an SMS to the contact',
    color: 'blue',
  },
  {
    type: 'action',
    stepType: 'add_tag',
    label: 'Add Tag',
    icon: Tag,
    description: 'Add a tag to the contact',
    color: 'blue',
  },
  {
    type: 'action',
    stepType: 'assign_user',
    label: 'Assign User',
    icon: UserPlus,
    description: 'Assign contact to a user',
    color: 'blue',
  },
  {
    type: 'action',
    stepType: 'move_deal_stage',
    label: 'Move Deal',
    icon: ArrowRight,
    description: 'Move deal to a different stage',
    color: 'blue',
  },
  {
    type: 'action',
    stepType: 'update_contact',
    label: 'Update Contact',
    icon: User,
    description: 'Update contact fields',
    color: 'blue',
  },
  {
    type: 'action',
    stepType: 'create_opportunity',
    label: 'Create Opportunity',
    icon: Target,
    description: 'Create a deal in the pipeline',
    color: 'blue',
  },

  // Conditions
  {
    type: 'condition',
    stepType: 'if_condition',
    label: 'If/Then Branch',
    icon: GitBranch,
    description: 'Split workflow based on conditions',
    color: 'yellow',
  },

  // Delays
  {
    type: 'delay',
    stepType: 'wait_delay',
    label: 'Wait',
    icon: Clock,
    description: 'Wait for a specified duration',
    color: 'orange',
  },
];

export default function WorkflowSidebar() {
  const onDragStart = (event: React.DragEvent, item: NodePaletteItem) => {
    event.dataTransfer.setData('application/reactflow', item.type);
    event.dataTransfer.setData('stepType', item.stepType);
    event.dataTransfer.setData('label', item.label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
      },
    };
    return colors[color] || colors.blue;
  };

  const groupedItems = {
    Triggers: nodePaletteItems.filter((item) => item.type === 'trigger'),
    Actions: nodePaletteItems.filter((item) => item.type === 'action'),
    Logic: nodePaletteItems.filter((item) => item.type === 'condition'),
    Timing: nodePaletteItems.filter((item) => item.type === 'delay'),
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Workflow Nodes</h3>
        <p className="text-xs text-gray-600 mb-4">Drag nodes to the canvas</p>

        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              {category}
            </h4>
            <div className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon;
                const colorClasses = getColorClasses(item.color);

                return (
                  <div
                    key={item.stepType}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    className={`${colorClasses.bg} ${colorClasses.border} border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`p-1.5 ${colorClasses.text}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${colorClasses.text}`}>
                          {item.label}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
