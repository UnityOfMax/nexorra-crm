'use client';

import { X, Trash2 } from 'lucide-react';
import { Node } from 'reactflow';
import EmailActionConfig from './EmailActionConfig';
import SMSActionConfig from './SMSActionConfig';
import ConditionConfig from './ConditionConfig';
import DelayConfig from './DelayConfig';
import AddTagConfig from './AddTagConfig';
import AssignUserConfig from './AssignUserConfig';
import MoveDealStageConfig from './MoveDealStageConfig';
import UpdateContactConfig from './UpdateContactConfig';
import CreateOpportunityConfig from './CreateOpportunityConfig';

interface NodeData {
  label: string;
  stepType: string;
  config: Record<string, unknown>;
  icon?: string;
}

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (data: Partial<NodeData>) => void;
  onDelete: () => void;
  onClose: () => void;
  accountId?: string;
}

export default function NodeConfigPanel({ node, onUpdate, onDelete, onClose, accountId }: NodeConfigPanelProps) {
  const renderConfig = () => {
    const { stepType } = node.data;

    switch (stepType) {
      case 'send_email':
        return <EmailActionConfig node={node} onUpdate={onUpdate} />;
      case 'send_sms':
        return <SMSActionConfig node={node} onUpdate={onUpdate} />;
      case 'add_tag':
        return <AddTagConfig node={node} onUpdate={onUpdate} />;
      case 'assign_user':
        return <AssignUserConfig node={node} onUpdate={onUpdate} accountId={accountId} />;
      case 'move_deal_stage':
        return <MoveDealStageConfig node={node} onUpdate={onUpdate} />;
      case 'update_contact':
        return <UpdateContactConfig node={node} onUpdate={onUpdate} />;
      case 'create_opportunity':
        return <CreateOpportunityConfig node={node} onUpdate={onUpdate} accountId={accountId} />;
      case 'if_condition':
        return <ConditionConfig node={node} onUpdate={onUpdate} />;
      case 'wait_delay':
        return <DelayConfig node={node} onUpdate={onUpdate} />;
      default:
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Node Type: {node.type}</p>
            <p className="mt-2">Step Type: {stepType}</p>
            <p className="mt-4 text-xs">Configuration panel for this node type coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-[#2c2c2e] border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Node Settings</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Label
          </label>
          <input
            type="text"
            value={node.data.label || ''}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="input w-full text-sm"
            placeholder="Node label"
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
          {renderConfig()}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <button
          onClick={onDelete}
          className="w-full btn btn-danger flex items-center justify-center gap-2 text-sm py-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Node
        </button>
      </div>
    </div>
  );
}
