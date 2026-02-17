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

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
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
        return <AssignUserConfig node={node} onUpdate={onUpdate} />;
      case 'move_deal_stage':
        return <MoveDealStageConfig node={node} onUpdate={onUpdate} />;
      case 'update_contact':
        return <UpdateContactConfig node={node} onUpdate={onUpdate} />;
      case 'if_condition':
        return <ConditionConfig node={node} onUpdate={onUpdate} />;
      case 'wait_delay':
        return <DelayConfig node={node} onUpdate={onUpdate} />;
      default:
        return (
          <div className="text-sm text-gray-600">
            <p>Node Type: {node.type}</p>
            <p className="mt-2">Step Type: {stepType}</p>
            <p className="mt-4 text-xs">Configuration panel for this node type coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Node Settings</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Node Label
          </label>
          <input
            type="text"
            value={node.data.label || ''}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="input w-full"
            placeholder="Enter node label"
          />
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          {renderConfig()}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onDelete}
          className="w-full btn bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </div>
  );
}
