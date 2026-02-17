'use client';

import { useState, useEffect } from 'react';
import { Node } from 'reactflow';

interface SMSActionConfigProps {
  node: Node;
  onUpdate: (data: any) => void;
}

export default function SMSActionConfig({ node, onUpdate }: SMSActionConfigProps) {
  const [message, setMessage] = useState(node.data.config?.message || '');

  useEffect(() => {
    onUpdate({
      config: {
        ...node.data.config,
        message,
      },
    });
  }, [message]);

  const charCount = message.length;
  const smsSegments = Math.ceil(charCount / 160);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SMS Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input w-full"
          rows={6}
          placeholder="Enter your SMS message here...&#10;&#10;You can use variables:&#10;{{contact.first_name}}&#10;{{contact.last_name}}"
          maxLength={480}
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            {charCount} characters, {smsSegments} SMS {smsSegments === 1 ? 'segment' : 'segments'}
          </p>
          <p className={`text-xs font-medium ${charCount > 160 ? 'text-amber-600' : 'text-gray-500'}`}>
            {480 - charCount} remaining
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-blue-900 mb-2">
          Available Variables
        </h4>
        <div className="text-xs text-blue-700 space-y-1">
          <div><code>{'{{contact.first_name}}'}</code> - Contact first name</div>
          <div><code>{'{{contact.last_name}}'}</code> - Contact last name</div>
          <div><code>{'{{contact.phone}}'}</code> - Contact phone</div>
          <div><code>{'{{deal.title}}'}</code> - Deal title (if applicable)</div>
          <div><code>{'{{deal.value}}'}</code> - Deal value (if applicable)</div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-amber-900 mb-1">
          SMS Best Practices
        </h4>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Keep messages under 160 characters when possible</li>
          <li>Include your business name</li>
          <li>Always provide opt-out instructions (e.g., "Reply STOP to opt out")</li>
          <li>Avoid using all caps or excessive punctuation!!!</li>
        </ul>
      </div>
    </div>
  );
}
